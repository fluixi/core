import { createResource } from '@awc/reactive';
import { workflowApi } from '../../infrastructure/api/workflow.api.js';
import { workflowStore } from './workflow.store.js';
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  CreateScenarioInput,
  UpdateScenarioInput,
  CreateCreativeInput,
  UpdateCreativeInput,
  WorkflowWorkspace,
  WorkflowScenario,
  WorkflowCreative,
  WorkspaceAnalytics,
} from './workflow.model.js';
import type {
  WorkspaceActions,
  ScenarioActions,
  CreativeActions,
} from './service.context.js';

// ── Resource factories ─────────────────────────────────────────────────────────

/**
 * createWorkflowResources — call once per workspace layout mount.
 *
 * Scenarios, creatives, and analytics are loaded in parallel as soon as the
 * workspaceId is available. All resources auto-sync to workflowStore via the
 * layout's sync effects.
 */
export function createWorkflowResources(workspaceId: () => string) {
  const [workspace,  { refetch: refetchWorkspace  }] = createResource(workspaceId, id => workflowApi.getWorkspace(id));
  const [scenarios,  { refetch: refetchScenarios  }] = createResource(workspaceId, id => workflowApi.listScenarios(id));
  const [creatives,  { refetch: refetchCreatives  }] = createResource(workspaceId, id => workflowApi.listCreatives(id));
  const [analytics,  { refetch: refetchAnalytics  }] = createResource(workspaceId, id => workflowApi.getAnalytics(id));

  return {
    workspace,  refetchWorkspace,
    scenarios,  refetchScenarios,
    creatives,  refetchCreatives,
    analytics,  refetchAnalytics,
  };
}

// ── Workspace mutations ────────────────────────────────────────────────────────

export function createWorkspaceActions(refetch: () => void): WorkspaceActions {
  return {

    async list(accountId: string): Promise<WorkflowWorkspace[]> {
      const ws = await workflowApi.listWorkspaces(accountId);
      workflowStore.loadWorkspaces(ws);
      return ws;
    },
    async create(id: string, value): Promise<WorkflowWorkspace> {
      const ws = await workflowApi.createWorkspace(id, value);
      // workflowStore.loadWorkspaces(ws);
      return ws;
    },
    async update(id: string, input: UpdateWorkspaceInput): Promise<WorkflowWorkspace> {
      const ws = await workflowApi.updateWorkspace(id, input);
      workflowStore.upsertWorkspace(ws);
      return ws;
    },

    async updateStatus(id: string, status: string): Promise<WorkflowWorkspace> {
      const ws = await workflowApi.updateWorkspaceStatus(id, status);
      workflowStore.upsertWorkspace(ws);
      return ws;
    },

    async delete(id: string): Promise<void> {
      await workflowApi.deleteWorkspace(id);
      workflowStore.removeWorkspace(id);
    },

    refetch,
  };
}

// ── Scenario mutations ─────────────────────────────────────────────────────────

export function createScenarioActions(refetch: () => void): ScenarioActions {
  return {
    async create(input: CreateScenarioInput): Promise<WorkflowScenario> {
      const s = await workflowApi.createScenario(input);
      workflowStore.upsertScenario(s);
      return s;
    },

    async update(id: string, input: UpdateScenarioInput): Promise<WorkflowScenario> {
      const s = await workflowApi.updateScenario(id, input);
      workflowStore.upsertScenario(s);
      return s;
    },

    async select(id: string): Promise<WorkflowScenario> {
      const s = await workflowApi.selectScenario(id);
      workflowStore.upsertScenario(s);
      return s;
    },

    async delete(id: string): Promise<void> {
      await workflowApi.deleteScenario(id);
      workflowStore.removeScenario(id);
    },

    refetch,
  };
}

// ── Creative mutations ─────────────────────────────────────────────────────────

export function createCreativeActions(refetch: () => void): CreativeActions {
  return {
    async create(input: CreateCreativeInput): Promise<WorkflowCreative> {
      const c = await workflowApi.createCreative(input);
      workflowStore.upsertCreative(c);
      return c;
    },

    async update(id: string, input: UpdateCreativeInput): Promise<WorkflowCreative> {
      const c = await workflowApi.updateCreative(id, input);
      workflowStore.upsertCreative(c);
      return c;
    },

    async review(id: string, status: 'approved' | 'rejected', feedback?: string): Promise<WorkflowCreative> {
      const c = await workflowApi.reviewCreative(id, status, feedback);
      workflowStore.upsertCreative(c);
      return c;
    },

    async delete(id: string): Promise<void> {
      await workflowApi.deleteCreative(id);
      workflowStore.removeCreative(id);
    },

    refetch,
  };
}

// ── Legacy compatibility ───────────────────────────────────────────────────────
// Kept so existing import sites compile while being migrated to context hooks.

/** @deprecated Inject workspaceActions from WorkspaceServiceContext instead. */
// export const workspaceService = {
//   get:          (id: string)                              => workflowApi.getWorkspace(id),
//   listByCampaign: (accountId: string, campaignId?: string) => workflowApi.listWorkspaces(accountId, campaignId),
//   create:       (accountId: string, input: CreateWorkspaceInput) => workflowApi.createWorkspace(accountId, input).then(ws => { workflowStore.upsertWorkspace(ws); return ws; }),
//   update:       (id: string, input: UpdateWorkspaceInput) => createWorkspaceActions(() => {}).update(id, input),
//   updateStatus: (id: string, status: string)              => createWorkspaceActions(() => {}).updateStatus(id, status),
//   delete:       (id: string)                              => createWorkspaceActions(() => {}).delete(id),
// } as const;

// /** @deprecated Inject scenarioActions from WorkspaceServiceContext instead. */
// export const scenarioService = {
//   list:   (id: string)                          => workflowApi.listScenarios(id),
//   create: (input: CreateScenarioInput)           => createScenarioActions(() => {}).create(input),
//   update: (id: string, input: UpdateScenarioInput) => createScenarioActions(() => {}).update(id, input),
//   select: (id: string)                           => createScenarioActions(() => {}).select(id),
//   delete: (id: string)                           => createScenarioActions(() => {}).delete(id),
// } as const;

// /** @deprecated Inject creativeActions from WorkspaceServiceContext instead. */
// export const creativeService = {
//   list:   (id: string)                              => workflowApi.listCreatives(id),
//   create: (input: CreateCreativeInput)               => createCreativeActions(() => {}).create(input),
//   update: (id: string, input: UpdateCreativeInput)   => createCreativeActions(() => {}).update(id, input),
//   review: (id: string, status: 'approved' | 'rejected', feedback?: string) =>
//     createCreativeActions(() => {}).review(id, status, feedback),
//   delete: (id: string)                               => createCreativeActions(() => {}).delete(id),
// } as const;

// /** @deprecated Use context resource instead. */
// export const analyticsService = {
//   get: (id: string) => workflowApi.getAnalytics(id).then(d => { workflowStore.setAnalytics(d); return d; }),
// } as const;

// /** @deprecated Use context resource instead. */
// export const discussionService = {
//   list: (id: string)                 => workflowApi.listMessages(id).then(items => { workflowStore.loadMessages(items); return items; }),
//   post: (id: string, content: string) => workflowApi.postMessage(id, content).then(msg => { workflowStore.addMessage(msg); return msg; }),
// } as const;
