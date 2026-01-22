const AIAgentConfig = require('./ai_agent_config.model');

exports.getConfig = async (req, res) => {
    try {
        // Assume single tenant context or user specific.
        // For simplified MVP, we'll try to find one or create default.
        const tenantId = req.user.tenant_id || 1; // Default to 1 if not set (SAAS logic needed later)

        let config = await AIAgentConfig.findOne({ where: { tenant_id: tenantId } });

        if (!config) {
            config = await AIAgentConfig.create({ tenant_id: tenantId });
        }

        res.json(config);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateConfig = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || 1;

        let config = await AIAgentConfig.findOne({ where: { tenant_id: tenantId } });

        if (config) {
            await config.update(req.body);
            res.json(config);
        } else {
            // Should not happen if getConfig always ensures existence, but safe check
            config = await AIAgentConfig.create({ ...req.body, tenant_id: tenantId });
            res.json(config);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
