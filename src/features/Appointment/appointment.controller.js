const appointmentService = require('./appointment.service');
const auditLogService = require('../../services/auditLog.service');
const whatsappService = require('../../services/whatsapp.service');
const { Tenant, Client, Service, Professional } = require('../../models');
const { parseMonetaryValue } = require('../../utils/number');

class AppointmentController {
    async getAll(req, res) {
        try {
            console.log('[DEBUG] GET /appointments endpoint hit - Verifying Deployment');
            const unitId = req.headers['x-unit-id'] || req.query.unitId;
            const filters = { ...req.query };
            if (unitId) filters.unitId = unitId;
            const appointments = await appointmentService.getAll(req.tenantId, filters);
            res.json({ success: true, data: appointments });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getById(req, res) {
        try {
            const appointment = await appointmentService.getById(req.params.id, req.tenantId);
            res.json({ success: true, data: appointment });
        } catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }

    async create(req, res) {
        try {
            const unitId = req.headers['x-unit-id'] || req.body.unitId || req.body.unit_id;
            const sanitizedBody = { ...req.body };
            if (sanitizedBody.price) sanitizedBody.price = parseMonetaryValue(sanitizedBody.price);

            // Defensive mapping: accept both camelCase and snake_case field names
            if (!sanitizedBody.client_id && sanitizedBody.clientId) sanitizedBody.client_id = sanitizedBody.clientId;
            if (!sanitizedBody.professional_id && sanitizedBody.professionalId) sanitizedBody.professional_id = sanitizedBody.professionalId;
            if (!sanitizedBody.service_id && sanitizedBody.serviceId) sanitizedBody.service_id = sanitizedBody.serviceId;
            if (!sanitizedBody.end_time && sanitizedBody.endTime) sanitizedBody.end_time = sanitizedBody.endTime;
            if (!sanitizedBody.package_id && sanitizedBody.packageId) sanitizedBody.package_id = sanitizedBody.packageId;
            if (!sanitizedBody.salon_plan_id && sanitizedBody.salonPlanId) sanitizedBody.salon_plan_id = sanitizedBody.salonPlanId;
            // Map start_time/startTime to time
            if (!sanitizedBody.time && sanitizedBody.start_time) sanitizedBody.time = sanitizedBody.start_time;
            if (!sanitizedBody.time && sanitizedBody.startTime) sanitizedBody.time = sanitizedBody.startTime;

            const data = { ...sanitizedBody, tenant_id: req.tenantId, unit_id: unitId };
            const appointment = await appointmentService.create(data, req.tenantId, req.userId);

            // --- Send Confirmation WhatsApp if Channel is Active ---
            try {
                const tenant = await Tenant.findByPk(req.tenantId);
                const settings = tenant.settings || {};

                if (settings.support_active) {
                    // Fetch full details for message
                    const client = await Client.findByPk(data.client_id);
                    const service = await Service.findByPk(data.service_id);
                    const professional = await Professional.findByPk(data.professional_id);

                    if (client && service && professional) {
                        console.log(`[Appointment] Queuing confirmation for ${client.phone}`);
                        // Fire-and-forget: Don't await to prevent blocking the response
                        whatsappService.sendAppointmentConfirmation(client, appointment, service, professional, { id: req.tenantId })
                            .catch(err => console.error('[WhatsApp Hook Error] Failed to send confirmation:', err.message));
                    }
                }
            } catch (msgError) {
                console.error('Error queuing appointment confirmation:', msgError.message);
            }

            res.status(201).json({ success: true, data: appointment });
            
            await auditLogService.record(req.tenantId, req.userId, 'create', 'Appointment', appointment.id, `Agendamento criado para o cliente ID ${data.client_id}`, { unitId });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async update(req, res) {
        try {
            const sanitizedBody = { ...req.body };
            if (sanitizedBody.price) sanitizedBody.price = parseMonetaryValue(sanitizedBody.price);

            // Defensive mapping: accept both camelCase and snake_case field names
            if (!sanitizedBody.client_id && sanitizedBody.clientId) sanitizedBody.client_id = sanitizedBody.clientId;
            if (!sanitizedBody.professional_id && sanitizedBody.professionalId) sanitizedBody.professional_id = sanitizedBody.professionalId;
            if (!sanitizedBody.service_id && sanitizedBody.serviceId) sanitizedBody.service_id = sanitizedBody.serviceId;
            if (!sanitizedBody.end_time && sanitizedBody.endTime) sanitizedBody.end_time = sanitizedBody.endTime;

            const appointment = await appointmentService.update(req.params.id, { ...sanitizedBody, tenant_id: req.tenantId }, req.tenantId);
            res.json({ success: true, data: appointment });
            
            await auditLogService.record(req.tenantId, req.userId, 'update', 'Appointment', appointment.id, `Agendamento atualizado`);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateStatus(req, res) {
        try {
            const { status, sessionsConsumed, bypassNotice } = req.body;
            const appointment = await appointmentService.updateStatus(
                req.params.id, status, req.tenantId, sessionsConsumed, bypassNotice
            );
            res.json({ success: true, data: appointment });
            
            await auditLogService.record(req.tenantId, req.userId, 'update_status', 'Appointment', appointment.id, `Status do agendamento alterado para: ${status}`);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async cancel(req, res) {
        try {
            const { reason, bypassNotice } = req.body;
            const appointment = await appointmentService.cancel(req.params.id, req.tenantId, reason, bypassNotice);
            res.json({ success: true, data: appointment });
            
            await auditLogService.record(req.tenantId, req.userId, 'cancel', 'Appointment', appointment.id, `Agendamento cancelado: ${reason}`);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async refund(req, res) {
        try {
            const { reason } = req.body;
            const appointment = await appointmentService.refund(req.params.id, reason, req.tenantId);
            res.json({ success: true, data: appointment });
            
            await auditLogService.record(req.tenantId, req.userId, 'refund', 'Appointment', appointment.id, `Agendamento estornado: ${reason}`);
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const result = await appointmentService.delete(req.params.id, req.tenantId);
            await auditLogService.record(req.tenantId, req.userId, 'delete', 'Appointment', req.params.id, `Agendamento excluído`);
            
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }

    async getByDate(req, res) {
        try {
            const unitId = req.headers['x-unit-id'] || req.query.unitId;
            const appointments = await appointmentService.getByDate(req.params.date, req.tenantId, unitId);
            res.json({ success: true, data: appointments });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getByProfessional(req, res) {
        try {
            const unitId = req.headers['x-unit-id'] || req.query.unitId;
            const appointments = await appointmentService.getByProfessional(
                req.params.professionalId, req.query.date, req.tenantId, unitId
            );
            res.json({ success: true, data: appointments });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getAvailability(req, res) {
        try {
            const { date, professionalId, serviceId, unitId } = req.query;

            if (!date) {
                return res.status(400).json({
                    success: false,
                    message: 'date é obrigatório'
                });
            }

            const slots = await appointmentService.getAvailability(
                professionalId ? parseInt(professionalId) : null,
                date,
                serviceId ? parseInt(serviceId) : null,
                req.tenantId,
                unitId ? parseInt(unitId) : null
            );

            res.json({ success: true, data: slots });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getAllBlocks(req, res) {
        try {
            const blocks = await appointmentService.getAllBlocks(req.tenantId, req.query);
            res.json({ success: true, data: blocks });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async createBlock(req, res) {
        try {
            const block = await appointmentService.createBlock(req.body, req.tenantId);
            res.status(201).json({ success: true, data: block });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async deleteBlock(req, res) {
        try {
            const success = await appointmentService.deleteBlock(req.params.id, req.tenantId);
            res.json({ success, message: success ? 'Bloqueio excluído' : 'Falha ao excluir bloqueio' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new AppointmentController();
