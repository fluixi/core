import { createStore, createMemo, batch } from '@awc/kettlejs';
import type {
  WorkflowWorkspace,
  WorkflowScenario,
  WorkflowCreative,
  DiscussionMessage,
  WorkspaceAnalytics,
} from './workflow.model.js';
import type { WorkflowMember } from './member.model.js';

// ── Single flat store ──────────────────────────────────────────────────────────

const [state, setState] = createStore({
  // Workspace
  workspaces:  [] as WorkflowWorkspace[],
  activeWsId:  null as string | null,
  wsLoading:   false,
  wsError:     null as string | null,
  // Scenario
  scenarios:   [] as WorkflowScenario[],
  scenLoading: false,
  scenError:   null as string | null,
  // Creative
  creatives:   [] as WorkflowCreative[],
  creaLoading: false,
  creaError:   null as string | null,
  // Discussion
  messages:    [] as DiscussionMessage[],
  msgLoading:  false,
  // Analytics
  analytics:   null as WorkspaceAnalytics | null,
  // Members
  members:     [] as WorkflowMember[],
  myUid:       null as string | null,
});

// ── Composed store ─────────────────────────────────────────────────────────────

export const workflowStore = {
  // ── raw accessors (wrap store reads in functions for external callers) ──────
  workspaces:  () => state.workspaces,
  wsLoading:   () => state.wsLoading,
  wsError:     () => state.wsError,
  activeWsId:  () => state.activeWsId,
  scenarios:   () => state.scenarios,
  scenLoading: () => state.scenLoading,
  scenError:   () => state.scenError,
  creatives:   () => state.creatives,
  creaLoading: () => state.creaLoading,
  creaError:   () => state.creaError,
  messages:    () => state.messages,
  msgLoading:  () => state.msgLoading,
  analytics:   () => state.analytics,
  members:     () => state.members,

  // ── derived memos ──────────────────────────────────────────────────────────
  activeWorkspace: createMemo(() => {
    const id = state.activeWsId;
    return id ? state.workspaces.find(w => w.id === id) ?? null : null;
  }),

  selectedScenario: createMemo(() =>
    state.scenarios.find(s => s.status === 'selected') ?? null,
  ),

  approvedCreatives: createMemo(() =>
    state.creatives.filter(c => c.status === 'approved'),
  ),

  creativesByType: createMemo(() => {
    const map: Record<string, WorkflowCreative[]> = {};
    for (const c of state.creatives) {
      (map[c.type] ??= []).push(c);
    }
    return map;
  }),

  myMember: createMemo(() => {
    const uid = state.myUid;
    return uid ? state.members.find(m => m.uid === uid) ?? null : null;
  }),

  myRole: createMemo((): string => {
    const uid = state.myUid;
    if (!uid) return 'viewer';
    return state.members.find(m => m.uid === uid)?.role ?? 'viewer';
  }),

  isOwner: createMemo(() => {
    const uid = state.myUid;
    if (!uid) return false;
    const ws = state.workspaces.find(w => w.id === state.activeWsId);
    if (ws?.ownerUid === uid) return true;
    return state.members.find(m => m.uid === uid)?.role === 'owner';
  }),

  isAdmin: createMemo(() => {
    const uid = state.myUid;
    if (!uid) return false;
    if (workflowStore.isOwner()) return true;
    const role = state.members.find(m => m.uid === uid)?.role;
    return role === 'admin' || role === 'owner';
  }),

  canEdit: createMemo(() => {
    const uid = state.myUid;
    if (!uid) return false;
    return ['owner', 'admin', 'editor'].includes(
      state.members.find(m => m.uid === uid)?.role ?? '',
    );
  }),

  // ── workspace mutations ────────────────────────────────────────────────────
  loadWorkspaces(items: WorkflowWorkspace[])    { setState('workspaces', items); },
  setWsLoading(v: boolean)                      { setState('wsLoading', v); },
  setWsError(v: string | null)                  { setState('wsError', v); },
  setActiveWorkspace(id: string | null)         { setState('activeWsId', id); },

  upsertWorkspace(ws: WorkflowWorkspace) {
    setState('workspaces', prev =>
      prev.findIndex(w => w.id === ws.id) >= 0
        ? prev.map(w => (w.id === ws.id ? ws : w))
        : [ws, ...prev],
    );
  },

  removeWorkspace(id: string) {
    batch(() => {
      setState('workspaces', prev => prev.filter(w => w.id !== id));
      if (state.activeWsId === id) setState('activeWsId', null);
    });
  },

  isWorkspaceOwner(uid: string) {
    return state.workspaces.find(w => w.id === state.activeWsId)?.ownerUid === uid;
  },

  // ── scenario mutations ─────────────────────────────────────────────────────
  loadScenarios(items: WorkflowScenario[])   { setState('scenarios', items); },
  setScenLoading(v: boolean)                 { setState('scenLoading', v); },
  setScenError(v: string | null)             { setState('scenError', v); },

  upsertScenario(s: WorkflowScenario) {
    setState('scenarios', prev =>
      prev.findIndex(x => x.id === s.id) >= 0
        ? prev.map(x => (x.id === s.id ? s : x))
        : [...prev, s],
    );
  },

  removeScenario(id: string) {
    setState('scenarios', prev => prev.filter(s => s.id !== id));
  },

  // ── creative mutations ─────────────────────────────────────────────────────
  loadCreatives(items: WorkflowCreative[])  { setState('creatives', items); },
  setCreaLoading(v: boolean)                { setState('creaLoading', v); },
  setCreaError(v: string | null)            { setState('creaError', v); },

  upsertCreative(c: WorkflowCreative) {
    setState('creatives', prev =>
      prev.findIndex(x => x.id === c.id) >= 0
        ? prev.map(x => (x.id === c.id ? c : x))
        : [...prev, c],
    );
  },

  removeCreative(id: string) {
    setState('creatives', prev => prev.filter(c => c.id !== id));
  },

  // ── discussion mutations ───────────────────────────────────────────────────
  loadMessages(items: DiscussionMessage[]) { setState('messages', items); },
  setMsgLoading(v: boolean)                { setState('msgLoading', v); },

  addMessage(msg: DiscussionMessage) {
    setState('messages', prev => [...prev, msg]);
  },

  // ── analytics ─────────────────────────────────────────────────────────────
  setAnalytics(v: WorkspaceAnalytics | null) { setState('analytics', v); },

  // ── member mutations ───────────────────────────────────────────────────────
  setMembers(items: WorkflowMember[]) { setState('members', items); },
  setMyUid(uid: string | null)        { setState('myUid', uid); },

  // ── reset workspace-scoped state ───────────────────────────────────────────
  clearWorkspace() {
    batch(() => {
      setState({
        scenarios:   [],
        creatives:   [],
        messages:    [],
        analytics:   null,
        activeWsId:  null,
        members:     [],
      });
    });
  },
} as const;
