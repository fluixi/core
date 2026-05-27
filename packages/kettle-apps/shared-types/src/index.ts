// ─── Entity IDs ──────────────────────────────────────────────────────────────
export type MedusaId     = string
export type OdooId       = number
export type BarcodeSku   = string
export type StoreId      = string
export type LocationId   = string
export type ChannelId    = string

// ─── Sync ────────────────────────────────────────────────────────────────────
export type SyncStatus    = 'pending' | 'running' | 'success' | 'failed' | 'partial' | 'skipped'
export type SyncDirection = 'medusa_to_odoo' | 'odoo_to_medusa' | 'bidirectional'
export type SyncTrigger   = 'event' | 'cron' | 'manual' | 'reconciliation' | 'webhook' | 'offline_replay'
export type EntityType    = 'product' | 'variant' | 'order' | 'customer' | 'inventory' | 'invoice' | 'warehouse' | 'supplier' | 'purchase_order' | 'fulfillment' | 'refund' | 'barcode'
export type MappingStatus = 'synced' | 'pending' | 'conflict' | 'error'

export interface ErpMapping {
  id:              string
  entity_type:     EntityType
  medusa_id:       MedusaId
  odoo_id:         OdooId
  sync_direction:  SyncDirection
  status:          MappingStatus
  last_synced_at:  Date | null
  metadata:        Record<string, unknown> | null
}

export interface SyncLog {
  id:               string
  entity_type:      EntityType
  entity_id:        string
  operation:        'create' | 'update' | 'delete'
  direction:        SyncDirection
  status:           SyncStatus
  trigger:          SyncTrigger
  idempotency_key:  string | null
  duration_ms:      number | null
  error_message:    string | null
  odoo_id:          OdooId | null
  attempt:          number
  metadata:         Record<string, unknown> | null
  created_at:       Date
}

// ─── Products ─────────────────────────────────────────────────────────────────
export interface ProductVariantBarcode {
  variant_id:   MedusaId
  sku:          string
  barcode?:     string
  ean13?:       string
  qr_code?:     string
  product_id:   MedusaId
  title:        string
  price:        number
  currency:     string
  inventory?:   number
  image_url?:   string
}

export interface OfflineProductCache {
  version:      number
  cached_at:    string
  store_id:     StoreId
  products:     ProductVariantBarcode[]
  barcodes:     Record<BarcodeSku, MedusaId>  // barcode/sku → variant_id
  checksum:     string
}

// ─── POS ──────────────────────────────────────────────────────────────────────
export type PosSessionStatus = 'open' | 'closed' | 'reconciling'
export type OrderSyncStatus  = 'pending' | 'synced' | 'failed' | 'replaying'

export interface OfflinePosTransaction {
  id:                string
  session_id:        string
  store_id:          StoreId
  created_at:        string
  items:             OfflinePosItem[]
  total:             number
  currency:          string
  payment_method:    string
  customer_id?:      MedusaId
  medusa_order_id?:  MedusaId
  odoo_order_id?:    OdooId
  sync_status:       OrderSyncStatus
  sync_attempts:     number
  last_sync_error?:  string
  idempotency_key:   string
}

export interface OfflinePosItem {
  variant_id:  MedusaId
  sku:         string
  barcode?:    string
  title:       string
  qty:         number
  unit_price:  number
  total:       number
  tax_rate?:   number
}

// ─── Barcodes ────────────────────────────────────────────────────────────────
export type BarcodeType    = 'ean13' | 'code128' | 'qr' | 'datamatrix' | 'upc'
export type BarcodeContext = 'pos' | 'warehouse' | 'supplier' | 'customer'
export type ScanResult     = 'found' | 'not_found' | 'ambiguous' | 'offline_cache_hit'

export interface BarcodeScanEvent {
  raw:          string
  type:         BarcodeType
  context:      BarcodeContext
  scanned_at:   string
  device_id:    string
  session_id?:  string
  result?:      ScanResult
  variant_id?:  MedusaId
  odoo_id?:     OdooId
}

export interface BarcodeResolution {
  result:       ScanResult
  source:       'medusa_api' | 'offline_cache' | 'odoo_api' | 'local_db'
  variant_id?:  MedusaId
  product?:     ProductVariantBarcode
  latency_ms:   number
}

// ─── Warehouse ───────────────────────────────────────────────────────────────
export type WarehouseOperationType = 'receive' | 'transfer' | 'pick' | 'count' | 'adjust' | 'return' | 'scrap'

export interface WarehouseScanEvent {
  raw:              string
  type:             BarcodeType
  operation:        WarehouseOperationType
  scanned_at:       string
  device_id:        string
  warehouse_id:     string
  odoo_location_id: OdooId
  odoo_product_id?: OdooId
  quantity?:        number
  lot_number?:      string
  operator_id?:     string
}

export interface InventorySnapshot {
  id:                  string
  variant_id:          MedusaId
  medusa_location_id:  LocationId
  odoo_location_id:    OdooId | null
  medusa_quantity:     number
  odoo_quantity:       number
  reconciled:          boolean
  snapshot_at:         Date
  discrepancy:         number
}

// ─── Queue jobs ──────────────────────────────────────────────────────────────
export interface BaseJobPayload {
  entity_type:     EntityType
  medusa_id:       MedusaId
  operation:       'create' | 'update' | 'delete'
  triggered_by:    SyncTrigger
  idempotency_key: string
  attempt?:        number
  data?:           Record<string, unknown>
  store_id?:       StoreId
  trace_id?:       string
}

export interface OfflineReplayPayload {
  transaction_id:  string
  session_id:      string
  store_id:        StoreId
  transactions:    OfflinePosTransaction[]
  idempotency_key: string
  triggered_by:    'offline_replay'
  trace_id?:       string
}

// ─── Observability ───────────────────────────────────────────────────────────
export interface HealthStatus {
  service:    string
  status:     'healthy' | 'degraded' | 'unhealthy'
  latency_ms: number
  details?:   Record<string, unknown>
  checked_at: string
}

export interface SystemHealth {
  overall:   'healthy' | 'degraded' | 'unhealthy'
  services:  HealthStatus[]
  queues:    QueueHealth[]
  timestamp: string
}

export interface QueueHealth {
  name:    string
  waiting: number
  active:  number
  failed:  number
  delayed: number
}
