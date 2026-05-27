// import { createEffect, createMemo, onCleanup, onMount } from '@awc/kettlejs';
// import { createResource } from '@awc/reactive';
// import {
//   useParams,
//   Outlet,
//   useRouteData,
//   cache,
//   type RouteDataArgs,
// } from '@awc/kettlejs/router';
// import { useAuthGuard, useAccountGuard } from '../../infrastructure/auth/route-guard.js';
// import { WorkspaceServiceContext, type WorkspaceServiceValue, WorkspaceServiceProvider} from '../../domain/workflow/service.context.js';
// import { createChannelResources, createChannelActions, createMessageActions } from '../../domain/workflow/channel.service.js';
// import { createWorkflowResources, createWorkspaceActions, createScenarioActions, createCreativeActions } from '../../domain/workflow/workflow.service.js';
// import { createDocumentResources, createDocumentActions } from '../../domain/workflow/document.service.js';
// import { createTeamResources, createTeamActions } from '../../domain/workflow/team.service.js';
// import { channelStore } from '../../domain/workflow/channel.store.js';
// import { documentStore } from '../../domain/workflow/document.store.js';
// import { teamStore } from '../../domain/workflow/team.store.js';
// import { workflowStore } from '../../domain/workflow/workflow.store.js';
// import { sessionStore } from '../../infrastructure/auth/session.store.js';
// import { WorkspaceSidebar } from '../../shared/components/workspace/WorkspaceSidebar.js';
// import { getWsClient } from '../../infrastructure/ws/ws-client.js';
// import { messagingWs } from '../../infrastructure/ws/messaging.ws.js';
// import { apiClient } from '../../infrastructure/api/client.js';
// import type { WorkflowWorkspace } from '../../domain/workflow/workflow.model.js';
// import type { WorkflowMember } from '../../domain/workflow/member.model.js';

// // ── Deduplicated fetchers ──────────────────────────────────────────────────────
// // Defined at module level so the cache persists across navigations and the same
// // data is never fetched twice for the same key within a session.

// const fetchWorkspace = cache(
//   (id: string): Promise<WorkflowWorkspace> => apiClient.get(`/workflow/workspaces/${id}`),
//   'workspace',
// );

// const fetchMembers = cache(
//   (id: string): Promise<WorkflowMember[]> => apiClient.get(`/workflow/members/list/${id}`),
//   'workspace-members',
// );

// // ── Route data type ────────────────────────────────────────────────────────────

// export type WorkspaceRouteData = ReturnType<typeof routeData>;

// /**
//  * routeData — called once per layout instance by the router.
//  *
//  * Kicks off ALL data fetches in parallel before the layout renders.
//  * Resources are reactive: they re-fetch automatically when workspaceId changes.
//  */
// export const routeDataFn = (args: RouteDataArgs) => {
//   // console.log('on route data', args)
//   const getParams =
//     typeof args.params === 'function'
//       ? (args.params as () => Record<string, string>)
//       : () => args.params as Record<string, string>;

//   const id = createMemo(() => getParams().workspaceId);

//   // Core resources
//   const [workspace, { refetch: refetchWorkspace }] = createResource(id, fetchWorkspace);
//   const [members,   { refetch: refetchMembers   }] = createResource(id, fetchMembers);

//   // Domain-specific resource factories
//   const channelResources  = createChannelResources(id);
//   const workflowResources = createWorkflowResources(id);
//   const docResources      = createDocumentResources(id);
//   const teamResources     = createTeamResources(id);

//   return {
//     id,
//     workspace,  refetchWorkspace,
//     members,    refetchMembers,
//     ...channelResources,
//     ...workflowResources,
//     ...docResources,
//     ...teamResources,
//   };
// };