const sequelize = require('../config/db');

// Import all models
const models = {
    User: require('./User'),
    Tenant: require('./Tenant'),
    Plan: require('./Plan'),
    Client: require('./Client'),
    Professional: require('./Professional'),
    ProfessionalReview: require('./ProfessionalReview'),
    Service: require('./Service'),
    Appointment: require('./Appointment'),
    FinancialTransaction: require('./FinancialTransaction'),
    StockTransaction: require('./StockTransaction'),
    Product: require('./Product'),
    TimeRecord: require('./TimeRecord'),
    CRMSettings: require('./CRMSettings'),
    TrainingVideo: require('./TrainingVideo'),
    AdBanner: require('./AdBanner'),
    Notification: require('./Notification'),
    SupportTicket: require('./SupportTicket'),
    Campaign: require('../features/Marketing/campaign.model'),
    AcquisitionChannel: require('../features/Marketing/acquisition_channel.model'),
    DirectMailCampaign: require('../features/Marketing/direct_mail_campaign.model'),
    AIChat: require('./AIChat'),
    AIAgentConfig: require('../features/AI/ai_agent_config.model'),
    Promotion: require('../features/Promotion/promotion.model'),
    ContractTemplate: require('../features/Contract/contract.model'),
    MonthlyPackage: require('../features/Package/package.model').MonthlyPackage,
    PackageSubscription: require('../features/Package/package.model').PackageSubscription,
    Lead: require('../features/CRM/lead.model'),
    MarketingCampaign: require('../features/Marketing/marketing_campaign.model')
};

// Initialize models
const db = {};
Object.keys(models).forEach(modelName => {
    const modelExport = models[modelName];

    // If it's a function and NOT a Sequelize model already (which has .sequelize property)
    if (typeof modelExport === 'function' && !modelExport.sequelize) {
        db[modelName] = modelExport(sequelize);
    } else {
        db[modelName] = modelExport;
    }
});

// Establish Associations
const {
    User, Tenant, Plan, Client, Professional, Service, Appointment,
    FinancialTransaction, StockTransaction, Product, TimeRecord,
    CRMSettings, TrainingVideo, AdBanner, Notification, SupportTicket,
    Campaign, AcquisitionChannel, DirectMailCampaign, AIChat, AIAgentConfig,
    Promotion, ContractTemplate, MonthlyPackage, PackageSubscription,
    Lead, MarketingCampaign
} = db;

// Notification associations
Tenant.hasMany(Notification, { foreignKey: 'tenant_id' });
Notification.belongsTo(Tenant, { foreignKey: 'tenant_id' });

User.hasMany(Notification, { foreignKey: 'user_id' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

// SupportTicket associations
Tenant.hasMany(SupportTicket, { foreignKey: 'tenant_id' });
SupportTicket.belongsTo(Tenant, { foreignKey: 'tenant_id' });

User.hasMany(SupportTicket, { foreignKey: 'user_id' });
SupportTicket.belongsTo(User, { foreignKey: 'user_id' });

// Tenant associations
Tenant.hasMany(User, { foreignKey: 'tenant_id' });
User.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });

Tenant.belongsTo(Plan, { foreignKey: 'plan_id', as: 'plan' });
Plan.hasMany(Tenant, { foreignKey: 'plan_id' });

// Professional associations
Tenant.hasMany(Professional, { foreignKey: 'tenant_id', as: 'professionals' });
Professional.belongsTo(Tenant, { foreignKey: 'tenant_id' });

Professional.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasOne(Professional, { foreignKey: 'user_id' });

// Service associations
Tenant.hasMany(Service, { foreignKey: 'tenant_id', as: 'services' });
Service.belongsTo(Tenant, { foreignKey: 'tenant_id' });

// Professional-Service Many-to-Many
Professional.belongsToMany(Service, {
    through: 'professional_services',
    as: 'services',
    foreignKey: 'professional_id',
    otherKey: 'service_id'
});
Service.belongsToMany(Professional, {
    through: 'professional_services',
    as: 'professionals',
    foreignKey: 'service_id',
    otherKey: 'professional_id'
});

// Client associations
Tenant.hasMany(Client, { foreignKey: 'tenant_id' });
Client.belongsTo(Tenant, { foreignKey: 'tenant_id' });

// Appointment associations
Tenant.hasMany(Appointment, { foreignKey: 'tenant_id' });
Appointment.belongsTo(Tenant, { foreignKey: 'tenant_id' });

Appointment.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
Client.hasMany(Appointment, { foreignKey: 'client_id' });

Appointment.belongsTo(Professional, { foreignKey: 'professional_id', as: 'professional' });
Professional.hasMany(Appointment, { foreignKey: 'professional_id' });

Appointment.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });
Service.hasMany(Appointment, { foreignKey: 'service_id' });

// FinancialTransaction associations
Tenant.hasMany(FinancialTransaction, { foreignKey: 'tenant_id' });
FinancialTransaction.belongsTo(Tenant, { foreignKey: 'tenant_id' });

FinancialTransaction.belongsTo(Appointment, { foreignKey: 'appointment_id', as: 'appointment' });
Appointment.hasMany(FinancialTransaction, { foreignKey: 'appointment_id' });

// Stock associations
Tenant.hasMany(Product, { foreignKey: 'tenant_id' });
Product.belongsTo(Tenant, { foreignKey: 'tenant_id' });

Product.hasMany(StockTransaction, { foreignKey: 'product_id', as: 'transactions' });
StockTransaction.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Time Clock associations
Professional.hasMany(TimeRecord, { foreignKey: 'professional_id', as: 'time_records' });
TimeRecord.belongsTo(Professional, { foreignKey: 'professional_id', as: 'professional' });

// CRM associations
Tenant.hasOne(CRMSettings, { foreignKey: 'tenant_id', as: 'crm_settings' });
CRMSettings.belongsTo(Tenant, { foreignKey: 'tenant_id' });

// Marketing associations
Tenant.hasMany(Campaign, { foreignKey: 'tenant_id' }); // Assuming Campaign has tenant_id, need to check/add it
Campaign.belongsTo(Tenant, { foreignKey: 'tenant_id' });

Tenant.hasMany(AcquisitionChannel, { foreignKey: 'tenant_id' }); // Assuming AcquisitionChannel has tenant_id
AcquisitionChannel.belongsTo(Tenant, { foreignKey: 'tenant_id' });

Tenant.hasMany(DirectMailCampaign, { foreignKey: 'tenant_id' });
DirectMailCampaign.belongsTo(Tenant, { foreignKey: 'tenant_id' });

Tenant.hasMany(AIChat, { foreignKey: 'tenant_id', as: 'ai_chats' });
AIChat.belongsTo(Tenant, { foreignKey: 'tenant_id' });

// Promotion associations
Tenant.hasMany(Promotion, { foreignKey: 'tenant_id' });
Promotion.belongsTo(Tenant, { foreignKey: 'tenant_id' });

// Contract associations
Tenant.hasMany(ContractTemplate, { foreignKey: 'tenant_id' });
ContractTemplate.belongsTo(Tenant, { foreignKey: 'tenant_id' });

// Package associations
Tenant.hasMany(MonthlyPackage, { foreignKey: 'tenant_id' });
MonthlyPackage.belongsTo(Tenant, { foreignKey: 'tenant_id' });

Tenant.hasMany(PackageSubscription, { foreignKey: 'tenant_id' });
PackageSubscription.belongsTo(Tenant, { foreignKey: 'tenant_id' });

// Lead associations
Tenant.hasMany(Lead, { foreignKey: 'tenant_id' });
Lead.belongsTo(Tenant, { foreignKey: 'tenant_id' });

// MarketingCampaign associations
Tenant.hasMany(MarketingCampaign, { foreignKey: 'tenant_id' });
MarketingCampaign.belongsTo(Tenant, { foreignKey: 'tenant_id' });

db.sequelize = sequelize;

module.exports = db;
