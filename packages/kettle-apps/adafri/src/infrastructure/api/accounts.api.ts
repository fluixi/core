import { apiClient } from './client.js';
import { fields, type ListParams, type Paginated } from './types.js';
import type { Account, GetAccountsResponse } from '@awc/helpers/accounts';

const ACCOUNT_FIELDS = fields(
  'id', 'name', 'status', 'owner', 'owner_email',
  'account_value', 'creationDate', 'creationDateString',
);

export const accountsApi = {
  getAccount(accountId: string) {
    return apiClient.get<Account>(`/accounts/${accountId}`, { fields: ACCOUNT_FIELDS });
  },

  listUserAccounts(uid: string, params?: ListParams) {
    // return apiClient.get<GetAccountsResponse>(`/users/${uid}/accounts`, {
    return apiClient.get<GetAccountsResponse>(`/accounts/list/${uid}`, {
      fields: ACCOUNT_FIELDS,
      ...params,
    });
  },

  listAccounts(params?: ListParams) {
    return apiClient.get<Paginated<Account>>('/accounts', {
      fields: ACCOUNT_FIELDS,
      ...params,
    });
  },

  updateAccount(accountId: string, data: Partial<Account>) {
    return apiClient.patch<Account>(`/accounts/${accountId}`, data);
  },

  inviteMember(accountId: string, email: string) {
    return apiClient.post(`/accounts/${accountId}/invite`, { email });
  },
} as const;
