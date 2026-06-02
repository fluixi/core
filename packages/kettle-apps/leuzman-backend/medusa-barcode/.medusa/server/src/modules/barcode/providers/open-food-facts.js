"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenFoodFactsProvider = void 0;
const constants_1 = require("../constants");
const base_1 = require("./base");
// ─── Provider ─────────────────────────────────────────────────────────────────
class OpenFoodFactsProvider extends base_1.BaseBarcodeProvider {
    constructor(options = {}) {
        super(constants_1.PROVIDER_IDS.OPEN_FOOD_FACTS, {
            enabled: options.enabled ?? true,
            timeout: options.timeout ?? 12_000,
            retries: options.retries ?? 2,
            priority: options.priority ?? 10,
        });
        this.country = options.country ?? "world";
    }
    /** Open Food Facts covers EAN-13 and UPC-A almost exclusively */
    supports(barcodeType) {
        return (barcodeType === constants_1.BARCODE_TYPES.EAN13 ||
            barcodeType === constants_1.BARCODE_TYPES.UPC_A ||
            barcodeType === constants_1.BARCODE_TYPES.UPC_E);
    }
    async lookup(barcode) {
        const url = `https://${this.country}.openfoodfacts.org/api/v0/product/${barcode}.json`;
        return this.withRetry(async () => {
            const res = await this.fetchWithTimeout(url, {
                headers: {
                    "User-Agent": "medusa-barcode-plugin/1.0 (https://github.com/adafri)",
                    "Accept": "application/json",
                },
            });
            if (!res.ok) {
                if (res.status === 404)
                    return null;
                throw new Error(`OpenFoodFacts HTTP ${res.status}`);
            }
            const body = (await res.json());
            if (body.status !== 1 || !body.product) {
                return null;
            }
            return this.normalise(barcode, body.product);
        });
    }
    // ─── Private helpers ─────────────────────────────────────────────────────
    normalise(barcode, p) {
        const title = p.product_name ||
            p.product_name_en ||
            p.generic_name ||
            `Product ${barcode}`;
        const category = this.extractCategory(p.categories_tags ?? []) ??
            p.categories?.split(",")[0]?.trim();
        const metadata = {};
        if (p.nutriments)
            metadata.nutriments = p.nutriments;
        if (p.ingredients_text)
            metadata.ingredients_text = p.ingredients_text;
        if (p.labels)
            metadata.labels = p.labels;
        if (p.countries)
            metadata.countries = p.countries;
        if (p.quantity)
            metadata.quantity_text = p.quantity;
        return {
            title: title.trim(),
            description: p.ingredients_text?.slice(0, 500),
            barcode,
            brand: p.brands?.split(",")[0]?.trim(),
            category,
            image: p.image_front_url ?? p.image_url,
            weight: p.quantity,
            metadata,
        };
    }
    /** Pick the most human-readable category from the tags list */
    extractCategory(tags) {
        const enTag = tags.find(t => t.startsWith("en:"));
        if (!enTag)
            return undefined;
        return enTag
            .replace(/^en:/, "")
            .split("-")
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
    }
}
exports.OpenFoodFactsProvider = OpenFoodFactsProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3Blbi1mb29kLWZhY3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL21vZHVsZXMvYmFyY29kZS9wcm92aWRlcnMvb3Blbi1mb29kLWZhY3RzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRDQUEwRDtBQUUxRCxpQ0FBNEM7QUEyQjVDLGlGQUFpRjtBQUVqRixNQUFhLHFCQUFzQixTQUFRLDBCQUFtQjtJQUc1RCxZQUFZLFVBQXdDLEVBQUU7UUFDcEQsS0FBSyxDQUFDLHdCQUFZLENBQUMsZUFBZSxFQUFFO1lBQ2xDLE9BQU8sRUFBRyxPQUFPLENBQUMsT0FBTyxJQUFLLElBQUk7WUFDbEMsT0FBTyxFQUFHLE9BQU8sQ0FBQyxPQUFPLElBQUssTUFBTTtZQUNwQyxPQUFPLEVBQUcsT0FBTyxDQUFDLE9BQU8sSUFBSyxDQUFDO1lBQy9CLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxJQUFJLEVBQUU7U0FDakMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQTtJQUMzQyxDQUFDO0lBRUQsaUVBQWlFO0lBQ2pFLFFBQVEsQ0FBQyxXQUFtQjtRQUMxQixPQUFPLENBQ0wsV0FBVyxLQUFLLHlCQUFhLENBQUMsS0FBSztZQUNuQyxXQUFXLEtBQUsseUJBQWEsQ0FBQyxLQUFLO1lBQ25DLFdBQVcsS0FBSyx5QkFBYSxDQUFDLEtBQUssQ0FDcEMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQWU7UUFDMUIsTUFBTSxHQUFHLEdBQUcsV0FBVyxJQUFJLENBQUMsT0FBTyxxQ0FBcUMsT0FBTyxPQUFPLENBQUE7UUFFdEYsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQy9CLE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsRUFBRTtnQkFD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