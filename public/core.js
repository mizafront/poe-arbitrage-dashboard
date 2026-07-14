"use strict";

export const OIL_CHAIN = Object.freeze([
  "Clear Oil", "Sepia Oil", "Amber Oil", "Verdant Oil", "Teal Oil", "Azure Oil",
  "Indigo Oil", "Violet Oil", "Crimson Oil", "Black Oil", "Opalescent Oil",
  "Silver Oil", "Golden Oil"
]);

export const ESSENCE_TIERS = Object.freeze([
  "Whispering", "Muttering", "Weeping", "Wailing", "Screaming", "Shrieking", "Deafening"
]);

function finiteNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.NaN;
}

function normalizeIcon(icon) {
  if (typeof icon !== "string" || !icon) return "";
  if (icon.startsWith("//")) return `https:${icon}`;
  return icon;
}

function normalizedName(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function optionalNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function optionalBoolean(value) {
  if (value === true || value === false) return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return undefined;
}

function variantParts(item = {}) {
  const gemLevel = optionalNumber(item.gemLevel);
  const gemQuality = optionalNumber(item.gemQuality);
  const links = optionalNumber(item.links);
  const corrupted = optionalBoolean(item.corrupted);
  return [
    normalizedName(item.name),
    Number.isFinite(gemLevel) ? `level:${gemLevel}` : "",
    Number.isFinite(gemQuality) ? `quality:${gemQuality}` : "",
    corrupted === undefined ? "" : `corrupted:${corrupted}`,
    Number.isFinite(links) ? `links:${links}` : "",
    item.variant ? `variant:${normalizedName(item.variant)}` : ""
  ].filter(Boolean);
}

export function marketVariantKey(item = {}) {
  return variantParts(item).join("|");
}

function hasVariantMetadata(item = {}) {
  return variantParts(item).length > 1;
}

function metadataMap(payload) {
  const candidates = [payload?.core?.items, payload?.currencyDetails, payload?.items, payload?.details];
  const result = new Map();
  for (const items of candidates) {
    if (Array.isArray(items)) {
      for (const item of items) {
        const id = item?.id ?? item?.detailsId ?? item?.name;
        if (id !== undefined) result.set(String(id), item);
      }
    } else if (items && typeof items === "object") {
      for (const [key, item] of Object.entries(items)) {
        if (item && typeof item === "object") result.set(String(item.id ?? item.detailsId ?? key), item);
      }
    }
  }
  return result;
}

function primaryName(payload, metadata) {
  const primary = payload?.core?.primary;
  if (primary && typeof primary === "object") return primary.name ?? primary.id ?? "Chaos Orb";
  if (primary !== undefined && primary !== null) {
    const fromMeta = metadata.get(String(primary));
    if (fromMeta?.name) return fromMeta.name;
    const text = String(primary);
    if (/chaos/i.test(text)) return "Chaos Orb";
    return text;
  }
  return "Chaos Orb";
}

function extractSparkline(line) {
  const raw = line?.sparkline?.data ?? line?.sparkline ?? line?.lowConfidenceSparkline?.data ?? [];
  if (!Array.isArray(raw)) return [];
  return raw.map(Number).filter(Number.isFinite);
}

export function normalizeExchange(payload) {
  const metadata = metadataMap(payload);
  const lines = Array.isArray(payload?.lines)
    ? payload.lines
    : Array.isArray(payload?.items)
      ? payload.items
      : [];

  const items = lines.map((line) => {
    const id = line?.id ?? line?.detailsId ?? line?.name ?? line?.currencyTypeName;
    const meta = metadata.get(String(id)) ?? {};
    const name = meta.name ?? meta.type ?? line?.name ?? line?.currencyTypeName ?? line?.baseType ?? String(id ?? "");
    const price = finiteNumber(
      line?.primaryValue, line?.chaosValue, line?.chaosEquivalent,
      line?.receive?.value, line?.pay?.value
    );
    const volume = finiteNumber(
      line?.volumePrimaryValue, line?.listingCount, line?.count,
      line?.tradeInfo?.volume, 0
    );

    return {
      id: id ?? name,
      name,
      icon: normalizeIcon(meta.icon ?? line?.icon ?? ""),
      price,
      ninjaPrice: price,
      volume,
      ninjaVolume: volume,
      sparkline: extractSparkline(line),
      gemLevel: optionalNumber(line?.gemLevel ?? meta?.gemLevel),
      gemQuality: optionalNumber(line?.gemQuality ?? meta?.gemQuality),
      corrupted: optionalBoolean(line?.corrupted ?? meta?.corrupted),
      links: optionalNumber(line?.links ?? meta?.links),
      variant: String(line?.variant ?? meta?.variant ?? ""),
      baseType: String(line?.baseType ?? meta?.baseType ?? ""),
      itemClass: String(line?.itemClass ?? meta?.itemClass ?? ""),
      source: "poe.ninja"
    };
  }).filter((item) => item.name && Number.isFinite(item.price) && item.price > 0);

  return { items, primaryName: primaryName(payload, metadata) };
}

function flattenCandidateArrays(payload) {
  const result = [];
  const seen = new Set();
  const visit = (value, depth = 0) => {
    if (depth > 4 || value === null || value === undefined) return;
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry && typeof entry === "object") result.push(entry);
      }
      return;
    }
    if (typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    const looksLikeItem = Boolean(
      value.name ?? value.item?.name ?? value.details?.name ?? value.baseType
    ) && [
      value.mean, value.price, value.chaosValue, value.chaos, value.chaosEquivalent,
      value.current?.mean, value.current?.price, value.data?.mean, value.data?.price
    ].some((candidate) => Number.isFinite(Number(candidate)));
    if (looksLikeItem) result.push(value);
    const preferred = ["items", "data", "lines", "entries", "results", "prices", "compact"];
    for (const key of preferred) {
      if (value[key] !== undefined) visit(value[key], depth + 1);
    }
    if (depth < 2) {
      for (const child of Object.values(value)) {
        if (child && typeof child === "object") visit(child, depth + 1);
      }
    }
  };
  visit(payload);
  return result;
}

function historyValues(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((point) => {
    if (Number.isFinite(Number(point))) return Number(point);
    return finiteNumber(point?.mean, point?.price, point?.value, point?.chaos, point?.y);
  }).filter(Number.isFinite).slice(-7);
}

/**
 * Flexible parser for poe.watch compact/get responses. The upstream API has
 * changed shape over time, so this accepts both flat arrays and nested data.
 */
export function normalizePoeWatch(payload) {
  const rawItems = flattenCandidateArrays(payload);
  const byKey = new Map();

  for (const raw of rawItems) {
    const id = raw?.id ?? raw?.itemId ?? raw?.item?.id ?? raw?.details?.id;
    const name = raw?.name ?? raw?.item?.name ?? raw?.details?.name ?? raw?.type ?? raw?.baseType;
    if (!name) continue;
    const price = finiteNumber(
      raw?.mean, raw?.price, raw?.chaosValue, raw?.chaos, raw?.chaosEquivalent,
      raw?.current?.mean, raw?.current?.price, raw?.data?.mean, raw?.data?.price
    );
    if (!Number.isFinite(price) || price <= 0) continue;

    const volume = finiteNumber(
      raw?.volume, raw?.dailyVolume, raw?.tradeVolume, raw?.count,
      raw?.accepted, raw?.acceptedOffers, raw?.current?.volume, 0
    );
    const change24h = finiteNumber(
      raw?.change, raw?.change24h, raw?.dailyChange, raw?.changePercentage,
      raw?.delta, raw?.current?.change, raw?.current?.change24h
    );
    const history = historyValues(
      raw?.history7d ?? raw?.sevenDayHistory ?? raw?.history ?? raw?.sparkline ?? raw?.dailyHistory
    );
    const category = raw?.category ?? raw?.group ?? raw?.item?.category ?? raw?.details?.category ?? "";
    const key = normalizedName(name);
    const existing = byKey.get(key);
    const candidate = {
      id: id ?? name,
      name: String(name),
      category: String(category ?? ""),
      icon: normalizeIcon(raw?.icon ?? raw?.item?.icon ?? raw?.details?.icon ?? ""),
      price,
      watchPrice: price,
      volume: Number.isFinite(volume) ? volume : 0,
      watchVolume: Number.isFinite(volume) ? volume : 0,
      change24h: Number.isFinite(change24h) ? change24h : Number.NaN,
      history7d: history,
      gemLevel: optionalNumber(raw?.gemLevel ?? raw?.level ?? raw?.item?.gemLevel),
      gemQuality: optionalNumber(raw?.gemQuality ?? raw?.quality ?? raw?.item?.gemQuality),
      corrupted: optionalBoolean(raw?.corrupted ?? raw?.item?.corrupted),
      links: optionalNumber(raw?.links ?? raw?.item?.links),
      variant: String(raw?.variant ?? raw?.item?.variant ?? ""),
      baseType: String(raw?.baseType ?? raw?.item?.baseType ?? ""),
      itemClass: String(raw?.itemClass ?? raw?.item?.itemClass ?? ""),
      source: "poe.watch"
    };

    if (!existing || candidate.history7d.length > existing.history7d.length || candidate.volume > existing.volume) {
      byKey.set(key, candidate);
    }
  }

  return [...byKey.values()];
}

export function priceDiscrepancyPercent(a, b) {
  const left = Number(a);
  const right = Number(b);
  if (!Number.isFinite(left) || !Number.isFinite(right) || left <= 0 || right <= 0) return Number.NaN;
  return Math.abs(left - right) / ((left + right) / 2) * 100;
}

export function mergeMarketSources(ninjaItems, watchItems) {
  const watchByVariant = new Map();
  const watchByName = new Map();
  for (const item of watchItems) {
    const variantKey = marketVariantKey(item);
    if (variantKey) watchByVariant.set(variantKey, item);
    const nameKey = normalizedName(item.name);
    if (!watchByName.has(nameKey)) watchByName.set(nameKey, []);
    watchByName.get(nameKey).push(item);
  }

  return ninjaItems.map((item) => {
    const exact = watchByVariant.get(marketVariantKey(item));
    const sameName = watchByName.get(normalizedName(item.name)) ?? [];
    // For gems and other explicit variants, a name-only match can compare the
    // wrong level/quality/corruption. Only use it when both sides are generic.
    const fallback = !hasVariantMetadata(item)
      ? sameName.find((candidate) => !hasVariantMetadata(candidate)) ?? sameName[0]
      : undefined;
    const watch = exact ?? fallback;
    const ninjaPrice = finiteNumber(item.ninjaPrice, item.price);
    const watchPrice = finiteNumber(watch?.watchPrice, watch?.price);
    return {
      ...item,
      ninjaPrice,
      watchPrice,
      watchVolume: Number.isFinite(Number(watch?.watchVolume ?? watch?.volume)) ? Number(watch?.watchVolume ?? watch?.volume) : 0,
      change24h: Number.isFinite(Number(watch?.change24h)) ? Number(watch.change24h) : Number.NaN,
      history7d: Array.isArray(watch?.history7d) ? watch.history7d : [],
      discrepancy: priceDiscrepancyPercent(ninjaPrice, watchPrice),
      sources: Number.isFinite(watchPrice) && watchPrice > 0 ? 2 : 1
    };
  });
}

export function buildOilPairs(items) {
  const byName = new Map(items.map((item) => [item.name, item]));
  const pairs = [];
  for (let index = 0; index < OIL_CHAIN.length - 1; index += 1) {
    const input = byName.get(OIL_CHAIN[index]);
    const output = byName.get(OIL_CHAIN[index + 1]);
    if (input && output) pairs.push({ category: "oil", input, output, ratio: 3 });
  }
  return pairs;
}

export function buildEssencePairs(items) {
  const escaped = ESSENCE_TIERS.map((tier) => tier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`^(${escaped.join("|")}) Essence of (.+)$`);
  const groups = new Map();
  for (const item of items) {
    const match = item.name.match(pattern);
    if (!match) continue;
    const [, tier, family] = match;
    if (!groups.has(family)) groups.set(family, new Map());
    groups.get(family).set(tier, item);
  }
  const pairs = [];
  for (const tierMap of groups.values()) {
    for (let index = 0; index < ESSENCE_TIERS.length - 1; index += 1) {
      const input = tierMap.get(ESSENCE_TIERS[index]);
      const output = tierMap.get(ESSENCE_TIERS[index + 1]);
      if (input && output) pairs.push({ category: "essence", input, output, ratio: 3 });
    }
  }
  return pairs;
}

function marketIndex(items = []) {
  const result = new Map();
  for (const item of items) {
    const key = normalizedName(item?.name);
    if (!key) continue;
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(item);
  }
  for (const candidates of result.values()) {
    candidates.sort((a, b) => Number(b?.volume ?? 0) - Number(a?.volume ?? 0) || Number(a?.price ?? Infinity) - Number(b?.price ?? Infinity));
  }
  return result;
}

function constraintMatches(item, constraints = {}) {
  const checks = [
    ["gemLevel", optionalNumber],
    ["gemQuality", optionalNumber],
    ["links", optionalNumber]
  ];
  for (const [key, parser] of checks) {
    if (constraints[key] === undefined) continue;
    const actual = parser(item?.[key]);
    const expected = parser(constraints[key]);
    if (!Number.isFinite(actual) || actual !== expected) return false;
  }
  if (constraints.corrupted !== undefined) {
    if (optionalBoolean(item?.corrupted) !== Boolean(constraints.corrupted)) return false;
  }
  if (constraints.variant !== undefined && normalizedName(item?.variant) !== normalizedName(constraints.variant)) return false;
  if (constraints.baseType !== undefined && normalizedName(item?.baseType) !== normalizedName(constraints.baseType)) return false;
  return true;
}

function selectMarketCandidate(index, name, constraints) {
  const candidates = index.get(normalizedName(name)) ?? [];
  return candidates.find((item) => constraintMatches(item, constraints));
}

export function buildFixedRewardCardPairs(cardItems, marketsByCategory, catalog) {
  const cardsByName = marketIndex(cardItems);
  const outputMaps = new Map(
    Object.entries(marketsByCategory ?? {}).map(([category, items]) => [category, marketIndex(items)])
  );
  const pairs = [];

  for (const entry of catalog ?? []) {
    const outputCategory = entry.rewardMarketCategory ?? entry.outputCategory ?? "currency";
    const input = selectMarketCandidate(cardsByName, entry.name, entry.cardConstraints);
    const output = selectMarketCandidate(outputMaps.get(outputCategory) ?? new Map(), entry.rewardName, entry.rewardConstraints);
    const stackSize = Number(entry.stackSize);
    const rewardQuantity = Number(entry.rewardQuantity ?? 1);
    if (!input || !output || !Number.isFinite(stackSize) || stackSize <= 0) continue;
    if (!Number.isFinite(rewardQuantity) || rewardQuantity <= 0) continue;

    pairs.push({
      category: "card",
      cardCategory: entry.cardCategory ?? "currency",
      inputCategory: "card",
      outputCategory,
      input,
      output,
      ratio: stackSize,
      outputQuantity: rewardQuantity,
      rewardDescription: entry.rewardDescription ?? "",
      rewardConstraints: entry.rewardConstraints ?? {},
      catalogConfidence: entry.catalogConfidence ?? "high"
    });
  }
  return pairs;
}

export function buildFixedCurrencyCardPairs(cardItems, currencyItems, catalog) {
  const normalizedCatalog = (catalog ?? []).map((entry) => ({
    ...entry,
    cardCategory: entry.cardCategory ?? "currency",
    rewardMarketCategory: entry.rewardMarketCategory ?? "currency"
  }));
  return buildFixedRewardCardPairs(cardItems, { currency: currencyItems }, normalizedCatalog);
}

function rolePrice(item, role, useSecondSource) {
  const ninja = finiteNumber(item?.ninjaPrice, item?.price);
  const watch = finiteNumber(item?.watchPrice);
  if (!useSecondSource || !Number.isFinite(watch) || watch <= 0) return ninja;
  return role === "input" ? Math.max(ninja, watch) : Math.min(ninja, watch);
}

export function calculateOpportunity(pair, settings = {}) {
  const ratio = Number.isFinite(pair.ratio) ? pair.ratio : 3;
  const buyPremium = Math.max(0, Number(settings.buyPremium ?? 0)) / 100;
  const sellDiscount = Math.min(100, Math.max(0, Number(settings.sellDiscount ?? 0))) / 100;
  const budget = Math.max(0, Number(settings.budget ?? 0));
  const useSecondSource = settings.useSecondSource !== false;

  const inputUnitPrice = rolePrice(pair.input, "input", useSecondSource);
  const outputUnitPrice = rolePrice(pair.output, "output", useSecondSource);
  const outputQuantity = Number.isFinite(pair.outputQuantity) ? pair.outputQuantity : 1;
  const theoreticalCost = inputUnitPrice * ratio;
  const theoreticalSale = outputUnitPrice * outputQuantity;
  const cost = theoreticalCost * (1 + buyPremium);
  const sale = theoreticalSale * (1 - sellDiscount);
  const profit = sale - cost;
  const roi = cost > 0 ? (profit / cost) * 100 : 0;
  const maxOperations = cost > 0 && budget > 0 ? Math.floor(budget / cost) : 0;
  const discrepancies = [pair.input?.discrepancy, pair.output?.discrepancy].filter(Number.isFinite);
  const maxDiscrepancy = discrepancies.length ? Math.max(...discrepancies) : Number.NaN;
  const bothSources = pair.input?.sources === 2 && pair.output?.sources === 2;

  return {
    ...pair,
    inputUnitPrice,
    outputUnitPrice,
    theoreticalCost,
    theoreticalSale,
    theoreticalProfit: theoreticalSale - theoreticalCost,
    cost,
    sale,
    profit,
    roi,
    maxOperations,
    budgetProfit: maxOperations * profit,
    maxDiscrepancy,
    bothSources,
    minWatchVolume: bothSources
      ? Math.max(0, Math.min(Number(pair.input.watchVolume || 0), Number(pair.output.watchVolume || 0)))
      : 0
  };
}

export function recipeKey(pair) {
  return `${pair.category}|${pair.cardCategory ?? ""}|${pair.input.name}|${pair.output.name}`;
}
