# --- build ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- runtime: archivos estáticos con nginx ---
FROM nginx:1.27-alpine
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker/entrypoint.sh /docker-entrypoint.d/40-app-config.sh
RUN chmod +x /docker-entrypoint.d/40-app-config.sh
COPY --from=build /app/dist /usr/share/nginx/html
# Variables (ver README): API_MODE, API_URL, LOGIN_URL, API_UPSTREAM
ENV API_MODE=http API_URL="" LOGIN_URL="" API_UPSTREAM="http://127.0.0.1:3000"
EXPOSE 8080
