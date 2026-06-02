/**
 * POS real-time event subscriber.
 *
 * Listens to Medusa internal events and:
 *   1. Broadcasts via SSE to connected POS clients (broadcastPosEvent)
 *   2. Buffers for polling clients (enqueueEvent)
 */

import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework';
import { broadcastPosEvent } from '../api/pos/events/route';
import { enqueueEvent }     from '../api/pos/events/poll/route';

// ─── Order events ─────────────────────────────────────────────────────────────

export default async function posOrderSubscriber({
  event: { name, data },
}: SubscriberArgs<any>) {
  let posEvent: Record<string, unknown> | null = null;

  if (name === 'order.created' || name === 'order.placed') {
    posEvent = {
      type:       'order.created',
      id:         data?.id         ?? '',
      display_id: data?.display_id ?? 0,
      total:      data?.total      ?? 0,
    };
  } else if (
    name === 'product.updated'   ||
    name === 'product-variant.updated' ||
    name === 'product.created'
  ) {
    posEvent = {
      type: 'product.updated',
      id:   data?.id ?? '',
    };
  } else if (name === 'inventory-item.updated') {
    // Medusa v2 emits inventory-item events; best effort for POS
    posEvent = {
      type:       'inventory.updated',
      variant_id: data?.variant_id ?? data?.id ?? '',
      quantity:   data?.stocked_quantity ?? data?.quantity ?? 0,
    };
  }

  if (posEvent) {
    broadcastPosEvent(posEvent);
    enqueueEvent(posEvent.type as string, posEvent);
  }
}

export const config: SubscriberConfig = {
  event: [
    'order.created',
    'order.placed',
    'product.updated',
    'product.created',
    'product-variant.updated',
    'inventory-item.updated',
  ],
};
