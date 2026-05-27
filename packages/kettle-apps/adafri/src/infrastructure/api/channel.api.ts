import { apiClient } from './client.js';
import type {
  WorkflowChannel,
  WorkflowChannelMessage,
  CreateChannelInput,
  PostMessageInput,
} from '../../domain/workflow/channel.model.js';

export const channelApi = {
  // ── Channels ──────────────────────────────────────────────────────────────────

  listChannels(workspaceId: string) {
    return apiClient.get<WorkflowChannel[]>(`/workflow/channels/list/${workspaceId}`);
  },

  getChannel(channelId: string) {
    return apiClient.get<WorkflowChannel>(`/workflow/channels/${channelId}`);
  },

  createChannel(input: CreateChannelInput) {
    return apiClient.post<WorkflowChannel>('/workflow/channels/create', { data: input });
  },

  updateChannel(channelId: string, data: Partial<CreateChannelInput>) {
    return apiClient.put<WorkflowChannel>(`/workflow/channels/${channelId}`, { data });
  },

  deleteChannel(channelId: string) {
    return apiClient.delete(`/workflow/channels/${channelId}`);
  },

  updateAccess(channelId: string, allowedTeamIds: string[], allowedMemberUids: string[]) {
    return apiClient.put<WorkflowChannel>(`/workflow/channels/${channelId}/access`, {
      allowedTeamIds,
      allowedMemberUids,
    });
  },

  // ── Messages ──────────────────────────────────────────────────────────────────

  listMessages(channelId: string, params?: { since?: string; before?: string; limit?: number }) {
    return apiClient.get<WorkflowChannelMessage[]>(
      `/workflow/channels/${channelId}/messages`,
      params && Object.keys(params).length ? params : undefined,
    );
  },

  postMessage(channelId: string, input: PostMessageInput) {
    return apiClient.post<WorkflowChannelMessage>(
      `/workflow/channels/${channelId}/messages`,
      input,
    );
  },

  editMessage(channelId: string, msgId: string, content: string) {
    return apiClient.put<WorkflowChannelMessage>(
      `/workflow/channels/${channelId}/messages/${msgId}`,
      { content },
    );
  },

  deleteMessage(channelId: string, msgId: string) {
    return apiClient.delete(`/workflow/channels/${channelId}/messages/${msgId}`);
  },

  reactToMessage(channelId: string, msgId: string, emoji: string) {
    return apiClient.post<WorkflowChannelMessage>(
      `/workflow/channels/${channelId}/messages/${msgId}/react`,
      { emoji },
    );
  },

  listThread(channelId: string, parentId: string) {
    return apiClient.get<WorkflowChannelMessage[]>(
      `/workflow/channels/${channelId}/messages/${parentId}/thread`,
    );
  },
} as const;
