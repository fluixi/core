import { createSignal, createEffect } from '@awc/kettlejs';
import { inviteApi } from '../../../infrastructure/api/invite.api.js';
import { teamStore } from '../../../domain/workflow/team.store.js';
import { RoleBadge } from './RoleBadge.jsx';
import type { WorkspaceRole } from '../../../domain/workflow/invite.model.js';
import type { WorkflowInvite } from '../../../domain/workflow/invite.model.js';

const ROLES: WorkspaceRole[] = ['admin', 'editor', 'viewer', 'guest'];

interface Props {
  workspaceId: string;
  onClose:     () => void;
}

export function InviteMemberModal({ workspaceId, onClose }: Props) {
  const [email,        setEmail]        = createSignal('');
  const [role,         setRole]         = createSignal<WorkspaceRole>('viewer');
  const [selectedTeams,setSelectedTeams]= createSignal<string[]>([]);
  const [inviting,     setInviting]     = createSignal(false);
  const [error,        setError]        = createSignal<string | null>(null);
  const [done,         setDone]         = createSignal(false);
  const [invites,      setInvites]      = createSignal<WorkflowInvite[]>([]);
  const [revoking,     setRevoking]     = createSignal<string | null>(null);

  createEffect(() => {
    inviteApi.listInvites(workspaceId)
      .then(items => setInvites(items.filter(i => i.status === 'pending')))
      .catch(() => {});
  });

  function toggleTeam(id: string) {
    setSelectedTeams(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id],
    );
  }

  async function handleInvite(e: Event) {
    e.preventDefault();
    const em = email().trim();
    if (!em) { setError('Email is required'); return; }
    setError(null);
    setInviting(true);
    try {
      const invite = await inviteApi.createInvite({
        workspaceId,
        email: em,
        role: role(),
        teamIds: selectedTeams(),
      });
      setInvites(prev => [...prev, invite]);
      setEmail('');
      setSelectedTeams([]);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setInviting(false);
    }
  }

  async function handleRevoke(inviteId: string) {
    setRevoking(inviteId);
    try {
      await inviteApi.revokeInvite(inviteId);
      setInvites(prev => prev.filter(i => i.id !== inviteId));
    } finally {
      setRevoking(null);
    }
  }

  return (
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">Invite Member</h2>
          <button class="text-gray-400 hover:text-gray-600 transition-colors" onClick={onClose}>✕</button>
        </div>

        <div class="p-6 space-y-5">
          {/* Invite form */}
          <form onSubmit={handleInvite} class="space-y-4">
            {() => error() && (
              <div class="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">⚠ {error()}</div>
            )}
            {() => done() && (
              <div class="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">✓ Invite sent!</div>
            )}

            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Email *</label>
              <input
                type="email"
                value={email()}
                onInput={(e: InputEvent) => setEmail((e.target as HTMLInputElement).value)}
                placeholder="colleague@company.com"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Role</label>
              <select
                value={role()}
                onChange={(e: Event) => setRole((e.target as HTMLSelectElement).value as WorkspaceRole)}
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                    {r === 'admin' ? ' — manage members & access' :
                     r === 'editor' ? ' — create & edit content' :
                     r === 'viewer' ? ' — read-only access' :
                     ' — only explicitly allowed resources'}
                  </option>
                ))}
              </select>
            </div>

            {() => teamStore.teams().length > 0 && (
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Teams (optional)</label>
                <div class="flex flex-wrap gap-2">
                  {teamStore.teams().map(team => {
                    const selected = selectedTeams().includes(team.id);
                    return (
                      <button
                        key={team.id}
                        type="button"
                        class={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-all ${selected ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        onClick={() => toggleTeam(team.id)}
                      >
                        {team.icon && <span>{team.icon}</span>}
                        {team.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="submit"
              class="w-full py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg transition-colors"
              disabled={inviting()}
            >
              {() => inviting() ? 'Sending…' : 'Send Invite'}
            </button>
          </form>

          {/* Pending invites */}
          {() => invites().length > 0 && (
            <div class="border-t border-gray-200 pt-5">
              <h3 class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Pending Invites</h3>
              <div class="space-y-2">
                {invites().map(invite => (
                  <div key={invite.id} class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div class="flex-1 min-w-0">
                      <p class="text-sm text-gray-900 truncate">{invite.email}</p>
                      <div class="flex items-center gap-1.5 mt-0.5">
                        <RoleBadge role={invite.role} />
                      </div>
                    </div>
                    <button
                      class="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
                      disabled={revoking() === invite.id}
                      onClick={() => handleRevoke(invite.id)}
                    >
                      {() => revoking() === invite.id ? '…' : 'Revoke'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
