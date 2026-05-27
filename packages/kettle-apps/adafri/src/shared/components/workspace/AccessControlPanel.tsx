import { createSignal, createMemo } from '@awc/kettlejs';
import { teamStore } from '../../../domain/workflow/team.store.js';
import { TeamBadge } from './TeamBadge.jsx';
import type { WorkflowMember } from '../../../domain/workflow/member.model.js';

interface Props {
  allowedTeamIds:    string[];
  allowedMemberUids: string[];
  members:           WorkflowMember[];
  onSave:            (teams: string[], members: string[]) => void;
  saving?:           boolean;
}

export function AccessControlPanel({
  allowedTeamIds,
  allowedMemberUids,
  members,
  onSave,
  saving = false,
}: Props) {
  const [teamIds,   setTeamIds]   = createSignal<string[]>([...(allowedTeamIds ?? [])]);
  const [memberIds, setMemberIds] = createSignal<string[]>([...(allowedMemberUids ?? [])]);

  const isWorkspaceWide = createMemo(() => teamIds().length === 0 && memberIds().length === 0);

  function toggleWorkspaceWide() {
    if (isWorkspaceWide()) return; // already workspace-wide
    setTeamIds([]);
    setMemberIds([]);
  }

  function toggleTeam(id: string) {
    setTeamIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id],
    );
  }

  function toggleMember(uid: string) {
    setMemberIds(prev =>
      prev.includes(uid) ? prev.filter(u => u !== uid) : [...prev, uid],
    );
  }

  function handleSave() {
    onSave(teamIds(), memberIds());
  }

  return (
    <div class="space-y-5">
      {/* Workspace-wide toggle */}
      <div
        class={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isWorkspaceWide() ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}
        onClick={toggleWorkspaceWide}
      >
        <div class={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${isWorkspaceWide() ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'}`} />
        <div>
          <p class="text-sm font-medium text-gray-900">Workspace-wide</p>
          <p class="text-xs text-gray-500">All workspace members can access</p>
        </div>
      </div>

      {/* Teams */}
      <div>
        <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Teams</p>
        {teamStore.teams().length === 0
          ? <p class="text-xs text-gray-400">No teams in this workspace yet.</p>
          : (
            <div class="flex flex-wrap gap-2">
              {teamStore.teams().map(team => {
                const selected = teamIds().includes(team.id);
                return (
                  <button
                    key={team.id}
                    type="button"
                    class={`transition-all ${selected ? 'opacity-100' : 'opacity-50 hover:opacity-75'}`}
                    onClick={() => toggleTeam(team.id)}
                  >
                    <TeamBadge team={team} />
                  </button>
                );
              })}
            </div>
          )
        }
      </div>

      {/* Members */}
      <div>
        <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Specific Members</p>
        <div class="flex flex-wrap gap-2">
          {members.map(m => {
            const selected = memberIds().includes(m.uid);
            return (
              <button
                key={m.uid}
                type="button"
                class={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all ${selected ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                onClick={() => toggleMember(m.uid)}
              >
                <span class="w-4 h-4 rounded-full bg-indigo-400 flex items-center justify-center text-white text-[8px] font-bold">
                  {(m.displayName[0] ?? '?').toUpperCase()}
                </span>
                {m.displayName}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        class="w-full py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg transition-colors"
        disabled={saving}
        onClick={handleSave}
      >
        {saving ? 'Saving…' : 'Save Access Settings'}
      </button>
    </div>
  );
}
