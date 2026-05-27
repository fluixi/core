import type {
  MedusaId, OdooId, StoreId, EntityType, SyncTrigger,
  OfflinePosTransaction, BarcodeScanEvent, WarehouseScanEvent,
} from '@leuzman/shared-types'

// ─── Commerce Events (Medusa emits these) ─────────────────────────────────────
export const EVENTS = {
  // Orders
  ORDER_PLACED:           'order.placed',
  ORDER_UPDATED:          'order.updated',
  ORDER_CANCELED:         'order.canceled',
  ORDER_COMPLETED:        'order.completed',
  ORDER_REFUND_CREATED:   'order.refund_created',
  ORDER_RETURN_CREATED:   'order.return_created',
  ORDER_FULFILLMENT_DONE: 'order.fulfillment_done',

  // Products
  PRODUCT_CREATED:        'product.created',
  PRODUCT_UPDATED:        'product.updated',
  PRODUCT_DELETED:        'product.deleted',
  VARIANT_CREATED:        'product-variant.created',
  VARIANT_UPDATED:        'product-variant.updated',
  VARIANT_DELETED:        'product-variant.deleted',

  // Inventory
  INVENTORY_UPDATED:      'inventory-item.updated',
  INVENTORY_LEVEL_UPDATED:'inventory-level.updated',
  INVENTORY_LEVEL_CREATED:'inventory-level.created',

  // Customers
  CUSTOMER_CREATED:       'customer.created',
  CUSTOMER_UPDATED:       'customer.updated',
  CUSTOMER_DELETED:       'customer.deleted',

  // Payments
  PAYMENT_CAPTURED:       'payment.captured',
  PAYMENT_REFUNDED:       'payment.refunded',

  // POS
  POS_ORDER_CREATED:      'pos.order.created',
  POS_SESSION_CLOSED:     'pos.session.closed',
  POS_OFFLINE_REPLAY:     'pos.offline.replay',

  // Barcode
  BARCODE_SCANNED_POS:    'barcode.scanned.pos',
  BARCODE_SCANNED_WH:     'barcode.scanned.warehouse',
  BARCODE_CACHE_REFRESH:  'barcode.cache.refresh',

  // ERP
  ERP_SYNC_REQUESTED:     'erp.sync.requested',
  ERP_SYNC_COMPLETED:     'erp.sync.completed',
  ERP_SYNC_FAILED:        'erp.sync.failed',
  ERP_INVENTORY_RECEIVED: 'erp.inventory.received',
  ERP_WEBHOOK_RECEIVED:   'erp.webhook.received',
} as const

export type EventName = (typeof EVENTS)[keyof typeof EVENTS]

// ─── Typed event payloads ─────────────────────────────────────────────────────
export interface OrderPlacedEvent {
  id:           MedusaId
  display_id:   string | number
  total:        number
  currency_code:string
  customer_id?: MedusaId
  email?:       string
  items:        Array<{ id: string; variant_id: string; quantity: number; unit_price: number }>
  store_id?:    StoreId
}

export interface ProductChangedEvent {
  id:          MedusaId
  title?:      string
  status?:     string
  variant_ids?: MedusaId[]
}

export interface InventoryChangedEvent {
  id:             MedusaId   // inventory_item_id
  variant_id?:    MedusaId
  location_id?:   string
  stocked_quantity?: number
  quantity?:      number
}

export interface ErpSyncRequestedEvent {
  entity_type:     EntityType
  medusa_id:       MedusaId
  operation:       'create' | 'update' | 'delete'
  triggered_by:    SyncTrigger
  idempotency_key: string
  data?:           Record<string, unknown>
}

export interface BarcodeCacheRefreshEvent {
  store_id:   StoreId
  full:       boolean   // full rebuild vs incremental
  variant_ids?: MedusaId[]
}

export interface PosOfflineReplayEvent {
  session_id:    string
  store_id:      StoreId
  transactions:  OfflinePosTransaction[]
}

export interface ErpInventoryReceivedEvent {
  odoo_product_id:   OdooId
  odoo_location_id:  OdooId
  medusa_variant_id: MedusaId
  quantity:          number
  reference:         string   // Odoo picking reference
}
