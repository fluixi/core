"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenProductsFactsProvider = void 0;
const constants_1 = require("../constants");
const open_facts_base_1 = require("./open-facts-base");
class OpenProductsFactsProvider extends open_facts_base_1.OpenFactsBaseProvider {
    constructor(options = {}) {
        super(constants_1.PROVIDER_IDS.OPEN_PRODUCTS_FACTS, options, 40);
        this.host = "openproductsfacts.org";
    }
}
exports.OpenProductsFactsProvider = OpenProductsFactsProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3Blbi1wcm9kdWN0cy1mYWN0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL2JhcmNvZGUvcHJvdmlkZXJzL29wZW4tcHJvZHVjdHMtZmFjdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNENBQTJDO0FBRTNDLHVEQUF5RDtBQUV6RCxNQUFhLHlCQUEwQixTQUFRLHVDQUFxQjtJQUdsRSxZQUFZLFVBQXdDLEVBQUU7UUFDcEQsS0FBSyxDQUFDLHdCQUFZLENBQUMsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBSG5DLFNBQUksR0FBRyx1QkFBdUIsQ0FBQTtJQUlqRCxDQUFDO0NBQ0Y7QUFORCw4REFNQyJ9