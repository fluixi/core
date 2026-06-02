/**
 * Rich category seed script — multilingual fashion hierarchy.
 *
 * Run with:
 *   pnpm medusa exec ./src/scripts/seed-categories.ts
 *
 * Creates a 3-level category tree with FR/EN/AR translations stored in metadata.
 * Safe to run multiple times (skips existing handles).
 */

import { Modules } from "@medusajs/framework/utils";
import { createProductCategoriesWorkflow } from "@medusajs/medusa/core-flows";
import type { ExecArgs } from "@medusajs/framework/types";

// ─── Translation map ─────────────────────────────────────────────────────────

interface CatDef {
  name: string;          // display name (FR — primary)
  handle: string;
  description?: string;
  translations: { fr: string; en: string; ar?: string };
  children?: CatDef[];
}

const TREE: CatDef[] = [
  {
    name: "Mode Femme",
    handle: "femme",
    description: "Toute la mode féminine : vêtements, chaussures et accessoires",
    translations: { fr: "Mode Femme", en: "Women's Fashion", ar: "موضة المرأة" },
    children: [
      {
        name: "Vêtements Femme",
        handle: "femme-vetements",
        translations: { fr: "Vêtements Femme", en: "Women's Clothing", ar: "ملابس المرأة" },
        children: [
          { name: "Robes",            handle: "femme-robes",      translations: { fr: "Robes",            en: "Dresses",     ar: "فساتين" } },
          { name: "Tops & T-shirts",  handle: "femme-tops",       translations: { fr: "Tops & T-shirts",  en: "Tops",        ar: "قمصان" } },
          { name: "Pantalons & Jeans",handle: "femme-pantalons",  translations: { fr: "Pantalons & Jeans",en: "Trousers",    ar: "بنطلونات" } },
          { name: "Jupes",            handle: "femme-jupes",      translations: { fr: "Jupes",            en: "Skirts",      ar: "تنانير" } },
          { name: "Vestes & Manteaux",handle: "femme-vestes",     translations: { fr: "Vestes & Manteaux",en: "Jackets",    ar: "جاكيتات" } },
          { name: "Ensembles",        handle: "femme-ensembles",  translations: { fr: "Ensembles",        en: "Coord Sets",  ar: "طقم" } },
        ],
      },
      {
        name: "Chaussures Femme",
        handle: "femme-chaussures",
        translations: { fr: "Chaussures Femme", en: "Women's Shoes", ar: "أحذية المرأة" },
        children: [
          { name: "Talons",    handle: "femme-talons",    translations: { fr: "Talons",    en: "Heels",     ar: "كعب عالي" } },
          { name: "Baskets",   handle: "femme-baskets",   translations: { fr: "Baskets",   en: "Sneakers",  ar: "رياضي" } },
          { name: "Bottes",    handle: "femme-bottes",    translations: { fr: "Bottes",    en: "Boots",     ar: "أحذية طويلة" } },
          { name: "Sandales",  handle: "femme-sandales",  translations: { fr: "Sandales",  en: "Sandals",   ar: "صنادل" } },
          { name: "Mocassins", handle: "femme-mocassins", translations: { fr: "Mocassins", en: "Loafers",   ar: "موكاسان" } },
        ],
      },
      {
        name: "Accessoires Femme",
        handle: "femme-accessoires",
        translations: { fr: "Accessoires Femme", en: "Women's Accessories", ar: "إكسسوارات المرأة" },
        children: [
          { name: "Sacs à main", handle: "femme-sacs",     translations: { fr: "Sacs à main", en: "Handbags",    ar: "حقائب يد" } },
          { name: "Bijoux",      handle: "femme-bijoux",   translations: { fr: "Bijoux",      en: "Jewelry",     ar: "مجوهرات" } },
          { name: "Lunettes",    handle: "femme-lunettes", translations: { fr: "Lunettes",    en: "Sunglasses",  ar: "نظارات" } },
          { name: "Écharpes",    handle: "femme-echarpes", translations: { fr: "Écharpes",    en: "Scarves",     ar: "أوشحة" } },
          { name: "Ceintures",   handle: "femme-ceintures",translations: { fr: "Ceintures",   en: "Belts",       ar: "أحزمة" } },
        ],
      },
    ],
  },

  {
    name: "Mode Homme",
    handle: "homme",
    description: "Collections masculines tendance : casual, formel et sportswear",
    translations: { fr: "Mode Homme", en: "Men's Fashion", ar: "موضة الرجل" },
    children: [
      {
        name: "Vêtements Homme",
        handle: "homme-vetements",
        translations: { fr: "Vêtements Homme", en: "Men's Clothing", ar: "ملابس الرجل" },
        children: [
          { name: "T-shirts & Polos", handle: "homme-tshirts",   translations: { fr: "T-shirts & Polos", en: "T-shirts",  ar: "تي شيرت" } },
          { name: "Chemises",         handle: "homme-chemises",  translations: { fr: "Chemises",         en: "Shirts",    ar: "قمصان رسمية" } },
          { name: "Pantalons",        handle: "homme-pantalons", translations: { fr: "Pantalons",        en: "Trousers",  ar: "بنطلونات" } },
          { name: "Jeans",            handle: "homme-jeans",     translations: { fr: "Jeans",            en: "Jeans",     ar: "جينز" } },
          { name: "Vestes & Blazers", handle: "homme-vestes",    translations: { fr: "Vestes & Blazers", en: "Jackets",   ar: "جاكيتات" } },
          { name: "Survêtements",     handle: "homme-survet",    translations: { fr: "Survêtements",     en: "Tracksuits",ar: "بدلات رياضية" } },
        ],
      },
      {
        name: "Chaussures Homme",
        handle: "homme-chaussures",
        translations: { fr: "Chaussures Homme", en: "Men's Shoes", ar: "أحذية الرجل" },
        children: [
          { name: "Baskets Homme", handle: "homme-baskets",   translations: { fr: "Baskets Homme", en: "Sneakers",  ar: "رياضي" } },
          { name: "Mocassins",     handle: "homme-mocassins", translations: { fr: "Mocassins",     en: "Loafers",   ar: "موكاسان" } },
          { name: "Boots Homme",   handle: "homme-boots",     translations: { fr: "Boots Homme",   en: "Boots",     ar: "أحذية طويلة" } },
          { name: "Derbies",       handle: "homme-derbies",   translations: { fr: "Derbies",       en: "Oxfords",   ar: "حذاء رسمي" } },
        ],
      },
      {
        name: "Accessoires Homme",
        handle: "homme-accessoires",
        translations: { fr: "Accessoires Homme", en: "Men's Accessories", ar: "إكسسوارات الرجل" },
        children: [
          { name: "Ceintures",         handle: "homme-ceintures",  translations: { fr: "Ceintures",         en: "Belts",   ar: "أحزمة" } },
          { name: "Montres",           handle: "homme-montres",    translations: { fr: "Montres",           en: "Watches", ar: "ساعات" } },
          { name: "Casquettes",        handle: "homme-casquettes", translations: { fr: "Casquettes",        en: "Caps",    ar: "قبعات" } },
          { name: "Lunettes Homme",    handle: "homme-lunettes",   translations: { fr: "Lunettes Homme",    en: "Sunglasses",ar: "نظارات" } },
        ],
      },
    ],
  },

  {
    name: "Sacs & Maroquinerie",
    handle: "sacs",
    description: "Sacs à main, sacs à dos, pochettes et bagagerie",
    translations: { fr: "Sacs & Maroquinerie", en: "Bags & Leather Goods", ar: "حقائب وجلديات" },
    children: [
      { name: "Sacs à main",    handle: "sacs-main",     translations: { fr: "Sacs à main",    en: "Handbags",     ar: "حقائب يد" } },
      { name: "Sacs à dos",     handle: "sacs-dos",      translations: { fr: "Sacs à dos",     en: "Backpacks",    ar: "حقائب ظهر" } },
      { name: "Pochettes",      handle: "sacs-pochettes",translations: { fr: "Pochettes",      en: "Clutches",     ar: "حقائب صغيرة" } },
      { name: "Cabas & Totes",  handle: "sacs-totes",    translations: { fr: "Cabas & Totes",  en: "Tote Bags",    ar: "حقائب كبيرة" } },
      { name: "Sacs de voyage", handle: "sacs-voyage",   translations: { fr: "Sacs de voyage", en: "Travel Bags",  ar: "حقائب سفر" } },
      { name: "Porte-monnaie",  handle: "sacs-wallets",  translations: { fr: "Porte-monnaie",  en: "Wallets",      ar: "محافظ" } },
    ],
  },

  {
    name: "Chaussures",
    handle: "chaussures",
    description: "Toutes les chaussures homme et femme",
    translations: { fr: "Chaussures", en: "Shoes", ar: "أحذية" },
    children: [
      { name: "Sneakers",  handle: "chaussures-sneakers", translations: { fr: "Sneakers",  en: "Sneakers",  ar: "رياضي" } },
      { name: "Sandales",  handle: "chaussures-sandales", translations: { fr: "Sandales",  en: "Sandals",   ar: "صنادل" } },
      { name: "Bottes",    handle: "chaussures-bottes",   translations: { fr: "Bottes",    en: "Boots",     ar: "أحذية طويلة" } },
      { name: "Talons",    handle: "chaussures-talons",   translations: { fr: "Talons",    en: "Heels",     ar: "كعب عالي" } },
      { name: "Mocassins", handle: "chaussures-mocassins",translations: { fr: "Mocassins", en: "Loafers",   ar: "موكاسان" } },
    ],
  },

  {
    name: "Bijoux & Montres",
    handle: "bijoux",
    description: "Bijoux fantaisie, colliers, bracelets et montres",
    translations: { fr: "Bijoux & Montres", en: "Jewelry & Watches", ar: "مجوهرات وساعات" },
    children: [
      { name: "Colliers",   handle: "bijoux-colliers",  translations: { fr: "Colliers",   en: "Necklaces", ar: "قلائد" } },
      { name: "Bracelets",  handle: "bijoux-bracelets", translations: { fr: "Bracelets",  en: "Bracelets", ar: "أساور" } },
      { name: "Bagues",     handle: "bijoux-bagues",    translations: { fr: "Bagues",     en: "Rings",     ar: "خواتم" } },
      { name: "Boucles",    handle: "bijoux-boucles",   translations: { fr: "Boucles",    en: "Earrings",  ar: "أقراط" } },
      { name: "Montres",    handle: "bijoux-montres",   translations: { fr: "Montres",    en: "Watches",   ar: "ساعات" } },
    ],
  },

  {
    name: "Collections Spéciales",
    handle: "collections-speciales",
    description: "Éditions limitées, promotions et nouveautés",
    translations: { fr: "Collections Spéciales", en: "Special Collections", ar: "مجموعات خاصة" },
    children: [
      { name: "Nouveautés",       handle: "nouveautes",        translations: { fr: "Nouveautés",       en: "New Arrivals",     ar: "وصل حديثاً" } },
      { name: "Édition Limitée",  handle: "edition-limitee",   translations: { fr: "Édition Limitée",  en: "Limited Edition",  ar: "إصدار محدود" } },
      { name: "Soldes",           handle: "soldes",            translations: { fr: "Soldes",           en: "Sale",             ar: "تخفيضات" } },
      { name: "Collab Créateurs", handle: "collab-createurs",  translations: { fr: "Collab Créateurs", en: "Creator Collabs",  ar: "تعاون المبدعين" } },
    ],
  },
];

// ─── Script entry point ───────────────────────────────────────────────────────

export default async function seedCategories({ container }: ExecArgs) {
  const logger = container.resolve("logger");
  logger.info("Starting category seed...");

  // Load existing categories to skip duplicates
  const query = container.resolve("remoteQuery" as any);
  const existing: string[] = await query({
    product_categories: {
      fields: ["handle"],
    },
  }).then((r: any) => (r ?? []).map((c: any) => c.handle)).catch(() => []);

  const existingSet = new Set(existing);
  let created = 0;
  let skipped = 0;

  async function createNode(def: CatDef, parentId?: string): Promise<string> {
    if (existingSet.has(def.handle)) {
      logger.info(`  skip  ${def.handle}`);
      skipped++;
      // Still recurse to handle children that might be new
      if (def.children?.length) {
        // We need the ID — query it
        const found = await query({
          product_categories: {
            fields: ["id", "handle"],
            filters: { handle: def.handle },
          },
        }).then((r: any) => r?.[0]).catch(() => null);
        const id = found?.id;
        if (id && def.children) {
          for (const child of def.children) {
            await createNode(child, id);
          }
        }
      }
      return "";
    }

    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: [
          {
            name:               def.name,
            handle:             def.handle,
            description:        def.description ?? "",
            is_active:          true,
            is_internal:        false,
            parent_category_id: parentId,
            metadata: {
              translations: def.translations,
            },
          },
        ],
      },
    });

    const id = result[0]?.id ?? "";
    logger.info(`  create ${def.handle} → ${id}`);
    created++;
    existingSet.add(def.handle);

    if (def.children?.length && id) {
      for (const child of def.children) {
        await createNode(child, id);
      }
    }

    return id;
  }

  for (const root of TREE) {
    await createNode(root);
  }

  logger.info(`\nDone — created: ${created}, skipped: ${skipped}`);
  logger.info(`Total categories in tree: ${countNodes(TREE)}`);
}

function countNodes(nodes: CatDef[]): number {
  return nodes.reduce((acc, n) => acc + 1 + (n.children ? countNodes(n.children) : 0), 0);
}
