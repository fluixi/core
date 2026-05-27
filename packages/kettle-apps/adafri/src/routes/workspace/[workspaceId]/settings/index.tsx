import { createSignal, createEffect, createMemo } from '@awc/kettlejs';
import { useParams, useNavigate } from '@awc/kettlejs/router';
import { workflowStore } from '../../../../domain/workflow/workflow.store.js';
import { workspaceService } from '../../../../domain/workflow/workflow.service.js';
import { workflowApi } from '../../../../infrastructure/api/workflow.api.js';
import { ROUTES } from '../../../../config/constants.js';
import type { WorkflowMember } from '../../../../domain/workflow/member.model.js';

export default function WorkspaceSettingsPage() {
  const params   = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();

  // ── General form ──────────────────────────────────────────────────────────
  const [formName,    setFormName]    = createSignal('');
  const [formDesc,    setFormDesc]    = createSignal('');
  const [formDueDate, setFormDueDate] = createSignal('');
  const [formTags,    setFormTags]    = createSignal('');
  const [saving,      setSaving]      = createSignal(false);
  const [saveMsg,     setSaveMsg]     = createSignal<'idle' | 'saving' | 'saved'>('idle');

  // ── Admin management ──────────────────────────────────────────────────────
  const [adminPickerOpen, setAdminPickerOpen] = createSignal(false);
  const [adminBusy,       setAdminBusy]       = createSignal<string | null>(null);

  // ── Danger zone ───────────────────────────────────────────────────────────
  const [transferPickerOpen, setTransferPickerOpen] = createSignal(false);
  const [transferTarget,     setTransferTarget]     = createSignal<WorkflowMember | null>(null);
  const [transferBusy,       setTransferBusy]       = createSignal(false);
  const [deleteConfirm,      setDeleteConfirm]      = createSignal('');
  const [deleting,           setDeleting]           = createSignal(false);

  // ── Derived ───────────────────────────────────────────────────────────────
  const wsId      = createMemo(() => params().workspaceId);
  const isOwner   = createMemo(() => workflowStore.isOwner?.() ?? false);
  const isAdmin   = createMemo(() => workflowStore.isAdmin?.() ?? false);
  const ws        = createMemo(() => workflowStore.activeWorkspace());
  const members   = createMemo(() => workflowStore.members());

  const adminMembers = createMemo(() =>
    members().filter(m => m.role === 'admin' || m.role === 'owner'),
  );

  const nonAdminMembers = createMemo(() =>
    members().filter(m => m.role !== 'admin' && m.role !== 'owner' && m.status === 'active'),
  );

  const transferCandidates = createMemo(() =>
    members().filter(m => m.role !== 'owner' && m.status === 'active'),
  );

  // ── Sync form from store ──────────────────────────────────────────────────
  createEffect(() => {
    const w = ws();
    if (!w) return;
    setFormName(w.name);
    setFormDesc(w.description);
    setFormDueDate(w.dueDate ?? '');
    setFormTags(w.tags.join(', '));
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleSave(e: Event) {
    e.preventDefault();
    const name = formName().trim();
    if (!name) return;
    setSaving(true);
    setSaveMsg('saving');
    try {
      await workspaceService.update(wsId(), {
        name,
        description: formDesc(),
        dueDate:     formDueDate() || null,
        tags:        formTags().split(',').map(t => t.trim()).filter(Boolean),
      });
      setSaveMsg('saved');
      setTimeout(() => setSaveMsg('idle'), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddAdmin(member: WorkflowMember) {
    setAdminBusy(member.uid);
    setAdminPickerOpen(false);
    try {
      await workflowApi.addAdmin(wsId(), member.uid);
      // Optimistic: update store member role to admin
      workflowStore.setMembers(
        members().map(m => m.uid === member.uid ? { ...m, role: 'admin' } : m),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setAdminBusy(null);
    }
  }

  async function handleRemoveAdmin(member: WorkflowMember) {
    if (member.role === 'owner') return;
    setAdminBusy(member.uid);
    try {
      await workflowApi.removeAdmin(wsId(), member.uid);
      workflowStore.setMembers(
        members().map(m => m.uid === member.uid ? { ...m, role: 'editor' } : m),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setAdminBusy(null);
    }
  }

  async function handleTransferOwnership() {
    const target = transferTarget();
    if (!target) return;
    setTransferBusy(true);
    try {
      await workflowApi.transferOwnership(wsId(), target.uid);
      // Optimistic: flip roles in store
      workflowStore.setMembers(
        members().map(m => {
          if (m.role === 'owner') return { ...m, role: 'admin' };
          if (m.uid === target.uid) return { ...m, role: 'owner' };
          return m;
        }),
      );
      setTransferPickerOpen(false);
      setTransferTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setTransferBusy(false);
    }
  }

  async function handleDelete() {
    if (deleteConfirm().trim().toLowerCase() !== 'delete') return;
    setDeleting(true);
    try {
      await workspaceService.delete(wsId());
      navigate(ROUTES.campaigns);
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div class="flex-1 overflow-y-auto bg-gray-50">
      <div class="max-w-2xl mx-auto px-8 py-8">

        {/* Header */}
        <div class="mb-8">
          <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Workspace Settings</h1>
          <p class="text-sm text-gray-500 mt-0.5">Manage workspace details and preferences</p>
        </div>

        {/* ── General ──────────────────────────────────────────────────── */}
        <div class="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6">
          <h2 class="text-sm font-semibold text-gray-900 mb-6">General</h2>
          <form onSubmit={handleSave} class="space-y-5">

            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                Workspace Name *
              </label>
              <input
                type="text"
                value={formName()}
                onInput={(e: InputEvent) => setFormName((e.target as HTMLInputElement).value)}
                class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                Description
              </label>
              <textarea
                value={formDesc()}
                onInput={(e: InputEvent) => setFormDesc((e.target as HTMLTextAreaElement).value)}
                rows={3}
                placeholder="What is this workspace for?"
                class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder-gray-400"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formDueDate()}
                  onInput={(e: InputEvent) => setFormDueDate((e.target as HTMLInputElement).value)}
                  class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Tags
                </label>
                <input
                  type="text"
                  value={formTags()}
                  onInput={(e: InputEvent) => setFormTags((e.target as HTMLInputElement).value)}
                  placeholder="brand, awareness, q4"
                  class="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
                />
                <p class="text-xs text-gray-400 mt-1">Comma-separated</p>
              </div>
            </div>

            <div class="flex items-center justify-between pt-4 border-t border-gray-100">
              <div class="h-5">
                {() => saveMsg() === 'saving'
                  ? <span class="text-sm text-gray-400">Saving…</span>
                  : saveMsg() === 'saved'
                  ? <span class="text-sm text-green-600 font-medium">✓ Changes saved</span>
                  : null
                }
              </div>
              <button
                type="submit"
                class="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg transition-colors"
                disabled={saving()}
              >
                {() => saving() ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Admin Management (owner only) ─────────────────────────── */}
        {() => isOwner() && (
          <div class="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mb-6">
            <div class="flex items-center justify-between mb-5">
              <div>
                <h2 class="text-sm font-semibold text-gray-900">Admin Management</h2>
                <p class="text-xs text-gray-500 mt-0.5">Admins can manage members, channels, and workspace settings</p>
              </div>
              <div class="relative">
                <button
                  class="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  onClick={() => setAdminPickerOpen(v => !v)}
                  disabled={nonAdminMembers().length === 0}
                >
                  + Add Admin
                </button>
                {() => adminPickerOpen() && nonAdminMembers().length > 0 && (
                  <div class="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                    {nonAdminMembers().map(m => (
                      <button
                        key={m.uid}
                        class="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                        onClick={() => handleAddAdmin(m)}
                      >
                        <div class="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(m.displayName ?? m.email ?? '?')[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div class="min-w-0">
                          <p class="text-sm font-medium text-gray-900 truncate">{m.displayName}</p>
                          <p class="text-xs text-gray-400 truncate">{m.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {() => adminMembers().length === 0
              ? (
                <p class="text-sm text-gray-400 py-2">No admins yet — only you as owner.</p>
              )
              : (
                <ul class="space-y-2">
                  {adminMembers().map(m => (
                    <li key={m.uid} class="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                      <div class={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${m.role === 'owner' ? 'bg-purple-500' : 'bg-indigo-500'}`}>
                        {(m.displayName ?? m.email ?? '?')[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 truncate">{m.displayName}</p>
                        <p class="text-xs text-gray-400 truncate">{m.email}</p>
                      </div>
                      <span class={`text-xs px-2 py-0.5 rounded-full font-medium ${m.role === 'owner' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {m.role}
                      </span>
                      {() => m.role !== 'owner' && (
                        <button
                          class="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Remove admin"
                          disabled={adminBusy() === m.uid}
                          onClick={() => handleRemoveAdmin(m)}
                        >
                          {() => adminBusy() === m.uid ? '…' : '✕'}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )
            }
          </div>
        )}

        {/* ── Danger Zone ───────────────────────────────────────────── */}
        <div class="bg-white border border-red-200 rounded-xl shadow-sm p-6">
          <h2 class="text-sm font-semibold text-red-600 mb-1">Danger Zone</h2>
          <p class="text-xs text-gray-500 mb-5 leading-relaxed">
            Irreversible actions that affect this workspace and all its members.
          </p>

          <div class="space-y-5">
            {/* Transfer Ownership */}
            {() => isOwner() && (
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <p class="text-sm font-medium text-gray-900">Transfer Ownership</p>
                    <p class="text-xs text-gray-500 mt-0.5">
                      Pass the owner role to another member. You will become an admin.
                    </p>
                  </div>
                  <button
                    class="flex-shrink-0 px-3 py-1.5 text-xs font-medium border border-orange-300 hover:bg-orange-50 text-orange-600 rounded-lg transition-colors"
                    onClick={() => setTransferPickerOpen(v => !v)}
                  >
                    Transfer
                  </button>
                </div>

                {() => transferPickerOpen() && (
                  <div class="mt-4 border-t border-gray-100 pt-4">
                    <p class="text-xs font-semibold text-gray-600 mb-2">Select new owner:</p>
                    <div class="space-y-1 max-h-48 overflow-y-auto mb-3">
                      {transferCandidates().length === 0
                        ? <p class="text-xs text-gray-400 py-2">No other active members.</p>
                        : transferCandidates().map(m => (
                          <button
                            key={m.uid}
                            class={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${transferTarget()?.uid === m.uid ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50'}`}
                            onClick={() => setTransferTarget(prev => prev?.uid === m.uid ? null : m)}
                          >
                            <div class="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {(m.displayName ?? m.email ?? '?')[0]?.toUpperCase() ?? '?'}
                            </div>
                            <div class="min-w-0 flex-1">
                              <p class="font-medium text-gray-900 truncate">{m.displayName}</p>
                              <p class="text-xs text-gray-400 truncate">{m.email}</p>
                            </div>
                            {transferTarget()?.uid === m.uid && (
                              <span class="text-orange-500 font-medium">✓</span>
                            )}
                          </button>
                        ))
                      }
                    </div>
                    <div class="flex gap-2">
                      <button
                        class="flex-1 py-1.5 text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
                        disabled={!transferTarget() || transferBusy()}
                        onClick={handleTransferOwnership}
                      >
                        {() => transferBusy() ? 'Transferring…' : `Confirm Transfer${transferTarget() ? ` to ${transferTarget()!.displayName}` : ''}`}
                      </button>
                      <button
                        class="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                        onClick={() => { setTransferPickerOpen(false); setTransferTarget(null); }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Delete Workspace */}
            {() => isOwner() && (
              <div class="border border-red-200 rounded-lg p-4">
                <div class="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p class="text-sm font-medium text-gray-900">Delete Workspace</p>
                    <p class="text-xs text-gray-500 mt-0.5">
                      Permanently delete this workspace. All scenarios, channels, documents, and
                      messages will be removed and cannot be recovered.
                    </p>
                  </div>
                </div>
                <div class="space-y-2">
                  <p class="text-xs text-gray-600">
                    Type <span class="font-mono font-semibold text-red-600">delete</span> to confirm:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirm()}
                    onInput={(e: InputEvent) => setDeleteConfirm((e.target as HTMLInputElement).value)}
                    placeholder="delete"
                    class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-300"
                  />
                  <button
                    class="w-full py-2 text-sm font-medium border border-red-400 hover:bg-red-50 text-red-600 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={deleteConfirm().trim().toLowerCase() !== 'delete' || deleting()}
                    onClick={handleDelete}
                  >
                    {() => deleting() ? 'Deleting…' : 'Delete Workspace'}
                  </button>
                </div>
              </div>
            )}

            {/* Non-owner fallback */}
            {() => !isOwner() && isAdmin() && (
              <p class="text-xs text-gray-400 text-center py-2">
                Only the workspace owner can transfer ownership or delete the workspace.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
