import { apiClient } from './client.js';
import type { WorkflowCampaignLink } from '../../domain/workflow/campaign-link.model.js';

export const campaignLinkApi = {
  listLinks(workspaceId: string) {
    return apiClient.get<WorkflowCampaignLink[]>(`/workflow/campaigns-link/list/${workspaceId}`);
  },

  linkCampaign(workspaceId: string, campaignId: string) {
    return apiClient.post<WorkflowCampaignLink>('/workflow/campaigns-link/link', {
      data: { workspaceId, campaignId },
    });
  },

  unlinkCampaign(linkId: string) {
    return apiClient.delete(`/workflow/campaigns-link/${linkId}`);
  },
} as const;
