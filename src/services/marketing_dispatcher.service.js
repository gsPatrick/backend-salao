const { Campaign, MarketingCampaign, Client, Tenant, Appointment } = require('../models');
const { Op } = require('sequelize');
const whatsappService = require('./whatsapp.service');
const marketingService = require('../features/Marketing/marketing.service');

class MarketingDispatcherService {
    constructor() {
        this.isProcessing = false;
        console.log('[Marketing Dispatcher] Service initialized.');
    }

    async start() {
        // Run every 5 minutes
        const FIVE_MINUTES = 5 * 60 * 1000;
        setInterval(() => {
            this.processCampaigns().catch(err => console.error('[Marketing Dispatcher] Error:', err));
        }, FIVE_MINUTES);

        // Run once on startup after 15 seconds
        setTimeout(() => {
            this.processCampaigns().catch(err => console.error('[Marketing Dispatcher] Startup Error:', err));
        }, 15000);
    }

    async processCampaigns() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            // 1. Process standard Campaigns
            const campaigns = await Campaign.findAll({
                where: { status: 'Agendada', archived: false }
            });

            for (const campaign of campaigns) {
                await this.dispatchCampaign(campaign, 'standard');
            }

            // 2. Process Direct Mail (MarketingCampaign)
            const directMails = await MarketingCampaign.findAll({
                where: { status: 'agendado' }
            });

            for (const dm of directMails) {
                await this.dispatchCampaign(dm, 'direct_mail');
            }
        } catch (error) {
            console.error('[Marketing Dispatcher] Error in processCampaigns:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    async dispatchCampaign(campaign, type = 'standard') {
        const campaignName = campaign.name;
        console.log(`[Marketing Dispatcher] Starting dispatch for ${type}: ${campaignName} (ID: ${campaign.id})`);

        try {
            // Update status to prevent double processing
            if (type === 'standard') await campaign.update({ status: 'Em Andamento' });
            else await campaign.update({ status: 'enviado' });

            const tenant = await Tenant.findByPk(campaign.tenant_id);
            if (!tenant) throw new Error('Tenant not found');

            // Find audience
            const clients = await this.getAudienceClients(campaign);
            console.log(`[Marketing Dispatcher] Found ${clients.length} clients in audience.`);

            const messageText = type === 'standard' ? campaign.messageText : campaign.content;

            // Fetch Unit info for footer
            let footer = '';
            if (campaign.unit_id) {
                const { Unit } = require('../models');
                const unit = await Unit.findByPk(campaign.unit_id);
                if (unit) {
                    footer = `\n\n---\n📍 *${unit.name}*\n🏠 ${unit.address?.street || ''}, ${unit.address?.number || ''} - ${unit.address?.city || ''}`;
                }
            }

            const finalMessage = messageText + footer;

            let successCount = 0;
            for (const client of clients) {
                if (!client.phone) continue;

                try {
                    await whatsappService.sendMessage(client.phone, finalMessage, tenant);
                    successCount++;

                    // Delays
                    const min = campaign.minDelay || 30;
                    const max = campaign.maxDelay || 60;
                    const delay = Math.floor(Math.random() * (max - min + 1) + min) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                } catch (sendErr) {
                    console.error(`[Marketing Dispatcher] Failed to send to ${client.phone}:`, sendErr.message);
                }
            }

            if (type === 'standard') {
                await campaign.update({
                    status: 'Concluída',
                    statsReach: successCount
                });
            } else {
                await campaign.update({ status: 'enviado' });
            }
            console.log(`[Marketing Dispatcher] ${type} ${campaignName} finished. Sent: ${successCount}`);

        } catch (error) {
            console.error(`[Marketing Dispatcher] Error in campaign ${campaign.id}:`, error);
        }
    }

    async getAudienceClients(campaign) {
        const { Op } = require('sequelize');
        const sequelize = require('../config/db');
        const audienceType = campaign.targetAudience;
        const unitId = campaign.unit_id;
        const tenantId = campaign.tenant_id;

        const baseWhere = { tenant_id: tenantId, is_active: true };
        if (unitId) {
            baseWhere.unit_id = unitId;
        }

        const today = new Date();
        const month = today.getUTCMonth() + 1;
        const day = today.getUTCDate();

        switch (audienceType) {
            case 'Novos Clientes':
                return Client.findAll({ where: { ...baseWhere, crm_stage: 'new' } });
            case 'Aniversariantes':
                return Client.findAll({
                    where: {
                        ...baseWhere,
                        [Op.and]: [
                            sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM birth_date')), month),
                            sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('DAY FROM birth_date')), day)
                        ]
                    }
                });
            case 'Agendados Hoje':
                const appointments = await Appointment.findAll({
                    where: {
                        ...baseWhere,
                        date: today.toISOString().split('T')[0],
                        status: { [Op.in]: ['agendado', 'confirmado'] }
                    },
                    attributes: ['client_id'],
                    raw: true
                });
                const ids = [...new Set(appointments.map(a => a.client_id))];
                return Client.findAll({ where: { id: { [Op.in]: ids } } });
            case 'Faltantes':
                const missed = await Appointment.findAll({
                    where: { ...baseWhere, status: 'faltou' },
                    attributes: ['client_id'],
                    raw: true
                });
                const missedIds = [...new Set(missed.map(a => a.client_id))];
                return Client.findAll({ where: { id: { [Op.in]: missedIds } } });
            default:
                // For 'Todos os Clientes' or unknown audience
                return Client.findAll({ where: baseWhere });
        }
    }
}

module.exports = new MarketingDispatcherService();
