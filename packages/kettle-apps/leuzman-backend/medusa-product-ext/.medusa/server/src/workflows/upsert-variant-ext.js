"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertVariantExtWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const index_1 = require("../modules/product-ext/index");
const upsertVariantExtStep = (0, workflows_sdk_1.createStep)('upsert-variant-ext-step', async (input, { container }) => {
    const service = container.resolve(index_1.PRODUCT_EXT_MODULE);
    const existing = await service.listVariantExtensions({ variant_id: input.variant_id });
    const svc = service;
    const videos = input.videos ?? [];
    let extension;
    if (existing.length) {
        [extension] = await svc.updateVariantExtensions([{ id: existing[0].id, videos }]);
    }
    else {
        [extension] = await svc.createVariantExtensions([{ variant_id: input.variant_id, videos }]);
    }
    return new workflows_sdk_1.StepResponse(extension, { id: extension.id, wasNew: !existing.length });
}, async (ctx, { container }) => {
    if (!ctx)
        return;
    if (ctx.wasNew) {
        const service = container.resolve(index_1.PRODUCT_EXT_MODULE);
        await service.deleteVariantExtensions([ctx.id]);
    }
});
exports.upsertVariantExtWorkflow = (0, workflows_sdk_1.createWorkflow)('upsert-variant-ext', (input) => {
    const extension = upsertVariantExtStep(input);
    return new workflows_sdk_1.WorkflowResponse(extension);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBzZXJ0LXZhcmlhbnQtZXh0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3dvcmtmbG93cy91cHNlcnQtdmFyaWFudC1leHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscUVBSzJDO0FBQzNDLHdEQUFrRTtBQVNsRSxNQUFNLG9CQUFvQixHQUFHLElBQUEsMEJBQVUsRUFDckMseUJBQXlCLEVBQ3pCLEtBQUssRUFBRSxLQUE0QixFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRTtJQUNwRCxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFvQiwwQkFBa0IsQ0FBQyxDQUFDO0lBQ3pFLE1BQU0sUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLHFCQUFxQixDQUFDLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO0lBRXZGLE1BQU0sR0FBRyxHQUFHLE9BQWMsQ0FBQztJQUMzQixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQztJQUVsQyxJQUFJLFNBQWMsQ0FBQztJQUNuQixJQUFJLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNwQixDQUFDLFNBQVMsQ0FBQyxHQUFHLE1BQU0sR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDcEYsQ0FBQztTQUFNLENBQUM7UUFDTixDQUFDLFNBQVMsQ0FBQyxHQUFHLE1BQU0sR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDOUYsQ0FBQztJQUVELE9BQU8sSUFBSSw0QkFBWSxDQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQ3JGLENBQUMsRUFFRCxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRTtJQUMzQixJQUFJLENBQUMsR0FBRztRQUFFLE9BQU87SUFDakIsSUFBSSxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDZixNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFvQiwwQkFBa0IsQ0FBQyxDQUFDO1FBQ3pFLE1BQU0sT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDbEQsQ0FBQztBQUNILENBQUMsQ0FDRixDQUFDO0FBRVcsUUFBQSx3QkFBd0IsR0FBRyxJQUFBLDhCQUFjLEVBQ3BELG9CQUFvQixFQUNwQixDQUFDLEtBQTRCLEVBQUUsRUFBRTtJQUMvQixNQUFNLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM5QyxPQUFPLElBQUksZ0NBQWdCLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDekMsQ0FBQyxDQUNGLENBQUMifQ==