"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenBeautyFactsProvider = void 0;
const constants_1 = require("../constants");
const open_facts_base_1 = require("./open-facts-base");
class OpenBeautyFactsProvider extends open_facts_base_1.OpenFactsBaseProvider {
    constructor(options = {}) {
        super(constants_1.PROVIDER_IDS.OPEN_BEAUTY_FACTS, options, 20);
        this.host = "openbeautyfacts.org";
    }
}
exports.OpenBeautyFactsProvider = OpenBeautyFactsProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3Blbi1iZWF1dHktZmFjdHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9iYXJjb2RlL3Byb3ZpZGVycy9vcGVuLWJlYXV0eS1mYWN0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw0Q0FBMkM7QUFFM0MsdURBQXlEO0FBRXpELE1BQWEsdUJBQXdCLFNBQVEsdUNBQXFCO0lBR2hFLFlBQVksVUFBd0MsRUFBRTtRQUNwRCxLQUFLLENBQUMsd0JBQVksQ0FBQyxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFIakMsU0FBSSxHQUFHLHFCQUFxQixDQUFBO0lBSS9DLENBQUM7Q0FDRjtBQU5ELDBEQU1DIn0=