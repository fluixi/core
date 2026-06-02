"use strict";
/**
 * BarcodeResolver — core barcode lookup engine.
 *
 * POS context:  barcode → Medusa variant (product catalog is the source of truth)
 * Warehouse ctx: barcode → Odoo product.product (ERP is the source of truth)
 *
 * Resolution order for POS:
 *   1. Redis cache (TTL 1 h, populated by barcode-cache worker)
 *   2. Medusa productModuleService (by SKU / barcode field)
 *   3. Odoo fallback via ERP mapping table
 *
 * Resolution order for Warehouse:
 *   1. Redis cache (TTL 4 h)
 *   2. Odoo product.product search (barcode field, default_code)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BarcodeResolver = void 0;
const CACHE_TTL_POS_S = 3600; // 1 h
const CACHE_TTL_WAREHOUSE_S = 14400; // 4 h
const CACHE_PREFIX = 'leuzman:barcode:';
class BarcodeResolver {
    constructor(container, odooClient, redis) {
        this.container = container;
        this.odooClient = odooClient;
        this.redis = redis;
    }
    async resolve(barcode, context) {
        const cacheKey = `${CACHE_PREFIX}${context}:${barcode}`;
        // 1. Redis cache
        const cached = await this.redis.get(cacheKey);
        if (cached) {
            const entry = JSON.parse(cached);
            return this._formatFromCache(barcode, context, entry);
        }
        // 2. Context-specific resolution
        let result = null;
        if (context === 'pos') {
            result = await this._resolveForPos(barcode);
        }
        else {
            result = await this._resolveForWarehouse(barcode);
        }
        // 3. Cache the result
        if (result) {
            const ttl = context === 'pos' ? CACHE_TTL_POS_S : CACHE_TTL_WAREHOUSE_S;
            await this.redis.setex(cacheKey, ttl, JSON.stringify(result));
        }
        return result;
    }
    async invalidate(barcode, context) {
        if (context) {
            await this.redis.del(`${CACHE_PREFIX}${context}:${barcode}`);
        }
        else {
            // Invalidate all contexts
            const keys = await this.redis.keys(`${CACHE_PREFIX}*:${barcode}`);
            if (keys.length)
                await this.redis.del(...keys);
        }
    }
    async warmCache(barcodes) {
        let warmed = 0;
        let failed = 0;
        for (const barcode of barcodes) {
            try {
                await this.resolve(barcode, 'pos');
                warmed++;
            }
            catch {
                failed++;
            }
        }
        return { warmed, failed };
    }
    async _resolveForPos(barcode) {
        const productModule = this.container.resolve('productModuleService');
        const inventoryModule = this.container.resolve('inventoryModule');
        // Search by SKU (default_code equivalent) or barcode metadata
        const variants = await productModule.listProductVariants({ sku: barcode }, { relations: ['product', 'options'], take: 1 }).catch(() => []);
        if (variants.length) {
            const variant = variants[0];
            let stockedQty;
            try {
                const [invItem] = await inventoryModule.listInventoryItems({ variant_id: variant.id });
                if (invItem) {
                    const levels = await inventoryModule.listInventoryLevels({ inventory_item_id: invItem.id });
                    stockedQty = levels.reduce((s, l) => s + (l.stocked_quantity ?? 0), 0);
                }
            }
            catch { /* non-critical */ }
            // Check ERP mapping for odoo product id
            let odooProductId;
            try {
                const syncService = this.container.resolve('odooSyncModuleService');
                odooProductId = await syncService.getOdooId('variant', variant.id);
            }
            catch { /* no mapping yet */ }
            return {
                barcode,
                context: 'pos',
                variantId: variant.id,
                productId: variant.product_id,
                sku: variant.sku ?? barcode,
                title: variant.product?.title ?? '',
                unitPriceCents: Math.round((variant.calculated_price ?? 0) * 100),
                odooProductId,
                stockedQty,
                availableQty: stockedQty,
                source: 'medusa_db',
                resolvedAt: new Date().toISOString(),
            };
        }
        // Fallback: check Odoo and reverse-map
        return this._resolveViaOdoo(barcode, 'pos');
    }
    async _resolveForWarehouse(barcode) {
        // Warehouse always goes to Odoo first
        try {
            const products = await this.odooClient.rpc('product.product', 'search_read', [[['|', ['barcode', '=', barcode], ['default_code', '=', barcode]]]], { fields: ['id', 'name', 'uom_id', 'default_code'], limit: 1 });
            if (!products.length)
                return null;
            const p = products[0];
            // Get quant for available qty
            const quants = await this.odooClient.rpc('stock.quant', 'search_read', [[['product_id', '=', p.id], ['location_id.usage', '=', 'internal']]], { fields: ['quantity', 'reserved_quantity'] });
            const stockedQty = quants.reduce((s, q) => s + (q.quantity ?? 0), 0);
            const reservedQty = quants.reduce((s, q) => s + (q.reserved_quantity ?? 0), 0);
            const availableQty = stockedQty - reservedQty;
            return {
                barcode,
                context: 'warehouse',
                sku: p.default_code ?? barcode,
                odooProductId: p.id,
                odooProductName: p.name,
                odooUom: p.uom_id?.[1],
                stockedQty,
                availableQty,
                source: 'odoo_db',
                resolvedAt: new Date().toISOString(),
            };
        }
        catch {
            return null;
        }
    }
    async _resolveViaOdoo(barcode, context) {
        try {
            const products = await this.odooClient.rpc('product.product', 'search_read', [[['|', ['barcode', '=', barcode], ['default_code', '=', barcode]]]], { fields: ['id', 'name', 'default_code'], limit: 1 });
            if (!products.length)
                return null;
            const p = products[0];
            // Try reverse ERP mapping: odoo product → medusa variant
            const syncService = this.container.resolve('odooSyncModuleService');
            const mappings = await syncService.listMappings?.({ entity_type: 'variant', odoo_id: p.id });
            const medusaVariantId = mappings?.[0]?.medusa_id;
            return {
                barcode,
                context,
                variantId: medusaVariantId,
                sku: p.default_code ?? barcode,
                odooProductId: p.id,
                odooProductName: p.name,
                source: 'erp_mapping',
                resolvedAt: new Date().toISOString(),
            };
        }
        catch {
            return null;
        }
    }
    _formatFromCache(barcode, context, entry) {
        return {
            barcode,
            context,
            variantId: entry.variantId,
            productId: entry.productId,
            sku: entry.sku,
            title: entry.title,
            unitPriceCents: entry.unitPriceCents,
            odooProductId: entry.odooProductId,
            imageUrl: entry.imageUrl,
            source: 'redis_cache',
            resolvedAt: new Date().toISOString(),
        };
    }
}
exports.BarcodeResolver = BarcodeResolver;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFyY29kZS1yZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL29kb28tc3luYy9iYXJjb2RlL2JhcmNvZGUtcmVzb2x2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7OztHQWNHOzs7QUF1Q0gsTUFBTSxlQUFlLEdBQVMsSUFBSSxDQUFBLENBQUcsTUFBTTtBQUMzQyxNQUFNLHFCQUFxQixHQUFHLEtBQUssQ0FBQSxDQUFFLE1BQU07QUFDM0MsTUFBTSxZQUFZLEdBQVksa0JBQWtCLENBQUE7QUFFaEQsTUFBYSxlQUFlO0lBQzFCLFlBQ1UsU0FBYyxFQUNkLFVBQXNCLEVBQ3RCLEtBQVU7UUFGVixjQUFTLEdBQVQsU0FBUyxDQUFLO1FBQ2QsZUFBVSxHQUFWLFVBQVUsQ0FBWTtRQUN0QixVQUFLLEdBQUwsS0FBSyxDQUFLO0lBQ2pCLENBQUM7SUFFSixLQUFLLENBQUMsT0FBTyxDQUFDLE9BQWUsRUFBRSxPQUF1QjtRQUNwRCxNQUFNLFFBQVEsR0FBRyxHQUFHLFlBQVksR0FBRyxPQUFPLElBQUksT0FBTyxFQUFFLENBQUE7UUFFdkQsaUJBQWlCO1FBQ2pCLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDN0MsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNYLE1BQU0sS0FBSyxHQUFzQixJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ25ELE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdkQsQ0FBQztRQUVELGlDQUFpQztRQUNqQyxJQUFJLE1BQU0sR0FBMkIsSUFBSSxDQUFBO1FBQ3pDLElBQUksT0FBTyxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQ3RCLE1BQU0sR0FBRyxNQUFNLElBQUks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