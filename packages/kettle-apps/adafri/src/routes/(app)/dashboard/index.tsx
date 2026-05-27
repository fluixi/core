import { createSignal, createEffect, useEffect } from '@awc/kettlejs';
import { metricsService } from '../../../domain/metrics/metrics.service.js';
import { metricsStore } from '../../../domain/metrics/metrics.store.js';
import { campaignService } from '../../../domain/campaigns/campaign.service.js';
import { campaignStore } from '../../../domain/campaigns/campaign.store.js';
import { KPICard } from '../../../shared/components/charts/KPICard.js';
import { LineChart } from '../../../shared/components/charts/LineChart.js';
import { PageSpinner } from '../../../shared/components/ui/Spinner.js';
import { fmtCurrency, fmtCompact, fmtPercent } from '../../../shared/utils/format.js';

function last30Days(): { from: string; to: string } {
  const to   = new Date();
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString().slice(0, 10),
    to:   to.toISOString().slice(0, 10),
  };
}
export const routeData = (args: any) => {
  console.log('on route data index')
    return {
        title: 'Workspace',
    };
}

export default function DashboardPage() {
  const [range] = createSignal(last30Days());

  useEffect(() => {
    const { from, to } = range();
    metricsService.getDashboardSummary({ from, to });
    metricsService.getSeries({ from, to, dimension: 'campaign', granularity: 'day' });
    campaignService.list({ limit: 5, status: 'active' });
  });

  return (
    <div class="flex-1 overflow-y-auto bg-app">
      <div class="max-w-6xl mx-auto px-8 py-8">
        <div class="mb-7">
          <h1 class="text-title text-default">Dashboard</h1>
          <p class="text-body text-muted mt-0.5">Last 30 days overview</p>
        </div>

        {() => metricsStore.loading()
          ? <PageSpinner />
          : (
            <>
              <div class="grid grid-cols-3 gap-4 mb-6">
                <KPICard
                  label="Total Spend"
                  value={fmtCurrency(metricsStore.summary()?.totalSpend ?? 0)}
                  trend={metricsStore.summary()?.spendTrend}
                  icon="💰"
                />
                <KPICard
                  label="Impressions"
                  value={fmtCompact(metricsStore.summary()?.totalImpressions ?? 0)}
                  trend={metricsStore.summary()?.impressionTrend}
                  icon="👁️"
                />
                <KPICard
                  label="Clicks"
                  value={fmtCompact(metricsStore.summary()?.totalClicks ?? 0)}
                  trend={metricsStore.summary()?.clickTrend}
                  icon="👆"
                />
                <KPICard
                  label="Conversions"
                  value={fmtCompact(metricsStore.summary()?.totalConversions ?? 0)}
                  trend={metricsStore.summary()?.conversionTrend}
                  icon="🎯"
                />
                <KPICard
                  label="Avg CTR"
                  value={fmtPercent(metricsStore.summary()?.avgCTR ?? 0)}
                  icon="📈"
                />
                <KPICard
                  label="Avg ROAS"
                  value={`${(metricsStore.summary()?.avgROAS ?? 0).toFixed(2)}x`}
                  icon="🔄"
                />
              </div>

              <div class="bg-surface border border-subtle rounded-lg p-5 mb-6">
                <h2 class="text-heading text-default mb-4">Spend over time</h2>
                <LineChart
                  data={metricsStore.series()[0]?.points ?? []}
                  metric="spend"
                  color="#6366f1"
                />
              </div>

              <div class="bg-surface border border-subtle rounded-lg p-5">
                <h2 class="text-heading text-default mb-4">Active Campaigns</h2>
                {() => campaignStore.loading()
                  ? <PageSpinner />
                  : (
                    <ul class="space-y-2">
                      {() => campaignStore.active().map(c => (
                        <li key={c.id} class="flex items-center justify-between py-2 border-b border-subtle last:border-0">
                          <span class="text-body text-default">{c.name}</span>
                          <span class="text-body-sm text-muted">{fmtCurrency(c.spend)}</span>
                        </li>
                      ))}
                    </ul>
                  )
                }
              </div>
            </>
          )
        }
      </div>
    </div>
  );
}
