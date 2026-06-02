"use strict";
/**
 * Leuzma product seed — 24 fashion products across all category branches.
 *
 * Run AFTER seed.ts and seed-categories.ts:
 *   pnpm medusa exec ./src/scripts/seed-products.ts
 *
 * Requires: default shipping profile, default sales channel, "Main Warehouse"
 * stock location, and all category handles from seed-categories.ts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = seedProducts;
const utils_1 = require("@medusajs/framework/utils");
const core_flows_1 = require("@medusajs/medusa/core-flows");
// ─── Price helpers ────────────────────────────────────────────────────────────
const toXof = (usdCents) => Math.round(((usdCents / 100) * 655) / 50) * 50;
const p = (eurCents, usdCents) => [
    { currency_code: "eur", amount: eurCents },
    { currency_code: "usd", amount: usdCents },
    { currency_code: "xof", amount: toXof(usdCents) },
];
// ─── Image helper (Unsplash CDN) ──────────────────────────────────────────────
const img = (id, h = 1000) => `https://images.unsplash.com/photo-${id}?w=800&h=${h}&fit=crop&auto=format&q=80`;
// ─── Size sets ────────────────────────────────────────────────────────────────
const CLOTHES_SIZES = ["XS", "S", "M", "L", "XL"];
const SHOE_SIZES = ["36", "37", "38", "39", "40", "41", "42"];
// ─── Variant factory helpers ──────────────────────────────────────────────────
const skuSafe = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, "-").replace(/-+/g, "-").replace(/-$/, "");
function sizeVariants(sku, eur, usd) {
    return CLOTHES_SIZES.map(size => ({
        title: size,
        sku: `${sku}-${size}`,
        options: { Size: size },
        prices: p(eur, usd),
    }));
}
function sizeColorVariants(sku, colors, eur, usd) {
    const variants = [];
    for (const size of CLOTHES_SIZES) {
        for (const color of colors) {
            variants.push({
                title: `${size} / ${color}`,
                sku: `${sku}-${size}-${skuSafe(color)}`,
                options: { Size: size, Couleur: color },
                prices: p(eur, usd),
            });
        }
    }
    return variants;
}
function shoeVariants(sku, eur, usd) {
    return SHOE_SIZES.map(size => ({
        title: size,
        sku: `${sku}-${size}`,
        options: { Pointure: size },
        prices: p(eur, usd),
    }));
}
function shoeColorVariants(sku, colors, eur, usd) {
    const variants = [];
    for (const size of SHOE_SIZES) {
        for (const color of colors) {
            variants.push({
                title: `${size} / ${color}`,
                sku: `${sku}-${size}-${skuSafe(color)}`,
                options: { Pointure: size, Couleur: color },
                prices: p(eur, usd),
            });
        }
    }
    return variants;
}
function optionVariants(sku, optionKey, labels, eurPrices, usdPrices) {
    return labels.map((label, i) => ({
        title: label,
        sku: `${sku}-${skuSafe(label)}`,
        options: { [optionKey]: label },
        prices: p(eurPrices[i], usdPrices[i]),
    }));
}
// ─── Main script ──────────────────────────────────────────────────────────────
async function seedProducts({ container }) {
    const logger = container.resolve(utils_1.ContainerRegistrationKeys.LOGGER);
    const query = container.resolve(utils_1.ContainerRegistrationKeys.QUERY);
    const fulfillmentService = container.resolve(utils_1.Modules.FULFILLMENT);
    const salesChannelService = container.resolve(utils_1.Modules.SALES_CHANNEL);
    const stockLocationService = container.resolve(utils_1.Modules.STOCK_LOCATION);
    const productService = container.resolve(utils_1.Modules.PRODUCT);
    // ── Lookup shared resources ────────────────────────────────────────────────
    const [shippingProfile] = await fulfillmentService.listShippingProfiles({ type: "default" });
    if (!shippingProfile) {
        throw new Error("No default shipping profile — run seed.ts first");
    }
    const [defaultSalesChannel] = await salesChannelService.listSalesChannels({
        name: "Default Sales Channel",
    });
    if (!defaultSalesChannel) {
        throw new Error("No Default Sales Channel — run seed.ts first");
    }
    const [stockLocation] = await stockLocationService.listStockLocations({
        name: "Main Warehouse",
    });
    if (!stockLocation) {
        throw new Error("No Main Warehouse stock location — run seed.ts first");
    }
    // ── Load categories ────────────────────────────────────────────────────────
    logger.info("Loading categories...");
    const getCat = async (handle) => {
        const [cat] = await productService.listProductCategories({ handle });
        if (!cat)
            throw new Error(`Category "${handle}" not found — run seed-categories.ts first`);
        return cat.id;
    };
    const [
    // Mode Femme
    catFemme, catFemmeVetements, catFemmeRobes, catFemmeTops, catFemmePantalons, catFemmeJupes, catFemmeVestes, catFemmeEnsembles, catFemmeChaussures, 
    // Mode Homme
    catHomme, catHommeVetements, catHommeChemises, catHommeVestes, catHommeJeans, catHommePantalons, catHommeTshirts, 
    // Sacs
    catSacs, catSacsMain, catSacsTotes, catSacsPochettes, 
    // Chaussures
    catChaussures, catChaussuresSneakers, catChaussuresSandales, catChaussuresBottes, catChaussuresTalons, 
    // Bijoux
    catBijoux, catBijouxColliers, catBijouxBracelets, catBijouxBoucles,] = await Promise.all([
        getCat("femme"), getCat("femme-vetements"), getCat("femme-robes"), getCat("femme-tops"),
        getCat("femme-pantalons"), getCat("femme-jupes"), getCat("femme-vestes"), getCat("femme-ensembles"),
        getCat("femme-chaussures"),
        getCat("homme"), getCat("homme-vetements"), getCat("homme-chemises"), getCat("homme-vestes"),
        getCat("homme-jeans"), getCat("homme-pantalons"), getCat("homme-tshirts"),
        getCat("sacs"), getCat("sacs-main"), getCat("sacs-totes"), getCat("sacs-pochettes"),
        getCat("chaussures"), getCat("chaussures-sneakers"), getCat("chaussures-sandales"),
        getCat("chaussures-bottes"), getCat("chaussures-talons"),
        getCat("bijoux"), getCat("bijoux-colliers"), getCat("bijoux-bracelets"), getCat("bijoux-boucles"),
    ]);
    logger.info("Categories loaded.");
    // Shorthand refs
    const sc = [{ id: defaultSalesChannel.id }];
    const sp = shippingProfile.id;
    // ── Skip already-existing products ────────────────────────────────────────
    const ALL_HANDLES = [
        // Mode Femme
        "robe-velours-bordeaux", "robe-satin-midi",
        "top-satine-creme", "chemise-oversize-lin-femme",
        "blazer-camel-femme", "jean-taille-haute-noir",
        "jupe-midi-plissee", "ensemble-coordonne-beige",
        // Mode Homme
        "chemise-lin-homme", "chemise-oxford-homme",
        "blazer-kaki-homme", "jean-slim-indigo",
        "pantalon-chino-beige", "polo-pique-blanc",
        // Sacs
        "sac-main-cuir-cognac", "cabas-toile-naturel", "pochette-soiree-doree",
        // Chaussures
        "sneakers-blanches-femme", "sandales-plates-cuir",
        "bottes-chelsea-camel", "escarpins-nude",
        // Bijoux
        "collier-perles-dorees", "bracelet-jonc-or", "boucles-creoles-or",
    ];
    const existing = await productService.listProducts({ handle: ALL_HANDLES });
    const existingSet = new Set(existing.map((p) => p.handle));
    const toCreate = new Set(ALL_HANDLES.filter(h => !existingSet.has(h)));
    if (!toCreate.size) {
        logger.info("All 24 products already exist — nothing to do.");
        return;
    }
    logger.info(`Will create ${toCreate.size} of ${ALL_HANDLES.length} products.`);
    // ── BATCH 1 — Mode Femme : Vêtements ─────────────────────────────────────
    const BATCH_FEMME_VETEMENTS = [
        {
            title: "Robe Velours Bordeaux",
            handle: "robe-velours-bordeaux",
            description: "Robe midi en velours bordeaux au tombé élégant. Col en V, manches longues ajustées " +
                "et fermeture zippée dans le dos. Tissu épais et soyeux pour une silhouette sculptée. " +
                "Parfaite pour une soirée habillée ou un dîner chic à Dakar.",
            category_ids: [catFemme, catFemmeVetements, catFemmeRobes],
            weight: 350,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1596755094514-f87e34085b2c") },
                { url: img("1515886657613-9a5b7da76ef4") },
                { url: img("1583846717393-dc2412c95ed7") },
            ],
            options: [
                { title: "Size", values: CLOTHES_SIZES },
                { title: "Couleur", values: ["Bordeaux", "Noir"] },
            ],
            variants: sizeColorVariants("ROBE-VEL", ["Bordeaux", "Noir"], 6900, 7500),
        },
        {
            title: "Robe Satin Midi",
            handle: "robe-satin-midi",
            description: "Robe midi en satin brillant à bretelles fines et coupe biaisée qui sublime la silhouette. " +
                "Fermeture glissière latérale invisible. Une robe de soirée raffinée, disponible en " +
                "Champagne, Noir et Blush pour toutes vos occasions spéciales.",
            category_ids: [catFemme, catFemmeVetements, catFemmeRobes],
            weight: 280,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1546948630-be73b73c3538") },
                { url: img("1566174342582-e6a4e24abe02") },
                { url: img("1494790108377-be9c29b29330") },
            ],
            options: [
                { title: "Size", values: CLOTHES_SIZES },
                { title: "Couleur", values: ["Champagne", "Noir", "Blush"] },
            ],
            variants: sizeColorVariants("ROBE-SAT", ["Champagne", "Noir", "Blush"], 7900, 8500),
        },
        {
            title: "Top Satiné Crème",
            handle: "top-satine-creme",
            description: "Top satiné à bretelles réglables et col carré. Tissu fluide et légèrement brillant, " +
                "à porter seul ou glissé dans un jean taille haute. Un essentiel chic du dressing féminin " +
                "qui passe du bureau au restaurant.",
            category_ids: [catFemme, catFemmeVetements, catFemmeTops],
            weight: 150,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1516762724766-73e7f2c09ff6") },
                { url: img("1558769132-cb1aea458c5e") },
            ],
            options: [
                { title: "Size", values: CLOTHES_SIZES },
                { title: "Couleur", values: ["Crème", "Noir", "Rose poudré"] },
            ],
            variants: sizeColorVariants("TOP-SAT", ["Crème", "Noir", "Rose poudré"], 3200, 3500),
        },
        {
            title: "Chemise Oversize Lin Femme",
            handle: "chemise-oversize-lin-femme",
            description: "Chemise oversize en lin naturel à col classique et boutons nacrés. Légère, respirante " +
                "et naturellement froissée — c'est toute son esthétique. Se porte ouverte sur un top " +
                "ou rentrée dans une jupe courte pour un look estival décontracté-chic.",
            category_ids: [catFemme, catFemmeVetements, catFemmeTops],
            weight: 220,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1562157873-818bc0726f68") },
                { url: img("1509631179647-0177331693ae") },
            ],
            options: [
                { title: "Size", values: CLOTHES_SIZES },
                { title: "Couleur", values: ["Blanc", "Beige naturel", "Bleu ciel"] },
            ],
            variants: sizeColorVariants("CHEM-LIN-F", ["Blanc", "Beige naturel", "Bleu ciel"], 3900, 4200),
        },
        {
            title: "Blazer Camel Femme",
            handle: "blazer-camel-femme",
            description: "Blazer structuré en camel à simple boutonnage et épaules légèrement marquées. " +
                "Doublure satinée, poches plaquées et col à revers crantés. La pièce maîtresse qui " +
                "élève n'importe quelle tenue — jean, robe ou ensemble coordonné.",
            category_ids: [catFemme, catFemmeVetements, catFemmeVestes],
            weight: 450,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1580651543395-2e8e2b4ee01b") },
                { url: img("1539109136881-3be0616acf4b") },
            ],
            options: [{ title: "Size", values: CLOTHES_SIZES }],
            variants: sizeVariants("BLAZ-CAM-F", 8500, 9200),
        },
        {
            title: "Jean Taille Haute Noir",
            handle: "jean-taille-haute-noir",
            description: "Jean taille haute en denim stretch noir, coupe slim qui galbe et affine la silhouette. " +
                "Cinq poches et braguette boutonnée. Le jean noir intemporel qui se marie avec tout — " +
                "blazer pour le bureau, chemise blanche pour le week-end.",
            category_ids: [catFemme, catFemmeVetements, catFemmePantalons],
            weight: 500,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1541099649105-f69ad21f3246") },
                { url: img("1506629082955-0d976af1ce8b") },
            ],
            options: [{ title: "Size", values: CLOTHES_SIZES }],
            variants: sizeVariants("JEAN-TH-N", 4500, 4900),
        },
        {
            title: "Jupe Midi Plissée",
            handle: "jupe-midi-plissee",
            description: "Jupe midi plissée en tissu satiné légèrement fluide, longueur genoux-mollets. " +
                "Taille élastiquée pour un confort optimal. La jupe féminine parfaite pour le bureau " +
                "comme pour le week-end, disponible en Beige, Vert sauge et Bordeaux.",
            category_ids: [catFemme, catFemmeVetements, catFemmeJupes],
            weight: 250,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1567401893414-76b7b1e5a7a5") },
                { url: img("1485518882989-dc740785b5ef") },
            ],
            options: [
                { title: "Size", values: CLOTHES_SIZES },
                { title: "Couleur", values: ["Beige", "Vert sauge", "Bordeaux"] },
            ],
            variants: sizeColorVariants("JUPE-MID", ["Beige", "Vert sauge", "Bordeaux"], 3500, 3800),
        },
        {
            title: "Ensemble Coordonné Beige",
            handle: "ensemble-coordonne-beige",
            description: "Co-ord set composé d'un blazer et d'un pantalon taille haute en tissu texturé beige sable. " +
                "Coupe tailored épurée, bouton doré sur le blazer. Se porte en ensemble pour une allure " +
                "professionnelle affirmée, ou séparément pour plus de polyvalence.",
            category_ids: [catFemme, catFemmeVetements, catFemmeEnsembles],
            weight: 650,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1594938298603-c8148c4b0ef9") },
                { url: img("1483985988355-763728e1935b") },
            ],
            options: [{ title: "Size", values: CLOTHES_SIZES }],
            variants: sizeVariants("ENS-BEI", 8900, 9600),
        },
    ];
    // ── BATCH 2 — Mode Homme : Vêtements ─────────────────────────────────────
    const BATCH_HOMME_VETEMENTS = [
        {
            title: "Chemise Lin Homme",
            handle: "chemise-lin-homme",
            description: "Chemise en lin pur à col classique et manches longues retroussables. " +
                "Tissu naturellement respirant et thermorégulateur, idéal pour le climat sénégalais. " +
                "Trois coloris discrets pour un look casual-chic sans effort.",
            category_ids: [catHomme, catHommeVetements, catHommeChemises],
            weight: 280,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1516826957135-700dedea698c") },
                { url: img("1523381140794-c4c3e8eeb0f0") },
            ],
            options: [
                { title: "Size", values: CLOTHES_SIZES },
                { title: "Couleur", values: ["Blanc", "Bleu ciel", "Beige"] },
            ],
            variants: sizeColorVariants("CHEM-LIN-H", ["Blanc", "Bleu ciel", "Beige"], 4500, 4900),
        },
        {
            title: "Chemise Oxford Homme",
            handle: "chemise-oxford-homme",
            description: "Chemise Oxford en coton légèrement texturé à col button-down et coupe regular fit. " +
                "L'incontournable du look smart-casual masculin. Poche poitrine, manches longues boutonnées. " +
                "Parfaite rentrée dans un chino ou portée ouverte sur un t-shirt blanc.",
            category_ids: [catHomme, catHommeVetements, catHommeChemises],
            weight: 300,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1598300042738-22a5fef47c9e") },
                { url: img("1593032465175-481ac7f401a0") },
            ],
            options: [
                { title: "Size", values: CLOTHES_SIZES },
                { title: "Couleur", values: ["Blanc", "Bleu royal", "Rose nude"] },
            ],
            variants: sizeColorVariants("CHEM-OXF", ["Blanc", "Bleu royal", "Rose nude"], 5200, 5800),
        },
        {
            title: "Blazer Kaki Homme",
            handle: "blazer-kaki-homme",
            description: "Blazer en tissu structuré couleur kaki militaire, coupe slim. Doublure intérieure, " +
                "deux boutons dorés et poches à rabat. Une pièce polyvalente qui fonctionne en soirée " +
                "sur une chemise blanche ou au quotidien sur un t-shirt et un jean.",
            category_ids: [catHomme, catHommeVetements, catHommeVestes],
            weight: 550,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1507679799987-c73779587ccf") },
                { url: img("1473966968600-fa4cebf59f6e") },
            ],
            options: [{ title: "Size", values: CLOTHES_SIZES }],
            variants: sizeVariants("BLAZ-KAK-H", 9500, 10200),
        },
        {
            title: "Jean Slim Indigo",
            handle: "jean-slim-indigo",
            description: "Jean slim en denim indigo à coupe ajustée et tissu légèrement stretch pour le confort " +
                "du mouvement. Cinq poches traditionnelles, surpiqûres contrastantes. Le jean intemporel " +
                "qui s'adapte à toutes les morphologies et toutes les occasions.",
            category_ids: [catHomme, catHommeVetements, catHommeJeans],
            weight: 550,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1542272604-787c3835535d") },
                { url: img("1475178626620-a4d074967452") },
            ],
            options: [{ title: "Size", values: CLOTHES_SIZES }],
            variants: sizeVariants("JEAN-SLM-I", 5500, 5900),
        },
        {
            title: "Pantalon Chino Beige",
            handle: "pantalon-chino-beige",
            description: "Chino en coton satiné à taille mi-haute et coupe droite légèrement fuselée. " +
                "Tissu doux et résistant, parfait pour le quotidien du bureau au week-end. " +
                "Trois coloris neutres qui s'accordent à toutes les tenues.",
            category_ids: [catHomme, catHommeVetements, catHommePantalons],
            weight: 400,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1585386959984-a4155224a1ad") },
                { url: img("1602810316693-3667c854239a") },
            ],
            options: [
                { title: "Size", values: CLOTHES_SIZES },
                { title: "Couleur", values: ["Beige", "Gris clair", "Marine"] },
            ],
            variants: sizeColorVariants("PANT-CHI", ["Beige", "Gris clair", "Marine"], 4800, 5200),
        },
        {
            title: "Polo Piqué Homme",
            handle: "polo-pique-blanc",
            description: "Polo en piqué de coton à col boutonné deux boutons et manches courtes. " +
                "Tissu respirant et légèrement structuré qui garde sa forme au fil du temps. " +
                "Un classique du vestiaire masculin disponible en quatre coloris indémodables.",
            category_ids: [catHomme, catHommeVetements, catHommeTshirts],
            weight: 280,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1620799140408-edc6dcb6d633") },
                { url: img("1598033129183-c4f50c736f10") },
            ],
            options: [
                { title: "Size", values: CLOTHES_SIZES },
                { title: "Couleur", values: ["Blanc", "Marine", "Noir", "Vert forêt"] },
            ],
            variants: sizeColorVariants("POLO-PIQ", ["Blanc", "Marine", "Noir", "Vert forêt"], 2800, 3200),
        },
    ];
    // ── BATCH 3 — Sacs & Maroquinerie ────────────────────────────────────────
    const BATCH_SACS = [
        {
            title: "Sac à Main Cuir Cognac",
            handle: "sac-main-cuir-cognac",
            description: "Sac à main structuré en cuir véritable grain naturel. Fermeture à glissière dorée, " +
                "bandoulière amovible et réglable, double poignée en cuir. Intérieur doublure satinée " +
                "avec deux poches zippées et un soufflet central. Capacité quotidienne généreuse.",
            category_ids: [catSacs, catSacsMain],
            weight: 650,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1548036328-c9fa89d128fa") },
                { url: img("1590874103328-eac38a683ce7") },
                { url: img("1584917865442-de89df76afd3") },
            ],
            options: [{ title: "Couleur", values: ["Cognac", "Noir", "Camel"] }],
            variants: [
                { title: "Cognac", sku: "SAC-CUI-COGNAC", options: { Couleur: "Cognac" }, prices: p(10500, 11500) },
                { title: "Noir", sku: "SAC-CUI-NOIR", options: { Couleur: "Noir" }, prices: p(10500, 11500) },
                { title: "Camel", sku: "SAC-CUI-CAMEL", options: { Couleur: "Camel" }, prices: p(10500, 11500) },
            ],
        },
        {
            title: "Cabas Toile Naturel",
            handle: "cabas-toile-naturel",
            description: "Grand cabas en toile de coton naturel épais, anses en cuir véritable cousues renforcées. " +
                "Fond rigide pour maintenir la forme même plein. Parfait pour le shopping, la plage ou " +
                "le quotidien. Lavable en machine à 30°C.",
            category_ids: [catSacs, catSacsTotes],
            weight: 400,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1553062407-98eeb64c6a62") },
                { url: img("1566150905458-1bf4ac6be7b9") },
            ],
            options: [{ title: "Couleur", values: ["Naturel", "Noir", "Beige"] }],
            variants: [
                { title: "Naturel", sku: "CABAS-NAT", options: { Couleur: "Naturel" }, prices: p(3200, 3500) },
                { title: "Noir", sku: "CABAS-NOI", options: { Couleur: "Noir" }, prices: p(3200, 3500) },
                { title: "Beige", sku: "CABAS-BEI", options: { Couleur: "Beige" }, prices: p(3200, 3500) },
            ],
        },
        {
            title: "Pochette Soirée Dorée",
            handle: "pochette-soiree-doree",
            description: "Pochette de soirée en tissu jacquard brodé avec fermeture à clips dorés brossés. " +
                "Bandoulière chaîne amovible. Intérieur doublure satinée avec miroir de poche. " +
                "L'accessoire qui complète une tenue de soirée et fait toute la différence.",
            category_ids: [catSacs, catSacsPochettes],
            weight: 200,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1566150905458-1bf4ac6be7b9") },
                { url: img("1548036328-c9fa89d128fa") },
            ],
            options: [{ title: "Couleur", values: ["Or", "Argent", "Rose gold"] }],
            variants: [
                { title: "Or", sku: "POCH-OR", options: { Couleur: "Or" }, prices: p(4200, 4600) },
                { title: "Argent", sku: "POCH-ARG", options: { Couleur: "Argent" }, prices: p(4200, 4600) },
                { title: "Rose gold", sku: "POCH-RSG", options: { Couleur: "Rose gold" }, prices: p(4200, 4600) },
            ],
        },
    ];
    // ── BATCH 4 — Chaussures ─────────────────────────────────────────────────
    const BATCH_CHAUSSURES = [
        {
            title: "Sneakers Blanches Femme",
            handle: "sneakers-blanches-femme",
            description: "Sneakers iconiques tout-blanches à semelle légèrement plateforme (+3 cm). " +
                "Tige en cuir synthétique lisse, intérieur rembourré et semelle crantée antidérapante. " +
                "La paire intemporelle à assortir à toutes les tenues, du jean à la robe.",
            category_ids: [catChaussures, catChaussuresSneakers, catFemme, catFemmeChaussures],
            weight: 700,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1542291026-7eec264c27ff") },
                { url: img("1491553895911-0055eca6402d") },
            ],
            options: [{ title: "Pointure", values: SHOE_SIZES }],
            variants: shoeVariants("SNK-BLC-F", 5900, 6400),
        },
        {
            title: "Sandales Plates Cuir",
            handle: "sandales-plates-cuir",
            description: "Sandales plates en cuir avec lanières croisées et boucle métal ajustable. " +
                "Semelle anatomique en liège naturel pour un confort optimal toute la journée. " +
                "Disponibles en Camel, Noir et Blanc pour s'accorder à toutes vos tenues estivales.",
            category_ids: [catChaussures, catChaussuresSandales, catFemme, catFemmeChaussures],
            weight: 400,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1565030999-ec68dfb04e7c") },
                { url: img("1603487742131-4160ec999306") },
            ],
            options: [
                { title: "Pointure", values: SHOE_SIZES },
                { title: "Couleur", values: ["Camel", "Noir", "Blanc"] },
            ],
            variants: shoeColorVariants("SAND-PLT", ["Camel", "Noir", "Blanc"], 3800, 4200),
        },
        {
            title: "Bottes Chelsea Camel",
            handle: "bottes-chelsea-camel",
            description: "Bottes Chelsea en cuir synthétique texturé, élastiques latéraux en jersey pour l'enfilage " +
                "et tirette arrière. Semelle crantée légèrement surélevée (+3 cm). Le classique des bottes " +
                "qui traverse les saisons et s'harmonise avec jeans, robes et jupes.",
            category_ids: [catChaussures, catChaussuresBottes, catFemme, catFemmeChaussures],
            weight: 850,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1542289542-2693f12ad2c1") },
                { url: img("1610398752800-146f269dfcc8") },
            ],
            options: [
                { title: "Pointure", values: SHOE_SIZES },
                { title: "Couleur", values: ["Camel", "Noir"] },
            ],
            variants: shoeColorVariants("BOOT-CHE", ["Camel", "Noir"], 8500, 9200),
        },
        {
            title: "Escarpins Nude",
            handle: "escarpins-nude",
            description: "Escarpins à talon aiguille 9 cm en cuir verni nude rosé. Bout pointu, contrefort " +
                "rembourré et semelle intérieure en cuir. La chaussure de soirée qui allonge la silhouette " +
                "et sublime toutes les tenues de la robe au tailleur.",
            category_ids: [catChaussures, catChaussuresTalons, catFemme, catFemmeChaussures],
            weight: 600,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1543163521-1bf539c55dd2") },
                { url: img("1518049362265-d5b2a6467637") },
            ],
            options: [{ title: "Pointure", values: SHOE_SIZES }],
            variants: shoeVariants("ESC-NUD", 6200, 6800),
        },
    ];
    // ── BATCH 5 — Bijoux ─────────────────────────────────────────────────────
    const BATCH_BIJOUX = [
        {
            title: "Collier Perles Dorées",
            handle: "collier-perles-dorees",
            description: "Collier de perles synthétiques nacrées enfilées sur chaîne en acier inoxydable doré. " +
                "Fermoir mousqueton sécurisé. Un bijou intemporel et doux qui apporte élégance immédiate " +
                "à une tenue simple. Disponible en trois longueurs pour différents looks.",
            category_ids: [catBijoux, catBijouxColliers],
            weight: 80,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1599643478518-a784e5dc4c8f", 800) },
                { url: img("1515562141207-7a88fb7ce338", 800) },
            ],
            options: [{ title: "Longueur", values: ["45 cm", "50 cm", "60 cm"] }],
            variants: optionVariants("COL-PRL", "Longueur", ["45 cm", "50 cm", "60 cm"], [2200, 2500, 2800], [2400, 2700, 3100]),
        },
        {
            title: "Bracelet Jonc Or",
            handle: "bracelet-jonc-or",
            description: "Bracelet jonc rigide en acier inoxydable plaqué or 18 carats. Ouverture légère pour " +
                "l'enfilage. Design minimaliste et moderne qui se porte seul pour un look épuré ou empilé " +
                "avec d'autres bracelets pour plus d'affirmation.",
            category_ids: [catBijoux, catBijouxBracelets],
            weight: 60,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1573408301185-9519f94f0be3", 800) },
                { url: img("1611591437281-460bfbe1220a", 800) },
            ],
            options: [{ title: "Finition", values: ["Or satiné", "Or brillant", "Argent"] }],
            variants: optionVariants("BRAC-JON", "Finition", ["Or satiné", "Or brillant", "Argent"], [2200, 2400, 2000], [2400, 2600, 2200]),
        },
        {
            title: "Boucles Créoles Or",
            handle: "boucles-creoles-or",
            description: "Créoles en acier inoxydable plaqué or jaune, légères et hypoallergéniques. " +
                "Fermoir click-it sécurisé. Trois tailles pour un style discret et élégant au quotidien " +
                "ou une présence affirmée pour les soirées. Ne noircissent pas et résistent à l'eau.",
            category_ids: [catBijoux, catBijouxBoucles],
            weight: 40,
            status: utils_1.ProductStatus.PUBLISHED,
            shipping_profile_id: sp,
            sales_channels: sc,
            images: [
                { url: img("1629189284820-3da0de20e0e4", 800) },
                { url: img("1588444837495-c6e905849aba", 800) },
            ],
            options: [{ title: "Taille", values: ["Small 2cm", "Medium 3.5cm", "Large 5cm"] }],
            variants: optionVariants("BOUCL-CR", "Taille", ["Small 2cm", "Medium 3.5cm", "Large 5cm"], [1600, 1900, 2300], [1800, 2100, 2500]),
        },
    ];
    // ── Create products in batches ────────────────────────────────────────────
    const BATCHES = [
        { name: "Mode Femme — Vêtements", products: BATCH_FEMME_VETEMENTS },
        { name: "Mode Homme — Vêtements", products: BATCH_HOMME_VETEMENTS },
        { name: "Sacs & Maroquinerie", products: BATCH_SACS },
        { name: "Chaussures", products: BATCH_CHAUSSURES },
        { name: "Bijoux", products: BATCH_BIJOUX },
    ];
    for (const batch of BATCHES) {
        const batchProducts = batch.products.filter((prod) => toCreate.has(prod.handle));
        if (!batchProducts.length) {
            logger.info(`${batch.name}: all exist, skipping.`);
            continue;
        }
        logger.info(`Creating ${batchProducts.length} product(s) in "${batch.name}"...`);
        await (0, core_flows_1.createProductsWorkflow)(container).run({
            input: { products: batchProducts },
        });
        logger.info(`"${batch.name}" done.`);
    }
    // ── Set inventory levels (200 units per variant / location) ───────────────
    logger.info("Setting inventory levels...");
    const { data: inventoryItems } = await query.graph({
        entity: "inventory_item",
        fields: ["id"],
    });
    // Fetch existing levels to avoid duplicate-key errors on re-runs
    const { data: existingLevels } = await query.graph({
        entity: "inventory_level",
        fields: ["inventory_item_id"],
        filters: { location_id: stockLocation.id },
    });
    const alreadyHasLevel = new Set((existingLevels ?? []).map((l) => l.inventory_item_id));
    const levels = inventoryItems
        .filter((item) => !alreadyHasLevel.has(item.id))
        .map((item) => ({
        location_id: stockLocation.id,
        stocked_quantity: 200,
        inventory_item_id: item.id,
    }));
    if (levels.length) {
        await (0, core_flows_1.createInventoryLevelsWorkflow)(container).run({
            input: { inventory_levels: levels },
        });
        logger.info(`Inventory set for ${levels.length} new items (${alreadyHasLevel.size} already had levels).`);
    }
    else {
        logger.info("All inventory levels already exist — nothing to add.");
    }
    // ── Summary ───────────────────────────────────────────────────────────────
    logger.info("═══════════════════════════════════════════════════════");
    logger.info("✅  Product seed complete!");
    logger.info(`   Created : ${toCreate.size} products`);
    logger.info("   Skipped : " + (ALL_HANDLES.length - toCreate.size) + " (already exist)");
    logger.info("");
    logger.info("   Categories covered:");
    logger.info("     Mode Femme → Robes, Tops, Vestes, Pantalons, Jupes, Ensembles");
    logger.info("     Mode Homme → Chemises, Vestes, Jeans, Pantalons, T-shirts/Polos");
    logger.info("     Sacs       → Sacs à main, Cabas/Totes, Pochettes");
    logger.info("     Chaussures → Sneakers, Sandales, Bottes, Talons");
    logger.info("     Bijoux     → Colliers, Bracelets, Boucles d'oreilles");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VlZC1wcm9kdWN0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9zY3JpcHRzL3NlZWQtcHJvZHVjdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7OztHQVFHOztBQXdHSCwrQkEyc0JDO0FBaHpCRCxxREFJbUM7QUFDbkMsNERBR3FDO0FBRXJDLGlGQUFpRjtBQUVqRixNQUFNLEtBQUssR0FBRyxDQUFDLFFBQWdCLEVBQUUsRUFBRSxDQUNqQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBRWpELE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBZ0IsRUFBRSxRQUFnQixFQUFFLEVBQUUsQ0FBQztJQUNoRCxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRTtJQUMxQyxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRTtJQUMxQyxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRTtDQUNsRCxDQUFDO0FBRUYsaUZBQWlGO0FBRWpGLE1BQU0sR0FBRyxHQUFHLENBQUMsRUFBVSxFQUFFLENBQUMsR0FBRyxJQUFJLEVBQUUsRUFBRSxDQUNuQyxxQ0FBcUMsRUFBRSxZQUFZLENBQUMsNEJBQTRCLENBQUM7QUFFbkYsaUZBQWlGO0FBRWpGLE1BQU0sYUFBYSxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ2xELE1BQU0sVUFBVSxHQUFNLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFFakUs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