#!/bin/sh
# Genera /config.js desde variables de entorno: la misma imagen sirve para sandbox, QA y PRD.
# Se ejecuta después de que nginx procese las plantillas (20-envsubst-on-templates.sh).
set -eu
esc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }
cat > /usr/share/nginx/html/config.js <<JS
window.__APP_CONFIG__ = {
  apiBaseUrl: "$(esc "${API_BASE_URL:-/api}")",
  cognitoUserPoolId: "$(esc "${COGNITO_USER_POOL_ID:-}")",
  cognitoClientId: "$(esc "${COGNITO_CLIENT_ID:-}")"
};
JS
# API_UPSTREAM vacío = sin proxy de /api (la API está en otro origen: API_BASE_URL con la URL completa)
if [ -z "${API_UPSTREAM:-}" ]; then
  sed -i '/# api-proxy-start/,/# api-proxy-end/d' /etc/nginx/conf.d/default.conf
fi
