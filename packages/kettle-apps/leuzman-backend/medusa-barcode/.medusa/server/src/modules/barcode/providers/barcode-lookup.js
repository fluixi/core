"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BarcodeLookupProvider = void 0;
const constants_1 = require("../constants");
const base_1 = require("./base");
class BarcodeLookupProvider extends base_1.BaseBarcodeProvider {
    constructor(options = {}) {
        super(constants_1.PROVIDER_IDS.BARCODE_LOOKUP, {
            enabled: options.enabled ?? (options.apiKey != null),
            timeout: options.timeout ?? 12_000,
            retries: options.retries ?? 1,
            priority: options.priority ?? 70,
            apiKey: options.apiKey,
        });
        this.apiKey = options.apiKey;
    }
    supports(barcodeType) {
        return (barcodeType === constants_1.BARCODE_TYPES.EAN13 ||
            barcodeType === constants_1.BARCODE_TYPES.UPC_A ||
            barcodeType === constants_1.BARCODE_TYPES.UPC_E ||
            barcodeType === constants_1.BARCODE_TYPES.CODE128);
    }
    async lookup(barcode) {
        if (!this.apiKey)
            return null;
        const params = new URLSearchParams({
            barcode: barcode,
            formatted: "y",
            key: this.apiKey,
        });
        const url = `https://api.barcodelookup.com/v3/products?${params}`;
        return this.withRetry(async () => {
            const res = await this.fetchWithTimeout(url, {
                headers: { "Accept": "application/json" },
            });
            if (res.status === 429)
                throw new Error("BarcodeLookup rate limit exceeded");
            if (res.status === 403)
                throw new Error("BarcodeLookup invalid/expired API key");
            if (!res.ok) {
                if (res.status === 404)
                    return null;
                throw new Error(`BarcodeLookup HTTP ${res.status}`);
            }
            const body = (await res.json());
            if (!body.products?.length)
                return null;
            const p = body.products[0];
            const metadata = {};
            if (p.color)
                metadata.color = p.color;
            if (p.size)
                metadata.size = p.size;
            if (p.manufacturer)
                metadata.manufacturer = p.manufacturer;
            if (p.ingredients)
                metadata.ingredients = p.ingredients;
            return {
                title: p.title?.trim() ?? `Product ${barcode}`,
                description: p.description?.slice(0, 1000),
                barcode,
                brand: p.brand ?? p.manufacturer,
                category: p.category,
                image: p.images?.[0],
                weight: p.weight,
                metadata,
            };
        });
    }
}
exports.BarcodeLookupProvider = BarcodeLookupProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFyY29kZS1sb29rdXAuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9iYXJjb2RlL3Byb3ZpZGVycy9iYXJjb2RlLWxvb2t1cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw0Q0FBMEQ7QUFFMUQsaUNBQTRDO0FBdUI1QyxNQUFhLHFCQUFzQixTQUFRLDBCQUFtQjtJQUc1RCxZQUFZLFVBQXdDLEVBQUU7UUFDcEQsS0FBSyxDQUFDLHdCQUFZLENBQUMsY0FBYyxFQUFFO1lBQ2pDLE9BQU8sRUFBRyxPQUFPLENBQUMsT0FBTyxJQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUM7WUFDdEQsT0FBTyxFQUFHLE9BQU8sQ0FBQyxPQUFPLElBQUssTUFBTTtZQUNwQyxPQUFPLEVBQUcsT0FBTyxDQUFDLE9BQU8sSUFBSyxDQUFDO1lBQy9CLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxJQUFJLEVBQUU7WUFDaEMsTUFBTSxFQUFJLE9BQU8sQ0FBQyxNQUFNO1NBQ3pCLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQTtJQUM5QixDQUFDO0lBRUQsUUFBUSxDQUFDLFdBQW1CO1FBQzFCLE9BQU8sQ0FDTCxXQUFXLEtBQUsseUJBQWEsQ0FBQyxLQUFLO1lBQ25DLFdBQVcsS0FBSyx5QkFBYSxDQUFDLEtBQUs7WUFDbkMsV0FBVyxLQUFLLHlCQUFhLENBQUMsS0FBSztZQUNuQyxXQUFXLEtBQUsseUJBQWEsQ0FBQyxPQUFPLENBQ3RDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFlO1FBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTTtZQUFFLE9BQU8sSUFBSSxDQUFBO1FBRTdCLE1BQU0sTUFBTSxHQUFHLElBQUksZUFBZSxDQUFDO1lBQ2pDLE9BQU8sRUFBSSxPQUFPO1lBQ2xCLFNBQVMsRUFBRSxHQUFHO1lBQ2QsR0FBRyxFQUFRLElBQUksQ0FBQyxNQUFNO1NBQ3ZCLENBQUMsQ0FBQTtRQUNGLE1BQU0sR0FBRyxHQUFHLDZDQUE2QyxNQUFNLEVBQUUsQ0FBQTtRQUVqRSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDL0IsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFO2dCQUMzQyxPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsa0JBQWtCLEVBQUU7YUFDMUMsQ0FBQyxDQUFBO1lBRUYsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLEdBQUc7Z0JBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFBO1lBQzVFLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxHQUFHO2dCQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsdUNBQXVDLENBQUMsQ0FBQTtZQUNoRixJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNaLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxHQUFHO29CQUFFLE9BQU8sSUFBSSxDQUFBO2dCQUNuQyxNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQTtZQUNyRCxDQUFDO1lBRUQsTUFBTSxJQUFJLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBMEIsQ0FBQTtZQUN4RCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxNQUFNO2dCQUFFLE9BQU8sSUFBSSxDQUFBO1lBRXZDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDMUIsTUFBTSxRQUFRLEdBQTRCLEVBQUUsQ0FBQTtZQUM1QyxJQUFJLENBQUMsQ0FBQyxLQUFLO2dCQUFTLFFBQVEsQ0FBQyxLQUFLLEdBQVUsQ0FBQyxDQUFDLEtBQUssQ0FBQTtZQUNuRCxJQUFJLENBQUMsQ0FBQyxJQUFJO2dCQUFVLFFBQVEsQ0FBQyxJQUFJLEdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQTtZQUNsRCxJQUFJLENBQUMsQ0FBQyxZQUFZO2dCQUFFLFFBQVEsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLFlBQVksQ0FBQTtZQUMxRCxJQUFJLENBQUMsQ0FBQyxXQUFXO2dCQUFHLFFBQVEsQ0FBQyxXQUFXLEdBQUksQ0FBQyxDQUFDLFdBQVcsQ0FBQTtZQUV6RCxPQUFPO2dCQUNMLEtBQUssRUFBUSxDQUFDLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLFdBQVcsT0FBTyxFQUFFO2dCQUNwRCxXQUFXLEVBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQztnQkFDMUMsT0FBTztnQkFDUCxLQUFLLEVBQVEsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsWUFBWTtnQkFDdEMsUUFBUSxFQUFLLENBQUMsQ0FBQyxRQUFRO2dCQUN2QixLQUFLLEVBQVEsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDMUIsTUFBTSxFQUFPLENBQUMsQ0FBQyxNQUFNO2dCQUNyQixRQUFRO2FBQ1QsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO0lBQ0osQ0FBQztDQUNGO0FBbkVELHNEQW1FQyJ9