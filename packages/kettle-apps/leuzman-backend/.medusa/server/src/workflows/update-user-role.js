"use strict";
/**
 * updateUserRoleWorkflow — stores a user's admin role in metadata.role.
 *
 * Medusa's User module has no built-in role field beyond the basic actor
 * type, so we persist granular roles (superadmin | admin | support | viewer)
 * in user.metadata.  The step is compensatable: if any downstream step fails,
 * the previous metadata is restored.
 *
 * Usage:
 *   const { result } = await updateUserRoleWorkflow(req.scope).run({
 *     input: { userId: 'usr_01...', role: 'support' },
 *   });
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserRoleWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const utils_1 = require("@medusajs/framework/utils");
const updateUserRoleStep = (0, workflows_sdk_1.createStep)('update-user-role-step', async (input, { container }) => {
    const userModule = container.resolve(utils_1.Modules.USER);
    const [existing] = await userModule.listUsers({ id: [input.userId] });
    if (!existing)
        throw new Error(`User ${input.userId} not found`);
    const prevMetadata = existing.metadata ?? {};
    await userModule.updateUsers([{
            id: input.userId,
            metadata: {
                ...prevMetadata,
                role: input.role,
            },
        }]);
    return new workflows_sdk_1.StepResponse({ userId: input.userId, role: input.role }, { userId: input.userId, prevMetadata });
}, async (compensate, { container }) => {
    if (!compensate)
        return;
    const userModule = container.resolve(utils_1.Modules.USER);
    await userModule.updateUsers([{
            id: compensate.userId,
            metadata: compensate.prevMetadata,
        }]);
});
exports.updateUserRoleWorkflow = (0, workflows_sdk_1.createWorkflow)('update-user-role', (input) => {
    const result = updateUserRoleStep(input);
    return new workflows_sdk_1.WorkflowResponse(result);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLXVzZXItcm9sZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy93b3JrZmxvd3MvdXBkYXRlLXVzZXItcm9sZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7OztHQVlHOzs7QUFFSCxxRUFLMkM7QUFDM0MscURBQW9EO0FBY3BELE1BQU0sa0JBQWtCLEdBQUcsSUFBQSwwQkFBVSxFQUNuQyx1QkFBdUIsRUFDdkIsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUU7SUFDN0IsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxlQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFbkQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLE1BQU0sVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDdEUsSUFBSSxDQUFDLFFBQVE7UUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLFFBQVEsS0FBSyxDQUFDLE1BQU0sWUFBWSxDQUFDLENBQUM7SUFFakUsTUFBTSxZQUFZLEdBQUksUUFBUSxDQUFDLFFBQW9DLElBQUksRUFBRSxDQUFDO0lBRTFFLE1BQU0sVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzVCLEVBQUUsRUFBRSxLQUFLLENBQUMsTUFBTTtZQUNoQixRQUFRLEVBQUU7Z0JBQ1IsR0FBRyxZQUFZO2dCQUNmLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTthQUNqQjtTQUNGLENBQUMsQ0FBQyxDQUFDO0lBRUosT0FBTyxJQUFJLDRCQUFZLENBQ3JCLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsRUFDMUMsRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUUsQ0FDdkMsQ0FBQztBQUNKLENBQUMsRUFDRCxLQUFLLEVBQUUsVUFBVSxFQUFFLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRTtJQUNsQyxJQUFJLENBQUMsVUFBVTtRQUFFLE9BQU87SUFDeEIsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxlQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkQsTUFBTSxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDNUIsRUFBRSxFQUFFLFVBQVUsQ0FBQyxNQUFNO1lBQ3JCLFFBQVEsRUFBRSxVQUFVLENBQUMsWUFBWTtTQUNsQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FDRixDQUFDO0FBRVcsUUFBQSxzQkFBc0IsR0FBRyxJQUFBLDhCQUFjLEVBQ2xELGtCQUFrQixFQUNsQixDQUFDLEtBQTBCLEVBQUUsRUFBRTtJQUM3QixNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN6QyxPQUFPLElBQUksZ0NBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDdEMsQ0FBQyxDQUNGLENBQUMifQ==