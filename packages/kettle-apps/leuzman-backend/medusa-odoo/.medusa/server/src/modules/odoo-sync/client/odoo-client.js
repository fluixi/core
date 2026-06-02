"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OdooClient = void 0;
// ─── OdooClient ───────────────────────────────────────────────────────────────
class OdooClient {
    constructor(config) {
        // Authenticated user id
        this.uid = null;
        // Token bucket rate limiting
        this.requestCount = 0;
        this.windowStart = Date.now();
        // Circuit breaker
        this.circuitState = 'closed';
        this.failureCount = 0;
        this.lastFailureTime = 0;
        this.circuitThreshold = 5;
        this.circuitResetMs = 60_000;
        // Auto-incrementing JSON-RPC id
        this.rpcId = 1;
        this.url = config.url.replace(/\/$/, '');
        this.db = config.db;
        this.username = config.username;
        this.password = config.password;
        this.timeout = config.timeout ?? 30_000;
        this.maxRetries = config.maxRetries ?? 3;
        this.rateLimitPerSec = config.rateLimit ?? 20;
    }
    // ─── Rate limiter ──────────────────────────────────────────────────────────
    async throttle() {
        const now = Date.now();
        if (now - this.windowStart >= 1_000) {
            this.requestCount = 0;
            this.windowStart = now;
        }
        if (this.requestCount >= this.rateLimitPerSec) {
            const waitMs = 1_000 - (now - this.windowStart);
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            this.requestCount = 0;
            this.windowStart = Date.now();
        }
        this.requestCount++;
    }
    // ─── Circuit breaker ───────────────────────────────────────────────────────
    checkCircuit() {
        if (this.circuitState === 'open') {
            const elapsed = Date.now() - this.lastFailureTime;
            if (elapsed >= this.circuitResetMs) {
                this.circuitState = 'half-open';
            }
            else {
                throw new Error(`[OdooClient] Circuit breaker is OPEN. Retry after ${Math.ceil((this.circuitResetMs - elapsed) / 1000)}s.`);
            }
        }
    }
    recordSuccess() {
        this.failureCount = 0;
        this.circuitState = 'closed';
    }
    recordFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.circuitThreshold) {
            this.circuitState = 'open';
        }
    }
    // ─── Low-level POST ────────────────────────────────────────────────────────
    async post(body) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);
        try {
            const response = await fetch(`${this.url}/jsonrpc`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            if (!response.ok) {
                throw new Error(`[OdooClient] HTTP ${response.status}: ${response.statusText}`);
            }
            const json = await response.json();
            if (json.error) {
                const msg = json.error.data?.message ?? json.error.message;
                throw new Error(`[OdooClient] Odoo RPC error: ${msg}`);
            }
            return json.result;
        }
        finally {
            clearTimeout(timer);
        }
    }
    // ─── Authenticated model call with retry + circuit breaker ─────────────────
    async rpc(model, method, args = [], kwargs = {}) {
        await this.ensureAuth();
        await this.throttle();
        this.checkCircuit();
        const body = {
            jsonrpc: '2.0',
            method: 'call',
            id: this.rpcId++,
            params: {
                service: 'object',
                method: 'execute_kw',
                args: [this.db, this.uid, this.password, model, method, args, kwargs],
            },
        };
        let lastError = null;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            if (attempt > 0) {
                const delayMs = Math.min(2 ** attempt * 1_000, 16_000);
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
            try {
                const result = await this.post(body);
                this.recordSuccess();
                return result;
            }
            catch (err) {
                lastError = err instanceof Error ? err : new Error(String(err));
                // Do not retry on Odoo application-level errors (wrong model, access rights, etc.)
                if (lastError.message.includes('Odoo RPC error')) {
                    this.recordFailure();
                    throw lastError;
                }
                this.recordFailure();
                this.checkCircuit(); // may throw if circuit opened mid-retry
            }
        }
        throw lastError ?? new Error('[OdooClient] Unknown RPC error after retries');
    }
    // ─── Authentication ────────────────────────────────────────────────────────
    async authenticate() {
        const body = {
            jsonrpc: '2.0',
            method: 'call',
            id: this.rpcId++,
            params: {
                service: 'common',
                method: 'authenticate',
                args: [this.db, this.username, this.password, {}],
            },
        };
        const uid = await this.post(body);
        if (!uid) {
            throw new Error(`[OdooClient] Authentication failed for user "${this.username}" on db "${this.db}"`);
        }
        this.uid = uid;
    }
    async ensureAuth() {
        if (this.uid === null) {
            await this.authenticate();
        }
    }
    // ─── Generic CRUD ──────────────────────────────────────────────────────────
    async search(model, domain = [], fields = [], limit = 0) {
        const kwargs = {};
        if (fields.length)
            kwargs['fields'] = fields;
        if (limit > 0)
            kwargs['limit'] = limit;
        return this.rpc(model, 'search_read', [domain], kwargs);
    }
    async create(model, vals) {
        return this.rpc(model, 'create', [[vals]]);
    }
    async write(model, ids, vals) {
        return this.rpc(model, 'write', [ids, vals]);
    }
    async unlink(model, ids) {
        return this.rpc(model, 'unlink', [ids]);
    }
    async searchCount(model, domain = []) {
        return this.rpc(model, 'search_count', [domain]);
    }
    // ─── Product helpers ───────────────────────────────────────────────────────
    async upsertProduct(medusaId, vals) {
        const existing = await this.search('product.template', [['medusa_product_id', '=', medusaId]], ['id'], 1);
        if (existing.length) {
            const id = existing[0].id;
            await this.write('product.template', [id], {
                ...vals,
                medusa_product_id: medusaId,
                medusa_synced: true,
                medusa_sync_date: new Date().toISOString(),
            });
            return id;
        }
        return this.create('product.template', {
            ...vals,
            medusa_product_id: medusaId,
            medusa_synced: true,
            medusa_sync_date: new Date().toISOString(),
        });
    }
    async upsertVariant(medusaId, vals) {
        const existing = await this.search('product.product', [['medusa_variant_id', '=', medusaId]], ['id'], 1);
        if (existing.length) {
            const id = existing[0].id;
            await this.write('product.product', [id], {
                ...vals,
                medusa_variant_id: medusaId,
                medusa_synced: true,
                medusa_sync_date: new Date().toISOString(),
            });
            return id;
        }
        return this.create('product.product', {
            ...vals,
            medusa_variant_id: medusaId,
            medusa_synced: true,
            medusa_sync_date: new Date().toISOString(),
        });
    }
    // ─── Inventory helpers ─────────────────────────────────────────────────────
    /**
     * Update (or create) a stock.quant record for a given product/location,
     * setting the inventory_quantity field (Odoo 16+ inventory adjustment).
     */
    async updateStockQuantity(productId, locationId, qty) {
        const existing = await this.search('stock.quant', [
            ['product_id', '=', productId],
            ['location_id', '=', locationId],
        ], ['id'], 1);
        if (existing.length) {
            await this.write('stock.quant', [existing[0].id], {
                inventory_quantity: qty,
            });
        }
        else {
            await this.create('stock.quant', {
                product_id: productId,
                location_id: locationId,
                inventory_quantity: qty,
            });
        }
        // Apply the inventory adjustment
        await this.rpc('stock.quant', 'action_apply_inventory', [[]], {});
    }
    // ─── Order helpers ─────────────────────────────────────────────────────────
    async getOrderByMedusaId(medusaOrderId) {
        const rows = await this.search('sale.order', [['medusa_order_id', '=', medusaOrderId]], ['id', 'name', 'state', 'partner_id', 'amount_total', 'date_order', 'medusa_order_id'], 1);
        return rows[0] ?? null;
    }
    async createSaleOrder(vals, lines) {
        const orderId = await this.create('sale.order', vals);
        if (lines.length) {
            for (const line of lines) {
                await this.create('sale.order.line', {
                    order_id: orderId,
                    product_id: line.product_id,
                    product_uom_qty: line.product_uom_qty,
                    price_unit: line.price_unit,
                    name: line.name,
                });
            }
        }
        return orderId;
    }
    // ─── Customer helpers ──────────────────────────────────────────────────────
    async getCustomerByEmail(email) {
        const rows = await this.search('res.partner', [
            ['email', '=', email],
            ['customer_rank', '>', 0],
        ], ['id', 'name', 'email', 'phone', 'street', 'city', 'zip', 'country_id', 'customer_rank'], 1);
        return rows[0] ?? null;
    }
    async upsertCustomer(medusaCustomerId, vals) {
        const existing = await this.search('res.partner', [['medusa_customer_id', '=', medusaCustomerId]], ['id'], 1);
        if (existing.length) {
            const id = existing[0].id;
            await this.write('res.partner', [id], {
                ...vals,
                medusa_customer_id: medusaCustomerId,
            });
            return id;
        }
        return this.create('res.partner', {
            ...vals,
            medusa_customer_id: medusaCustomerId,
            customer_rank: 1,
        });
    }
    // ─── Warehouse & stock helpers ─────────────────────────────────────────────
    async getWarehouses() {
        return this.search('stock.warehouse', [], ['id', 'name', 'code', 'lot_stock_id', 'medusa_location_id']);
    }
    async getStockQuants(locationIds) {
        return this.search('stock.quant', [['location_id', 'in', locationIds]], ['id', 'product_id', 'location_id', 'quantity', 'reserved_quantity']);
    }
    // ─── Health check ──────────────────────────────────────────────────────────
    async healthCheck() {
        try {
            await this.rpc('res.users', 'check_access_rights', ['read'], {});
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.OdooClient = OdooClient;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2Rvby1jbGllbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9vZG9vLXN5bmMvY2xpZW50L29kb28tY2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQThDQSxpRkFBaUY7QUFFakYsTUFBYSxVQUFVO0lBMEJyQixZQUFZLE1BQXdCO1FBakJwQyx3QkFBd0I7UUFDaEIsUUFBRyxHQUFrQixJQUFJLENBQUE7UUFFakMsNkJBQTZCO1FBQ3JCLGlCQUFZLEdBQUcsQ0FBQyxDQUFBO1FBQ2hCLGdCQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1FBRWhDLGtCQUFrQjtRQUNWLGlCQUFZLEdBQWlCLFFBQVEsQ0FBQTtRQUNyQyxpQkFBWSxHQUFHLENBQUMsQ0FBQTtRQUNoQixvQkFBZSxHQUFHLENBQUMsQ0FBQTtRQUNWLHFCQUFnQixHQUFHLENBQUMsQ0FBQTtRQUNwQixtQkFBYyxHQUFHLE1BQU0sQ0FBQTtRQUV4QyxnQ0FBZ0M7UUFDeEIsVUFBSyxHQUFHLENBQUMsQ0FBQTtRQUdmLElBQUksQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3hDLElBQUksQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDLEVBQUUsQ0FBQTtRQUNuQixJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUE7UUFDL0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFBO1FBQy9CLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUE7UUFDdkMsSUFBSSxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQTtRQUN4QyxJQUFJLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFBO0lB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