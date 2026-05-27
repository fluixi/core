import type { CampaignStatus } from '../campaigns/campaign.model.js';

export type { CampaignStatus as AdGroupStatus };

import {AdGroupDisplay as _AdgroupDisplay, AdGroupBase} from "@awc/helpers/campaigns"

export interface AdGroupSearch extends AdGroupDisplay{}
export interface AdGroupDisplay extends _AdgroupDisplay{
  impressions?: number;
  clicks?:      number;
  costs?:       number;
}

// export interface AdGroup {
//   id:          string;
//   campaignId:  string;
//   name:        string;
//   status:      CampaignStatus;
//   budget:      number;
//   bid:         number;
//   targeting:   AdGroupTargeting;
//   impressions: number;
//   clicks:      number;
//   conversions: number;
//   spend:       number;
//   ctr:         number;
//   cpc:         number;
//   createdAt:   string;
//   updatedAt:   string;
// }

export interface AdGroupTargeting {
  ageMin?:    number;
  ageMax?:    number;
  genders?:   string[];
  locations?: string[];
  interests?: string[];
  languages?: string[];
}

export interface CreateAdGroupInput {
  campaignId: string;
  name:       string;
  budget:     number;
  bid:        number;
  targeting?: Partial<AdGroupTargeting>;
}

export type UpdateAdGroupInput = Partial<Omit<CreateAdGroupInput, 'campaignId'>> & {
  status?: CampaignStatus;
};
