const { Tenant, Plan, User } = require('../../models');
const { Op } = require('sequelize');

class TenantService {
    async getAll(filters = {}) {
        const where = {};

        if (filters.is_active !== undefined) {
            where.is_active = filters.is_active === 'true' || filters.is_active === true;
        }

        if (filters.name) {
            where.name = { [Op.iLike]: `%${filters.name}%` };
        }

        // JSONB filtering for address fields with iLike for partial matches
        if (filters.country && filters.country.trim()) {
            where['address.country'] = { [Op.iLike]: `%${filters.country.trim()}%` };
        }
        if (filters.state && filters.state.trim()) {
            where['address.state'] = { [Op.iLike]: `%${filters.state.trim()}%` };
        }
        if (filters.city && filters.city.trim()) {
            where['address.city'] = { [Op.iLike]: `%${filters.city.trim()}%` };
        }
        if (filters.neighborhood && filters.neighborhood.trim()) {
            where['address.neighborhood'] = { [Op.iLike]: `%${filters.neighborhood.trim()}%` };
        }

        return Tenant.findAll({
            where,
            include: [
                { model: Plan, as: 'plan' },
                { model: User, as: 'owner', attributes: ['id', 'name', 'phone', 'email'] }
            ],
            order: [['created_at', 'DESC']],
        });
    }

    async getById(id, tenantId, isSuperAdmin) {
        const tenant = await Tenant.findByPk(id, {
            include: [
                { model: Plan, as: 'plan' },
                { model: User, as: 'owner', attributes: ['id', 'name', 'phone', 'email'] }
            ],
        });

        if (!tenant) throw new Error('Tenant não encontrado');
        if (!isSuperAdmin && tenant.id !== tenantId) throw new Error('Acesso negado');

        return tenant;
    }

    async create(data) {
        this.formatData(data);
        const slug = this.generateSlug(data.name);
        return Tenant.create({ ...data, slug });
    }


    async update(id, data, tenantId, isSuperAdmin) {
        this.formatData(data);
        if (!isSuperAdmin && parseInt(id) !== parseInt(tenantId)) {

            throw new Error('Acesso negado: você só pode editar seu próprio salão');
        }

        const tenant = await Tenant.findByPk(id);
        if (!tenant) throw new Error('Tenant não encontrado');

        // Prevent non-superadmins from changing plan_id or is_active
        if (!isSuperAdmin) {
            delete data.plan_id;
            delete data.is_active;
            delete data.subscription_status;
            delete data.trial_ends_at;
        }

        // map pixKey from frontend to chave_pix if needed
        if (data.settings?.bank_info?.pixKey && !data.settings?.bank_info?.chave_pix) {
            data.settings.bank_info.chave_pix = data.settings.bank_info.pixKey;
        }

        await tenant.update(data);
        return this.getById(id, tenantId, isSuperAdmin);
    }

    async delete(id, isSuperAdmin) {
        if (!isSuperAdmin) throw new Error('Apenas Super Admin pode deletar tenants');
        const tenant = await Tenant.findByPk(id);
        if (!tenant) throw new Error('Tenant não encontrado');
        await tenant.update({ is_active: false });
        return { message: 'Tenant desativado' };
    }

    async getFilterOptions() {
        const tenants = await Tenant.findAll({
            attributes: ['address'],
            where: { is_active: true }
        });

        const countries = new Set();
        const states = new Set();
        const cities = new Set();
        const neighborhoods = new Set();

        tenants.forEach(t => {
            const addr = t.address || {};
            if (addr.country) countries.add(addr.country);
            if (addr.state) states.add(addr.state);
            if (addr.city) cities.add(addr.city);
            if (addr.neighborhood) neighborhoods.add(addr.neighborhood);
        });

        return {
            countries: Array.from(countries).sort(),
            states: Array.from(states).sort(),
            cities: Array.from(cities).sort(),
            neighborhoods: Array.from(neighborhoods).sort()
        };
    }

    generateSlug(name) {
        return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
    }

    formatData(data) {
        if (data.phone) data.phone = this.formatPhone(data.phone);
        if (data.whatsapp) data.whatsapp = this.formatPhone(data.whatsapp);
        if (data.cnpj_cpf) data.cnpj_cpf = this.formatCPFOrCNPJ(data.cnpj_cpf);
        if (data.address && data.address.cep) {
            data.address.cep = this.formatCEP(data.address.cep);
        }
    }

    formatPhone(value) {
        if (!value) return value;
        const clean = value.replace(/\D/g, '');
        if (clean.length === 10) return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        if (clean.length === 11) return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        return value;
    }

    formatCEP(value) {
        if (!value) return value;
        const clean = value.replace(/\D/g, '');
        if (clean.length === 8) return clean.replace(/(\d{5})(\d{3})/, '$1-$2');
        return value;
    }

    formatCPFOrCNPJ(value) {
        if (!value) return value;
        const clean = value.replace(/\D/g, '');
        if (clean.length === 11) return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        if (clean.length === 14) return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        return value;
    }
}


module.exports = new TenantService();
