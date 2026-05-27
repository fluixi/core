import { useEffect } from '@awc/kettlejs';
import { useParams, useNavigate } from '@awc/kettlejs/router';
import { adGroupService } from '../../../../../domain/adgroups/adgroup.service.js';
import { adGroupStore } from '../../../../../domain/adgroups/adgroup.store.js';
import { Table, type Column } from '../../../../../shared/components/ui/Table.js';
import { StatusBadge } from '../../../../../shared/components/ui/Badge.js';
import { Button } from '../../../../../shared/components/ui/Button.js';
import { fmtCurrency, fmtCompact, fmtPercent } from '../../../../../shared/utils/format.js';
import type { AdGroup } from '../../../../../domain/adgroups/adgroup.model.js';
import { campaignUrl, adGroupUrl } from '../../../../../config/constants.js';

const COLUMNS: Column<AdGroup>[] = [
  { key: 'name',        header: 'Ad Group',    render: g => g.name, width: '30%' },
  { key: 'status',      header: 'Status',      render: g => <StatusBadge status={g.status} /> },
  { key: 'budget',      header: 'Budget',      render: g => fmtCurrency(g.budget),     align: 'right' },
  { key: 'bid',         header: 'Bid',         render: g => fmtCurrency(g.bid),        align: 'right' },
  { key: 'spend',       header: 'Spend',       render: g => fmtCurrency(g.spend),      align: 'right' },
  { key: 'impressions', header: 'Impressions', render: g => fmtCompact(g.impressions), align: 'right' },
  { key: 'ctr',         header: 'CTR',         render: g => fmtPercent(g.ctr),         align: 'right' },
];

export default function CampaignAdGroupsPage() {
  const params   = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    adGroupService.listByCampaign(params().id);
  });

  return (
    <div class="flex-1 overflow-y-auto bg-app">
      <div class="max-w-6xl mx-auto px-8 py-8">
        <div class="flex items-center justify-between mb-7">
          <div class="flex items-center gap-3">
            <button
              class="btn btn-ghost btn-sm"
              onClick={() => navigate(campaignUrl(params().id))}
            >
              ← Campaign
            </button>
            <h1 class="text-title text-default">Ad Groups</h1>
          </div>
          <Button
            label="New Ad Group"
            variant="primary"
            onClick={() => navigate(`/campaigns/${params().id}/adgroups/new`)}
          />
        </div>

        {() => (
          <Table<AdGroup>
            columns={COLUMNS}
            rows={adGroupStore.items()}
            keyField="id"
            loading={adGroupStore.loading()}
            empty="No ad groups yet. Create your first one!"
            onRowClick={g => navigate(adGroupUrl(params().id, g.id))}
          />
        )}
      </div>
    </div>
  );
}
