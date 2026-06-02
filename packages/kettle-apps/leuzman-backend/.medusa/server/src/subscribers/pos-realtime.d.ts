/**
 * POS real-time event subscriber.
 *
 * Listens to Medusa internal events and:
 *   1. Broadcasts via SSE to connected POS clients (broadcastPosEvent)
 *   2. Buffers for polling clients (enqueueEvent)
 */
import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
export default function posOrderSubscriber({ event: { name, data }, }: SubscriberArgs<any>): Promise<void>;
export declare const config: SubscriberConfig;
