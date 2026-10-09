import { env } from '../config/env';
import type { ApiClient } from './client';
import { httpClient } from './http-client';
import { createMockApi, type MockApi } from './mock/mock-api';

/** true sin API configurada: datos de ejemplo en el navegador. */
export const esModoDemo = env.apiMode !== 'http';
export const mockApi: MockApi | null = esModoDemo ? createMockApi() : null;
/** Cliente que usan las capas `api` de cada módulo (API Gateway o simulador). */
export const backend: ApiClient = mockApi ?? httpClient;
