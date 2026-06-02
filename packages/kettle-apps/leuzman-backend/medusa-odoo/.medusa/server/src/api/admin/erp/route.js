"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const index_js_1 = require("../../../modules/odoo-sync/index.js");
async function GET(req, res) {
    const odooClient = req.scope.resolve('odooClient');
    const syncService = req.scope.resolve(index_js_1.ODOO_SYNC_MODULE);
    const healthy = await odooClient.healthCheck();
    const [mappings, failures] = await Promise.all([
        syncService.listErpMappings({}, { take: 0 }),
        syncService.listErpSyncFailures({ resolved: false }, { take: 0 }),
    ]);
    res.json({
        status: healthy ? 'connected' : 'disconnected',
        total_mappings: mappings.count ?? 0,
        open_failures: failures.count ?? 0,
        timestamp: new Date().toISOString(),
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL2VycC9yb3V0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUlBLGtCQWdCQztBQWxCRCxrRUFBdUY7QUFFaEYsS0FBSyxVQUFVLEdBQUcsQ0FBQyxHQUFrQixFQUFFLEdBQW1CO0lBQy9ELE1BQU0sVUFBVSxHQUFlLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQzlELE1BQU0sV0FBVyxHQUFvQixHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQywyQkFBZ0IsQ0FBQyxDQUFBO0lBRXhFLE1BQU0sT0FBTyxHQUFHLE1BQU0sVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFBO0lBQzlDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDO1FBQzdDLFdBQVcsQ0FBQyxlQUFlLENBQUMsRUFBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBUyxDQUFDO1FBQzFELFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQVMsQ0FBQztLQUNoRixDQUFDLENBQUE7SUFFRixHQUFHLENBQUMsSUFBSSxDQUFDO1FBQ1AsTUFBTSxFQUFZLE9BQU8sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxjQUFjO1FBQ3hELGNBQWMsRUFBSyxRQUFnQixDQUFDLEtBQUssSUFBSSxDQUFDO1FBQzlDLGFBQWEsRUFBTSxRQUFnQixDQUFDLEtBQUssSUFBSSxDQUFDO1FBQzlDLFNBQVMsRUFBUyxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtLQUMzQyxDQUFDLENBQUE7QUFDSixDQUFDIn0=