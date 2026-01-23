const express = require('express');
const router = express.Router();
const path = require('path');

// Import feature routes
const authRoutes = require('../features/Auth/auth.routes');
const userRoutes = require('../features/User/user.routes');
const tenantRoutes = require('../features/Tenant/tenant.routes');
const planRoutes = require('../features/Plan/plan.routes');
const superAdminRoutes = require('../features/SuperAdmin/superadmin.routes');
const clientRoutes = require('../features/Client/client.routes');
const serviceRoutes = require('../features/Service/service.routes');
const professionalRoutes = require('../features/Professional/professional.routes');
const appointmentRoutes = require('../features/Appointment/appointment.routes');
const financeRoutes = require('../features/Finance/finance.routes');
const stockRoutes = require('../features/Stock/stock.routes');
const crmRoutes = require('../features/CRM/crm.routes');
const timeClockRoutes = require('../features/TimeClock/time_clock.routes');
const chatRoutes = require('../features/Chat/chat.routes');
const reportRoutes = require('../features/Report/report.routes');
const marketingRoutes = require('../features/Marketing/marketing.routes'); // New Marketing Routes
const aiRoutes = require('../features/AI/ai.routes'); // New AI Routes
const notificationRoutes = require('../features/Notification/notification.routes');
const contractRoutes = require('../features/Contract/contract.routes');
const promotionRoutes = require('../features/Promotion/promotion.routes');
const packageRoutes = require('../features/Package/package.routes');
const adminRoutes = require('../features/Admin/admin.routes');
const supportRoutes = require('../features/Support/support.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/tenants', tenantRoutes);
router.use('/contracts', contractRoutes);
router.use('/promotions', promotionRoutes);
router.use('/packages', packageRoutes);
router.use('/plans', planRoutes);
router.use('/super-admin', superAdminRoutes);
router.use('/clients', clientRoutes);
router.use('/services', serviceRoutes);
router.use('/professionals', professionalRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/finance', financeRoutes);
router.use('/stock', stockRoutes);
router.use('/crm', crmRoutes);
router.use('/time-clock', timeClockRoutes);
router.use('/chat', chatRoutes);
router.use('/reports', reportRoutes);
router.use('/marketing', marketingRoutes); // Mount Marketing
router.use('/ai', aiRoutes); // Mount AI
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);
router.use('/support', supportRoutes);

// Health Check
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date(),
        version: '1.0.5-final-fixes'
    });
});

module.exports = router;
