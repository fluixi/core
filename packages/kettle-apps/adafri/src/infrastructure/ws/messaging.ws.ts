/**
 * MessagingWs — manages the WebSocket subscription for a workspace's channels.
 *
 * Architecture
 * ─────────────
 * The server places every workspace member in a single room per workspace
 * (workspace:<id>).  ALL channel events for that workspace are broadcast to
 * that room, so one connection is enough regardless of how many channels exist.
 *
 * The singleton `messagingWs` is used by the workspace layout:
 *   - layout mounts  → messagingWs.joinWorkspace(workspaceId)
 *   - layout unmounts → messagingWs.leaveWorkspace()
 *
 * Incoming events update the channel store only for the ACTIVE channel to
 * prevent messages from other channels leaking into the current view.
 */

import type { Socket } from 'socket.io-client';
import { channelStore } from '../../domain/workflow/channel.store.js';
import type { WorkflowChannelMessage } from '../../domain/workflow/channel.model.js';

type MessageDeletePayload = { id: string; channelId: string };

class MessagingWs {
  private socket: Socket | null = null;
  private currentWorkspaceId: string | null = null;
  private listening = false;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /**
   * Attach to a (possibly new) socket and bind server→client event handlers.
   * Safe to call multiple times with the same socket — handlers are only
   * registered once.
   */
  attach(socket: Socket): void {
    if (this.socket === socket && this.listening) return;

    // Remove stale listeners from any previous socket.
    if (this.socket && this.socket !== socket) {
      this._unbindSocketEvents(this.socket);
    }

    this.socket = socket;
    this._bindSocketEvents(socket);
  }

  /**
   * Join the server-side room for the given workspace and start receiving
   * real-time channel events.
   */
  joinWorkspace(workspaceId: string): void {
    if (!this.socket) return;
    if (this.currentWorkspaceId === workspaceId) return;

    if (this.currentWorkspaceId) {
      this.socket.emit('leave_workspace', { workspaceId: this.currentWorkspaceId });
    }

    this.socket.emit('join_workspace', { workspaceId });
    this.currentWorkspaceId = workspaceId;
  }

  /**
   * Leave the current workspace room.  Called when the workspace layout is
   * disposed (user navigates away from the workspace entirely).
   */
  leaveWorkspace(): void {
    if (!this.socket || !this.currentWorkspaceId) return;
    this.socket.emit('leave_workspace', { workspaceId: this.currentWorkspaceId });
    this.currentWorkspaceId = null;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _bindSocketEvents(socket: Socket): void {
    if (this.listening) return;
    this.listening = true;

    socket.on('message:new', (msg: WorkflowChannelMessage) => {
      // Update store for ALL channels so unread counts stay accurate.
      // The active channel view tracks activeChannelMessages() reactively.
      channelStore.upsertMessage(msg);
    });

    socket.on('message:edit', (msg: WorkflowChannelMessage) => {
      channelStore.upsertMessage(msg);
    });

    socket.on('message:delete', ({ id, channelId }: MessageDeletePayload) => {
      channelStore.removeMessage(channelId, id);
    });

    socket.on('message:react', (msg: WorkflowChannelMessage) => {
      channelStore.upsertMessage(msg);
    });
  }

  private _unbindSocketEvents(socket: Socket): void {
    socket.off('message:new');
    socket.off('message:edit');
    socket.off('message:delete');
    socket.off('message:react');
    this.listening = false;
  }
}

export const messagingWs = new MessagingWs();
