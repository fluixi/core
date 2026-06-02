"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EanSearchProvider = void 0;
const constants_1 = require("../constants");
const base_1 = require("./base");
class EanSearchProvider extends base_1.BaseBarcodeProvider {
    constructor(options = {}) {
        super(constants_1.PROVIDER_IDS.EAN_SEARCH, {
            enabled: options.enabled ?? (options.apiKey != null),
            timeout: options.timeout ?? 10_000,
            retries: options.retries ?? 1,
            priority: options.priority ?? 60,
            apiKey: options.apiKey,
        });
        this.apiKey = options.apiKey;
    }
    supports(barcodeType) {
        return (barcodeType === constants_1.BARCODE_TYPES.EAN13 ||
            barcodeType === constants_1.BARCODE_TYPES.UPC_A ||
            barcodeType === constants_1.BARCODE_TYPES.UPC_E);
    }
    async lookup(barcode) {
        if (!this.apiKey)
            return null;
        const params = new URLSearchParams({
            token: this.apiKey,
            op: "barcode-lookup",
            ean: barcode,
            format: "json",
            lang: "1", // EN
        });
        const url = `https://api.ean-search.org/api?${params}`;
        return this.withRetry(async () => {
            const res = await this.fetchWithTimeout(url, {
                headers: { "Accept": "application/json" },
            });
            if (res.status === 429)
                throw new Error("EAN-Search rate limit exceeded");
            if (!res.ok) {
                if (res.status === 404)
                    return null;
                throw new Error(`EAN-Search HTTP ${res.status}`);
            }
            // API returns [] when not found, or [{...}] on success
            const body = (await res.json());
            if (!Array.isArray(body) || !body.length)
                return null;
            const item = body[0];
            const metadata = {};
            if (item.categoryId)
                metadata.ean_category_id = item.categoryId;
            if (item.issuingCountry)
                metadata.issuing_country = item.issuingCountry;
            return {
                title: item.name?.trim() ?? `Product ${barcode}`,
                description: item.descr?.slice(0, 500),
                barcode,
                category: item.categoryName,
                metadata,
            };
        });
    }
}
exports.EanSearchProvider = EanSearchProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWFuLXNlYXJjaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL2JhcmNvZGUvcHJvdmlkZXJzL2Vhbi1zZWFyY2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNENBQTBEO0FBRTFELGlDQUE0QztBQWM1QyxNQUFhLGlCQUFrQixTQUFRLDBCQUFtQjtJQUd4RCxZQUFZLFVBQW9DLEVBQUU7UUFDaEQsS0FBSyxDQUFDLHdCQUFZLENBQUMsVUFBVSxFQUFFO1lBQzdCLE9BQU8sRUFBRyxPQUFPLENBQUMsT0FBTyxJQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUM7WUFDdEQsT0FBTyxFQUFHLE9BQU8sQ0FBQyxPQUFPLElBQUssTUFBTTtZQUNwQyxPQUFPLEVBQUcsT0FBTyxDQUFDLE9BQU8sSUFBSyxDQUFDO1lBQy9CLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxJQUFJLEVBQUU7WUFDaEMsTUFBTSxFQUFJLE9BQU8sQ0FBQyxNQUFNO1NBQ3pCLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQTtJQUM5QixDQUFDO0lBRUQsUUFBUSxDQUFDLFdBQW1CO1FBQzFCLE9BQU8sQ0FDTCxXQUFXLEtBQUsseUJBQWEsQ0FBQyxLQUFLO1lBQ25DLFdBQVcsS0FBSyx5QkFBYSxDQUFDLEtBQUs7WUFDbkMsV0FBVyxLQUFLLHlCQUFhLENBQUMsS0FBSyxDQUNwQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBZTtRQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU07WUFBRSxPQUFPLElBQUksQ0FBQTtRQUU3QixNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQWUsQ0FBQztZQUNqQyxLQUFLLEVBQUcsSUFBSSxDQUFDLE1BQU07WUFDbkIsRUFBRSxFQUFNLGdCQUFnQjtZQUN4QixHQUFHLEVBQUssT0FBTztZQUNmLE1BQU0sRUFBRSxNQUFNO1lBQ2QsSUFBSSxFQUFJLEdBQUcsRUFBRSxLQUFLO1NBQ25CLENBQUMsQ0FBQTtRQUNGLE1BQU0sR0FBRyxHQUFHLGtDQUFrQyxNQUFNLEVBQUUsQ0FBQTtRQUV0RCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDL0IsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFO2dCQUMzQyxPQUFPLEVBQUUsRUFBRSxRQUFRLEVBQUUsa0JBQWtCLEVBQUU7YUFDMUMsQ0FBQyxDQUFBO1lBRUYsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLEdBQUc7Z0JBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFBO1lBQ3pFLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ1osSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLEdBQUc7b0JBQUUsT0FBTyxJQUFJLENBQUE7Z0JBQ25DLE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO1lBQ2xELENBQUM7WUFFRCx1REFBdUQ7WUFDdkQsTUFBTSxJQUFJLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBeUMsQ0FBQTtZQUN2RSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNO2dCQUFFLE9BQU8sSUFBSSxDQUFBO1lBRXJELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNwQixNQUFNLFFBQVEsR0FBNEIsRUFBRSxDQUFBO1lBQzVDLElBQUksSUFBSSxDQUFDLFVBQVU7Z0JBQU8sUUFBUSxDQUFDLGVBQWUsR0FBSyxJQUFJLENBQUMsVUFBVSxDQUFBO1lBQ3RFLElBQUksSUFBSSxDQUFDLGNBQWM7Z0JBQUcsUUFBUSxDQUFDLGVBQWUsR0FBTSxJQUFJLENBQUMsY0FBYyxDQUFBO1lBRTNFLE9BQU87Z0JBQ0wsS0FBSyxFQUFLLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksV0FBVyxPQUFPLEVBQUU7Z0JBQ25ELFdBQVcsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDO2dCQUN0QyxPQUFPO2dCQUNQLFFBQVEsRUFBRSxJQUFJLENBQUMsWUFBWTtnQkFDM0IsUUFBUTthQUNULENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNKLENBQUM7Q0FDRjtBQS9ERCw4Q0ErREMifQ==