"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = void 0;
const barcode_resolver_js_1 = require("../../../modules/odoo-sync/barcode/barcode-resolver.js");
const POST = async (req, res) => {
    const { barcode, context = 'pos' } = req.body;
    if (!barcode || typeof barcode !== 'string' || barcode.trim() === '') {
        return res.status(400).json({ error: 'barcode is required' });
    }
    const validContexts = ['pos', 'warehouse', 'receiving', 'stocktake'];
    if (!validContexts.includes(context)) {
        return res.status(400).json({ error: `context must be one of: ${validContexts.join(', ')}` });
    }
    try {
        const odooClient = req.scope.resolve('odooClient');
        const redis = req.scope.resolve('redis');
        const resolver = new barcode_resolver_js_1.BarcodeResolver(req.scope, odooClient, redis);
        const start = Date.now();
        const result = await resolver.resolve(barcode.trim(), context);
        const latencyMs = Date.now() - start;
        if (!result) {
            return res.status(404).json({
                found: false,
                barcode: barcode.trim(),
                context,
                latencyMs,
            });
        }
        return res.json({ found: true, latencyMs, ...result });
    }
    catch (err) {
        console.error('[barcode/resolve] Error:', err?.message);
        return res.status(500).json({ error: 'Barcode resolution failed' });
    }
};
exports.POST = POST;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3N0b3JlL2JhcmNvZGUvcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBVUEsZ0dBQXdGO0FBR2pGLE1BQU0sSUFBSSxHQUFHLEtBQUssRUFBRSxHQUFrQixFQUFFLEdBQW1CLEVBQUUsRUFBRTtJQUNwRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE9BQU8sR0FBRyxLQUFLLEVBQUUsR0FBRyxHQUFHLENBQUMsSUFHeEMsQ0FBQTtJQUVELElBQUksQ0FBQyxPQUFPLElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQztRQUNyRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLHFCQUFxQixFQUFFLENBQUMsQ0FBQTtJQUMvRCxDQUFDO0lBRUQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxLQUFLLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQTtJQUNwRSxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1FBQ3JDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsMkJBQTJCLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDL0YsQ0FBQztJQUVELElBQUksQ0FBQztRQUNILE1BQU0sVUFBVSxHQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFhLFlBQVksQ0FBQyxDQUFBO1FBQy9ELE1BQU0sS0FBSyxHQUFTLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzlDLE1BQU0sUUFBUSxHQUFNLElBQUkscUNBQWUsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNyRSxNQUFNLEtBQUssR0FBUyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDOUIsTUFBTSxNQUFNLEdBQVEsTUFBTSxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNuRSxNQUFNLFNBQVMsR0FBSyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsS0FBSyxDQUFBO1FBRXRDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQzFCLEtBQUssRUFBSSxLQUFLO2dCQUNkLE9BQU8sRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFO2dCQUN2QixPQUFPO2dCQUNQLFNBQVM7YUFDVixDQUFDLENBQUE7UUFDSixDQUFDO1FBRUQsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsR0FBRyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBQ3hELENBQUM7SUFBQyxPQUFPLEdBQVEsRUFBRSxDQUFDO1FBQ2xCLE9BQU8sQ0FBQyxLQUFLLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQ3ZELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsMkJBQTJCLEVBQUUsQ0FBQyxDQUFBO0lBQ3JFLENBQUM7QUFDSCxDQUFDLENBQUE7QUFyQ1ksUUFBQSxJQUFJLFFBcUNoQiJ9