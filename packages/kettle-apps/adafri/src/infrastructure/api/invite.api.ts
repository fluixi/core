import { apiClient } from './client.js';
import type { WorkflowInvite, CreateInviteInput } from '../../domain/workflow/invite.model.js';

export const inviteApi = {
  listInvites(workspaceId: string) {
    return apiClient.get<WorkflowInvite[]>(`/workflow/invites/list/${workspaceId}`);
  },

  createInvite(input: CreateInviteInput) {
    return apiClient.post<WorkflowInvite>('/workflow/invites/create', { data: input });
  },

  revokeInvite(inviteId: string) {
    return apiClient.delete(`/workflow/invites/${inviteId}`);
  },
} as const;
