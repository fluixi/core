import { useLocation, useNavigate } from '@awc/kettlejs/router';
import { workflowStore } from '../../../domain/workflow/workflow.store.js';

interface Props {
  campaignId: string;
}

const WORKSPACE_STATUS_LABELS: Record<string, string> = {
  draft:     'Draft',
  in_review: 'In Review',
  approved:  'Approved',
  live:      'Live',
  completed: 'Completed',
};

export function WorkflowSidebar({ campaignId }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  const basePath = `/campaigns/${campaignId}/workspace`;

  const NAV_ITEMS = [
    { path: basePath,             label: 'Overview',   icon: '📋', exact: true },
    { path: `${basePath}/scenarios`, label: 'Scenarios',  icon: '🎯', exact: false },
    { path: `${basePath}/creatives`, label: 'Creatives',  icon: '🖼️', exact: false },
  ];

  function isActive(path: string, exact: boolean): boolean {
    return exact
      ? location.pathname === path
      : location.pathname.startsWith(path);
  }

  return (
    <aside class="workflow-sidebar">
      <div class="workflow-sidebar-header">
        <button
          class="workflow-back-btn"
          onClick={() => navigate(`/campaigns/${campaignId}`)}
          aria-label="Back to campaign"
        >
          ← Campaign
        </button>
        <h2 class="workflow-sidebar-title">
          {() => workflowStore.activeWorkspace()?.name ?? 'Workspace'}
        </h2>
        {() => {
          const ws = workflowStore.activeWorkspace();
          if (!ws) return null;
          return (
            <span class={`status-badge status-badge--${ws.status}`}>
              {WORKSPACE_STATUS_LABELS[ws.status] ?? ws.status}
            </span>
          );
        }}
      </div>

      <nav class="workflow-sidebar-nav" aria-label="Workspace navigation">
        {NAV_ITEMS.map(item => (
          <a
            key={item.path}
            class={`workflow-nav-item${isActive(item.path, item.exact) ? ' active' : ''}`}
            href={item.path}
            onClick={(e: Event) => { e.preventDefault(); navigate(item.path); }}
          >
            <span class="nav-icon" aria-hidden="true">{item.icon}</span>
            <span class="nav-label">{item.label}</span>
          </a>
        ))}
      </nav>

      {() => {
        const analytics = workflowStore.analytics();
        if (!analytics) return null;
        return (
          <div class="workflow-sidebar-stats">
            <div class="ws-stat">
              <span class="ws-stat-value">{analytics.scenarios.total}</span>
              <span class="ws-stat-label">Scenarios</span>
            </div>
            <div class="ws-stat">
              <span class="ws-stat-value">{analytics.creatives.total}</span>
              <span class="ws-stat-label">Creatives</span>
            </div>
            <div class="ws-stat">
              <span class="ws-stat-value">{analytics.healthScore}%</span>
              <span class="ws-stat-label">Health</span>
            </div>
          </div>
        );
      }}
    </aside>
  );
}
