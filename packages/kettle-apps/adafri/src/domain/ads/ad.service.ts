import { apiClient } from '../../infrastructure/api/client.js';
import { adStore } from './ad.store.js';
import type { Ad, CreateAdInput, UpdateAdInput } from './ad.model.js';
import type { ListParams, Paginated } from '../../infrastructure/api/types.js';

async function withLoading<T>(fn: () => Promise<T>): Promise<T> {
  adStore.setLoading(true);
  adStore.setError(null);
  try {
    return await fn();
  } catch (err) {
    adStore.setError((err as Error).message);
    throw err;
  } finally {
    adStore.setLoading(false);
  }
}

export const adService = {
  list(params?: ListParams & { adGroupId?: string; campaignId?: string; status?: string }) {
    return withLoading(async () => {
      const data = await apiClient.get<Paginated<Ad>>('/v1/ads', params);
      adStore.load(data);
      return data;
    });
  },

  listByAdGroup(adGroupId: string, params?: ListParams) {
    return this.list({ ...params, adGroupId });
  },

  get(id: string) {
    return withLoading(async () => {
      const a = await apiClient.get<Ad>(`/v1/ads/${id}`);
      adStore.upsert(a);
      adStore.select(id);
      return a;
    });
  },

  create(input: CreateAdInput) {
    return withLoading(async () => {
      const a = await apiClient.post<Ad>('/v1/ads', input);
      adStore.upsert(a);
      return a;
    });
  },

  update(id: string, input: UpdateAdInput) {
    return withLoading(async () => {
      const a = await apiClient.patch<Ad>(`/v1/ads/${id}`, input);
      adStore.upsert(a);
      return a;
    });
  },

  delete(id: string) {
    return withLoading(async () => {
      await apiClient.delete(`/v1/ads/${id}`);
      adStore.remove(id);
    });
  },
} as const;
