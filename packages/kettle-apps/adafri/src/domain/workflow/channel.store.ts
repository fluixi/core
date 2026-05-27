import { createStore, createMemo, batch } from '@awc/kettlejs';
import type { WorkflowChannel, WorkflowChannelMessage } from './channel.model.js';

// ── Single flat store ──────────────────────────────────────────────────────────

const [state, setState] = createStore({
  channels:          [] as WorkflowChannel[],
  activeChannelId:   null as string | null,
  messages:          {} as Record<string, WorkflowChannelMessage[]>,
  messagePagination: {} as Record<string, { cursor?: string; hasMore: boolean }>,
  threadParentId:    null as string | null,
  threadMessages:    [] as WorkflowChannelMessage[],
  chLoading:         false,
  msgLoading:        false,
});

// ── Composed store ─────────────────────────────────────────────────────────────

export const channelStore = {
  // ── raw accessors ──────────────────────────────────────────────────────────
  channels:        () => state.channels || [],
  activeChannelId: () => state.activeChannelId,
  messages:        () => state.messages,
  threadParentId:  () => state.threadParentId,
  threadMessages:  () => state.threadMessages,
  chLoading:       () => state.chLoading,
  msgLoading:      () => state.msgLoading,
  messagePagination: (channelId: string) =>
    state.messagePagination[channelId] ?? { hasMore: false },

  // ── derived memos ──────────────────────────────────────────────────────────
  activeChannel: createMemo(() => {
    const id = state.activeChannelId;
    return id ? state.channels.find(c => c.id === id) ?? null : null;
  }),

  activeChannelMessages: createMemo(() => {
    const id = state.activeChannelId;
    return id ? state.messages[id] ?? [] : [];
  }),

  /** All messages across every channel, sorted newest-first. */
  allRecentMessages: createMemo(() => {
    const msgs = state.messages;
    const all: WorkflowChannelMessage[] = [];
    for (const channelId in msgs) {
      const channelMsgs = msgs[channelId];
      if (channelMsgs) all.push(...channelMsgs);
    }
    return all.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }),

  $messages: createMemo(() =>
    state.messages
  ),
  $channels: createMemo(() =>
    state.channels
  ),
  topLevelMessages: createMemo(() => {
    const id = state.activeChannelId;
    if (!id) return [];
    return (state.messages[id] ?? []).filter(
      m => m.threadParentId === null || m.threadParentId === undefined,
    );
  }),

  // ── channel mutations ──────────────────────────────────────────────────────
  loadChannels(items: WorkflowChannel[]) {
    if (!items || !items.length) return;
    setState('channels', items);
  },
  setChLoading(v: boolean)              { setState('chLoading', v); },
  setActiveChannelId(id: string | null) { setState('activeChannelId', id); },

  upsertChannel(ch: WorkflowChannel) {
    setState('channels', prev => {
      const idx = prev.findIndex(c => c.id === ch.id);
      return idx >= 0 ? prev.map((c, i) => (i === idx ? ch : c)) : [...prev, ch];
    });
  },

  removeChannel(id: string) {
    batch(() => {
      setState('channels', prev => prev.filter(c => c.id !== id));
      if (state.activeChannelId === id) setState('activeChannelId', null);
    });
  },

  // ── message mutations ──────────────────────────────────────────────────────
  loadMessages(id: string, items: WorkflowChannelMessage[]) {
    setState('messages', prev => ({ ...prev, [id]: items }));
  },
  setMsgLoading(v: boolean) { setState('msgLoading', v); },

  appendMessages(id: string, items: WorkflowChannelMessage[]) {
    if (!items.length) return;
    setState('messages', (prev) => {
      const existing = new Set((prev[id] || []).map(m => m.id));
      const fresh = items.filter(m => !existing.has(m.id));
      return fresh.length ? { ...prev, [id]: [...(prev[id] ?? []), ...fresh] } : prev;
    });
  },

  /** Prepend older messages (loaded via "before" cursor) at the start of the list. */
  prependMessages(id: string, items: WorkflowChannelMessage[]) {
    if (!items.length) return;
    setState('messages', (prev) => {
      const existing = new Set((prev[id] || []).map(m => m.id));
      const fresh = items.filter(m => !existing.has(m.id));
      return fresh.length ? { ...prev, [id]: [...fresh, ...(prev[id] ?? [])] } : prev;
    });
  },

  setMessagePagination(channelId: string, page: { cursor?: string; hasMore: boolean }) {
    setState('messagePagination', prev => ({ ...prev, [channelId]: page }));
  },

  upsertMessage(msg: WorkflowChannelMessage) {
    const cid = msg.channelId;
    setState('messages', prev => {
      const existing = prev[cid] ?? [];
      const idx = existing.findIndex(m => m.id === msg.id);
      return {
        ...prev,
        [cid]: idx >= 0
          ? existing.map((m, i) => (i === idx ? msg : m))
          : [...existing, msg],
      };
    });
  },

  removeMessage(channelId: string, id: string) {
    setState('messages', prev => ({
      ...prev,
      [channelId]: (prev[channelId] ?? []).filter(m => m.id !== id),
    }));
  },

  // ── thread mutations ───────────────────────────────────────────────────────
  setThreadParentId(id: string | null)               { setState('threadParentId', id); },
  loadThreadMessages(items: WorkflowChannelMessage[]) { setState('threadMessages', items); },

  appendThreadMessage(msg: WorkflowChannelMessage) {
    setState('threadMessages', prev =>
      prev.find(m => m.id === msg.id) ? prev : [...prev, msg],
    );
  },

  // ── reset ──────────────────────────────────────────────────────────────────
  clearChannel() {
    batch(() => {
      setState({
        messages:        {},
        threadParentId:  null,
        threadMessages:  [],
        activeChannelId: null,
      });
    });
  },
} as const;
