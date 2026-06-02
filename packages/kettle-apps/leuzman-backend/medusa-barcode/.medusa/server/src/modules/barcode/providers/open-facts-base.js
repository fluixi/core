"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenFactsBaseProvider = void 0;
const constants_1 = require("../constants");
const base_1 = require("./base");
/**
 * Abstract base for all Open*Facts APIs (OpenFoodFacts, OpenBeautyFacts,
 * OpenPetFoodFacts, OpenProductsFacts). They share the same REST schema at
 * https://{country}.{host}/api/v0/product/{barcode}.json
 */
class OpenFactsBaseProvider extends base_1.BaseBarcodeProvider {
    constructor(providerId, options, defaultPriority) {
        super(providerId, {
            enabled: options.enabled ?? true,
            timeout: options.timeout ?? 12_000,
            retries: options.retries ?? 2,
            priority: options.priority ?? defaultPriority,
        });
        this.country = options.country ?? "world";
    }
    supports(barcodeType) {
        return (barcodeType === constants_1.BARCODE_TYPES.EAN13 ||
            barcodeType === constants_1.BARCODE_TYPES.UPC_A ||
            barcodeType === constants_1.BARCODE_TYPES.UPC_E);
    }
    async lookup(barcode) {
        const url = `https://${this.country}.${this.host}/api/v0/product/${barcode}.json`;
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
                throw new Error(`${this.host} HTTP ${res.status}`);
            }
            const body = (await res.json());
            if (body.status !== 1 || !body.product)
                return null;
            return this.normalise(barcode, body.product);
        });
    }
    normalise(barcode, p) {
        const title = p.product_name ||
            p.product_name_en ||
            p.generic_name ||
            `Product ${barcode}`;
        const category = this.extractCategory(p.categories_tags ?? []) ??
            p.categories?.split(",")[0]?.trim();
        const metadata = {};
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
exports.OpenFactsBaseProvider = OpenFactsBaseProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3Blbi1mYWN0cy1iYXNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL21vZHVsZXMvYmFyY29kZS9wcm92aWRlcnMvb3Blbi1mYWN0cy1iYXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRDQUE0QztBQUU1QyxpQ0FBNEM7QUF3QjVDOzs7O0dBSUc7QUFDSCxNQUFzQixxQkFBc0IsU0FBUSwwQkFBbUI7SUFJckUsWUFDRSxVQUFrQixFQUNsQixPQUFxQyxFQUNyQyxlQUF1QjtRQUV2QixLQUFLLENBQUMsVUFBVSxFQUFFO1lBQ2hCLE9BQU8sRUFBRyxPQUFPLENBQUMsT0FBTyxJQUFLLElBQUk7WUFDbEMsT0FBTyxFQUFHLE9BQU8sQ0FBQyxPQUFPLElBQUssTUFBTTtZQUNwQyxPQUFPLEVBQUcsT0FBTyxDQUFDLE9BQU8sSUFBSyxDQUFDO1lBQy9CLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxJQUFJLGVBQWU7U0FDOUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQTtJQUMzQyxDQUFDO0lBRUQsUUFBUSxDQUFDLFdBQW1CO1FBQzFCLE9BQU8sQ0FDTCxXQUFXLEtBQUsseUJBQWEsQ0FBQyxLQUFLO1lBQ25DLFdBQVcsS0FBSyx5QkFBYSxDQUFDLEtBQUs7WUFDbkMsV0FBVyxLQUFLLHlCQUFhLENBQUMsS0FBSyxDQUNwQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBZTtRQUMxQixNQUFNLEdBQUcsR0FBRyxXQUFXLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksbUJBQW1CLE9BQU8sT0FBTyxDQUFBO1FBRWpGLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLElBQUksRUFBRTtZQUMvQixNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FB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