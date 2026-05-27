import { createSignal, useRef } from '@awc/kettlejs';
import { ScenarioCard } from '../../../../shared/components/workflow/ScenarioCard.jsx';
import type { CreateScenarioInput } from '../../../../domain/workflow/workflow.model.js';
import { useWorkspaceService } from '../../../../domain/workflow/service.context.js';
import Card from '../../../../shared/components/ui/webcomponents/card.jsx';
import Button from '../../../../shared/components/ui/webcomponents/button.jsx';
import Input from '../../../../shared/components/ui/webcomponents/input.jsx';

export default function WorkspaceScenariosPage() {
  const service = useWorkspaceService()!;
  const { workflowStore, scenarioActions } = service;

  const [showForm,   setShowForm]   = createSignal(false);
  const [formName,   setFormName]   = createSignal('');
  const [formBudget, setFormBudget] = createSignal('');
  const [formDesc,   setFormDesc]   = createSignal('');
  const [saving,     setSaving]     = createSignal(false);
  const [formError,  setFormError]  = createSignal<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null)

  async function handleCreate(e: Event) {
    e.preventDefault();
    const ws = workflowStore.activeWorkspace();
    if (!ws) return;

    const name   = formName().trim();
    const budget = parseFloat(formBudget());

    if (!name)                        { setFormError('Name is required'); return; }
    if (isNaN(budget) || budget <= 0) { setFormError('Enter a valid budget'); return; }

    setFormError(null);
    setSaving(true);
    const input: CreateScenarioInput = { workspaceId: ws.id, name, description: formDesc(), budget };

    try {
      await scenarioActions.create(input);
      setShowForm(false);
      setFormName(''); setFormBudget(''); setFormDesc('');
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div class="flex-1 overflow-y-auto">
      <div class="max-w-4xl mx-auto px-8 py-8">

        {/* Page header */}
        <div class="flex items-center justify-between mb-7">
          <div>
            <h1 class="text-title text-default">Scenarios</h1>
            <p class="text-body text-muted mt-0.5">Plan and compare different campaign approaches</p>
          </div>
          <Button 
          color={"primary"} 
          size={"sm"} 
          label={()=>showForm() ? 'Cancel' : '+ Add Scenario'}
           onClick={() => setShowForm(!showForm())} />
        </div>

        {/* Create form */}
        {() => showForm() && (
          <Card>
            <Card.Header>
              <h2 class="text-heading text-default mb-5">New Scenario</h2>
            </Card.Header>
            <Card.Body>
              <form onSubmit={handleCreate} class="space-y-4 w-100" ref={formRef}>

                {() => formError() && (
                  <div class="flex items-center gap-2 px-4 py-3 bg-[var(--color-danger)]/5 border border-[var(--color-danger)]/20 rounded text-body-sm text-danger">
                    ⚠ {formError()}
                  </div>
                )}

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="form-label block mb-1.5">Name *</label>
                    <Input
                      type="text"
                      size="md"
                      value={formName}
                      onChange={(e) => setFormName(e.value)}
                      placeholder="e.g. High-reach awareness"
                    />
                  </div>
                  <div>
                    <label class="form-label block mb-1.5">Budget (USD) *</label>
                    <Input
                      type="number"
                      size="md"
                      value={formBudget}
                      onChange={(e) => setFormBudget(e.value)}
                      placeholder="500"
                      min={1}
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label class="form-label block mb-1.5">Description</label>
                  <Input
                    mode={"textarea"}
                    size="md"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.value)}
                    placeholder="Briefly describe this scenario's strategy…"
                    rows={3}
                  />
                </div>

                <div class="form-actions">
                  {/* <button type='submit'>Sumbit</button> */}
                  <Button 
                    color={"primary"} 
                    size={"sm"} 
                    disabled={saving}
                    type={"submit"}
                    label={()=>saving() ? 'Creating…' : 'Create Scenario'}/>
                </div>
              </form>
            </Card.Body>
          </Card>
        )}
          {/* <div class="bg-surface border border-subtle rounded-lg shadow-sm p-6 mb-6">
            <h2 class="text-heading text-default mb-5">New Scenario</h2>
          </div> */}

        {/* Scenarios list */}
        {() => {
          const loading = workflowStore.scenLoading();
          const error   = workflowStore.scenError();
          const items   = workflowStore.scenarios();

          if (loading) return (
            <div class="space-y-3">
              {[1, 2].map(i => (
                <div key={i} class="h-24 bg-surface border border-subtle rounded-lg animate-pulse" />
              ))}
            </div>
          );

          if (error) return (
            <div class="bg-[var(--color-danger)]/5 border border-[var(--color-danger)]/20 rounded-lg p-5 text-body-sm text-danger">{error}</div>
          );

          if (!items.length) return (
            <div class="flex flex-col items-center justify-center py-20 text-center">
              <span class="text-3xl mb-3 opacity-40">🎯</span>
              <p class="text-body font-medium text-default">No scenarios yet</p>
              <p class="text-caption text-muted mt-1 mb-5">Add your first scenario to start planning your campaign strategy</p>
              <Button 
                color="primary" 
                size="sm" 
                label={"+ Add Scenario"} 
                onClick={() => setShowForm(true)} />
            </div>
          );

          return (
            <div class="space-y-3">
              {items.map(scenario => (
                <ScenarioCard
                  // key={scenario.id}
                  scenario={scenario}
                  isSelected={scenario.status === 'selected'}
                  onSelect={() => scenarioActions.select(scenario.id)}
                  onDelete={() => scenarioActions.delete(scenario.id)}
                />
              ))}
            </div>
          );
        }}
      </div>
    </div>
  );
}
