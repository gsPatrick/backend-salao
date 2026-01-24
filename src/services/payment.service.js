const axios = require('axios');
const config = require('../config');

class PaymentService {
    constructor() {
        this.apiKey = config.externalServices.asaas.apiKey;
        this.webhookToken = config.externalServices.asaas.webhookToken;
        // Using sandbox for development/test unless explicitly production
        this.baseUrl = config.nodeEnv === 'production'
            ? 'https://api.asaas.com/v3'
            : 'https://sandbox.asaas.com/api/v3';

        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'access_token': this.apiKey,
                'Content-Type': 'application/json'
            }
        });
    }

    isConfigured() {
        return !!this.apiKey;
    }

    /**
     * Create a new customer in Asaas
     */
    async createCustomer(tenantData) {
        if (!this.isConfigured()) {
            console.log('[Asaas] Not configured. Simulating customer creation.');
            return { id: 'simulated_cus_' + Date.now() };
        }

        try {
            const response = await this.client.post('/customers', {
                name: tenantData.name,
                email: tenantData.email,
                phone: tenantData.phone,
                mobilePhone: tenantData.phone,
                cpfCnpj: tenantData.cnpj_cpf,
                externalReference: tenantData.id?.toString(),
                notificationDisabled: false
            });
            return response.data;
        } catch (error) {
            console.error('[Asaas] Create Customer Error:', error.response?.data || error.message);
            throw new Error('Falha ao criar cliente no gateway de pagamento');
        }
    }

    /**
     * Create a subscription for a plan
     */
    async createSubscription(tenant, plan, paymentMethod = 'UNDEFINED') {
        if (!this.isConfigured()) {
            console.log('[Asaas] Not configured. Simulating subscription creation.');
            return { id: 'simulated_sub_' + Date.now() };
        }

        try {
            // First due date: next month
            const nextDueDate = new Date();
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            const formattedDate = nextDueDate.toISOString().split('T')[0];

            const response = await this.client.post('/subscriptions', {
                customer: tenant.asaas_customer_id,
                billingType: paymentMethod, // BOLETO, CREDIT_CARD, PIX, UNDEFINED
                nextDueDate: formattedDate,
                value: plan.price,
                cycle: 'MONTHLY',
                description: `Plano ${plan.display_name} - Salão24h`,
                externalReference: tenant.id.toString()
            });
            return response.data;
        } catch (error) {
            console.error('[Asaas] Create Subscription Error:', error.response?.data || error.message);
            throw new Error('Falha ao criar assinatura');
        }
    }

    /**
     * Get a specific subscription
     */
    async getSubscription(subscriptionId) {
        if (!this.isConfigured()) return { status: 'ACTIVE' };
        try {
            const response = await this.client.get(`/subscriptions/${subscriptionId}`);
            return response.data;
        } catch (error) {
            console.error('[Asaas] Get Subscription Error:', error.response?.data || error.message);
            throw new Error('Falha ao buscar assinatura');
        }
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(subscriptionId) {
        if (!this.isConfigured()) return { deleted: true };
        try {
            const response = await this.client.delete(`/subscriptions/${subscriptionId}`);
            return response.data;
        } catch (error) {
            console.error('[Asaas] Cancel Subscription Error:', error.response?.data || error.message);
            throw new Error('Falha ao cancelar assinatura');
        }
    }
}

module.exports = new PaymentService();
