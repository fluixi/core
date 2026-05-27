import type { CampaignStatus } from '../campaigns/campaign.model.js';

export type AdStatus = CampaignStatus;
export type AdFormat = 'image' | 'video' | 'carousel' | 'text' | 'responsive';

export interface Ad {
  id:          string;
  adGroupId:   string;
  campaignId:  string;
  name:        string;
  status:      AdStatus;
  format:      AdFormat;
  headline:    string;
  description: string;
  imageUrl?:   string;
  videoUrl?:   string;
  ctaText:     string;
  landingUrl:  string;
  impressions: number;
  clicks:      number;
  conversions: number;
  spend:       number;
  ctr:         number;
  cpc:         number;
  createdAt:   string;
  updatedAt:   string;
}

export interface CreateAdInput {
  adGroupId:   string;
  campaignId:  string;
  name:        string;
  format:      AdFormat;
  headline:    string;
  description: string;
  imageUrl?:   string;
  videoUrl?:   string;
  ctaText:     string;
  landingUrl:  string;
}

export type UpdateAdInput = Partial<Omit<CreateAdInput, 'adGroupId' | 'campaignId'>> & {
  status?: AdStatus;
};
