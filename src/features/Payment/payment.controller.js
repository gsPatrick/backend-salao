const paymentService = require('../../services/payment.service');
const { Tenant, Plan } = require('../../models');

class PaymentController {
    /**
     * Handle Asaas Webhook
     */
    async handleWebhook(req, res) {
        try {
            const { event, payment, subscription: asaasSub } = req.body;
            console.log(`[Asaas Webhook] Event received: ${event}`);

            // Get tenant by externalReference (which we set to tenant.id)
            const tenantId = payment?.externalReference || asaasSub?.externalReference;
            if (!tenantId) {
                console.error('[Asaas Webhook] No tenant ID found in externalReference');
                return res.status(200).json({ received: true });
            }

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
                            subscription_status: 'ACTIVE',
                            next_billing_date: asaasSubscription.nextDueDate
                        });
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

            // If tenant doesn't have asaas_customer_id, create it
            // We can also update customer info with billingInfo if provided
            if (!tenant.asaas_customer_id) {
                const customer = await paymentService.createCustomer({
                    ...tenant,
                    ...(billingInfo || {})
                });
                await tenant.update({ asaas_customer_id: customer.id });
                tenant.asaas_customer_id = customer.id;
            }

            let creditCard = null;
            let holderInfo = null;

            if (paymentMethod === 'CREDIT_CARD' && creditCardInfo && billingInfo) {
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

            // Create subscription
            const subscription = await paymentService.createSubscription(tenant, plan, paymentMethod, creditCard, holderInfo);

            await tenant.update({
                plan_id: planId,
                asaas_subscription_id: subscription.id,
                subscription_status: 'ACTIVE', // Set to active if payment is expected immediately
                next_billing_date: subscription.nextDueDate
            });

            let responseData = { ...subscription };

            // If PIX, get QR Code for the FIRST payment
            if (paymentMethod === 'PIX') {
                const payments = await paymentService.listPayments(tenant.asaas_customer_id, 1);
                if (payments.data && payments.data.length > 0) {
                    const pixData = await paymentService.getPixQrCode(payments.data[0].id);
                    responseData.pixData = pixData;
                }
            }

            res.json({ success: true, data: responseData });
        } catch (error) {
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

            // Update local tenant
            await tenant.update({
                plan_id: planId,
                // If Asaas created a NEW subscription (it shouldn't for POST :id, but good to be safe)
                asaas_subscription_id: subscription.id || tenant.asaas_subscription_id,
                subscription_status: 'ACTIVE', // Or keep current
                next_billing_date: subscription.nextDueDate || tenant.next_billing_date
            });

            res.json({ success: true, data: subscription });
        } catch (error) {
            console.error('Update Subscription Error:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new PaymentController();
