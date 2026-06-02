"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.default = barcodeProductCreatedSubscriber;
const constants_1 = require("../modules/barcode/constants");
/**
 * Subscriber for `barcode.product.created`.
 *
 * Hook into this event to trigger downstream actions:
 *   - Inventory auto-linking
 *   - Supplier matching
 *   - Webhook fanout to external systems
 *   - AI category inference enrichment
 */
async function barcodeProductCreatedSubscriber({ event, container, }) {
    const { product_id, barcode, provider } = event.data;
    console.info(`[medusa-barcode] Product created from barcode. ` +
        `product_id=${product_id}, barcode=${barcode}, provider=${provider}`);
    // Extend here — e.g. emit a webhook, create an inventory record, etc.
}
exports.config = {
    event: constants_1.BARCODE_EVENTS.PRODUCT_CREATED,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFyY29kZS1wcm9kdWN0LWNyZWF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvc3Vic2NyaWJlcnMvYmFyY29kZS1wcm9kdWN0LWNyZWF0ZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBeUJBLGtEQVlDO0FBckNELDREQUE2RDtBQWdCN0Q7Ozs7Ozs7O0dBUUc7QUFDWSxLQUFLLFVBQVUsK0JBQStCLENBQUMsRUFDNUQsS0FBSyxFQUNMLFNBQVMsR0FDTTtJQUNmLE1BQU0sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7SUFFcEQsT0FBTyxDQUFDLElBQUksQ0FDVixpREFBaUQ7UUFDakQsY0FBYyxVQUFVLGFBQWEsT0FBTyxjQUFjLFFBQVEsRUFBRSxDQUNyRSxDQUFBO0lBRUQsc0VBQXNFO0FBQ3hFLENBQUM7QUFFWSxRQUFBLE1BQU0sR0FBRztJQUNwQixLQUFLLEVBQUUsMEJBQWMsQ0FBQyxlQUFlO0NBQ3RDLENBQUEifQ==