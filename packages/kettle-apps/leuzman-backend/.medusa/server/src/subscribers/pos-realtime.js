"use strict";
/**
 * POS real-time event subscriber.
 *
 * Listens to Medusa internal events and:
 *   1. Broadcasts via SSE to connected POS clients (broadcastPosEvent)
 *   2. Buffers for polling clients (enqueueEvent)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = posOrderSubscriber;
const route_1 = require("../api/pos/events/route");
const route_2 = require("../api/pos/events/poll/route");
// ─── Order events ─────────────────────────────────────────────────────────────
async function posOrderSubscriber({ event: { name, data }, }) {
    let posEvent = null;
    if (name === 'order.created' || name === 'order.placed') {
        posEvent = {
            type: 'order.created',
            id: data?.id ?? '',
            display_id: data?.display_id ?? 0,
            total: data?.total ?? 0,
        };
    }
    else if (name === 'product.updated' ||
        name === 'product-variant.updated' ||
        name === 'product.created') {
        posEvent = {
            type: 'product.updated',
            id: data?.id ?? '',
        };
    }
    else if (name === 'inventory-item.updated') {
        // Medusa v2 emits inventory-item events; best effort for POS
        posEvent = {
            type: 'inventory.updated',
            variant_id: data?.variant_id ?? data?.id ?? '',
            quantity: data?.stocked_quantity ?? data?.quantity ?? 0,
        };
    }
    if (posEvent) {
        (0, route_1.broadcastPosEvent)(posEvent);
        (0, route_2.enqueueEvent)(posEvent.type, posEvent);
    }
}
exports.config = {
    event: [
        'order.created',
        'order.placed',
        'product.updated',
        'product.created',
        'product-variant.updated',
        'inventory-item.updated',
    ],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9zLXJlYWx0aW1lLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3N1YnNjcmliZXJzL3Bvcy1yZWFsdGltZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFRSCxxQ0FrQ0M7QUF2Q0QsbURBQTREO0FBQzVELHdEQUFnRTtBQUVoRSxpRkFBaUY7QUFFbEUsS0FBSyxVQUFVLGtCQUFrQixDQUFDLEVBQy9DLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsR0FDRDtJQUNwQixJQUFJLFFBQVEsR0FBbUMsSUFBSSxDQUFDO0lBRXBELElBQUksSUFBSSxLQUFLLGVBQWUsSUFBSSxJQUFJLEtBQUssY0FBYyxFQUFFLENBQUM7UUFDeEQsUUFBUSxHQUFHO1lBQ1QsSUFBSSxFQUFRLGVBQWU7WUFDM0IsRUFBRSxFQUFVLElBQUksRUFBRSxFQUFFLElBQVksRUFBRTtZQUNsQyxVQUFVLEVBQUUsSUFBSSxFQUFFLFVBQVUsSUFBSSxDQUFDO1lBQ2pDLEtBQUssRUFBTyxJQUFJLEVBQUUsS0FBSyxJQUFTLENBQUM7U0FDbEMsQ0FBQztJQUNKLENBQUM7U0FBTSxJQUNMLElBQUksS0FBSyxpQkFBaUI7UUFDMUIsSUFBSSxLQUFLLHlCQUF5QjtRQUNsQyxJQUFJLEtBQUssaUJBQWlCLEVBQzFCLENBQUM7UUFDRCxRQUFRLEdBQUc7WUFDVCxJQUFJLEVBQUUsaUJBQWlCO1lBQ3ZCLEVBQUUsRUFBSSxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUU7U0FDckIsQ0FBQztJQUNKLENBQUM7U0FBTSxJQUFJLElBQUksS0FBSyx3QkFBd0IsRUFBRSxDQUFDO1FBQzdDLDZEQUE2RDtRQUM3RCxRQUFRLEdBQUc7WUFDVCxJQUFJLEVBQVEsbUJBQW1CO1lBQy9CLFVBQVUsRUFBRSxJQUFJLEVBQUUsVUFBVSxJQUFJLElBQUksRUFBRSxFQUFFLElBQUksRUFBRTtZQUM5QyxRQUFRLEVBQUksSUFBSSxFQUFFLGdCQUFnQixJQUFJLElBQUksRUFBRSxRQUFRLElBQUksQ0FBQztTQUMxRCxDQUFDO0lBQ0osQ0FBQztJQUVELElBQUksUUFBUSxFQUFFLENBQUM7UUFDYixJQUFBLHlCQUFpQixFQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzVCLElBQUEsb0JBQVksRUFBQyxRQUFRLENBQUMsSUFBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ2xELENBQUM7QUFDSCxDQUFDO0FBRVksUUFBQSxNQUFNLEdBQXFCO0lBQ3RDLEtBQUssRUFBRTtRQUNMLGVBQWU7UUFDZixjQUFjO1FBQ2QsaUJBQWlCO1FBQ2pCLGlCQUFpQjtRQUNqQix5QkFBeUI7UUFDekIsd0JBQXdCO0tBQ3pCO0NBQ0YsQ0FBQyJ9