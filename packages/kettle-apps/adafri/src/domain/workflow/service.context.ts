import { createContext, createProvider, useContext } from '@awc/kettlejs';
import type { Resource } from '@awc/reactive';
import type {
  WorkflowChannel,
  WorkflowChannelMessage,
  CreateChannelInput,
  PostMessageInput,
} from './channel.model.js';
import type {
  WorkflowWorkspace,
  WorkflowScenario,
  WorkflowCreative,
  WorkspaceAnalytics,
  UpdateWorkspaceInput,
  CreateScenarioInput,
  UpdateScenarioInput,
  CreateCreativeInput,
  UpdateCreativeInput,
  CreateWorkspaceInput,
} from './workflow.model.js';
import type { WorkflowMember } from './member.model.js';
import type { WorkflowDocument, CreateDocInput, UpdateDocInput } from './document.model.js';
import type { WorkflowTeam, CreateTeamInput, UpdateTeamInput } from './team.model.js';
import type { channelStore } from './channel.store.js';
import type { workflowStore } from './workflow.store.js';
import type { documentStore } from './document.store.js';
import type { teamStore } from './team.store.js';
import type { threadService } from './channel.service.js';

// ── Mutation action interfaces ─────────────────────────────────────────────────

export interface WorkspaceActions {
  list(accountId: string): Promise<WorkflowWorkspace[]>;
  create(id: string, value: CreateWorkspaceInput): Promise<WorkflowWorkspace>;
  update(id: string, input: UpdateWorkspaceInput): Promise<WorkflowWorkspace>;
  updateStatus(id: string, status: string): Promise<WorkflowWorkspace>;
  delete(id: string): Promise<void>;
  refetch(): void;
}

export interface ChannelActions {
  create(input: CreateChannelInput): Promise<WorkflowChannel>;
  delete(id: string): Promise<void>;
  updateAccess(id: string, teamIds: string[], memberUids: string[]): Promise<WorkflowChannel>;
  refetch(): void;
}

export interface MessageActions {
  post(channelId: string, input: PostMessageInput): Promise<WorkflowChannelMessage>;
  edit(channelId: string, msgId: string, content: string): Promise<WorkflowChannelMessage>;
  remove(channelId: string, msgId: string): Promise<void>;
  react(channelId: string, msgId: string, emoji: string): Promise<WorkflowChannelMessage>;
  /** Load the previous page (older messages) for an open channel. */
  loadMore(channelId: string): Promise<void>;
  /**
   * Silently poll for messages newer than the latest known one.
   * Safe to call on channel-view mount — no-ops if nothing new.
   */
  pollNewer(channelId: string): Promise<void>;
}

export interface ScenarioActions {
  create(input: CreateScenarioInput): Promise<WorkflowScenario>;
  update(id: string, input: UpdateScenarioInput): Promise<WorkflowScenario>;
  select(id: string): Promise<WorkflowScenario>;
  delete(id: string): Promise<void>;
  refetch(): void;
}

export interface CreativeActions {
  create(input: CreateCreativeInput): Promise<WorkflowCreative>;
  update(id: string, input: UpdateCreativeInput): Promise<WorkflowCreative>;
  review(id: string, status: 'approved' | 'rejected', feedback?: string): Promise<WorkflowCreative>;
  delete(id: string): Promise<void>;
  refetch(): void;
}

export interface DocumentActions {
  create(input: CreateDocInput): Promise<WorkflowDocument>;
  update(id: string, input: UpdateDocInput): Promise<WorkflowDocument>;
  delete(id: string): Promise<void>;
  refetch(): void;
}

export interface TeamActions {
  create(input: CreateTeamInput): Promise<WorkflowTeam>;
  update(id: string, input: UpdateTeamInput): Promise<WorkflowTeam>;
  delete(id: string): Promise<void>;
  addMember(teamId: string, uid: string): Promise<void>;
  removeMember(teamId: string, uid: string): Promise<void>;
  refetch(): void;
}

// ── Service context value ──────────────────────────────────────────────────────

export interface WorkspaceServiceValue {
  /**
   * All reactive data resources (Suspense-compatible).
   * Use .latest outside Suspense to get last known value without throwing.
   */
  workspace:  Resource<WorkflowWorkspace>;
  members:    Resource<WorkflowMember[]>;
  channels:   Resource<WorkflowChannel[]>;
  scenarios:  Resource<WorkflowScenario[]>;
  creatives:  Resource<WorkflowCreative[]>;
  analytics:  Resource<WorkspaceAnalytics>;
  documents:  Resource<WorkflowDocument[]>;
  teams:      Resource<WorkflowTeam[]>;
  messageMap: Resource<Record<string, WorkflowChannelMessage[]>>;

  /**
   * Reactive stores — preferred way to read live state in components.
   * Use these instead of importing stores directly so all reads go through
   * a single source of truth and stay in sync with WebSocket updates.
   *
   *   const { channelStore, workflowStore } = useWorkspaceService()!;
   *   const msgs = channelStore.activeChannelMessages();  // reactive
   */
  channelStore:  typeof channelStore;
  workflowStore: typeof workflowStore;
  documentStore: typeof documentStore;
  teamStore:     typeof teamStore;

  /**
   * Thread panel service — open/close message threads.
   *   service.threadService.open(channelId, parentMsgId)
   *   service.threadService.close()
   */
  threadService: typeof threadService;

  // ── Mutation namespaces ────────────────────────────────────────────────────
  workspaceActions: WorkspaceActions;
  channelActions:   ChannelActions;
  messageActions:   MessageActions;
  scenarioActions:  ScenarioActions;
  creativeActions:  CreativeActions;
  documentActions:  DocumentActions;
  teamActions:      TeamActions;
}

// ── Context ────────────────────────────────────────────────────────────────────

export const WorkspaceServiceContext = createContext<WorkspaceServiceValue>();

export function WorkspaceServiceProvider({ value, children, debug }: { children?: any, value: WorkspaceServiceValue, debug?: boolean }) {
  return createProvider({ context: WorkspaceServiceContext, value, children, debug });
}
export function useWorkspaceService(): WorkspaceServiceValue | null {
  return useContext(WorkspaceServiceContext) ?? null;
}
