const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CRMSettings = sequelize.define('crm_settings', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tenant_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    funnel_stages: {
        type: DataTypes.JSONB,
        defaultValue: [
            { id: 'new', title: 'Novos Clientes', icon: '✨', visible: true, deletable: true, configTitle: 'Boas-vindas', configDescription: 'Enviar mensagem de boas-vindas via WhatsApp e agendar primeiro contato.', isAIActionActive: true },
            { id: 'recurrent', title: 'Recorrentes (Ativos)', icon: '💎', visible: true, deletable: true, configTitle: 'Fidelização', configDescription: 'Manter engajamento com cliente ativo.', isAIActionActive: false },
            { id: 'birthday', title: 'Aniversariante do Dia', icon: '🎂', visible: true, deletable: false, configTitle: 'Mensagem de Aniversário', configDescription: 'Enviar mensagem automática de feliz aniversário com um cupom de 10% de desconto.', isAIActionActive: true },
            { id: 'scheduled', title: 'Agendados Hoje', icon: '✅', visible: true, deletable: false, configTitle: 'Lembrete de Agendamento', configDescription: 'Enviar lembrete 1 hora antes do horário. Confirmar com cliente se ele vem.', isAIActionActive: false },
            { id: 'absent', title: 'Faltantes', icon: '❌', visible: true, deletable: false, configTitle: 'Contato Pós-Falta', configDescription: 'Entrar em contato para entender o motivo da falta e oferecer reagendamento.', isAIActionActive: false },
            { id: 'rescheduled', title: 'Reagendados', icon: '🔄', visible: true, deletable: false, configTitle: 'Confirmar Reagendamento', configDescription: 'Enviar confirmação do novo horário para o cliente.', isAIActionActive: true },
            { id: 'inactive', title: 'Inativas (60+ dias)', icon: '⏳', visible: true, deletable: false, configTitle: 'Campanha de Reativação', configDescription: 'Enviar mensagem com oferta especial para clientes que não retornam há mais de 60 dias.', isAIActionActive: false },
        ]
    },
    automation_rules: {
        type: DataTypes.JSONB,
        defaultValue: []
    }
}, {
    tableName: 'crm_settings',
    underscored: true
});

module.exports = CRMSettings;
