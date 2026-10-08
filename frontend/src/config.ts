// Configuración: primero la de tiempo de ejecución (public/config.js, generada por el contenedor),
// luego la de compilación (VITE_*). Así una misma imagen sirve para sandbox, QA y PRD.

interface RuntimeConfig {
  apiMode?: 'mock' | 'http';
  apiUrl?: string;
  loginUrl?: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: RuntimeConfig;
  }
}

const rt: RuntimeConfig = (typeof window !== 'undefined' && window.__APP_CONFIG__) || {};
const env = import.meta.env;

const apiUrl = (rt.apiUrl ?? env.VITE_API_URL ?? '').replace(/\/$/, '');

export const config = {
  apiMode: (rt.apiMode || env.VITE_API_MODE || 'mock') as 'mock' | 'http',
  /** Base de la API sin barra final; vacío = mismo origen. */
  apiUrl,
  /** Inicio de sesión con Google SSO (lo expone el backend). */
  loginUrl: rt.loginUrl || env.VITE_LOGIN_URL || `${apiUrl}/api/auth/google`,
};
