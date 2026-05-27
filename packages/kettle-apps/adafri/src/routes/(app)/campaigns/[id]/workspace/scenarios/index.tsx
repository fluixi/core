import { createSignal } from '@awc/kettlejs';
import { workflowStore } from '../../../../../../domain/workflow/workflow.store.js';
import { scenarioService } from '../../../../../../domain/workflow/workflow.service.js';
import { ScenarioCard } from '../../../../../../shared/components/workflow/ScenarioCard.js';
import type { CreateScenarioInput } from '../../../../../../domain/workflow/workflow.model.js';

export default function ScenariosPage() {
  const [showForm, setShowForm] = createSignal(false);
  const [formName, setFormName] = createSignal('');
  const [formBudget, setFormBudget] = createSignal('');
  const [formDesc, setFormDesc] = createSignal('');
  const [saving, setSaving] = createSignal(false);
  const [formError, setFormError] = createSignal<string | null>(null);

  async function handleCreate(e: Event) {
    e.preventDefault();
    const ws = workflowStore.activeWorkspace();
    if (!ws) return;

    const name = formName().trim();
    const budget = parseFloat(formBudget());

    if (!name) { setFormError('Name is required'); return; }
    if (isNaN(budget) || budget <= 0) { setFormError('Enter a valid budget'); return; }

    setFormError(null);
    setSaving(true);

    const input: CreateScenarioInput = {
      workspaceId: ws.id,
      name,
      description: formDesc(),
      budget,
    };

    try {
      await scenarioService.create(input);
      setShowForm(false);
      setFormName('');
      setFormBudget('');
      setFormDesc('');
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div class="page page-scenarios">
      <div class="page-header">
        <h1 class="page-title">Scenarios</h1>
        <button class="btn btn-primary" onClick={() => setShowForm(!showForm())}>
          {() => showForm() ? 'Cancel' : 'Add Scenario'}
        </button>
      </div>

      {() => showForm() && (
        <form class="scenario-form card" onSubmit={handleCreate}>
          <h2 class="card-title">New Scenario</h2>

          {() => formError() && <p class="form-error">{formError()}</p>}

          <div class="form-field">
            <label>Name *</label>
            <input
              type="text"
              value={formName()}
              onInput={(e: InputEvent) => setFormName((e.target as HTMLInputElement).value)}
              placeholder="e.g. High-reach awareness"
            />
          </div>

          <div class="form-field">
            <label>Budget (USD) *</label>
            <input
              type="number"
              value={formBudget()}
              onInput={(e: InputEvent) => setFormBudget((e.target as HTMLInputElement).value)}
              placeholder="500"
              min="1"
              step="0.01"
            />
          </div>

          <div class="form-field">
            <label>Description</label>
            <textarea
              value={formDesc()}
              onInput={(e: InputEvent) => setFormDesc((e.target as HTMLTextAreaElement).value)}
              placeholder="Briefly describe this scenario's strategy"
              rows={3}
            />
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" disabled={saving()}>
              {() => saving() ? 'Saving…' : 'Create Scenario'}
            </button>
          </div>
        </form>
      )}

      {() => {
        const loading = workflowStore.scenLoading();
        const error   = workflowStore.scenError();
        const items   = workflowStore.scenarios();

        if (loading) return <div class="page-loading">Loading scenarios…</div>;
        if (error)   return <div class="page-error">{error}</div>;
        if (items.length === 0) {
          return (
            <div class="page-empty">
              No scenarios yet. Add your first scenario to start planning.
            </div>
          );
        }

        return (
          <div class="scenarios-grid">
            {items.map(scenario => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                isSelected={scenario.status === 'selected'}
                onSelect={() => scenarioService.select(scenario.id)}
                onDelete={() => scenarioService.delete(scenario.id)}
              />
            ))}
          </div>
        );
      }}
    </div>
  );
}
