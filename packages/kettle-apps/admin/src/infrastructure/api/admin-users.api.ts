import { apiClient } from './client.js';
import type { AdminUser, CreateAdminUserDto, PermissionsMap } from '../../domain/admin-users/admin-user.model.js';
import type { ApiResponse, PaginatedResponse } from './types.js';

export const adminUsersApi = {
  list(params?: { page?: number; limit?: number }) {
    return apiClient.get<PaginatedResponse<AdminUser>>('/admin/admins', params as any);
  },
  get(uid: string) {
    return apiClient.get<ApiResponse<AdminUser>>(`/admin/admins/${uid}`);
  },
  create(data: CreateAdminUserDto) {
    return apiClient.post<AdminUser>('/admin/admins', data);
  },
  update(uid: string, data: Partial<AdminUser>) {
    return apiClient.patch<AdminUser>(`/admin/admins/${uid}`, data);
  },
  delete(uid: string) {
    return apiClient.delete(`/admin/admins/${uid}`);
  },
  getPermissions() {
    return apiClient.get<ApiResponse<PermissionsMap>>('/admin/system/permissions');
  },
} as const;
