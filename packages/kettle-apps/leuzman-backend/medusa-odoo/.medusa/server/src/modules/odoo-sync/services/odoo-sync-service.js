"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@medusajs/framework/utils");
const erp_mapping_js_1 = require("../models/erp-mapping.js");
const erp_sync_log_js_1 = require("../models/erp-sync-log.js");
const erp_sync_failure_js_1 = require("../models/erp-sync-failure.js");
const erp_inventory_snapshot_js_1 = require("../models/erp-inventory-snapshot.js");
const erp_reconciliation_log_js_1 = require("../models/erp-reconciliation-log.js");
const erp_conflict_resolution_js_1 = require("../models/erp-conflict-resolution.js");
const offline_pos_transaction_js_1 = require("../models/offline-pos-transaction.js");
const barcode_scan_log_js_1 = require("../models/barcode-scan-log.js");
class OdooSyncService extends (0, utils_1.MedusaService)({
    ErpMapping: erp_mapping_js_1.ErpMapping,
    ErpSyncLog: erp_sync_log_js_1.ErpSyncLog,
    ErpSyncFailure: erp_sync_failure_js_1.ErpSyncFailure,
    ErpInventorySnapshot: erp_inventory_snapshot_js_1.ErpInventorySnapshot,
    ErpReconciliationLog: erp_reconciliation_log_js_1.ErpReconciliationLog,
    ErpConflictResolution: erp_conflict_resolution_js_1.ErpConflictResolution,
    OfflinePosTransaction: offline_pos_transaction_js_1.OfflinePosTransaction,
    BarcodeScanLog: barcode_scan_log_js_1.BarcodeScanLog,
}) {
    constructor(container) {
        super(...arguments);
        this.container_ = container;
    }
    // ─── Module-scope DI helpers (safe to call from jobs/subscribers) ─────────
    resolveQueue(name) {
        return this.container_[name];
    }
    // ─── ERP reconciliation (moved from job so odooClient is in scope) ────────
    async runReconciliation() {
        const odooClient = this.container_['odooClient'];
        console.log('[medusa-odoo] Starting ERP reconciliation job');
        try {
            const mappings = await this.listErpMappings({ entity_type: 'variant' });
            for (const mapping of mappings) {
                try {
                    const quants = await odooClient.search('stock.quant', [['product_id', '=', mapping.odoo_id], ['location_id.usage', '=', 'internal']], ['quantity', 'reserved_quantity'], 1);
                    const odooQty = Math.max(0, (quants[0]?.quantity ?? 0) - (quants[0]?.reserved_quantity ?? 0));
                    await this.createErpInventorySnapshots({
                        product_id: '',
                        variant_id: mapping.medusa_id,
                        location_id: '',
                        odoo_location_id: null,
                        quantity_medusa: 0,
                        quantity_odoo: odooQty,
                        reconciled: false,
                        snapshot_at: new Date(),
                    });
                }
                catch (err) {
                    console.error('[medusa-odoo] Reconciliation error for variant', mapping.medusa_id, err.message);
                }
            }
            console.log(`[medusa-odoo] Reconciliation done: ${mappings.length} variants processed`);
        }
        catch (err) {
            console.error('[medusa-odoo] Reconciliation job failed:', err.message);
        }
    }
    // ─── Log a sync attempt ──────────────────────────────────────────────────
    async logSync(data) {
        return this.createErpSyncLogs({
            ...data,
            started_at: data.started_at ?? new Date(),
            completed_at: data.completed_at ?? (data.status !== 'running' ? new Date() : undefined),
        });
    }
    // ─── Upsert ID mapping ────────────────────────────────────────────────────
    async upsertMapping(entity_type, medusa_id, odoo_id, direction, odoo_model, metadata) {
        const existing = await this.listErpMappings({ entity_type, medusa_id });
        if (existing.length) {
            return this.updateErpMappings({ entity_type, medusa_id }, {
                odoo_id,
                odoo_model: odoo_model ?? existing[0].odoo_model,
                status: 'active',
                last_synced_at: new Date(),
                metadata,
            });
        }
        return this.createErpMappings({
            entity_type,
            medusa_id,
            odoo_id,
            odoo_model: odoo_model ?? '',
            sync_direction: direction,
            status: 'active',
            last_synced_at: new Date(),
            metadata,
        });
    }
    // ─── Resolve Odoo ID for a Medusa entity ──────────────────────────────────
    async getOdooId(entity_type, medusa_id) {
        const rows = await this.listErpMappings({ entity_type, medusa_id });
        return rows[0]?.odoo_id ?? null;
    }
    // ─── Resolve Medusa ID from Odoo ID ───────────────────────────────────────
    async getMedusaId(entity_type, odoo_id) {
        const rows = await this.listErpMappings({ entity_type, odoo_id });
        return rows[0]?.medusa_id ?? null;
    }
    // ─── Record a failed job ──────────────────────────────────────────────────
    async recordFailure(data) {
        return this.createErpSyncFailures({
            ...data,
            direction: data.direction ?? 'medusa_to_odoo',
            trigger: data.trigger ?? 'event',
            attempt_count: data.attempt_count ?? 1,
        });
    }
    // ─── Mark a failure as resolved ───────────────────────────────────────────
    async resolveFailure(id, resolved_by = 'manual') {
        return this.updateErpSyncFailures({ id }, {
            resolved: true,
            resolved_at: new Date(),
            resolved_by,
        });
    }
    // ─── Start / complete a reconciliation run ────────────────────────────────
    async startReconciliation(type, triggered_by) {
        return this.createErpReconciliationLogs({
            reconciliation_type: type,
            triggered_by,
            started_at: new Date(),
            status: 'running',
        });
    }
    async completeReconciliation(id, result) {
        return this.updateErpReconciliationLogs({ id }, {
            ...result,
            completed_at: new Date(),
        });
    }
    // ─── Log a barcode scan ───────────────────────────────────────────────────
    async logBarcodeScan(data) {
        return this.createBarcodeScanLogs({
            ...data,
            resolution_status: data.resolution_status ?? 'resolved',
            scan_timestamp: new Date(),
        });
    }
    // ─── Offline POS transaction helpers ─────────────────────────────────────
    async createOfflineTransaction(data) {
        return this.createOfflinePosTransactions({
            ...data,
            items: data.items,
            status: 'pending',
            currency: data.currency ?? 'USD',
            discount_cents: data.discount_cents ?? 0,
        });
    }
    async markTransactionReplayed(id, medusa_order_id, odoo_order_id) {
        return this.updateOfflinePosTransactions({ id }, {
            status: 'replayed',
            replayed_at: new Date(),
            medusa_order_id,
            odoo_order_id,
        });
    }
    async markTransactionFailed(id, error, next_retry_at) {
        const txn = await this.listOfflinePosTransactions({ id });
        return this.updateOfflinePosTransactions({ id }, {
            status: 'failed',
            replay_error: error,
            replay_attempt_count: (txn[0]?.replay_attempt_count ?? 0) + 1,
            last_replay_at: new Date(),
            next_retry_at,
        });
    }
}
exports.default = OdooSyncService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2Rvby1zeW5jLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9vZG9vLXN5bmMvc2VydmljZXMvb2Rvby1zeW5jLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxREFBeUQ7QUFFekQsNkRBQWlFO0FBQ2pFLCtEQUFrRTtBQUNsRSx1RUFBc0U7QUFDdEUsbUZBQTRFO0FBQzVFLG1GQUE0RTtBQUM1RSxxRkFBNkU7QUFDN0UscUZBQTZFO0FBQzdFLHVFQUFzRTtBQUV0RSxNQUFNLGVBQWdCLFNBQVEsSUFBQSxxQkFBYSxFQUFDO0lBQzFDLFVBQVUsRUFBViwyQkFBVTtJQUNWLFVBQVUsRUFBViw0QkFBVTtJQUNWLGNBQWMsRUFBZCxvQ0FBYztJQUNkLG9CQUFvQixFQUFwQixnREFBb0I7SUFDcEIsb0JBQW9CLEVBQXBCLGdEQUFvQjtJQUNwQixxQkFBcUIsRUFBckIsa0RBQXFCO0lBQ3JCLHFCQUFxQixFQUFyQixrREFBcUI7SUFDckIsY0FBYyxFQUFkLG9DQUFjO0NBQ2YsQ0FBQztJQUdBLFlBQVksU0FBOEI7UUFDeEMsS0FBSyxDQUFDLEdBQUcsU0FBZ0IsQ0FBQyxDQUFBO1FBQzFCLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFBO0lBQzdCLENBQUM7SUFFRCw2RUFBNkU7SUFFN0UsWUFBWSxDQUFDLElBQVk7UUFDdkIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBVSxDQUFBO0lBQ3ZDLENBQUM7SUFFRCw2RUFBNkU7SUFFN0UsS0FBSyxDQUFDLGlCQUFpQjtRQUNyQixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBUSxDQUFBO1FBQ3ZELE9BQU8sQ0FBQyxHQUFHLENBQUMsK0NBQStDLENBQUMsQ0FBQTtRQUM1RCxJQUFJLENBQUM7WUFDSCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxlQUFl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