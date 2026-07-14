"use strict";

export const OIL_CHAIN = Object.freeze([
  "Clear Oil",
  "Sepia Oil",
  "Amber Oil",
  "Verdant Oil",
  "Teal Oil",
  "Azure Oil",
  "Indigo Oil",
  "Violet Oil",
  "Crimson Oil",
  "Black Oil",
  "Opalescent Oil",
  "Silver Oil",
  "Golden Oil"
]);

export const ESSENCE_TIERS = Object.freeze([
  "Whispering",
  "Muttering",
  "Weeping",
  "Wailing",
  "Screaming",
  "Shrieking",
  "Deafening"
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

function metadataMap(payload) {
  const candidates = [
    payload?.core?.items,
    payload?.currencyDetails,
    payload?.items,
    payload?.details
  ];
  const result = new Map();

  for (const items of candidates) {
    if (Array.isArray(items)) {
      for (const item of items) {
        const id = item?.id ?? item?.detailsId ?? item?.name;
        if (id !== undefined) result.set(String(id), item);
      }
    } else if (items && typeof items === "object") {
      for (const [key, item] of Object.entries(items)) {
        if (item && typeof item === "object") {
          result.set(String(item.id ?? item.detailsId ?? key), item);
        }
      }
    }
  }
  return result;
}

function primaryName(payload, metadata) {
  const primary = payload?.core?.primary;
  if (primary && typeof primary === "object") {
    return primary.name ?? primary.id ?? "Chaos Orb";
  }
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

/**
 * Normalizes both the current poe.ninja exchange response and the legacy
 * itemoverview/currencyoverview response into a small stable shape.
 */
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
      line?.primaryValue,
      line?.chaosValue,
      line?.chaosEquivalent,
      line?.receive?.value,
      line?.pay?.value
    );
    const volume = finiteNumber(
      line?.volumePrimaryValue,
      line?.listingCount,
      line?.count,
      line?.tradeInfo?.volume,
      0
    );

    return {
      id: id ?? name,
      name,
      icon: normalizeIcon(meta.icon ?? line?.icon ?? ""),
      price,
      volume,
      sparkline: extractSparkline(line)
    };
  }).filter((item) => item.name && Number.isFinite(item.price) && item.price > 0);

  return {
    items,
    primaryName: primaryName(payload, metadata)
  };
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

export function buildFixedCurrencyCardPairs(cardItems, currencyItems, catalog) {
  const cardsByName = new Map(cardItems.map((item) => [item.name, item]));
  const currencyByName = new Map(currencyItems.map((item) => [item.name, item]));
  const pairs = [];

  for (const entry of catalog) {
    const input = cardsByName.get(entry.name);
    const output = currencyByName.get(entry.rewardName);
    const stackSize = Number(entry.stackSize);
    const rewardQuantity = Number(entry.rewardQuantity);
    if (!input || !output || !Number.isFinite(stackSize) || stackSize <= 0) continue;
    if (!Number.isFinite(rewardQuantity) || rewardQuantity <= 0) continue;

    pairs.push({
      category: "card",
      inputCategory: "card",
      outputCategory: "currency",
      input,
      output,
      ratio: stackSize,
      outputQuantity: rewardQuantity
    });
  }

  return pairs;
}

export function calculateOpportunity(pair, settings = {}) {
  const ratio = Number.isFinite(pair.ratio) ? pair.ratio : 3;
  const buyPremium = Math.max(0, Number(settings.buyPremium ?? 0)) / 100;
  const sellDiscount = Math.min(100, Math.max(0, Number(settings.sellDiscount ?? 0))) / 100;
  const budget = Math.max(0, Number(settings.budget ?? 0));

  const theoreticalCost = pair.input.price * ratio;
  const outputQuantity = Number.isFinite(pair.outputQuantity) ? pair.outputQuantity : 1;
  const theoreticalSale = pair.output.price * outputQuantity;
  const cost = theoreticalCost * (1 + buyPremium);
  const sale = theoreticalSale * (1 - sellDiscount);
  const profit = sale - cost;
  const roi = cost > 0 ? (profit / cost) * 100 : 0;
  const maxOperations = cost > 0 && budget > 0 ? Math.floor(budget / cost) : 0;

  return {
    ...pair,
    theoreticalCost,
    theoreticalSale,
    theoreticalProfit: theoreticalSale - theoreticalCost,
    cost,
    sale,
    profit,
    roi,
    maxOperations,
    budgetProfit: maxOperations * profit
  };
}

export function recipeKey(pair) {
  return `${pair.category}|${pair.input.name}|${pair.output.name}`;
}
