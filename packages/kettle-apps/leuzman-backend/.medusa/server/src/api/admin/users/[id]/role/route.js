"use strict";
/**
 * PATCH /admin/users/:id/role
 *
 * Assigns one of the application-level roles (superadmin | admin | support | viewer)
 * to a Medusa user by writing it into metadata.role.
 *
 * Authorization: caller must be authenticated AND have metadata.role === 'superadmin'.
 *
 * Body: { role: 'superadmin' | 'admin' | 'support' | 'viewer' }
 *
 * Returns: { userId, role }
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATCH = void 0;
const http_1 = require("@medusajs/framework/http");
const utils_1 = require("@medusajs/framework/utils");
const update_user_role_1 = require("../../../../../workflows/update-user-role");
const VALID_ROLES = ['superadmin', 'admin', 'support', 'viewer'];
async function handler(req, res) {
    const { id: userId } = req.params;
    const { role } = req.body;
    if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({
            message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
        });
    }
    // Resolve caller from auth context and check superadmin privilege
    const callerId = req.auth_context?.actor_id;
    if (!callerId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const userModule = req.scope.resolve(utils_1.Modules.USER);
    const [caller] = await userModule.listUsers({ id: [callerId] });
    const callerRole = caller?.metadata?.role;
    if (callerRole !== 'superadmin') {
        return res.status(403).json({ message: 'Only superadmins can assign roles.' });
    }
    const { result } = await (0, update_user_role_1.updateUserRoleWorkflow)(req.scope).run({
        input: { userId, role },
    });
    res.json(result);
}
exports.PATCH = [
    (0, http_1.authenticate)('user', ['bearer', 'session']),
    handler,
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL3VzZXJzL1tpZF0vcm9sZS9yb3V0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7O0dBV0c7OztBQUdILG1EQUF3RDtBQUN4RCxxREFBb0Q7QUFDcEQsZ0ZBQW1HO0FBRW5HLE1BQU0sV0FBVyxHQUFnQixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBRTlFLEtBQUssVUFBVSxPQUFPLENBQUMsR0FBa0IsRUFBRSxHQUFtQjtJQUM1RCxNQUFNLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxNQUF3QixDQUFDO0lBQ3BELE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUMsSUFBMkIsQ0FBQztJQUVqRCxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ2hDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUFFLGlDQUFpQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO1NBQ25FLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxrRUFBa0U7SUFDbEUsTUFBTSxRQUFRLEdBQUksR0FBVyxDQUFDLFlBQVksRUFBRSxRQUE4QixDQUFDO0lBQzNFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNkLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRUQsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsZUFBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ25ELE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxNQUFNLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDaEUsTUFBTSxVQUFVLEdBQUksTUFBTSxFQUFFLFFBQWdELEVBQUUsSUFBSSxDQUFDO0lBRW5GLElBQUksVUFBVSxLQUFLLFlBQVksRUFBRSxDQUFDO1FBQ2hDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsb0NBQW9DLEVBQUUsQ0FBQyxDQUFDO0lBQ2pGLENBQUM7SUFFRCxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsTUFBTSxJQUFBLHlDQUFzQixFQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUM7UUFDN0QsS0FBSyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtLQUN4QixDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ25CLENBQUM7QUFFWSxRQUFBLEtBQUssR0FBRztJQUNuQixJQUFBLG1CQUFZLEVBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzNDLE9BQU87Q0FDRCxDQUFDIn0=