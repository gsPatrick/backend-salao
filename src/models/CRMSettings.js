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
                tagIcon: '⭐',
                tagTitle: 'Novo',
                ai_actions: [
                    {
                        title: 'Funil Novos Clientes',
                        description: "Objetivo: Converter novos contatos em agendamento.\nO cliente permanece neste funil até realizar o primeiro agendamento.\nFluxo:\n1. Enviar mensagem de boas-vindas personalizada.\n2. Realizar até 8 tentativas de agendamento com intervalos progressivos.\n\nCronograma de tentativas (a partir da data de entrada no funil):\n1ª tentativa: Dia 0 (mesmo dia)\n2ª tentativa: Dia 2\n3ª tentativa: Dia 3\n4ª tentativa: Dia 4\n5ª tentativa: Dia 5\n6ª tentativa: Dia 12 (1 semana após a 5ª)\n7ª tentativa: Dia 19 (1 semana após a 6ª)\n8ª tentativa: Dia 26 (1 semana após a 7ª)\n\nRegras de saída:\n- Se o cliente agendar → mover para Funil Agendados.\n- Se não responder após 8ª tentativa → mover para Funil Inativos.",
                        active: true,
                        attempt_schedule: [0, 2, 3, 4, 5, 12, 19, 26],
                        max_attempts: 8,
                        exit_triggers: {
                            on_schedule: 'scheduled',
                            on_max_attempts: 'inactive'
                        },
                        message_templates: [
                            "Olá, [Nome]! 😊 Bem-vindo(a) à [Nome do Negócio]! Vimos que tem interesse em nossos serviços. Que tal agendarmos um horário especial para você?",
                            "Oi, [Nome]! Tudo bem? 💇‍♀️ Ainda não tivemos a chance de te atender. Posso te ajudar a encontrar o melhor horário?",
                            "Olá, [Nome]! Passando para lembrar que temos horários disponíveis esta semana. Quer que eu reserve um para você? 📅",
                            "[Nome], vi que você ainda não agendou. Temos uma equipe incrível esperando para te atender! Posso ajudar? ✨",
                            "Ei, [Nome]! 👋 Última chamada da semana! Temos vagas especiais. Aproveite para agendar agora.",
                            "Oi, [Nome]! Faz uma semana que conversamos. Ainda está interessado(a)? Temos novidades que vão te encantar! 💫",
                            "[Nome], ainda estamos por aqui! 😊 Que tal conhecer nosso espaço? Posso reservar um horário exclusivo para você.",
                            "Olá, [Nome]! Esta é nossa última tentativa de contato. Se quiser agendar no futuro, é só nos chamar! Estaremos sempre aqui. 💜"
                        ]
                    }
                ]
            },
            {
                id: 'scheduled',
                title: 'Agendados',
                icon: '✅',
                visible: true,
                deletable: false,
                tagIcon: '✅',
                tagTitle: 'Agendado',
                ai_actions: [
                    {
                        title: 'Funil Agendados',
                        description: "Objetivo: Garantir o comparecimento do cliente ao agendamento.\nPermanece neste funil todo cliente com agendamento futuro.\n\nMensagens automáticas:\n- Lembrete 1: 48 horas antes do agendamento.\n- Confirmação: 24 horas antes (com opções 1=Confirmar, 2=Desmarcar, 3=Reagendar).\n- Lembrete final: 2 horas antes.\n\nInterpretação de resposta (via IA):\n- 'Sim', 'Ok', '1', 'Pode marcar' → Confirmar agendamento.\n- 'Não', '2', 'Não vou', 'Cancelar' → Desmarcar, mover para Faltantes.\n- 'Reagendar', '3', 'Trocar horário' → Iniciar reagendamento.\n\nRegras de saída:\n- Se desmarcar/faltar → mover para Funil Faltantes.\n- Se concluir o atendimento sem novo agendamento → mover para Funil Recorrentes.",
                        active: true,
                        reminder_schedule: { hours_before: [48, 24, 2] },
                        exit_triggers: {
                            on_cancel: 'absent',
                            on_no_show: 'absent',
                            on_complete_no_reschedule: 'recurrent'
                        },
                        message_templates: [
                            "Olá, [Nome]! 📅 Lembrando que seu agendamento na [Nome do Negócio] é daqui a 2 dias. Estamos preparando tudo para você!",
                            "Oi, [Nome]! Seu horário é amanhã! 🕐 Confirme sua presença:\n\n1️⃣ Confirmar\n2️⃣ Desmarcar\n3️⃣ Reagendar\n\nResponda com o número da opção ou escreva normalmente.",
                            "Ei, [Nome]! ⏰ Faltam apenas 2 horas para o seu horário na [Nome do Negócio]. Estamos te esperando! 💫"
                        ]
                    }
                ]
            },
            {
                id: 'absent',
                title: 'Faltantes',
                icon: '❌',
                visible: true,
                deletable: false,
                tagIcon: '❌',
                tagTitle: 'Faltou',
                ai_actions: [
                    {
                        title: 'Funil Faltantes',
                        description: "Objetivo: Recuperar clientes que faltaram ou desmarcaram.\nEntram neste funil clientes com status Faltou/Desmarcou na agenda.\n\nCronograma de tentativas (mesma cadência de Novos Clientes):\n1ª tentativa: Dia 0 (mesmo dia da falta)\n2ª tentativa: Dia 2\n3ª tentativa: Dia 3\n4ª tentativa: Dia 4\n5ª tentativa: Dia 5\n6ª tentativa: Dia 12\n7ª tentativa: Dia 19\n8ª tentativa: Dia 26\n\nRegras de saída:\n- Se reagendar → mover para Funil Agendados.\n- Se não reagendar após 8ª tentativa → mover para Funil Inativos.",
                        active: true,
                        attempt_schedule: [0, 2, 3, 4, 5, 12, 19, 26],
                        max_attempts: 8,
                        exit_triggers: {
                            on_schedule: 'scheduled',
                            on_max_attempts: 'inactive'
                        },
                        message_templates: [
                            "Oi, [Nome]! 😔 Sentimos sua falta hoje na [Nome do Negócio]. Aconteceu algo? Podemos reagendar para um horário melhor!",
                            "[Nome], tudo bem? Vimos que não conseguiu comparecer. Sem problemas! Que tal remarcarmos? Temos horários livres 📅",
                            "Olá, [Nome]! Ainda estamos com seu lugar guardado 💛 Quer reagendar para esta semana?",
                            "[Nome], sabemos que imprevistos acontecem. Temos disponibilidade esta semana se quiser remarcar! 😊",
                            "Ei, [Nome]! 👋 Nossos profissionais estão com saudade! Posso reservar um horário especial pra você?",
                            "Oi, [Nome]! Já faz uma semana. Estamos com novidades e adoraríamos te receber novamente 💫",
                            "[Nome], sentimos sua falta! Que tal aproveitar um horário exclusivo? Vou te ajudar a encontrar o melhor dia 📆",
                            "Olá, [Nome]! Esta é nossa última tentativa. Quando quiser voltar, é só nos chamar. Estamos sempre aqui por você! 💜"
                        ]
                    }
                ]
            },
            {
                id: 'recurrent',
                title: 'Recorrentes (Ativos)',
                icon: '💎',
                visible: true,
                deletable: false,
                tagIcon: '💎',
                tagTitle: 'Recorrente',
                ai_actions: [
                    {
                        title: 'Funil Recorrente',
                        description: "Objetivo: Manter clientes ativos e fidelizados.\nPermanecem neste funil clientes que concluem agendamentos normalmente.\n\nMonitoramento passivo:\n- Se o cliente ficar 60 dias sem novo agendamento → mover automaticamente para Funil Inativos.\n- Se houver novo agendamento dentro do prazo → permanece como recorrente.",
                        active: true,
                        inactivity_days: 60,
                        exit_triggers: {
                            on_inactivity: 'inactive'
                        }
                    }
                ]
            },
            {
                id: 'inactive',
                title: 'Inativos (+60 Dias)',
                icon: '⏳',
                visible: true,
                deletable: false,
                tagIcon: '⏳',
                tagTitle: 'Inativo',
                ai_actions: [
                    {
                        title: 'Funil Inativo',
                        description: "Objetivo: Reativar clientes sem movimentação há mais de 60 dias.\n\n2 ciclos de 8 tentativas de reativação:\nCiclo 1: Mesma cadência (Dia 0, 2, 3, 4, 5, 12, 19, 26)\nIntervalo: 30 dias após a última tentativa do Ciclo 1.\nCiclo 2: Repetir a cadência.\n\nAbordagem personalizada:\n- Cliente já atendido: Mensagem cordial de retorno mencionando último atendimento.\n- Cliente que nunca agendou: Mensagem convidativa para primeira experiência.\n\nRegras de saída:\n- Se agendar → mover para Funil Agendados.\n- Se não agendar após 2 ciclos → permanecer como Inativo (sem mais tentativas automáticas).",
                        active: true,
                        attempt_schedule: [0, 2, 3, 4, 5, 12, 19, 26],
                        max_attempts: 8,
                        max_cycles: 2,
                        cycle_interval_days: 30,
                        exit_triggers: {
                            on_schedule: 'scheduled'
                        },
                        message_templates: [
                            "Olá, [Nome]! 😊 Faz tempo que não te vemos por aqui na [Nome do Negócio]. Sentimos sua falta! Que tal agendar um horário?",
                            "[Nome], tudo bem? Temos novidades e gostaríamos muito de te atender novamente. Posso verificar os melhores horários? 💇‍♀️",
                            "Oi, [Nome]! Preparamos condições especiais para clientes como você. Que tal voltar? ✨",
                            "[Nome], nossos profissionais perguntaram por você! 😊 Vamos agendar seu retorno?",
                            "Ei, [Nome]! 👋 Tem algum serviço que gostaria de experimentar? Temos novidades que vão te surpreender!",
                            "Oi, [Nome]! Já faz um tempinho. Se estiver buscando um cuidado especial, estamos aqui 💫",
                            "[Nome], queremos muito te receber novamente! Posso reservar um horário VIP para você? 👑",
                            "Olá, [Nome]! Esta é nossa última chamada por enquanto. Quando quiser voltar, estamos sempre de braços abertos! 💜"
                        ]
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
