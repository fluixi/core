import { createResource } from '@awc/kettlejs';
import { adGroupsApi } from '../../infrastructure/api/adgroups.api.js';
import { GadsCampaignTypes, ListParams } from '../../infrastructure/api/types.js';


export function createAdgroupsResources(id: () => ListParams, type: GadsCampaignTypes) {
  const [adgroups,  { refetch: refetchAdgroups  }] = createResource(id, adGroupsApi[type].list);
  return {
    adgroups,  refetchAdgroups,
  };
}
export function createAdgroupResources(id: () => any, type: GadsCampaignTypes) {
  const [adgroup,  { refetch: refetchAdgroup  }] = createResource(id, adGroupsApi[type].get);
  return {
    adgroup,  refetchAdgroup,
  };
}
