import { apiClient } from './client.js';
import type { AuthCode } from '../../domain/codes/code.model.js';
import type { PaginatedResponse } from './types.js';

export const codesApi = {
  list(params?: { page?: number; limit?: number; uid?: string; client_id?: string }) {
    return apiClient.get<PaginatedResponse<AuthCode>>('/admin/codes', params as any);
  },
  get(id: string) {
    return apiClient.get<AuthCode>(`/admin/codes/${id}`);
  },
  delete(id: string) {
    return apiClient.delete(`/admin/codes/${id}`);
  },
} as const;
