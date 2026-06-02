"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenPetFoodFactsProvider = void 0;
const constants_1 = require("../constants");
const open_facts_base_1 = require("./open-facts-base");
class OpenPetFoodFactsProvider extends open_facts_base_1.OpenFactsBaseProvider {
    constructor(options = {}) {
        super(constants_1.PROVIDER_IDS.OPEN_PET_FOOD_FACTS, options, 30);
        this.host = "openpetfoodfacts.org";
    }
}
exports.OpenPetFoodFactsProvider = OpenPetFoodFactsProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3Blbi1wZXQtZm9vZC1mYWN0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL2JhcmNvZGUvcHJvdmlkZXJzL29wZW4tcGV0LWZvb2QtZmFjdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNENBQTJDO0FBRTNDLHVEQUF5RDtBQUV6RCxNQUFhLHdCQUF5QixTQUFRLHVDQUFxQjtJQUdqRSxZQUFZLFVBQXdDLEVBQUU7UUFDcEQsS0FBSyxDQUFDLHdCQUFZLENBQUMsbUJBQW1CLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBSG5DLFNBQUksR0FBRyxzQkFBc0IsQ0FBQTtJQUloRCxDQUFDO0NBQ0Y7QUFORCw0REFNQyJ9