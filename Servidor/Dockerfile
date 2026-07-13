# syntax=docker/dockerfile:1.7
FROM node:24.18.0-bookworm-slim

WORKDIR /servidor

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

RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund

COPY src ./src

USER node

EXPOSE 3000

CMD ["npm","run","iniciar"]