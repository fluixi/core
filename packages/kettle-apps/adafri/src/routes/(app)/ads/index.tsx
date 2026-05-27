import { createEffect } from '@awc/kettlejs';
import { adService } from '../../../domain/ads/ad.service.js';
import { adStore } from '../../../domain/ads/ad.store.js';
import { Table, type Column } from '../../../shared/components/ui/Table.js';
import { StatusBadge } from '../../../shared/components/ui/Badge.js';
import { fmtCurrency, fmtCompact, fmtPercent } from '../../../shared/utils/format.js';
import type { Ad } from '../../../domain/ads/ad.model.js';

const COLUMNS: Column<Ad>[] = [
  { key: 'name',        header: 'Ad',          render: a => a.name, width: '20%' },
  { key: 'format',      header: 'Format',      render: a => a.format },
  { key: 'status',      header: 'Status',      render: a => <StatusBadge status={a.status} /> },
  { key: 'headline',    header: 'Headline',    render: a => a.headline, width: '20%' },
  { key: 'spend',       header: 'Spend',       render: a => fmtCurrency(a.spend),      align: 'right' },
  { key: 'impressions', header: 'Impressions', render: a => fmtCompact(a.impressions), align: 'right' },
  { key: 'clicks',      header: 'Clicks',      render: a => fmtCompact(a.clicks),      align: 'right' },
  { key: 'ctr',         header: 'CTR',         render: a => fmtPercent(a.ctr),         align: 'right' },
  { key: 'cpc',         header: 'CPC',         render: a => fmtCurrency(a.cpc),        align: 'right' },
];

export default function AdsPage() {
  createEffect(() => {
    adService.list({ limit: 20 });
  });

  return (
    <div class="page page-ads">
      <div class="page-header">
        <h1 class="page-title">Ads</h1>
      </div>

      {() => (
        <Table<Ad>
          columns={COLUMNS}
          rows={adStore.items()}
          keyField="id"
          loading={adStore.loading()}
          empty="No ads found."
        />
      )}
    </div>
  );
}
