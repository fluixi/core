-- Auto-applied by Docker on first postgres container boot.
-- Idempotent: uses CREATE TABLE IF NOT EXISTS throughout.
-- Manually run for existing databases:
--   psql $DATABASE_URL -f infra/postgres/init/001_medusa_odoo_schema.sql

-- Enable uuid extension (needed by gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ERP Core Tables ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_mapping (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type    VARCHAR(50) NOT NULL,
  medusa_id      VARCHAR(255) NOT NULL,
  odoo_id        INTEGER     NOT NULL,
  odoo_model     VARCHAR(100) NOT NULL,
  direction      VARCHAR(20) NOT NULL DEFAULT 'bidirectional',
  status         VARCHAR(20) NOT NULL DEFAULT 'active',
  sync_version   INTEGER     NOT NULL DEFAULT 1,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata       JSONB       DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT erp_mapping_entity_medusa_unique UNIQUE (entity_type, medusa_id),
  CONSTRAINT erp_mapping_entity_odoo_unique   UNIQUE (entity_type, odoo_id, odoo_model)
);

CREATE INDEX IF NOT EXISTS idx_erp_mapping_entity_type ON erp_mapping(entity_type);
CREATE INDEX IF NOT EXISTS idx_erp_mapping_medusa_id   ON erp_mapping(medusa_id);
CREATE INDEX IF NOT EXISTS idx_erp_mapping_odoo_id     ON erp_mapping(odoo_id);
CREATE INDEX IF NOT EXISTS idx_erp_mapping_status      ON erp_mapping(status);

CREATE TABLE IF NOT EXISTS erp_sync_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   VARCHAR(50) NOT NULL,
  entity_id     VARCHAR(255) NOT NULL,
  direction     VARCHAR(20) NOT NULL,
  trigger       VARCHAR(30) NOT NULL,
  status        VARCHAR(20) NOT NULL,
  odoo_model    VARCHAR(100),
  odoo_id       INTEGER,
  attempt_count INTEGER     NOT NULL DEFAULT 1,
  duration_ms   INTEGER,
  error_message TEXT,
  error_code    VARCHAR(50),
  payload       JSONB,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erp_sync_log_entity  ON erp_sync_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_erp_sync_log_status  ON erp_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_erp_sync_log_created ON erp_sync_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_erp_sync_log_trigger ON erp_sync_log(trigger);

CREATE TABLE IF NOT EXISTS erp_sync_failure (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     VARCHAR(50) NOT NULL,
  entity_id       VARCHAR(255) NOT NULL,
  direction       VARCHAR(20) NOT NULL,
  trigger         VARCHAR(30) NOT NULL,
  error_message   TEXT        NOT NULL,
  error_code      VARCHAR(50),
  error_stack     TEXT,
  attempt_count   INTEGER     NOT NULL DEFAULT 1,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_retry_at   TIMESTAMPTZ,
  resolved        BOOLEAN     NOT NULL DEFAULT FALSE,
  resolved_at     TIMESTAMPTZ,
  resolved_by     VARCHAR(100),
  payload         JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erp_sync_failure_entity  ON erp_sync_failure(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_erp_sync_failure_pending ON erp_sync_failure(resolved) WHERE resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_erp_sync_failure_retry   ON erp_sync_failure(next_retry_at) WHERE resolved = FALSE;

-- ─── Inventory & Reconciliation ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_inventory_snapshot (
  id                      UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id              VARCHAR(255)   NOT NULL,
  variant_id              VARCHAR(255)   NOT NULL,
  location_id             VARCHAR(255)   NOT NULL,
  odoo_location_id        INTEGER,
  quantity_medusa         DECIMAL(10,3)  NOT NULL DEFAULT 0,
  quantity_odoo           DECIMAL(10,3)  NOT NULL DEFAULT 0,
  quantity_delta          DECIMAL(10,3)  GENERATED ALWAYS AS (quantity_medusa - quantity_odoo) STORED,
  snapshot_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  reconciled              BOOLEAN        NOT NULL DEFAULT FALSE,
  reconciled_at           TIMESTAMPTZ,
  drift_threshold_exceeded BOOLEAN       NOT NULL DEFAULT FALSE,
  metadata                JSONB          DEFAULT '{}',
  created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_snapshot_variant      ON erp_inventory_snapshot(variant_id);
CREATE INDEX IF NOT EXISTS idx_inv_snapshot_location     ON erp_inventory_snapshot(location_id);
CREATE INDEX IF NOT EXISTS idx_inv_snapshot_at           ON erp_inventory_snapshot(snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_snapshot_unreconciled ON erp_inventory_snapshot(reconciled) WHERE reconciled = FALSE;
CREATE INDEX IF NOT EXISTS idx_inv_snapshot_drift        ON erp_inventory_snapshot(drift_threshold_exceeded) WHERE drift_threshold_exceeded = TRUE;

CREATE TABLE IF NOT EXISTS erp_reconciliation_log (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_type VARCHAR(30) NOT NULL,
  triggered_by        VARCHAR(30) NOT NULL,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  status              VARCHAR(20) NOT NULL DEFAULT 'running',
  total_checked       INTEGER     NOT NULL DEFAULT 0,
  total_matched       INTEGER     NOT NULL DEFAULT 0,
  total_drifted       INTEGER     NOT NULL DEFAULT 0,
  total_fixed         INTEGER     NOT NULL DEFAULT 0,
  total_conflicts     INTEGER     NOT NULL DEFAULT 0,
  error_message       TEXT,
  report              JSONB       DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recon_log_type    ON erp_reconciliation_log(reconciliation_type);
CREATE INDEX IF NOT EXISTS idx_recon_log_started ON erp_reconciliation_log(started_at DESC);

CREATE TABLE IF NOT EXISTS erp_conflict_resolution (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type         VARCHAR(50) NOT NULL,
  entity_id           VARCHAR(255) NOT NULL,
  field_name          VARCHAR(100) NOT NULL,
  medusa_value        JSONB,
  odoo_value          JSONB,
  resolved_value      JSONB,
  resolution_strategy VARCHAR(30) NOT NULL DEFAULT 'pending',
  auto_resolved       BOOLEAN     NOT NULL DEFAULT FALSE,
  resolved_at         TIMESTAMPTZ,
  resolved_by         VARCHAR(100),
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conflict_entity  ON erp_conflict_resolution(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_conflict_pending ON erp_conflict_resolution(resolution_strategy) WHERE resolution_strategy = 'pending';

-- ─── Offline POS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS offline_pos_transaction (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id           VARCHAR(100)  NOT NULL,
  session_id          VARCHAR(100)  NOT NULL,
  pos_location_id     VARCHAR(255),
  cart_id             VARCHAR(255),
  status              VARCHAR(30)   NOT NULL DEFAULT 'pending',
  items               JSONB         NOT NULL DEFAULT '[]',
  customer_email      VARCHAR(255),
  customer_id         VARCHAR(255),
  subtotal_cents      INTEGER       NOT NULL DEFAULT 0,
  tax_cents           INTEGER       NOT NULL DEFAULT 0,
  total_cents         INTEGER       NOT NULL DEFAULT 0,
  currency            VARCHAR(3)    NOT NULL DEFAULT 'USD',
  payment_method      VARCHAR(50),
  payment_data        JSONB         DEFAULT '{}',
  discount_code       VARCHAR(100),
  discount_cents      INTEGER       NOT NULL DEFAULT 0,
  captured_at         TIMESTAMPTZ   NOT NULL,
  replayed_at         TIMESTAMPTZ,
  replay_attempt_count INTEGER      NOT NULL DEFAULT 0,
  last_replay_at      TIMESTAMPTZ,
  next_replay_at      TIMESTAMPTZ,
  replay_error        TEXT,
  medusa_order_id     VARCHAR(255),
  odoo_order_id       INTEGER,
  metadata            JSONB         DEFAULT '{}',
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offline_pos_status   ON offline_pos_transaction(status) WHERE status IN ('pending','replaying','failed');
CREATE INDEX IF NOT EXISTS idx_offline_pos_device   ON offline_pos_transaction(device_id);
CREATE INDEX IF NOT EXISTS idx_offline_pos_session  ON offline_pos_transaction(session_id);
CREATE INDEX IF NOT EXISTS idx_offline_pos_replay   ON offline_pos_transaction(next_replay_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_offline_pos_captured ON offline_pos_transaction(captured_at DESC);

CREATE TABLE IF NOT EXISTS barcode_scan_log (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode             VARCHAR(255) NOT NULL,
  context             VARCHAR(20)  NOT NULL,
  device_id           VARCHAR(100),
  session_id          VARCHAR(100),
  operator_id         VARCHAR(255),
  variant_id          VARCHAR(255),
  odoo_product_id     INTEGER,
  resolution_status   VARCHAR(20)  NOT NULL DEFAULT 'resolved',
  resolution_latency_ms INTEGER,
  action_taken        VARCHAR(50),
  quantity            DECIMAL(10,3),
  location_id         VARCHAR(255),
  scan_timestamp      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  metadata            JSONB        DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_barcode_scan_barcode    ON barcode_scan_log(barcode);
CREATE INDEX IF NOT EXISTS idx_barcode_scan_context    ON barcode_scan_log(context);
CREATE INDEX IF NOT EXISTS idx_barcode_scan_device     ON barcode_scan_log(device_id);
CREATE INDEX IF NOT EXISTS idx_barcode_scan_timestamp  ON barcode_scan_log(scan_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_barcode_scan_unresolved ON barcode_scan_log(resolution_status) WHERE resolution_status != 'resolved';
