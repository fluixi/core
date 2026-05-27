import { apiClient } from '../../infrastructure/api/client.js';
import { metricsStore } from './metrics.store.js';
import type { MetricSeries, DashboardSummary, MetricsQueryParams } from './metrics.model.js';

async function withLoading<T>(fn: () => Promise<T>): Promise<T> {
  metricsStore.setLoading(true);
  metricsStore.setError(null);
  try {
    return await fn();
  } catch (err) {
    metricsStore.setError((err as Error).message);
    throw err;
  } finally {
    metricsStore.setLoading(false);
  }
}

export const metricsService = {
  getDashboardSummary(params: Pick<MetricsQueryParams, 'from' | 'to'>) {
    return withLoading(async () => {
      const summary = await apiClient.get<DashboardSummary>('/v1/metrics/summary', params);
      metricsStore.setSummary(summary);
      return summary;
    });
  },

  getSeries(params: MetricsQueryParams) {
    return withLoading(async () => {
      const series = await apiClient.get<MetricSeries[]>('/v1/metrics/series', {
        ...params,
        ids: params.ids?.join(','),
      } as Record<string, unknown>);
      metricsStore.setSeries(series);
      return series;
    });
  },

  getCampaignMetrics(campaignId: string, params: Pick<MetricsQueryParams, 'from' | 'to' | 'granularity'>) {
    return this.getSeries({
      ...params,
      dimension: 'campaign',
      ids: [campaignId],
    });
  },
} as const;
