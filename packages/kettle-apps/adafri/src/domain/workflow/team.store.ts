import { createSignal, batch } from '@awc/kettlejs';
import type { WorkflowTeam } from './team.model.js';

const [_teams,       _setTeams]       = createSignal<WorkflowTeam[]>([]);
const [_teamLoading, _setTeamLoading] = createSignal(false);

export const teamStore = {
  teams:       _teams,
  teamLoading: _teamLoading,

  loadTeams(items: WorkflowTeam[]): void {
    _setTeams(items);
  },

  upsertTeam(team: WorkflowTeam): void {
    _setTeams(prev => {
      const idx = prev.findIndex(t => t.id === team.id);
      return idx >= 0 ? prev.map((t, i) => (i === idx ? team : t)) : [...prev, team];
    });
  },

  removeTeam(id: string): void {
    _setTeams(prev => prev.filter(t => t.id !== id));
  },

  setTeamLoading: _setTeamLoading,

  clearTeams(): void {
    batch(() => {
      _setTeams([]);
      _setTeamLoading(false);
    });
  },
} as const;
