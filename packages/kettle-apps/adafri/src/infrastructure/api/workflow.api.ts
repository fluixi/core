import { apiClient } from './client.js';
import type {
  WorkflowWorkspace,
  WorkflowScenario,
  WorkflowCreative,
  DiscussionMessage,
  WorkspaceAnalytics,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  CreateScenarioInput,
  UpdateScenarioInput,
  CreateCreativeInput,
  UpdateCreativeInput,
} from '../../domain/workflow/workflow.model.js';

export const workflowApi = {
  // ── Workspaces ───────────────────────────────────────────────────────────────

  listWorkspaces(accountId: string, campaignId?: string) {
    const path = campaignId
      ? `/workflow/workspaces/list/${accountId}/${campaignId}`
      : `/workflow/workspaces/list/${accountId}`;
    return apiClient.get<WorkflowWorkspace[]>(path);
  },

  getWorkspace(workspaceId: string) {
    return apiClient.get<WorkflowWorkspace>(`/workflow/workspaces/${workspaceId}`);
  },

  createWorkspace(accountId: string, input: CreateWorkspaceInput) {
    return apiClient.post<WorkflowWorkspace>('/workflow/workspaces/create', {
      accountId,
      data: input,
    });
  },

  updateWorkspace(workspaceId: string, input: UpdateWorkspaceInput) {
    return apiClient.put<WorkflowWorkspace>(`/workflow/workspaces/${workspaceId}`, {
      data: input,
    });
  },

  updateWorkspaceStatus(workspaceId: string, status: string) {
    return apiClient.put<WorkflowWorkspace>(`/workflow/workspaces/${workspaceId}/status`, {
      status,
    });
  },

  deleteWorkspace(workspaceId: string) {
    return apiClient.delete(`/workflow/workspaces/${workspaceId}`);
  },

  addAdmin(workspaceId: string, uid: string) {
    return apiClient.post(`/workflow/workspaces/${workspaceId}/admins`, { uid, action: 'add' });
  },

  removeAdmin(workspaceId: string, uid: string) {
    return apiClient.post(`/workflow/workspaces/${workspaceId}/admins`, { uid, action: 'remove' });
  },

  transferOwnership(workspaceId: string, newOwnerUid: string) {
    return apiClient.post(`/workflow/workspaces/${workspaceId}/transfer-ownership`, { newOwnerUid });
  },

  // ── Scenarios ────────────────────────────────────────────────────────────────

  listScenarios(workspaceId: string) {
    return apiClient.get<WorkflowScenario[]>(`/workflow/scenarios/list/${workspaceId}`);
  },

  getScenario(scenarioId: string) {
    return apiClient.get<WorkflowScenario>(`/workflow/scenarios/${scenarioId}`);
  },

  createScenario(input: CreateScenarioInput) {
    return apiClient.post<WorkflowScenario>('/workflow/scenarios/create', { data: input });
  },

  updateScenario(scenarioId: string, input: UpdateScenarioInput) {
    return apiClient.put<WorkflowScenario>(`/workflow/scenarios/${scenarioId}`, { data: input });
  },

  selectScenario(scenarioId: string) {
    return apiClient.post<WorkflowScenario>(`/workflow/scenarios/${scenarioId}/select`);
  },

  deleteScenario(scenarioId: string) {
    return apiClient.delete(`/workflow/scenarios/${scenarioId}`);
  },

  // ── Creatives ────────────────────────────────────────────────────────────────

  listCreatives(workspaceId: string, type?: string) {
    return apiClient.get<WorkflowCreative[]>(
      `/workflow/creatives/list/${workspaceId}`,
      type ? { type } : undefined,
    );
  },

  getCreative(creativeId: string) {
    return apiClient.get<WorkflowCreative>(`/workflow/creatives/${creativeId}`);
  },

  createCreative(input: CreateCreativeInput) {
    return apiClient.post<WorkflowCreative>('/workflow/creatives/create', { data: input });
  },

  updateCreative(creativeId: string, input: UpdateCreativeInput) {
    return apiClient.put<WorkflowCreative>(`/workflow/creatives/${creativeId}`, { data: input });
  },

  reviewCreative(creativeId: string, status: 'approved' | 'rejected', feedback?: string) {
    return apiClient.post<WorkflowCreative>(`/workflow/creatives/${creativeId}/review`, {
      status,
      ...(feedback ? { feedback } : {}),
    });
  },

  deleteCreative(creativeId: string) {
    return apiClient.delete(`/workflow/creatives/${creativeId}`);
  },

  // ── Discussion ───────────────────────────────────────────────────────────────

  listMessages(workspaceId: string) {
    return apiClient.get<DiscussionMessage[]>(
      `/workflow/workspaces/${workspaceId}/discussion`,
    );
  },

  postMessage(workspaceId: string, content: string) {
    return apiClient.post<DiscussionMessage>(
      `/workflow/workspaces/${workspaceId}/discussion`,
      { content },
    );
  },

  // ── Analytics ────────────────────────────────────────────────────────────────

  getAnalytics(workspaceId: string) {
    return apiClient.get<WorkspaceAnalytics>(`/workflow/analytics/${workspaceId}`);
  },
} as const;
