import { createSignal } from '@awc/kettlejs';
// import { workflowStore } from '../../../../domain/workflow/workflow.store.js';
import type { CreativeType, CreateCreativeInput } from '../../../../domain/workflow/workflow.model.js';
import { useWorkspaceService } from '../../../../domain/workflow/service.context.js';
import Card from '../../../../shared/components/ui/webcomponents/card.jsx';
import Select from '../../../../shared/components/ui/webcomponents/select.jsx';
import Input from '../../../../shared/components/ui/webcomponents/input.jsx';

const CREATIVE_TYPES: CreativeType[] = ['image', 'video', 'copy', 'html'];
const TYPE_ICONS: Record<CreativeType, string> = { image: '🖼️', video: '🎬', copy: '✍️', html: '🖥️' };

const STATUS_CLASSES: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  in_review: 'bg-yellow-100 text-yellow-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
};

export default function WorkspaceCreativesPage() {
  // console.log('load creative index')
  const [filter,    setFilter]    = createSignal<CreativeType | 'all'>('all');
  const [showForm,  setShowForm]  = createSignal(false);
  const [formName,  setFormName]  = createSignal('');
  const [formType,  setFormType]  = createSignal<CreativeType>('image');
  const [formHead,  setFormHead]  = createSignal('');
  const [formDesc,  setFormDesc]  = createSignal('');
  const [formCta,   setFormCta]   = createSignal('');
  const [formUrl,   setFormUrl]   = createSignal('');
  const [saving,    setSaving]    = createSignal(false);
  const [formError, setFormError] = createSignal<string | null>(null);
  const {creativeActions, workflowStore} = useWorkspaceService()!

  async function handleCreate(e: Event) {
    e.preventDefault();
    const ws = workflowStore.activeWorkspace();
    if (!ws) return;
    const name = formName().trim();
    if (!name) { setFormError('Name is required'); return; }
    setFormError(null);
    setSaving(true);
    const input: CreateCreativeInput = {
      workspaceId: ws.id, type: formType(), name,
      headline: formHead(), description: formDesc(), ctaText: formCta(), assetUrl: formUrl(),
    };
    try {
      await creativeActions.create(input);
      setShowForm(false);
      setFormName(''); setFormHead(''); setFormDesc(''); setFormCta(''); setFormUrl('');
    } catch (err) { setFormError((err as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div class="flex-1 overflow-y-auto">
      <div class="max-w-6xl mx-auto px-8 py-8">

        {/* Header */}
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-300 tracking-tight">Creatives</h1>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage and review campaign creative assets</p>
          </div>
          <button
            class="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            onClick={() => setShowForm(!showForm())}
          >
            {() => showForm() ? 'Cancel' : '+ Add Creative'}
          </button>
        </div>

        {/* Filter tabs */}
        <Card class="flex flex-row items-center gap-1 mb-6 border border-gray-200 dark:border-gray-800 border-solid rounded-xl p-1 w-fit shadow-sm">
            <button
              class={()=>`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                filter() === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            {CREATIVE_TYPES.map(t => (
              <button
                key={t}
                class={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  filter() === t ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                onClick={() => { setFilter(t)}}
              >
                {TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
        </Card>
        {/* <div class="flex items-center gap-1 mb-6 bg-app-tonal border border-gray-200 dark:border-gray-600 rounded-xl p-1 w-fit shadow-sm">
        </div> */}

        {/* Create form */}
        {showForm() && (

          <Card class="border border-gray-200 dark:border-gray-800 border-solid rounded-xl shadow-sm p-6 mb-6">
            <h2 class="text-base font-semibold text-gray-900 mb-5">New Creative</h2>
            <form onSubmit={handleCreate} class="space-y-4 w-full">

              {() => formError() && (
                <div class="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  ⚠ {formError()}
                </div>
              )}

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Type</label>
                  
                  <Select size="md" required multiple value={formType} onChange={(e) => setFormType(e.value as CreativeType)}>
                   {CREATIVE_TYPES.map(t => (
                      <Select.Option key={t} value={t} label={t} iName="moon" lib="lucide" iSize={18}></Select.Option>
                    ))}
                  </Select>
                  {/* <select
                    value={formType}
                    onChange={(e: Event) => setFormType((e.target as HTMLSelectElement).value as CreativeType)}
                    class="w-full input text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {CREATIVE_TYPES.map(t => (
                      <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>
                    ))}
                  </select> */}
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Name *</label>
                  <Input
                    iName={"moon"}
                    lib={"lucide"}
                    // iSize={18}
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.value)}
                    placeholder="e.g. Hero banner – summer"
                    class="w-full input text-sm"
                    />
                </div>
                    {/* class="w-full input text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400" */}
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Headline</label>
                <Input
                  type="text"
                  value={formHead}
                  onChange={(e) => setFormHead(e.value)}
                  placeholder="Catchy headline"
                  class="w-full input text-sm"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Description</label>
                <Input
                  mode={"textarea"}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.value)}
                  rows={2}
                  class="w-full input text-sm"
                />
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">CTA Text</label>
                  <Input
                    type="text"
                    value={formCta}
                    onChange={(e) => setFormCta(e.value)}
                    placeholder="Shop Now"
                    class="w-full input text-sm"
                  />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Asset URL</label>
                  <Input
                    type="url"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.value)}
                    placeholder="https://cdn.example.com/banner.jpg"
                    class="w-full input text-sm"
                  />
                </div>
              </div>

              <div class="flex justify-end pt-2 border-t border-gray-100">
                <button
                  type="submit"
                  class="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg transition-colors"
                  disabled={saving}
                >
                  {() => saving() ? 'Creating…' : 'Add Creative'}
                </button>
              </div>
            </form>
          </Card>
        )}

        {/* Gallery */}
        {() => {
          const loading  = workflowStore.creaLoading();
          const error    = workflowStore.creaError();
          const allItems = workflowStore.creatives();
          const items    = filter() === 'all' ? allItems : allItems.filter(c => c.type === filter());

          if (loading) return (
            <div class="grid grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} class="h-48 bg-white border border-gray-200 rounded-xl animate-pulse" />)}
            </div>
          );

          if (error) return (
            <div class="bg-red-50 border border-red-200 rounded-xl p-6 text-sm text-red-700">{error}</div>
          );

          if (!items.length) return (
            <div class="flex flex-col items-center justify-center py-20 text-center">
              <span class="text-4xl mb-3">🖼️</span>
              <p class="text-sm font-medium text-gray-900 dark:text-gray-600">
                {filter() === 'all' ? 'No creatives yet' : `No ${filter()} creatives`}
              </p>
              <p class="text-xs text-gray-500 mt-1">Add creative assets to showcase your campaign</p>
            </div>
          );

          return (
            <div class="grid grid-cols-3 gap-4">
              {items.map(c => (
                <div
                  key={c.id}
                  class="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {c.previewUrl
                    ? <img src={c.previewUrl} alt={c.name} class="w-full h-40 object-cover" loading="lazy" />
                    : c.type === 'copy'
                    ? (
                      <div class="w-full h-40 bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4 text-center">
                        {c.headline && <p class="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">{c.headline}</p>}
                        {c.description && <p class="text-xs text-gray-500 line-clamp-3">{c.description}</p>}
                        {c.ctaText && <span class="mt-2 px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded-full">{c.ctaText}</span>}
                      </div>
                    )
                    : (
                      <div class="w-full h-40 bg-gray-100 flex items-center justify-center">
                        <span class="text-4xl opacity-40">{TYPE_ICONS[c.type]}</span>
                      </div>
                    )
                  }

                  <div class="p-4">
                    <div class="flex items-start justify-between gap-2 mb-2">
                      <div class="min-w-0">
                        <span class="text-base mr-1.5">{TYPE_ICONS[c.type]}</span>
                        <span class="text-sm font-semibold text-gray-900 truncate">{c.name}</span>
                      </div>
                      <span class={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLASSES[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {c.status}
                      </span>
                    </div>

                    {c.feedback && (
                      <p class="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 mb-3 italic">"{c.feedback}"</p>
                    )}

                    <div class="flex items-center gap-2 pt-3 border-t border-gray-100">
                      {c.status === 'draft' && (
                        <>
                          <button
                            class="flex-1 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                            onClick={() => creativeActions.review(c.id, 'approved')}
                          >
                            Approve
                          </button>
                          <button
                            class="flex-1 py-1.5 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                            onClick={() => creativeActions.review(c.id, 'rejected')}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        class="py-1.5 px-3 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        onClick={() => creativeActions.delete(c.id)}
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        }}
      </div>
    </div>
  );
}
