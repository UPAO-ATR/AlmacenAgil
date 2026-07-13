# syntax=docker/dockerfile:1.7
FROM node:24.18.0-bookworm-slim AS constructor

WORKDIR /aplicacion

ENV NPM_CONFIG_REGISTRY=https://registry.npmjs.org/ \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FETCH_RETRIES=2 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=5000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=30000 \
    NPM_CONFIG_FETCH_TIMEOUT=60000 \
    NPM_CONFIG_MAXSOCKETS=5

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

COPY . .

RUN npm run construir

FROM nginxinc/nginx-unprivileged:1.30.3

COPY --from=constructor /aplicacion/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080