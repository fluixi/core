"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VariantExtension = exports.PRODUCT_EXT_MODULE = void 0;
const utils_1 = require("@medusajs/framework/utils");
const product_ext_service_1 = __importDefault(require("./services/product-ext-service"));
exports.PRODUCT_EXT_MODULE = 'ProductExt';
exports.default = (0, utils_1.Module)(exports.PRODUCT_EXT_MODULE, {
    service: product_ext_service_1.default,
});
var variant_extension_1 = require("./models/variant-extension");
Object.defineProperty(exports, "VariantExtension", { enumerable: true, get: function () { return variant_extension_1.VariantExtension; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9wcm9kdWN0LWV4dC9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxxREFBbUQ7QUFDbkQseUZBQStEO0FBRWxELFFBQUEsa0JBQWtCLEdBQUcsWUFBWSxDQUFDO0FBRS9DLGtCQUFlLElBQUEsY0FBTSxFQUFDLDBCQUFrQixFQUFFO0lBQ3hDLE9BQU8sRUFBRSw2QkFBaUI7Q0FDM0IsQ0FBQyxDQUFDO0FBSUgsZ0VBQThEO0FBQXJELHFIQUFBLGdCQUFnQixPQUFBIn0=