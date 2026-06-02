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
exports.buildProductMetadata = exports.normalizeCategory = exports.sanitizeNormalized = exports.upcToEan13 = exports.computeEan13CheckDigit = exports.parseBarcode = exports.UpcItemDbProvider = exports.BarcodeLookupProvider = exports.EanSearchProvider = exports.GoogleBooksProvider = exports.OpenProductsFactsProvider = exports.OpenPetFoodFactsProvider = exports.OpenBeautyFactsProvider = exports.OpenFoodFactsProvider = exports.ProviderRegistry = exports.BaseBarcodeProvider = exports.batchBarcodeImportWorkflow = exports.lookupAndCreateProductWorkflow = exports.BARCODE_MODULE = exports.default = void 0;
// Module definition (default export required for Medusa plugin resolution)
var index_js_1 = require("./modules/barcode/index.js");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(index_js_1).default; } });
var index_js_2 = require("./modules/barcode/index.js");
Object.defineProperty(exports, "BARCODE_MODULE", { enumerable: true, get: function () { return index_js_2.BARCODE_MODULE; } });
__exportStar(require("./modules/barcode/types.js"), exports);
__exportStar(require("./modules/barcode/constants.js"), exports);
// Workflows
var index_js_3 = require("./workflows/index.js");
Object.defineProperty(exports, "lookupAndCreateProductWorkflow", { enumerable: true, get: function () { return index_js_3.lookupAndCreateProductWorkflow; } });
Object.defineProperty(exports, "batchBarcodeImportWorkflow", { enumerable: true, get: function () { return index_js_3.batchBarcodeImportWorkflow; } });
// Providers (for custom provider extension)
var index_js_4 = require("./modules/barcode/providers/index.js");
Object.defineProperty(exports, "BaseBarcodeProvider", { enumerable: true, get: function () { return index_js_4.BaseBarcodeProvider; } });
Object.defineProperty(exports, "ProviderRegistry", { enumerable: true, get: function () { return index_js_4.ProviderRegistry; } });
Object.defineProperty(exports, "OpenFoodFactsProvider", { enumerable: true, get: function () { return index_js_4.OpenFoodFactsProvider; } });
Object.defineProperty(exports, "OpenBeautyFactsProvider", { enumerable: true, get: function () { return index_js_4.OpenBeautyFactsProvider; } });
Object.defineProperty(exports, "OpenPetFoodFactsProvider", { enumerable: true, get: function () { return index_js_4.OpenPetFoodFactsProvider; } });
Object.defineProperty(exports, "OpenProductsFactsProvider", { enumerable: true, get: function () { return index_js_4.OpenProductsFactsProvider; } });
Object.defineProperty(exports, "GoogleBooksProvider", { enumerable: true, get: function () { return index_js_4.GoogleBooksProvider; } });
Object.defineProperty(exports, "EanSearchProvider", { enumerable: true, get: function () { return index_js_4.EanSearchProvider; } });
Object.defineProperty(exports, "BarcodeLookupProvider", { enumerable: true, get: function () { return index_js_4.BarcodeLookupProvider; } });
Object.defineProperty(exports, "UpcItemDbProvider", { enumerable: true, get: function () { return index_js_4.UpcItemDbProvider; } });
// Utilities
var barcode_parser_js_1 = require("./modules/barcode/utils/barcode-parser.js");
Object.defineProperty(exports, "parseBarcode", { enumerable: true, get: function () { return barcode_parser_js_1.parseBarcode; } });
Object.defineProperty(exports, "computeEan13CheckDigit", { enumerable: true, get: function () { return barcode_parser_js_1.computeEan13CheckDigit; } });
Object.defineProperty(exports, "upcToEan13", { enumerable: true, get: function () { return barcode_parser_js_1.upcToEan13; } });
var normalize_product_js_1 = require("./modules/barcode/utils/normalize-product.js");
Object.defineProperty(exports, "sanitizeNormalized", { enumerable: true, get: function () { return normalize_product_js_1.sanitizeNormalized; } });
Object.defineProperty(exports, "normalizeCategory", { enumerable: true, get: function () { return normalize_product_js_1.normalizeCategory; } });
Object.defineProperty(exports, "buildProductMetadata", { enumerable: true, get: function () { return normalize_product_js_1.buildProductMetadata; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyRUFBMkU7QUFDM0UsdURBQW9EO0FBQTNDLG9IQUFBLE9BQU8sT0FBQTtBQUNoQix1REFBMkQ7QUFBbEQsMEdBQUEsY0FBYyxPQUFBO0FBSXZCLDZEQUEwQztBQUMxQyxpRUFBOEM7QUFFOUMsWUFBWTtBQUNaLGlEQUFpRztBQUF4RiwwSEFBQSw4QkFBOEIsT0FBQTtBQUFFLHNIQUFBLDBCQUEwQixPQUFBO0FBRW5FLDRDQUE0QztBQUM1QyxpRUFXNkM7QUFWM0MsK0dBQUEsbUJBQW1CLE9BQUE7QUFDbkIsNEdBQUEsZ0JBQWdCLE9BQUE7QUFDaEIsaUhBQUEscUJBQXFCLE9BQUE7QUFDckIsbUhBQUEsdUJBQXVCLE9BQUE7QUFDdkIsb0hBQUEsd0JBQXdCLE9BQUE7QUFDeEIscUhBQUEseUJBQXlCLE9BQUE7QUFDekIsK0dBQUEsbUJBQW1CLE9BQUE7QUFDbkIsNkdBQUEsaUJBQWlCLE9BQUE7QUFDakIsaUhBQUEscUJBQXFCLE9BQUE7QUFDckIsNkdBQUEsaUJBQWlCLE9BQUE7QUFHbkIsWUFBWTtBQUNaLCtFQUE0RztBQUFuRyxpSEFBQSxZQUFZLE9BQUE7QUFBRSwySEFBQSxzQkFBc0IsT0FBQTtBQUFFLCtHQUFBLFVBQVUsT0FBQTtBQUN6RCxxRkFBMEg7QUFBakgsMEhBQUEsa0JBQWtCLE9BQUE7QUFBRSx5SEFBQSxpQkFBaUIsT0FBQTtBQUFFLDRIQUFBLG9CQUFvQixPQUFBIn0=