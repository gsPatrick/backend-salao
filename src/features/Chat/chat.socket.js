const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { User, ChatMessage } = require('../../models');
const { connectToWhatsApp, deleteSession, getStatus } = require('../../services/whatsapp.provider');

let io;

const initSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: "*", // Allow all origins for now
            methods: ["GET", "POST"]
        }
    });

    // Authentication Middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) return next(new Error('Authentication error'));

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findByPk(decoded.id);

            if (!user) {
                console.error(`[Socket Auth] User not found for ID: ${decoded.id}`);
                return next(new Error('User not found'));
            }

            socket.user = user;
            next();
        } catch (err) {
            console.error('[Socket Auth] Verification failed:', err.message);
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user.name} (${socket.user.id})`);

        // Join a room specific to this user ID for private messaging
        socket.join(`user:${socket.user.id}`);
        // Join tenant room
        if (socket.user.tenant_id) {
            socket.join(`tenant:${socket.user.tenant_id}`);
        }

        // Online status (could broadcast to others)
        socket.broadcast.emit('user_status', { userId: socket.user.id, status: 'online' });

        // --- WhatsApp Events ---
        socket.on('whatsapp:connect', async () => {
            try {
                const tenantId = socket.user.tenant_id;
                console.log(`[Socket] whatsapp:connect requested by Tenant ${tenantId}`);
                console.log('[Socket] Calling connectToWhatsApp...');
                await connectToWhatsApp(tenantId);
                console.log('[Socket] connectToWhatsApp called successfully');
            } catch (err) {
                console.error('[Socket] Error connecting WhatsApp:', err);
                socket.emit('error', { message: 'Failed to initiate WhatsApp connection' });
            }
        });

        socket.on('whatsapp:disconnect', async () => {
            try {
                const tenantId = socket.user.tenant_id;
                console.log(`[Socket] whatsapp:disconnect requested by Tenant ${tenantId}`);
                deleteSession(tenantId);
                io.to(`tenant:${tenantId}`).emit('whatsapp:status', { tenantId, status: 'disconnected' });
            } catch (err) {
                console.error('Error disconnecting WhatsApp:', err);
            }
        });

        socket.on('whatsapp:check_status', () => {
            const tenantId = socket.user.tenant_id;
            const status = getStatus(tenantId);
            socket.emit('whatsapp:status', { tenantId, status });
        });

        // --- End WhatsApp Events ---

        socket.on('send_message', async (data) => {
            // data: { receiverId, text, attachment }
            try {
                const { receiverId, text, attachment } = data;

                // Save to DB (mock tenant check if needed)
                const message = await ChatMessage.create({
                    tenant_id: socket.user.tenant_id,
                    sender_id: socket.user.id,
                    receiver_id: receiverId,
                    content: text,
                    attachment_url: attachment?.url,
                    attachment_type: attachment?.type,
                    is_ai_generated: false,
                    is_read: false
                });

                // Construct message object for frontend
                const messagePayload = {
                    id: message.id,
                    text: message.content,
                    senderId: message.sender_id,
                    timestamp: message.created_at, // Helper to format time needed?
                    attachment: message.attachment_url ? {
                        url: message.attachment_url,
                        type: message.attachment_type,
                        name: 'Anexo' // In real app, store name too
                    } : undefined
                };

                // Emit to receiver
                io.to(`user:${receiverId}`).emit('receive_message', messagePayload);

                // Return to sender (for confirmation/optimistic update sync)
                socket.emit('message_sent', messagePayload);

                // AI Placeholder logic
                // Check if receiver has AI enabled (mock check)
                // If so, trigger AI response after delay
            } catch (err) {
                console.error('Error sending message:', err);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.user.id);
            socket.broadcast.emit('user_status', { userId: socket.user.id, status: 'offline' });
        });
    });

    return io;
};

module.exports = { initSocket, getIo: () => io };
