import { apiClient } from './client.js';
import { ApiResponse, fields, GadsCampaignTypes, type ListParams, type Paginated } from './types.js';
import type {
  AdGroupDisplay,
  AdGroupSearch,
  CreateAdGroupInput,
  UpdateAdGroupInput,
} from '../../domain/adgroups/adgroup.model.js';
import { withLoading } from '../utils.js';
import { ADGROUP_DISPLAY_FIELDS } from '@awc/helpers/campaigns.js';
import { adGroupStore } from '../../domain/adgroups/adgroup.store.js';

const ADGROUP_FIELDS = [...ADGROUP_DISPLAY_FIELDS, 'clicks', 'costs', 'impressions', 'ctr'];
type R<T extends GadsCampaignTypes> = T extends 'display' ? AdGroupDisplay : AdGroupSearch
export type AdgroupMatcher<T extends GadsCampaignTypes> = R<T>
export function getAdgroupApiScheme<T extends GadsCampaignTypes>(channel: T){
  return  {
    list(params?: ListParams) {
      console.log('getting adgroups', params)
      if(!params) return [] as any as ApiResponse<AdgroupMatcher<T>>;
      return withLoading(async () => {
        const data = await apiClient.get<ApiResponse<AdgroupMatcher<T>[]>>(`/gads/${channel}/adgroups/list/${params.id}/?fields=${ADGROUP_FIELDS.join(',')}`, params as any);
        adGroupStore[channel].load(data);
        return data;
      }, adGroupStore[channel]);
    },

    get(id: string) {
      return withLoading(async () => {
        const c = await apiClient.get<ApiResponse<AdgroupMatcher<T>>>(`/gads/${channel}/adgroups/${id}?fields=${ADGROUP_FIELDS.join(',')}`);
        adGroupStore[channel].upsert(c.data);
        adGroupStore[channel].select(id);
        return c;
      }, adGroupStore[channel]);
    },

    create(input: CreateAdGroupInput) {
      return withLoading(async () => {
        const c = await apiClient.post<ApiResponse<AdgroupMatcher<T>>>(`/gads/${channel}/adgroups/create`, input);
        adGroupStore[channel].upsert(c.data);
        return c;
      }, adGroupStore[channel]);
    },

    update(id: string, input: UpdateAdGroupInput) {
      return withLoading(async () => {
        const c = await apiClient.patch<ApiResponse<AdgroupMatcher<T>>>(`/gads/${channel}/adgroups/${id}`, input);
        adGroupStore[channel].upsert(c.data);
        return c;
      }, adGroupStore[channel]);
    },

    archive(id: string) {
      return withLoading(async ()=>{
        const c =  this.update(id, { status: 'archived' });
        return c
      }, adGroupStore[channel])
    },

    delete(id: string) {
      return withLoading(async () => {
        const remove = await apiClient.delete<ApiResponse<AdgroupMatcher<T>>>(`/gads/${channel}/adgroups/${id}`);
        adGroupStore[channel].remove(id);
        return remove
      }, adGroupStore[channel]);
    },

    publish(id: string) {
      return withLoading(async () => {
        const data = await apiClient.post<ApiResponse<AdgroupMatcher<T>>>(`/gads/${channel}/adgroups/${id}/publish`);
        adGroupStore[channel].remove(id);
        return data
      }, adGroupStore[channel]);
    },
  } as const;
}
export const adGroupsApi = {
  display: getAdgroupApiScheme('display'),
  search: getAdgroupApiScheme('search'),
} as const;
