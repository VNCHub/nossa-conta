# syntax=docker/dockerfile:1
# Contexto de build é a raiz do repositório: frontend/ e shared/ entram juntos.

FROM node:24-alpine AS deps
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN --mount=type=cache,target=/root/.npm \
    npm --prefix frontend ci

FROM deps AS dev
COPY shared ./shared
COPY frontend ./frontend
WORKDIR /app/frontend
EXPOSE 5173
CMD ["npm", "run", "dev"]

FROM deps AS build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY shared ./shared
COPY frontend ./frontend
RUN npm --prefix frontend run build

# Em produção o front é estático: nginx serve os arquivos e devolve index.html
# em qualquer rota, para o react-router assumir a navegação.
FROM nginx:alpine AS prod
COPY --from=build /app/frontend/dist /usr/share/nginx/html
RUN printf 'server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  location / { try_files $uri $uri/ /index.html; }\n\
}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
