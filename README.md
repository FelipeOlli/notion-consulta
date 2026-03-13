# Notion Consulta

Pagina publica para compartilhar links do Notion com uma experiencia intuitiva e um painel admin minimo para manter os dados protegidos.

## Funcionalidades

- Pagina publica com cards de links, busca e filtro por categoria.
- Painel admin protegido por login para criar/editar/excluir links.
- Controle de visibilidade (ativo/oculto) por link.
- Sessao em cookie HTTP-only assinado.
- Persistencia local em `data/links.json`.

## Arquitetura

Detalhes em `docs/ARQUITETURA.md`.

## Configuracao

1. Copie o exemplo de ambiente:

```bash
cp .env.example .env.local
```

2. Ajuste as variaveis em `.env.local`:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `AUTH_SECRET` (recomendado >= 32 caracteres)

3. Rode o projeto:

```bash
npm run dev
```

## URLs

- Publico: [http://localhost:3000](http://localhost:3000)
- Login admin: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- Painel admin: [http://localhost:3000/admin/links](http://localhost:3000/admin/links)

## Credenciais solicitadas no briefing

Defina em `.env.local`:

- Usuario: `ti@cfocontabilidade.com`
- Senha: `Suport3.`

## Observacoes

- Este MVP salva dados no arquivo local `data/links.json`.
- Em producao com varias instancias, use banco de dados (ex.: PostgreSQL).
- Nunca commite segredos reais em reposito publico.
