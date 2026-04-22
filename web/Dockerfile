# ─── Build (Angular production) ───────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . ./

# Same-origin URLs; edge nginx (misc/docker/nginx.conf) proxies API paths to Spring Boot.
RUN npm run build

# ─── Runtime: static files only (edge nginx does reverse-proxy) ───────────
FROM nginx:1.27-alpine

COPY nginx.static.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ycyw/browser /usr/share/nginx/html

EXPOSE 80
