import { createResource } from '@awc/reactive';
import { teamStore } from './team.store.js';
import { teamApi } from '../../infrastructure/api/team.api.js';
import type { CreateTeamInput, UpdateTeamInput, WorkflowTeam } from './team.model.js';
import type { TeamActions } from './service.context.js';

// ── Resource factory ───────────────────────────────────────────────────────────

export function createTeamResources(workspaceId: () => string) {
  const [teams, { refetch: refetchTeams }] = createResource(
    workspaceId,
    (id) => teamApi.listTeams(id),
  );
  return { teams, refetchTeams };
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function createTeamActions(refetch: () => void): TeamActions {
  return {
    async create(input: CreateTeamInput): Promise<WorkflowTeam> {
      const team = await teamApi.createTeam(input);
      teamStore.upsertTeam(team);
      return team;
    },

    async update(id: string, input: UpdateTeamInput): Promise<WorkflowTeam> {
      const team = await teamApi.updateTeam(id, input);
      teamStore.upsertTeam(team);
      return team;
    },

    async delete(id: string): Promise<void> {
      await teamApi.deleteTeam(id);
      teamStore.removeTeam(id);
    },

    async addMember(teamId: string, uid: string): Promise<void> {
      const team = await teamApi.addTeamMember(teamId, uid);
      teamStore.upsertTeam(team);
    },

    async removeMember(teamId: string, uid: string): Promise<void> {
      const team = await teamApi.removeTeamMember(teamId, uid);
      teamStore.upsertTeam(team);
    },

    refetch,
  };
}

// ── Legacy compatibility ───────────────────────────────────────────────────────

/** @deprecated Inject teamActions from WorkspaceServiceContext instead. */
export const teamService = {
  list:         (workspaceId: string)              => teamApi.listTeams(workspaceId),
  create:       (input: CreateTeamInput)            => createTeamActions(() => {}).create(input),
  update:       (id: string, input: UpdateTeamInput) => createTeamActions(() => {}).update(id, input),
  delete:       (id: string)                         => createTeamActions(() => {}).delete(id),
  addMember:    (teamId: string, uid: string)        => createTeamActions(() => {}).addMember(teamId, uid),
  removeMember: (teamId: string, uid: string)        => createTeamActions(() => {}).removeMember(teamId, uid),
} as const;
