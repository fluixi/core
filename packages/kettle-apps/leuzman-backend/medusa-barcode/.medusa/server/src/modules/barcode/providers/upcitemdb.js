"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpcItemDbProvider = void 0;
const constants_1 = require("../constants");
const base_1 = require("./base");
// ─── Provider ─────────────────────────────────────────────────────────────────
class UpcItemDbProvider extends base_1.BaseBarcodeProvider {
    /**
     * Trial tier: https://api.upcitemdb.com/prod/trial/lookup
     * Paid tier: https://api.upcitemdb.com/prod/v1/lookup  (requires apiKey)
     */
    get baseUrl() {
        return this.apiKey
            ? "https://api.upcitemdb.com/prod/v1"
            : "https://api.upcitemdb.com/prod/trial";
    }
    constructor(options = {}) {
        super(constants_1.PROVIDER_IDS.UPC_ITEM_DB, {
            enabled: options.enabled ?? true,
            timeout: options.timeout ?? 10_000,
            retries: options.retries ?? 2,
            priority: options.priority ?? 80,
            apiKey: options.apiKey,
        });
        this.apiKey = options.apiKey;
    }
    /** UpcItemDb covers all common 1D symbologies */
    supports(barcodeType) {
        return (barcodeType === constants_1.BARCODE_TYPES.EAN13 ||
            barcodeType === constants_1.BARCODE_TYPES.UPC_A ||
            barcodeType === constants_1.BARCODE_TYPES.UPC_E ||
            barcodeType === constants_1.BARCODE_TYPES.CODE128);
    }
    async lookup(barcode) {
        const url = `${this.baseUrl}/lookup?upc=${encodeURIComponent(barcode)}`;
        const headers = {
            "Accept": "application/json",
            "User-Agent": "medusa-barcode-plugin/1.0",
        };
        if (this.apiKey) {
            headers["Authorization"] = `Bearer ${this.apiKey}`;
        }
        return this.withRetry(async () => {
            const res = await this.fetchWithTimeout(url, { headers });
            // 429 = rate-limited on trial tier — surface as retriable error
            if (res.status === 429) {
                throw new Error("UpcItemDb rate limit exceeded");
            }
            if (!res.ok) {
                if (res.status === 404)
                    return null;
                throw new Error(`UpcItemDb HTTP ${res.status}`);
            }
            const body = (await res.json());
            if (body.code !== "OK" || !body.items?.length) {
                return null;
            }
            return this.normalise(barcode, body.items[0]);
        });
    }
    // ─── Private helpers ─────────────────────────────────────────────────────
    normalise(barcode, item) {
        const metadata = {};
        if (item.model)
            metadata.model = item.model;
        if (item.color)
            metadata.color = item.color;
        if (item.size)
            metadata.size = item.size;
        if (item.dimension)
            metadata.dimension = item.dimension;
        if (item.lowest_recorded_price != null)
            metadata.lowest_price = item.lowest_recorded_price;
        if (item.highest_recorded_price != null)
            metadata.highest_price = item.highest_recorded_price;
        return {
            title: item.title?.trim() ?? `Product ${barcode}`,
            description: item.description?.slice(0, 1000),
            barcode,
            brand: item.brand,
            category: item.category,
            image: item.images?.[0],
            weight: item.weight,
            metadata,
        };
    }
}
exports.UpcItemDbProvider = UpcItemDbProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBjaXRlbWRiLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL21vZHVsZXMvYmFyY29kZS9wcm92aWRlcnMvdXBjaXRlbWRiLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRDQUEwRDtBQUUxRCxpQ0FBNEM7QUE0QjVDLGlGQUFpRjtBQUVqRixNQUFhLGlCQUFrQixTQUFRLDBCQUFtQjtJQUd4RDs7O09BR0c7SUFDSCxJQUFZLE9BQU87UUFDakIsT0FBTyxJQUFJLENBQUMsTUFBTTtZQUNoQixDQUFDLENBQUMsbUNBQW1DO1lBQ3JDLENBQUMsQ0FBQyxzQ0FBc0MsQ0FBQTtJQUM1QyxDQUFDO0lBRUQsWUFBWSxVQUFvQyxFQUFFO1FBQ2hELEtBQUssQ0FBQyx3QkFBWSxDQUFDLFdBQVcsRUFBRTtZQUM5QixPQUFPLEVBQUcsT0FBTyxDQUFDLE9BQU8sSUFBSyxJQUFJO1lBQ2xDLE9BQU8sRUFBRyxPQUFPLENBQUMsT0FBTyxJQUFLLE1BQU07WUFDcEMsT0FBTyxFQUFHLE9BQU8sQ0FBQyxPQUFPLElBQUssQ0FBQztZQUMvQixRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVEsSUFBSSxFQUFFO1lBQ2hDLE1BQU0sRUFBSSxPQUFPLENBQUMsTUFBTTtTQUN6QixDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUE7SUFDOUIsQ0FBQztJQUVELGlEQUFpRDtJQUNqRCxRQUFRLENBQUMsV0FBbUI7UUFDMUIsT0FBTyxDQUNMLFdBQVcsS0FBSyx5QkFBYSxDQUFDLEtBQUs7WUFDbkMsV0FBVyxLQUFLLHlCQUFhLENBQUMsS0FBSztZQUNuQyxXQUFXLEtBQUsseUJBQWEsQ0FBQyxLQUFLO1lBQ25DLFdBQVcsS0FBSyx5QkFBYSxDQUFDLE9BQU8sQ0FDdEMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQWU7UUFDMUIsTUFBTSxHQUFH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