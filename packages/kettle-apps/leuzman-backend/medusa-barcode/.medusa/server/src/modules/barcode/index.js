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
exports.BarcodeService = exports.BARCODE_MODULE = void 0;
const service_1 = __importDefault(require("./service"));
const utils_1 = require("@medusajs/framework/utils");
exports.BARCODE_MODULE = "barcode";
exports.default = (0, utils_1.Module)(exports.BARCODE_MODULE, {
    service: service_1.default,
});
var service_2 = require("./service");
Object.defineProperty(exports, "BarcodeService", { enumerable: true, get: function () { return __importDefault(service_2).default; } });
__exportStar(require("./types"), exports);
__exportStar(require("./constants"), exports);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9iYXJjb2RlL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsd0RBQXNDO0FBQ3RDLHFEQUF1RDtBQUUxQyxRQUFBLGNBQWMsR0FBRyxTQUFrQixDQUFBO0FBRWhELGtCQUFlLElBQUEsY0FBTSxFQUFDLHNCQUFjLEVBQUU7SUFDcEMsT0FBTyxFQUFFLGlCQUFjO0NBQ3hCLENBQUMsQ0FBQTtBQUVGLHFDQUE4RTtBQUFyRSwwSEFBQSxPQUFPLE9BQWtCO0FBQ2xDLDBDQUF1QjtBQUN2Qiw4Q0FBMkIifQ==