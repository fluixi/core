import type { WorkflowScenario } from '../../../domain/workflow/workflow.model.js';
import { fmtCurrency, fmtCompact } from '../../utils/format.js';

interface Props {
  scenario:   WorkflowScenario;
  isSelected: boolean;
  onSelect:   () => void;
  onDelete:   () => void;
}

const BID_LABELS: Record<string, string> = {
  TARGET_CPA:            'Target CPA',
  TARGET_ROAS:           'Target ROAS',
  MAXIMIZE_CONVERSIONS:  'Max Conversions',
  MANUAL_CPC:            'Manual CPC',
};

export function ScenarioCard({ scenario, isSelected, onSelect, onDelete }: Props) {
  return (
    <div class={`scenario-card card${isSelected ? ' scenario-card--selected' : ''}`}>
      <div class="scenario-card-header">
        <div class="scenario-card-title-row">
          <h3 class="scenario-card-name">{scenario.name}</h3>
          <span class={`status-badge status-badge--${scenario.status}`}>
            {scenario.status}
          </span>
        </div>
        {isSelected && (
          <span class="scenario-selected-badge" aria-label="Selected scenario">
            Selected
          </span>
        )}
      </div>

      {scenario.description && (
        <p class="scenario-description">{scenario.description}</p>
      )}

      <dl class="scenario-metrics">
        <div class="metric-item">
          <dt>Budget</dt>
          <dd>{fmtCurrency(scenario.budget)}</dd>
        </div>
        <div class="metric-item">
          <dt>Bid Strategy</dt>
          <dd>{BID_LABELS[scenario.bidStrategy] ?? scenario.bidStrategy}</dd>
        </div>
        <div class="metric-item">
          <dt>Est. Reach</dt>
          <dd>{fmtCompact(scenario.expectedReach)}</dd>
        </div>
        <div class="metric-item">
          <dt>Est. Clicks</dt>
          <dd>{fmtCompact(scenario.expectedClicks)}</dd>
        </div>
        <div class="metric-item">
          <dt>Est. Conversions</dt>
          <dd>{fmtCompact(scenario.expectedConversions)}</dd>
        </div>
        {scenario.score > 0 && (
          <div class="metric-item">
            <dt>Score</dt>
            <dd>{scenario.score.toFixed(1)}</dd>
          </div>
        )}
      </dl>

      {Object.keys(scenario.targetAudience ?? {}).length > 0 && (
        <div class="scenario-audience">
          <span class="audience-label">Audience:</span>
          {scenario.targetAudience.locations?.length && (
            <span class="audience-tag">{scenario.targetAudience.locations.join(', ')}</span>
          )}
          {scenario.targetAudience.ageRanges?.length && (
            <span class="audience-tag">{scenario.targetAudience.ageRanges.join(', ')}</span>
          )}
          {scenario.targetAudience.genders?.length && (
            <span class="audience-tag">{scenario.targetAudience.genders.join(', ')}</span>
          )}
        </div>
      )}

      <div class="scenario-card-actions">
        {!isSelected && scenario.status !== 'rejected' && (
          <button class="btn btn-primary btn-sm" onClick={onSelect}>
            Select
          </button>
        )}
        <button class="btn btn-ghost btn-sm btn-danger" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}
