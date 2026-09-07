# syntax=docker/dockerfile:1
# Contexto de build é a raiz do repositório: backend/ e shared/ entram juntos.

FROM node:24-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
COPY backend/package*.json ./backend/
RUN --mount=type=cache,target=/root/.npm \
    npm --prefix backend ci

FROM deps AS dev
COPY shared ./shared
COPY backend ./backend
RUN npm --prefix backend run prisma:generate
WORKDIR /app/backend
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

FROM deps AS build
COPY shared ./shared
COPY backend ./backend
RUN npm --prefix backend run prisma:generate \
 && npm --prefix backend run build

FROM base AS prod
ENV NODE_ENV=production
COPY backend/package*.json ./backend/
RUN --mount=type=cache,target=/root/.npm \
    npm --prefix backend ci --omit=dev
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/backend/node_modules/.prisma ./backend/node_modules/.prisma
COPY --from=build /app/backend/node_modules/@prisma ./backend/node_modules/@prisma
WORKDIR /app/backend
EXPOSE 3000
# migrate deploy no boot: o serviço sobe já com o schema aplicado.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/backend/src/main.js"]
