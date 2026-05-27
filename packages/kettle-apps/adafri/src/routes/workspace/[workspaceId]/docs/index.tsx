import { createSignal } from '@awc/kettlejs';
import { useParams, useNavigate } from '@awc/kettlejs/router';
import { documentStore } from '../../../../domain/workflow/document.store.js';
import { documentService } from '../../../../domain/workflow/document.service.js';
import { wsUrl } from '../../../../config/constants.js';

export default function DocsListPage() {
  const params   = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [creating, setCreating] = createSignal(false);

  async function handleNewDoc() {
    setCreating(true);
    try {
      const doc = await documentService.create({
        workspaceId: params().workspaceId,
        title: 'Untitled',
        icon:  '📄',
      });
      navigate(wsUrl(params().workspaceId, `/docs/${doc.id}`));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div class="flex-1 overflow-y-auto bg-gray-50">
      <div class="max-w-4xl mx-auto px-8 py-8">

        {/* Header */}
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Documents</h1>
            <p class="text-sm text-gray-500 mt-0.5">Team notes, briefs, and strategy documents</p>
          </div>
          <button
            class="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg transition-colors"
            disabled={creating()}
            onClick={handleNewDoc}
          >
            {() => creating() ? 'Creating…' : '+ New Doc'}
          </button>
        </div>

        {/* Doc grid */}
        {() => {
          const loading = documentStore.docLoading();
          const docs    = documentStore.docs();

          if (loading) return (
            <div class="grid grid-cols-3 gap-4">
              {[1,2,3].map(i => (
                <div key={i} class="h-32 bg-white border border-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
          );

          if (!docs.length) return (
            <div class="flex flex-col items-center justify-center py-20 text-center">
              <span class="text-5xl mb-4">📄</span>
              <p class="text-sm font-medium text-gray-900">No documents yet</p>
              <p class="text-xs text-gray-500 mt-1 mb-5">Create your first document — briefs, strategy notes, meeting notes</p>
              <button
                class="px-5 py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                onClick={handleNewDoc}
              >
                + New Doc
              </button>
            </div>
          );

          return (
            <div class="grid grid-cols-3 gap-4">
              {docs.map(doc => (
                <button
                  key={doc.id}
                  class="text-left bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all group cursor-pointer"
                  onClick={() => navigate(wsUrl(params().workspaceId, `/docs/${doc.id}`))}
                >
                  <span class="text-3xl mb-3 block">{doc.icon}</span>
                  <p class="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                    {doc.title || 'Untitled'}
                  </p>
                  <p class="text-xs text-gray-400 mt-1">
                    Updated {new Date(doc.updatedAt).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          );
        }}
      </div>
    </div>
  );
}
