import { apiClient } from './client.js';
import { ApiResponse, fields, GadsCampaignTypes, type ListParams, type Paginated } from './types.js';
import type {
  CampaignDisplay,
  CampaignSearch,
  CreateCampaignInput,
  UpdateCampaignInput,
} from '../../domain/campaigns/campaign.model.js';
import { campaignStore } from '../../domain/campaigns/campaign.store.js';
import { CAMPAIGN_DISPLAY_FIELDS } from '@awc/helpers/campaigns.js';
import { withLoading } from '../utils.js';
import { getAdgroupApiScheme } from './adgroups.api.js';

type R<T extends GadsCampaignTypes> = T extends 'display' ? CampaignDisplay : CampaignSearch

export type CampaignMatcher<T extends GadsCampaignTypes> = R<T>

export function getCampaignApiScheme<T extends keyof typeof campaignStore>(channel: T){
  return  {
      list(params?: ListParams) {
        if(!params) return {data: []} as any as ApiResponse<CampaignMatcher<T>>;
        console.log('getting list of campaig s', params)
        return withLoading(async () => {
          const data = await apiClient.get<ApiResponse<CampaignMatcher<T>>>(`/gads/${channel}/list/${params.id}?fields=${[...CAMPAIGN_DISPLAY_FIELDS, 'clicks', 'costs', 'impressions', 'ctr'].join(',')}`, params as any);
          campaignStore[channel].load(data);
          return data;
        }, campaignStore[channel]);
      },

  get(id: string) {
    return withLoading(async () => {
      const c = await apiClient.get<ApiResponse<CampaignMatcher<T>>>(`/gads/${channel}/${id}?fields=${[...CAMPAIGN_DISPLAY_FIELDS, 'clicks', 'costs', 'impressions', 'ctr'].join(',')}`);
      campaignStore[channel].upsert(c.data);
      campaignStore[channel].select(id);
      return c;
    }, campaignStore[channel]);
  },

  create(input: CreateCampaignInput) {
    return withLoading(async () => {
      const c = await apiClient.post<ApiResponse<CampaignMatcher<T>>>(`/gads/${channel}/create`, input);
      campaignStore[channel].upsert(c.data);
      return c;
    }, campaignStore[channel]);
  },

  update(id: string, input: UpdateCampaignInput) {
    return withLoading(async () => {
      const c = await apiClient.patch<ApiResponse<CampaignMatcher<T>>>(`/gads/${channel}/create/${id}`, input);
      campaignStore[channel].upsert(c.data);
      return c;
    }, campaignStore[channel]);
  },

  archive(id: string) {
    return withLoading(async ()=>{
      const c =  this.update(id, { status: 'archived' });
      return c
    }, campaignStore[channel])
  },

  delete(id: string) {
    return withLoading(async () => {
      const remove = await apiClient.delete<ApiResponse<CampaignMatcher<T>>>(`/gads/${channel}/create/${id}`);
      campaignStore[channel].remove(id);
      return remove
    }, campaignStore[channel]);
  },

  publish(id: string) {
    return withLoading(async () => {
      const data = await apiClient.post<ApiResponse<CampaignMatcher<T>>>(`/gads/${channel}/${id}/publish`);
      campaignStore[channel].remove(id);
      return data
    }, campaignStore[channel]);
  },
  } as const;
}

export const campaignsApi = {
  display: {
    campaign: getCampaignApiScheme('display'),
    adgroup: getAdgroupApiScheme('display'),
  },
  search: {
    campaign: getCampaignApiScheme('search'),
    adgroup: getAdgroupApiScheme('search'),
  },
};
