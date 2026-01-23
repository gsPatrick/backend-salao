const appointmentService = require('./appointment.service');

class AppointmentController {
    async getAll(req, res) {
        try {
            const appointments = await appointmentService.getAll(req.tenantId, req.query);
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
            const appointment = await appointmentService.create(req.body, req.tenantId, req.userId);
            res.status(201).json({ success: true, data: appointment });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async update(req, res) {
        try {
            const appointment = await appointmentService.update(req.params.id, req.body, req.tenantId);
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

    async getByDate(req, res) {
        try {
            const appointments = await appointmentService.getByDate(req.params.date, req.tenantId);
            res.json({ success: true, data: appointments });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getByProfessional(req, res) {
        try {
            const appointments = await appointmentService.getByProfessional(
                req.params.professionalId, req.query.date, req.tenantId
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
}

module.exports = new AppointmentController();
