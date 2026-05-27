import { createSignal, createEffect, createMemo } from '@awc/kettlejs';
import { useParams } from '@awc/kettlejs/router';
import { apiClient } from '../../../../infrastructure/api/client.js';
import { workflowStore } from '../../../../domain/workflow/workflow.store.js';
import { teamStore } from '../../../../domain/workflow/team.store.js';
import { RoleBadge } from '../../../../shared/components/workspace/RoleBadge.jsx';
import { TeamBadge } from '../../../../shared/components/workspace/TeamBadge.jsx';
import { InviteMemberModal } from '../../../../shared/components/workspace/InviteMemberModal.jsx';
import type { WorkspaceRole } from '../../../../domain/workflow/invite.model.js';

const ALL_ROLES: WorkspaceRole[] = ['owner', 'admin', 'editor', 'viewer', 'guest'];

function initials(name: string): string {
  return name.split(' ').map((w: string) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';
}

export default function MembersPage() {
  const params = useParams<{ workspaceId: string }>();

  const [members,      setMembers]      = createSignal<any[]>([]);
  const [loading,      setLoading]      = createSignal(false);
  const [showInvite,   setShowInvite]   = createSignal(false);

  const wsId    = createMemo(() => params().workspaceId);
  const isAdmin = createMemo(() => workflowStore.isAdmin?.() ?? false);

  createEffect(() => {
    const id = wsId();
    if (!id) return;
    setLoading(true);
    apiClient.get<any[]>(`/workflow/members/list/${id}`)
      .then(items => setMembers(items))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  });

  async function handleRemove(memberId: string) {
    if (!confirm('Remove this member from the workspace?')) return;
    await apiClient.delete(`/workflow/members/${memberId}`);
    setMembers(prev => prev.filter(m => m.id !== memberId));
  }

  async function handleRoleChange(memberId: string, role: string) {
    await apiClient.put(`/workflow/members/${memberId}/role`, { role });
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m));
  }

  function getTeamsForMember(teamIds: string[]) {
    return teamStore.teams().filter(t => (teamIds ?? []).includes(t.id));
  }

  return (
    <div class="flex-1 overflow-y-auto bg-gray-50">
      <div class="max-w-5xl mx-auto px-8 py-8">

        {/* Header */}
        <div class="mb-8 flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Team Members</h1>
            <p class="text-sm text-gray-500 mt-0.5">Manage who has access to this workspace</p>
          </div>
          {() => isAdmin() && (
            <button
              class="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              onClick={() => setShowInvite(true)}
            >
              Invite Member
            </button>
          )}
        </div>

        {/* Member table */}
        <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-sm font-semibold text-gray-900">
              {() => `${members().length} Member${members().length !== 1 ? 's' : ''}`}
            </h2>
          </div>

          {() => loading()
            ? (
              <div class="p-6 space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} class="flex items-center gap-3 animate-pulse">
                    <div class="w-9 h-9 bg-gray-200 rounded-full" />
                    <div class="flex-1 space-y-1.5">
                      <div class="h-3 w-32 bg-gray-200 rounded" />
                      <div class="h-3 w-48 bg-gray-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )
            : members().length === 0
            ? (
              <div class="flex flex-col items-center justify-center py-12 text-center">
                <span class="text-3xl mb-2">👥</span>
                <p class="text-sm text-gray-500">No members yet. Invite your team!</p>
              </div>
            )
            : (
              <ul class="divide-y divide-gray-100">
                {members().map(m => (
                  <li key={m.id} class="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                    {/* Avatar */}
                    <div class={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${m.status === 'pending' ? 'bg-gray-400' : 'bg-indigo-500'}`}>
                      {initials(m.displayName)}
                    </div>

                    {/* Info */}
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <p class="text-sm font-medium text-gray-900 truncate">{m.displayName}</p>
                        {m.status === 'pending' && (
                          <span class="px-1.5 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-700">pending</span>
                        )}
                      </div>
                      <p class="text-xs text-gray-500 truncate">{m.email}</p>
                      {/* Team badges */}
                      {() => getTeamsForMember(m.teamIds ?? []).length > 0 && (
                        <div class="flex flex-wrap gap-1 mt-1">
                          {getTeamsForMember(m.teamIds ?? []).map(team => (
                            <TeamBadge key={team.id} team={team} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Role */}
                    {() => isAdmin()
                      ? (
                        <select
                          value={m.role}
                          onChange={(e: Event) => handleRoleChange(m.id, (e.target as HTMLSelectElement).value)}
                          class="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {ALL_ROLES.map(r => (
                            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                          ))}
                        </select>
                      )
                      : <RoleBadge role={m.role} />
                    }

                    {/* Remove */}
                    {() => isAdmin() && (
                      <button
                        class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove member"
                        onClick={() => handleRemove(m.id)}
                      >
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )
          }
        </div>
      </div>

      {/* Invite modal */}
      {() => showInvite() && (
        <InviteMemberModal
          workspaceId={wsId()}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
}
