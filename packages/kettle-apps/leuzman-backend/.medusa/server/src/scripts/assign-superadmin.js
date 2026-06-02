"use strict";
/**
 * assign-superadmin — one-time bootstrap script.
 *
 * Sets metadata.role = 'superadmin' on the target user so they can
 * use the /admin/users/:id/role endpoint to assign roles to others.
 *
 * Run with:
 *   EMAIL=you@example.com pnpm medusa exec ./src/scripts/assign-superadmin.ts
 *
 * If EMAIL env var is not set, the script targets the first user in the database.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = assignSuperadmin;
const utils_1 = require("@medusajs/framework/utils");
const update_user_role_1 = require("../workflows/update-user-role");
async function assignSuperadmin({ container }) {
    const logger = container.resolve(utils_1.ContainerRegistrationKeys.LOGGER);
    const userModule = container.resolve(utils_1.Modules.USER);
    const targetEmail = process.env.EMAIL;
    const users = targetEmail
        ? await userModule.listUsers({ email: targetEmail })
        : await userModule.listUsers({}, { take: 1 });
    if (!users.length) {
        logger.error(targetEmail
            ? `No user found with email: ${targetEmail}`
            : 'No users found in the database. Create an admin user first via: pnpm medusa user -e you@example.com -p password');
        process.exit(1);
    }
    const user = users[0];
    logger.info(`Assigning superadmin role to: ${user.email} (${user.id})`);
    await (0, update_user_role_1.updateUserRoleWorkflow)(container).run({
        input: { userId: user.id, role: 'superadmin' },
    });
    logger.info(`✅ Done — ${user.email} is now superadmin.`);
    logger.info('Log in and open Settings → Team to assign roles to other users.');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzaWduLXN1cGVyYWRtaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvc2NyaXB0cy9hc3NpZ24tc3VwZXJhZG1pbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7R0FVRzs7QUFNSCxtQ0EwQkM7QUE3QkQscURBQStFO0FBQy9FLG9FQUF1RTtBQUV4RCxLQUFLLFVBQVUsZ0JBQWdCLENBQUMsRUFBRSxTQUFTLEVBQVk7SUFDcEUsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyxpQ0FBeUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNuRSxNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLGVBQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUVuRCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztJQUN0QyxNQUFNLEtBQUssR0FBRyxXQUFXO1FBQ3ZCLENBQUMsQ0FBQyxNQUFNLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLENBQUM7UUFDcEQsQ0FBQyxDQUFDLE1BQU0sVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUVoRCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2xCLE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBVztZQUN0QixDQUFDLENBQUMsNkJBQTZCLFdBQVcsRUFBRTtZQUM1QyxDQUFDLENBQUMsaUhBQWlILENBQ3BILENBQUM7UUFDRixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEIsTUFBTSxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUV4RSxNQUFNLElBQUEseUNBQXNCLEVBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDO1FBQzFDLEtBQUssRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUU7S0FDL0MsQ0FBQyxDQUFDO0lBRUgsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLElBQUksQ0FBQyxLQUFLLHFCQUFxQixDQUFDLENBQUM7SUFDekQsTUFBTSxDQUFDLElBQUksQ0FBQyxpRUFBaUUsQ0FBQyxDQUFDO0FBQ2pGLENBQUMifQ==