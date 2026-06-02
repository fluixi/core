"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const index_js_1 = require("../../../../modules/odoo-sync/index.js");
async function GET(req, res) {
    const syncService = req.scope.resolve(index_js_1.ODOO_SYNC_MODULE);
    const { entity_type, medusa_id, limit = '50', offset = '0' } = req.query;
    const filters = {};
    if (entity_type)
        filters.entity_type = entity_type;
    if (medusa_id)
        filters.medusa_id = medusa_id;
    const mappings = await syncService.listErpMappings(filters);
    res.json({ mappings, count: Array.isArray(mappings) ? mappings.length : 0 });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL2VycC9tYXBwaW5ncy9yb3V0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUdBLGtCQVVDO0FBWkQscUVBQTBGO0FBRW5GLEtBQUssVUFBVSxHQUFHLENBQUMsR0FBa0IsRUFBRSxHQUFtQjtJQUMvRCxNQUFNLFdBQVcsR0FBb0IsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsMkJBQWdCLENBQUMsQ0FBQTtJQUN4RSxNQUFNLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxLQUFLLEdBQUcsSUFBSSxFQUFFLE1BQU0sR0FBRyxHQUFHLEVBQUUsR0FBRyxHQUFHLENBQUMsS0FBWSxDQUFBO0lBRS9FLE1BQU0sT0FBTyxHQUF3QixFQUFFLENBQUE7SUFDdkMsSUFBSSxXQUFXO1FBQUUsT0FBTyxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUE7SUFDbEQsSUFBSSxTQUFTO1FBQUksT0FBTyxDQUFDLFNBQVMsR0FBSyxTQUFTLENBQUE7SUFFaEQsTUFBTSxRQUFRLEdBQUcsTUFBTSxXQUFXLENBQUMsZUFBZSxDQUFDLE9BQWMsQ0FBQyxDQUFBO0lBQ2xFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUE7QUFDOUUsQ0FBQyJ9