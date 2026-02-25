const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.supportEmail = 'suporte@salao24h.app.br';
    }

    async init() {
        // If we want a central system SMTP, we'd use environment variables.
        // For now, let's use the ones in .env if available, or just log.
        const config = {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        };

        if (config.host && config.auth.user) {
            this.transporter = nodemailer.createTransport(config);
        } else {
            console.warn('[EmailService] SMTP not configured. Emails will be logged to console instead.');
        }
    }

    async sendSupportEmail(ticket, user) {
        if (!this.transporter) await this.init();

        const subject = `[CHAMADO] ${ticket.priority} - ${ticket.subject}`;
        const html = `
            <h2>Novo Chamado de Suporte</h2>
            <p><strong>De:</strong> ${user.name} (${user.email})</p>
            <p><strong>Departamento:</strong> ${ticket.department}</p>
            <p><strong>Prioridade:</strong> ${ticket.priority}</p>
            <hr/>
            <p><strong>Mensagem:</strong></p>
            <p>${ticket.message.replace(/\n/g, '<br>')}</p>
            <hr/>
            <p><em>Enviado automaticamente pelo Sistema Salão24h</em></p>
        `;

        if (this.transporter) {
            try {
                await this.transporter.sendMail({
                    from: `"Suporte Salão24h" <${process.env.SMTP_USER}>`,
                    to: this.supportEmail,
                    replyTo: user.email,
                    subject,
                    html,
                });
                console.log(`[EmailService] Support email sent for ticket #${ticket.id}`);
            } catch (error) {
                console.error('[EmailService] Error sending email:', error);
            }
        } else {
            console.log('--- MOCK EMAIL ---');
            console.log('To:', this.supportEmail);
            console.log('Subject:', subject);
            console.log('Body:', html);
            console.log('-------------------');
        }
    }
}

module.exports = new EmailService();
