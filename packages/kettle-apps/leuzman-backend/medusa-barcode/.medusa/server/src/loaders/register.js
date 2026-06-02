"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = barcodeModuleLoader;
const index_js_1 = require("../modules/barcode/index.js");
/**
 * Startup loader hook.
 *
 * Runs after Medusa has fully booted.  Logs the registered providers and
 * bootstraps any runtime setup the barcode module needs.
 */
async function barcodeModuleLoader({ container }) {
    try {
        const svc = container.resolve(index_js_1.BARCODE_MODULE);
        const providers = svc["providerRegistry"]?.getAll?.() ?? [];
        const enabledIds = svc["providerRegistry"]?.getEnabled?.()?.map((p) => p.providerId) ?? [];
        console.info(`[medusa-barcode] Module loaded. ` +
            `Providers: ${providers.map((p) => p.providerId).join(", ") || "none"}. ` +
            `Enabled: ${enabledIds.join(", ") || "none"}.`);
        // Prune stale cache entries on cold start (best-effort)
        try {
            const purged = await svc.purgeExpiredCache();
            if (purged > 0) {
                console.info(`[medusa-barcode] Purged ${purged} expired cache entries on startup.`);
            }
        }
        catch {
            // Non-fatal — DB might not be migrated yet on first run
        }
    }
    catch {
        // Module not registered — skip
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvbG9hZGVycy9yZWdpc3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQWVBLHNDQXlCQztBQXhDRCwwREFBNEQ7QUFTNUQ7Ozs7O0dBS0c7QUFDWSxLQUFLLFVBQVUsbUJBQW1CLENBQUMsRUFBRSxTQUFTLEVBQWlCO0lBQzVFLElBQUksQ0FBQztRQUNILE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQWlCLHlCQUFjLENBQUMsQ0FBQTtRQUU3RCxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsa0JBQWtCLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQTtRQUMzRCxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsa0JBQWtCLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQXlCLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFbEgsT0FBTyxDQUFDLElBQUksQ0FDVixrQ0FBa0M7WUFDbEMsY0FBYyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBeUIsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxNQUFNLElBQUk7WUFDakcsWUFBWSxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLE1BQU0sR0FBRyxDQUMvQyxDQUFBO1FBRUQsd0RBQXdEO1FBQ3hELElBQUksQ0FBQztZQUNILE1BQU0sTUFBTSxHQUFHLE1BQU0sR0FBRyxDQUFDLGlCQUFpQixFQUFFLENBQUE7WUFDNUMsSUFBSSxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2YsT0FBTyxDQUFDLElBQUksQ0FBQywyQkFBMkIsTUFBTSxvQ0FBb0MsQ0FBQyxDQUFBO1lBQ3JGLENBQUM7UUFDSCxDQUFDO1FBQUMsTUFBTSxDQUFDO1lBQ1Asd0RBQXdEO1FBQzFELENBQUM7SUFDSCxDQUFDO0lBQUMsTUFBTSxDQUFDO1FBQ1AsK0JBQStCO0lBQ2pDLENBQUM7QUFDSCxDQUFDIn0=