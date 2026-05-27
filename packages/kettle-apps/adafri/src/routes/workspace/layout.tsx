import { createEffect, createMemo, onCleanup, onMount, untrack, useEffect } from '@awc/kettlejs';
import { createResource } from '@awc/reactive';
import {
  useParam,
  Outlet,
  useRouteData,
  cache,
  type RouteDataArgs,
  select,
} from '@awc/kettlejs/router';
import { useAuthGuard, useAccountGuard } from '../../infrastructure/auth/route-guard.js';
import { WorkspaceServiceContext, type WorkspaceServiceValue, WorkspaceServiceProvider} from '../../domain/workflow/service.context.js';
import { createChannelResources, createChannelActions, createMessageActions, threadService } from '../../domain/workflow/channel.service.js';
import { createWorkflowResources, createWorkspaceActions, createScenarioActions, createCreativeActions } from '../../domain/workflow/workflow.service.js';
import { createDocumentResources, createDocumentActions } from '../../domain/workflow/document.service.js';
import { createTeamResources, createTeamActions } from '../../domain/workflow/team.service.js';
import { channelStore } from '../../domain/workflow/channel.store.js';
import { documentStore } from '../../domain/workflow/document.store.js';
import { teamStore } from '../../domain/workflow/team.store.js';
import { workflowStore } from '../../domain/workflow/workflow.store.js';
import { sessionStore } from '../../infrastructure/auth/session.store.js';
import { WorkspaceSidebar } from '../../shared/components/workspace/WorkspaceSidebar.js';
import { getWsClient } from '../../infrastructure/ws/ws-client.js';
import { messagingWs } from '../../infrastructure/ws/messaging.ws.js';
import { apiClient } from '../../infrastructure/api/client.js';
import type { WorkflowWorkspace } from '../../domain/workflow/workflow.model.js';
import type { WorkflowMember } from '../../domain/workflow/member.model.js';
import Drawer from '../../shared/components/ui/webcomponents/drawer.jsx';

// ── Deduplicated fetchers ──────────────────────────────────────────────────────
// Defined at module level so the cache persists across navigations and the same
// data is never fetched twice for the same key within a session.

const fetchWorkspace = cache(
  (id: string): Promise<WorkflowWorkspace> => apiClient.get(`/workflow/workspaces/${id}`),
  'workspace',
);

const fetchMembers = cache(
  (id: string): Promise<WorkflowMember[]> => apiClient.get(`/workflow/members/list/${id}`),
  'workspace-members',
);

// ── Route data type ────────────────────────────────────────────────────────────

export type WorkspaceRouteData = ReturnType<typeof routeData>;

/**
 * routeData — called once per layout instance by the router.
 *
 * Kicks off ALL data fetches in parallel before the layout renders.
 * Resources are reactive: they re-fetch automatically when workspaceId changes.
 */

export const routeData = (args: RouteDataArgs) => {
  const getParams =
  typeof args.params === 'function'
  ? (args.params as () => Record<string, string>)
  : () => args.params as Record<string, string>;
  
  const id = ()=>getParams().workspaceId
  // select(getParams, 'workspaceId');
  console.log('on route data fetch', args)

  // Core resources
  // const [workspace, { refetch: refetchWorkspace }] = createResource(id, fetchWorkspace);
  const [members,   { refetch: refetchMembers   }] = createResource(id, fetchMembers);

  // Domain-specific resource factories
  const channelResources  = createChannelResources(id);
  const workflowResources = createWorkflowResources(id);
  const docResources      = createDocumentResources(id);
  const teamResources     = createTeamResources(id);

  return {
    id,
    // workspace,  refetchWorkspace,
    members,    refetchMembers,
    ...channelResources,
    ...workflowResources,
    ...docResources,
    ...teamResources,
  };
};

// ── Layout component ──────────────────────────────────────────────────────────

export default function WorkspaceAppLayout() {
  useAuthGuard();
  useAccountGuard();
  console.log('ws workspace AppLayout')
  
  const data = useRouteData<WorkspaceRouteData>();
  // useParam returns a memo that only re-triggers when workspaceId changes,
  // NOT when other params (channelId, etc.) change on sub-route navigation.
  const id = useParam('workspaceId');
  const uid = select(sessionStore.user, 'uid')
  // const ch = createMemo(()=>data()!.channels.latest)
  let currentId: any;
  // const dataValue = createMemo(()=>data())
  useEffect(()=>{
    console.log('current ws id', id())
  })


  // ── Sync resources → stores ────────────────────────────────────────────────
  // Each effect tracks its resource's `.latest` value so DOM doesn't wait for
  // Suspense — components that need loading skeletons read resource.loading.

  useEffect(() => {
    // const ws = data()!.workspace?.latest;
    const ws = data()!.workspace?.latest;
    console.log('ws', ws, currentId)
    if (ws) {
      workflowStore.upsertWorkspace(ws);
      workflowStore.setActiveWorkspace(ws.id);
    }
  });

  useEffect(() => {
    const ms = data()!.members.latest as WorkflowMember[] | undefined;
    if (ms) workflowStore.setMembers(ms);
  });

  useEffect(() => {
    const v = uid()
    console.log('setting uid', v)
    if (v) workflowStore.setMyUid(v);
  }, true);

  useEffect(() => {
    const chs = data()!.channels.latest;
    console.log('ch', chs)
    if (chs) channelStore.loadChannels([...chs]);
  });

  // When the bulk message map resolves, populate the channel store once.
  // Both the dashboard (allRecentMessages) and channel pages (activeChannelMessages)
  // read from the same store — no duplicate HTTP requests ever.
  useEffect(() => {
    const map = data()!.messageMap.latest;
    console.log('msg', map)
    if (!map) return;
    for (const [channelId, msgs] of Object.entries(map)) {
      if (msgs.length) channelStore.appendMessages(channelId, msgs);
    }
  });

  useEffect(() => {
    const docs = data()!.documents.latest;
    console.log('docs', docs)
    if (docs) documentStore.loadDocs(docs);
  });

  useEffect(() => {
    const ts = data()!.teams.latest;
    console.log('teams', ts)
    if (ts) teamStore.loadTeams(ts);
  });

  useEffect(() => {
    const scens = data()!.scenarios.latest;
    if (scens) workflowStore.loadScenarios(scens);
  });

  useEffect(() => {
    const creas = data()!.creatives.latest;
    if (creas) workflowStore.loadCreatives(creas);
  });

  useEffect(() => {
    const analytics = data()!.analytics.latest;
    if (analytics) workflowStore.setAnalytics(analytics);
  });

  // ── WebSocket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const wsId = id();
    if (!wsId) return;
    console.log('socket', wsId)
    const socket = getWsClient().connect();
    messagingWs.attach(socket);
    messagingWs.joinWorkspace(wsId);
    onCleanup(() => {
      messagingWs.leaveWorkspace();
      getWsClient().disconnect();
    });
  });

  // ── Build service context value ────────────────────────────────────────────
  // Resources are stable references created once in routeData. Mutation action
  // objects are also created once — they close over the refetch callbacks.
  const d = data();
  const noop = () => {};
  const serviceValue: WorkspaceServiceValue = {
    workspace:  d?.workspace  ?? ((() => undefined) as any),
    members:    d?.members    ?? ((() => undefined) as any),
    channels:   d?.channels   ?? ((() => undefined) as any),
    scenarios:  d?.scenarios  ?? ((() => undefined) as any),
    creatives:  d?.creatives  ?? ((() => undefined) as any),
    analytics:  d?.analytics  ?? ((() => undefined) as any),
    documents:  d?.documents  ?? ((() => undefined) as any),
    teams:      d?.teams      ?? ((() => undefined) as any),
    messageMap: d?.messageMap ?? ((() => undefined) as any),

    // Reactive stores — exposed through context so components don't need direct imports
    channelStore,
    workflowStore,
    documentStore,
    teamStore,
    threadService,

    workspaceActions: createWorkspaceActions(d?.refetchWorkspace ?? noop),
    channelActions:   createChannelActions(d?.refetchChannels    ?? noop),
    messageActions:   createMessageActions(),
    scenarioActions:  createScenarioActions(d?.refetchScenarios  ?? noop),
    creativeActions:  createCreativeActions(d?.refetchCreatives  ?? noop),
    documentActions:  createDocumentActions(d?.refetchDocuments  ?? noop),
    teamActions:      createTeamActions(d?.refetchTeams          ?? noop),
  };

  return (
    <div class="flex h-screen overflow-hidden bg-app">
      <WorkspaceServiceProvider value={serviceValue} debug={true}>
        <Drawer>
          {(id() && <WorkspaceSidebar workspaceId={id as ()=>string} />)}
          <Drawer.Content>
              <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
                <Outlet />
              </div>
          </Drawer.Content>
        </Drawer>
      </WorkspaceServiceProvider>
    </div>
  );
}
