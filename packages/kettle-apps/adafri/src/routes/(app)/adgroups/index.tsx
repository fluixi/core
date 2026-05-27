import { createEffect } from '@awc/kettlejs';
import { useNavigate } from '@awc/kettlejs/router';
import { adGroupService } from '../../../domain/adgroups/adgroup.service.js';
import { adGroupStore } from '../../../domain/adgroups/adgroup.store.js';
import { Table, type Column } from '../../../shared/components/ui/Table.js';
import { StatusBadge } from '../../../shared/components/ui/Badge.js';
import { fmtCurrency, fmtCompact, fmtPercent } from '../../../shared/utils/format.js';
import type { AdGroup } from '../../../domain/adgroups/adgroup.model.js';
import { ROUTES } from '../../../config/constants.js';

const COLUMNS: Column<AdGroup>[] = [
  { key: 'name',        header: 'Ad Group',    render: g => g.name, width: '25%' },
  { key: 'status',      header: 'Status',      render: g => <StatusBadge status={g.status} /> },
  { key: 'budget',      header: 'Budget',      render: g => fmtCurrency(g.budget),     align: 'right' },
  { key: 'bid',         header: 'Bid',         render: g => fmtCurrency(g.bid),        align: 'right' },
  { key: 'spend',       header: 'Spend',       render: g => fmtCurrency(g.spend),      align: 'right' },
  { key: 'impressions', header: 'Impressions', render: g => fmtCompact(g.impressions), align: 'right' },
  { key: 'clicks',      header: 'Clicks',      render: g => fmtCompact(g.clicks),      align: 'right' },
  { key: 'ctr',         header: 'CTR',         render: g => fmtPercent(g.ctr),         align: 'right' },
];

export default function AdGroupsPage() {
  const navigate = useNavigate();

  createEffect(() => {
    adGroupService.list({ limit: 20 });
  });

  return (
    <div class="page page-adgroups">
      <div class="page-header">
        <h1 class="page-title">Ad Groups</h1>
      </div>

      {() => (
        <Table<AdGroup>
          columns={COLUMNS}
          rows={adGroupStore.items()}
          keyField="id"
          loading={adGroupStore.loading()}
          empty="No ad groups found."
          onRowClick={g => navigate(`${ROUTES.campaigns}/${g.campaignId}`)}
        />
      )}
    </div>
  );
}
