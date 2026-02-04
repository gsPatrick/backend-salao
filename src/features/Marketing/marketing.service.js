const { Campaign, AcquisitionChannel, MarketingCampaign } = require('../../models');

class MarketingService {
    // --- Campaigns ---
    async listCampaigns(tenantId, unitId = null) {
        const where = { tenant_id: tenantId };
        if (unitId) {
            where.unit_id = unitId;
        }
        return Campaign.findAll({
            where,
            order: [['created_at', 'DESC']]
        });
    }

    async createCampaign(data, tenantId) {
        return Campaign.create({
            ...data,
            tenant_id: tenantId,
            unit_id: data.unit_id
        });
    }

    async updateCampaign(id, data, tenantId) {
        const [updated] = await Campaign.update(data, {
            where: { id, tenant_id: tenantId }
        });
        if (updated) {
            return Campaign.findOne({ where: { id, tenant_id: tenantId } });
        }
        return null;
    }

    async deleteCampaign(id, tenantId) {
        return Campaign.destroy({
            where: { id, tenant_id: tenantId }
        });
    }

    // --- Acquisition Channels ---
    async listChannels(tenantId, unitId = null) {
        const where = { tenant_id: tenantId };
        if (unitId) {
            where.unit_id = unitId;
        }
        return AcquisitionChannel.findAll({
            where,
            order: [['created_at', 'DESC']]
        });
    }

    async createChannel(data, tenantId) {
        return AcquisitionChannel.create({
            ...data,
            tenant_id: tenantId,
            unit_id: data.unit_id
        });
    }

    async updateChannel(id, data, tenantId) {
        const [updated] = await AcquisitionChannel.update(data, {
            where: { id, tenant_id: tenantId }
        });
        if (updated) {
            return AcquisitionChannel.findOne({ where: { id, tenant_id: tenantId } });
        }
        return null;
    }

    // --- Direct Mail Campaigns (MarketingCampaign) ---
    async listDirectMail(tenantId, unitId = null) {
        const where = { tenant_id: tenantId };
        if (unitId) {
            where.unit_id = unitId;
        }
        return MarketingCampaign.findAll({
            where,
            order: [['created_at', 'DESC']]
        });
    }

    async createDirectMail(data, tenantId) {
        return MarketingCampaign.create({
            ...data,
            tenant_id: tenantId,
            unit_id: data.unit_id
        });
    }

    async updateDirectMail(id, data, tenantId) {
        const [updated] = await MarketingCampaign.update(data, {
            where: { id, tenant_id: tenantId }
        });
        if (updated) {
            return MarketingCampaign.findOne({ where: { id, tenant_id: tenantId } });
        }
        return null;
    }

    async deleteDirectMail(id, tenantId) {
        return MarketingCampaign.destroy({
            where: { id, tenant_id: tenantId }
        });
    }

    async getAudienceCount(tenantId, audience, unitId = null) {
        const { Client, Appointment } = require('../../models');
        const sequelize = require('../../config/db');
        const { Op } = require('sequelize');
        const today = new Date().toISOString().split('T')[0];

        const baseWhere = { tenant_id: tenantId };
        if (unitId) {
            baseWhere.unit_id = unitId;
        }

        switch (audience) {
            case 'Novos Clientes':
                return Client.count({
                    where: { ...baseWhere, crm_stage: 'new' }
                });
            case 'Agendados Hoje':
                const appointments = await Appointment.findAll({
                    where: {
                        ...baseWhere,
                        date: today,
                        status: { [Op.in]: ['agendado', 'confirmado'] }
                    },
                    attributes: ['client_id'],
                    raw: true
                });
                const uniqueClients = [...new Set(appointments.map(a => a.client_id))];
                return uniqueClients.length;
            case 'Faltantes':
                const missed = await Appointment.findAll({
                    where: {
                        ...baseWhere,
                        status: 'faltou'
                    },
                    attributes: ['client_id'],
                    raw: true
                });
                const uniqueMissed = [...new Set(missed.map(a => a.client_id))];
                return uniqueMissed.length;
            case 'Aniversariantes':
                const [_, month, day] = today.split('-');
                return Client.count({
                    where: {
                        ...baseWhere,
                        [Op.and]: [
                            sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('MONTH FROM birth_date')), parseInt(month)),
                            sequelize.where(sequelize.fn('EXTRACT', sequelize.literal('DAY FROM birth_date')), parseInt(day))
                        ]
                    }
                });
            default:
                // If it's a list of IDs or something else, handle accordingly or return total
                return Client.count({ where: baseWhere });
        }
    }

    async testSMTP(tenantId, smtpSettings) {
        const nodemailer = require('nodemailer');

        const transporter = nodemailer.createTransport({
            host: smtpSettings.host,
            port: smtpSettings.port,
            secure: smtpSettings.port === 465, // true for 465, false for other ports
            auth: {
                user: smtpSettings.user,
                pass: smtpSettings.pass,
            },
        });

        try {
            await transporter.verify();
            return { success: true, message: 'Conexão SMTP estabelecida com sucesso!' };
        } catch (error) {
            console.error('SMTP Verification Error:', error);
            throw new Error(`Falha na conexão SMTP: ${error.message}`);
        }
    }
}

module.exports = new MarketingService();
