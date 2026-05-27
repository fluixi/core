import { createEffect } from '@awc/kettlejs';
import { useParams, Outlet } from '@awc/kettlejs/router';
import { workspaceService, scenarioService, creativeService, discussionService } from '../../../../../domain/workflow/workflow.service.js';
import { workflowStore } from '../../../../../domain/workflow/workflow.store.js';
import { WorkflowSidebar } from '../../../../../shared/components/workflow/WorkflowSidebar.js';

export default function WorkspaceLayout() {
  const params = useParams<{ id: string; workspaceId?: string }>();

  createEffect(() => {
    const wsId = params.workspaceId ?? workflowStore.activeWsId();
    if (!wsId) return;

    workspaceService.get(wsId);
    scenarioService.list(wsId);
    creativeService.list(wsId);
    discussionService.list(wsId);
  });

  return (
    <div class="workspace-layout">
      <WorkflowSidebar campaignId={params.id} />
      <div class="workspace-main">
        <Outlet />
      </div>
    </div>
  );
}
