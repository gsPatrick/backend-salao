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
                icon: '⭐',
                visible: true,
                deletable: false,
                ai_actions: [
                    {
                        title: 'Funil Novo Clientes',
                        description: "Objetivo: Converter novos contatos em agendamento.\n\nO cliente permanece neste funil até realizar o primeiro agendamento.\n\nFluxo:\nEnviar mensagem de boas-vindas.\n\nRealizar tentativas de agendamento:\n1ª tentativa: no mesmo dia do primeiro contato.\n2ª tentativa: 2º dia após o primeiro contato.\n3ª tentativa: 3º dia após o primeiro contato.\n4ª tentativa: 7 dias após o primeiro contato.\n5ª tentativa: 14 dias após o primeiro contato.\n6ª tentativa: 21 dias após o primeiro contato.\n\nRegras:\nSe o cliente agendar → alterar status na agenda para Agendado e mover para Funil Agendados.\nSe não responder ou não agendar após todas as tentativas → mover para Funil Inativo.\n",
                        active: true
                    }
                ]
            },
            {
                id: 'scheduled',
                title: 'Agendados',
                icon: '✅',
                visible: true,
                deletable: false,
                ai_actions: [
                    {
                        title: 'Funil Agendados',
                        description: "Objetivo: Gestão de clientes com agendamento confirmado ou pendente.\n\nPermanece neste funil todo cliente com agendamento futuro.\n\nMensagens automáticas:\nLembrete 72h antes do agendamento.\nMensagem de confirmação 24h antes.\nLembrete final 3h antes.\n\nRegras:\nConfirmou → alterar status para Confirmado na agenda.\nDesmarcou  →  alterar status para Faltou na agenda, remover o cliente da agenda, mover para Funil Faltantes. \nConcluiu atendimento e não possui novo agendamento → mover para Funil Recorrente.\n",
                        active: true
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
                        title: 'Funil Faltantes',
                        description: "Objetivo: Recuperar clientes que faltaram ou desmarcaram.\n\nEntram neste funil clientes com status Faltou na agenda.\n\nTentativas de reagendamento:\n1ª tentativa: no mesmo dia da falta.\n2ª tentativa: 2º dia após a falta.\n3ª tentativa: 3º dia após a falta.\n4ª tentativa: 7 dias após a falta.\n5ª tentativa: 14 dias após a falta.\n6ª tentativa: 21 dias após a falta.\n\nRegras:\nSe reagendar → alterar status para Agendado e mover para Funil Agendados.\n\nSe não responder ou não reagendar → mover para Funil Inativo.\n",
                        active: true
                    }
                ]
            },
            {
                id: 'recurrent',
                title: 'Recorrente',
                icon: '💎',
                visible: true,
                deletable: false,
                ai_actions: [
                    {
                        title: 'Funil Recorrente',
                        description: "Objetivo: Clientes ativos que costumam retornar.\n\nPermanecem neste funil os clientes que concluem seus agendamentos normalmente.\n\nCaso o cliente fique 59 dias sem novo agendamento, ao completar 60+ dias, ele deve ser automaticamente movido para o Funil Inativo.\n\nSe houver novo agendamento dentro do prazo, permanece como recorrente.\n",
                        active: true
                    }
                ]
            },
            {
                id: 'inactive',
                title: 'Inativo',
                icon: '⏳',
                visible: true,
                deletable: false,
                ai_actions: [
                    {
                        title: 'Funil Inativo',
                        description: "Objetivo: Reativar clientes sem movimentação há mais de 60 dias.\n\nEntram neste funil clientes que:\nEstão há mais de 60 dias sem atendimento.\nEstão há mais de 60 dias sem agendamento.\n\nAbordagem:\nCliente já atendido:\nMensagem cordial de retorno:\n“Faz tempo que não te vejo por aqui. Seu último atendimento foi no dia ___. Vamos agendar seu retorno?”\nCliente que nunca agendou:\nMensagem convidativa:\n“Faz um tempo que conversamos. Que tal agendar sua primeira experiência? Tenho certeza que você vai amar o atendimento.”\n\nTentativas:\n1ª tentativa: mesmo dia.\n2ª tentativa: 2º dia após a primeira tentativa.\n3ª tentativa: 3º dia após a primeira tentativa.\n4ª tentativa: 7 dias após a primeira tentativa.\n5ª tentativa: 14 dias após a primeira tentativa.\n6ª tentativa: 21 dias após a primeira tentativa.\n\nRegras:\nSe agendar →  alterar status para Agendado na agenda, mover para Funil Agendados.\nSe não agendar → reiniciar ciclo com novo contato após 30 dias da última tentativa.\n",
                        active: true
                    }
                ]
            }
        ]
    },
    automation_rules: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    classifications: {
        type: DataTypes.JSONB,
        defaultValue: [
            { icon: '💎', text: 'Recorrente' },
            { icon: '⭐', text: 'Novo' },
            { icon: '✅', text: 'Agendado' },
            { icon: '❌', text: 'Faltou' },
            { icon: '⏳', text: 'Inativo' }
        ]
    }
}, {
    tableName: 'crm_settings',
    underscored: true
});

module.exports = CRMSettings;
