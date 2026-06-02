"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertProductExtWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const index_1 = require("../modules/product-ext/index");
const upsertProductExtStep = (0, workflows_sdk_1.createStep)('upsert-product-ext-step', async (input, { container }) => {
    const service = container.resolve(index_1.PRODUCT_EXT_MODULE);
    const existing = await service.listProductExtensions({ product_id: input.product_id });
    // Cast service to any — MedusaService's generated types use `Record<string, unknown>`
    // for json columns but we store VideoItem[] which is an array, not a plain object.
    const svc = service;
    const videos = input.videos ?? [];
    const tagline = input.tagline ?? null;
    let extension;
    if (existing.length) {
        [extension] = await svc.updateProductExtensions([
            { id: existing[0].id, videos, tagline },
        ]);
    }
    else {
        [extension] = await svc.createProductExtensions([
            { product_id: input.product_id, videos, tagline },
        ]);
    }
    return new workflows_sdk_1.StepResponse(extension, { id: extension.id, wasNew: !existing.length });
}, async (ctx, { container }) => {
    if (!ctx)
        return;
    // Compensation: delete newly created extension on workflow failure
    if (ctx.wasNew) {
        const service = container.resolve(index_1.PRODUCT_EXT_MODULE);
        await service.deleteProductExtensions([ctx.id]);
    }
});
exports.upsertProductExtWorkflow = (0, workflows_sdk_1.createWorkflow)('upsert-product-ext', (input) => {
    const extension = upsertProductExtStep(input);
    return new workflows_sdk_1.WorkflowResponse(extension);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBzZXJ0LXByb2R1Y3QtZXh0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3dvcmtmbG93cy91cHNlcnQtcHJvZHVjdC1leHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscUVBSzJDO0FBQzNDLHdEQUFrRTtBQVVsRSxNQUFNLG9CQUFvQixHQUFHLElBQUEsMEJBQVUsRUFDckMseUJBQXlCLEVBQ3pCLEtBQUssRUFBRSxLQUE0QixFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRTtJQUNwRCxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFvQiwwQkFBa0IsQ0FBQyxDQUFDO0lBRXpFLE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLHFCQUFxQixDQUFDLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO0lBRXZGLHNGQUFzRjtJQUN0RixtRkFBbUY7SUFDbkYsTUFBTSxHQUFHLEdBQUcsT0FBYyxDQUFDO0lBQzNCLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDO0lBQ2xDLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDO0lBRXRDLElBQUksU0FBYyxDQUFDO0lBQ25CLElBQUksUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ3BCLENBQUMsU0FBUyxDQUFDLEdBQUcsTUFBTSxHQUFHLENBQUMsdUJBQXVCLENBQUM7WUFDOUMsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFO1NBQ3hDLENBQUMsQ0FBQztJQUNMLENBQUM7U0FBTSxDQUFDO1FBQ04sQ0FBQyxTQUFTLENBQUMsR0FBRyxNQUFNLEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQztZQUM5QyxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUU7U0FDbEQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELE9BQU8sSUFBSSw0QkFBWSxDQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQ3JGLENBQUMsRUFFRCxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRTtJQUMzQixJQUFJLENBQUMsR0FBRztRQUFFLE9BQU87SUFDakIsbUVBQW1FO0lBQ25FLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2YsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBb0IsMEJBQWtCLENBQUMsQ0FBQztRQUN6RSxNQUFNLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2xELENBQUM7QUFDSCxDQUFDLENBQ0YsQ0FBQztBQUVXLFFBQUEsd0JBQXdCLEdBQUcsSUFBQSw4QkFBYyxFQUNwRCxvQkFBb0IsRUFDcEIsQ0FBQyxLQUE0QixFQUFFLEVBQUU7SUFDL0IsTUFBTSxTQUFTLEdBQUcsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDOUMsT0FBTyxJQUFJLGdDQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3pDLENBQUMsQ0FDRixDQUFDIn0=