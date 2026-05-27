import { createEffect, createMemo, createSignal, useEffect } from '@awc/kettlejs';
import { useNavigate, useRouteData } from '@awc/kettlejs/router';
import { workspaceService } from '../../domain/workflow/workflow.service.js';
import { workflowStore } from '../../domain/workflow/workflow.store.js';
import { useAccount } from '../../store/account.js';
import { wsUrl } from '../../config/constants.js';
import { CreateWorkspaceModal } from '../../shared/components/workspace/CreateWorkspaceModal.jsx';
import '@awc/adf-button/adf-button.mjs'
import { useWorkspaceService } from '../../domain/workflow/service.context.js';

// export default function WorkspaceIndex() {
//   return (
//     <div>index</div>
//   )
// }
// export const routeData = (args: any) => {
//   console.log('on route data index')
//     return {
//         title: 'Workspace',
//     };
// }
export default function WorkspaceIndex() {
    const navigate = useNavigate();
    const [showModal, setShowModal] = createSignal(false);
    const workspaceService = useWorkspaceService();
    const act = useAccount();
    console.log('WorkspaceAppIndex');
    // const data = useRouteData();
    // console.log('load workspace index', data())
  console.log('workspaceService', workspaceService);

  useEffect(() => {
    const acc = act.account();
    if (!acc) return;
    workspaceService?.workspaceActions.list(acc.id);
    // workspaceService?.workspace.listByCampaign(acc.id);
  });

  const workspaces = createMemo(()=>workflowStore.workspaces());
  const loading = createMemo(()=>workflowStore.wsLoading());

  function handleCreated(wsId: string) {
    setShowModal(false);
    navigate(wsUrl(wsId));
  }

  return (
    <div class="min-h-screen bg-gray-50 p-8">
      <div class="max-w-5xl mx-auto">
        <div class="flex items-center justify-between mb-8">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Workspaces</h1>
            <p class="text-sm text-gray-500 mt-1">All campaign workspaces for your account</p>
          </div>
          <adf-button class="btn-primary" link="/workspace/new">New Workspace</adf-button>
          <button
            class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            onClick={() => setShowModal(true)}
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            New Workspace
          </button>
        </div>

        {loading() && workspaces().length === 0 ? (
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(() => (
              <div class="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div class="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                <div class="h-3 bg-gray-100 rounded w-1/2 mb-6" />
                <div class="h-6 bg-gray-100 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : workspaces().length === 0 ? (
          <div class="text-center py-24">
            <div class="text-5xl mb-4">📋</div>
            <h2 class="text-lg font-semibold text-gray-700 mb-2">No workspaces yet</h2>
            <p class="text-sm text-gray-500 mb-6">
              Create your first workspace to start collaborating on a campaign.
            </p>
            <button
              class="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              onClick={() => setShowModal(true)}
            >
              Create Workspace
            </button>
          </div>
        ) : (
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {()=>workspaces().map((ws) => (
              <button
                class="text-left bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-indigo-400 hover:shadow-md transition-all"
                onClick={() => navigate(wsUrl(ws.id))}
              >
                {/* Color band */}
                <div
                  class="h-1.5 w-full"
                  style={`background-color: ${ws.color || '#6366f1'}`}
                />
                <div class="p-5">
                  <div class="flex items-center gap-3 mb-3">
                    {/* Logo / avatar */}
                    <div
                      class="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center overflow-hidden text-white font-bold text-base shadow-sm"
                      style={`background-color: ${ws.color || '#6366f1'}`}
                    >
                      {ws.logo ? (
                        <img src={ws.logo} alt={ws.name} class="w-full h-full object-cover" />
                      ) : (
                        <span>{ws.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div class="min-w-0 flex-1">
                      <h3 class="font-semibold text-gray-900 text-sm leading-snug truncate">{ws.name}</h3>
                      {ws.industry && (
                        <p class="text-xs text-gray-400 capitalize">{ws.industry.replace('_', ' ')}</p>
                      )}
                    </div>
                    <span class={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${statusClass(ws.status)}`}>
                      {ws.status.replace('_', ' ')}
                    </span>
                  </div>
                  {ws.description && (
                    <p class="text-xs text-gray-500 mb-3 line-clamp-2">{ws.description}</p>
                  )}
                  <div class="flex items-center justify-between">
                    {ws.dueDate ? (
                      <p class="text-xs text-gray-400">Due {formatDate(ws.dueDate)}</p>
                    ) : <span />}
                    {ws.website && (
                      <p class="text-xs text-indigo-400 truncate max-w-[140px]">
                        {ws.website.replace(/^https?:\/\//, '')}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showModal() && (
        <CreateWorkspaceModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

function statusClass(status: string): string {
  switch (status) {
    case 'approved':  return 'bg-green-100 text-green-700';
    case 'live':      return 'bg-blue-100 text-blue-700';
    case 'in_review': return 'bg-yellow-100 text-yellow-700';
    case 'completed': return 'bg-gray-100 text-gray-600';
    default:          return 'bg-gray-100 text-gray-500';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}
