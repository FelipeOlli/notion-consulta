# Arquitetura - Notion Consulta

## Objetivo

Publicar links compartilhados do Notion em uma pagina publica com UX/UI intuitiva e disponibilizar um painel admin minimo para controle de acesso e gestao desses links.

## Modulos

- `app/page.tsx`: landing publica com filtro e busca.
- `components/public-links.tsx`: experiencia de consulta dos links.
- `app/admin/login/page.tsx`: autenticao de administrador.
- `app/admin/links/page.tsx`: painel de gestao (CRUD).
- `components/admin-links-manager.tsx`: interface admin para cadastro, edicao, ativacao e exclusao.
- `app/api/auth/*`: login/logout e sessao.
- `app/api/links/route.ts`: endpoint publico (somente links ativos).
- `app/api/admin/links/*`: endpoints protegidos para CRUD.
- `lib/session.ts`: assinatura e validacao de sessao em cookie HTTP-only.
- `lib/store.ts`: persistencia em arquivo JSON (`data/links.json`).

## Fluxo de acesso

1. Admin faz login em `/admin/login`.
2. API valida `ADMIN_EMAIL` + `ADMIN_PASSWORD`.
3. Sessao assinada e gravada em cookie HTTP-only (`nc_admin_session`).
4. Rotas admin validam sessao antes de liberar dados/acoes.
5. Pagina publica consome somente links `active = true`.

## Decisoes de seguranca (MVP)

- Credenciais admin em variaveis de ambiente.
- Cookie HTTP-only com assinatura HMAC (`AUTH_SECRET`).
- Rotas admin exigem sessao valida.
- Logout invalida cookie.

## Persistencia

- Modelo inicial usa arquivo local `data/links.json`.
- Bom para MVP e deploy simples com volume persistente.
- Para escala multi-instancia, migrar para banco (PostgreSQL).
