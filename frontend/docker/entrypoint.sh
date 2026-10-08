#!/bin/sh
# Genera /config.js desde variables de entorno: la misma imagen sirve para sandbox, QA y PRD.
# Se ejecuta después de que nginx procese las plantillas (20-envsubst-on-templates.sh).
set -eu
esc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }
cat > /usr/share/nginx/html/config.js <<JS
window.__APP_CONFIG__ = {
  apiMode: "$(esc "${API_MODE:-http}")",
  apiUrl: "$(esc "${API_URL:-}")",
  loginUrl: "$(esc "${LOGIN_URL:-}")"
};
JS
# API_UPSTREAM vacío = sin proxy de /api (la API se publica en otro origen indicado en API_URL)
if [ -z "${API_UPSTREAM:-}" ]; then
  sed -i '/# api-proxy-start/,/# api-proxy-end/d' /etc/nginx/conf.d/default.conf
fi
