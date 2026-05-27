import { Queue, QueueEvents, Worker, type ConnectionOptions, type WorkerOptions } from 'bullmq'
import type { BaseJobPayload, OfflineReplayPayload } from '@leuzman/shared-types'

// ─── All queue names ──────────────────────────────────────────────────────────
export const QUEUES = {
  // ERP sync queues
  ERP_PRODUCT:       'erp:product',
  ERP_INVENTORY:     'erp:inventory',
  ERP_ORDER:         'erp:order',
  ERP_CUSTOMER:      'erp:customer',
  ERP_INVOICE:       'erp:invoice',
  ERP_WAREHOUSE:     'erp:warehouse',
  ERP_RECONCILE:     'erp:reconcile',
  ERP_DLQ:           'erp:dlq',

  // POS queues
  POS_OFFLINE_REPLAY: 'pos:offline-replay',
  POS_SESSION_CLOSE:  'pos:session-close',

  // Barcode queues
  BARCODE_CACHE:      'barcode:cache',
  BARCODE_SCAN_LOG:   'barcode:scan-log',

  // Warehouse queues
  WH_SYNC:            'warehouse:sync',
  WH_RECONCILE:       'warehouse:reconcile',
} as const

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES]

// ─── Default job options ───────────────────────────────────────────────────────
export const DEFAULT_JOB_OPTIONS = {
  attempts:         3,
  backoff:          { type: 'exponential' as const, delay: 2_000 },
  removeOnComplete: 200,
  removeOnFail:     100,
}

// ─── Redis connection factory ──────────────────────────────────────────────────
export function buildRedisConnection(redisUrl?: string): ConnectionOptions {
  const url = new URL(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379')
  return {
    host:     url.hostname,
    port:     Number(url.port) || 6379,
    password: url.password || undefined,
    tls:      url.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,  // required for BullMQ
  }
}

// ─── Queue registry ────────────────────────────────────────────────────────────
export class QueueRegistry {
  private queues = new Map<QueueName, Queue>()
  private connection: ConnectionOptions

  constructor(redisUrl?: string) {
    this.connection = buildRedisConnection(redisUrl)
  }

  get(name: QueueName): Queue {
    if (!this.queues.has(name)) {
      this.queues.set(name, new Queue(name, { connection: this.connection }))
    }
    return this.queues.get(name)!
  }

  getAll(): Map<QueueName, Queue> {
    // Lazily ensure all queues are created
    for (const name of Object.values(QUEUES)) {
      this.get(name as QueueName)
    }
    return this.queues
  }

  async enqueue<T extends Record<string, unknown>>(
    queue: QueueName,
    jobName: string,
    data: T,
    opts?: { jobId?: string; delay?: number; priority?: number },
  ): Promise<void> {
    await this.get(queue).add(jobName, data, {
      ...DEFAULT_JOB_OPTIONS,
      jobId:    opts?.jobId,
      delay:    opts?.delay,
      priority: opts?.priority,
    })
  }

  async enqueueToDLQ(
    originalQueue: QueueName,
    jobName: string,
    data: Record<string, unknown>,
    error: string,
  ): Promise<void> {
    await this.get(QUEUES.ERP_DLQ).add(`dlq:${jobName}`, {
      original_queue: originalQueue,
      original_data:  data,
      error_message:  error,
      failed_at:      new Date().toISOString(),
    }, { ...DEFAULT_JOB_OPTIONS, attempts: 1 })
  }

  async close(): Promise<void> {
    await Promise.all([...this.queues.values()].map(q => q.close()))
  }
}

// ─── Queue health helper ───────────────────────────────────────────────────────
export async function getQueueHealth(registry: QueueRegistry) {
  const health = []
  for (const [name, queue] of registry.getAll()) {
    const [waiting, active, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ])
    health.push({ name, waiting, active, failed, delayed })
  }
  return health
}

// Exports for consumers
export { Queue, Worker, QueueEvents, type ConnectionOptions, type WorkerOptions }
