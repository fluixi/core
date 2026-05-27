import { createSignal } from '@awc/kettlejs';
import { workflowStore } from '../../../../../../domain/workflow/workflow.store.js';
import { creativeService } from '../../../../../../domain/workflow/workflow.service.js';
import type { CreativeType, CreateCreativeInput } from '../../../../../../domain/workflow/workflow.model.js';

const CREATIVE_TYPES: CreativeType[] = ['image', 'video', 'copy', 'html'];

const TYPE_ICONS: Record<CreativeType, string> = {
  image: '🖼️',
  video: '🎬',
  copy:  '✍️',
  html:  '🖥️',
};

export default function CreativesPage() {
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

  async function handleCreate(e: Event) {
    e.preventDefault();
    const ws = workflowStore.activeWorkspace();
    if (!ws) return;

    const name = formName().trim();
    if (!name) { setFormError('Name is required'); return; }

    setFormError(null);
    setSaving(true);

    const input: CreateCreativeInput = {
      workspaceId:  ws.id,
      type:         formType(),
      name,
      headline:     formHead(),
      description:  formDesc(),
      ctaText:      formCta(),
      assetUrl:     formUrl(),
    };

    try {
      await creativeService.create(input);
      setShowForm(false);
      setFormName('');
      setFormHead('');
      setFormDesc('');
      setFormCta('');
      setFormUrl('');
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div class="page page-creatives">
      <div class="page-header">
        <h1 class="page-title">Creatives</h1>
        <button class="btn btn-primary" onClick={() => setShowForm(!showForm())}>
          {() => showForm() ? 'Cancel' : 'Add Creative'}
        </button>
      </div>

      {/* Type filter tabs */}
      <div class="creatives-filter-tabs" role="tablist">
        <button
          class={`tab-btn${filter() === 'all' ? ' active' : ''}`}
          role="tab"
          aria-selected={filter() === 'all'}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        {CREATIVE_TYPES.map(t => (
          <button
            key={t}
            class={`tab-btn${filter() === t ? ' active' : ''}`}
            role="tab"
            aria-selected={filter() === t}
            onClick={() => setFilter(t)}
          >
            {TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {() => showForm() && (
        <form class="creative-form card" onSubmit={handleCreate}>
          <h2 class="card-title">New Creative</h2>

          {() => formError() && <p class="form-error">{formError()}</p>}

          <div class="form-row">
            <div class="form-field">
              <label>Type</label>
              <select
                value={formType()}
                onChange={(e: Event) => setFormType((e.target as HTMLSelectElement).value as CreativeType)}
              >
                {CREATIVE_TYPES.map(t => (
                  <option key={t} value={t}>{TYPE_ICONS[t]} {t}</option>
                ))}
              </select>
            </div>
            <div class="form-field form-field--grow">
              <label>Name *</label>
              <input
                type="text"
                value={formName()}
                onInput={(e: InputEvent) => setFormName((e.target as HTMLInputElement).value)}
                placeholder="e.g. Hero banner – summer"
              />
            </div>
          </div>

          <div class="form-field">
            <label>Headline</label>
            <input
              type="text"
              value={formHead()}
              onInput={(e: InputEvent) => setFormHead((e.target as HTMLInputElement).value)}
              placeholder="Catchy headline"
            />
          </div>

          <div class="form-field">
            <label>Description</label>
            <textarea
              value={formDesc()}
              onInput={(e: InputEvent) => setFormDesc((e.target as HTMLTextAreaElement).value)}
              rows={2}
              placeholder="Supporting copy or caption"
            />
          </div>

          <div class="form-row">
            <div class="form-field">
              <label>CTA Text</label>
              <input
                type="text"
                value={formCta()}
                onInput={(e: InputEvent) => setFormCta((e.target as HTMLInputElement).value)}
                placeholder="Shop Now"
              />
            </div>
            <div class="form-field form-field--grow">
              <label>Asset URL</label>
              <input
                type="url"
                value={formUrl()}
                onInput={(e: InputEvent) => setFormUrl((e.target as HTMLInputElement).value)}
                placeholder="https://cdn.example.com/banner.jpg"
              />
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" disabled={saving()}>
              {() => saving() ? 'Saving…' : 'Add Creative'}
            </button>
          </div>
        </form>
      )}

      {() => {
        const loading  = workflowStore.creaLoading();
        const error    = workflowStore.creaError();
        const allItems = workflowStore.creatives();
        const items    = filter() === 'all' ? allItems : allItems.filter(c => c.type === filter());

        if (loading) return <div class="page-loading">Loading creatives…</div>;
        if (error)   return <div class="page-error">{error}</div>;
        if (items.length === 0) {
          return (
            <div class="page-empty">
              {filter() === 'all'
                ? 'No creatives yet. Add your first creative asset.'
                : `No ${filter()} creatives yet.`}
            </div>
          );
        }

        return (
          <div class="creatives-gallery">
            {items.map(creative => (
              <div key={creative.id} class={`creative-card creative-card--${creative.type} creative-card--${creative.status}`}>
                <div class="creative-card-header">
                  <span class="creative-type-icon">{TYPE_ICONS[creative.type]}</span>
                  <span class="creative-card-name">{creative.name}</span>
                  <span class={`status-badge status-badge--${creative.status}`}>{creative.status}</span>
                </div>

                {creative.previewUrl && (
                  <div class="creative-preview">
                    <img src={creative.previewUrl} alt={creative.name} loading="lazy" />
                  </div>
                )}

                {!creative.previewUrl && creative.type === 'copy' && (
                  <div class="creative-copy-preview">
                    {creative.headline && <p class="copy-headline">{creative.headline}</p>}
                    {creative.description && <p class="copy-body">{creative.description}</p>}
                    {creative.ctaText && <span class="copy-cta">{creative.ctaText}</span>}
                  </div>
                )}

                {creative.feedback && (
                  <div class="creative-feedback">
                    <strong>Feedback:</strong> {creative.feedback}
                  </div>
                )}

                <div class="creative-card-actions">
                  {creative.status === 'draft' && (
                    <button
                      class="btn btn-sm btn-primary"
                      onClick={() => creativeService.review(creative.id, 'approved')}
                    >
                      Approve
                    </button>
                  )}
                  {creative.status === 'draft' && (
                    <button
                      class="btn btn-sm btn-danger"
                      onClick={() => creativeService.review(creative.id, 'rejected')}
                    >
                      Reject
                    </button>
                  )}
                  <button
                    class="btn btn-sm btn-ghost"
                    onClick={() => creativeService.delete(creative.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      }}
    </div>
  );
}
