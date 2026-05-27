import { useEffect } from '@awc/kettlejs';
import { useParams, useNavigate } from '@awc/kettlejs/router';
import { adGroupService } from '../../../../../../domain/adgroups/adgroup.service.js';
import { adGroupStore } from '../../../../../../domain/adgroups/adgroup.store.js';
import { adService } from '../../../../../../domain/ads/ad.service.js';
import { adStore } from '../../../../../../domain/ads/ad.store.js';
import { Table, type Column } from '../../../../../../shared/components/ui/Table.js';
import { StatusBadge } from '../../../../../../shared/components/ui/Badge.js';
import { Button } from '../../../../../../shared/components/ui/Button.js';
import { Card } from '../../../../../../shared/components/ui/Card.js';
import { PageSpinner } from '../../../../../../shared/components/ui/Spinner.js';
import { fmtCurrency, fmtCompact, fmtPercent } from '../../../../../../shared/utils/format.js';
import type { Ad } from '../../../../../../domain/ads/ad.model.js';
import { adGroupsUrl, adsUrl } from '../../../../../../config/constants.js';

const AD_COLS: Column<Ad>[] = [
  { key: 'name',        header: 'Ad',          render: a => a.name, width: '30%' },
  { key: 'format',      header: 'Format',      render: a => a.format },
  { key: 'status',      header: 'Status',      render: a => <StatusBadge status={a.status} /> },
  { key: 'spend',       header: 'Spend',       render: a => fmtCurrency(a.spend),      align: 'right' },
  { key: 'impressions', header: 'Impressions', render: a => fmtCompact(a.impressions), align: 'right' },
  { key: 'clicks',      header: 'Clicks',      render: a => fmtCompact(a.clicks),      align: 'right' },
  { key: 'ctr',         header: 'CTR',         render: a => fmtPercent(a.ctr),         align: 'right' },
];

export default function AdGroupDetailPage() {
  const params   = useParams<{ id: string; gid: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    adGroupService.get(params().gid);
    adService.listByAdGroup(params().gid);
  });

  const group = () => adGroupStore.selected();

  return (
    <div class="flex-1 overflow-y-auto bg-app">
      <div class="max-w-6xl mx-auto px-8 py-8">
        {() => adGroupStore.loading() && !group()
          ? <PageSpinner />
          : !group()
          ? (
            <div class="flex flex-col items-center justify-center py-20 text-center">
              <p class="text-body text-muted">Ad group not found.</p>
              <button
                class="btn btn-secondary btn-sm mt-4"
                onClick={() => navigate(adGroupsUrl(params().id))}
              >
                ← Back to Ad Groups
              </button>
            </div>
          )
          : (
            <>
              <div class="flex items-center gap-3 mb-7">
                <button
                  class="btn btn-ghost btn-sm"
                  onClick={() => navigate(adGroupsUrl(params().id))}
                >
                  ← Ad Groups
                </button>
                <div class="flex items-center gap-2">
                  <h1 class="text-title text-default">{group()!.name}</h1>
                  <StatusBadge status={group()!.status} />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4 mb-6">
                <Card title="Budget & Bidding">
                  <dl class="detail-list">
                    <dt>Budget</dt>  <dd>{fmtCurrency(group()!.budget)}</dd>
                    <dt>Bid</dt>     <dd>{fmtCurrency(group()!.bid)}</dd>
                  </dl>
                </Card>
                <Card title="Performance">
                  <dl class="detail-list">
                    <dt>Spend</dt>       <dd>{fmtCurrency(group()!.spend)}</dd>
                    <dt>Impressions</dt> <dd>{fmtCompact(group()!.impressions)}</dd>
                    <dt>Clicks</dt>      <dd>{fmtCompact(group()!.clicks)}</dd>
                    <dt>CTR</dt>         <dd>{fmtPercent(group()!.ctr)}</dd>
                  </dl>
                </Card>
              </div>

              <Card
                title="Ads"
                actions={
                  <Button
                    label="View All Ads"
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(adsUrl(params().id, params().gid))}
                  />
                }
              >
                {() => (
                  <Table<Ad>
                    columns={AD_COLS}
                    rows={adStore.items()}
                    keyField="id"
                    loading={adStore.loading()}
                    empty="No ads yet."
                  />
                )}
              </Card>
            </>
          )
        }
      </div>
    </div>
  );
}
