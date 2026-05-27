import { apiClient } from './client.js';
import { fields, type ListParams, type Paginated } from './types.js';
import type {
  Ad,
  CreateAdInput,
  UpdateAdInput,
} from '../../domain/ads/ad.model.js';

const AD_FIELDS = fields(
  'id', 'adGroupId', 'campaignId', 'name', 'status', 'format',
  'headline', 'description', 'imageUrl', 'videoUrl', 'ctaText', 'landingUrl',
  'impressions', 'clicks', 'conversions', 'spend', 'ctr', 'cpc',
  'createdAt', 'updatedAt',
);

export const adsApi = {
  getAd(id: string) {
    return apiClient.get<Ad>(`/ads/${id}`, { fields: AD_FIELDS });
  },

  listAds(adGroupId: string, params?: ListParams) {
    return apiClient.get<Paginated<Ad>>(`/adgroups/${adGroupId}/ads`, {
      fields: AD_FIELDS,
      ...params,
    });
  },

  createAd(data: CreateAdInput) {
    return apiClient.post<Ad>('/ads', data);
  },

  updateAd(id: string, data: UpdateAdInput) {
    return apiClient.patch<Ad>(`/ads/${id}`, data);
  },

  publishAd(id: string) {
    return apiClient.post<Ad>(`/ads/${id}/publish`);
  },
} as const;
