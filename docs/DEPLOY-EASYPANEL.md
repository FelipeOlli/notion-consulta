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

- `MASTER_EMAIL` / `MASTER_PASSWORD` – usuario master (editar/adicionar/remover links)
- `VIEWER_EMAIL` / `VIEWER_PASSWORD` – usuario visualizador (apenas consulta dos links; opcional)
- `AUTH_SECRET` – segredo forte (>= 32 caracteres)

Exemplo:

```text
MASTER_EMAIL=ti@cfcontabilidade.com
MASTER_PASSWORD=Suport3.
VIEWER_EMAIL=consulta@cfcontabilidade.com
VIEWER_PASSWORD=senha-consulta
AUTH_SECRET=o6asOa0XBcATRDCx0-PKQSrkda01kfxzNlS5Y2SjuJfUDxWAz9sG8qHYE15aF7lK
```

> Se nao definir VIEWER_*, apenas o master podera fazer login. Nao coloque aspas, nem espacos extra.

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

## 6. Testar em producao

1. Acesse o dominio configurado (ex.: `https://notion.seudominio.com`).
2. Tela inicial (tema black) aparece com formulario de login.
3. Entre com as credenciais do usuario master (`MASTER_EMAIL` / `MASTER_PASSWORD`).
4. Depois do login, a home mostra os links ativos.
5. O painel master (edicao/adicao/remocao de links) fica em `/admin/login` e `/admin/links`.

