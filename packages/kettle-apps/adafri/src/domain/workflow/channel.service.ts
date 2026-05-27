import { createMemo, batch } from '@awc/kettlejs';
// import { createCachedResource as createResource } from '@awc/reactive';
import { createResource } from '@awc/reactive';
import { channelApi } from '../../infrastructure/api/channel.api.js';
import { channelStore } from './channel.store.js';
import type {
  CreateChannelInput,
  PostMessageInput,
  WorkflowChannel,
  WorkflowChannelMessage,
} from './channel.model.js';
import type { ChannelActions, MessageActions } from './service.context.js';
import { deepEqual } from '@awc/utils/compare';

// ── Resource factory ───────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 50;

/**
 * createChannelResources — call once per workspace layout mount.
 *
 * Returns Suspense-compatible resources that auto-sync to channelStore.
 * The messageMap resource loads all channels in a single reactive sweep so
 * both the dashboard (aggregate) and channel pages (filtered) share the same
 * data without duplicate requests.
 */
export function createChannelResources(workspaceId: () => string) {
  const [channels, { refetch: refetchChannels }] = createResource(
    workspaceId,
    (id) => channelApi.listChannels(id)
  );

  // Derive channel IDs. Include workspaceId so messageMap refetches when the
  // workspace changes even before the new channels finish loading.
  const messageSource = createMemo(() => {
    const wsId  = workspaceId();
    const ids   = channels.latest?.map(c => c.id);
    return ids?.length ? { wsId, ids } : null;
  }, undefined, {equals: (a: any,b: any)=>deepEqual(a,b)});

  const [messageMap, { refetch: refetchAllMessages }] = createResource(
    messageSource,
    async ({ ids }): Promise<Record<string, WorkflowChannelMessage[]>> => {
      channelStore.setMsgLoading(true)
      console.log('refetching messages', ids)
      const results = await Promise.all(
        ids.map(id => channelApi.listMessages(id, { limit: DEFAULT_PAGE_SIZE })),
      );
      channelStore.setMsgLoading(false)
      return Object.fromEntries(ids.map((id, i) => [id, results[i]]));
    },
  );

  return { channels, refetchChannels, messageMap, refetchAllMessages };
}

// ── Channel mutations ──────────────────────────────────────────────────────────

export function createChannelActions(refetchChannels: () => void): ChannelActions {
  return {
    async create(input: CreateChannelInput): Promise<WorkflowChannel> {
      const ch = await channelApi.createChannel(input);
      channelStore.upsertChannel(ch);
      return ch;
    },

    async delete(id: string): Promise<void> {
      await channelApi.deleteChannel(id);
      channelStore.removeChannel(id);
    },

    async updateAccess(id: string, teamIds: string[], memberUids: string[]): Promise<WorkflowChannel> {
      const ch = await channelApi.updateAccess(id, teamIds, memberUids);
      channelStore.upsertChannel(ch);
      return ch;
    },

    refetch: refetchChannels,
  };
}

// ── Message mutations ──────────────────────────────────────────────────────────

export function createMessageActions(): MessageActions {
  return {
    async post(channelId: string, input: PostMessageInput): Promise<WorkflowChannelMessage> {
      const msg = await channelApi.postMessage(channelId, input);
      channelStore.upsertMessage(msg);
      return msg;
    },

    async edit(channelId: string, msgId: string, content: string): Promise<WorkflowChannelMessage> {
      const msg = await channelApi.editMessage(channelId, msgId, content);
      channelStore.upsertMessage(msg);
      return msg;
    },

    async remove(channelId: string, msgId: string): Promise<void> {
      await channelApi.deleteMessage(channelId, msgId);
      channelStore.removeMessage(channelId, msgId);
    },

    async react(channelId: string, msgId: string, emoji: string): Promise<WorkflowChannelMessage> {
      const msg = await channelApi.reactToMessage(channelId, msgId, emoji);
      channelStore.upsertMessage(msg);
      return msg;
    },

    async loadMore(channelId: string): Promise<void> {
      const { cursor, hasMore } = channelStore.messagePagination(channelId);
      if (!hasMore || !cursor) return;
      const items = await channelApi.listMessages(channelId, {
        before: cursor,
        limit:  DEFAULT_PAGE_SIZE,
      });
      batch(() => {
        channelStore.prependMessages(channelId, items);
        channelStore.setMessagePagination(channelId, {
          cursor:  items[0]?.id,
          hasMore: items.length >= DEFAULT_PAGE_SIZE,
        });
      });
    },

    async pollNewer(channelId: string): Promise<void> {
      const msgs  = channelStore.messages()[channelId] ?? [];
      const since = msgs.length ? msgs[msgs.length - 1].createdAt : undefined;
      const items = await channelApi.listMessages(
        channelId,
        since ? { since } : { limit: DEFAULT_PAGE_SIZE },
      );
      if (items.length) channelStore.appendMessages(channelId, items);
    },
  };
}

// ── Singleton mutation objects (for direct import in non-context components) ────

/** Ready-to-use channel mutations. Refetch callback is a no-op — call
 *  channelActions.refetch() via context when you need a reactive reload. */
export const channelMutations = createChannelActions(() => {});

/** Ready-to-use message mutations. */
export const messageMutations = createMessageActions();

// ── Thread service ─────────────────────────────────────────────────────────────

export const threadService = {
  async open(channelId: string, parentId: string): Promise<WorkflowChannelMessage[]> {
    channelStore.setThreadParentId(parentId);
    const items = await channelApi.listThread(channelId, parentId);
    batch(() => {
      channelStore.loadThreadMessages(items);
    });
    return items;
  },

  close(): void {
    batch(() => {
      channelStore.setThreadParentId(null);
      channelStore.loadThreadMessages([]);
    });
  },
} as const;

// ── Legacy compatibility ───────────────────────────────────────────────────────
// Kept so existing import sites compile without changes while being migrated.

/** @deprecated Inject messageActions from WorkspaceServiceContext instead. */
// export const messageService = {
//   list:          (channelId: string, opts?: { since?: string; limit?: number; silent?: boolean }) =>
//     channelApi.listMessages(channelId, opts),
//   post:          (channelId: string, input: PostMessageInput) =>
//     createMessageActions().post(channelId, input),
//   edit:          (channelId: string, msgId: string, content: string) =>
//     createMessageActions().edit(channelId, msgId, content),
//   delete:        (channelId: string, msgId: string) =>
//     createMessageActions().remove(channelId, msgId),
//   react:         (channelId: string, msgId: string, emoji: string) =>
//     createMessageActions().react(channelId, msgId, emoji),
//   loadMore:      (channelId: string) => createMessageActions().loadMore(channelId),
//   loadAllChannels: async (channelIds: string[], limit = DEFAULT_PAGE_SIZE) => {
//     await Promise.all(channelIds.map(id =>
//       channelApi.listMessages(id, { limit, }).then(items => {
//         if (items.length) channelStore.appendMessages(id, items);
//       }),
//     ));
//   },
// } as const;

// /** @deprecated Inject channelActions from WorkspaceServiceContext instead. */
// export const channelService = {
//   list:   (workspaceId: string) => channelApi.listChannels(workspaceId),
//   create: (input: CreateChannelInput)  => createChannelActions(() => {}).create(input),
//   delete: (channelId: string)          => createChannelActions(() => {}).delete(channelId),
// } as const;
