const appointmentService = require('./appointment.service');
const whatsappService = require('../../services/whatsapp.service');
const { Tenant, Client, Service, Professional } = require('../../models');
const { parseMonetaryValue } = require('../../utils/number');

class AppointmentController {
    async getAll(req, res) {
        try {
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
        console.log('[AppointmentController] Create request received', { body: req.body, tenantId: req.tenantId });
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

            const data = { ...sanitizedBody, tenant_id: req.tenantId, unit_id: unitId };
            console.log('[AppointmentController] Calling service.create...');
            const appointment = await appointmentService.create(data, req.tenantId, req.userId);
            console.log('[AppointmentController] Service.create finished. Appointment ID:', appointment?.id);

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

            console.log('[AppointmentController] Sending response 201');
            res.status(201).json({ success: true, data: appointment });
        } catch (error) {
            console.error('[AppointmentController] Error in create:', error);
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
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateStatus(req, res) {
        try {
            const { status, sessionsConsumed } = req.body;
            const appointment = await appointmentService.updateStatus(
                req.params.id, status, req.tenantId, sessionsConsumed
            );
            res.json({ success: true, data: appointment });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async cancel(req, res) {
        try {
            const { reason } = req.body;
            const appointment = await appointmentService.cancel(req.params.id, req.tenantId, reason);
            res.json({ success: true, data: appointment });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async refund(req, res) {
        try {
            const { reason } = req.body;
            const appointment = await appointmentService.refund(req.params.id, reason, req.tenantId);
            res.json({ success: true, data: appointment });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const result = await appointmentService.delete(req.params.id, req.tenantId);
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
            const { date, professionalId, serviceId } = req.query;

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
                req.tenantId
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
