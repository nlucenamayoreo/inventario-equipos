import { config } from '../config';
import type { ApiClient } from './client';
import { httpApi } from './http';
import { createMockApi, type MockApi } from './mock/mockApi';

export const esModoDemo = config.apiMode !== 'http';
export const mockApi: MockApi | null = esModoDemo ? createMockApi() : null;
export const api: ApiClient = mockApi ?? httpApi;

export { ApiError } from './client';
export type { ApiClient } from './client';
