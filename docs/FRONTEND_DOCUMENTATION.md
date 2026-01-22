# Documentação Completa - Frontend Salão24h

## Visão Geral

O frontend é uma aplicação React/TypeScript construída com Vite, localizada em `/Users/patricksiqueira/salao/-salao24`.

---

## Estrutura de Pastas

```
-salao24/
├── components/          # 89 componentes React
├── contexts/            # Context API (LanguageContext)
├── data/                # mockData.ts (dados mock)
├── hooks/               # Custom hooks
├── lib/                 # Serviços e utilitários
├── App.tsx              # Componente raiz e roteamento
├── index.tsx            # Entry point
├── vite.config.ts       # Configuração Vite
└── package.json         # Dependências
```

---

## Componentes (89 arquivos)

### Landing Page & Marketing
| Componente | Descrição |
|------------|-----------|
| `Header.tsx` | Cabeçalho do site com navegação |
| `Footer.tsx` | Rodapé com links |
| `Features.tsx` | Seção de funcionalidades |
| `AIAssistant.tsx` | Showcase da IA |
| `AppMockup.tsx` | Demonstração visual do app |
| `Pricing.tsx` | Tabela de preços/planos |
| `ComparisonTable.tsx` | Comparação de planos |
| `Faq.tsx` | Perguntas frequentes |
| `AboutUs.tsx` | Sobre nós |
| `AppStoreBadges.tsx` | Badges de lojas de apps |
| `MobileExperience.tsx` | Experiência mobile |
| `NavigationFlow.tsx` | Fluxo de navegação |
| `QRCodeCheckin.tsx` | Check-in por QR Code |
| `BackToTopButton.tsx` | Botão voltar ao topo |
| `LanguageSelector.tsx` | Seletor de idioma |

### Autenticação & Usuário
| Componente | Descrição |
|------------|-----------|
| `LoginPage.tsx` | Login de usuários do sistema |
| `SignUpPage.tsx` | Cadastro de novos usuários |
| `TrialPage.tsx` | Página de trial |
| `ClientLoginPage.tsx` | Login de clientes |
| `ClientAppPage.tsx` | App do cliente |
| `AccountPage.tsx` | Página de conta do usuário |
| `PaymentPage.tsx` | Processamento de pagamentos |
| `ContractPage.tsx` | Visualização de contrato |
| `ContractSignaturePage.tsx` | Assinatura de contrato |
| `PrivacyPolicyPage.tsx` | Política de privacidade |
| `CancellationPage.tsx` | Cancelamento |

### Dashboard Principal
| Componente | Descrição |
|------------|-----------|
| `Dashboard.tsx` | Dashboard principal (233KB - maior arquivo) |
| `FinancialDashboardPage.tsx` | Dashboard financeiro |
| `ReportsPage.tsx` | Página de relatórios |
| `ReportViewerModal.tsx` | Visualizador de relatórios |

### Agenda & Agendamentos
| Componente | Descrição |
|------------|-----------|
| `GeneralAgendaPage.tsx` | Agenda geral |
| `ProfessionalAgendaPage.tsx` | Agenda por profissional |
| `ProfessionalColumn.tsx` | Coluna de profissional na agenda |
| `SchedulingPage.tsx` | Página de agendamento |
| `AppointmentCard.tsx` | Card de agendamento |
| `BlockTimeModal.tsx` | Bloquear horário |
| `ScheduleSettingsModal.tsx` | Configurações de horário |
| `SchedulingLinkModal.tsx` | Link de agendamento |
| `ReassignAppointmentModal.tsx` | Reatribuir agendamento |
| `ScheduleReturnModal.tsx` | Agendar retorno |
| `ReminderModal.tsx` | Lembretes |

### Clientes
| Componente | Descrição |
|------------|-----------|
| `ClientListPage.tsx` | Lista de clientes |
| `ClientDetailModal.tsx` | Detalhes do cliente (64KB) |
| `ClientSearchModal.tsx` | Busca de clientes |
| `ClientsContainer.tsx` | Container de clientes |
| `NewClientModal.tsx` | Novo cliente (70KB) |
| `PreRegistrationModal.tsx` | Pré-cadastro |
| `AddDocumentModal.tsx` | Adicionar documento |
| `BeforeAfterPreciseModal.tsx` | Antes/depois precisos |
| `SignatureModal.tsx` | Modal de assinatura |

### Profissionais
| Componente | Descrição |
|------------|-----------|
| `ProfessionalsPage.tsx` | Lista de profissionais |
| `NewProfessionalModal.tsx` | Novo profissional (43KB) |
| `TimeClockPage.tsx` | Ponto eletrônico (45KB) |

### Serviços & Produtos
| Componente | Descrição |
|------------|-----------|
| `ServicesPage.tsx` | Página de serviços |
| `NewServiceModal.tsx` | Novo serviço |
| `StockPage.tsx` | Gestão de estoque |
| `NewProductModal.tsx` | Novo produto |
| `NewPackageModal.tsx` | Novo pacote |
| `NewPlanModal.tsx` | Novo plano |

### CRM & Marketing
| Componente | Descrição |
|------------|-----------|
| `CRMPage.tsx` | Página de CRM (86KB) |
| `CRMSettingsModal.tsx` | Configurações CRM |
| `MarketingCampaigns.tsx` | Campanhas marketing (55KB) |
| `NewCampaignModal.tsx` | Nova campanha |
| `CampaignDetailsModal.tsx` | Detalhes da campanha |
| `DirectMailCampaign.tsx` | Campanhas de email |
| `DirectMailDetailsModal.tsx` | Detalhes email |
| `NewDirectMailModal.tsx` | Novo email marketing |
| `ChannelsPage.tsx` | Canais de aquisição (37KB) |
| `NewAcquisitionChannelModal.tsx` | Novo canal |
| `AcquisitionChannelsChart.tsx` | Gráfico de canais |
| `ReferralRanking.tsx` | Ranking de indicações |

### IA & Chat
| Componente | Descrição |
|------------|-----------|
| `AIAgentPage.tsx` | Página do agente IA (72KB) |
| `AIChatPage.tsx` | Chat com IA (53KB) |
| `ChatPage.tsx` | Chat geral |
| `InternalChat.tsx` | Chat interno |
| `YouTubeCommentModeration.tsx` | Moderação YouTube |
| `HairStyleTestModal.tsx` | Teste de corte IA |

### Configurações
| Componente | Descrição |
|------------|-----------|
| `SettingsPage.tsx` | Configurações (66KB) |
| `UnitManagementModal.tsx` | Gestão de unidades |
| `UserManagementModal.tsx` | Gestão de usuários |
| `EmailServerSettings.tsx` | Config. servidor email |
| `AccessHistoryPage.tsx` | Histórico de acessos |
| `TranslationPage.tsx` | Traduções |
| `TestConnection.tsx` | Teste de conexão |

### Suporte
| Componente | Descrição |
|------------|-----------|
| `SupportPage.tsx` | Página de suporte (28KB) |

### Financeiro
| Componente | Descrição |
|------------|-----------|
| `NewTransactionModal.tsx` | Nova transação |

---

## Dados Mock (mockData.ts)

### Interfaces Definidas
- `Client` - Dados de clientes
- `User` - Usuários do sistema
- `Professional` - Profissionais
- `Service` - Serviços
- `Transaction` - Transações financeiras
- `DirectMailCampaignData` - Campanhas de email

### Exports Principais
- `allDataByUnit` - Dados separados por unidade (multi-tenancy local)
- `initialClients` - Clientes iniciais
- `initialProfessionals` - Profissionais
- `initialServices` - Serviços
- `initialTransactions` - Transações
- `initialAppointments` - Agendamentos
- `systemUsers` - Usuários do sistema
- `dashboardData` - Dados do dashboard
- `financialDashboardMockData` - Dados financeiros

### Geradores de Relatórios
- `generateMyAgendaReport`
- `generateSchedulingReport`
- `generateClientReport`
- `generateCrmReport`
- `generateTimeClockReport`
- `generateFinancialReport`
- `generateContractReport`
- `generateReferralReport`
- `generateConversionRateReport`
- `generateSalesReport`
- `generatePaymentReport`
- `generateMarketingReport`
- `generateServiceReport`

---

## Contextos

### LanguageContext
- Suporte a múltiplos idiomas
- Traduções em `lib/translations.ts`

---

## Hooks Customizados

- `usePersistentState` - Estado persistente em localStorage

---

## Lib (Serviços)

| Arquivo | Descrição |
|---------|-----------|
| `supabaseClient.ts` | Cliente Supabase (não utilizado em produção) |
| `translations.ts` | 66KB de traduções multi-idioma |
| `youtubeService.ts` | Integração YouTube |
| `commentAutomationService.ts` | Automação de comentários |
| `nanoBanana.ts` | Utilitário interno |

---

## Características Técnicas

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Estilização**: CSS customizado
- **Estado**: React hooks + Context API + localStorage
- **Roteamento**: Interno (sem React Router)
- **Multi-tenancy**: Implementado via `allDataByUnit` (dados mockados)
