"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = erpReconciliationJob;
const index_js_1 = require("../modules/odoo-sync/index.js");
async function erpReconciliationJob(container) {
    const syncService = container.resolve(index_js_1.ODOO_SYNC_MODULE);
    await syncService.runReconciliation();
}
exports.config = {
    name: 'erp-reconciliation',
    schedule: '0 3 * * *', // daily at 03:00
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJwLXJlY29uY2lsaWF0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2pvYnMvZXJwLXJlY29uY2lsaWF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUdBLHVDQUdDO0FBTEQsNERBQWlGO0FBRWxFLEtBQUssVUFBVSxvQkFBb0IsQ0FBQyxTQUEwQjtJQUMzRSxNQUFNLFdBQVcsR0FBb0IsU0FBUyxDQUFDLE9BQU8sQ0FBQywyQkFBZ0IsQ0FBQyxDQUFBO0lBQ3hFLE1BQU0sV0FBVyxDQUFDLGlCQUFpQixFQUFFLENBQUE7QUFDdkMsQ0FBQztBQUVZLFFBQUEsTUFBTSxHQUFHO0lBQ3BCLElBQUksRUFBTSxvQkFBb0I7SUFDOUIsUUFBUSxFQUFFLFdBQVcsRUFBRSxpQkFBaUI7Q0FDekMsQ0FBQSJ9