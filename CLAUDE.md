# CLAUDE.md — notion-consulta (Portal Corporativo)

## Stack
- Next.js 14+ App Router, TypeScript, Tailwind CSS v4
- Prisma + PostgreSQL (servidor Hetzner/EasyPanel, porta 4011)
- Auth: cookie de sessão via `lib/session.ts` (`getAdminSession`)
- Deploy: Docker + EasyPanel em `painel.onith.com.br`

## Design System (Contabhub)
- Tema escuro obsidian: `#03080f` (bg), `#0d1829` (surface), `#1d7fe5` (accent)
- Fontes: Barlow (UI) + JetBrains Mono (código)
- Glass morphism: `.glass-card`, `.glass-panel`, `.ambient-glow`, `.bg-grid`
- Tokens CSS: `--onity-dark-text-muted`, `--onity-*` no `app/globals.css`
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
- API: `/api/admin/monitors/` (CRUD) e `/api/admin/monitors/check` (POST)
- Auto-poll a cada 30s no cliente; notificações via browser Notification API
- Cards em grid `auto-fill minmax(220px)` usando `.glass-card`

## Financeiro
- Serviços: `CFCONTABILIDADE.COM`, `CFCONTABILIDADE.COM.BR`, `Time Is Money`
- Importação colapsável (só admin principal); botão "Limpar dados" por serviço com confirmação
- Modal de planilha: fecha ao clicar fora; lista de empresas removida (só campo de adicionar)
- Seção "Usuários por serviço ao longo do tempo" removida

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
- **2026-05-07** — Módulo Núcleo TI: controle interativo de demandas com matriz RACI embutida, kanban/tabela, migração de responsáveis, tipos (Manual/Automação/Delegação), seed automático
- **2026-05-06** — Redesign completo (Contabhub DS), módulo Cadastro de empresa, formulários colapsáveis, bloqueio de usuários, melhorias no Financeiro, módulo de monitoramento de IPs (HTTP/TCP/PING), redesign dos cards de monitor
