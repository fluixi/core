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

import * as MedusaTypes  from "@medusajs/framework/types";
// import { MedusaContainer } from "@medusajs/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
  updateStoresStep,
} from "@medusajs/medusa/core-flows";

// ─── Helper: update store supported currencies ────────────────────────────────

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => ({
      selector: { id: data.input.store_id },
      update: {
        supported_currencies: data.input.supported_currencies.map((c) => ({
          currency_code: c.currency_code,
          is_default: c.is_default ?? false,
        })),
      },
    }));
    const stores = updateStoresStep(normalizedInput);
    return new WorkflowResponse(stores);
  }
);

// ─── Main seed ────────────────────────────────────────────────────────────────

export default async function seedDemoData({container}: MedusaTypes.ExecArgs) {
  const logger  = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link    = container.resolve(ContainerRegistrationKeys.LINK);
  const query   = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentService   = container.resolve(Modules.FULFILLMENT);
  const salesChannelService  = container.resolve(Modules.SALES_CHANNEL);
  const storeService         = container.resolve(Modules.STORE);
  const regionModuleService  = container.resolve(Modules.REGION);
  const stockLocationService = container.resolve(Modules.STOCK_LOCATION);
  const productService       = container.resolve(Modules.PRODUCT);

  // ── Store + sales channel ──────────────────────────────────────────────────
  logger.info("Seeding store...");
  const [store] = await storeService.listStores();

  let defaultSalesChannel = await salesChannelService.listSalesChannels({
    name: "Default Sales Channel",
  });
  if (!defaultSalesChannel.length) {
    const { result } = await createSalesChannelsWorkflow(container).run({
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
        { currency_code: "xof" },   // West African CFA franc — Senegal + ECOWAS
      ],
    },
  });

  await updateStoresWorkflow(container).run({
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
    const { result } = await createRegionsWorkflow(container).run({
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
    await createTaxRegionsWorkflow(container).run({
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
    const { result } = await createRegionsWorkflow(container).run({
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
    await createTaxRegionsWorkflow(container).run({
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
    const { result } = await createRegionsWorkflow(container).run({
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
    await createTaxRegionsWorkflow(container).run({
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
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [{
          name: "Main Warehouse",
          address: { city: "New York", country_code: "US", address_1: "" },
        }],
      },
    });
    stockLocation = result[0];
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: { default_location_id: stockLocation.id },
    },
  });

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]:    { fulfillment_provider_id: "manual_manual" },
  });

  // ── Shipping profiles & options ────────────────────────────────────────────
  logger.info("Seeding fulfillment...");
  const profiles = await fulfillmentService.listShippingProfiles({ type: "default" });
  let shippingProfile = profiles[0] ?? null;

  if (!shippingProfile) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Default Shipping Profile", type: "default" }] },
    });
    shippingProfile = result[0];
  }
  let fulfillmentSet = (await fulfillmentService.listFulfillmentSets({
    name: 'Worldwide Shipping',
  }, {relations: ["service_zones", "service_zones.*"]}))?.[0];

  if(!fulfillmentSet){
    fulfillmentSet = await fulfillmentService.createFulfillmentSets({
      name: "Worldwide Shipping",
      type: "shipping",
      service_zones: [{
        name: "Worldwide",
        geo_zones: [
          ...naCountries.map((c) => ({ country_code: c, type: "country" as const })),
          ...euCountries.map((c) => ({ country_code: c, type: "country" as const })),
          ...waCountries.map((c) => ({ country_code: c, type: "country" as const })),
        ],
      }],
    });
  
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]:    { fulfillment_set_id: fulfillmentSet.id },
    });
  }



  const shippingRules = [
    { attribute: "enabled_in_store", value: "true", operator: "eq" },
    { attribute: "is_return",        value: "false", operator: "eq" },
  ];

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name:                "Standard Shipping",
        price_type:          "flat",
        provider_id:         "manual_manual",
        service_zone_id:     fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: { label: "Standard", description: "Delivered in 5–7 business days.", code: "standard" },
        prices: [
          { currency_code: "usd", amount: 799  },
          { currency_code: "eur", amount: 699  },
          { currency_code: "xof", amount: 4900 },  // ~7.50 USD equivalent in XOF
          { region_id: primaryRegion.id, amount: 799 },
        ],
        rules: shippingRules as any,
      },
      {
        name:                "Express Shipping",
        price_type:          "flat",
        provider_id:         "manual_manual",
        service_zone_id:     fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: { label: "Express", description: "Delivered in 1–2 business days.", code: "express" },
        prices: [
          { currency_code: "usd", amount: 1499  },
          { currency_code: "eur", amount: 1299  },
          { currency_code: "xof", amount: 9900  },  // ~15 USD equivalent in XOF
          { region_id: primaryRegion.id, amount: 1499 },
        ],
        rules: shippingRules,
      },
    ],
  });

  await linkSalesChannelsToStockLocationWorkflow(container).run({
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

  let publishableApiKey = existingKeys?.[0] as any;

  if (!publishableApiKey) {
    const { result: [keyResult] } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [{ title: "Webshop", type: "publishable", created_by: "" }],
      },
    });
    publishableApiKey = keyResult;
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
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
  const findOrCreateCategory = async (
    name: string,
    handle: string,
    parentId?: string,
  ): Promise<any> => {
    const existing = await productService.listProductCategories({ handle });
    if (existing.length) return existing[0];
    const { result } = await createProductCategoriesWorkflow(container).run({
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
  // const catMen         = await findOrCreateCategory("Men",         "men");
  // const catWomen       = await findOrCreateCategory("Women",       "women");
  // const catAccessories = await findOrCreateCategory("Accessories", "accessories");

  // // Men sub-categories
  // const catMenTops      = await findOrCreateCategory("Tops",      "men-tops",      catMen.id);
  // const catMenBottoms   = await findOrCreateCategory("Bottoms",   "men-bottoms",   catMen.id);
  // const catMenOuterwear = await findOrCreateCategory("Outerwear", "men-outerwear", catMen.id);

  // // Women sub-categories
  // const catWomenTops    = await findOrCreateCategory("Tops",     "women-tops",    catWomen.id);
  // const catWomenBottoms = await findOrCreateCategory("Bottoms",  "women-bottoms", catWomen.id);
  // const catWomenDresses = await findOrCreateCategory("Dresses",  "women-dresses", catWomen.id);

  // // Accessories sub-categories
  // const catBags    = await findOrCreateCategory("Bags",    "accessories-bags",    catAccessories.id);
  // const catJewelry = await findOrCreateCategory("Jewelry", "accessories-jewelry", catAccessories.id);

  // logger.info("Categories seeded.");

  // Shorthand: get category ID by variable
  const cat = (c: any) => c.id;

  // ── Products ───────────────────────────────────────────────────────────────
  // logger.info("Seeding products...");
  // const handles = ["t-shirt", "sweatshirt", "sweatpants", "shorts", "hoodie"];
  // const existingProducts = await productService.listProducts({ handle: handles });
  // console.log('existing', existingProducts)

  // if (existingProducts.length < handles.length) {
  //   const sizes = ["S", "M", "L", "XL"];

  //   // XOF has 0 decimal places — Medusa stores it as the whole integer (no subunits).
  //   // 1 USD ≈ 655 XOF. Round to nearest 50 for clean display.
  //   const toXof = (usdCents: number) => Math.round(((usdCents / 100) * 655) / 50) * 50;

  //   const makeVariants = (colors: string[], skuPrefix: string, priceEur: number, priceUsd: number) => {
  //     const variants: any[] = [];
  //     for (const size of sizes) {
  //       for (const color of colors) {
  //         const label = colors.length > 1 ? `${size} / ${color}` : size;
  //         const sku   = colors.length > 1 ? `${skuPrefix}-${size}-${color.toUpperCase()}` : `${skuPrefix}-${size}`;
  //         variants.push({
  //           title: label,
  //           sku,
  //           options: colors.length > 1 ? { Size: size, Color: color } : { Size: size },
  //           prices: [
  //             { amount: priceEur, currency_code: "eur" },
  //             { amount: priceUsd, currency_code: "usd" },
  //             { amount: toXof(priceUsd), currency_code: "xof" },
  //           ],
  //         });
  //       }
  //     }
  //     return variants;
  //   };

  //   await createProductsWorkflow(container).run({
  //     input: {
  //       products: [
  //         {
  //           title: "Classic T-Shirt",
  //           handle: "t-shirt",
  //           description: "A premium cotton T-shirt crafted for everyday comfort and effortless style.",
  //           category_ids: [cat(catMenTops), cat(catWomenTops)],
  //           weight: 250,
  //           status: ProductStatus.PUBLISHED,
  //           shipping_profile_id: shippingProfile.id,
  //           images: [
  //             { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png" },
  //             { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-back.png" },
  //             { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-front.png" },
  //             { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-back.png" },
  //           ],
  //           options: [
  //             { title: "Size",  values: sizes },
  //             { title: "Color", values: ["Black", "White"] },
  //           ],
  //           variants: makeVariants(["Black", "White"], "TEE", 1900, 2200),
  //           sales_channels: [{ id: defaultSalesChannel[0].id }],
  //         },
  //         {
  //           title: "Cozy Sweatshirt",
  //           handle: "sweatshirt",
  //           description: "Soft fleece-lined sweatshirt perfect for cooler days.",
  //           category_ids: [cat(catMenTops)],
  //           weight: 500,
  //           status: ProductStatus.PUBLISHED,
  //           shipping_profile_id: shippingProfile.id,
  //           images: [
  //             { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png" },
  //             { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-back.png" },
  //           ],
  //           options: [{ title: "Size", values: sizes }],
  //           variants: makeVariants(["Default"], "SWEAT", 3900, 4400),
  //           sales_channels: [{ id: defaultSalesChannel[0].id }],
  //         },
  //         {
  //           title: "Relaxed Sweatpants",
  //           handle: "sweatpants",
  //           description: "Ultra-comfortable sweatpants for home or casual wear.",
  //           category_ids: [cat(catMenBottoms)],
  //           weight: 450,
  //           status: ProductStatus.PUBLISHED,
  //           shipping_profile_id: shippingProfile.id,
  //           images: [
  //             { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-front.png" },
  //             { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-back.png" },
  //           ],
  //           options: [{ title: "Size", values: sizes }],
  //           variants: makeVariants(["Default"], "SWEATPANTS", 3400, 3900),
  //           sales_channels: [{ id: defaultSalesChannel[0].id }],
  //         },
  //         {
  //           title: "Summer Shorts",
  //           handle: "shorts",
  //           description: "Lightweight breathable shorts ideal for warmer weather.",
  //           category_ids: [cat(catMenBottoms), cat(catWomenBottoms)],
  //           weight: 200,
  //           status: ProductStatus.PUBLISHED,
  //           shipping_profile_id: shippingProfile.id,
  //           images: [
  //             { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-front.png" },
  //             { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-back.png" },
  //           ],
  //           options: [{ title: "Size", values: sizes }],
  //           variants: makeVariants(["Default"], "SHORTS", 2900, 3200),
  //           sales_channels: [{ id: defaultSalesChannel[0].id }],
  //         },
  //         {
  //           title: "Pullover Hoodie",
  //           handle: "hoodie",
  //           description: "A versatile pullover hoodie with kangaroo pocket and adjustable drawstring.",
  //           category_ids: [cat(catMenOuterwear)],
  //           weight: 600,
  //           status: ProductStatus.PUBLISHED,
  //           shipping_profile_id: shippingProfile.id,
  //           images: [
  //             { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png" },
  //           ],
  //           options: [
  //             { title: "Size",  values: sizes },
  //             { title: "Color", values: ["Black", "Gray", "Navy"] },
  //           ],
  //           variants: makeVariants(["Black", "Gray", "Navy"], "HOODIE", 4900, 5500),
  //           sales_channels: [{ id: defaultSalesChannel[0].id }],
  //         },
  //       ],
  //     },
  //   });
  //   logger.info("Products seeded.");
  // } else {
  //   logger.info("Products already exist, skipping.");
  // }

  // ── Inventory ──────────────────────────────────────────────────────────────
  logger.info("Setting inventory levels...");
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  const levels: MedusaTypes.CreateInventoryLevelInput[] = inventoryItems.map((item: any) => ({
    location_id:       stockLocation.id,
    stocked_quantity:  500,
    inventory_item_id: item.id,
  }));

  await createInventoryLevelsWorkflow(container).run({
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
