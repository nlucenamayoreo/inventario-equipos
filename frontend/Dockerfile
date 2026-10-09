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
# Variables (ver README): API_MODE, API_BASE_URL, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, API_UPSTREAM
ENV API_MODE=http API_BASE_URL="/api" COGNITO_USER_POOL_ID="" COGNITO_CLIENT_ID="" API_UPSTREAM=""
EXPOSE 8080
