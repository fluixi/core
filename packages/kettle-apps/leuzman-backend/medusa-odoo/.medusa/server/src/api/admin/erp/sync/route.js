"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const index_js_1 = require("../../../../modules/odoo-sync/types/index.js");
async function POST(req, res) {
    const { entity_type, medusa_id, operation = 'update' } = req.body;
    if (!entity_type || !medusa_id) {
        return res.status(400).json({ error: 'entity_type and medusa_id are required' });
    }
    const queueMap = {
        product: index_js_1.QUEUE.PRODUCT,
        variant: index_js_1.QUEUE.PRODUCT,
        order: index_js_1.QUEUE.ORDER,
        customer: index_js_1.QUEUE.CUSTOMER,
        inventory: index_js_1.QUEUE.INVENTORY,
    };
    const queueName = queueMap[entity_type];
    if (!queueName) {
        return res.status(400).json({ error: `Unknown entity_type: ${entity_type}` });
    }
    const queues = req.scope.resolve('erpQueues');
    const queue = queues[queueName];
    const idempotency_key = `manual:${entity_type}:${medusa_id}:${Date.now()}`;
    await queue.add(`${entity_type}:${operation}`, {
        entity_type,
        medusa_id,
        operation,
        triggered_by: 'manual',
        idempotency_key,
    }, {
        jobId: `manual_${medusa_id}_${Date.now()}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
    });
    res.json({ success: true, queue: queueName, idempotency_key });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvYXBpL2FkbWluL2VycC9zeW5jL3JvdXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBSUEsb0JBbUNDO0FBckNELDJFQUFvRTtBQUU3RCxLQUFLLFVBQVUsSUFBSSxDQUFDLEdBQWtCLEVBQUUsR0FBbUI7SUFDaEUsTUFBTSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsU0FBUyxHQUFHLFFBQVEsRUFBRSxHQUFHLEdBQUcsQ0FBQyxJQUFXLENBQUE7SUFDeEUsSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQy9CLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsd0NBQXdDLEVBQUUsQ0FBQyxDQUFBO0lBQ2xGLENBQUM7SUFFRCxNQUFNLFFBQVEsR0FBMkI7UUFDdkMsT0FBTyxFQUFJLGdCQUFLLENBQUMsT0FBTztRQUN4QixPQUFPLEVBQUksZ0JBQUssQ0FBQyxPQUFPO1FBQ3hCLEtBQUssRUFBTSxnQkFBSyxDQUFDLEtBQUs7UUFDdEIsUUFBUSxFQUFHLGdCQUFLLENBQUMsUUFBUTtRQUN6QixTQUFTLEVBQUUsZ0JBQUssQ0FBQyxTQUFTO0tBQzNCLENBQUE7SUFDRCxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDdkMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2YsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSx3QkFBd0IsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQy9FLENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBMEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDcEUsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBRS9CLE1BQU0sZUFBZSxHQUFHLFVBQVUsV0FBVyxJQUFJLFNBQVMsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQTtJQUMxRSxNQUFNLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxXQUFXLElBQUksU0FBUyxFQUFFLEVBQUU7UUFDN0MsV0FBVztRQUNYLFNBQVM7UUFDVCxTQUFTO1FBQ1QsWUFBWSxFQUFLLFFBQVE7UUFDekIsZUFBZTtLQUNoQixFQUFFO1FBQ0QsS0FBSyxFQUFJLFVBQVUsU0FBUyxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRTtRQUM1QyxRQUFRLEVBQUUsQ0FBQztRQUNYLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRTtLQUM5QyxDQUFDLENBQUE7SUFFRixHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUE7QUFDaEUsQ0FBQyJ9