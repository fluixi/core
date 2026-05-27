import { createSignal, createMemo, onMount } from '@awc/kettlejs';
import { useParams } from '@awc/kettlejs/router';
import { workflowStore } from '../../../domain/workflow/workflow.store.js';
import { channelStore } from '../../../domain/workflow/channel.store.js';
// import { workspaceService } from '../../../domain/workflow/workflow.service.js';
import { useWorkspaceService } from '../../../domain/workflow/service.context.js';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', in_review: 'In Review',
  approved: 'Approved', live: 'Live', completed: 'Completed',
};

const STATUS_NEXT: Record<string, string | null> = {
  draft: 'in_review', in_review: 'approved',
  approved: 'live', live: 'completed', completed: null,
};

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  in_review: 'bg-yellow-100 text-yellow-700',
  approved:  'bg-green-100 text-green-700',
  live:      'bg-blue-100 text-blue-700',
  completed: 'bg-indigo-100 text-indigo-700',
};

export default function WorkspaceOverviewPage() {
  const params = useParams<{ workspaceId: string }>();
  const [advancing, setAdvancing] = createSignal(false);
  const workspaceService = useWorkspaceService();
  console.log('workspaceService', workspaceService);
  
  // onMount(() => {
  //   console.log('WorkspaceOverviewPage', workspaceService);

  // });
  // Layout's sync effects already populate the store — read reactively from here.
  const ws = createMemo(() => {
    const id = params().workspaceId;
    return workflowStore.workspaces().find(w => w.id === id)
      ?? workflowStore.activeWorkspace()
      ?? null;
  });

  async function advanceStatus() {
    const workspace = ws();
    if (!workspace) return;
    const next = STATUS_NEXT[workspace.status];
    if (!next) return;
    setAdvancing(true);
    try { await workspaceService.updateStatus(workspace.id, next); }
    finally { setAdvancing(false); }
  }

  return (
    <div class="flex-1 overflow-y-auto bg-app">
      {() => {
        const workspace = ws();

        if (!workspace) {
          const loading = workflowStore.wsLoading();
          if (!loading && workflowStore.wsError()) {
            return (
              <div class="flex items-center justify-center h-full">
                <p class="text-sm text-gray-500">Workspace not found.</p>
              </div>
            );
          }
          return (
            <div class="flex items-center justify-center h-full">
              <div class="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          );
        }

        const analytics  = workflowStore.analytics();
        const nextStatus = STATUS_NEXT[workspace.status];

        return (
          <div class="max-w-5xl mx-auto px-8 py-8">

            {/* Page header */}
            <div class="flex items-start justify-between mb-8">
              <div>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{workspace.name}</h1>
                {workspace.description && (
                  <p class="text-sm text-gray-500 dark:text-gray-300 mt-1">{workspace.description}</p>
                )}
              </div>
              <div class="flex items-center gap-3 ml-4">
                <span class={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[workspace.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABELS[workspace.status] ?? workspace.status}
                </span>
                {nextStatus && (
                  <button
                    class="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg transition-colors"
                    disabled={advancing()}
                    onClick={advanceStatus}
                  >
                    {() => advancing() ? 'Updating…' : `→ ${STATUS_LABELS[nextStatus]}`}
                  </button>
                )}
              </div>
            </div>

            {/* Health score grid */}
            {() => analytics && (
              <div class="grid grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Total Scenarios',    value: analytics.scenarios.total,                                                                                                                         color: 'text-gray-900' },
                  { label: 'Selected Scenario',  value: analytics.scenarios.byStatus?.selected ?? 0,                                                                                                       color: 'text-gray-900' },
                  { label: 'Creatives Approved', value: analytics.creatives.total > 0 ? `${Math.round(((analytics.creatives.byStatus?.approved ?? 0) / analytics.creatives.total) * 100)}%` : '0%',      color: 'text-green-600' },
                  { label: 'Health Score',       value: `${analytics.healthScore}%`,                                                                                                                       color: analytics.healthScore >= 70 ? 'text-green-600' : analytics.healthScore >= 40 ? 'text-yellow-600' : 'text-red-600' },
                ].map(card => (
                  <div key={card.label} class="bg-card border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
                    <p class="text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wide mb-2">{card.label}</p>
                    <p class={`text-3xl font-bold tracking-tight ${card.color}`}>{card.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Details + Activity */}
            <div class="grid grid-cols-2 gap-6">
              <div class="bg-card border border-gray-200 rounded-xl p-6 shadow-sm">
                <h2 class="text-sm font-semibold text-gray-900 mb-4">Details</h2>
                <dl class="space-y-3">
                  {[
                    { label: 'Status',     value: <span class={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[workspace.status]}`}>{STATUS_LABELS[workspace.status]}</span> },
                    { label: 'Due Date',   value: workspace.dueDate ?? '—' },
                    { label: 'Tags',       value: workspace.tags?.length > 0 ? workspace.tags.join(', ') : '—' },
                    { label: 'Created by', value: workspace.createdBy },
                  ].map(row => (
                    <div key={row.label} class="flex items-baseline justify-between gap-4">
                      <dt class="text-xs font-medium text-gray-500 uppercase tracking-wide flex-shrink-0">{row.label}</dt>
                      <dd class="text-sm text-gray-900 dark:text-gray-300 text-right">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div class="bg-card border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
                <h2 class="text-sm font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
                {() => {
                  const msgs = channelStore.allRecentMessages().slice(0, 5);
                  if (!msgs.length) {
                    return (
                      <div class="flex flex-col items-center justify-center py-6 text-center">
                        <span class="text-2xl mb-2">💬</span>
                        <p class="text-xs text-gray-400 dark:text-gray-200">No recent messages</p>
                      </div>
                    );
                  }
                  return (
                    <ul class="space-y-3">
                      {msgs.map(m => (
                        <li key={m.id} class="flex items-start gap-2.5">
                          <div class="w-6 h-6 rounded-full bg-indigo-500 flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold mt-0.5">
                            {m.authorName[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div class="flex-1 min-w-0">
                            <p class="text-xs">
                              <span class="font-semibold text-gray-900">{m.authorName}</span>
                              <span class="text-gray-500 ml-1.5">{m.content.slice(0, 60)}{m.content.length > 60 ? '…' : ''}</span>
                            </p>
                            <p class="text-[10px] text-gray-400 dark:text-gray-200 mt-0.5">{new Date(m.createdAt).toLocaleTimeString()}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  );
                }}
              </div>
            </div>

          </div>
        );
      }}
    </div>
  );
}
