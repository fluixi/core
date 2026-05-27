import { createSignal, createEffect, createMemo } from '@awc/kettlejs';
import { useParams } from '@awc/kettlejs/router';
import { teamStore } from '../../../../domain/workflow/team.store.js';
import { teamService } from '../../../../domain/workflow/team.service.js';
import { workflowStore } from '../../../../domain/workflow/workflow.store.js';
import type { WorkflowTeam } from '../../../../domain/workflow/team.model.js';

const SWATCH_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
];

function initials(name: string): string {
  return name.split(' ').map((w: string) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '?';
}

export default function TeamsPage() {
  const params = useParams<{ workspaceId: string }>();
  const wsId   = createMemo(() => params().workspaceId);

  const [newName,    setNewName]    = createSignal('');
  const [newColor,   setNewColor]   = createSignal(SWATCH_COLORS[0]);
  const [newIcon,    setNewIcon]    = createSignal('');
  const [creating,   setCreating]   = createSignal(false);
  const [expandedId, setExpandedId] = createSignal<string | null>(null);
  const [addUid,     setAddUid]     = createSignal<Record<string, string>>({});

  // Use store members — already loaded by workspace layout
  const members  = createMemo(() => workflowStore.members());
  const isAdmin  = createMemo(() => workflowStore.isAdmin?.() ?? false);
  const borderColors = {
    active: 'border-gray-800 scale-110',
    inactive: 'border-gray-200',
  }

  createEffect(() => {
    const id = wsId();
    if (!id) return;
    teamService.list(id);
  });

  async function handleCreate(e: Event) {
    e.preventDefault();
    if (!isAdmin()) return;
    const name = newName().trim();
    if (!name) return;
    setCreating(true);
    try {
      await teamService.create({
        workspaceId: wsId(),
        name,
        color: newColor(),
        icon:  newIcon().trim() || undefined,
      });
      setNewName('');
      setNewIcon('');
    } finally {
      setCreating(false);
    }
  }

  async function handleAddMember(team: WorkflowTeam) {
    const uid = (addUid()[team.id] ?? '').trim();
    if (!uid) return;
    await teamService.addMember(team.id, uid);
    setAddUid(prev => ({ ...prev, [team.id]: '' }));
  }

  async function handleRemoveMember(teamId: string, uid: string) {
    await teamService.removeMember(teamId, uid);
  }

  async function handleDeleteTeam(teamId: string) {
    if (!confirm('Delete this team?')) return;
    await teamService.delete(teamId);
  }

  function getMemberName(uid: string): string {
    const m = members().find(m => m.uid === uid);
    return m?.displayName ?? uid;
  }

  return (
    <div class="flex-1 overflow-y-auto bg-gray-50">
      <div class="max-w-5xl mx-auto px-8 py-8">

        <div class="mb-8">
          <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Teams</h1>
          <p class="text-sm text-gray-500 mt-0.5">Organize workspace members into permission groups</p>
        </div>

        <div class="grid grid-cols-3 gap-6">

          {/* ── Team list ─────────────────────────────────────────── */}
          <div class="col-span-2 space-y-4">
            {() => teamStore.teamLoading()
              ? (
                <div class="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} class="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                      <div class="h-4 w-32 bg-gray-200 rounded" />
                    </div>
                  ))}
                </div>
              )
              : teamStore.teams().length === 0
              ? (
                <div class="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-14 text-center">
                  <span class="text-4xl mb-3">🏷️</span>
                  <p class="text-gray-500 text-sm font-medium">No teams yet</p>
                  <p class="text-gray-400 text-xs mt-1">
                    {() => isAdmin()
                      ? 'Use the form on the right to create your first team.'
                      : 'Ask a workspace admin to create teams.'
                    }
                  </p>
                </div>
              )
              : teamStore.teams().map(team => (
                <div key={team.id} class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Team header row */}
                  <div
                    class="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedId(prev => prev === team.id ? null : team.id)}
                  >
                    <div
                      class="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={`background: ${team.color ?? '#6366f1'}`}
                    >
                      {team.icon || (team.name[0]?.toUpperCase() ?? '?')}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="font-semibold text-gray-900 text-sm">{team.name}</p>
                      <p class="text-xs text-gray-500">
                        {(team.memberUids ?? []).length} member{(team.memberUids ?? []).length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {/* Avatar stack */}
                    <div class="flex -space-x-1.5">
                      {(team.memberUids ?? []).slice(0, 4).map(uid => (
                        <div
                          key={uid}
                          class="w-6 h-6 rounded-full bg-indigo-400 border-2 border-white flex items-center justify-center text-white text-[9px] font-bold"
                          title={getMemberName(uid)}
                        >
                          {initials(getMemberName(uid))}
                        </div>
                      ))}
                      {(team.memberUids ?? []).length > 4 && (
                        <div class="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-500 text-[9px] font-bold">
                          +{(team.memberUids ?? []).length - 4}
                        </div>
                      )}
                    </div>
                    <span class="text-gray-400 text-xs ml-2">
                      {() => expandedId() === team.id ? '▲' : '▼'}
                    </span>
                  </div>

                  {/* Expanded member list */}
                  {() => expandedId() === team.id && (
                    <div class="border-t border-gray-100 px-5 pb-4">
                      <div class="pt-3 space-y-2">
                        {(team.memberUids ?? []).length === 0
                          ? <p class="text-xs text-gray-400 py-2">No members in this team yet.</p>
                          : (team.memberUids ?? []).map(uid => (
                            <div key={uid} class="flex items-center gap-3">
                              <div class="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                                {initials(getMemberName(uid))}
                              </div>
                              <span class="flex-1 text-sm text-gray-700">{getMemberName(uid)}</span>
                              {() => isAdmin() && (
                                <button
                                  class="text-xs text-red-500 hover:text-red-700 transition-colors"
                                  onClick={() => handleRemoveMember(team.id, uid)}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))
                        }
                      </div>

                      {() => isAdmin() && (
                        <div class="mt-3 flex gap-2">
                          <select
                            value={addUid()[team.id] ?? ''}
                            onChange={(e: Event) => {
                              const v = (e.target as HTMLSelectElement).value;
                              setAddUid(prev => ({ ...prev, [team.id]: v }));
                            }}
                            class="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">Select member to add…</option>
                            {members()
                              .filter(m => !(team.memberUids ?? []).includes(m.uid))
                              .map(m => (
                                <option key={m.uid} value={m.uid}>{m.displayName} ({m.email})</option>
                              ))
                            }
                          </select>
                          <button
                            class="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                            onClick={() => handleAddMember(team)}
                          >
                            Add
                          </button>
                          <button
                            class="px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                            onClick={() => handleDeleteTeam(team.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            }
          </div>

          {/* ── Create team form (always visible) ─────────────────── */}
          <div class="bg-white border border-gray-200 rounded-xl shadow-sm p-6 self-start">
            <h2 class="text-sm font-semibold text-gray-900 mb-1">New Team</h2>

            {() => !isAdmin()
              ? (
                <p class="text-xs text-gray-400 mt-2 leading-relaxed">
                  Only workspace admins and owners can create teams.
                </p>
              )
              : (
                <form onSubmit={handleCreate} class="space-y-4 mt-4">
                  <div>
                    <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onInput={(e: InputEvent) => setNewName((e.target as HTMLInputElement).value)}
                      placeholder="e.g. Marketing"
                      class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
                    />
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                      Icon (emoji)
                    </label>
                    <input
                      type="text"
                      value={newIcon}
                      onInput={(e: InputEvent) => setNewIcon((e.target as HTMLInputElement).value)}
                      placeholder="📣"
                      class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                      Color
                    </label>
                    <div class="flex flex-wrap gap-2">
                      {()=>SWATCH_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          className={`w-6 h-6 rounded-full border-2 transition-all ${newColor() === c ? borderColors.active : borderColors.inactive}`}
                          style={`background: ${c}`}
                          onClick={() => setNewColor(c)}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    class="w-full py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg transition-colors"
                    disabled={()=>creating() || !newName().trim()}
                  >
                    {() => creating() ? 'Creating…' : 'Create Team'}
                  </button>
                </form>
              )
            }
          </div>

        </div>
      </div>
    </div>
  );
}
