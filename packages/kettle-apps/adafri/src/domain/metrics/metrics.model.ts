export type MetricGranularity = 'hour' | 'day' | 'week' | 'month';
export type MetricDimension   = 'campaign' | 'adgroup' | 'ad' | 'placement' | 'device';

export interface MetricPoint {
  date:        string;
  impressions: number;
  clicks:      number;
  conversions: number;
  spend:       number;
  ctr:         number;
  cpc:         number;
  cpm:         number;
  roas:        number;
}

export interface MetricSeries {
  id:          string;
  name:        string;
  dimension:   MetricDimension;
  granularity: MetricGranularity;
  points:      MetricPoint[];
}

export interface MetricsQueryParams {
  from:         string;        // ISO date
  to:           string;        // ISO date
  granularity?: MetricGranularity;
  dimension?:   MetricDimension;
  ids?:         string[];      // filter by specific IDs
}

export interface DashboardSummary {
  totalSpend:       number;
  totalImpressions: number;
  totalClicks:      number;
  totalConversions: number;
  avgCTR:           number;
  avgCPC:           number;
  avgROAS:          number;
  spendTrend:       number;   // % change vs previous period
  impressionTrend:  number;
  clickTrend:       number;
  conversionTrend:  number;
}
