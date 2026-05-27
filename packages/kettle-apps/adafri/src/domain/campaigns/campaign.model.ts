export type CampaignStatus    = 'active' | 'paused' | 'archived' | 'draft';
export type CampaignObjective = 'awareness' | 'traffic' | 'conversions' | 'leads';
export type BudgetType        = 'daily' | 'lifetime';
import {Display } from "@awc/helpers/campaigns"
export interface CampaignDisplay extends Display{}
export interface CampaignSearch extends Display{}

// export interface Campaign {
//   id:          string;
//   name:        string;
//   status:      CampaignStatus;
//   objective:   CampaignObjective;
//   budget:      number;
//   budgetType:  BudgetType;
//   startDate:   string;
//   endDate?:    string;
//   impressions: number;
//   clicks:      number;
//   conversions: number;
//   spend:       number;
//   ctr:         number;
//   cpc:         number;
//   roas:        number;
//   createdAt:   string;
//   updatedAt:   string;
// }

export interface CreateCampaignInput {
  name:       string;
  objective:  CampaignObjective;
  budget:     number;
  budgetType: BudgetType;
  startDate:  string;
  endDate?:   string;
}

export type UpdateCampaignInput = Partial<CreateCampaignInput> & {
  status?: CampaignStatus;
};
