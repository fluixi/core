import { apiClient } from './client.js';
import { fields, type ListParams, type Paginated } from './types.js';
import type { User } from '../../domain/users/user.model.js';
import type { Account } from '@awc/helpers/accounts';

const USER_FIELDS = fields(
  'uid', 'first_name', 'last_name', 'email', 'photoURL',
  'user_type', 'isActive', 'status', 'entrepriseName',
  'addresse', 'telephone', 'postal', 'isCorporate', 'isParticular',
);

const ACCOUNT_FIELDS = fields(
  'id', 'name', 'status', 'owner', 'owner_email', 'account_value', 'creationDate',
);

export const userApi = {
  getUser(uid: string) {
    return apiClient.get<User>(`/users/${uid}`, { fields: USER_FIELDS });
  },

  updateUser(uid: string, data: Partial<User>) {
    return apiClient.patch<User>(`/users/${uid}`, data);
  },

  getUserAccounts(uid: string, params?: ListParams) {
    return apiClient.get<Paginated<Account>>(`/users/${uid}/accounts`, {
      fields: ACCOUNT_FIELDS,
      ...params,
    });
  },
} as const;
