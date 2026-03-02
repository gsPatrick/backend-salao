const { Client, Tenant } = require('../models');
const { Op } = require('sequelize');
const whatsappService = require('./whatsapp.service');

class ReminderService {
    async processReminders() {
        console.log('[Reminder Service] Checking for due reminders...');
        const now = new Date();
        const nowISO = now.toISOString(); // Use ISO string for consistent comparison

        try {
            // Fetch all clients with reminders that are NOT null
            const clients = await Client.findAll({
                where: {
                    is_active: true,
                    reminders: {
                        [Op.ne]: null
                    }
                }
            });

            let processedCount = 0;

            for (const client of clients) {
                let reminders = client.reminders;
                if (!reminders || !Array.isArray(reminders) || reminders.length === 0) continue;

                let hasChanges = false;
                const updatedReminders = [];

                for (const reminder of reminders) {
                    // Check if reminder is pending and due
                    // We check if dateTime is passed (<= now) and status is 'pending' (or missing)
                    const isDue = reminder.dateTime && new Date(reminder.dateTime) <= now;
                    const isPending = !reminder.status || reminder.status === 'pending';

                    if (isDue && isPending) {
                        try {
                            await this.sendNotification(client, reminder);

                            // Mark as sent
                            updatedReminders.push({ ...reminder, status: 'sent', sentAt: nowISO });
                            hasChanges = true;
                            processedCount++;
                            console.log(`[Reminder Service] Sent reminder to ${client.name} (${client.id}): ${reminder.subject}`);
                        } catch (err) {
                            console.error(`[Reminder Service] Failed to send reminder to ${client.name}:`, err);
                            // Keep as pending to retry? Or mark as failed?
                            // For now, keep as pending but log error.
                            updatedReminders.push(reminder);
                        }
                    } else {
                        updatedReminders.push(reminder);
                    }
                }

                if (hasChanges) {
                    await client.update({ reminders: updatedReminders });

                    // Emit update to frontend so UI reflects 'sent' status immediately
                    try {
                        const { getIo } = require('../features/Chat/chat.socket');
                        const io = getIo();
                        if (io) {
                            io.to(`tenant:${client.tenant_id}`).emit('reminder:update', {
                                clientId: client.id,
                                reminders: updatedReminders,
                                clientName: client.name
                            });
                        }
                    } catch (socketErr) {
                        console.error('[Reminder Service] Socket update error:', socketErr);
                    }
                }
            }

            if (processedCount > 0) {
                console.log(`[Reminder Service] Processed ${processedCount} reminders.`);
            }

        } catch (error) {
            console.error('[Reminder Service] Error processing reminders:', error);
        }
    }

    async sendNotification(client, reminder) {
        // 1. Send Socket Notification (for instant popup in App)
        try {
            const { getIo } = require('../features/Chat/chat.socket');
            const io = getIo();
            if (io) {
                io.to(`tenant:${client.tenant_id}`).emit('reminder:alert', {
                    clientId: client.id,
                    clientName: client.name,
                    subject: reminder.subject,
                    text: reminder.text,
                    dateTime: reminder.dateTime
                });
            }
        } catch (err) {
            console.error('[Reminder Service] Socket alert error:', err);
        }

        // 2. Send WhatsApp Message (if client has phone)
        if (client.phone && process.env.ENABLE_WHATSAPP_REMINDERS === 'true') {
            try {
                const tenant = await Tenant.findByPk(client.tenant_id);
                if (tenant) {
                    const message = `🔔 *Lembrete: ${reminder.subject}*\n\n${reminder.text}`;
                    await whatsappService.sendMessage(client.phone, message, tenant);
                }
            } catch (err) {
                console.error('[Reminder Service] WhatsApp error:', err.message);
                // Don't throw, so we still mark as sent in DB if socket worked
            }
        }
    }
}

module.exports = new ReminderService();
