import { useEffect } from '@awc/kettlejs';
import { useParams, useNavigate } from '@awc/kettlejs/router';
import { adService } from '../../../../../../../domain/ads/ad.service.js';
import { adStore } from '../../../../../../../domain/ads/ad.store.js';
import { Table, type Column } from '../../../../../../../shared/components/ui/Table.js';
import { StatusBadge } from '../../../../../../../shared/components/ui/Badge.js';
import { fmtCurrency, fmtCompact, fmtPercent } from '../../../../../../../shared/utils/format.js';
import type { Ad } from '../../../../../../../domain/ads/ad.model.js';
import { adGroupUrl } from '../../../../../../../config/constants.js';

const COLUMNS: Column<Ad>[] = [
  { key: 'name',        header: 'Ad',          render: a => a.name, width: '25%' },
  { key: 'format',      header: 'Format',      render: a => a.format },
  { key: 'status',      header: 'Status',      render: a => <StatusBadge status={a.status} /> },
  { key: 'headline',    header: 'Headline',    render: a => a.headline, width: '25%' },
  { key: 'spend',       header: 'Spend',       render: a => fmtCurrency(a.spend),      align: 'right' },
  { key: 'impressions', header: 'Impressions', render: a => fmtCompact(a.impressions), align: 'right' },
  { key: 'clicks',      header: 'Clicks',      render: a => fmtCompact(a.clicks),      align: 'right' },
  { key: 'ctr',         header: 'CTR',         render: a => fmtPercent(a.ctr),         align: 'right' },
];

export default function AdGroupAdsPage() {
  const params   = useParams<{ id: string; gid: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    adService.listByAdGroup(params().gid);
  });

  return (
    <div class="flex-1 overflow-y-auto bg-app">
      <div class="max-w-6xl mx-auto px-8 py-8">
        <div class="flex items-center gap-3 mb-7">
          <button
            class="btn btn-ghost btn-sm"
            onClick={() => navigate(adGroupUrl(params().id, params().gid))}
          >
            ← Ad Group
          </button>
          <h1 class="text-title text-default">Ads</h1>
        </div>

        {() => (
          <Table<Ad>
            columns={COLUMNS}
            rows={adStore.items()}
            keyField="id"
            loading={adStore.loading()}
            empty="No ads yet."
          />
        )}
      </div>
    </div>
  );
}
