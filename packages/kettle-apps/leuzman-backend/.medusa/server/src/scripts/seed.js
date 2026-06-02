"use strict";
/**
 * Seed script — creates all required data for a working Medusa v2 store.
 *
 * Run with:
 *   pnpm seed
 *   # or: pnpm medusa exec ./src/scripts/seed.ts
 *
 * After completion, copy the printed publishable API key into
 *   storefront/.env    → VITE_PUBLISHABLE_KEY=pk_...
 *   store-admin/.env   → VITE_PUBLISHABLE_KEY=pk_...
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = seedDemoData;
// import { MedusaContainer } from "@medusajs/types"
const utils_1 = require("@medusajs/framework/utils");
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const core_flows_1 = require("@medusajs/medusa/core-flows");
// ─── Helper: update store supported currencies ────────────────────────────────
const updateStoreCurrencies = (0, workflows_sdk_1.createWorkflow)("update-store-currencies", (input) => {
    const normalizedInput = (0, workflows_sdk_1.transform)({ input }, (data) => ({
        selector: { id: data.input.store_id },
        update: {
            supported_currencies: data.input.supported_currencies.map((c) => ({
                currency_code: c.currency_code,
                is_default: c.is_default ?? false,
            })),
        },
    }));
    const stores = (0, core_flows_1.updateStoresStep)(normalizedInput);
    return new workflows_sdk_1.WorkflowResponse(stores);
});
// ─── Main seed ────────────────────────────────────────────────────────────────
async function seedDemoData({ container }) {
    const logger = container.resolve(utils_1.ContainerRegistrationKeys.LOGGER);
    const link = container.resolve(utils_1.ContainerRegistrationKeys.LINK);
    const query = container.resolve(utils_1.ContainerRegistrationKeys.QUERY);
    const fulfillmentService = container.resolve(utils_1.Modules.FULFILLMENT);
    const salesChannelService = container.resolve(utils_1.Modules.SALES_CHANNEL);
    const storeService = container.resolve(utils_1.Modules.STORE);
    const regionModuleService = container.resolve(utils_1.Modules.REGION);
    const stockLocationService = container.resolve(utils_1.Modules.STOCK_LOCATION);
    const productService = container.resolve(utils_1.Modules.PRODUCT);
    // ── Store + sales channel ──────────────────────────────────────────────────
    logger.info("Seeding store...");
    const [store] = await storeService.listStores();
    let defaultSalesChannel = await salesChannelService.listSalesChannels({
        name: "Default Sales Channel",
    });
    if (!defaultSalesChannel.length) {
        const { result } = await (0, core_flows_1.createSalesChannelsWorkflow)(container).run({
            input: { salesChannelsData: [{ name: "Default Sales Channel" }] },
        });
        defaultSalesChannel = result;
    }
    await updateStoreCurrencies(container).run({
        input: {
            store_id: store.id,
            supported_currencies: [
                { currency_code: "usd", is_default: true },
                { currency_code: "eur" },
                { currency_code: "xof" }, // West African CFA franc — Senegal + ECOWAS
            ],
        },
    });
    await (0, core_flows_1.updateStoresWorkflow)(container).run({
        input: {
            selector: { id: store.id },
            update: { default_sales_channel_id: defaultSalesChannel[0].id },
        },
    });
    // ── Regions ────────────────────────────────────────────────────────────────
    logger.info("Seeding regions...");
    // ── North America region (USD) ─────────────────────────────────────────────
    const naCountries = ["us", "ca"];
    const existingNA = await regionModuleService.listRegions({ name: "North America" });
    let naRegion = existingNA[0];
    if (!naRegion) {
        const { result } = await (0, core_flows_1.createRegionsWorkflow)(container).run({
            input: {
                regions: [{
                        name: "North America",
                        currency_code: "usd",
                        countries: naCountries,
                        payment_providers: ["pp_system_default"],
                    }],
            },
        });
        naRegion = result[0];
        await (0, core_flows_1.createTaxRegionsWorkflow)(container).run({
            input: naCountries.map((country_code) => ({
                country_code,
                provider_id: "tp_system",
            })),
        });
        logger.info("North America region created.");
    }
    // ── Europe region (EUR) ────────────────────────────────────────────────────
    const euCountries = ["gb", "de", "dk", "se", "fr", "es", "it", "nl", "be", "pt"];
    const existingEU = await regionModuleService.listRegions({ name: "Europe" });
    let euRegion = existingEU[0];
    if (!euRegion) {
        const { result } = await (0, core_flows_1.createRegionsWorkflow)(container).run({
            input: {
                regions: [{
                        name: "Europe",
                        currency_code: "eur",
                        countries: euCountries,
                        payment_providers: ["pp_system_default"],
                    }],
            },
        });
        euRegion = result[0];
        await (0, core_flows_1.createTaxRegionsWorkflow)(container).run({
            input: euCountries.map((country_code) => ({
                country_code,
                provider_id: "tp_system",
            })),
        });
        logger.info("Europe region created.");
    }
    // ── West Africa region (XOF) ──────────────────────────────────────────────
    // XOF = West African CFA franc (ECOWAS countries + Senegal)
    const waCountries = ["sn", "ci", "ml", "bf", "tg", "bj", "ne", "gn", "gw", "mr"];
    const existingWA = await regionModuleService.listRegions({ name: "West Africa" });
    let waRegion = existingWA[0];
    if (!waRegion) {
        const { result } = await (0, core_flows_1.createRegionsWorkflow)(container).run({
            input: {
                regions: [{
                        name: "West Africa",
                        currency_code: "xof",
                        countries: waCountries,
                        payment_providers: ["pp_system_default"],
                    }],
            },
        });
        waRegion = result[0];
        await (0, core_flows_1.createTaxRegionsWorkflow)(container).run({
            input: waCountries.map((country_code) => ({
                country_code,
                provider_id: "tp_system",
            })),
        });
        logger.info("West Africa region (XOF) created.");
    }
    // Use NA region as the primary for shipping option prices
    const primaryRegion = naRegion;
    // ── Stock location ─────────────────────────────────────────────────────────
    logger.info("Seeding stock location...");
    const existingLocations = await stockLocationService.listStockLocations({ name: "Main Warehouse" });
    let stockLocation = existingLocations[0];
    if (!stockLocation) {
        const { result } = await (0, core_flows_1.createStockLocationsWorkflow)(container).run({
            input: {
                locations: [{
                        name: "Main Warehouse",
                        address: { city: "New York", country_code: "US", address_1: "" },
                    }],
            },
        });
        stockLocation = result[0];
    }
    await (0, core_flows_1.updateStoresWorkflow)(container).run({
        input: {
            selector: { id: store.id },
            update: { default_location_id: stockLocation.id },
        },
    });
    await link.create({
        [utils_1.Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
        [utils_1.Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    });
    // ── Shipping profiles & options ────────────────────────────────────────────
    logger.info("Seeding fulfillment...");
    const profiles = await fulfillmentService.listShippingProfiles({ type: "default" });
    let shippingProfile = profiles[0] ?? null;
    if (!shippingProfile) {
        const { result } = await (0, core_flows_1.createShippingProfilesWorkflow)(container).run({
            input: { data: [{ name: "Default Shipping Profile", type: "default" }] },
        });
        shippingProfile = result[0];
    }
    let fulfillmentSet = (await fulfillmentService.listFulfillmentSets({
        name: 'Worldwide Shipping',
    }, { relations: ["service_zones", "service_zones.*"] }))?.[0];
    if (!fulfillmentSet) {
        fulfillmentSet = await fulfillmentService.createFulfillmentSets({
            name: "Worldwide Shipping",
            type: "shipping",
            service_zones: [{
                    name: "Worldwide",
                    geo_zones: [
                        ...naCountries.map((c) => ({ country_code: c, type: "country" })),
                        ...euCountries.map((c) => ({ country_code: c, type: "country" })),
                        ...waCountries.map((c) => ({ country_code: c, type: "country" })),
                    ],
                }],
        });
        await link.create({
            [utils_1.Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
            [utils_1.Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
        });
    }
    const shippingRules = [
        { attribute: "enabled_in_store", value: "true", operator: "eq" },
        { attribute: "is_return", value: "false", operator: "eq" },
    ];
    await (0, core_flows_1.createShippingOptionsWorkflow)(container).run({
        input: [
            {
                name: "Standard Shipping",
                price_type: "flat",
                provider_id: "manual_manual",
                service_zone_id: fulfillmentSet.service_zones[0].id,
                shipping_profile_id: shippingProfile.id,
                type: { label: "Standard", description: "Delivered in 5–7 business days.", code: "standard" },
                prices: [
                    { currency_code: "usd", amount: 799 },
                    { currency_code: "eur", amount: 699 },
                    { currency_code: "xof", amount: 4900 }, // ~7.50 USD equivalent in XOF
                    { region_id: primaryRegion.id, amount: 799 },
                ],
                rules: shippingRules,
            },
            {
                name: "Express Shipping",
                price_type: "flat",
                provider_id: "manual_manual",
                service_zone_id: fulfillmentSet.service_zones[0].id,
                shipping_profile_id: shippingProfile.id,
                type: { label: "Express", description: "Delivered in 1–2 business days.", code: "express" },
                prices: [
                    { currency_code: "usd", amount: 1499 },
                    { currency_code: "eur", amount: 1299 },
                    { currency_code: "xof", amount: 9900 }, // ~15 USD equivalent in XOF
                    { region_id: primaryRegion.id, amount: 1499 },
                ],
                rules: shippingRules,
            },
        ],
    });
    await (0, core_flows_1.linkSalesChannelsToStockLocationWorkflow)(container).run({
        input: { id: stockLocation.id, add: [defaultSalesChannel[0].id] },
    });
    logger.info("Fulfillment seeded.");
    // ── Publishable API key ────────────────────────────────────────────────────
    logger.info("Seeding publishable API key...");
    const { data: existingKeys } = await query.graph({
        entity: "api_key",
        fields: ["id", "token"],
        filters: { type: "publishable" },
    });
    let publishableApiKey = existingKeys?.[0];
    if (!publishableApiKey) {
        const { result: [keyResult] } = await (0, core_flows_1.createApiKeysWorkflow)(container).run({
            input: {
                api_keys: [{ title: "Webshop", type: "publishable", created_by: "" }],
            },
        });
        publishableApiKey = keyResult;
    }
    await (0, core_flows_1.linkSalesChannelsToApiKeyWorkflow)(container).run({
        input: { id: publishableApiKey.id, add: [defaultSalesChannel[0].id] },
    });
    // ── Product categories (hierarchical) ─────────────────────────────────────
    logger.info("Seeding product categories...");
    /**
     * Tree structure:
     *   Men
     *     ├── Men / Tops
     *     ├── Men / Bottoms
     *     └── Men / Outerwear
     *   Women
     *     ├── Women / Tops
     *     ├── Women / Bottoms
     *     └── Women / Dresses
     *   Accessories
     *     ├── Accessories / Bags
     *     └── Accessories / Jewelry
     */
    // Helper: find or create a category
    const findOrCreateCategory = async (name, handle, parentId) => {
        const existing = await productService.listProductCategories({ handle });
        if (existing.length)
            return existing[0];
        const { result } = await (0, core_flows_1.createProductCategoriesWorkflow)(container).run({
            input: {
                product_categories: [{
                        name,
                        handle,
                        is_active: true,
                        parent_category_id: parentId,
                    }],
            },
        });
        return result[0];
    };
    // Top-level parents
    const catMen = await findOrCreateCategory("Men", "men");
    const catWomen = await findOrCreateCategory("Women", "women");
    const catAccessories = await findOrCreateCategory("Accessories", "accessories");
    // Men sub-categories
    const catMenTops = await findOrCreateCategory("Tops", "men-tops", catMen.id);
    const catMenBottoms = await findOrCreateCategory("Bottoms", "men-bottoms", catMen.id);
    const catMenOuterwear = await findOrCreateCategory("Outerwear", "men-outerwear", catMen.id);
    // Women sub-categories
    const catWomenTops = await findOrCreateCategory("Tops", "women-tops", catWomen.id);
    const catWomenBottoms = await findOrCreateCategory("Bottoms", "women-bottoms", catWomen.id);
    const catWomenDresses = await findOrCreateCategory("Dresses", "women-dresses", catWomen.id);
    // Accessories sub-categories
    const catBags = await findOrCreateCategory("Bags", "accessories-bags", catAccessories.id);
    const catJewelry = await findOrCreateCategory("Jewelry", "accessories-jewelry", catAccessories.id);
    logger.info("Categories seeded.");
    // Shorthand: get category ID by variable
    const cat = (c) => c.id;
    // ── Products ───────────────────────────────────────────────────────────────
    logger.info("Seeding products...");
    const handles = ["t-shirt", "sweatshirt", "sweatpants", "shorts", "hoodie"];
    const existingProducts = await productService.listProducts({ handle: handles });
    console.log('existing', existingProducts);
    if (existingProducts.length < handles.length) {
        const sizes = ["S", "M", "L", "XL"];
        // XOF has 0 decimal places — Medusa stores it as the whole integer (no subunits).
        // 1 USD ≈ 655 XOF. Round to nearest 50 for clean display.
        const toXof = (usdCents) => Math.round(((usdCents / 100) * 655) / 50) * 50;
        const makeVariants = (colors, skuPrefix, priceEur, priceUsd) => {
            const variants = [];
            for (const size of sizes) {
                for (const color of colors) {
                    const label = colors.length > 1 ? `${size} / ${color}` : size;
                    const sku = colors.length > 1 ? `${skuPrefix}-${size}-${color.toUpperCase()}` : `${skuPrefix}-${size}`;
                    variants.push({
                        title: label,
                        sku,
                        options: colors.length > 1 ? { Size: size, Color: color } : { Size: size },
                        prices: [
                            { amount: priceEur, currency_code: "eur" },
                            { amount: priceUsd, currency_code: "usd" },
                            { amount: toXof(priceUsd), currency_code: "xof" },
                        ],
                    });
                }
            }
            return variants;
        };
        await (0, core_flows_1.createProductsWorkflow)(container).run({
            input: {
                products: [
                    {
                        title: "Classic T-Shirt",
                        handle: "t-shirt",
                        description: "A premium cotton T-shirt crafted for everyday comfort and effortless style.",
                        category_ids: [cat(catMenTops), cat(catWomenTops)],
                        weight: 250,
                        status: utils_1.ProductStatus.PUBLISHED,
                        shipping_profile_id: shippingProfile.id,
                        images: [
                            { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png" },
                            { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-back.png" },
                            { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-front.png" },
                            { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-back.png" },
                        ],
                        options: [
                            { title: "Size", values: sizes },
                            { title: "Color", values: ["Black", "White"] },
                        ],
                        variants: makeVariants(["Black", "White"], "TEE", 1900, 2200),
                        sales_channels: [{ id: defaultSalesChannel[0].id }],
                    },
                    {
                        title: "Cozy Sweatshirt",
                        handle: "sweatshirt",
                        description: "Soft fleece-lined sweatshirt perfect for cooler days.",
                        category_ids: [cat(catMenTops)],
                        weight: 500,
                        status: utils_1.ProductStatus.PUBLISHED,
                        shipping_profile_id: shippingProfile.id,
                        images: [
                            { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png" },
                            { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-back.png" },
                        ],
                        options: [{ title: "Size", values: sizes }],
                        variants: makeVariants(["Default"], "SWEAT", 3900, 4400),
                        sales_channels: [{ id: defaultSalesChannel[0].id }],
                    },
                    {
                        title: "Relaxed Sweatpants",
                        handle: "sweatpants",
                        description: "Ultra-comfortable sweatpants for home or casual wear.",
                        category_ids: [cat(catMenBottoms)],
                        weight: 450,
                        status: utils_1.ProductStatus.PUBLISHED,
                        shipping_profile_id: shippingProfile.id,
                        images: [
                            { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-front.png" },
                            { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-back.png" },
                        ],
                        options: [{ title: "Size", values: sizes }],
                        variants: makeVariants(["Default"], "SWEATPANTS", 3400, 3900),
                        sales_channels: [{ id: defaultSalesChannel[0].id }],
                    },
                    {
                        title: "Summer Shorts",
                        handle: "shorts",
                        description: "Lightweight breathable shorts ideal for warmer weather.",
                        category_ids: [cat(catMenBottoms), cat(catWomenBottoms)],
                        weight: 200,
                        status: utils_1.ProductStatus.PUBLISHED,
                        shipping_profile_id: shippingProfile.id,
                        images: [
                            { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-front.png" },
                            { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-back.png" },
                        ],
                        options: [{ title: "Size", values: sizes }],
                        variants: makeVariants(["Default"], "SHORTS", 2900, 3200),
                        sales_channels: [{ id: defaultSalesChannel[0].id }],
                    },
                    {
                        title: "Pullover Hoodie",
                        handle: "hoodie",
                        description: "A versatile pullover hoodie with kangaroo pocket and adjustable drawstring.",
                        category_ids: [cat(catMenOuterwear)],
                        weight: 600,
                        status: utils_1.ProductStatus.PUBLISHED,
                        shipping_profile_id: shippingProfile.id,
                        images: [
                            { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png" },
                        ],
                        options: [
                            { title: "Size", values: sizes },
                            { title: "Color", values: ["Black", "Gray", "Navy"] },
                        ],
                        variants: makeVariants(["Black", "Gray", "Navy"], "HOODIE", 4900, 5500),
                        sales_channels: [{ id: defaultSalesChannel[0].id }],
                    },
                ],
            },
        });
        logger.info("Products seeded.");
    }
    else {
        logger.info("Products already exist, skipping.");
    }
    // ── Inventory ──────────────────────────────────────────────────────────────
    logger.info("Setting inventory levels...");
    const { data: inventoryItems } = await query.graph({
        entity: "inventory_item",
        fields: ["id"],
    });
    const levels = inventoryItems.map((item) => ({
        location_id: stockLocation.id,
        stocked_quantity: 500,
        inventory_item_id: item.id,
    }));
    await (0, core_flows_1.createInventoryLevelsWorkflow)(container).run({
        input: { inventory_levels: levels },
    });
    logger.info("Inventory set.");
    // ── Final summary ──────────────────────────────────────────────────────────
    logger.info("═══════════════════════════════════════════════════════");
    logger.info("✅  Seed complete!");
    logger.info("");
    logger.info("   Regions:  North America (USD) · Europe (EUR) · West Africa (XOF)");
    logger.info("   West Africa countries: Senegal, Côte d'Ivoire, Mali, Burkina Faso,");
    logger.info("                         Togo, Benin, Niger, Guinea, Guinea-Bissau, Mauritania");
    logger.info("");
    logger.info("   Categories:");
    logger.info("     Men → Tops, Bottoms, Outerwear");
    logger.info("     Women → Tops, Bottoms, Dresses");
    logger.info("     Accessories → Bags, Jewelry");
    logger.info("");
    logger.info(`   Publishable API key: ${publishableApiKey.token ?? publishableApiKey.id}`);
    logger.info("");
    logger.info("   Add this to storefront/.env and store-admin/.env:");
    logger.info(`   VITE_PUBLISHABLE_KEY=${publishableApiKey.token ?? publishableApiKey.id}`);
    logger.info("═══════════════════════════════════════════════════════");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9zY3JpcHRzL3NlZWQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7O0dBVUc7O0FBdURILCtCQTBlQztBQTloQkQsb0RBQW9EO0FBQ3BELHFEQUltQztBQUNuQyxxRUFJMkM7QUFDM0MsNERBZXFDO0FBRXJDLGlGQUFpRjtBQUVqRixNQUFNLHFCQUFxQixHQUFHLElBQUEsOEJBQWMsRUFDMUMseUJBQXlCLEVBQ3pCLENBQUMsS0FHQSxFQUFFLEVBQUU7SUFDSCxNQUFNLGVBQWUsR0FBRyxJQUFBLHlCQUFTLEVBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN0RCxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUU7UUFDckMsTUFBTSxFQUFFO1lBQ04sb0JBQW9CLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2hFLGFBQWEsRUFBRSxDQUFDLENBQUMsYUFBYTtnQkFDOUIsVUFBVSxFQUFFLENBQUMsQ0FBQyxVQUFVLElBQUksS0FBSzthQUNsQyxDQUFDLENBQUM7U0FDSjtLQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0osTUFBTSxNQUFNLEdBQUcsSUFBQSw2QkFBZ0IsRUFBQyxlQUFlLENBQUMsQ0FBQztJQUNqRCxPQUFPLElBQUksZ0NBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDdEMsQ0FBQyxDQUNGLENBQUM7QUFFRixpRkFBaUY7QUFFbEUsS0FBSyxVQUFVLFlBQVksQ0FBQyxFQUFDLFNBQVMsRUFBdUI7SUFDMUUsTUFBTSxNQUFNLEdBQUksU0FBUyxDQUFDLE9BQU8sQ0FBQyxpQ0FBeUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNwRSxN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