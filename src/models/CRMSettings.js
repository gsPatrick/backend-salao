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
            {
                id: 'new',
                title: 'Novos Clientes',
                icon: '✨',
                visible: true,
                deletable: true,
                ai_actions: [
                    {
                        title: 'Boas-vindas',
                        description: 'Enviar mensagem de boas-vindas via WhatsApp e agendar primeiro contato.',
                        active: true
                    }
                ]
            },
            {
                id: 'recurrent',
                title: 'Recorrentes (Ativos)',
                icon: '💎',
                visible: true,
                deletable: true,
                ai_actions: [
                    {
                        title: 'Fidelização',
                        description: 'Manter engajamento com cliente ativo.',
                        active: false
                    }
                ]
            },
            {
                id: 'birthday',
                title: 'Aniversariante do Dia',
                icon: '🎂',
                visible: true,
                deletable: false,
                ai_actions: [
                    {
                        title: 'Mensagem de Aniversário',
                        description: 'Enviar mensagem automática de feliz aniversário com um cupom de 10% de desconto.',
                        active: true
                    }
                ]
            },
            {
                id: 'scheduled',
                title: 'Agendados Hoje',
                icon: '✅',
                visible: true,
                deletable: false,
                ai_actions: [
                    {
                        title: 'Lembrete de Agendamento',
                        description: 'Enviar lembrete 1 hora antes do horário. Confirmar com cliente se ele vem.',
                        active: false
                    }
                ]
            },
            {
                id: 'absent',
                title: 'Faltantes',
                icon: '❌',
                visible: true,
                deletable: false,
                ai_actions: [
                    {
                        title: 'Contato Pós-Falta',
                        description: 'Entrar em contato para entender o motivo da falta e oferecer reagendamento.',
                        active: false
                    }
                ]
            },
            {
                id: 'rescheduled',
                title: 'Reagendados',
                icon: '🔄',
                visible: true,
                deletable: false,
                ai_actions: [
                    {
                        title: 'Confirmar Reagendamento',
                        description: 'Enviar confirmação do novo horário para o cliente.',
                        active: true
                    }
                ]
            },
            {
                id: 'inactive',
                title: 'Inativas (60+ dias)',
                icon: '⏳',
                visible: true,
                deletable: false,
                ai_actions: [
                    {
                        title: 'Campanha de Reativação',
                        description: 'Enviar mensagem com oferta especial para clientes que não retornam há mais de 60 dias.',
                        active: false
                    }
                ]
            },
        ]
    },
    automation_rules: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    classifications: {
        type: DataTypes.JSONB,
        defaultValue: [
            { text: 'VIP', icon: '👑' },
            { text: 'Potencial', icon: '💡' },
            { text: 'Retorno', icon: '🔄' }
        ]
    }
}, {
    tableName: 'crm_settings',
    underscored: true
});

module.exports = CRMSettings;
