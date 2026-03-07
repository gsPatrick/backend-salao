const professionalService = require('./professional.service');
const { Unit } = require('../../models');

class ProfessionalController {
    async getAll(req, res) {
        try {
            const unitId = req.headers['x-unit-id'] || req.query.unitId;
            const filters = {
                open_schedule: req.query.open_schedule,
                unitId: unitId
            };
            const professionals = await professionalService.getAll(req.tenantId, filters);
            res.json({ success: true, data: professionals });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async getById(req, res) {
        try {
            const professional = await professionalService.getById(req.params.id, req.tenantId);
            res.json({ success: true, data: professional });
        } catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    }

    async create(req, res) {
        try {
            const currentUnitId = req.headers['x-unit-id'];
            const formUnitName = req.body.unit;
            let targetUnitIds = [];

            if (formUnitName === 'Ambas' || formUnitName === 'Ambas as unidades') {
                const units = await Unit.findAll({ where: { tenant_id: req.tenantId } });
                targetUnitIds = units.map(u => u.id);
            } else if (formUnitName) {
                const unit = await Unit.findOne({ where: { tenant_id: req.tenantId, name: formUnitName } });
                if (unit) targetUnitIds = [unit.id];
            }

            // Fallback to current header unit if no specific target found from form
            if (targetUnitIds.length === 0 && currentUnitId) {
                targetUnitIds = [currentUnitId];
            }

            const data = { ...req.body, tenant_id: req.tenantId, targetUnitIds };
            const professional = await professionalService.create(data, req.tenantId);
            res.status(201).json({ success: true, data: professional });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async update(req, res) {
        try {
            const unitId = req.headers['x-unit-id'] || req.body.unitId;
            const professional = await professionalService.update(req.params.id, { ...req.body, tenant_id: req.tenantId, unit_id: unitId }, req.tenantId);
            res.json({ success: true, data: professional });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const result = await professionalService.delete(req.params.id, req.tenantId);
            res.json({ success: true, message: result.message });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async purge(req, res) {
        try {
            const result = await professionalService.purge(req.params.id, req.tenantId);
            res.json({ success: true, message: result.message });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async suspend(req, res) {
        try {
            const professional = await professionalService.suspend(req.params.id, req.tenantId);
            res.json({ success: true, data: professional });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async archive(req, res) {
        try {
            const professional = await professionalService.archive(req.params.id, req.tenantId);
            res.json({ success: true, data: professional });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async assignServices(req, res) {
        try {
            const professional = await professionalService.assignServices(
                req.params.id, req.body.serviceIds, req.tenantId
            );
            res.json({ success: true, data: professional });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
    async getRanking(req, res) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit) : 5;
            const unitId = req.headers['x-unit-id'] || req.query.unitId;
            const unit = req.query.unit;
            const rankings = await professionalService.getRanking(req.tenantId, limit, unit, unitId);
            res.json({ success: true, data: rankings });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    async submitReview(req, res) {
        try {
            const data = {
                professional_id: req.body.professionalId,
                client_id: req.body.clientId,
                appointment_id: req.body.appointmentId,
                rating: req.body.rating,
                comment: req.body.comment
            };
            const review = await professionalService.submitReview(req.tenantId, data);
            res.status(201).json({ success: true, data: review });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new ProfessionalController();
