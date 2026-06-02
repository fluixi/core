"use strict";
/**
 * Rich category seed script — multilingual fashion hierarchy.
 *
 * Run with:
 *   pnpm medusa exec ./src/scripts/seed-categories.ts
 *
 * Creates a 3-level category tree with FR/EN/AR translations stored in metadata.
 * Safe to run multiple times (skips existing handles).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = seedCategories;
const core_flows_1 = require("@medusajs/medusa/core-flows");
const TREE = [
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
                    { name: "Robes", handle: "femme-robes", translations: { fr: "Robes", en: "Dresses", ar: "فساتين" } },
                    { name: "Tops & T-shirts", handle: "femme-tops", translations: { fr: "Tops & T-shirts", en: "Tops", ar: "قمصان" } },
                    { name: "Pantalons & Jeans", handle: "femme-pantalons", translations: { fr: "Pantalons & Jeans", en: "Trousers", ar: "بنطلونات" } },
                    { name: "Jupes", handle: "femme-jupes", translations: { fr: "Jupes", en: "Skirts", ar: "تنانير" } },
                    { name: "Vestes & Manteaux", handle: "femme-vestes", translations: { fr: "Vestes & Manteaux", en: "Jackets", ar: "جاكيتات" } },
                    { name: "Ensembles", handle: "femme-ensembles", translations: { fr: "Ensembles", en: "Coord Sets", ar: "طقم" } },
                ],
            },
            {
                name: "Chaussures Femme",
                handle: "femme-chaussures",
                translations: { fr: "Chaussures Femme", en: "Women's Shoes", ar: "أحذية المرأة" },
                children: [
                    { name: "Talons", handle: "femme-talons", translations: { fr: "Talons", en: "Heels", ar: "كعب عالي" } },
                    { name: "Baskets", handle: "femme-baskets", translations: { fr: "Baskets", en: "Sneakers", ar: "رياضي" } },
                    { name: "Bottes", handle: "femme-bottes", translations: { fr: "Bottes", en: "Boots", ar: "أحذية طويلة" } },
                    { name: "Sandales", handle: "femme-sandales", translations: { fr: "Sandales", en: "Sandals", ar: "صنادل" } },
                    { name: "Mocassins", handle: "femme-mocassins", translations: { fr: "Mocassins", en: "Loafers", ar: "موكاسان" } },
                ],
            },
            {
                name: "Accessoires Femme",
                handle: "femme-accessoires",
                translations: { fr: "Accessoires Femme", en: "Women's Accessories", ar: "إكسسوارات المرأة" },
                children: [
                    { name: "Sacs à main", handle: "femme-sacs", translations: { fr: "Sacs à main", en: "Handbags", ar: "حقائب يد" } },
                    { name: "Bijoux", handle: "femme-bijoux", translations: { fr: "Bijoux", en: "Jewelry", ar: "مجوهرات" } },
                    { name: "Lunettes", handle: "femme-lunettes", translations: { fr: "Lunettes", en: "Sunglasses", ar: "نظارات" } },
                    { name: "Écharpes", handle: "femme-echarpes", translations: { fr: "Écharpes", en: "Scarves", ar: "أوشحة" } },
                    { name: "Ceintures", handle: "femme-ceintures", translations: { fr: "Ceintures", en: "Belts", ar: "أحزمة" } },
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
                    { name: "T-shirts & Polos", handle: "homme-tshirts", translations: { fr: "T-shirts & Polos", en: "T-shirts", ar: "تي شيرت" } },
                    { name: "Chemises", handle: "homme-chemises", translations: { fr: "Chemises", en: "Shirts", ar: "قمصان رسمية" } },
                    { name: "Pantalons", handle: "homme-pantalons", translations: { fr: "Pantalons", en: "Trousers", ar: "بنطلونات" } },
                    { name: "Jeans", handle: "homme-jeans", translations: { fr: "Jeans", en: "Jeans", ar: "جينز" } },
                    { name: "Vestes & Blazers", handle: "homme-vestes", translations: { fr: "Vestes & Blazers", en: "Jackets", ar: "جاكيتات" } },
                    { name: "Survêtements", handle: "homme-survet", translations: { fr: "Survêtements", en: "Tracksuits", ar: "بدلات رياضية" } },
                ],
            },
            {
                name: "Chaussures Homme",
                handle: "homme-chaussures",
                translations: { fr: "Chaussures Homme", en: "Men's Shoes", ar: "أحذية الرجل" },
                children: [
                    { name: "Baskets Homme", handle: "homme-baskets", translations: { fr: "Baskets Homme", en: "Sneakers", ar: "رياضي" } },
                    { name: "Mocassins", handle: "homme-mocassins", translations: { fr: "Mocassins", en: "Loafers", ar: "موكاسان" } },
                    { name: "Boots Homme", handle: "homme-boots", translations: { fr: "Boots Homme", en: "Boots", ar: "أحذية طويلة" } },
                    { name: "Derbies", handle: "homme-derbies", translations: { fr: "Derbies", en: "Oxfords", ar: "حذاء رسمي" } },
                ],
            },
            {
                name: "Accessoires Homme",
                handle: "homme-accessoires",
                translations: { fr: "Accessoires Homme", en: "Men's Accessories", ar: "إكسسوارات الرجل" },
                children: [
                    { name: "Ceintures", handle: "homme-ceintures", translations: { fr: "Ceintures", en: "Belts", ar: "أحزمة" } },
                    { name: "Montres", handle: "homme-montres", translations: { fr: "Montres", en: "Watches", ar: "ساعات" } },
                    { name: "Casquettes", handle: "homme-casquettes", translations: { fr: "Casquettes", en: "Caps", ar: "قبعات" } },
                    { name: "Lunettes Homme", handle: "homme-lunettes", translations: { fr: "Lunettes Homme", en: "Sunglasses", ar: "نظارات" } },
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
            { name: "Sacs à main", handle: "sacs-main", translations: { fr: "Sacs à main", en: "Handbags", ar: "حقائب يد" } },
            { name: "Sacs à dos", handle: "sacs-dos", translations: { fr: "Sacs à dos", en: "Backpacks", ar: "حقائب ظهر" } },
            { name: "Pochettes", handle: "sacs-pochettes", translations: { fr: "Pochettes", en: "Clutches", ar: "حقائب صغيرة" } },
            { name: "Cabas & Totes", handle: "sacs-totes", translations: { fr: "Cabas & Totes", en: "Tote Bags", ar: "حقائب كبيرة" } },
            { name: "Sacs de voyage", handle: "sacs-voyage", translations: { fr: "Sacs de voyage", en: "Travel Bags", ar: "حقائب سفر" } },
            { name: "Porte-monnaie", handle: "sacs-wallets", translations: { fr: "Porte-monnaie", en: "Wallets", ar: "محافظ" } },
        ],
    },
    {
        name: "Chaussures",
        handle: "chaussures",
        description: "Toutes les chaussures homme et femme",
        translations: { fr: "Chaussures", en: "Shoes", ar: "أحذية" },
        children: [
            { name: "Sneakers", handle: "chaussures-sneakers", translations: { fr: "Sneakers", en: "Sneakers", ar: "رياضي" } },
            { name: "Sandales", handle: "chaussures-sandales", translations: { fr: "Sandales", en: "Sandals", ar: "صنادل" } },
            { name: "Bottes", handle: "chaussures-bottes", translations: { fr: "Bottes", en: "Boots", ar: "أحذية طويلة" } },
            { name: "Talons", handle: "chaussures-talons", translations: { fr: "Talons", en: "Heels", ar: "كعب عالي" } },
            { name: "Mocassins", handle: "chaussures-mocassins", translations: { fr: "Mocassins", en: "Loafers", ar: "موكاسان" } },
        ],
    },
    {
        name: "Bijoux & Montres",
        handle: "bijoux",
        description: "Bijoux fantaisie, colliers, bracelets et montres",
        translations: { fr: "Bijoux & Montres", en: "Jewelry & Watches", ar: "مجوهرات وساعات" },
        children: [
            { name: "Colliers", handle: "bijoux-colliers", translations: { fr: "Colliers", en: "Necklaces", ar: "قلائد" } },
            { name: "Bracelets", handle: "bijoux-bracelets", translations: { fr: "Bracelets", en: "Bracelets", ar: "أساور" } },
            { name: "Bagues", handle: "bijoux-bagues", translations: { fr: "Bagues", en: "Rings", ar: "خواتم" } },
            { name: "Boucles", handle: "bijoux-boucles", translations: { fr: "Boucles", en: "Earrings", ar: "أقراط" } },
            { name: "Montres", handle: "bijoux-montres", translations: { fr: "Montres", en: "Watches", ar: "ساعات" } },
        ],
    },
    {
        name: "Collections Spéciales",
        handle: "collections-speciales",
        description: "Éditions limitées, promotions et nouveautés",
        translations: { fr: "Collections Spéciales", en: "Special Collections", ar: "مجموعات خاصة" },
        children: [
            { name: "Nouveautés", handle: "nouveautes", translations: { fr: "Nouveautés", en: "New Arrivals", ar: "وصل حديثاً" } },
            { name: "Édition Limitée", handle: "edition-limitee", translations: { fr: "Édition Limitée", en: "Limited Edition", ar: "إصدار محدود" } },
            { name: "Soldes", handle: "soldes", translations: { fr: "Soldes", en: "Sale", ar: "تخفيضات" } },
            { name: "Collab Créateurs", handle: "collab-createurs", translations: { fr: "Collab Créateurs", en: "Creator Collabs", ar: "تعاون المبدعين" } },
        ],
    },
];
// ─── Script entry point ───────────────────────────────────────────────────────
async function seedCategories({ container }) {
    const logger = container.resolve("logger");
    logger.info("Starting category seed...");
    // Load existing categories to skip duplicates
    const query = container.resolve("remoteQuery");
    const existing = await query({
        product_categories: {
            fields: ["handle"],
        },
    }).then((r) => (r ?? []).map((c) => c.handle)).catch(() => []);
    const existingSet = new Set(existing);
    let created = 0;
    let skipped = 0;
    async function createNode(def, parentId) {
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
                }).then((r) => r?.[0]).catch(() => null);
                const id = found?.id;
                if (id && def.children) {
                    for (const child of def.children) {
                        await createNode(child, id);
                    }
                }
            }
            return "";
        }
        const { result } = await (0, core_flows_1.createProductCategoriesWorkflow)(container).run({
            input: {
                product_categories: [
                    {
                        name: def.name,
                        handle: def.handle,
                        description: def.description ?? "",
                        is_active: true,
                        is_internal: false,
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
function countNodes(nodes) {
    return nodes.reduce((acc, n) => acc + 1 + (n.children ? countNodes(n.children) : 0), 0);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VlZC1jYXRlZ29yaWVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3NjcmlwdHMvc2VlZC1jYXRlZ29yaWVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7R0FRRzs7QUFzS0gsaUNBNkVDO0FBaFBELDREQUE4RTtBQWE5RSxNQUFNLElBQUksR0FBYTtJQUNyQjtRQUNFLElBQUksRUFBRSxZQUFZO1FBQ2xCLE1BQU0sRUFBRSxPQUFPO1FBQ2YsV0FBVyxFQUFFLCtEQUErRDtRQUM1RSxZQUFZLEVBQUUsRUFBRSxFQUFFLEVBQUUsWUFBWSxFQUFFLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxFQUFFLEVBQUUsYUFBYSxFQUFFO1FBQzVFLFFBQVEsRUFBRTtZQUNSO2dCQUNFLElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLE1BQU0sRUFBRSxpQkFBaUI7Z0JBQ3pCLFlBQVksRUFBRSxFQUFFLEVBQUUsRUFBRSxpQkFBaUIsRUFBRSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsRUFBRSxFQUFFLGNBQWMsRUFBRTtnQkFDbkYsUUFBUSxFQUFFO29CQUNSLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBYSxNQUFNLEVBQUUsYUFBYSxFQUFPLFlBQVksRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQWEsRUFBRSxFQUFFLFNBQVMsRUFBTSxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUU7b0JBQ25JLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixFQUFHLE1BQU0sRUFBRSxZQUFZLEVBQVEsWUFBWSxFQUFFLEVBQUUsRUFBRSxFQUFFLGlCQUFpQixFQUFHLEVBQUUsRUFBRSxNQUFNLEVBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFO29CQUNsSSxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBQyxNQUFNLEVBQUUsaUJBQWlCLEVBQUcsWUFBWSxFQUFFLEVBQUUsRUFBRSxFQUFFLG1CQUFtQixFQUFDLEVBQUUsRUFBRSxVQUFV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