import { apiClient } from './client.js';
import type { WorkflowTeam, CreateTeamInput, UpdateTeamInput } from '../../domain/workflow/team.model.js';

export const teamApi = {
  listTeams(workspaceId: string) {
    return apiClient.get<WorkflowTeam[]>(`/workflow/teams/list/${workspaceId}`);
  },

  getTeam(teamId: string) {
    return apiClient.get<WorkflowTeam>(`/workflow/teams/${teamId}`);
  },

  createTeam(input: CreateTeamInput) {
    return apiClient.post<WorkflowTeam>('/workflow/teams/create', { data: input });
  },

  updateTeam(teamId: string, data: UpdateTeamInput) {
    return apiClient.put<WorkflowTeam>(`/workflow/teams/${teamId}`, { data });
  },

  deleteTeam(teamId: string) {
    return apiClient.delete(`/workflow/teams/${teamId}`);
  },

  addTeamMember(teamId: string, uid: string) {
    return apiClient.post<WorkflowTeam>(`/workflow/teams/${teamId}/members`, { uid });
  },

  removeTeamMember(teamId: string, uid: string) {
    return apiClient.delete<WorkflowTeam>(`/workflow/teams/${teamId}/members/${uid}`);
  },
} as const;
