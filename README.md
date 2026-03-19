# Portal corporativo (notion-consulta)

Gerencial com login, controle de modulos por usuario (email), gestao de acessos/senhas, certificados digitais e financeiro.

## Funcionalidades

- Login com sessao em cookie HTTP-only assinado.
- Permissoes por modulo por usuario (email): `senha`, `certificados`, `financeiro`, `usuarios` (e-mails cadastrados / gestão de usuários).
- Modulo Acessos: CRUD no gerencial de links/recursos.
- Modulo Certificados: cadastro com razao social, CPF/CNPJ, socio, senha, vencimento e arquivo.
- Modulo Financeiro:
  - empresas e colaboradores;
  - custo de e-mails por servidor;
  - custo de monitoramento por empresa (`valor unitario x colaboradores ativos`);
  - dashboard com atualizacao automatica via polling.

## Arquitetura

Detalhes em `docs/ARQUITETURA.md`.

## Configuracao

1. Copie o exemplo de ambiente:

```bash
cp .env.example .env.local
```

2. Ajuste as variaveis em `.env.local`:

- `MASTER_EMAIL` / `MASTER_PASSWORD` – acesso master legado (bootstrap)
- `AUTH_SECRET` (recomendado >= 32 caracteres)
- `DATABASE_URL` – PostgreSQL (obrigatorio para usuarios/modulos/certificados/financeiro)

3. Gere o cliente Prisma e aplique migracoes:

```bash
npm run prisma:generate
npm run prisma:migrate
```

4. (Opcional) rode o seed inicial do usuario admin:

```bash
npm run prisma:seed
```

5. Rode o projeto:

```bash
npm run dev
```

## URLs

- Pagina principal: [http://localhost:3000](http://localhost:3000)
- Login admin: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- Gerencial (módulos): [http://localhost:3000/admin](http://localhost:3000/admin)
- Acessos: [http://localhost:3000/admin/links](http://localhost:3000/admin/links)
- `/portal` redireciona para `/admin` (rota legada; hub único é o gerencial)
- Certificados: [http://localhost:3000/admin/certificados](http://localhost:3000/admin/certificados)
- Financeiro: [http://localhost:3000/admin/financeiro](http://localhost:3000/admin/financeiro)
- Usuarios/modulos: [http://localhost:3000/admin/usuarios](http://localhost:3000/admin/usuarios)

## Controle de acesso

- O acesso principal agora e por usuario no banco (`User`) com modulos marcados por e-mail.
- O master por variavel de ambiente segue como acesso de contingencia/implantacao.
- Usuario sem modulo pode logar para consulta publica (sem acesso aos paineis).
- Seed inicial cria/atualiza: `ti@cfcontabilidade.com` com acesso aos modulos `senha`, `certificados` e `financeiro`.

## Observacoes

- O modulo de links/acessos segue em `data/links.json` para compatibilidade.
- Certificados e financeiro usam PostgreSQL via Prisma.
- Arquivos de certificado sao salvos no filesystem local em `data/certificados/`.
- Nunca commite segredos reais em reposito publico.
