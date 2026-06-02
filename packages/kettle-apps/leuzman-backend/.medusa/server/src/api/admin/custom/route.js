"use strict";
/**
 * GET /admin/custom
 *
 * Example custom admin endpoint — extend with business logic as needed.
 * All built-in Medusa Admin endpoints (/admin/products, /admin/orders, etc.)
 * are automatically provided by @medusajs/medusa.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = void 0;
const http_1 = require("@medusajs/framework/http");
// export async function GET(
//   req: MedusaRequest,
//   res: MedusaResponse
// ) {
//   res.sendStatus(200);
// }
exports.GET = [
    (0, http_1.authenticate)("user", ["bearer", "session"]),
    (req, res) => {
        res.json({ message: "Leuzman Admin API is running." });
    },
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL2N1c3RvbS9yb3V0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFHSCxtREFBd0Q7QUFFeEQsNkJBQTZCO0FBQzdCLHdCQUF3QjtBQUN4Qix3QkFBd0I7QUFDeEIsTUFBTTtBQUNOLHlCQUF5QjtBQUN6QixJQUFJO0FBRVMsUUFBQSxHQUFHLEdBQUc7SUFDakIsSUFBQSxtQkFBWSxFQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUMzQyxDQUFDLEdBQWtCLEVBQUUsR0FBbUIsRUFBRSxFQUFFO1FBQzFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsQ0FBQyxDQUFDO0lBQ3pELENBQUM7Q0FDSyxDQUFDIn0=