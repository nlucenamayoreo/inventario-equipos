/**
 * Configuración pública por ambiente. Nunca secretos aquí.
 * Orden: config de tiempo de ejecución (public/config.js, la genera el contenedor) → variables VITE_ del build.
 * Sin URL de API la app arranca en modo demostración (datos de ejemplo en el navegador).
 */
interface RuntimeConfig {
  apiMode?: 'mock' | 'http';
  apiBaseUrl?: string;
  cognitoUserPoolId?: string;
  cognitoClientId?: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: RuntimeConfig;
  }
}

const rt: RuntimeConfig = (typeof window !== 'undefined' && window.__APP_CONFIG__) || {};
const vite = import.meta.env;

const apiBaseUrl = (rt.apiBaseUrl || vite.VITE_API_BASE_URL || '').replace(/\/$/, '');
const apiMode = (rt.apiMode || vite.VITE_API_MODE || (apiBaseUrl ? 'http' : 'mock')) as
  'mock' | 'http';

if (apiMode === 'http' && !apiBaseUrl) {
  throw new Error('Falta la variable de entorno VITE_API_BASE_URL. Revise .env.example.');
}

export const env = {
  apiMode,
  apiBaseUrl,
  cognitoUserPoolId: rt.cognitoUserPoolId || vite.VITE_COGNITO_USER_POOL_ID || '',
  cognitoClientId: rt.cognitoClientId || vite.VITE_COGNITO_CLIENT_ID || '',
  cognitoDomain: vite.VITE_COGNITO_DOMAIN ?? '',
  appExposure: (vite.VITE_APP_EXPOSURE ?? 'internal') as 'internal' | 'public',
  realtimeEnabled: vite.VITE_REALTIME_ENABLED === 'true',
} as const;
