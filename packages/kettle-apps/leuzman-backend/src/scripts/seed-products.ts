/**
 * Leuzma product seed — 24 fashion products across all category branches.
 *
 * Run AFTER seed.ts and seed-categories.ts:
 *   pnpm medusa exec ./src/scripts/seed-products.ts
 *
 * Requires: default shipping profile, default sales channel, "Main Warehouse"
 * stock location, and all category handles from seed-categories.ts.
 */

import type { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows";

// ─── Price helpers ────────────────────────────────────────────────────────────

const toXof = (usdCents: number) =>
  Math.round(((usdCents / 100) * 655) / 50) * 50;

const p = (eurCents: number, usdCents: number) => [
  { currency_code: "eur", amount: eurCents },
  { currency_code: "usd", amount: usdCents },
  { currency_code: "xof", amount: toXof(usdCents) },
];

// ─── Image helper (Unsplash CDN) ──────────────────────────────────────────────

const img = (id: string, h = 1000) =>
  `https://images.unsplash.com/photo-${id}?w=800&h=${h}&fit=crop&auto=format&q=80`;

// ─── Size sets ────────────────────────────────────────────────────────────────

const CLOTHES_SIZES = ["XS", "S", "M", "L", "XL"];
const SHOE_SIZES    = ["36", "37", "38", "39", "40", "41", "42"];

// ─── Variant factory helpers ──────────────────────────────────────────────────

const skuSafe = (s: string) =>
  s.toUpperCase().replace(/[^A-Z0-9]/g, "-").replace(/-+/g, "-").replace(/-$/, "");

function sizeVariants(sku: string, eur: number, usd: number) {
  return CLOTHES_SIZES.map(size => ({
    title:   size,
    sku:     `${sku}-${size}`,
    options: { Size: size },
    prices:  p(eur, usd),
  }));
}

function sizeColorVariants(sku: string, colors: string[], eur: number, usd: number) {
  const variants: any[] = [];
  for (const size of CLOTHES_SIZES) {
    for (const color of colors) {
      variants.push({
        title:   `${size} / ${color}`,
        sku:     `${sku}-${size}-${skuSafe(color)}`,
        options: { Size: size, Couleur: color },
        prices:  p(eur, usd),
      });
    }
  }
  return variants;
}

function shoeVariants(sku: string, eur: number, usd: number) {
  return SHOE_SIZES.map(size => ({
    title:   size,
    sku:     `${sku}-${size}`,
    options: { Pointure: size },
    prices:  p(eur, usd),
  }));
}

function shoeColorVariants(sku: string, colors: string[], eur: number, usd: number) {
  const variants: any[] = [];
  for (const size of SHOE_SIZES) {
    for (const color of colors) {
      variants.push({
        title:   `${size} / ${color}`,
        sku:     `${sku}-${size}-${skuSafe(color)}`,
        options: { Pointure: size, Couleur: color },
        prices:  p(eur, usd),
      });
    }
  }
  return variants;
}

function optionVariants(
  sku: string,
  optionKey: string,
  labels: string[],
  eurPrices: number[],
  usdPrices: number[],
) {
  return labels.map((label, i) => ({
    title:   label,
    sku:     `${sku}-${skuSafe(label)}`,
    options: { [optionKey]: label },
    prices:  p(eurPrices[i], usdPrices[i]),
  }));
}

// ─── Main script ──────────────────────────────────────────────────────────────

export default async function seedProducts({ container }: ExecArgs) {
  const logger              = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query               = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentService  = container.resolve(Modules.FULFILLMENT);
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL);
  const stockLocationService = container.resolve(Modules.STOCK_LOCATION);
  const productService      = container.resolve(Modules.PRODUCT);

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

  const getCat = async (handle: string): Promise<string> => {
    const [cat] = await productService.listProductCategories({ handle });
    if (!cat) throw new Error(`Category "${handle}" not found — run seed-categories.ts first`);
    return cat.id;
  };

  const [
    // Mode Femme
    catFemme, catFemmeVetements, catFemmeRobes, catFemmeTops,
    catFemmePantalons, catFemmeJupes, catFemmeVestes, catFemmeEnsembles,
    catFemmeChaussures,
    // Mode Homme
    catHomme, catHommeVetements, catHommeChemises, catHommeVestes,
    catHommeJeans, catHommePantalons, catHommeTshirts,
    // Sacs
    catSacs, catSacsMain, catSacsTotes, catSacsPochettes,
    // Chaussures
    catChaussures, catChaussuresSneakers, catChaussuresSandales,
    catChaussuresBottes, catChaussuresTalons,
    // Bijoux
    catBijoux, catBijouxColliers, catBijouxBracelets, catBijouxBoucles,
  ] = await Promise.all([
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

  const existing     = await productService.listProducts({ handle: ALL_HANDLES });
  const existingSet  = new Set(existing.map((p: any) => p.handle));
  const toCreate     = new Set(ALL_HANDLES.filter(h => !existingSet.has(h)));

  if (!toCreate.size) {
    logger.info("All 24 products already exist — nothing to do.");
    return;
  }

  logger.info(`Will create ${toCreate.size} of ${ALL_HANDLES.length} products.`);

  // ── BATCH 1 — Mode Femme : Vêtements ─────────────────────────────────────

  const BATCH_FEMME_VETEMENTS = [
    {
      title:        "Robe Velours Bordeaux",
      handle:       "robe-velours-bordeaux",
      description:
        "Robe midi en velours bordeaux au tombé élégant. Col en V, manches longues ajustées " +
        "et fermeture zippée dans le dos. Tissu épais et soyeux pour une silhouette sculptée. " +
        "Parfaite pour une soirée habillée ou un dîner chic à Dakar.",
      category_ids:        [catFemme, catFemmeVetements, catFemmeRobes],
      weight:              350,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1596755094514-f87e34085b2c") },
        { url: img("1515886657613-9a5b7da76ef4") },
        { url: img("1583846717393-dc2412c95ed7") },
      ],
      options:  [
        { title: "Size",    values: CLOTHES_SIZES },
        { title: "Couleur", values: ["Bordeaux", "Noir"] },
      ],
      variants: sizeColorVariants("ROBE-VEL", ["Bordeaux", "Noir"], 6900, 7500),
    },
    {
      title:        "Robe Satin Midi",
      handle:       "robe-satin-midi",
      description:
        "Robe midi en satin brillant à bretelles fines et coupe biaisée qui sublime la silhouette. " +
        "Fermeture glissière latérale invisible. Une robe de soirée raffinée, disponible en " +
        "Champagne, Noir et Blush pour toutes vos occasions spéciales.",
      category_ids:        [catFemme, catFemmeVetements, catFemmeRobes],
      weight:              280,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1546948630-be73b73c3538") },
        { url: img("1566174342582-e6a4e24abe02") },
        { url: img("1494790108377-be9c29b29330") },
      ],
      options:  [
        { title: "Size",    values: CLOTHES_SIZES },
        { title: "Couleur", values: ["Champagne", "Noir", "Blush"] },
      ],
      variants: sizeColorVariants("ROBE-SAT", ["Champagne", "Noir", "Blush"], 7900, 8500),
    },
    {
      title:        "Top Satiné Crème",
      handle:       "top-satine-creme",
      description:
        "Top satiné à bretelles réglables et col carré. Tissu fluide et légèrement brillant, " +
        "à porter seul ou glissé dans un jean taille haute. Un essentiel chic du dressing féminin " +
        "qui passe du bureau au restaurant.",
      category_ids:        [catFemme, catFemmeVetements, catFemmeTops],
      weight:              150,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1516762724766-73e7f2c09ff6") },
        { url: img("1558769132-cb1aea458c5e") },
      ],
      options:  [
        { title: "Size",    values: CLOTHES_SIZES },
        { title: "Couleur", values: ["Crème", "Noir", "Rose poudré"] },
      ],
      variants: sizeColorVariants("TOP-SAT", ["Crème", "Noir", "Rose poudré"], 3200, 3500),
    },
    {
      title:        "Chemise Oversize Lin Femme",
      handle:       "chemise-oversize-lin-femme",
      description:
        "Chemise oversize en lin naturel à col classique et boutons nacrés. Légère, respirante " +
        "et naturellement froissée — c'est toute son esthétique. Se porte ouverte sur un top " +
        "ou rentrée dans une jupe courte pour un look estival décontracté-chic.",
      category_ids:        [catFemme, catFemmeVetements, catFemmeTops],
      weight:              220,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1562157873-818bc0726f68") },
        { url: img("1509631179647-0177331693ae") },
      ],
      options:  [
        { title: "Size",    values: CLOTHES_SIZES },
        { title: "Couleur", values: ["Blanc", "Beige naturel", "Bleu ciel"] },
      ],
      variants: sizeColorVariants("CHEM-LIN-F", ["Blanc", "Beige naturel", "Bleu ciel"], 3900, 4200),
    },
    {
      title:        "Blazer Camel Femme",
      handle:       "blazer-camel-femme",
      description:
        "Blazer structuré en camel à simple boutonnage et épaules légèrement marquées. " +
        "Doublure satinée, poches plaquées et col à revers crantés. La pièce maîtresse qui " +
        "élève n'importe quelle tenue — jean, robe ou ensemble coordonné.",
      category_ids:        [catFemme, catFemmeVetements, catFemmeVestes],
      weight:              450,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1580651543395-2e8e2b4ee01b") },
        { url: img("1539109136881-3be0616acf4b") },
      ],
      options:  [{ title: "Size", values: CLOTHES_SIZES }],
      variants: sizeVariants("BLAZ-CAM-F", 8500, 9200),
    },
    {
      title:        "Jean Taille Haute Noir",
      handle:       "jean-taille-haute-noir",
      description:
        "Jean taille haute en denim stretch noir, coupe slim qui galbe et affine la silhouette. " +
        "Cinq poches et braguette boutonnée. Le jean noir intemporel qui se marie avec tout — " +
        "blazer pour le bureau, chemise blanche pour le week-end.",
      category_ids:        [catFemme, catFemmeVetements, catFemmePantalons],
      weight:              500,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1541099649105-f69ad21f3246") },
        { url: img("1506629082955-0d976af1ce8b") },
      ],
      options:  [{ title: "Size", values: CLOTHES_SIZES }],
      variants: sizeVariants("JEAN-TH-N", 4500, 4900),
    },
    {
      title:        "Jupe Midi Plissée",
      handle:       "jupe-midi-plissee",
      description:
        "Jupe midi plissée en tissu satiné légèrement fluide, longueur genoux-mollets. " +
        "Taille élastiquée pour un confort optimal. La jupe féminine parfaite pour le bureau " +
        "comme pour le week-end, disponible en Beige, Vert sauge et Bordeaux.",
      category_ids:        [catFemme, catFemmeVetements, catFemmeJupes],
      weight:              250,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1567401893414-76b7b1e5a7a5") },
        { url: img("1485518882989-dc740785b5ef") },
      ],
      options:  [
        { title: "Size",    values: CLOTHES_SIZES },
        { title: "Couleur", values: ["Beige", "Vert sauge", "Bordeaux"] },
      ],
      variants: sizeColorVariants("JUPE-MID", ["Beige", "Vert sauge", "Bordeaux"], 3500, 3800),
    },
    {
      title:        "Ensemble Coordonné Beige",
      handle:       "ensemble-coordonne-beige",
      description:
        "Co-ord set composé d'un blazer et d'un pantalon taille haute en tissu texturé beige sable. " +
        "Coupe tailored épurée, bouton doré sur le blazer. Se porte en ensemble pour une allure " +
        "professionnelle affirmée, ou séparément pour plus de polyvalence.",
      category_ids:        [catFemme, catFemmeVetements, catFemmeEnsembles],
      weight:              650,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1594938298603-c8148c4b0ef9") },
        { url: img("1483985988355-763728e1935b") },
      ],
      options:  [{ title: "Size", values: CLOTHES_SIZES }],
      variants: sizeVariants("ENS-BEI", 8900, 9600),
    },
  ];

  // ── BATCH 2 — Mode Homme : Vêtements ─────────────────────────────────────

  const BATCH_HOMME_VETEMENTS = [
    {
      title:        "Chemise Lin Homme",
      handle:       "chemise-lin-homme",
      description:
        "Chemise en lin pur à col classique et manches longues retroussables. " +
        "Tissu naturellement respirant et thermorégulateur, idéal pour le climat sénégalais. " +
        "Trois coloris discrets pour un look casual-chic sans effort.",
      category_ids:        [catHomme, catHommeVetements, catHommeChemises],
      weight:              280,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1516826957135-700dedea698c") },
        { url: img("1523381140794-c4c3e8eeb0f0") },
      ],
      options:  [
        { title: "Size",    values: CLOTHES_SIZES },
        { title: "Couleur", values: ["Blanc", "Bleu ciel", "Beige"] },
      ],
      variants: sizeColorVariants("CHEM-LIN-H", ["Blanc", "Bleu ciel", "Beige"], 4500, 4900),
    },
    {
      title:        "Chemise Oxford Homme",
      handle:       "chemise-oxford-homme",
      description:
        "Chemise Oxford en coton légèrement texturé à col button-down et coupe regular fit. " +
        "L'incontournable du look smart-casual masculin. Poche poitrine, manches longues boutonnées. " +
        "Parfaite rentrée dans un chino ou portée ouverte sur un t-shirt blanc.",
      category_ids:        [catHomme, catHommeVetements, catHommeChemises],
      weight:              300,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1598300042738-22a5fef47c9e") },
        { url: img("1593032465175-481ac7f401a0") },
      ],
      options:  [
        { title: "Size",    values: CLOTHES_SIZES },
        { title: "Couleur", values: ["Blanc", "Bleu royal", "Rose nude"] },
      ],
      variants: sizeColorVariants("CHEM-OXF", ["Blanc", "Bleu royal", "Rose nude"], 5200, 5800),
    },
    {
      title:        "Blazer Kaki Homme",
      handle:       "blazer-kaki-homme",
      description:
        "Blazer en tissu structuré couleur kaki militaire, coupe slim. Doublure intérieure, " +
        "deux boutons dorés et poches à rabat. Une pièce polyvalente qui fonctionne en soirée " +
        "sur une chemise blanche ou au quotidien sur un t-shirt et un jean.",
      category_ids:        [catHomme, catHommeVetements, catHommeVestes],
      weight:              550,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1507679799987-c73779587ccf") },
        { url: img("1473966968600-fa4cebf59f6e") },
      ],
      options:  [{ title: "Size", values: CLOTHES_SIZES }],
      variants: sizeVariants("BLAZ-KAK-H", 9500, 10200),
    },
    {
      title:        "Jean Slim Indigo",
      handle:       "jean-slim-indigo",
      description:
        "Jean slim en denim indigo à coupe ajustée et tissu légèrement stretch pour le confort " +
        "du mouvement. Cinq poches traditionnelles, surpiqûres contrastantes. Le jean intemporel " +
        "qui s'adapte à toutes les morphologies et toutes les occasions.",
      category_ids:        [catHomme, catHommeVetements, catHommeJeans],
      weight:              550,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1542272604-787c3835535d") },
        { url: img("1475178626620-a4d074967452") },
      ],
      options:  [{ title: "Size", values: CLOTHES_SIZES }],
      variants: sizeVariants("JEAN-SLM-I", 5500, 5900),
    },
    {
      title:        "Pantalon Chino Beige",
      handle:       "pantalon-chino-beige",
      description:
        "Chino en coton satiné à taille mi-haute et coupe droite légèrement fuselée. " +
        "Tissu doux et résistant, parfait pour le quotidien du bureau au week-end. " +
        "Trois coloris neutres qui s'accordent à toutes les tenues.",
      category_ids:        [catHomme, catHommeVetements, catHommePantalons],
      weight:              400,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1585386959984-a4155224a1ad") },
        { url: img("1602810316693-3667c854239a") },
      ],
      options:  [
        { title: "Size",    values: CLOTHES_SIZES },
        { title: "Couleur", values: ["Beige", "Gris clair", "Marine"] },
      ],
      variants: sizeColorVariants("PANT-CHI", ["Beige", "Gris clair", "Marine"], 4800, 5200),
    },
    {
      title:        "Polo Piqué Homme",
      handle:       "polo-pique-blanc",
      description:
        "Polo en piqué de coton à col boutonné deux boutons et manches courtes. " +
        "Tissu respirant et légèrement structuré qui garde sa forme au fil du temps. " +
        "Un classique du vestiaire masculin disponible en quatre coloris indémodables.",
      category_ids:        [catHomme, catHommeVetements, catHommeTshirts],
      weight:              280,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1620799140408-edc6dcb6d633") },
        { url: img("1598033129183-c4f50c736f10") },
      ],
      options:  [
        { title: "Size",    values: CLOTHES_SIZES },
        { title: "Couleur", values: ["Blanc", "Marine", "Noir", "Vert forêt"] },
      ],
      variants: sizeColorVariants("POLO-PIQ", ["Blanc", "Marine", "Noir", "Vert forêt"], 2800, 3200),
    },
  ];

  // ── BATCH 3 — Sacs & Maroquinerie ────────────────────────────────────────

  const BATCH_SACS = [
    {
      title:        "Sac à Main Cuir Cognac",
      handle:       "sac-main-cuir-cognac",
      description:
        "Sac à main structuré en cuir véritable grain naturel. Fermeture à glissière dorée, " +
        "bandoulière amovible et réglable, double poignée en cuir. Intérieur doublure satinée " +
        "avec deux poches zippées et un soufflet central. Capacité quotidienne généreuse.",
      category_ids:        [catSacs, catSacsMain],
      weight:              650,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1548036328-c9fa89d128fa") },
        { url: img("1590874103328-eac38a683ce7") },
        { url: img("1584917865442-de89df76afd3") },
      ],
      options:  [{ title: "Couleur", values: ["Cognac", "Noir", "Camel"] }],
      variants: [
        { title: "Cognac", sku: "SAC-CUI-COGNAC", options: { Couleur: "Cognac" }, prices: p(10500, 11500) },
        { title: "Noir",   sku: "SAC-CUI-NOIR",   options: { Couleur: "Noir"   }, prices: p(10500, 11500) },
        { title: "Camel",  sku: "SAC-CUI-CAMEL",  options: { Couleur: "Camel"  }, prices: p(10500, 11500) },
      ],
    },
    {
      title:        "Cabas Toile Naturel",
      handle:       "cabas-toile-naturel",
      description:
        "Grand cabas en toile de coton naturel épais, anses en cuir véritable cousues renforcées. " +
        "Fond rigide pour maintenir la forme même plein. Parfait pour le shopping, la plage ou " +
        "le quotidien. Lavable en machine à 30°C.",
      category_ids:        [catSacs, catSacsTotes],
      weight:              400,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1553062407-98eeb64c6a62") },
        { url: img("1566150905458-1bf4ac6be7b9") },
      ],
      options:  [{ title: "Couleur", values: ["Naturel", "Noir", "Beige"] }],
      variants: [
        { title: "Naturel", sku: "CABAS-NAT", options: { Couleur: "Naturel" }, prices: p(3200, 3500) },
        { title: "Noir",    sku: "CABAS-NOI", options: { Couleur: "Noir"    }, prices: p(3200, 3500) },
        { title: "Beige",   sku: "CABAS-BEI", options: { Couleur: "Beige"   }, prices: p(3200, 3500) },
      ],
    },
    {
      title:        "Pochette Soirée Dorée",
      handle:       "pochette-soiree-doree",
      description:
        "Pochette de soirée en tissu jacquard brodé avec fermeture à clips dorés brossés. " +
        "Bandoulière chaîne amovible. Intérieur doublure satinée avec miroir de poche. " +
        "L'accessoire qui complète une tenue de soirée et fait toute la différence.",
      category_ids:        [catSacs, catSacsPochettes],
      weight:              200,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1566150905458-1bf4ac6be7b9") },
        { url: img("1548036328-c9fa89d128fa") },
      ],
      options:  [{ title: "Couleur", values: ["Or", "Argent", "Rose gold"] }],
      variants: [
        { title: "Or",        sku: "POCH-OR",  options: { Couleur: "Or"        }, prices: p(4200, 4600) },
        { title: "Argent",    sku: "POCH-ARG", options: { Couleur: "Argent"    }, prices: p(4200, 4600) },
        { title: "Rose gold", sku: "POCH-RSG", options: { Couleur: "Rose gold" }, prices: p(4200, 4600) },
      ],
    },
  ];

  // ── BATCH 4 — Chaussures ─────────────────────────────────────────────────

  const BATCH_CHAUSSURES = [
    {
      title:        "Sneakers Blanches Femme",
      handle:       "sneakers-blanches-femme",
      description:
        "Sneakers iconiques tout-blanches à semelle légèrement plateforme (+3 cm). " +
        "Tige en cuir synthétique lisse, intérieur rembourré et semelle crantée antidérapante. " +
        "La paire intemporelle à assortir à toutes les tenues, du jean à la robe.",
      category_ids:        [catChaussures, catChaussuresSneakers, catFemme, catFemmeChaussures],
      weight:              700,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1542291026-7eec264c27ff") },
        { url: img("1491553895911-0055eca6402d") },
      ],
      options:  [{ title: "Pointure", values: SHOE_SIZES }],
      variants: shoeVariants("SNK-BLC-F", 5900, 6400),
    },
    {
      title:        "Sandales Plates Cuir",
      handle:       "sandales-plates-cuir",
      description:
        "Sandales plates en cuir avec lanières croisées et boucle métal ajustable. " +
        "Semelle anatomique en liège naturel pour un confort optimal toute la journée. " +
        "Disponibles en Camel, Noir et Blanc pour s'accorder à toutes vos tenues estivales.",
      category_ids:        [catChaussures, catChaussuresSandales, catFemme, catFemmeChaussures],
      weight:              400,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1565030999-ec68dfb04e7c") },
        { url: img("1603487742131-4160ec999306") },
      ],
      options:  [
        { title: "Pointure", values: SHOE_SIZES },
        { title: "Couleur",  values: ["Camel", "Noir", "Blanc"] },
      ],
      variants: shoeColorVariants("SAND-PLT", ["Camel", "Noir", "Blanc"], 3800, 4200),
    },
    {
      title:        "Bottes Chelsea Camel",
      handle:       "bottes-chelsea-camel",
      description:
        "Bottes Chelsea en cuir synthétique texturé, élastiques latéraux en jersey pour l'enfilage " +
        "et tirette arrière. Semelle crantée légèrement surélevée (+3 cm). Le classique des bottes " +
        "qui traverse les saisons et s'harmonise avec jeans, robes et jupes.",
      category_ids:        [catChaussures, catChaussuresBottes, catFemme, catFemmeChaussures],
      weight:              850,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1542289542-2693f12ad2c1") },
        { url: img("1610398752800-146f269dfcc8") },
      ],
      options:  [
        { title: "Pointure", values: SHOE_SIZES },
        { title: "Couleur",  values: ["Camel", "Noir"] },
      ],
      variants: shoeColorVariants("BOOT-CHE", ["Camel", "Noir"], 8500, 9200),
    },
    {
      title:        "Escarpins Nude",
      handle:       "escarpins-nude",
      description:
        "Escarpins à talon aiguille 9 cm en cuir verni nude rosé. Bout pointu, contrefort " +
        "rembourré et semelle intérieure en cuir. La chaussure de soirée qui allonge la silhouette " +
        "et sublime toutes les tenues de la robe au tailleur.",
      category_ids:        [catChaussures, catChaussuresTalons, catFemme, catFemmeChaussures],
      weight:              600,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1543163521-1bf539c55dd2") },
        { url: img("1518049362265-d5b2a6467637") },
      ],
      options:  [{ title: "Pointure", values: SHOE_SIZES }],
      variants: shoeVariants("ESC-NUD", 6200, 6800),
    },
  ];

  // ── BATCH 5 — Bijoux ─────────────────────────────────────────────────────

  const BATCH_BIJOUX = [
    {
      title:        "Collier Perles Dorées",
      handle:       "collier-perles-dorees",
      description:
        "Collier de perles synthétiques nacrées enfilées sur chaîne en acier inoxydable doré. " +
        "Fermoir mousqueton sécurisé. Un bijou intemporel et doux qui apporte élégance immédiate " +
        "à une tenue simple. Disponible en trois longueurs pour différents looks.",
      category_ids:        [catBijoux, catBijouxColliers],
      weight:              80,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1599643478518-a784e5dc4c8f", 800) },
        { url: img("1515562141207-7a88fb7ce338", 800) },
      ],
      options:  [{ title: "Longueur", values: ["45 cm", "50 cm", "60 cm"] }],
      variants: optionVariants(
        "COL-PRL", "Longueur",
        ["45 cm", "50 cm", "60 cm"],
        [2200, 2500, 2800],
        [2400, 2700, 3100],
      ),
    },
    {
      title:        "Bracelet Jonc Or",
      handle:       "bracelet-jonc-or",
      description:
        "Bracelet jonc rigide en acier inoxydable plaqué or 18 carats. Ouverture légère pour " +
        "l'enfilage. Design minimaliste et moderne qui se porte seul pour un look épuré ou empilé " +
        "avec d'autres bracelets pour plus d'affirmation.",
      category_ids:        [catBijoux, catBijouxBracelets],
      weight:              60,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1573408301185-9519f94f0be3", 800) },
        { url: img("1611591437281-460bfbe1220a", 800) },
      ],
      options:  [{ title: "Finition", values: ["Or satiné", "Or brillant", "Argent"] }],
      variants: optionVariants(
        "BRAC-JON", "Finition",
        ["Or satiné", "Or brillant", "Argent"],
        [2200, 2400, 2000],
        [2400, 2600, 2200],
      ),
    },
    {
      title:        "Boucles Créoles Or",
      handle:       "boucles-creoles-or",
      description:
        "Créoles en acier inoxydable plaqué or jaune, légères et hypoallergéniques. " +
        "Fermoir click-it sécurisé. Trois tailles pour un style discret et élégant au quotidien " +
        "ou une présence affirmée pour les soirées. Ne noircissent pas et résistent à l'eau.",
      category_ids:        [catBijoux, catBijouxBoucles],
      weight:              40,
      status:              ProductStatus.PUBLISHED,
      shipping_profile_id: sp,
      sales_channels:      sc,
      images: [
        { url: img("1629189284820-3da0de20e0e4", 800) },
        { url: img("1588444837495-c6e905849aba", 800) },
      ],
      options:  [{ title: "Taille", values: ["Small 2cm", "Medium 3.5cm", "Large 5cm"] }],
      variants: optionVariants(
        "BOUCL-CR", "Taille",
        ["Small 2cm", "Medium 3.5cm", "Large 5cm"],
        [1600, 1900, 2300],
        [1800, 2100, 2500],
      ),
    },
  ];

  // ── Create products in batches ────────────────────────────────────────────

  const BATCHES = [
    { name: "Mode Femme — Vêtements", products: BATCH_FEMME_VETEMENTS },
    { name: "Mode Homme — Vêtements", products: BATCH_HOMME_VETEMENTS },
    { name: "Sacs & Maroquinerie",    products: BATCH_SACS },
    { name: "Chaussures",             products: BATCH_CHAUSSURES },
    { name: "Bijoux",                 products: BATCH_BIJOUX },
  ];

  for (const batch of BATCHES) {
    const batchProducts = batch.products.filter((prod: any) => toCreate.has(prod.handle));
    if (!batchProducts.length) {
      logger.info(`${batch.name}: all exist, skipping.`);
      continue;
    }
    logger.info(`Creating ${batchProducts.length} product(s) in "${batch.name}"...`);
    await createProductsWorkflow(container).run({
      input: { products: batchProducts as any },
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
    entity:  "inventory_level",
    fields:  ["inventory_item_id"],
    filters: { location_id: stockLocation.id },
  });
  const alreadyHasLevel = new Set(
    (existingLevels ?? []).map((l: any) => l.inventory_item_id),
  );

  const levels: CreateInventoryLevelInput[] = inventoryItems
    .filter((item: any) => !alreadyHasLevel.has(item.id))
    .map((item: any) => ({
      location_id:       stockLocation.id,
      stocked_quantity:  200,
      inventory_item_id: item.id,
    }));

  if (levels.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: { inventory_levels: levels },
    });
    logger.info(`Inventory set for ${levels.length} new items (${alreadyHasLevel.size} already had levels).`);
  } else {
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
