import { apiClient } from './client.js';
import type { OAuthToken } from '../../domain/tokens/token.model.js';
import type { PaginatedResponse } from './types.js';

export const tokensApi = {
  list(params?: { page?: number; limit?: number; uid?: string; client_id?: string }) {
    return apiClient.get<PaginatedResponse<OAuthToken>>('/admin/tokens', params as any);
  },
  get(id: string) {
    return apiClient.get<OAuthToken>(`/admin/tokens/${id}`);
  },
  revoke(id: string) {
    return apiClient.delete(`/admin/tokens/${id}`);
  },
} as const;
