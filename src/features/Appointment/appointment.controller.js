const appointmentService = require('./appointment.service');
const whatsappService = require('../../services/whatsapp.service');
const { Tenant, Client, Service, Professional } = require('../../models');

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
        try {
            const unitId = req.headers['x-unit-id'] || req.body.unitId;
            const data = { ...req.body, tenant_id: req.tenantId, unit_id: unitId };
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
                        console.log(`[Appointment] Sending confirmation to ${client.phone}`);
                        await whatsappService.sendAppointmentConfirmation(client, appointment, service, professional, { id: req.tenantId });
                    }
                }
            } catch (msgError) {
                console.error('Error sending appointment confirmation:', msgError.message);
                // Don't block the response, just log
            }

            res.status(201).json({ success: true, data: appointment });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async update(req, res) {
        try {
            const appointment = await appointmentService.update(req.params.id, { ...req.body, tenant_id: req.tenantId }, req.tenantId);
            res.json({ success: true, data: appointment });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async updateStatus(req, res) {
        try {
            const appointment = await appointmentService.updateStatus(
                req.params.id, req.body.status, req.tenantId
            );
            res.json({ success: true, data: appointment });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async cancel(req, res) {
        try {
            const appointment = await appointmentService.cancel(req.params.id, req.tenantId);
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
