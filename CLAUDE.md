# CLAUDE.md — notion-consulta (Portal Corporativo)

## Stack
- Next.js 14+ App Router, TypeScript, Tailwind CSS v4
- Prisma + PostgreSQL (servidor Hetzner/EasyPanel, porta 4011)
- Auth: cookie de sessão via `lib/session.ts` (`getAdminSession`)
- Deploy: Docker + EasyPanel em `painel.onith.com.br`

## Design System (System Design)
- Tema escuro slate: `#0f172a` (bg), `#1e293b` (surface), `#3b82f6` (accent), `#8b5cf6` (accent-secondary)
- Fontes: **Outfit** (headings) + **Inter** (UI) + JetBrains Mono (código/labels)
- Ambient glow: azul top-right + roxo bottom-left (opostos ao layout anterior)
- Gradiente padrão: `#3b82f6` → `#8b5cf6` (btn-primary, section-label, títulos)
- Glass morphism: `.glass-card`, `.glass-panel`, `.ambient-glow`, `.bg-grid`
- Tokens CSS: `--onity-dark-text-muted` (`#94a3b8`), `--onity-*` no `app/globals.css`
- `data-theme="dark"` no `<html>` em `app/layout.tsx`
- Classes utilitárias: `.btn-primary`, `.ds-input`, `.section-label`, `.link-accent`, `.link-muted`
- **Nunca usar event handlers inline em Server Components** — usar classes CSS para hover

## Módulos
| Chave | Rota | Descrição |
|---|---|---|
| `senha` | `/admin/links` | Acessos/links públicos |
| `certificados` | `/admin/certificados` | Certificados digitais |
| `financeiro` | `/admin/financeiro` | Dashboard financeiro |
| `usuarios` | `/admin/usuarios` | Gestão de usuários |
| `cadastro_empresa` | `/admin/cadastro-empresa` | iframe externo |
| `nucleo_ti` | `/admin/nucleo-ti` | Controle de demandas do Núcleo TI (master-only, sem enum Prisma) |
| `alterdata` | `/admin/alterdata` | Clientes Alterdata + credenciais (Nuvem/Pack/eContador/Passaporte) |
| `dominio` | `/admin/dominio` | SSCs DOMÍNIO/ONVIO + aba Transbordo (tickets de migração por franquia) |
| `tickets_ti` | `/admin/tickets-ti` | Chamados da equipe de TI via ScrumHub (iframe + notificações) |
| `time_is_money` | `/admin/time-is-money` | Monitoramento de produtividade/status da equipe via API Time is Money (separado do serviço CSV do Financeiro) |

- Role `master` tem acesso a todos os módulos (`ALL_MODULES_FOR_MASTER` em `lib/modules.ts`)
- Admin principal protegido: `LOCKED_PRIMARY_ADMIN_EMAIL` em `lib/locked-admin.ts`
- Módulos ativáveis por usuário via `UserModuleAccess` no Prisma
- `nucleo_ti` não existe no enum Prisma — `toPrismaModule` lança erro se chamado; acesso só por `session.role === "master"`

## Padrões de UI
- Formulários colapsáveis com botão toggle (padrão em todos os módulos)
- Após salvar, fechar formulário automaticamente
- Botões de ação sempre abaixo dos metadados (nunca `justify-between` que quebra layout)
- Modal fecha ao clicar no backdrop (`onClick` no overlay verificando `e.target === e.currentTarget`)
- Usuários: badge "Bloqueado" (vermelho) vs "Ativo" (verde), botão Bloquear/Desbloquear direto na lista

## Monitoramento de IPs (`/admin` — seção Início)
- Modelos: `IpMonitor`, `IpMonitorGroup`, `IpMonitorEvent`
- Tipos: `HTTP`, `TCP`, `PING` (ICMP via `child_process` ping do SO)
- API: `/api/admin/monitors/` (CRUD), `/api/admin/monitors/check` (POST), `/api/admin/monitors/[id]/events` (GET)
- Auto-poll a cada 30s no cliente; notificações via browser Notification API
- Cards em grid `auto-fill minmax(220px)` usando `.glass-card`
- Log de quedas: `IpMonitorEvent` grava apenas em transições de status (UP↔DOWN)
- Anti-flapping simétrico: após 3 eventos do mesmo tipo na janela de 6, novos registros são suprimidos (vale para DOWN e UP)
- Botão "Log" em cada card abre drawer com histórico, duração de cada queda e banner de pausa quando ativo
- Botão "Protocolo" em cada card: registra protocolo de atendimento (número + OS opcional, data/hora automática); model `IpMonitorProtocol`
- API protocolos: `GET/POST /api/admin/monitors/[id]/protocols`, `DELETE /api/admin/monitors/protocols/[id]`, `GET /api/admin/monitors/protocols/export` (xlsx, filtros: monitorId, from, to)
- Ordenação dos cards: ativas A→Z primeiro, inativas A→Z depois

## Financeiro
- Serviços: `CFCONTABILIDADE.COM`, `CFCONTABILIDADE.COM.BR`, `Time Is Money`
- Importação colapsável (só admin principal); botão "Limpar dados" por serviço com confirmação
- Modal de planilha: fecha ao clicar fora; lista de empresas removida (só campo de adicionar)
- Seção "Usuários por serviço ao longo do tempo" removida
- Importação Google: aceita CSV (`GOOGLE_CSV`) com auto-detecção; `Org Unit Path [Required]` (sem `/`) vira `Empresa Alocada` via `ensureCompaniesForServer` (`lib/financeiro-company-line.ts`)
- Importação TIM: coluna `Departamento` vira `Empresa Alocada`; ID opcional (gerado sequencialmente); cabeçalho detectado pela coluna `Nome`
- Templates modelo em `public/templates/`: `google-workspace-template.csv` e `time-is-money-template.csv`; link muda conforme serviço selecionado

## Núcleo TI (`/admin/nucleo-ti`)
- Model: `TiTask` com `TiTaskStatus` (TODO/DOING/DONE) e `TiTaskType` (MANUAL/AUTOMACAO/DELEGACAO)
- Seed automático das 8 tarefas iniciais na primeira visita (feito na page.tsx do servidor)
- API: `/api/admin/ti-tasks` (GET, POST) e `/api/admin/ti-tasks/[id]` (PATCH, DELETE)
- Board client (`components/nucleo-ti-board.tsx`): "Carga por Pessoa" + "Backlog" (kanban/tabela)
- Modal de tarefa: migra responsável, avança status, define tipo, vincula processo RACI (dados estáticos)
- RACI de 17 processos hardcoded no componente — exibida inline no modal ao selecionar processo
- Ciclo rápido de status na visão tabela (clique no badge sem abrir modal)
- Criação/exclusão de tarefas só para `master`; edição liberada para todos

## Padrões de UI — Home (`/admin`)
- `AdminNav` removido da home; acesso aos módulos só pelos cards
- Botão "Sair" (`PortalHeader`) no canto superior direito do cabeçalho
- Grid de módulos: `sm:grid-cols-2 lg:grid-cols-3`
- Cards de monitor colapsáveis: clique no cabeçalho (nome + status) expande metadados e ações; `expandedId` state em `admin-monitor-dashboard.tsx`
- Inner pages (links, certificados, etc.) mantêm `AdminNav` para navegação entre módulos

## Alterdata (`/admin/alterdata`)
- Model: `AlterdataCliente` com `acessoLiberado Boolean @default(false)` — toggle no modal de edição, exibe ícone ✓ azul na tabela
- Credenciais: `AlterdataClienteContador` (enum `AlterdataCredencialTipo`: NUVEM/PACK/ECONTADOR/PASSAPORTE); API CRUD em `/api/admin/alterdata/clientes/[id]/contadores` e `/api/admin/alterdata/contadores/[id]` (GET/POST/PATCH/DELETE)
- Filtro de credencial multi-select com lógica AND (`filtroCredenciais: AlterdataCredencialTipo[]`) — mostra só franquias que têm TODAS as credenciais marcadas
- Edição de cliente com auto-save (debounce 700ms via useEffect); botão "Salvar alterações" removido; indicador "Salvando…/✓ Salvo"; criação mantém botão "Criar cliente"
- Edição inline de login/senha nas credenciais (botão lápis → form pré-preenchido → PATCH)
- Coluna "Nome" na tabela: `div.flex.max-w-[260px]` + `span.truncate.min-w-0` para evitar overflow sobre coluna "Unidade"

## Transbordo (aba dentro de `/admin/dominio`)
- **NÃO é um módulo separado** — é a segunda aba da página do Domínio (`DominioTabs` em `components/dominio-tabs.tsx`)
- Acesso controlado pelo módulo `dominio`; `/admin/transbordo` redireciona para `/admin/dominio`
- Models: `TransbordoTicket`, `TransbordoComment`, `TransbordoBadgeColor`, `TransbordoStatusOption` (enum `TRANSBORDO` existe no Prisma mas não em `appModules`)
- Ticket: franchiseName, sistemaOrigem, systems[], status (texto livre + datalist), statusColorId→cor de badge hex configurável, progress 0-100, companies, ssc, ticketTransbordoNo, lembrete, agendado, solicitacao, request, tempoMigracao, totalDays/prevDays/workDays, dConcluido
- Comentários em texto puro com anexos (multipart/form-data → `/app/data/anexos/transbordo/<ticketId>/`)
- API: `/api/admin/transbordo/` (todas as rotas usam `ensureModuleAccess("dominio")`)
- Configurações (cores e opções de status) visíveis só para `master`; `CRED_LABELS` mapeia tipo→label em `alterdata-dashboard.tsx`

## Tickets TI (`/admin/tickets-ti`)
- Módulo `tickets_ti` (enum Prisma `TICKETS_TI`); migration `add_tickets_ti_module`
- Env vars: `SCRUMHUB_API_URL`, `SCRUMHUB_API_KEY`, `SCRUMHUB_PROJETO_ID`, `SCRUMHUB_COMPANY_ID`
- Proxy API: `GET /api/admin/tickets-ti` — busca stats + lista de tickets do ScrumHub
- Notificações API: `GET/POST/DELETE /api/admin/tickets-ti/notifications` — últimos 30 dias, não concluídos/cancelados, cruzado com `NotificationRead` (kind `"ticket_ti"`)
- Página `/admin/tickets-ti`: iframe do ScrumHub (`${SCRUMHUB_API_URL}/companies/${SCRUMHUB_COMPANY_ID}/tickets`), full-height
- Home (`variant="home"`): métricas com filtro de mês + lista de chamados em aberto (ordenados do mais recente ao mais antigo, excluindo concluídos e cancelados); clique → `TicketDetailModal`
- `TicketDetailModal`: status, prioridade, tipo, solicitante, responsável, data, prazo, descrição + botão "Abrir no ScrumHub ↗"
- Sino (`HeaderNotificationsBell`): seção "Tickets TI" com `TicketDetailModal` completo ao clicar (mesmos campos, dados vindos da notifications API)
- Auto-poll a cada 30s; browser Notification API para novos tickets
- `isConcluido()`: filtra `t.concluido === true` OU `statusNome` contém "conclu" OU "cancelad"

## Time is Money (`/admin/time-is-money`)
- Módulo `time_is_money` (enum Prisma `TIME_IS_MONEY`); migration `add_time_is_money_module`. **Não é o mesmo domínio do serviço "Time Is Money" (CSV) do Financeiro** — este consome a API oficial da plataforma, isolado.
- Env vars: `TIM_API_URL`, `TIM_API_KEY` — base da API na **raiz** (sem prefixo `/api`), auth via header `x-api-key`
- Client da API: `lib/tim-api.ts` — `listClients()` (`GET /clients`), `getConsolidatedForClient()` (`GET /consolidated/client`, produtividade diária), `getMonitoredClients()` (lê/seeda `TimMonitoredClient`)
- Model `TimMonitoredClient`: equipe monitorada, configurável na UI (não fixa no código); seed inicial (`TIM_TEAM_SEED`) com André Palmeiro, Pedro Freitas e Gabriel Rozzato
- Proxy API: `GET /api/admin/time-is-money` — produtividade diária + status (online heurístico por `lastActivity` < 10min) de cada membro monitorado, período `from`/`to` (default 7 dias)
- Gestão de equipe: `GET/POST/DELETE /api/admin/time-is-money/team` — POST/DELETE restritos a `session.role === "master"`
- Página `/admin/time-is-money` (`variant="full"`): cards por pessoa + tabela diária + painel "Gerenciar equipe" (só master); Home (`variant="home"`): só os cards
- Componente: `components/time-is-money-dashboard.tsx`; auto-poll 30s
- Classificação produtivo/improdutivo da API vem majoritariamente *undefined* (metas não configuradas na plataforma) — painel prioriza ativo/ocioso/custo/última atividade

## Sessões recentes
- **2026-07-20** — Módulo Time is Money: monitoramento de equipe (André, Pedro, Gabriel) via API oficial da plataforma, isolado do serviço CSV do Financeiro; equipe configurável na UI (`TimMonitoredClient`); card + página + widget na home
- **2026-07-08** — Módulo Tickets TI: iframe ScrumHub na página full, modal de detalhes na home e no sino, notificações no bell com `TicketDetailModal` completo; sub-cards financeiro removidos da home; ordenação por data nos chamados em aberto
- **2026-06-30** — Credencial Passaporte no Alterdata (enum `PASSAPORTE`, seção no modal, chip de filtro, `CRED_LABELS`); migration `add_passaporte_credencial`
