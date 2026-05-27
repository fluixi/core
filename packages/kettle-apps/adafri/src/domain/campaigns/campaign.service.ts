import { apiClient } from '../../infrastructure/api/client.js';
import { BaseCampaignStore, campaignStore } from './campaign.store.js';
import type { CampaignDisplay, CreateCampaignInput, UpdateCampaignInput } from './campaign.model.js';
import type { GadsCampaignTypes, ListParams, Paginated } from '../../infrastructure/api/types.js';
import { CAMPAIGN_DISPLAY_FIELDS } from '@awc/helpers/campaigns.js';
import { createResource } from '@awc/kettlejs';
import { CampaignMatcher, campaignsApi } from '../../infrastructure/api/campaigns.api.js';
import { CamapignActions } from './service.context.js';
import { AdGroupDisplay, UpdateAdGroupInput } from '../adgroups/adgroup.model.js';

export function createCampaignsResources(accountId: () => ListParams, type: GadsCampaignTypes) {
  const [campaigns,  { refetch: refetchCampaigns  }] = createResource(accountId, campaignsApi[type].campaign.list);
  return {
    campaigns,  refetchCampaigns,
  };
}
export function createCampaignResources(id: () => string, type: GadsCampaignTypes) {
  const [campaign,  { refetch: refetchCampaign  }] = createResource(id, campaignsApi[type].campaign.get);
  return {
    campaign,  refetchCampaign,
  };
}

export function createCampaignActions<R extends() => void, T extends GadsCampaignTypes, S extends BaseCampaignStore<CampaignMatcher<T>>>(refetch: R, type: T, store: S): CamapignActions<CampaignMatcher<T>, AdGroupDisplay> {
  return {
    async get(id: string) {
      const ws = await campaignsApi[type].campaign.get(id);
      store.upsert(ws.data);
      return ws;
    },
    async list(params) {
      const ws = await campaignsApi[type].campaign.list(params);
      store.load(ws);
      return ws;
    },
    async create(input) {
      const ws = await campaignsApi[type].campaign.create(input);
      store.upsert(ws.data);
      return ws;
    },
    async update(id, input) {
      const ws = await campaignsApi[type].campaign.update(id, input);
      store.upsert(ws.data);
      return ws;
    },

    async archive(id: string) {
      const ws = await campaignsApi[type].campaign.update(id, { status: 'archived' });
      store.upsert(ws.data);
      return ws;
    },

    async delete(id: string) {
     const ws =  await campaignsApi[type].campaign.delete(id);
      store.remove(id);
      return ws
    },
    async publish(id: string) {
     const ws =  await campaignsApi[type].campaign.publish(id);
      store.upsert(ws.data);
      return ws
    },
    agdroup: {
      async get(id: string) {
        const ws = await campaignsApi[type].adgroup.get(id);
        store.upsert(ws.data);
        return ws;
      },
      async list(params) {
        const ws = await campaignsApi[type].adgroup.list(params);
        store.load(ws);
        return ws;
      },
      async create(input) {
        const ws = await campaignsApi[type].adgroup.create(input);
        store.upsert(ws.data);
        return ws;
      },
      async update(id, input) {
        const ws = await campaignsApi[type].adgroup.update(id, input);
        store.upsert(ws.data);
        return ws;
      },
  
      async archive(id) {
        const ws = await campaignsApi[type].adgroup.update(id, { status: 'archived' });
        store.upsert(ws.data);
        return ws;
      },
  
      async delete(id) {
       const ws =  await campaignsApi[type].adgroup.delete(id);
        store.remove(id);
        return ws
      },
      async publish(id) {
       const ws =  await campaignsApi[type].adgroup.publish(id);
        store.upsert(ws.data);
        return ws
      },
      refetch
    },
    refetch
  };
}

// export const campaignService = {
//   list(params: ListParams & { status?: string, accountId: string }) {
//     return withLoading(async () => {
//       const data = await apiClient.get<Paginated<CampaignDisplay>>(`/gads/display/list/${params.accountId}?fields=${[...CAMPAIGN_DISPLAY_FIELDS, 'clicks', 'costs', 'impressions', 'ctr'].join(',')}`, params as any);
//       // console.log('campaigns loaded', data.)
//       campaignStore.load(data);
//       return data;
//     });
//   },

//   get(id: string) {
//     return withLoading(async () => {
//       const c = await apiClient.get<CampaignDisplay>(`/gads/display/${id}?fields=${[...CAMPAIGN_DISPLAY_FIELDS, 'clicks', 'costs', 'impressions', 'ctr'].join(',')}`);
//       campaignStore.upsert(c);
//       campaignStore.select(id);
//       return c;
//     });
//   },

//   create(input: CreateCampaignInput) {
//     return withLoading(async () => {
//       const c = await apiClient.post<CampaignDisplay>('/campaigns', input);
//       campaignStore.upsert(c);
//       return c;
//     });
//   },

//   update(id: string, input: UpdateCampaignInput) {
//     return withLoading(async () => {
//       const c = await apiClient.patch<CampaignDisplay>(`/gads/display/${id}`, input);
//       campaignStore.upsert(c);
//       return c;
//     });
//   },

//   archive(id: string) {
//     return this.update(id, { status: 'archived' });
//   },

//   delete(id: string) {
//     return withLoading(async () => {
//       await apiClient.delete(`/gads/display/${id}`);
//       campaignStore.remove(id);
//     });
//   },
// } as const;
