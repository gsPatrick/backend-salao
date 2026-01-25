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
            const { planId, paymentMethod } = req.body;
            const tenant = await Tenant.findByPk(req.tenantId);
            const plan = await Plan.findByPk(planId);

            if (!plan) throw new Error('Plano não encontrado');

            // If tenant doesn't have asaas_customer_id, create it
            if (!tenant.asaas_customer_id) {
                const customer = await paymentService.createCustomer(tenant);
                await tenant.update({ asaas_customer_id: customer.id });
                tenant.asaas_customer_id = customer.id;
            }

            // Create subscription
            const subscription = await paymentService.createSubscription(tenant, plan, paymentMethod);

            await tenant.update({
                plan_id: planId,
                asaas_subscription_id: subscription.id,
                subscription_status: 'trial', // Initial status
                next_billing_date: subscription.nextDueDate || subscription.due_date
            });

            res.json({ success: true, data: subscription });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new PaymentController();
