"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleBooksProvider = void 0;
const constants_1 = require("../constants");
const base_1 = require("./base");
class GoogleBooksProvider extends base_1.BaseBarcodeProvider {
    constructor(options = {}) {
        super(constants_1.PROVIDER_IDS.GOOGLE_BOOKS, {
            enabled: options.enabled ?? true,
            timeout: options.timeout ?? 10_000,
            retries: options.retries ?? 1,
            priority: options.priority ?? 50,
            apiKey: options.apiKey,
        });
        this.apiKey = options.apiKey;
    }
    // Google Books only makes sense for ISBN-encoded EAN-13 (978/979 prefix)
    supports(barcodeType) {
        return barcodeType === constants_1.BARCODE_TYPES.EAN13;
    }
    async lookup(barcode) {
        // Skip non-ISBN barcodes early (ISBN-13 starts with 978 or 979)
        if (!barcode.startsWith("978") && !barcode.startsWith("979"))
            return null;
        const params = new URLSearchParams({ q: `isbn:${barcode}` });
        if (this.apiKey)
            params.set("key", this.apiKey);
        const url = `https://www.googleapis.com/books/v1/volumes?${params}`;
        return this.withRetry(async () => {
            const res = await this.fetchWithTimeout(url, {
                headers: { "Accept": "application/json" },
            });
            if (!res.ok) {
                if (res.status === 404)
                    return null;
                throw new Error(`Google Books HTTP ${res.status}`);
            }
            const body = (await res.json());
            if (!body.totalItems || !body.items?.length)
                return null;
            const info = body.items[0].volumeInfo;
            if (!info)
                return null;
            const title = info.title
                ? (info.subtitle ? `${info.title}: ${info.subtitle}` : info.title)
                : `Book ${barcode}`;
            const metadata = {};
            if (info.pageCount)
                metadata.page_count = info.pageCount;
            if (info.language)
                metadata.language = info.language;
            if (info.publisher)
                metadata.publisher = info.publisher;
            if (info.authors?.length)
                metadata.authors = info.authors.join(", ");
            return {
                title,
                description: info.description?.slice(0, 1000),
                barcode,
                brand: info.publisher,
                category: info.categories?.[0] ?? "Books",
                image: info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail,
                metadata,
            };
        });
    }
}
exports.GoogleBooksProvider = GoogleBooksProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ29vZ2xlLWJvb2tzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL21vZHVsZXMvYmFyY29kZS9wcm92aWRlcnMvZ29vZ2xlLWJvb2tzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDRDQUEwRDtBQUUxRCxpQ0FBNEM7QUF5QjVDLE1BQWEsbUJBQW9CLFNBQVEsMEJBQW1CO0lBRzFELFlBQVksVUFBc0MsRUFBRTtRQUNsRCxLQUFLLENBQUMsd0JBQVksQ0FBQyxZQUFZLEVBQUU7WUFDL0IsT0FBTyxFQUFHLE9BQU8sQ0FBQyxPQUFPLElBQUssSUFBSTtZQUNsQyxPQUFPLEVBQUcsT0FBTyxDQUFDLE9BQU8sSUFBSyxNQUFNO1lBQ3BDLE9BQU8sRUFBRyxPQUFPLENBQUMsT0FBTyxJQUFLLENBQUM7WUFDL0IsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRLElBQUksRUFBRTtZQUNoQyxNQUFNLEVBQUksT0FBTyxDQUFDLE1BQU07U0FDekIsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFBO0lBQzlCLENBQUM7SUFFRCx5RUFBeUU7SUFDekUsUUFBUSxDQUFDLFdBQW1CO1FBQzFCLE9BQU8sV0FBVyxLQUFLLHlCQUFhLENBQUMsS0FBSyxDQUFBO0lBQzVDLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQWU7UUFDMUIsZ0VBQWdFO1FBQ2hFLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7WUFBRSxPQUFPLElBQUksQ0FBQTtRQUV6RSxNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQWUsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM1RCxJQUFJLElBQUksQ0FBQyxNQUFNO1lBQUUsTUFBTSxDQUFDLEdB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