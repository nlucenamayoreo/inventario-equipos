import type { ApiClient } from './client';
import { httpClient } from './http-client';

/** Cliente que usan las capas `api` de cada módulo (API Gateway). */
export const backend: ApiClient = httpClient;
