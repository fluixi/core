"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OdooSyncService = exports.ODOO_SYNC_MODULE = void 0;
const utils_1 = require("@medusajs/framework/utils");
const odoo_sync_service_js_1 = __importDefault(require("./services/odoo-sync-service.js"));
const infrastructure_js_1 = __importDefault(require("./loaders/infrastructure.js"));
exports.ODOO_SYNC_MODULE = 'odooSync';
exports.default = (0, utils_1.Module)(exports.ODOO_SYNC_MODULE, {
    service: odoo_sync_service_js_1.default,
    loaders: [infrastructure_js_1.default],
});
var odoo_sync_service_js_2 = require("./services/odoo-sync-service.js");
Object.defineProperty(exports, "OdooSyncService", { enumerable: true, get: function () { return __importDefault(odoo_sync_service_js_2).default; } });
__exportStar(require("./models/erp-mapping.js"), exports);
__exportStar(require("./models/erp-sync-log.js"), exports);
__exportStar(require("./models/erp-sync-failure.js"), exports);
__exportStar(require("./models/erp-inventory-snapshot.js"), exports);
__exportStar(require("./models/erp-reconciliation-log.js"), exports);
__exportStar(require("./models/erp-conflict-resolution.js"), exports);
__exportStar(require("./models/offline-pos-transaction.js"), exports);
__exportStar(require("./models/barcode-scan-log.js"), exports);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9vZG9vLXN5bmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxxREFBa0Q7QUFDbEQsMkZBQTZEO0FBQzdELG9GQUE4RDtBQUVqRCxRQUFBLGdCQUFnQixHQUFHLFVBQVUsQ0FBQTtBQUUxQyxrQkFBZSxJQUFBLGNBQU0sRUFBQyx3QkFBZ0IsRUFBRTtJQUN0QyxPQUFPLEVBQUUsOEJBQWU7SUFDeEIsT0FBTyxFQUFFLENBQUMsMkJBQW9CLENBQUM7Q0FDaEMsQ0FBQyxDQUFBO0FBRUYsd0VBQTRFO0FBQW5FLHdJQUFBLE9BQU8sT0FBbUI7QUFDbkMsMERBQXVDO0FBQ3ZDLDJEQUF3QztBQUN4QywrREFBNEM7QUFDNUMscUVBQWtEO0FBQ2xELHFFQUFrRDtBQUNsRCxzRUFBbUQ7QUFDbkQsc0VBQW1EO0FBQ25ELCtEQUE0QyJ9