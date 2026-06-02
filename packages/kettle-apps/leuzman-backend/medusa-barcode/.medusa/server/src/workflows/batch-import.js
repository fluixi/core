"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchBarcodeImportWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const index_1 = require("../modules/barcode/index");
/**
 * Process all barcodes sequentially within a single step.
 *
 * Running the full lookup-and-create logic inside one step avoids the
 * Workflow SDK proxy limitation — array methods like .map() cannot be called
 * on workflow input objects at definition time.
 */
const processBatchStep = (0, workflows_sdk_1.createStep)("process-batch-step", async (input, { container }) => {
    const svc = container.resolve(index_1.BARCODE_MODULE);
    const results = [];
    for (const barcode of input.barcodes) {
        // Fast-path: skip barcodes already linked to a product
        if (input.skipExisting) {
            const existing = await svc.findBarcodeProduct(barcode);
            if (existing) {
                results.push({
                    barcode,
                    created: false,
                    existing: true,
                    product_id: existing.product_id,
                    variant_id: existing.variant_id ?? undefined,
                });
                continue;
            }
        }
        try {
            const lookup = await svc.lookupBarcode(barcode);
            if (!lookup.found || !lookup.product) {
                results.push({ barcode, created: false, error: lookup.error ?? "Not found" });
                continue;
            }
            const saved = await svc.saveBarcodeProduct({
                barcode,
                product_id: `pending_${barcode}`,
                source_provider: lookup.provider,
            });
            results.push({
                barcode,
                created: true,
                product_id: saved.product_id,
                variant_id: saved.variant_id ?? undefined,
                provider: lookup.provider,
            });
        }
        catch (err) {
            results.push({ barcode, created: false, error: err.message });
        }
    }
    const summary = {
        total: results.length,
        created: results.filter(r => r.created).length,
        skipped: results.filter(r => r.existing === true).length,
        failed: results.filter(r => !r.created && !r.existing).length,
        results,
    };
    return new workflows_sdk_1.StepResponse(summary);
});
// ─── Workflow ─────────────────────────────────────────────────────────────────
exports.batchBarcodeImportWorkflow = (0, workflows_sdk_1.createWorkflow)("barcode-batch-import", (input) => {
    const summary = processBatchStep(input);
    return new workflows_sdk_1.WorkflowResponse(summary);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmF0Y2gtaW1wb3J0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3dvcmtmbG93cy9iYXRjaC1pbXBvcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscUVBSzBDO0FBQzFDLG9EQUEyRDtBQUkzRDs7Ozs7O0dBTUc7QUFDSCxNQUFNLGdCQUFnQixHQUFHLElBQUEsMEJBQVUsRUFDakMsb0JBQW9CLEVBQ3BCLEtBQUssRUFBRSxLQUF1QixFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQTRDLEVBQUU7SUFDekYsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBaUIsc0JBQWMsQ0FBQyxDQUFBO0lBRTdELE1BQU0sT0FBTyxHQUF5RCxFQUFFLENBQUE7SUFFeEUsS0FBSyxNQUFNLE9BQU8sSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDckMsdURBQXVEO1FBQ3ZELElBQUksS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sUUFBUSxHQUFHLE1BQU0sR0FBRyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3RELElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2IsT0FBTyxDQUFDLElBQUksQ0FBQztvQkFDWCxPQUFPO29CQUNQLE9BQU8sRUFBSyxLQUFLO29CQUNqQixRQUFRLEVBQUksSUFBSTtvQkFDaEIsVUFBVSxFQUFFLFFBQVEsQ0FBQyxVQUFVO29CQUMvQixVQUFVLEVBQUUsUUFBUSxDQUFDLFVBQVUsSUFBSSxTQUFTO2lCQUM3QyxDQUFDLENBQUE7Z0JBQ0YsU0FBUTtZQUNWLENBQUM7UUFDSCxDQUFDO1FBRUQsSUFBSSxDQUFDO1lBQ0gsTUFBTSxNQUFNLEdBQUcsTUFBTSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBRS9DLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNyQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLElBQUksV0FBVyxFQUFFLENBQUMsQ0FBQTtnQkFDN0UsU0FBUTtZQUNWLENBQUM7WUFFRCxNQUFNLEtBQUssR0FBRyxNQUFNLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQztnQkFDekMsT0FBTztnQkFDUCxVQUFVLEVBQU8sV0FBVyxPQUFPLEVBQUU7Z0JBQ3JDLGVBQWUsRUFBRSxNQUFNLENBQUMsUUFBUTthQUNqQyxDQUFDLENBQUE7WUFFRixPQUFPLENBQUMsSUFBSSxDQUFDO2dCQUNYLE9BQU87Z0JBQ1AsT0FBTyxFQUFLLElBQUk7Z0JBQ2hCLFVBQVUsRUFBRSxLQUFLLENBQUMsVUFBVTtnQkFDNUIsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVLElBQUksU0FBUztnQkFDekMsUUFBUSxFQUFJLE1BQU0sQ0FBQyxRQUFRO2FBQzVCLENBQUMsQ0FBQTtRQUNKLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2IsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRyxHQUFhLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUMxRSxDQUFDO0lBQ0gsQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFzQjtRQUNqQyxLQUFLLEVBQUksT0FBTyxDQUFDLE1BQU07UUFDdkIsT0FBTyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTTtRQUM5QyxPQUFPLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEtBQUssSUFBSSxDQUFDLENBQUMsTUFBTTtRQUN4RCxNQUFNLEVBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNO1FBQzlELE9BQU87S0FDUixDQUFBO0lBRUQsT0FBTyxJQUFJLDRCQUFZLENBQUMsT0FBTyxDQUFDLENBQUE7QUFDbEMsQ0FBQyxDQUNGLENBQUE7QUFFRCxpRkFBaUY7QUFFcEUsUUFBQSwwQkFBMEIsR0FBRyxJQUFBLDhCQUFjLEVBQ3RELHNCQUFzQixFQUN0QixDQUFDLEtBQXVCLEVBQXVDLEVBQUU7SUFDL0QsTUFBTSxPQUFPLEdBQUcsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDdkMsT0FBTyxJQUFJLGdDQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFBO0FBQ3RDLENBQUMsQ0FDRixDQUFBIn0=