# Documentação Completa - API Salão24h

## Visão Geral

Backend Node.js/Express com Sequelize ORM para PostgreSQL, localizado em `/Users/patricksiqueira/salao/api`.

---

## Estrutura de Pastas

```
api/
├── app.js              # Express app com middlewares
├── server.js           # Entry point do servidor
├── package.json        # Dependências
├── .env                # Variáveis de ambiente
├── README.md           # Documentação básica
└── src/
    ├── config/
    │   ├── database.js     # Configuração PostgreSQL/Sequelize
    │   ├── cors.js         # Configuração CORS
    │   └── index.js        # Exportação de configs
    ├── models/             # 10 modelos Sequelize
    │   ├── index.js        # Inicialização e associações
    │   ├── Plan.js         # Planos de assinatura
    │   ├── Tenant.js       # Tenants (salões)
    │   ├── User.js         # Usuários
    │   ├── Client.js       # Clientes
    │   ├── Professional.js # Profissionais
    │   ├── Service.js      # Serviços
    │   ├── Appointment.js  # Agendamentos
    │   ├── FinancialTransaction.js # Transações
    │   ├── TrainingVideo.js # Vídeos de treinamento
    │   └── AdBanner.js     # Banners publicitários
    ├── features/           # 9 módulos de funcionalidade
    │   ├── Auth/
    │   ├── User/
    │   ├── Tenant/
    │   ├── Plan/
    │   ├── SuperAdmin/
    │   ├── Client/
    │   ├── Professional/
    │   ├── Service/
    │   ├── Appointment/
    │   └── Finance/
    ├── services/           # Integrações externas
    │   ├── whatsapp.service.js
    │   ├── ai.service.js
    │   └── payment.service.js
    ├── routes/
    │   └── index.js        # Montagem central de rotas
    └── seeders/
        └── seed.js         # Seeder inicial
```

---

## Modelos de Dados (10)

### Plan (Planos de Assinatura)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | PK |
| name | STRING | Nome interno (individual, essencial, pro, premium, vitalicio) |
| display_name | STRING | Nome de exibição |
| price | DECIMAL | Preço mensal |
| max_professionals | INTEGER | Limite de profissionais (null = ilimitado) |
| max_clients | INTEGER | Limite de clientes |
| max_units | INTEGER | Limite de unidades |
| ai_voice_response | BOOLEAN | Feature flag: IA |
| priority_support | BOOLEAN | Feature flag: Suporte prioritário |
| whatsapp_integration | BOOLEAN | Feature flag: WhatsApp |
| financial_reports | BOOLEAN | Feature flag: Relatórios |
| marketing_campaigns | BOOLEAN | Feature flag: Marketing |

### Tenant (Salões)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | PK |
| name | STRING | Nome do salão |
| slug | STRING | Slug único |
| plan_id | FK → Plan | Plano contratado |
| owner_user_id | FK → User | Dono |
| phone, email | STRING | Contato |
| address | JSONB | Endereço |
| subscription_status | ENUM | trial, active, past_due, canceled |
| is_active | BOOLEAN | Ativo |

### User (Usuários)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | PK |
| tenant_id | FK → Tenant | null para Super Admin |
| name, email | STRING | Dados básicos |
| password | STRING | Hash bcrypt |
| role | ENUM | admin, gerente, recepcao, profissional |
| is_super_admin | BOOLEAN | Wagner é true |
| permissions | JSONB | Permissões customizadas |

### Client, Professional, Service, Appointment, FinancialTransaction
Todos com `tenant_id` obrigatório para isolamento de dados.

### TrainingVideo, AdBanner
Sem `tenant_id` - recursos globais do Super Admin.

---

## Features/Endpoints (9 módulos)

### 1. Auth Feature
| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | /api/auth/login | Login | Público |
| POST | /api/auth/register | Registrar tenant | Público |
| POST | /api/auth/refresh | Renovar token | JWT |
| GET | /api/auth/me | Perfil atual | JWT |
| PUT | /api/auth/password | Alterar senha | JWT |

### 2. User Feature
| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | /api/users | Listar usuários | JWT + Admin/Gerente |
| GET | /api/users/:id | Detalhe usuário | JWT |
| POST | /api/users | Criar usuário | JWT + Admin/Gerente |
| PUT | /api/users/:id | Atualizar | JWT + Admin/Gerente |
| DELETE | /api/users/:id | Desativar | JWT + Admin |
| PATCH | /api/users/:id/toggle-suspend | Suspender | JWT + Admin |

### 3. Tenant Feature
| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | /api/tenants | Listar todos | Super Admin |
| GET | /api/tenants/:id | Detalhe | JWT |
| POST | /api/tenants | Criar | Super Admin |
| PUT | /api/tenants/:id | Atualizar | Super Admin |
| DELETE | /api/tenants/:id | Desativar | Super Admin |

### 4. Plan Feature
| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | /api/plans | Listar planos | Público |
| GET | /api/plans/:id | Detalhe | Público |
| POST | /api/plans | Criar | Super Admin |
| PUT | /api/plans/:id | Atualizar | Super Admin |
| DELETE | /api/plans/:id | Desativar | Super Admin |

### 5. SuperAdmin Feature
| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | /api/admin/training-videos | Listar vídeos | JWT |
| POST | /api/admin/training-videos | Criar vídeo | Super Admin |
| PUT | /api/admin/training-videos/:id | Atualizar | Super Admin |
| DELETE | /api/admin/training-videos/:id | Remover | Super Admin |
| GET | /api/admin/banners | Listar banners | JWT |
| POST | /api/admin/banners | Criar banner | Super Admin |
| PUT | /api/admin/banners/:id | Atualizar | Super Admin |
| DELETE | /api/admin/banners/:id | Remover | Super Admin |
| POST | /api/admin/banners/:id/click | Track click | JWT |

### 6. Client Feature
| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | /api/clients | Listar (tenant-scoped) | JWT + Tenant |
| GET | /api/clients/search | Buscar | JWT + Tenant |
| GET | /api/clients/:id | Detalhe | JWT + Tenant |
| POST | /api/clients | Criar | JWT + Tenant |
| PUT | /api/clients/:id | Atualizar | JWT + Tenant |
| DELETE | /api/clients/:id | Arquivar | JWT + Tenant |
| PATCH | /api/clients/:id/block | Bloquear | JWT + Tenant |

### 7. Professional Feature
| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | /api/professionals | Listar | JWT + Tenant |
| GET | /api/professionals/:id | Detalhe | JWT + Tenant |
| POST | /api/professionals | Criar | JWT + Admin/Gerente |
| PUT | /api/professionals/:id | Atualizar | JWT + Admin/Gerente |
| DELETE | /api/professionals/:id | Arquivar | JWT + Admin/Gerente |
| PATCH | /api/professionals/:id/suspend | Suspender | JWT + Admin/Gerente |
| PATCH | /api/professionals/:id/services | Atribuir serviços | JWT + Admin/Gerente |

### 8. Service Feature
| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | /api/services | Listar | JWT + Tenant |
| GET | /api/services/:id | Detalhe | JWT + Tenant |
| POST | /api/services | Criar | JWT + Admin/Gerente |
| PUT | /api/services/:id | Atualizar | JWT + Admin/Gerente |
| DELETE | /api/services/:id | Desativar | JWT + Admin/Gerente |
| PATCH | /api/services/:id/professionals | Atribuir profissionais | JWT + Admin/Gerente |

### 9. Appointment Feature
| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | /api/appointments | Listar | JWT + Tenant |
| GET | /api/appointments/date/:date | Por data | JWT + Tenant |
| GET | /api/appointments/professional/:id | Por profissional | JWT + Tenant |
| GET | /api/appointments/:id | Detalhe | JWT + Tenant |
| POST | /api/appointments | Criar | JWT + Tenant |
| PUT | /api/appointments/:id | Atualizar | JWT + Tenant |
| PATCH | /api/appointments/:id/status | Alterar status | JWT + Tenant |
| PATCH | /api/appointments/:id/cancel | Cancelar | JWT + Tenant |

### 10. Finance Feature
| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | /api/finance | Listar transações | JWT + Tenant |
| GET | /api/finance/summary | Resumo financeiro | JWT + Tenant + Plan |
| GET | /api/finance/:id | Detalhe | JWT + Tenant |
| POST | /api/finance | Criar | JWT + Admin/Gerente |
| PUT | /api/finance/:id | Atualizar | JWT + Admin/Gerente |
| DELETE | /api/finance/:id | Cancelar | JWT + Admin |
| PATCH | /api/finance/:id/pay | Marcar como pago | JWT + Admin/Gerente |

---

## Middleware de Autenticação

### `authenticate`
- Verifica JWT no header `Authorization: Bearer <token>`
- Injeta no request:
  - `req.user` - Objeto user completo
  - `req.userId` - ID do usuário
  - `req.tenantId` - ID do tenant (null para Super Admin)
  - `req.isSuperAdmin` - Boolean
  - `req.userRole` - Role do usuário
  - `req.plan` - Plano do tenant com feature flags

### `requireSuperAdmin`
- Bloqueia acesso se não for Super Admin

### `requireRoles(...roles)`
- Permite apenas roles especificadas
- Super Admin sempre tem acesso

### `requireTenant`
- Garante que usuário tem contexto de tenant

### `requirePlanFeature(feature)`
- Verifica se plano permite a feature
- Retorna erro com código `PLAN_UPGRADE_REQUIRED`

---

## Serviços Externos (Placeholders)

### whatsapp.service.js (Z-API)
- `sendMessage(phone, message)`
- `sendAppointmentReminder(client, appointment)`
- `sendAppointmentConfirmation(client, appointment, service, professional)`

### ai.service.js (OpenAI)
- `checkPlanAllowsAI(tenantId)` - Verifica plano
- `getAIResponse(tenantId, prompt, context)`
- `generateVoiceResponse(tenantId, customerMessage)`
- `suggestServices(tenantId, clientHistory)`

### payment.service.js (Asaas)
- `createCustomer(data)`
- `createSubscription(customerId, planId, paymentMethod)`
- `createCharge(customerId, amount, description)`
- `processWebhook(event, data)`
- `getPaymentStatus(chargeId)`
- `cancelSubscription(subscriptionId)`

---

## Seeder

O arquivo `src/seeders/seed.js` cria:

### Planos (5)
| Nome | Preço | IA | Suporte VIP |
|------|-------|-----|------------|
| Individual | R$ 79,87 | ❌ | ❌ |
| Essencial | R$ 199,90 | ❌ | ❌ |
| Pro | R$ 349,90 | ✅ | ❌ |
| Premium | R$ 599,90 | ✅ | ✅ |
| Vitalício | Grátis | ✅ | ✅ |

### Tenant Padrão
- Nome: "Salão 24h Demo"
- Plano: Pro

### Usuários
| Email | Senha | Role |
|-------|-------|------|
| admin@salao24h.com | admin | Super Admin |
| gerente@salao24h.com | 123 | Gerente |
| concierge@salao24h.com | 123 | Recepção |
| fernanda@salao24h.com | 123 | Profissional |
| maria@salao24h.com | 123 | Profissional |

---

## Segurança

- **Senhas**: Hash bcrypt (salt 10 rounds)
- **Tokens**: JWT com expiração configurável
- **Multi-tenancy**: Todas queries filtradas por `tenant_id`
- **RBAC**: Verificação de role em cada endpoint
- **Feature Flags**: Verificação de plano para recursos premium
