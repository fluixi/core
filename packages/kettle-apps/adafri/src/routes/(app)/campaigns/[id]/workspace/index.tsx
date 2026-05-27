import { createSignal, createEffect } from '@awc/kettlejs';
import { useParams, useNavigate } from '@awc/kettlejs/router';
import { workflowStore } from '../../../../../domain/workflow/workflow.store.js';
import { workspaceService, analyticsService } from '../../../../../domain/workflow/workflow.service.js';
import { DiscussionThread } from '../../../../../shared/components/workflow/DiscussionThread.js';
import { useAccount } from '../../../../../store/account.js';

const STATUS_LABELS: Record<string, string> = {
  draft:     'Draft',
  in_review: 'In Review',
  approved:  'Approved',
  live:      'Live',
  completed: 'Completed',
};

const STATUS_NEXT: Record<string, string | null> = {
  draft:     'in_review',
  in_review: 'approved',
  approved:  'live',
  live:      'completed',
  completed: null,
};

export default function WorkspaceOverview() {
  const params   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [advancing, setAdvancing] = createSignal(false);

  createEffect(() => {
    const ws = workflowStore.activeWorkspace();
    if (ws) {
      analyticsService.get(ws.id);
    }
  });

  async function advanceStatus() {
    const ws = workflowStore.activeWorkspace();
    if (!ws) return;
    const next = STATUS_NEXT[ws.status];
    if (!next) return;
    setAdvancing(true);
    try {
      await workspaceService.updateStatus(ws.id, next);
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div class="page page-workspace-overview">
      {() => {
        const ws = workflowStore.activeWorkspace();
        if (workflowStore.wsLoading()) {
          return <div class="page-loading">Loading workspace…</div>;
        }
        if (!ws) {
          return <div class="page-empty">No workspace selected.</div>;
        }

        const analytics  = workflowStore.analytics();
        const nextStatus = STATUS_NEXT[ws.status];

        return (
          <div class="workspace-overview">
            <div class="workspace-overview-header">
              <div>
                <h1 class="page-title">{ws.name}</h1>
                {ws.description && <p class="page-subtitle">{ws.description}</p>}
              </div>
              <div class="workspace-overview-actions">
                <span class={`status-badge status-badge--${ws.status}`}>
                  {STATUS_LABELS[ws.status] ?? ws.status}
                </span>
                {nextStatus && (
                  <button
                    class="btn btn-primary"
                    disabled={advancing()}
                    onClick={advanceStatus}
                  >
                    {advancing() ? 'Updating…' : `Move to ${STATUS_LABELS[nextStatus]}`}
                  </button>
                )}
              </div>
            </div>

            {analytics && (
              <div class="workspace-analytics-summary">
                <div class="analytics-card">
                  <span class="analytics-value">{analytics.scenarios.total}</span>
                  <span class="analytics-label">Scenarios</span>
                </div>
                <div class="analytics-card">
                  <span class="analytics-value">{analytics.creatives.total}</span>
                  <span class="analytics-label">Creatives</span>
                </div>
                <div class="analytics-card">
                  <span class="analytics-value">{analytics.healthScore}%</span>
                  <span class="analytics-label">Health Score</span>
                </div>
                <div class="analytics-card">
                  <span class="analytics-value">
                    {analytics.creatives.byStatus?.approved ?? 0}
                  </span>
                  <span class="analytics-label">Approved Creatives</span>
                </div>
              </div>
            )}

            <div class="workspace-overview-body">
              <div class="workspace-meta">
                <dl class="meta-list">
                  <dt>Campaign</dt>
                  <dd>{params.id}</dd>
                  <dt>Due Date</dt>
                  <dd>{ws.dueDate ?? '—'}</dd>
                  <dt>Tags</dt>
                  <dd>{ws.tags.length > 0 ? ws.tags.join(', ') : '—'}</dd>
                  <dt>Created by</dt>
                  <dd>{ws.createdBy}</dd>
                </dl>
              </div>

              <DiscussionThread workspaceId={ws.id} />
            </div>
          </div>
        );
      }}
    </div>
  );
}
