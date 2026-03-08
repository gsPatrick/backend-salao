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
    async createSubscription(tenant, plan, paymentMethod = 'UNDEFINED', creditCard = null, creditCardHolderInfo = null) {
        if (!this.isConfigured()) {
            console.log('[Asaas] Not configured. Simulating subscription creation.');
            return { id: 'simulated_sub_' + Date.now(), nextDueDate: new Date().toISOString().split('T')[0] };
        }

        try {
            // First due date: today for immediate access/payment
            const nextDueDate = new Date().toISOString().split('T')[0];

            const body = {
                customer: tenant.asaas_customer_id,
                billingType: paymentMethod, // BOLETO, CREDIT_CARD, PIX, UNDEFINED
                nextDueDate: nextDueDate,
                value: plan.price,
                cycle: 'MONTHLY',
                description: `Plano ${plan.display_name || plan.name} - Salão24h`,
                externalReference: tenant.id.toString()
            };

            if (paymentMethod === 'CREDIT_CARD' && creditCard) {
                body.creditCard = creditCard;
                body.creditCardHolderInfo = creditCardHolderInfo;
            }

            const response = await this.client.post('/subscriptions', body);
            return response.data;
        } catch (error) {
            console.error('[Asaas] Create Subscription Error:', error.response?.data || error.message);
            const errMsg = error.response?.data?.errors?.[0]?.description || 'Falha ao criar assinatura';
            throw new Error(errMsg);
        }
    }

    /**
     * Get Pix QR Code for a payment
     */
    async getPixQrCode(paymentId) {
        if (!this.isConfigured()) {
            return { success: true, pixEncodedCode: 'mock_pix_code', payload: 'mock_payload', expirationDate: '2025-01-01' };
        }
        try {
            const response = await this.client.get(`/payments/${paymentId}/pixQrCode`);
            return response.data;
        } catch (error) {
            console.error('[Asaas] Get Pix QR Code Error:', error.response?.data || error.message);
            return null;
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

    /**
     * Update an existing subscription (Upgrade/Downgrade)
     */
    async updateSubscription(subscriptionId, plan, paymentMethod = 'UNDEFINED') {
        if (!this.isConfigured()) {
            console.log('[Asaas] Not configured. Simulating subscription update.');
            return { id: subscriptionId, value: plan.price, nextDueDate: new Date().toISOString().split('T')[0] };
        }

        try {
            const response = await this.client.post(`/subscriptions/${subscriptionId}`, {
                billingType: paymentMethod,
                value: plan.price,
                description: `Plano ${plan.display_name || plan.name} - Salão24h`,
            });
            return response.data;
        } catch (error) {
            console.error('[Asaas] Update Subscription Error:', error.response?.data || error.message);
            throw new Error('Falha ao atualizar assinatura no gateway de pagamento');
        }
    }
    /**
     * List payments for a customer
     */
    async listPayments(customerId, limit = 10, offset = 0) {
        if (!this.isConfigured()) return { data: [], totalCount: 0 };
        try {
            const response = await this.client.get('/payments', {
                params: {
                    customer: customerId,
                    limit,
                    offset
                }
            });
            return response.data;
        } catch (error) {
            console.error('[Asaas] List Payments Error:', error.response?.data || error.message);
            throw new Error('Falha ao buscar pagamentos');
        }
    }
}

module.exports = new PaymentService();
