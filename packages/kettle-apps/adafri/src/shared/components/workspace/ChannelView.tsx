import { createMemo, createSignal, untrack, useEffect } from '@awc/kettlejs';
import { useWorkspaceService } from '../../../domain/workflow/service.context.js';
import { AccessControlPanel } from './AccessControlPanel.jsx';
import { MessageBubble } from './MessageBubble.js';
import { MessageComposer } from './MessageComposer.js';

interface Props {
  channelId: () => string;
}

export function ChannelView({ channelId }: Props): JSX.Element {
  let listEl: HTMLDivElement | undefined;

  const service = useWorkspaceService()!;
  const { channelStore, workflowStore, messageActions, channelActions, threadService } = service;

  const [showSettings,  setShowSettings]  = createSignal(false);
  const [accessSaving,  setAccessSaving]  = createSignal(false);
  const [deleteConfirm, setDeleteConfirm] = createSignal(false);
  const [deleting,      setDeleting]      = createSignal(false);

  const isAdmin  = createMemo(() => workflowStore.isAdmin?.() ?? false);
  const members  = createMemo(() => workflowStore.members());
  const channel  = createMemo(() => channelStore.activeChannel());

  function scrollToBottom() {
    if (listEl) listEl.scrollTop = listEl.scrollHeight;
  }

  let currentChannel: string;

  // ── Channel activation ─────────────────────────────────────────────────────
  // On channel change: set active, then either poll for newer messages (already
  // cached from the bulk layout fetch) or do a lightweight full load if empty.
  useEffect(() => {
    const id = channelId();
    if (!id || currentChannel === id) return;
    currentChannel = id;
    channelStore.setActiveChannelId(id);
    setShowSettings(false);

    // Read without tracking — this effect must not re-run on message appends.
    const existing = untrack(() => channelStore.messages()[id] ?? []);

    if (existing.length > 0) {
      // Already cached from the layout bulk-fetch. Poll for any messages that
      // arrived after the initial load (may be a no-op if nothing new).
      messageActions.pollNewer(id).then(() => setTimeout(scrollToBottom, 50));
    } else {
      // Channel is empty or layout still loading — fetch the first page.
      messageActions.pollNewer(id).then(() => setTimeout(scrollToBottom, 50));
    }
  });

  // Scroll to bottom whenever messages change for the active channel.
  useEffect(() => {
    const msgs = channelStore.activeChannelMessages();
    if (msgs.length) setTimeout(scrollToBottom, 30);
  });

  async function handleSaveAccess(teamIds: string[], memberUids: string[]) {
    const ch = channel();
    if (!ch) return;
    setAccessSaving(true);
    try {
      await channelActions.updateAccess(ch.id, teamIds, memberUids);
    } finally {
      setAccessSaving(false);
    }
  }

  async function handleDeleteChannel() {
    const ch = channel();
    if (!ch || ch.isDefault) return;
    if (!deleteConfirm()) { setDeleteConfirm(true); return; }
    setDeleting(true);
    try {
      await channelActions.delete(ch.id);
      setShowSettings(false);
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  return (
    <div class="flex h-full overflow-hidden bg-surface">

      {/* ── Main panel ─────────────────────────────────────────── */}
      <div class="flex flex-col flex-1 min-w-0">

        {/* Header */}
        <div class="flex items-center gap-3 px-5 py-3 border-b border-subtle bg-surface flex-shrink-0">
          {() => {
            const ch = channel();
            if (!ch) return <div class="h-4 w-28 bg-[var(--color-border)] rounded animate-pulse" />;
            const isPrivate = (ch.allowedTeamIds?.length ?? 0) > 0 || (ch.allowedMemberUids?.length ?? 0) > 0;
            return (
              <div class="flex items-center gap-2.5 flex-1 min-w-0">
                <span class="text-faint font-mono text-base flex-shrink-0">#</span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5">
                    <h2 class="text-subheading text-default">{ch.name}</h2>
                    {isPrivate && <span class="text-faint text-caption" title="Restricted">🔒</span>}
                  </div>
                  {ch.description && (
                    <p class="text-caption text-muted truncate">{ch.description}</p>
                  )}
                </div>
                {isAdmin() && (
                  <button
                    class={`flex-shrink-0 p-1.5 rounded text-caption transition-colors ${showSettings() ? 'bg-[var(--color-border)] text-default' : 'text-faint hover:bg-[var(--color-border)] hover:text-default'}`}
                    title="Channel settings"
                    onClick={() => setShowSettings(v => !v)}
                  >⚙</button>
                )}
              </div>
            );
          }}
        </div>

        {/* Message list */}
        <div
          class="flex-1 overflow-y-auto py-3"
          ref={(el) => { listEl = el; }}
        >
          {() => {
            const loading = channelStore.msgLoading();
            const msgs    = channelStore.topLevelMessages();

            if (loading) {
              return (
                <div class="px-5 space-y-5">
                  {[1, 2, 3].map(i => (
                    <div key={i} class="flex gap-3 animate-pulse">
                      <div class="w-8 h-8 bg-[var(--color-border)] rounded-full flex-shrink-0" />
                      <div class="flex-1 space-y-2 pt-0.5">
                        <div class="h-2.5 w-20 bg-[var(--color-border)] rounded" />
                        <div class="h-2.5 w-3/4 bg-[var(--color-bg)] rounded" />
                        <div class="h-2.5 w-1/2 bg-[var(--color-bg)] rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              );
            }

            if (!msgs.length) {
              return (
                <div class="flex flex-col items-center justify-center h-full text-center px-8">
                  <div class="text-3xl mb-3 opacity-40">#</div>
                  <p class="text-body font-medium text-default">
                    Welcome to #{channel()?.name ?? 'this channel'}
                  </p>
                  <p class="text-caption text-muted mt-1">
                    This is the beginning of the channel. Send the first message!
                  </p>
                </div>
              );
            }

            return msgs.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ));
          }}
        </div>

        {/* Composer */}
        <div class="px-4 pb-4 flex-shrink-0">
          {() => {
            const id = channelId();
            const ch = channel();
            return id
              ? <MessageComposer channelId={id} workspaceId={ch?.workspaceId} placeholder={ch ? `Message #${ch.name}` : 'Write a message…'} />
              : null;
          }}
        </div>
      </div>

      {/* ── Thread panel ───────────────────────────────────────── */}
      {() => {
        const parentId = channelStore.threadParentId();
        if (!parentId) return null;

        const parentMsg = channelStore.topLevelMessages().find(m => m.id === parentId);

        return (
          <div class="w-72 flex-shrink-0 flex flex-col border-l border-subtle bg-surface">
            <div class="flex items-center justify-between px-4 py-3 border-b border-subtle flex-shrink-0">
              <h3 class="text-subheading text-default">Thread</h3>
              <button
                class="p-1 text-faint hover:text-default hover:bg-[var(--color-border)] rounded transition-colors"
                onClick={() => threadService.close()}
                aria-label="Close thread"
              >✕</button>
            </div>

            <div class="flex-1 overflow-y-auto py-3">
              {parentMsg && (
                <>
                  <MessageBubble message={parentMsg} isThreadView />
                  <div class="flex items-center gap-3 px-4 my-3">
                    <div class="flex-1 border-t border-subtle" />
                    <span class="text-caption text-faint flex-shrink-0">
                      {channelStore.threadMessages().length} repl{channelStore.threadMessages().length === 1 ? 'y' : 'ies'}
                    </span>
                    <div class="flex-1 border-t border-subtle" />
                  </div>
                </>
              )}
              {channelStore.threadMessages().map(msg => (
                <MessageBubble key={msg.id} message={msg} isThreadView />
              ))}
            </div>

            <div class="px-3 pb-3 flex-shrink-0">
              {() => {
                const id = channelId();
                return id
                  ? <MessageComposer channelId={id} workspaceId={channel()?.workspaceId} threadParentId={parentId} placeholder="Reply in thread…" />
                  : null;
              }}
            </div>
          </div>
        );
      }}

      {/* ── Channel settings panel ─────────────────────────────── */}
      {() => {
        if (!showSettings()) return null;
        const ch = channel();
        if (!ch) return null;
        const teamIds   = ch.allowedTeamIds   ?? [];
        const memberIds = ch.allowedMemberUids ?? [];
        const isPrivate = teamIds.length > 0 || memberIds.length > 0;

        return (
          <div class="w-72 flex-shrink-0 flex flex-col border-l border-subtle bg-surface">
            <div class="flex items-center justify-between px-4 py-3 border-b border-subtle flex-shrink-0">
              <h3 class="text-subheading text-default">Channel Settings</h3>
              <button
                class="p-1 text-faint hover:text-default hover:bg-[var(--color-border)] rounded transition-colors"
                onClick={() => { setShowSettings(false); setDeleteConfirm(false); }}
              >✕</button>
            </div>

            <div class="flex-1 overflow-y-auto p-4 space-y-5">
              <div>
                <p class="text-label text-muted mb-2">Channel</p>
                <div class="flex items-center gap-2">
                  <span class="text-faint font-mono text-caption">#</span>
                  <span class="text-body font-medium text-default">{ch.name}</span>
                  <span class={`ml-auto text-caption px-1.5 py-0.5 rounded ${isPrivate ? 'bg-[var(--color-warning)]/10 text-warning' : 'bg-[var(--color-success)]/10 text-success'}`}>
                    {isPrivate ? 'Private' : 'Public'}
                  </span>
                </div>
                {ch.description && (
                  <p class="text-caption text-muted mt-1">{ch.description}</p>
                )}
              </div>

              <div>
                <p class="text-label text-muted mb-2">Access Control</p>
                <p class="text-caption text-faint mb-3 leading-relaxed">
                  Restrict who can see this channel. Leave workspace-wide to allow all members.
                </p>
                <AccessControlPanel
                  allowedTeamIds={teamIds}
                  allowedMemberUids={memberIds}
                  members={members()}
                  onSave={handleSaveAccess}
                  saving={accessSaving()}
                />
              </div>

              {!ch.isDefault && (
                <div class="border-t border-subtle pt-4">
                  <p class="text-label text-danger mb-2">Danger Zone</p>
                  <p class="text-caption text-muted mb-3">
                    Permanently delete this channel and all its messages.
                  </p>
                  <div class="flex gap-2">
                    <button
                      class="flex-1 py-1.5 text-caption font-medium border border-[var(--color-danger)]/30 hover:bg-[var(--color-danger)]/5 text-danger rounded transition-colors disabled:opacity-40"
                      disabled={deleting()}
                      onClick={handleDeleteChannel}
                    >
                      {() => deleting() ? 'Deleting…' : deleteConfirm() ? '⚠ Confirm delete' : 'Delete Channel'}
                    </button>
                    {() => deleteConfirm() && !deleting() && (
                      <button
                        class="px-3 py-1.5 text-caption text-muted hover:text-default transition-colors"
                        onClick={() => setDeleteConfirm(false)}
                      >Cancel</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }}

    </div>
  );
}
