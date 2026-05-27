import { apiClient } from './client.js';
import type { Account } from '../../domain/accounts/account.model.js';
import type { PaginatedResponse } from './types.js';

export const accountsApi = {
  list(params?: { page?: number; limit?: number; search?: string }) {
    return apiClient.get<PaginatedResponse<Account>>('/admin/accounts', params as any);
  },
  create(data: { name: string; owner_uid: string; plan?: string; is_active?: boolean }) {
    return apiClient.post<Account>('/admin/accounts', data);
  },
  get(id: string) {
    return apiClient.get<Account>(`/admin/accounts/${id}`);
  },
  update(id: string, data: Partial<Account>) {
    return apiClient.patch<Account>(`/admin/accounts/${id}`, data);
  },
  delete(id: string) {
    return apiClient.delete(`/admin/accounts/${id}`);
  },
} as const;
