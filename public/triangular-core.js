"use strict";

import { ESSENCE_TIERS, OIL_CHAIN } from "./core.js";

export const HARD_MAX_HOURLY_VOLUME_PERCENT = 25;

export const VENDOR_CURRENCY_CONVERSIONS = Object.freeze([
  { inputName: "Scroll of Wisdom", outputName: "Portal Scroll", inputQuantity: 3, outputQuantity: 1, location: "Act 1+" },
  { inputName: "Portal Scroll", outputName: "Orb of Transmutation", inputQuantity: 7, outputQuantity: 1, location: "Act 1+" },
  { inputName: "Orb of Transmutation", outputName: "Orb of Augmentation", inputQuantity: 4, outputQuantity: 1, location: "Act 1+" },
  { inputName: "Orb of Augmentation", outputName: "Orb of Alteration", inputQuantity: 4, outputQuantity: 1, location: "Act 1+" },
  { inputName: "Orb of Alteration", outputName: "Jeweller's Orb", inputQuantity: 2, outputQuantity: 1, location: "Act 2+" },
  { inputName: "Jeweller's Orb", outputName: "Chromatic Orb", inputQuantity: 3, outputQuantity: 1, location: "Act 2+" },
  { inputName: "Jeweller's Orb", outputName: "Orb of Fusing", inputQuantity: 4, outputQuantity: 1, location: "Act 2+" },
  { inputName: "Orb of Fusing", outputName: "Orb of Chance", inputQuantity: 1, outputQuantity: 1, location: "Act 3+" },
  { inputName: "Orb of Chance", outputName: "Orb of Scouring", inputQuantity: 4, outputQuantity: 1, location: "Act 2+" },
  { inputName: "Orb of Scouring", outputName: "Orb of Regret", inputQuantity: 2, outputQuantity: 1, location: "Act 2+" },
  { inputName: "Orb of Regret", outputName: "Orb of Alchemy", inputQuantity: 1, outputQuantity: 1, location: "Act 3+" },
  { inputName: "Blacksmith's Whetstone", outputName: "Armourer's Scrap", inputQuantity: 1, outputQuantity: 1, location: "Act 1+" },
  { inputName: "Armourer's Scrap", outputName: "Blacksmith's Whetstone", inputQuantity: 3, outputQuantity: 1, location: "Act 2+" },
]);

export const CURRENCY_SHARD_ASSEMBLIES = Object.freeze([
  {
    inputNames: ["Transmutation Shard"],
    outputNames: ["Orb of Transmutation"],
    inputQuantity: 20,
  },
  {
    inputNames: ["Alteration Shard"],
    outputNames: ["Orb of Alteration"],
    inputQuantity: 20,
  },
  {
    inputNames: ["Alchemy Shard"],
    outputNames: ["Orb of Alchemy"],
    inputQuantity: 20,
  },
  {
    inputNames: ["Fracturing Shard"],
    outputNames: ["Fracturing Orb"],
    inputQuantity: 20,
  },
  {
    inputNames: ["Mirror Shard"],
    outputNames: ["Mirror of Kalandra"],
    inputQuantity: 20,
  },

  // Legacy shards are retained for Standard and other permanent economies.
  // No edge is created unless both items are present in the selected league.
  {
    inputNames: ["Ancient Shard"],
    outputNames: ["Ancient Orb"],
    inputQuantity: 20,
    legacy: true,
  },
  {
    inputNames: ["Annulment Shard"],
    outputNames: ["Orb of Annulment"],
    inputQuantity: 20,
    legacy: true,
  },
  {
    inputNames: ["Binding Shard"],
    outputNames: ["Orb of Binding"],
    inputQuantity: 20,
    legacy: true,
  },
  {
    inputNames: ["Chaos Shard"],
    outputNames: ["Chaos Orb"],
    inputQuantity: 20,
    legacy: true,
  },
  {
    inputNames: ["Engineer's Shard"],
    outputNames: ["Engineer's Orb"],
    inputQuantity: 20,
    legacy: true,
  },
  {
    inputNames: ["Exalted Shard"],
    outputNames: ["Exalted Orb"],
    inputQuantity: 20,
    legacy: true,
  },
  {
    inputNames: ["Harbinger's Shard"],
    outputNames: ["Harbinger's Orb"],
    inputQuantity: 20,
    legacy: true,
  },
  {
    inputNames: ["Horizon Shard"],
    outputNames: ["Orb of Horizons"],
    inputQuantity: 20,
    legacy: true,
  },
  {
    inputNames: ["Regal Shard"],
    outputNames: ["Regal Orb"],
    inputQuantity: 20,
    legacy: true,
  },
]);

export const SPLINTER_ASSEMBLIES = Object.freeze([
  {
    inputNames: ["Timeless Eternal Empire Splinter"],
    outputNames: ["Timeless Eternal Emblem"],
    inputQuantity: 100,
  },
  {
    inputNames: ["Timeless Karui Splinter"],
    outputNames: ["Timeless Karui Emblem"],
    inputQuantity: 100,
  },
  {
    inputNames: ["Timeless Maraketh Splinter"],
    outputNames: ["Timeless Maraketh Emblem"],
    inputQuantity: 100,
  },
  {
    inputNames: ["Timeless Templar Splinter"],
    outputNames: ["Timeless Templar Emblem"],
    inputQuantity: 100,
  },
  {
    inputNames: ["Timeless Vaal Splinter"],
    outputNames: ["Timeless Vaal Emblem"],
    inputQuantity: 100,
  },
  {
    inputNames: ["Simulacrum Splinter"],
    outputNames: ["Simulacrum"],
    inputQuantity: 300,
  },
  {
    inputNames: ["Crescent Splinter"],
    outputNames: ["The Maven's Writ", "Maven's Writ"],
    inputQuantity: 10,
  },
  {
    inputNames: ["Ritual Splinter"],
    outputNames: ["Ritual Vessel"],
    inputQuantity: 100,
  },
]);

export const STACK_ASSEMBLIES = Object.freeze([
  {
    inputNames: ["Scroll Fragment"],
    outputNames: ["Scroll of Wisdom"],
    inputQuantity: 5,
  },
]);

const ROUTE_TYPE_LABELS = Object.freeze({
  vendor: "обмен торговца",
  shard: "сборка осколков",
  splinter: "сборка сплинтеров",
  stack: "сборка стака",
  oil: "улучшение масла",
  essence: "улучшение эссенции",
  card: "комплект карт",
});

function normalizedName(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function finitePositive(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return Number.NaN;
}

function finiteNonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function integerPositive(value, fallback = 1) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function itemCategoryKey(category, item) {
  return `${String(category ?? "unknown")}|${normalizedName(item?.name)}|${String(item?.id ?? "")}`;
}

function createNode(category, item) {
  return {
    key: itemCategoryKey(category, item),
    category,
    item,
    name: String(item?.name ?? ""),
    icon: String(item?.icon ?? ""),
  };
}

function marketIndex(items = []) {
  const index = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const key = normalizedName(item?.name);
    if (!key) continue;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(item);
  }

  for (const candidates of index.values()) {
    candidates.sort(
      (left, right) =>
        Number(right?.volume ?? 0) - Number(left?.volume ?? 0) ||
        Number(left?.price ?? Number.POSITIVE_INFINITY) -
          Number(right?.price ?? Number.POSITIVE_INFINITY),
    );
  }

  return index;
}

function firstMarketItem(index, name) {
  return index.get(normalizedName(name))?.[0] ?? null;
}

function buildMarketCatalog(itemsByCategory = {}) {
  const catalog = new Map();

  for (const [category, items] of Object.entries(itemsByCategory)) {
    for (const item of Array.isArray(items) ? items : []) {
      const key = normalizedName(item?.name);
      if (!key) continue;
      if (!catalog.has(key)) catalog.set(key, []);
      catalog.get(key).push({
        category,
        item,
      });
    }
  }

  for (const candidates of catalog.values()) {
    candidates.sort(
      (left, right) =>
        Number(right.item?.volume ?? 0) -
          Number(left.item?.volume ?? 0) ||
        Number(left.item?.price ?? Number.POSITIVE_INFINITY) -
          Number(right.item?.price ?? Number.POSITIVE_INFINITY),
    );
  }

  return catalog;
}

function firstCatalogEntry(
  catalog,
  names,
  preferredCategories = [],
) {
  const aliases = Array.isArray(names) ? names : [names];
  const preferences = new Map(
    preferredCategories.map((category, index) => [category, index]),
  );

  for (const name of aliases) {
    const candidates = catalog.get(normalizedName(name)) ?? [];
    if (!candidates.length) continue;

    return [...candidates].sort((left, right) => {
      const leftPreference = preferences.has(left.category)
        ? preferences.get(left.category)
        : Number.POSITIVE_INFINITY;
      const rightPreference = preferences.has(right.category)
        ? preferences.get(right.category)
        : Number.POSITIVE_INFINITY;

      return (
        leftPreference - rightPreference ||
        Number(right.item?.volume ?? 0) -
          Number(left.item?.volume ?? 0)
      );
    })[0];
  }

  return null;
}

function addCatalogAssemblies({
  edges,
  counts,
  catalog,
  recipes,
  type,
  inputCategories,
  outputCategories,
  detailText,
}) {
  for (const recipe of recipes) {
    const input = firstCatalogEntry(
      catalog,
      recipe.inputNames,
      inputCategories,
    );
    const output = firstCatalogEntry(
      catalog,
      recipe.outputNames,
      outputCategories,
    );

    if (!input || !output) continue;

    const inputQuantity = integerPositive(recipe.inputQuantity);
    const outputQuantity = integerPositive(
      recipe.outputQuantity,
      1,
    );

    edges.push(
      conversionEdge({
        type,
        fromCategory: input.category,
        toCategory: output.category,
        fromItem: input.item,
        toItem: output.item,
        inputQuantity,
        outputQuantity,
        label:
          `${inputQuantity} ${input.item.name} → ` +
          `${outputQuantity} ${output.item.name}`,
        details: recipe.legacy
          ? `${detailText}. Устаревший тип: используется только при наличии рынка в выбранной лиге`
          : detailText,
      }),
    );

    counts[type] += 1;
  }
}

function conversionEdge({
  type,
  fromCategory,
  toCategory,
  fromItem,
  toItem,
  inputQuantity,
  outputQuantity,
  label,
  details = "",
}) {
  return {
    id: `${type}|${itemCategoryKey(fromCategory, fromItem)}>${itemCategoryKey(toCategory, toItem)}|${inputQuantity}:${outputQuantity}`,
    type,
    from: createNode(fromCategory, fromItem),
    to: createNode(toCategory, toItem),
    inputQuantity: integerPositive(inputQuantity),
    outputQuantity: integerPositive(outputQuantity),
    label,
    details,
  };
}

export function routeTypeLabel(type) {
  return ROUTE_TYPE_LABELS[type] ?? String(type ?? "преобразование");
}

export function buildGuaranteedConversionEdges(
  itemsByCategory = {},
  cardPairs = [],
) {
  const edges = [];
  const counts = {
    vendor: 0,
    shard: 0,
    splinter: 0,
    stack: 0,
    oil: 0,
    essence: 0,
    card: 0,
  };
  const catalog = buildMarketCatalog(itemsByCategory);
  const currencyIndex = marketIndex(itemsByCategory.currency);
  const oilIndex = marketIndex(itemsByCategory.oil);
  const essenceIndex = marketIndex(itemsByCategory.essence);

  for (const recipe of VENDOR_CURRENCY_CONVERSIONS) {
    const input = firstMarketItem(currencyIndex, recipe.inputName);
    const output = firstMarketItem(currencyIndex, recipe.outputName);
    if (!input || !output) continue;

    edges.push(
      conversionEdge({
        type: "vendor",
        fromCategory: "currency",
        toCategory: "currency",
        fromItem: input,
        toItem: output,
        inputQuantity: recipe.inputQuantity,
        outputQuantity: recipe.outputQuantity,
        label: `${recipe.inputQuantity} ${recipe.inputName} → ${recipe.outputQuantity} ${recipe.outputName}`,
        details: `Покупка у торговца, доступно с ${recipe.location}`,
      }),
    );
    counts.vendor += 1;
  }

  addCatalogAssemblies({
    edges,
    counts,
    catalog,
    recipes: CURRENCY_SHARD_ASSEMBLIES,
    type: "shard",
    inputCategories: ["currency", "fragment"],
    outputCategories: ["currency", "fragment"],
    detailText: "Автоматическая сборка полного стака валютных осколков",
  });

  addCatalogAssemblies({
    edges,
    counts,
    catalog,
    recipes: SPLINTER_ASSEMBLIES,
    type: "splinter",
    inputCategories: ["fragment", "currency"],
    outputCategories: ["fragment", "currency"],
    detailText: "Автоматическая сборка полного стака сплинтеров",
  });

  addCatalogAssemblies({
    edges,
    counts,
    catalog,
    recipes: STACK_ASSEMBLIES,
    type: "stack",
    inputCategories: ["currency", "fragment"],
    outputCategories: ["currency", "fragment"],
    detailText: "Автоматическая сборка полного стака",
  });

  for (let index = 0; index < OIL_CHAIN.length - 1; index += 1) {
    const input = firstMarketItem(oilIndex, OIL_CHAIN[index]);
    const output = firstMarketItem(oilIndex, OIL_CHAIN[index + 1]);
    if (!input || !output) continue;

    edges.push(
      conversionEdge({
        type: "oil",
        fromCategory: "oil",
        toCategory: "oil",
        fromItem: input,
        toItem: output,
        inputQuantity: 3,
        outputQuantity: 1,
        label: `3 ${input.name} → 1 ${output.name}`,
        details: "Гарантированное улучшение масел 3:1",
      }),
    );
    counts.oil += 1;
  }

  const escapedTiers = ESSENCE_TIERS.map((tier) =>
    tier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const essencePattern = new RegExp(
    `^(${escapedTiers.join("|")}) Essence of (.+)$`,
  );
  const essenceFamilies = new Map();

  for (const item of Array.isArray(itemsByCategory.essence)
    ? itemsByCategory.essence
    : []) {
    const match = String(item?.name ?? "").match(essencePattern);
    if (!match) continue;
    const [, tier, family] = match;
    if (!essenceFamilies.has(family)) essenceFamilies.set(family, new Map());
    essenceFamilies.get(family).set(tier, item);
  }

  for (const tierMap of essenceFamilies.values()) {
    for (let index = 0; index < ESSENCE_TIERS.length - 1; index += 1) {
      const input = tierMap.get(ESSENCE_TIERS[index]);
      const output = tierMap.get(ESSENCE_TIERS[index + 1]);
      if (!input || !output) continue;

      edges.push(
        conversionEdge({
          type: "essence",
          fromCategory: "essence",
          toCategory: "essence",
          fromItem: input,
          toItem: output,
          inputQuantity: 3,
          outputQuantity: 1,
          label: `3 ${input.name} → 1 ${output.name}`,
          details: "Гарантированное улучшение эссенций 3:1",
        }),
      );
      counts.essence += 1;
    }
  }

  for (const pair of Array.isArray(cardPairs) ? cardPairs : []) {
    const inputQuantity = integerPositive(pair?.ratio, 0);
    const outputQuantity = integerPositive(pair?.outputQuantity, 0);
    if (!pair?.input || !pair?.output || !inputQuantity || !outputQuantity) {
      continue;
    }

    edges.push(
      conversionEdge({
        type: "card",
        fromCategory: pair.inputCategory ?? "card",
        toCategory: pair.outputCategory ?? "currency",
        fromItem: pair.input,
        toItem: pair.output,
        inputQuantity,
        outputQuantity,
        label: `${inputQuantity} ${pair.input.name} → ${outputQuantity} ${pair.output.name}`,
        details: pair.rewardDescription
          ? `Сдача полного комплекта: ${pair.rewardDescription}`
          : "Сдача полного комплекта гадальных карт",
      }),
    );
    counts.card += 1;
  }

  return {
    edges,
    counts,
    total: edges.length,
  };
}

function routeBatchQuantities(edges) {
  if (!edges.length) return null;
  const cacheKey = edges.map((edge) => edge.id).join(">");
  if (routeBatchQuantities.cache.has(cacheKey)) {
    return routeBatchQuantities.cache.get(cacheKey);
  }

  const maximumInput = Math.min(
    1_000_000,
    Math.max(
      1,
      edges.reduce(
        (product, edge) =>
          product * Math.max(1, integerPositive(edge.inputQuantity)),
        1,
      ),
    ),
  );

  for (let startQuantity = 1; startQuantity <= maximumInput; startQuantity += 1) {
    let current = startQuantity;
    const amounts = [current];
    let valid = true;

    for (const edge of edges) {
      if (current % edge.inputQuantity !== 0) {
        valid = false;
        break;
      }
      current = (current / edge.inputQuantity) * edge.outputQuantity;
      if (!Number.isSafeInteger(current) || current <= 0) {
        valid = false;
        break;
      }
      amounts.push(current);
    }

    if (valid) {
      const result = {
        inputQuantity: startQuantity,
        outputQuantity: current,
        amounts,
      };
      routeBatchQuantities.cache.set(cacheKey, result);
      return result;
    }
  }

  routeBatchQuantities.cache.set(cacheKey, null);
  return null;
}
routeBatchQuantities.cache = new Map();

function rolePrice(item, role, useSecondSource) {
  const ninja = finitePositive(item?.ninjaPrice, item?.price);
  const watch = finitePositive(item?.watchPrice);
  if (!Number.isFinite(ninja)) return Number.NaN;
  if (!useSecondSource || !Number.isFinite(watch)) return ninja;
  return role === "input" ? Math.max(ninja, watch) : Math.min(ninja, watch);
}

function maxFinite(values) {
  const finite = values.filter(Number.isFinite);
  return finite.length ? Math.max(...finite) : Number.NaN;
}

function minFinite(values) {
  const finite = values.filter(Number.isFinite);
  return finite.length ? Math.min(...finite) : Number.NaN;
}

function confidenceScore({
  bothSources,
  maxDiscrepancy,
  cxBoth,
  maxCxUtilization,
  minWatchVolume,
  fixedSteps,
}) {
  let score = 35;
  score += bothSources ? 25 : 0;
  if (Number.isFinite(maxDiscrepancy)) {
    if (maxDiscrepancy <= 5) score += 15;
    else if (maxDiscrepancy <= 10) score += 10;
    else if (maxDiscrepancy <= 20) score += 4;
    else score -= 8;
  }
  score += cxBoth ? 10 : 0;
  if (Number.isFinite(maxCxUtilization)) {
    if (maxCxUtilization <= 5) score += 10;
    else if (maxCxUtilization <= 15) score += 5;
  }
  if (Number.isFinite(minWatchVolume) && minWatchVolume >= 100) score += 5;
  if (fixedSteps >= 3) score -= 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function evaluatePath(path, options) {
  const budget = finiteNonNegative(options.budget, 0);
  const buyPremium = Math.max(0, finiteNonNegative(options.buyPremium, 0)) / 100;
  const sellDiscount = Math.min(
    100,
    Math.max(0, finiteNonNegative(options.sellDiscount, 0)),
  ) / 100;
  const useSecondSource = options.useSecondSource !== false;
  const requireConfirmed = Boolean(options.requireConfirmed);
  const requireGggLiquidity = Boolean(options.requireGggLiquidity);
  const maxDiscrepancyLimit = finiteNonNegative(options.maxDiscrepancy, 0);
  const requestedCxUtilization = finiteNonNegative(options.maxCxUtilization, 0);
  const effectiveCxUtilization = requestedCxUtilization > 0
    ? Math.min(requestedCxUtilization, HARD_MAX_HOURLY_VOLUME_PERCENT)
    : HARD_MAX_HOURLY_VOLUME_PERCENT;

  const first = path[0];
  const last = path.at(-1);
  const inputItem = first.from.item;
  const outputItem = last.to.item;
  const inputUnitPrice = rolePrice(inputItem, "input", useSecondSource);
  const outputUnitPrice = rolePrice(outputItem, "output", useSecondSource);

  if (!Number.isFinite(inputUnitPrice) || !Number.isFinite(outputUnitPrice)) {
    return { accepted: false, reason: "missingPrice" };
  }

  const bothSources =
    Number(inputItem?.sources) === 2 && Number(outputItem?.sources) === 2;
  if (requireConfirmed && !bothSources) {
    return { accepted: false, reason: "unconfirmed" };
  }

  const maxDiscrepancy = maxFinite([
    Number(inputItem?.discrepancy),
    Number(outputItem?.discrepancy),
  ]);
  if (
    maxDiscrepancyLimit > 0 &&
    Number.isFinite(maxDiscrepancy) &&
    maxDiscrepancy > maxDiscrepancyLimit
  ) {
    return { accepted: false, reason: "discrepancy" };
  }

  const batch = routeBatchQuantities(path);
  if (!batch) return { accepted: false, reason: "integerBatch" };

  const costPerBatch =
    batch.inputQuantity * inputUnitPrice * (1 + buyPremium);
  const salePerBatch =
    batch.outputQuantity * outputUnitPrice * (1 - sellDiscount);

  if (!(costPerBatch > 0) || !(salePerBatch >= 0)) {
    return { accepted: false, reason: "missingPrice" };
  }

  const operations = budget > 0 ? Math.floor(budget / costPerBatch) : 0;
  if (operations < 1) {
    return {
      accepted: false,
      reason: "budget",
      candidate: {
        requiredBudget: costPerBatch,
        path,
        batch,
      },
    };
  }

  const totalCost = operations * costPerBatch;
  const totalSale = operations * salePerBatch;
  const leftoverChaos = Math.max(0, budget - totalCost);
  const finalChaos = leftoverChaos + totalSale;
  const profit = totalSale - totalCost;
  const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  const inputQuantity = batch.inputQuantity * operations;
  const outputQuantity = batch.outputQuantity * operations;
  const inputCx = inputItem?.cx?.available ? inputItem.cx : null;
  const outputCx = outputItem?.cx?.available ? outputItem.cx : null;
  const cxBoth = Boolean(inputCx && outputCx);

  if (requireGggLiquidity && !cxBoth) {
    return { accepted: false, reason: "missingLiquidity" };
  }

  const inputUtilization = inputCx?.volume > 0
    ? (inputQuantity / inputCx.volume) * 100
    : Number.NaN;
  const outputUtilization = outputCx?.volume > 0
    ? (outputQuantity / outputCx.volume) * 100
    : Number.NaN;
  const maxCxUtilization = maxFinite([inputUtilization, outputUtilization]);

  if (
    Number.isFinite(maxCxUtilization) &&
    maxCxUtilization > effectiveCxUtilization
  ) {
    return { accepted: false, reason: "liquidity" };
  }

  const minWatchVolume = minFinite([
    Number(inputItem?.watchVolume),
    Number(outputItem?.watchVolume),
  ]);
  const fixedSteps = path.length;
  const types = [...new Set(path.map((edge) => edge.type))];
  const routeKey = path.map((edge) => edge.id).join(">");
  const amounts = batch.amounts.map((amount) => amount * operations);
  const confidence = confidenceScore({
    bothSources,
    maxDiscrepancy,
    cxBoth,
    maxCxUtilization,
    minWatchVolume,
    fixedSteps,
  });

  const route = {
    key: routeKey,
    path,
    types,
    fixedSteps,
    totalSteps: fixedSteps + 2,
    inputItem,
    outputItem,
    inputUnitPrice,
    outputUnitPrice,
    batchInputQuantity: batch.inputQuantity,
    batchOutputQuantity: batch.outputQuantity,
    batchAmounts: batch.amounts,
    operations,
    amounts,
    inputQuantity,
    outputQuantity,
    costPerBatch,
    salePerBatch,
    totalCost,
    totalSale,
    leftoverChaos,
    finalChaos,
    profit,
    roi,
    bothSources,
    maxDiscrepancy,
    inputCx,
    outputCx,
    cxBoth,
    inputUtilization,
    outputUtilization,
    maxCxUtilization,
    effectiveCxUtilization,
    minWatchVolume,
    confidence,
  };

  const minProfit = finiteNonNegative(options.minProfit, 0);
  const minRoi = finiteNonNegative(options.minRoi, 0);

  if (profit <= 0) {
    return {
      accepted: false,
      reason: "noProfit",
      candidate: {
        ...route,
        gapToBreakEven: Math.max(0, -profit),
      },
    };
  }
  if (profit < minProfit) {
    return {
      accepted: false,
      reason: "minProfit",
      candidate: {
        ...route,
        gapToMinProfit: minProfit - profit,
      },
    };
  }
  if (roi < minRoi) {
    return {
      accepted: false,
      reason: "minRoi",
      candidate: {
        ...route,
        gapToMinRoi: minRoi - roi,
      },
    };
  }

  return { accepted: true, route };
}

function shouldSuppressSingleStep(path) {
  return (
    path.length === 1 &&
    ["oil", "essence", "card"].includes(path[0].type)
  );
}

function enumeratePaths(edges, options, diagnostics) {
  const enabledTypes = new Set(
    Array.isArray(options.enabledTypes)
      ? options.enabledTypes
      : [
          "vendor",
          "shard",
          "splinter",
          "stack",
          "oil",
          "essence",
          "card",
        ],
  );
  const maximumTotalSteps = Math.max(
    3,
    Math.min(5, integerPositive(options.maxTotalSteps, 5)),
  );
  const maximumFixedSteps = maximumTotalSteps - 2;
  const outgoing = new Map();

  for (const edge of edges) {
    if (!enabledTypes.has(edge.type)) continue;
    if (!outgoing.has(edge.from.key)) outgoing.set(edge.from.key, []);
    outgoing.get(edge.from.key).push(edge);
  }

  const results = [];
  const seenRoutes = new Set();

  const visit = (path, visitedNodes) => {
    if (!path.length) return;
    const key = path.map((edge) => edge.id).join(">");

    if (!seenRoutes.has(key)) {
      seenRoutes.add(key);
      diagnostics.generatedRoutes += 1;
      if (shouldSuppressSingleStep(path)) {
        diagnostics.rejected.duplicateSingleStep += 1;
        diagnostics.rejectedTotal += 1;
      } else {
        results.push(path);
      }
    }

    if (path.length >= maximumFixedSteps) return;
    const lastNode = path.at(-1).to;

    for (const nextEdge of outgoing.get(lastNode.key) ?? []) {
      if (visitedNodes.has(nextEdge.to.key)) continue;
      const nextVisited = new Set(visitedNodes);
      nextVisited.add(nextEdge.to.key);
      visit([...path, nextEdge], nextVisited);
    }
  };

  for (const edge of edges) {
    if (!enabledTypes.has(edge.type)) continue;
    visit([edge], new Set([edge.from.key, edge.to.key]));
  }

  return results;
}

function emptyDiagnostics() {
  return {
    fixedEdges: 0,
    generatedRoutes: 0,
    evaluatedRoutes: 0,
    accepted: 0,
    rejectedTotal: 0,
    rejected: {
      duplicateSingleStep: 0,
      missingPrice: 0,
      integerBatch: 0,
      budget: 0,
      unconfirmed: 0,
      discrepancy: 0,
      missingLiquidity: 0,
      liquidity: 0,
      noProfit: 0,
      minProfit: 0,
      minRoi: 0,
    },
  };
}

function sortRoutes(routes) {
  return routes.sort(
    (left, right) =>
      right.profit - left.profit ||
      right.roi - left.roi ||
      right.confidence - left.confidence,
  );
}

function sortNearest(routes) {
  return routes
    .sort(
      (left, right) =>
        right.profit - left.profit ||
        right.roi - left.roi ||
        right.confidence - left.confidence,
    )
    .slice(0, 5);
}

export function analyzeGuaranteedChains(
  itemsByCategory = {},
  cardPairs = [],
  options = {},
) {
  const diagnostics = emptyDiagnostics();
  const conversionGraph = buildGuaranteedConversionEdges(
    itemsByCategory,
    cardPairs,
  );
  diagnostics.fixedEdges = conversionGraph.total;
  const paths = enumeratePaths(conversionGraph.edges, options, diagnostics);
  const routes = [];
  const nearest = [];

  for (const path of paths) {
    diagnostics.evaluatedRoutes += 1;
    const result = evaluatePath(path, options);

    if (result.accepted) {
      routes.push(result.route);
      diagnostics.accepted += 1;
      continue;
    }

    if (diagnostics.rejected[result.reason] === undefined) {
      diagnostics.rejected[result.reason] = 0;
    }
    diagnostics.rejected[result.reason] += 1;
    diagnostics.rejectedTotal += 1;

    if (
      result.candidate &&
      ["noProfit", "minProfit", "minRoi"].includes(result.reason)
    ) {
      nearest.push({
        ...result.candidate,
        rejectionReason: result.reason,
      });
    }
  }

  return {
    routes: sortRoutes(routes),
    nearest: sortNearest(nearest),
    diagnostics,
    conversionCounts: conversionGraph.counts,
  };
}
