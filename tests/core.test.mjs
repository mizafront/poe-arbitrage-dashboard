import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEssencePairs,
  buildFixedCurrencyCardPairs,
  buildOilPairs,
  calculateOpportunity,
  mergeMarketSources,
  normalizeExchange,
  normalizePoeWatch,
  priceDiscrepancyPercent
} from "../public/core.js";
import { FIXED_CURRENCY_CARD_CATALOG } from "../public/cards.js";

test("normalizes current exchange payload", () => {
  const payload = {
    core: {
      primary: "chaos",
      items: {
        clear: { id: "clear", name: "Clear Oil", icon: "//example.test/clear.png" },
        sepia: { id: "sepia", name: "Sepia Oil", icon: "https://example.test/sepia.png" }
      }
    },
    lines: [
      { id: "clear", primaryValue: 1, volumePrimaryValue: 100 },
      { id: "sepia", primaryValue: 4, volumePrimaryValue: 80 }
    ]
  };
  const normalized = normalizeExchange(payload);
  assert.equal(normalized.primaryName, "Chaos Orb");
  assert.equal(normalized.items.length, 2);
  assert.equal(normalized.items[0].name, "Clear Oil");
  assert.equal(normalized.items[0].icon, "https://example.test/clear.png");
});

test("normalizes legacy itemoverview payload", () => {
  const payload = {
    lines: [
      { name: "Clear Oil", chaosValue: 1.2, listingCount: 55 },
      { name: "Sepia Oil", chaosValue: 4.5, listingCount: 31 }
    ]
  };
  const normalized = normalizeExchange(payload);
  assert.equal(normalized.items[1].price, 4.5);
  assert.equal(normalized.items[1].volume, 31);
});

test("builds oil pair and calculates conservative profit", () => {
  const items = [
    { name: "Clear Oil", price: 1, volume: 100, icon: "" },
    { name: "Sepia Oil", price: 5, volume: 80, icon: "" }
  ];
  const pairs = buildOilPairs(items);
  assert.equal(pairs.length, 1);
  const result = calculateOpportunity(pairs[0], {
    buyPremium: 5,
    sellDiscount: 10,
    budget: 100
  });
  assert.ok(Math.abs(result.cost - 3.15) < 1e-9);
  assert.ok(Math.abs(result.sale - 4.5) < 1e-9);
  assert.ok(result.profit > 1.34 && result.profit < 1.36);
  assert.equal(result.maxOperations, 31);
});

test("groups essence families by tier", () => {
  const items = [
    { name: "Screaming Essence of Greed", price: 3, volume: 100, icon: "" },
    { name: "Shrieking Essence of Greed", price: 12, volume: 80, icon: "" },
    { name: "Deafening Essence of Greed", price: 45, volume: 60, icon: "" },
    { name: "Screaming Essence of Wrath", price: 4, volume: 100, icon: "" },
    { name: "Shrieking Essence of Wrath", price: 13, volume: 80, icon: "" }
  ];
  const pairs = buildEssencePairs(items);
  assert.equal(pairs.length, 3);
  assert.equal(pairs[0].category, "essence");
});


test("builds fixed currency card pair with stack and reward quantities", () => {
  const cards = [
    { name: "The Fortunate", price: 18, volume: 120, icon: "" }
  ];
  const currencies = [
    { name: "Divine Orb", price: 150, volume: 3000, icon: "" }
  ];
  const catalog = [
    { name: "The Fortunate", stackSize: 12, rewardName: "Divine Orb", rewardQuantity: 2 }
  ];
  const pairs = buildFixedCurrencyCardPairs(cards, currencies, catalog);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].inputCategory, "card");
  assert.equal(pairs[0].outputCategory, "currency");
  assert.equal(pairs[0].ratio, 12);
  assert.equal(pairs[0].outputQuantity, 2);

  const result = calculateOpportunity(pairs[0], {
    buyPremium: 5,
    sellDiscount: 10,
    budget: 500
  });
  assert.ok(Math.abs(result.cost - 226.8) < 1e-9);
  assert.ok(Math.abs(result.sale - 270) < 1e-9);
  assert.ok(Math.abs(result.profit - 43.2) < 1e-9);
  assert.equal(result.maxOperations, 2);
});

test("skips cards or rewards missing from market data", () => {
  const pairs = buildFixedCurrencyCardPairs(
    [{ name: "Rain of Chaos", price: 0.2, volume: 10, icon: "" }],
    [],
    [{ name: "Rain of Chaos", stackSize: 8, rewardName: "Chaos Orb", rewardQuantity: 1 }]
  );
  assert.equal(pairs.length, 0);
});


test("fixed currency card catalog is deterministic and unique", () => {
  assert.equal(FIXED_CURRENCY_CARD_CATALOG.length, 43);
  const names = new Set();
  for (const entry of FIXED_CURRENCY_CARD_CATALOG) {
    assert.ok(entry.name);
    assert.ok(entry.rewardName);
    assert.ok(Number.isInteger(entry.stackSize) && entry.stackSize > 0);
    assert.ok(Number.isInteger(entry.rewardQuantity) && entry.rewardQuantity > 0);
    assert.equal(names.has(entry.name), false);
    names.add(entry.name);
  }
});


test("normalizes poe.watch price, volume, 24h change and 7-day history", () => {
  const payload = {
    items: [
      {
        id: 17,
        name: "Crimson Oil",
        mean: 14.5,
        volume: 420,
        change24h: 6.2,
        history7d: [11, 12, 12.5, 13, 13.2, 14, 14.5]
      }
    ]
  };
  const items = normalizePoeWatch(payload);
  assert.equal(items.length, 1);
  assert.equal(items[0].name, "Crimson Oil");
  assert.equal(items[0].price, 14.5);
  assert.equal(items[0].watchVolume, 420);
  assert.equal(items[0].change24h, 6.2);
  assert.equal(items[0].history7d.length, 7);
});

test("merges poe.ninja and poe.watch by normalized item name", () => {
  const ninja = [{ name: "Brother's Gift", price: 100, ninjaPrice: 100, volume: 10 }];
  const watch = [{ name: "Brother’s Gift", price: 110, watchPrice: 110, watchVolume: 25, change24h: 4, history7d: [90, 110] }];
  const [merged] = mergeMarketSources(ninja, watch);
  assert.equal(merged.sources, 2);
  assert.equal(merged.watchPrice, 110);
  assert.ok(merged.discrepancy > 9 && merged.discrepancy < 10);
});

test("uses expensive source for purchase and cheaper source for sale", () => {
  const pair = {
    category: "oil",
    ratio: 3,
    input: { name: "A", price: 4, ninjaPrice: 4, watchPrice: 5, sources: 2, discrepancy: 22, watchVolume: 100 },
    output: { name: "B", price: 18, ninjaPrice: 18, watchPrice: 16, sources: 2, discrepancy: 12, watchVolume: 80 }
  };
  const result = calculateOpportunity(pair, { useSecondSource: true, buyPremium: 0, sellDiscount: 0, budget: 100 });
  assert.equal(result.inputUnitPrice, 5);
  assert.equal(result.outputUnitPrice, 16);
  assert.equal(result.profit, 1);
  assert.equal(result.minWatchVolume, 80);
});

test("can disable conservative second-source pricing", () => {
  const pair = {
    category: "oil",
    ratio: 3,
    input: { name: "A", price: 4, ninjaPrice: 4, watchPrice: 5, sources: 2 },
    output: { name: "B", price: 18, ninjaPrice: 18, watchPrice: 16, sources: 2 }
  };
  const result = calculateOpportunity(pair, { useSecondSource: false });
  assert.equal(result.inputUnitPrice, 4);
  assert.equal(result.outputUnitPrice, 18);
  assert.equal(result.profit, 6);
});

test("calculates symmetric source discrepancy", () => {
  const value = priceDiscrepancyPercent(90, 110);
  assert.equal(value, 20);
  assert.ok(Number.isNaN(priceDiscrepancyPercent(0, 10)));
});

test("normalizes poe.watch object-map payload", () => {
  const payload = {
    items: {
      "42": { id: 42, name: "Golden Oil", mean: 99, volume: 12, change: -3 }
    }
  };
  const items = normalizePoeWatch(payload);
  assert.equal(items.length, 1);
  assert.equal(items[0].name, "Golden Oil");
  assert.equal(items[0].price, 99);
});
