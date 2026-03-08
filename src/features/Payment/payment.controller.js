const paymentService = require('../../services/payment.service');
const { Tenant, Plan } = require('../../models');
const config = require('../../config');

class PaymentController {
    /**
     * Handle Asaas Webhook
     */
    async handleWebhook(req, res) {
        try {
            // Validate Webhook Token if configured
            const webhookToken = config.externalServices.asaas.webhookToken;
            if (webhookToken && req.headers['asaas-access-token'] !== webhookToken) {
                console.error('[Asaas Webhook] Invalid access token');
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { event, payment, subscription: asaasSub } = req.body;
            console.log(`[Asaas Webhook] Event received: ${event}`);

            const extRef = payment?.externalReference || asaasSub?.externalReference;
            if (!extRef) {
                console.error('[Asaas Webhook] No externalReference found');
                return res.status(200).json({ received: true });
            }

            const [tenantId, planId] = extRef.split(':');
            const tenant = await Tenant.findByPk(tenantId);
            if (!tenant) {
                console.error(`[Asaas Webhook] Tenant ${tenantId} not found`);
                return res.status(200).json({ received: true });
            }

            // Logic based on events
            switch (event) {
                case 'PAYMENT_CONFIRMED':
                case 'PAYMENT_RECEIVED':
                    {
                        const asaasSubscription = await paymentService.getSubscription(tenant.asaas_subscription_id);
                        await tenant.update({
                            plan_id: planId || tenant.plan_id, // Use planId from extRef if available
                            subscription_status: 'ACTIVE',
                            next_billing_date: asaasSubscription.nextDueDate
                        });
                        console.log(`[Asaas Webhook] Tenant ${tenantId} updated to plan ${planId} (Status: ACTIVE)`);
                    }
                    break;
                case 'PAYMENT_OVERDUE':
                    await tenant.update({ subscription_status: 'OVERDUE' });
                    break;
                case 'SUBSCRIPTION_DELETED':
                    await tenant.update({ subscription_status: 'CANCELED' });
                    break;
                default:
                    console.log(`[Asaas Webhook] Event ${event} not handled`);
            }

            res.status(200).json({ received: true });
        } catch (error) {
            console.error('[Asaas Webhook] Error processing:', error);
            res.status(200).json({ received: true }); // Always return 200 to Asaas
        }
    }

    /**
     * Create/Update subscription for a tenant
     */
    async createSubscription(req, res) {
        try {
            const { planId, paymentMethod, billingInfo, creditCardInfo } = req.body;
            const tenant = await Tenant.findByPk(req.tenantId);
            const plan = await Plan.findByPk(planId);

            if (!plan) throw new Error('Plano não encontrado');

            // 1. Ensure Asaas Customer exists
            if (!tenant.asaas_customer_id) {
                const customer = await paymentService.createCustomer({
                    id: tenant.id,
                    name: tenant.name,
                    email: tenant.email,
                    phone: tenant.phone,
                    cnpj_cpf: tenant.cnpj_cpf,
                    ...(billingInfo || {})
                });
                await tenant.update({ asaas_customer_id: customer.id });
                tenant.asaas_customer_id = customer.id;
            }

            let creditCard = null;
            let holderInfo = null;

            if (req.body.paymentMethod === 'CREDIT_CARD' && creditCardInfo && billingInfo) {
                creditCard = {
                    holderName: creditCardInfo.holderName,
                    number: creditCardInfo.number,
                    expiryMonth: creditCardInfo.expiryMonth,
                    expiryYear: creditCardInfo.expiryYear,
                    ccv: creditCardInfo.ccv
                };
                holderInfo = {
                    name: billingInfo.name,
                    email: billingInfo.email,
                    cpfCnpj: billingInfo.cpfCnpj || tenant.cnpj_cpf,
                    postalCode: billingInfo.postalCode,
                    addressNumber: billingInfo.addressNumber,
                    addressComplement: billingInfo.complement,
                    phone: billingInfo.phone || tenant.phone,
                    mobilePhone: billingInfo.phone || tenant.phone
                };
            }

            // 2. Create subscription in Asaas
            const subscription = await paymentService.createSubscription(tenant, plan, paymentMethod, creditCard, holderInfo);

            // 3. Keep track of the subscription ID and the requested plan
            // We DO NOT update plan_id yet unless it's CREDIT_CARD and confirmed (handled below or via webhook)
            await tenant.update({
                asaas_subscription_id: subscription.id,
                // We store the "pending" plan in a temporary field if we had one, 
                // but for now we'll rely on the webhook to set the final plan_id.
                // However, the user expects access if it's confirmed.
                // subscription_status stays as it is (likely 'TRIAL' or 'PENDING')
            });

            let responseData = { ...subscription };

            // 4. Handle initial payment response
            if (paymentMethod === 'PIX') {
                // Retry a few times as Asaas might take a moment to generate the first invoice for a subscription
                let attempts = 0;
                let payments = { data: [] };
                
                while (attempts < 3 && (!payments.data || payments.data.length === 0)) {
                    if (attempts > 0) await new Promise(resolve => setTimeout(resolve, 1500));
                    payments = await paymentService.listPayments(tenant.asaas_customer_id, 1);
                    attempts++;
                }

                if (payments.data && payments.data.length > 0) {
                    const firstPayment = payments.data[0];
                    const pixData = await paymentService.getPixQrCode(firstPayment.id);
                    responseData.pixData = pixData;
                    responseData.paymentId = firstPayment.id; // For polling
                }
            } else if (paymentMethod === 'CREDIT_CARD') {
                // For Credit Card, Asaas might confirm immediately. 
                // We check the first payment status.
                const payments = await paymentService.listPayments(tenant.asaas_customer_id, 1);
                if (payments.data && payments.data.length > 0) {
                    const firstPayment = payments.data[0];
                    responseData.paymentStatus = firstPayment.status;
                    responseData.paymentId = firstPayment.id;

                    if (firstPayment.status === 'CONFIRMED' || firstPayment.status === 'RECEIVED') {
                        await tenant.update({
                            plan_id: planId,
                            subscription_status: 'ACTIVE',
                            next_billing_date: subscription.nextDueDate
                        });
                    }
                }
            }

            res.json({ success: true, data: responseData });
        } catch (error) {
            console.error('[PaymentController] Error creating subscription:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    }
    /**
     * Get invoices for current tenant
     */
    async getInvoices(req, res) {
        try {
            const tenant = await Tenant.findByPk(req.tenantId);
            if (!tenant.asaas_customer_id) {
                return res.json({ data: [], totalCount: 0 });
            }

            const payments = await paymentService.listPayments(tenant.asaas_customer_id, 20); // Limit 20 for now
            res.json(payments);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(req, res) {
        try {
            const tenant = await Tenant.findByPk(req.tenantId);
            if (!tenant.asaas_subscription_id) {
                return res.status(400).json({ success: false, message: 'Nenhuma assinatura ativa encontrada.' });
            }

            await paymentService.cancelSubscription(tenant.asaas_subscription_id);

            await tenant.update({
                subscription_status: 'CANCELED_PENDING'
            });

            res.json({ success: true, message: 'Assinatura cancelada com sucesso.' });
        } catch (error) {
            console.error('Cancellation Error:', error);
            res.status(500).json({ success: false, message: 'Erro ao cancelar assinatura.' });
        }
    }

    /**
     * Update/Upgrade subscription
     */
    async updateSubscription(req, res) {
        try {
            const { planId, paymentMethod } = req.body;
            const tenant = await Tenant.findByPk(req.tenantId);
            const plan = await Plan.findByPk(planId);

            if (!plan) throw new Error('Plano não encontrado');
            if (!tenant.asaas_subscription_id) throw new Error('Assinatura não encontrada para atualização');

            // Call Asaas service to update
            const subscription = await paymentService.updateSubscription(
                tenant.asaas_subscription_id, 
                plan, 
                paymentMethod || 'UNDEFINED'
            );

            // Update local tenant subscription ID (if changed)
            await tenant.update({
                asaas_subscription_id: subscription.id || tenant.asaas_subscription_id,
                // DO NOT update plan_id here, let webhook handle it or handle immediate CC confirmation below
            });

            let responseData = { ...subscription };

            // For Credit Card, try immediate confirmation
            if (paymentMethod === 'CREDIT_CARD') {
                const payments = await paymentService.listPayments(tenant.asaas_customer_id, 1);
                if (payments.data && payments.data.length > 0) {
                    const firstPayment = payments.data[0];
                    responseData.paymentStatus = firstPayment.status;
                    responseData.paymentId = firstPayment.id;

                    if (firstPayment.status === 'CONFIRMED' || firstPayment.status === 'RECEIVED') {
                        await tenant.update({
                            plan_id: planId,
                            subscription_status: 'ACTIVE',
                            next_billing_date: subscription.nextDueDate || tenant.next_billing_date
                        });
                    }
                }
            } else if (paymentMethod === 'PIX') {
                // Retry a few times
                let attempts = 0;
                let payments = { data: [] };
                
                while (attempts < 3 && (!payments.data || payments.data.length === 0)) {
                    if (attempts > 0) await new Promise(resolve => setTimeout(resolve, 1500));
                    payments = await paymentService.listPayments(tenant.asaas_customer_id, 1);
                    attempts++;
                }

                if (payments.data && payments.data.length > 0) {
                    const firstPayment = payments.data[0];
                    const pixData = await paymentService.getPixQrCode(firstPayment.id);
                    responseData.pixData = pixData;
                    responseData.paymentId = firstPayment.id;
                }
            }

            res.json({ success: true, data: responseData });
        } catch (error) {
            console.error('Update Subscription Error:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    }

    /**
     * Check status of a specific payment (Polling)
     */
    async checkPaymentStatus(req, res) {
        try {
            const { paymentId } = req.params;
            const payment = await paymentService.getPayment(paymentId);
            
            // If payment is confirmed, ensure tenant is updated (fallback in case webhook is slow)
            if (payment.status === 'CONFIRMED' || payment.status === 'RECEIVED') {
                const tenant = await Tenant.findByPk(req.tenantId);
                const [extTenantId, planId] = (payment.externalReference || '').split(':');
                
                if (tenant && planId) {
                    await tenant.update({
                        plan_id: planId,
                        subscription_status: 'ACTIVE'
                    });
                }
            }

            res.json({ success: true, status: payment.status });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new PaymentController();
