import { apiClient } from './client.js';
import type { OAuthClient, CreateOAuthClientDto } from '../../domain/oauth-clients/oauth-client.model.js';
import type { PaginatedResponse } from './types.js';

export const oauthClientsApi = {
  list(params?: { page?: number; limit?: number }) {
    return apiClient.get<PaginatedResponse<OAuthClient>>('/admin/oauth-clients', params as any);
  },
  get(id: string) {
    return apiClient.get<OAuthClient>(`/admin/oauth-clients/${id}`);
  },
  create(data: CreateOAuthClientDto) {
    return apiClient.post<OAuthClient>('/admin/oauth-clients', data);
  },
  update(id: string, data: Partial<OAuthClient>) {
    return apiClient.patch<OAuthClient>(`/admin/oauth-clients/${id}`, data);
  },
  delete(id: string) {
    return apiClient.delete(`/admin/oauth-clients/${id}`);
  },
  regenerateSecret(id: string) {
    return apiClient.post<{ client_secret: string }>(`/admin/oauth-clients/${id}/regenerate-secret`);
  },
} as const;
