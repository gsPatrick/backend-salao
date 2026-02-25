const { Campaign, AcquisitionChannel, MarketingCampaign } = require('../../models');

class MarketingService {
    // --- Campaigns ---
    async listCampaigns(tenantId, unitId = null) {
        const where = { tenant_id: tenantId };
        // Parse unitId to ensure proper filtering (could be string from header)
        const parsedUnitId = unitId ? parseInt(unitId, 10) : null;
        if (parsedUnitId && !isNaN(parsedUnitId)) {
            where.unit_id = parsedUnitId;
        }
        console.log('[Marketing] listCampaigns - tenantId:', tenantId, 'unitId:', unitId, 'parsedUnitId:', parsedUnitId, 'where:', where);
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
        const parsedUnitId = unitId ? parseInt(unitId, 10) : null;
        if (parsedUnitId && !isNaN(parsedUnitId)) {
            where.unit_id = parsedUnitId;
        }
        console.log('[Marketing] listChannels - tenantId:', tenantId, 'unitId:', unitId, 'parsedUnitId:', parsedUnitId, 'where:', where);
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

    async deleteChannel(id, tenantId) {
        return AcquisitionChannel.destroy({
            where: { id, tenant_id: tenantId }
        });
    }

    // --- Direct Mail Campaigns (MarketingCampaign) ---
    async listDirectMail(tenantId, unitId = null) {
        const where = { tenant_id: tenantId };
        const parsedUnitId = unitId ? parseInt(unitId, 10) : null;
        if (parsedUnitId && !isNaN(parsedUnitId)) {
            where.unit_id = parsedUnitId;
        }
        console.log('[Marketing] listDirectMail - tenantId:', tenantId, 'unitId:', unitId, 'parsedUnitId:', parsedUnitId, 'where:', where);
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

    async getAudienceCount(tenantId, audience, unitId = null, gender = null) {
        const { Client, Appointment } = require('../../models');
        const sequelize = require('../../config/db');
        const { Op } = require('sequelize');
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        const baseWhere = { tenant_id: tenantId };
        if (unitId) {
            baseWhere.unit_id = unitId;
        }
        if (gender && gender !== 'Todos') {
            baseWhere.gender = gender;
        }

        switch (audience) {
            case 'Novos Clientes':
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(now.getDate() - 7);
                return Client.count({
                    where: {
                        ...baseWhere,
                        created_at: { [Op.gte]: sevenDaysAgo }
                    }
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
            case 'Inativos':
                const sixtyDaysAgo = new Date();
                sixtyDaysAgo.setDate(now.getDate() - 60);
                return Client.count({
                    where: {
                        ...baseWhere,
                        last_visit: { [Op.lte]: sixtyDaysAgo }
                    }
                });
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
                // If it's a funnel stage name or a list of IDs, we should ideally handle it,
                // but for generic "Everyone" or unknown, return total filtered by unit/gender.
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
