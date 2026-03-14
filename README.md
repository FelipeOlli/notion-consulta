# Notion Consulta

Pagina para compartilhar links do Notion com login. Usuario master tem acesso à area de edicao, adicao e remocao de links.

## Funcionalidades

- Pagina principal com login; apos login, exibe cards de links com busca e filtro por categoria.
- Usuario master: unico com acesso ao painel para criar/editar/excluir links (area master).
- Usuario visualizador (viewer): so pode fazer login e ver os links; nao acessa a area master.
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

- `MASTER_EMAIL` / `MASTER_PASSWORD` – usuario master (edicao de links)
- `VIEWER_EMAIL` / `VIEWER_PASSWORD` – usuario de consulta (opcional; so ve os links)
- `AUTH_SECRET` (recomendado >= 32 caracteres)

3. Rode o projeto:

```bash
npm run dev
```

## URLs

- Pagina principal: [http://localhost:3000](http://localhost:3000)
- Area master (login): [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- Painel master (gerenciar links): [http://localhost:3000/admin/links](http://localhost:3000/admin/links)

## Usuarios

- **Master:** unico com acesso à area de edicao/adicao/remocao de links. Defina `MASTER_EMAIL` e `MASTER_PASSWORD`.
- **Visualizador (viewer):** so acessa a pagina principal e ve os links. Defina `VIEWER_EMAIL` e `VIEWER_PASSWORD` (opcional).

## Observacoes

- Este MVP salva dados no arquivo local `data/links.json`.
- Em producao com varias instancias, use banco de dados (ex.: PostgreSQL).
- Nunca commite segredos reais em reposito publico.
