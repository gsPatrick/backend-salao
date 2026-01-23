const supportService = require('./support.service');

class SupportController {
    /**
     * Create a new support ticket
     */
    async createTicket(req, res) {
        try {
            const { subject, message } = req.body;

            if (!subject || !message) {
                return res.status(400).json({
                    success: false,
                    message: 'Assunto e mensagem são obrigatórios'
                });
            }

            const ticket = await supportService.createTicket(req.body, req.userId, req.tenantId);

            res.status(201).json({
                success: true,
                data: ticket
            });
        } catch (error) {
            console.error('Error creating support ticket:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno ao criar chamado de suporte'
            });
        }
    }

    /**
     * List user tickets (optional, for history)
     */
    async listUserTickets(req, res) {
        try {
            const tickets = await supportService.listUserTickets(req.userId);
            res.json({ success: true, data: tickets });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new SupportController();
