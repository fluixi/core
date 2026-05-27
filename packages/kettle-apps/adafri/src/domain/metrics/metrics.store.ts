import { createSignal, createMemo } from '@awc/kettlejs';
import type { MetricSeries, DashboardSummary } from './metrics.model.js';

const [_series,  _setSeries]  = createSignal<MetricSeries[]>([]);
const [_summary, _setSummary] = createSignal<DashboardSummary | null>(null);
const [_loading, _setLoading] = createSignal(false);
const [_error,   _setError]   = createSignal<string | null>(null);

export const metricsStore = {
  series:  _series,
  summary: _summary,
  loading: _loading,
  error:   _error,

  hasSummary: createMemo(() => _summary() !== null),

  seriesById: (id: string) =>
    createMemo(() => _series().find(s => s.id === id) ?? null),

  setSeries:  _setSeries,
  setSummary: _setSummary,
  setLoading: _setLoading,
  setError:   _setError,

  clear(): void {
    _setSeries([]);
    _setSummary(null);
  },
} as const;
