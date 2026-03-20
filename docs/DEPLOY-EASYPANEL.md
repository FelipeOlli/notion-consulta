# Deploy do Notion Consulta no EasyPanel

Este guia assume que voce ja tem um servidor com EasyPanel (como no projeto do Site SI).

## 1. Preparar o repositorio

1. Inicialize git dentro da pasta `notion-consulta` (se ainda nao tiver):

   ```bash
   cd /Users/suporte/Documents/aios-core-alan-work/projetos/notion-consulta
   git init
   git add .
   git commit -m "notion-consulta: primeira versao"
   ```

2. Publique em um repositorio (GitHub, por exemplo) e conecte esse repositorio no EasyPanel, igual ao que voce fez com o site SI.

## 2. Criar o app no EasyPanel

1. No EasyPanel, crie um novo **App** (Node/Custom Dockerfile).
2. Selecione o repositorio do `notion-consulta`.
3. Garanta que o **Dockerfile** na raiz do projeto seja usado (o EasyPanel detecta automaticamente).

## 3. Variaveis de ambiente no EasyPanel

No app do `notion-consulta`, configure as seguintes variaveis em **Environment**:

- `MASTER_EMAIL` / `MASTER_PASSWORD` – usuario master (acesso completo)
- `AUTH_SECRET` – segredo forte (>= 32 caracteres)
- `DATABASE_URL` – PostgreSQL (obrigatorio)

Exemplo:

```text
MASTER_EMAIL=ti@cfcontabilidade.com
MASTER_PASSWORD=Suport3.
AUTH_SECRET=o6asOa0XBcATRDCx0-PKQSrkda01kfxzNlS5Y2SjuJfUDxWAz9sG8qHYE15aF7lK
DATABASE_URL=postgresql://root:senha@host:5432/notion_consulta?schema=public
```

> Nao coloque aspas, nem espacos extra.

## 4. Porta e dominio

- O container expoe a porta **3000**.
- No EasyPanel, configure para mapear a porta interna **3000** para HTTP.
- Aponte o seu dominio/subdominio (ex.: `notion.seudominio.com`) para esse app, conforme o painel do EasyPanel.

## 5. Build e deploy

1. No app do `notion-consulta`, clique em **Deploy / Redeploy**.
2. O EasyPanel vai:
   - Fazer o clone do repo
   - Rodar o `docker build` usando o `Dockerfile`
   - Rodar o container com `npm start`

Se algo falhar:

- Veja os **Logs** do app.
- Erros de `AUTH_SECRET` ou `MASTER_EMAIL/MASTER_PASSWORD` normalmente indicam variavel faltando ou mal escrita.

## 6. Erro: `database system is not yet accepting connections` / recovery

Se aparecer no log algo como:

`FATAL: the database system is not yet accepting connections`  
`DETAIL: Consistent recovery state has not been yet reached`

isso vem do **PostgreSQL**, nao do Next.js: o banco ainda esta **iniciando ou recuperando** (restart, restore, failover). O app tentou conectar cedo demais.

O que fazer:

1. **Espere 1–5 minutos** e recarregue a pagina (ou redeploy apos o Postgres ficar saudavel).
2. No EasyPanel, garanta que o **servico do app depende** do Postgres (sobe depois) ou use **healthcheck** no Postgres antes de marcar o app como pronto.
3. O projeto tenta **reconectar automaticamente** na subida (`instrumentation.ts` + variaveis opcionais):
   - `PRISMA_CONNECT_RETRIES` (padrao `20`)
   - `PRISMA_CONNECT_RETRY_MS` (padrao `2000` ms entre tentativas)
   - `SKIP_PRISMA_CONNECT_RETRY=1` para desligar esse comportamento
4. Opcional no `DATABASE_URL`: `?connect_timeout=30` (ou maior) para dar mais tempo na primeira conexao.

Apos o banco estavel, rode **`npx prisma migrate deploy`** (ou comando equivalente no deploy) se ainda nao aplicou as migracoes.

### Internal Server Error na home (`/`)

- Se o **Postgres** nao sobe a tempo, o app **nao encerra mais o processo** por falha de conexao na `instrumentation`; a home deve abrir mesmo assim (sem modulos que precisam de banco).
- Se a home quebrar **com usuario logado**, pode ser **disco somente leitura**: a lista de links publicos grava em `data/links.json`. Monte um volume em **`/app/data`** (mesma ideia dos certificados em `data/certificados`).

## 7. Testar em producao

1. Acesse o dominio configurado (ex.: `https://notion.seudominio.com`).
2. Tela inicial (tema black) aparece com formulario de login.
3. Entre com as credenciais do usuario master (`MASTER_EMAIL` / `MASTER_PASSWORD`).
4. Depois do login, a home mostra os links ativos.
5. O painel master (edicao/adicao/remocao de links) fica em `/admin/login` e `/admin/links`.
6. Modulo Financeiro (`/admin/financeiro`): import de snapshots mensais; exige migracoes aplicadas e Postgres acessivel.

