"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryReconciliationService = void 0;
class InventoryReconciliationService {
    constructor(odooClient, container, options) {
        this.odooClient = odooClient;
        this.container = container;
        this.options = options;
    }
    async reconcile(variantIds) {
        const result = {
            checked: 0, matched: 0, drifted: 0, fixed: 0, conflicts: 0, errors: 0, details: [],
        };
        const inventoryModule = this.container.resolve('inventoryModule');
        const productModule = this.container.resolve('productModuleService');
        // Fetch all variants to reconcile (or a subset)
        const variants = variantIds
            ? await productModule.listVariants({ id: variantIds })
            : await productModule.listVariants({}, { take: 500 });
        for (const variant of variants) {
            try {
                result.checked++;
                // Get Medusa inventory level
                const [inventoryItem] = await inventoryModule.listInventoryItems({ variant_id: variant.id });
                if (!inventoryItem)
                    continue;
                const [medusaLevel] = await inventoryModule.listInventoryLevels({ inventory_item_id: inventoryItem.id });
                const medusaQty = medusaLevel?.stocked_quantity ?? 0;
                // Get Odoo quantity via barcode or default_code
                const sku = variant.sku ?? `MEDUSA-${variant.id}`;
                const odooProducts = await this.odooClient.rpc('product.product', 'search', [[['default_code', '=', sku]]]);
                if (!odooProducts.length)
                    continue;
                const odooId = odooProducts[0];
                const odooQuants = await this.odooClient.rpc('stock.quant', 'search_read', [[['product_id', '=', odooId], ['location_id.usage', '=', 'internal']]], { fields: ['quantity'] });
                const odooQty = odooQuants.reduce((sum, q) => sum + (q.quantity ?? 0), 0);
                const delta = Math.abs(medusaQty - odooQty);
                const detail = {
                    variantId: variant.id, odooId, medusaQty, odooQty, delta, action: 'none',
                };
                if (delta <= this.options.driftThreshold) {
                    result.matched++;
                }
                else {
                    result.drifted++;
                    if (this.options.strategy === 'odoo_wins') {
                        // Update Medusa inventory level to match Odoo
                        await inventoryModule.updateInventoryLevels([{
                                id: medusaLevel.id,
                                stocked_quantity: odooQty,
                            }]);
                        detail.action = 'fixed_medusa';
                        result.fixed++;
                    }
                    else if (this.options.strategy === 'medusa_wins') {
                        // Update Odoo to match Medusa
                        await this.odooClient.updateStockQuantity(odooId, 8 /* WH/Stock default */, medusaQty);
                        detail.action = 'fixed_odoo';
                        result.fixed++;
                    }
                    else {
                        detail.action = 'conflict';
                        result.conflicts++;
                    }
                }
                result.details.push(detail);
            }
            catch (err) {
                result.errors++;
                console.error(`[reconciliation] Error for variant ${variant.id}:`, err.message);
            }
        }
        return result;
    }
}
exports.InventoryReconciliationService = InventoryReconciliationService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjb25jaWxpYXRpb24uc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL29kb28tc3luYy9zZXJ2aWNlcy9yZWNvbmNpbGlhdGlvbi5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQW1CQSxNQUFhLDhCQUE4QjtJQUN6QyxZQUNVLFVBQXNCLEVBQ3RCLFNBQWMsRUFDZCxPQUdQO1FBTE8sZUFBVSxHQUFWLFVBQVUsQ0FBWTtRQUN0QixjQUFTLEdBQVQsU0FBUyxDQUFLO1FBQ2QsWUFBTyxHQUFQLE9BQU8sQ0FHZDtJQUNBLENBQUM7SUFFSixLQUFLLENBQUMsU0FBUyxDQUFDLFVBQXFCO1FBQ25DLE1BQU0sTUFBTSxHQUF5QjtZQUNuQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRTtTQUNuRixDQUFBO1FBRUQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQVEsQ0FBQTtRQUN4RSxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBUSxDQUFBO1FBRTNFLGdEQUFnRDtRQUNoRCxNQUFNLFFBQVEsR0FBRyxVQUFVO1lBQ3pCLENBQUMsQ0FBQyxNQUFNLGFBQWEsQ0FBQyxZQUFZLENBQUMsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUM7WUFDdEQsQ0FBQyxDQUFDLE1BQU0sYUFBYSxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQTtRQUV2RCxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lB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