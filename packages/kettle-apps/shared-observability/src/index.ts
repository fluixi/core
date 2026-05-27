import pino, { Logger, LoggerOptions } from 'pino';
import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics as promCollectDefaultMetrics,
} from 'prom-client';
import type { SystemHealth, QueueHealth } from '@leuzman/shared-types';

// ─── Package metadata ─────────────────────────────────────────────────────────

const PKG_VERSION = '0.1.0';

// ─── Logger ───────────────────────────────────────────────────────────────────

export interface LoggerContext {
  [key: string]: unknown;
}

export interface AppLogger extends Logger {
  withContext: (ctx: LoggerContext) => AppLogger;
}

export interface CreateLoggerOptions {
  level?: string;
  prettyPrint?: boolean;
}

export function createLogger(name: string, opts: CreateLoggerOptions = {}): AppLogger {
  const isProduction = process.env['NODE_ENV'] === 'production';
  const level = opts.level ?? (isProduction ? 'info' : 'debug');

  const baseOptions: LoggerOptions = {
    level,
    base: {
      name,
      version: PKG_VERSION,
      env: process.env['NODE_ENV'] ?? 'development',
    },
  };

  const transport =
    !isProduction && opts.prettyPrint !== false
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          },
        }
      : {};

  const baseLogger = pino({ ...baseOptions, ...transport });

  function attachWithContext(logger: Logger): AppLogger {
    const appLogger = logger as AppLogger;
    appLogger.withContext = (ctx: LoggerContext): AppLogger => {
      return attachWithContext(logger.child(ctx));
    };
    return appLogger;
  }

  return attachWithContext(baseLogger);
}

// ─── Metrics registry ─────────────────────────────────────────────────────────

export const metricsRegistry = new Registry();

promCollectDefaultMetrics({ register: metricsRegistry });

// ─── Queue metrics ────────────────────────────────────────────────────────────

export interface QueueMetrics {
  jobProcessed: Counter<'status'>;
  jobDuration: Histogram<string>;
  jobRetries: Counter<string>;
}

export function createQueueMetrics(queueName: string): QueueMetrics {
  const sanitized = queueName.replace(/[^a-zA-Z0-9_]/g, '_');

  const jobProcessed = new Counter<'status'>({
    name: `leuzman_queue_${sanitized}_job_processed_total`,
    help: `Total number of processed jobs in queue ${queueName}`,
    labelNames: ['status'],
    registers: [metricsRegistry],
  });

  const jobDuration = new Histogram({
    name: `leuzman_queue_${sanitized}_job_duration_ms`,
    help: `Duration of job processing in queue ${queueName} (ms)`,
    buckets: [100, 250, 500, 1000, 2500, 5000, 10000, 30000],
    registers: [metricsRegistry],
  });

  const jobRetries = new Counter({
    name: `leuzman_queue_${sanitized}_job_retries_total`,
    help: `Total number of job retries in queue ${queueName}`,
    registers: [metricsRegistry],
  });

  return { jobProcessed, jobDuration, jobRetries };
}

// ─── ERP metrics ──────────────────────────────────────────────────────────────

export interface ErpMetrics {
  syncTotal: Counter<'entity_type' | 'direction' | 'status'>;
  syncDuration: Histogram<'entity_type'>;
  odooApiLatency: Histogram<'method'>;
  circuitBreakerState: Gauge<'service'>;
}

export function createErpMetrics(): ErpMetrics {
  const syncTotal = new Counter<'entity_type' | 'direction' | 'status'>({
    name: 'leuzman_erp_sync_total',
    help: 'Total number of ERP sync operations',
    labelNames: ['entity_type', 'direction', 'status'],
    registers: [metricsRegistry],
  });

  const syncDuration = new Histogram<'entity_type'>({
    name: 'leuzman_erp_sync_duration_ms',
    help: 'Duration of ERP sync operations (ms)',
    labelNames: ['entity_type'],
    buckets: [100, 250, 500, 1000, 2500, 5000, 10000, 30000],
    registers: [metricsRegistry],
  });

  const odooApiLatency = new Histogram<'method'>({
    name: 'leuzman_erp_odoo_api_latency_ms',
    help: 'Latency of Odoo API calls (ms)',
    labelNames: ['method'],
    buckets: [50, 100, 250, 500, 1000, 2500, 5000],
    registers: [metricsRegistry],
  });

  const circuitBreakerState = new Gauge<'service'>({
    name: 'leuzman_erp_circuit_breaker_state',
    help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
    labelNames: ['service'],
    registers: [metricsRegistry],
  });

  return { syncTotal, syncDuration, odooApiLatency, circuitBreakerState };
}

// ─── POS metrics ──────────────────────────────────────────────────────────────

export interface PosMetrics {
  transactionTotal: Counter<'status'>;
  offlineQueueSize: Gauge<string>;
  reconciliationDuration: Histogram<string>;
}

export function createPosMetrics(): PosMetrics {
  const transactionTotal = new Counter<'status'>({
    name: 'leuzman_pos_transaction_total',
    help: 'Total number of POS transactions',
    labelNames: ['status'],
    registers: [metricsRegistry],
  });

  const offlineQueueSize = new Gauge({
    name: 'leuzman_pos_offline_queue_size',
    help: 'Number of transactions pending offline replay',
    registers: [metricsRegistry],
  });

  const reconciliationDuration = new Histogram({
    name: 'leuzman_pos_reconciliation_duration_ms',
    help: 'Duration of POS session reconciliation (ms)',
    buckets: [500, 1000, 2500, 5000, 10000, 30000],
    registers: [metricsRegistry],
  });

  return { transactionTotal, offlineQueueSize, reconciliationDuration };
}

// ─── Prometheus scrape endpoint helper ───────────────────────────────────────

export async function getMetricsText(): Promise<string> {
  return metricsRegistry.metrics();
}

// ─── Health check ─────────────────────────────────────────────────────────────

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, { status: 'healthy' | 'unhealthy'; latencyMs: number }>;
  timestamp: string;
}

export async function healthCheck(
  checks: Record<string, () => Promise<boolean>>,
): Promise<HealthCheckResult> {
  const entries = Object.entries(checks);

  const results = await Promise.all(
    entries.map(async ([name, fn]): Promise<[string, { status: 'healthy' | 'unhealthy'; latencyMs: number }]> => {
      const start = Date.now();
      try {
        const ok = await fn();
        return [name, { status: ok ? 'healthy' : 'unhealthy', latencyMs: Date.now() - start }];
      } catch {
        return [name, { status: 'unhealthy', latencyMs: Date.now() - start }];
      }
    }),
  );

  const checksMap = Object.fromEntries(results) as Record<
    string,
    { status: 'healthy' | 'unhealthy'; latencyMs: number }
  >;

  const total = results.length;
  const healthy = results.filter(([, v]) => v.status === 'healthy').length;

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (healthy === total) {
    overallStatus = 'healthy';
  } else if (healthy === 0) {
    overallStatus = 'unhealthy';
  } else {
    overallStatus = 'degraded';
  }

  return {
    status: overallStatus,
    checks: checksMap,
    timestamp: new Date().toISOString(),
  };
}

// ─── Tracing shim ─────────────────────────────────────────────────────────────

const spanLogger = createLogger('span');

export async function createSpan<T>(
  name: string,
  attributes: Record<string, string>,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  spanLogger.info({ span: name, event: 'start', ...attributes });
  try {
    const result = await fn();
    const durationMs = Date.now() - start;
    spanLogger.info({ span: name, event: 'end', durationMs, ...attributes });
    return result;
  } catch (err) {
    const durationMs = Date.now() - start;
    spanLogger.error({ span: name, event: 'error', durationMs, err, ...attributes });
    throw err;
  }
}

// ─── Re-export shared-types used by this package ─────────────────────────────

export type { SystemHealth, QueueHealth };
