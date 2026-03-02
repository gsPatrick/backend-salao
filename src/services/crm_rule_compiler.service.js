const aiService = require('./ai.service');

class CRMRuleCompilerService {

    /**
     * Compiler: Takes raw text, returns validated Rule JSON
     * @param {string} textDescription
     * @returns {Promise<Array>} rules
     */
    async compileRules(textDescription) {
        if (!textDescription || textDescription.length < 5) return [];

        console.log(`[RuleCompiler] Compiling: "${textDescription}"`);

        let rawRules;
        try {
            rawRules = await aiService.compileCRMActionRules(textDescription);
        } catch (e) {
            console.error('[RuleCompiler] AI Failure:', e);
            return [];
        }

        if (!Array.isArray(rawRules)) return [];

        // Golden Schema Validation (Manual Zod-like)
        const validRules = rawRules.filter(rule => this.validateRule(rule));

        console.log(`[RuleCompiler] Success. ${validRules.length} valid rules generated.`);
        return validRules;
    }

    validateRule(rule) {
        try {
            if (!rule.trigger || !rule.action) return false;

            const validTriggers = ['inactivity', 'time_in_stage', 'appointment_created', 'appointment_completed', 'status_changed'];
            if (!validTriggers.includes(rule.trigger)) return false;

            if (['inactivity', 'time_in_stage'].includes(rule.trigger)) {
                if (!rule.conditions || typeof rule.conditions.days_threshold !== 'number') return false;
            }

            const validActions = ['move_client', 'send_message', 'notify_admin'];
            if (!rule.action.type || !validActions.includes(rule.action.type)) return false;

            if (rule.action.type === 'move_client' && !rule.action.params?.target_stage) return false;
            if (rule.action.type === 'send_message' && !rule.action.params?.template) return false;

            return true;
        } catch (e) {
            return false;
        }
    }
}

module.exports = new CRMRuleCompilerService();
