"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookupAndCreateProductWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const utils_1 = require("@medusajs/framework/utils");
const index_js_1 = require("../modules/barcode/index.js");
const barcode_parser_js_1 = require("../modules/barcode/utils/barcode-parser.js");
const normalize_product_js_1 = require("../modules/barcode/utils/normalize-product.js");
const constants_js_1 = require("../modules/barcode/constants.js");
// ─── Step 1: Validate barcode format ─────────────────────────────────────────
const validateBarcodeStep = (0, workflows_sdk_1.createStep)("validate-barcode-step", async (input) => {
    const parsed = (0, barcode_parser_js_1.parseBarcode)(input.barcode);
    if (!parsed.isValid) {
        throw new Error(`Invalid barcode "${input.barcode}": ${parsed.error}`);
    }
    return new workflows_sdk_1.StepResponse({ parsed });
});
// ─── Step 2: Check for an existing BarcodeProduct record ─────────────────────
const checkExistingBarcodeProductStep = (0, workflows_sdk_1.createStep)("check-existing-barcode-product-step", async (input, { container }) => {
    const svc = container.resolve(index_js_1.BARCODE_MODULE);
    const existing = await svc.findBarcodeProduct(input.barcode);
    return new workflows_sdk_1.StepResponse({
        productId: existing?.product_id ?? null,
        variantId: existing?.variant_id ?? null,
        provider: existing?.source_provider ?? null,
    });
});
// ─── Step 3: Lookup via providers (with local cache) ─────────────────────────
const lookupBarcodeStep = (0, workflows_sdk_1.createStep)("lookup-barcode-step", async (input, { container }) => {
    const svc = container.resolve(index_js_1.BARCODE_MODULE);
    const result = await svc.lookupBarcode(input.barcode, {
        skipCache: input.skipCache ?? false,
    });
    if (!result.found || !result.product) {
        throw new Error(result.error ??
            `No product data found for barcode "${input.barcode}" in any provider`);
    }
    return new workflows_sdk_1.StepResponse({
        normalized: result.product,
        provider: result.provider ?? "unknown",
        raw: result.raw ?? {},
    });
});
// ─── Step 4: Download product thumbnail ──────────────────────────────────────
const downloadThumbnailStep = (0, workflows_sdk_1.createStep)("download-thumbnail-step", async (input) => {
    if (!input.imageUrl) {
        return new workflows_sdk_1.StepResponse({ thumbnailUrl: null });
    }
    // For now, use the URL directly (avoids needing the file module).
    // When FileModule is configured, swap this for a buffer upload.
    return new workflows_sdk_1.StepResponse({ thumbnailUrl: input.imageUrl });
});
// ─── Step 5: Create Medusa product + default variant ─────────────────────────
const createMedusaProductStep = (0, workflows_sdk_1.createStep)("create-medusa-product-step", async (input, { container }) => {
    const productModule = container.resolve(utils_1.Modules.PRODUCT);
    const pricingModule = container.resolve(utils_1.Modules.PRICING);
    // Cast through unknown — the Link service's create() signature is compatible at runtime.
    // Using Record<string, unknown> to allow the optional `data` field for join-table attributes.
    const remoteLink = container.resolve(utils_1.ContainerRegistrationKeys.LINK);
    const { normalized, provider, thumbnailUrl, parsed, options } = input;
    const status = options.publishImmediately ? "published" : "draft";
    const varPrices = (options.prices ?? []).filter(p => p.amount > 0);
    const metadata = (0, normalize_product_js_1.buildProductMetadata)(normalized, provider);
    const weightGrams = (0, normalize_product_js_1.parseWeightGrams)(normalized.weight);
    const dimensions = (0, normalize_product_js_1.parseDimensionMm)(normalized.metadata?.dimension);
    // Build the barcode-specific fields for the variant
    const barcodeFields = parsed.type === constants_js_1.BARCODE_TYPES.EAN13
        ? { ean: parsed.normalized, barcode: parsed.normalized }
        : parsed.type === constants_js_1.BARCODE_TYPES.UPC_A || parsed.type === constants_js_1.BARCODE_TYPES.UPC_E
            ? { upc: parsed.normalized, barcode: parsed.normalized }
            : { barcode: parsed.normalized };
    // Prices are NOT passed to the Product Module — they live in the Pricing
    // Module and must be linked separately via the Remote Link.
    const variantPayload = {
        title: "Default",
        sku: parsed.normalized,
        options: { "Default": "Default" },
        ...barcodeFields,
        ...(weightGrams !== null ? { weight: weightGrams } : {}),
        ...(dimensions !== null ? {
            width: dimensions.width,
            height: dimensions.height,
            length: dimensions.length,
        } : {}),
    };
    // sales_channels is NOT part of CreateProductDTO — handled separately via Remote Link below
    const productPayload = {
        title: normalized.title,
        description: normalized.description ?? "",
        status,
        thumbnail: thumbnailUrl ?? undefined,
        ...(thumbnailUrl ? { images: [{ url: thumbnailUrl }] } : {}),
        metadata,
        options: [{ title: "Default", values: ["Default"] }],
        variants: [variantPayload],
        ...(weightGrams !== null ? { weight: weightGrams } : {}),
        ...(dimensions !== null ? {
            width: dimensions.width,
            height: dimensions.height,
            length: dimensions.length,
        } : {}),
        ...(options.categoryIds?.length
            ? { categories: options.categoryIds.map(id => ({ id })) }
            : {}),
        ...(options.collectionId
            ? { collection_id: options.collectionId }
            : {}),
    };
    const [product] = await productModule.createProducts([productPayload]);
    if (!product?.id) {
        throw new Error("Product creation returned no ID");
    }
    const variantId = product.variants?.[0]?.id ?? null;
    // Wire variant → price set (Pricing Module does not coordinate with Product Module)
    if (varPrices.length > 0 && variantId) {
        const [priceSet] = await pricingModule.createPriceSets([{
                prices: varPrices.map(p => ({
                    currency_code: p.currency_code,
                    amount: p.amount,
                })),
            }]);
        await remoteLink.create([{
                [utils_1.Modules.PRODUCT]: { variant_id: variantId },
                [utils_1.Modules.PRICING]: { price_set_id: priceSet.id },
            }]);
    }
    // Wire product → sales channels (not in CreateProductDTO, must use Remote Link)
    if (options.salesChannelIds?.length) {
        await remoteLink.create(options.salesChannelIds.map(scId => ({
            [utils_1.Modules.PRODUCT]: { product_id: product.id },
            [utils_1.Modules.SALES_CHANNEL]: { sales_channel_id: scId },
        })));
    }
    // Create an inventory item and link it to the variant.
    // productModule.createProducts() is the raw module call — unlike the REST API which runs
    // createProductsWorkflow (with createInventoryItemsStep), it never auto-creates inventory.
    if (variantId) {
        try {
            const inventoryModule = container.resolve(utils_1.Modules.INVENTORY);
            const [inventoryItem] = await inventoryModule.createInventoryItems([{
                    sku: parsed.normalized,
                    title: normalized.title,
                }]);
            if (inventoryItem?.id) {
                await remoteLink.create([{
                        [utils_1.Modules.PRODUCT]: { variant_id: variantId },
                        [utils_1.Modules.INVENTORY]: { inventory_item_id: inventoryItem.id },
                        data: { required_quantity: input.options.requiredQuantity ?? 1 },
                    }]);
            }
        }
        catch {
            // Non-fatal — product still created; inventory item can be linked manually later
        }
    }
    return new workflows_sdk_1.StepResponse({ productId: product.id, variantId, title: normalized.title }, { productId: product.id });
}, 
// Compensation: delete the product if a later step fails
async (compensationData, { container }) => {
    const productId = compensationData?.productId;
    if (!productId)
        return;
    const productModule = container.resolve(utils_1.Modules.PRODUCT);
    try {
        await productModule.deleteProducts([productId]);
    }
    catch {
        // Best-effort cleanup
    }
});
// ─── Step 6: Save BarcodeProduct relation ────────────────────────────────────
const saveBarcodeRelationStep = (0, workflows_sdk_1.createStep)("save-barcode-relation-step", async (input, { container }) => {
    const svc = container.resolve(index_js_1.BARCODE_MODULE);
    const record = await svc.saveBarcodeProduct({
        barcode: input.barcode,
        product_id: input.productId,
        variant_id: input.variantId ?? undefined,
        source_provider: input.provider,
        confidence_score: 1.0,
    });
    return new workflows_sdk_1.StepResponse({
        barcodeProductId: record.id,
        productId: input.productId,
        variantId: input.variantId,
    }, { barcode: input.barcode } // compensation payload
    );
}, 
// Compensation: remove the BarcodeProduct record
async (compensationData, { container }) => {
    const barcode = compensationData?.barcode;
    if (!barcode)
        return;
    const svc = container.resolve(index_js_1.BARCODE_MODULE);
    try {
        await svc.removeBarcodeProduct(barcode);
    }
    catch {
        // Best-effort cleanup
    }
});
exports.lookupAndCreateProductWorkflow = (0, workflows_sdk_1.createWorkflow)("barcode-lookup-and-create-product", (input) => {
    // 1. Validate format
    const { parsed } = validateBarcodeStep({ barcode: input.barcode });
    // 2. Short-circuit if this barcode is already linked to a product
    const existing = checkExistingBarcodeProductStep({ barcode: input.barcode });
    // Note: WorkflowSDK does not support JS if/return inside the workflow fn
    // directly — we handle the "existing" case in the API route instead by
    // calling this workflow only when needed. The step still runs to surface
    // the data early and benefit from transaction safety.
    // 3. Lookup
    const { normalized, provider, raw } = lookupBarcodeStep({
        barcode: input.barcode,
        skipCache: input.skipCache,
    });
    // 4. Download thumbnail (best-effort)
    const { thumbnailUrl } = downloadThumbnailStep({ imageUrl: normalized.image });
    // 5. Create product
    const { productId, variantId, title } = createMedusaProductStep({
        normalized,
        provider,
        thumbnailUrl,
        parsed,
        options: input,
    });
    // 6. Save relation
    saveBarcodeRelationStep({
        barcode: input.barcode,
        productId,
        variantId,
        provider,
    });
    return new workflows_sdk_1.WorkflowResponse({
        created: true,
        existing: false,
        product_id: productId,
        variant_id: variantId,
        provider,
        title,
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9va3VwLWFuZC1jcmVhdGUtcHJvZHVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy93b3JrZmxvd3MvbG9va3VwLWFuZC1jcmVhdGUtcHJvZHVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxRUFLMEM7QUFDMUMscURBQThFO0FBQzlFLDBEQUFnRTtBQUNoRSxrRkFBK0U7QUFDL0Usd0ZBSXNEO0FBQ3RELGtFQUFvRTtBQTBDcEUsZ0ZBQWdGO0FBRWhGLE1BQU0sbUJBQW1CLEdBQUcsSUFBQSwwQkFBVSxFQUNwQyx1QkFBdUIsRUFDdkIsS0FBSyxFQUFFLEtBQTBCLEVBQWdELEVBQUU7SUFDakYsTUFBTSxNQUFNLEdBQUcsSUFBQSxnQ0FBWSxFQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUMxQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLEtBQUssQ0FBQyxPQUFPLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7SUFDeEUsQ0FBQztJQUNELE9BQU8sSUFBSSw0QkFBWSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTtBQUNyQyxDQUFDLENBQ0YsQ0FBQTtBQUVELGdGQUFnRjtBQUVoRixNQUFNLCtCQUErQixHQUFHLElBQUEsMEJBQVUsRUFDaEQscUNBQXFDLEVBQ3JDLEtBQUssRUFDSCxLQUEwQixFQUMxQixFQUFFLFNBQVMsRUFBRSxFQUNpQyxFQUFFO0lBQ2hELE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQWlCLHlCQUFjLENBQUMsQ0FBQTtJQUM3RCxNQUFNLFFBQVEsR0FBRyxNQUFNLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7SUFFNUQsT0FBTyxJQUFJLDRCQUFZLENBQUM7UUFDdEIsU0FBUyxFQUFFLFFBQVEsRUFBRSxV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