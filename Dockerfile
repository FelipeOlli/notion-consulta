FROM node:22-alpine AS base

WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package*.json ./
RUN npm install

FROM deps AS builder
COPY . .
RUN npx prisma generate
# Segredo dummy apenas para o build (nao usar segredo real aqui).
ENV AUTH_SECRET=build-secret-notion-consulta-pelo-menos-32-caracteres-123
RUN npm run build
RUN npm prune --omit=dev

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 3000
# Aplica migracoes pendentes a cada subida (cria ServiceUserSnapshot etc.). Defina SKIP_MIGRATE_ON_START=1 para desligar.
CMD ["sh", "-c", "if [ \"${SKIP_MIGRATE_ON_START}\" = \"1\" ]; then exec npm start; else npx prisma migrate deploy && exec npm start; fi"]

