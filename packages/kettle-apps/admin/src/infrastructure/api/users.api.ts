import { apiClient } from './client.js';
import type { User } from '../../domain/users/user.model.js';
import type { ApiResponse, PaginatedResponse } from './types.js';

export const usersApi = {
  list(params?: { page?: number; limit?: number; search?: string }) {
    return apiClient.get<PaginatedResponse<User>>('/admin/users', params as any);
  },
  create(data: { email: string; display_name?: string; password?: string }) {
    return apiClient.post<User>('/admin/users', data);
  },
  get(uid: string) {
    return apiClient.get<ApiResponse<User>>(`/admin/users/${uid}`);
  },
  update(uid: string, data: Partial<User>) {
    return apiClient.patch<User>(`/admin/users/${uid}`, data);
  },
  disable(uid: string) {
    return apiClient.post<User>(`/admin/users/${uid}/disable`);
  },
  enable(uid: string) {
    return apiClient.post<User>(`/admin/users/${uid}/enable`);
  },
  delete(uid: string) {
    return apiClient.delete(`/admin/users/${uid}`);
  },
} as const;
