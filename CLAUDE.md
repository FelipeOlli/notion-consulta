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

## Sessões recentes
- **2026-05-26** — Protocolos de atendimento no monitoramento (registro + exportação xlsx com filtros), redesign para System Design (slate + azul/roxo, Outfit+Inter), ordenação alfabética de conexões ativas/inativas
- **2026-05-25** — Log de quedas (monitoramento), anti-flapping UP↔DOWN, importação CSV Google com auto-alocação por Org Unit Path, auto-alocação TIM por Departamento, templates de importação para download
- **2026-05-07** — Módulo Núcleo TI: controle interativo de demandas com matriz RACI embutida, kanban/tabela, migração de responsáveis, tipos (Manual/Automação/Delegação), seed automático
