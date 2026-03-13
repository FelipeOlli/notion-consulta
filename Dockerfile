FROM node:22-alpine AS base

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# AUTH_SECRET de build para nao quebrar getSessionSecret durante o build.
ARG AUTH_SECRET=build-secret-notion-consulta-pelo-menos-32-caracteres-123
ENV AUTH_SECRET=$AUTH_SECRET

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]

