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
exports.OdooClient = exports.ODOO_SYNC_MODULE = exports.OdooSyncModule = void 0;
var index_js_1 = require("./modules/odoo-sync/index.js");
Object.defineProperty(exports, "OdooSyncModule", { enumerable: true, get: function () { return __importDefault(index_js_1).default; } });
Object.defineProperty(exports, "ODOO_SYNC_MODULE", { enumerable: true, get: function () { return index_js_1.ODOO_SYNC_MODULE; } });
__exportStar(require("./modules/odoo-sync/index.js"), exports);
__exportStar(require("./modules/odoo-sync/types/index.js"), exports);
var odoo_client_js_1 = require("./modules/odoo-sync/client/odoo-client.js");
Object.defineProperty(exports, "OdooClient", { enumerable: true, get: function () { return odoo_client_js_1.OdooClient; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx5REFBMEY7QUFBakYsMkhBQUEsT0FBTyxPQUFrQjtBQUFFLDRHQUFBLGdCQUFnQixPQUFBO0FBQ3BELCtEQUE0QztBQUM1QyxxRUFBa0Q7QUFDbEQsNEVBQXNFO0FBQTdELDRHQUFBLFVBQVUsT0FBQSJ9