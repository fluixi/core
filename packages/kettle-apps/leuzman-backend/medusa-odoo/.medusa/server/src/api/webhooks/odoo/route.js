"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const crypto_1 = __importDefault(require("crypto"));
async function POST(req, res) {
    // HMAC verification
    const secret = process.env.ODOO_WEBHOOK_SECRET;
    if (secret) {
        const sig = req.headers['x-odoo-signature'] || '';
        const raw = JSON.stringify(req.body);
        const expected = crypto_1.default.createHmac('sha256', secret).update(raw).digest('hex');
        if (!crypto_1.default.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
            return res.status(401).json({ error: 'Invalid signature' });
        }
    }
    const { event, data } = req.body;
    if (!event || !data)
        return res.status(400).json({ error: 'Missing event or data' });
    const queues = req.scope.resolve('erpQueues');
    // Route to appropriate queue for odoo → medusa handling
    // (For now we log — full odoo→medusa would call Medusa Admin SDK)
    console.log(`[medusa-odoo] Odoo webhook received: ${event}`, data?.id);
    res.json({ received: true, event });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL3dlYmhvb2tzL29kb28vcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFLQSxvQkFzQkM7QUExQkQsb0RBQTJCO0FBSXBCLEtBQUssVUFBVSxJQUFJLENBQUMsR0FBa0IsRUFBRSxHQUFtQjtJQUNoRSxvQkFBb0I7SUFDcEIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQTtJQUM5QyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQ1gsTUFBTSxHQUFHLEdBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBWSxJQUFJLEVBQUUsQ0FBQTtRQUM3RCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwQyxNQUFNLFFBQVEsR0FBRyxnQkFBTSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUM5RSxJQUFJLENBQUMsZ0JBQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNyRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLG1CQUFtQixFQUFFLENBQUMsQ0FBQTtRQUM3RCxDQUFDO0lBQ0gsQ0FBQztJQUVELE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQVcsQ0FBQTtJQUN2QyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsSUFBSTtRQUFFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQyxDQUFBO0lBRXBGLE1BQU0sTUFBTSxHQUEwQixHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUVwRSx3REFBd0Q7SUFDeEQsa0VBQWtFO0lBQ2xFLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0NBQXdDLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUV0RSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO0FBQ3JDLENBQUMifQ==