import { createSignal } from '@awc/kettlejs';
import { useNavigate } from '@awc/kettlejs/router';
import { campaignService } from '../../../../domain/campaigns/campaign.service.js';
import { campaignStore } from '../../../../domain/campaigns/campaign.store.js';
import { Button } from '../../../../shared/components/ui/Button.js';
import { Card } from '../../../../shared/components/ui/Card.js';
import type { CreateCampaignInput, CampaignObjective, BudgetType } from '../../../../domain/campaigns/campaign.model.js';
import { ROUTES } from '../../../../config/constants.js';

export default function NewCampaignPage() {
  const navigate = useNavigate();

  const [name,       setName]       = createSignal('');
  const [objective,  setObjective]  = createSignal<CampaignObjective>('awareness');
  const [budget,     setBudget]     = createSignal(0);
  const [budgetType, setBudgetType] = createSignal<BudgetType>('daily');
  const [startDate,  setStartDate]  = createSignal('');
  const [endDate,    setEndDate]    = createSignal('');

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const input: CreateCampaignInput = {
      name:       name(),
      objective:  objective(),
      budget:     budget(),
      budgetType: budgetType(),
      startDate:  startDate(),
      endDate:    endDate() || undefined,
    };

    try {
      const c = await campaignService.create(input);
      navigate(`${ROUTES.campaigns}/${c.id}`, { replace: true });
    } catch {
      // error shown via campaignStore.error
    }
  };

  return (
    <div class="page page-new-campaign">
      <div class="page-header">
        <button class="btn btn-ghost btn-sm" type="button" onClick={() => navigate(ROUTES.campaigns)}>
          ← Back
        </button>
        <h1 class="page-title">New Campaign</h1>
      </div>

      <Card title="Campaign details">
        <form class="form" onSubmit={handleSubmit}>
          {() => campaignStore.error() && (
            <div class="form-error" role="alert">{campaignStore.error()}</div>
          )}

          <div class="form-group">
            <label class="form-label" htmlFor="name">Campaign name</label>
            <input
              id="name"
              class="form-input"
              type="text"
              placeholder="e.g. Summer Sale 2025"
              required
              value={name()}
              onInput={(e: InputEvent) => setName((e.target as HTMLInputElement).value)}
            />
          </div>

          <div class="form-group">
            <label class="form-label" htmlFor="objective">Objective</label>
            <select
              id="objective"
              class="form-select"
              value={objective()}
              onChange={(e: Event) => setObjective((e.target as HTMLSelectElement).value as CampaignObjective)}
            >
              <option value="awareness">Brand Awareness</option>
              <option value="traffic">Traffic</option>
              <option value="conversions">Conversions</option>
              <option value="leads">Lead Generation</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" htmlFor="budget">Budget</label>
              <input
                id="budget"
                class="form-input"
                type="number"
                min="1"
                step="0.01"
                required
                value={budget()}
                onInput={(e: InputEvent) => setBudget(Number((e.target as HTMLInputElement).value))}
              />
            </div>
            <div class="form-group">
              <label class="form-label" htmlFor="budgetType">Budget type</label>
              <select
                id="budgetType"
                class="form-select"
                value={budgetType()}
                onChange={(e: Event) => setBudgetType((e.target as HTMLSelectElement).value as BudgetType)}
              >
                <option value="daily">Daily</option>
                <option value="lifetime">Lifetime</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" htmlFor="startDate">Start date</label>
              <input
                id="startDate"
                class="form-input"
                type="date"
                required
                value={startDate()}
                onInput={(e: InputEvent) => setStartDate((e.target as HTMLInputElement).value)}
              />
            </div>
            <div class="form-group">
              <label class="form-label" htmlFor="endDate">End date (optional)</label>
              <input
                id="endDate"
                class="form-input"
                type="date"
                value={endDate()}
                onInput={(e: InputEvent) => setEndDate((e.target as HTMLInputElement).value)}
              />
            </div>
          </div>

          <div class="form-actions">
            <Button
              label="Cancel"
              variant="secondary"
              type="button"
              onClick={() => navigate(ROUTES.campaigns)}
            />
            <Button
              label="Create Campaign"
              variant="primary"
              type="submit"
              loading={campaignStore.loading()}
            />
          </div>
        </form>
      </Card>
    </div>
  );
}
