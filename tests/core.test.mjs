import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEssencePairs,
  buildFixedCurrencyCardPairs,
  buildFixedRewardCardPairs,
  buildOilPairs,
  calculateOpportunity,
  mergeMarketSources,
  mergeCurrencyExchangeStats,
  normalizeCurrencyExchange,
  normalizeExchange,
  normalizePoeWatch,
  priceDiscrepancyPercent,
  marketVariantKey
} from "../public/core.js";
import {
  FIXED_CARD_REWARD_CATALOG,
  FIXED_CURRENCY_CARD_CATALOG,
  FIXED_MAP_FRAGMENT_CARD_CATALOG,
  FIXED_SCARAB_CARD_CATALOG,
  FIXED_GEM_CARD_CATALOG,
  FIXED_UNIQUE_CARD_CATALOG
} from "../public/cards.js";

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


test("builds exact map/fragment card rewards from multiple market categories", () => {
  const cards = [
    { name: "Checkmate", price: 0.3, volume: 100 },
    { name: "The Professor", price: 3, volume: 40 }
  ];
  const markets = {
    fragment: [{ name: "Simulacrum Splinter", price: 0.1, volume: 5000 }],
    "unique-map": [{ name: "The Putrid Cloister", price: 20, volume: 200 }]
  };
  const catalog = [
    {
      name: "Checkmate", stackSize: 8, rewardName: "Simulacrum Splinter",
      rewardQuantity: 76, rewardMarketCategory: "fragment", cardCategory: "map-fragment"
    },
    {
      name: "The Professor", stackSize: 4, rewardName: "The Putrid Cloister",
      rewardQuantity: 1, rewardMarketCategory: "unique-map", cardCategory: "map-fragment"
    }
  ];
  const pairs = buildFixedRewardCardPairs(cards, markets, catalog);
  assert.equal(pairs.length, 2);
  assert.equal(pairs[0].cardCategory, "map-fragment");
  assert.equal(pairs[0].outputCategory, "fragment");
  assert.equal(pairs[0].outputQuantity, 76);
  assert.equal(pairs[1].outputCategory, "unique-map");
});

test("builds exact scarab card rewards and excludes missing generic rewards", () => {
  const cards = [
    { name: "Buried Treasure", price: 0.2, volume: 100 },
    { name: "Cameria's Cut", price: 0.1, volume: 100 }
  ];
  const catalog = [
    {
      name: "Buried Treasure", stackSize: 3, rewardName: "Sulphite Scarab",
      rewardQuantity: 1, rewardMarketCategory: "scarab", cardCategory: "scarab"
    },
    {
      name: "Cameria's Cut", stackSize: 2, rewardName: "Scarab",
      rewardQuantity: 1, rewardMarketCategory: "scarab", cardCategory: "scarab"
    }
  ];
  const pairs = buildFixedRewardCardPairs(cards, {
    scarab: [{ name: "Sulphite Scarab", price: 1.4, volume: 1000 }]
  }, catalog);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].input.name, "Buried Treasure");
});

test("normalizes exact skill gem metadata", () => {
  const payload = {
    lines: [{
      name: "Empower Support", chaosValue: 300, listingCount: 50,
      gemLevel: 4, gemQuality: 0, corrupted: true
    }]
  };
  const [gem] = normalizeExchange(payload).items;
  assert.equal(gem.gemLevel, 4);
  assert.equal(gem.gemQuality, 0);
  assert.equal(gem.corrupted, true);
  assert.match(marketVariantKey(gem), /level:4/);
});

test("builds only the exact gem reward variant", () => {
  const cards = [{ name: "The Dragon's Heart", price: 20, volume: 30 }];
  const gems = [
    { name: "Empower Support", price: 5, volume: 1000, gemLevel: 1, gemQuality: 0, corrupted: false },
    { name: "Empower Support", price: 300, volume: 50, gemLevel: 4, gemQuality: 0, corrupted: true }
  ];
  const catalog = [{
    name: "The Dragon's Heart", stackSize: 11, rewardName: "Empower Support",
    rewardMarketCategory: "skill-gem", cardCategory: "gem",
    rewardConstraints: { gemLevel: 4, gemQuality: 0, corrupted: true }
  }];
  const pairs = buildFixedRewardCardPairs(cards, { "skill-gem": gems }, catalog);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].output.price, 300);
  assert.equal(pairs[0].output.gemLevel, 4);
});

test("does not merge a different gem variant from poe.watch", () => {
  const ninja = [{
    name: "Enlighten Support", price: 350, ninjaPrice: 350,
    gemLevel: 4, gemQuality: 0, corrupted: true
  }];
  const watch = [{
    name: "Enlighten Support", price: 60, watchPrice: 60,
    gemLevel: 3, gemQuality: 0, corrupted: false
  }];
  const [merged] = mergeMarketSources(ninja, watch);
  assert.equal(merged.sources, 1);
  assert.ok(Number.isNaN(merged.watchPrice));
});

test("builds exact normal unique reward and rejects linked variant", () => {
  const cards = [{ name: "The Beast", price: 3, volume: 100 }];
  const armours = [
    { name: "Belly of the Beast", price: 10, volume: 80, corrupted: false, links: 0 },
    { name: "Belly of the Beast", price: 90, volume: 20, corrupted: false, links: 6 }
  ];
  const catalog = [{
    name: "The Beast", stackSize: 6, rewardName: "Belly of the Beast",
    rewardMarketCategory: "unique-armour", cardCategory: "unique",
    rewardConstraints: { corrupted: false, links: 0 }, catalogConfidence: "medium"
  }];
  const pairs = buildFixedRewardCardPairs(cards, { "unique-armour": armours }, catalog);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].output.links, 0);
  assert.equal(pairs[0].catalogConfidence, "medium");
});

test("gem and unique catalogs contain only deterministic supported entries", () => {
  assert.equal(FIXED_GEM_CARD_CATALOG.length, 11);
  assert.equal(FIXED_UNIQUE_CARD_CATALOG.length, 21);
  for (const entry of FIXED_GEM_CARD_CATALOG) {
    assert.equal(entry.rewardMarketCategory, "skill-gem");
    assert.ok(Number.isFinite(entry.rewardConstraints.gemLevel));
    assert.ok(Number.isFinite(entry.rewardConstraints.gemQuality));
    assert.equal(typeof entry.rewardConstraints.corrupted, "boolean");
  }
  for (const entry of FIXED_UNIQUE_CARD_CATALOG) {
    assert.match(entry.rewardMarketCategory, /^unique-/);
    assert.equal(entry.rewardConstraints.corrupted, false);
    assert.equal(entry.catalogConfidence, "medium");
  }
});

test("combined card catalog contains only supported deterministic categories", () => {
  assert.equal(FIXED_MAP_FRAGMENT_CARD_CATALOG.length, 8);
  assert.equal(FIXED_SCARAB_CARD_CATALOG.length, 4);
  assert.equal(
    FIXED_CARD_REWARD_CATALOG.length,
    FIXED_CURRENCY_CARD_CATALOG.length + FIXED_MAP_FRAGMENT_CARD_CATALOG.length +
      FIXED_SCARAB_CARD_CATALOG.length + FIXED_GEM_CARD_CATALOG.length + FIXED_UNIQUE_CARD_CATALOG.length
  );
  const names = new Set();
  const supportedCardCategories = ["currency", "map-fragment", "scarab", "gem", "unique"];
  const supportedMarkets = [
    "currency", "fragment", "unique-map", "scarab", "skill-gem",
    "unique-accessory", "unique-weapon", "unique-armour", "unique-flask", "unique-jewel"
  ];
  for (const entry of FIXED_CARD_REWARD_CATALOG) {
    assert.ok(supportedCardCategories.includes(entry.cardCategory));
    assert.ok(supportedMarkets.includes(entry.rewardMarketCategory));
    assert.equal(names.has(entry.name), false);
    names.add(entry.name);
  }
});


test("normalizes official Currency Exchange hourly markets", () => {
  const result = normalizeCurrencyExchange({
    configured: true,
    available: true,
    league: "Standard",
    hour: 123456,
    next_change_id: 127056,
    markets: [{
      league: "Standard",
      market_id: "chaos|clear",
      volume_traded: { chaos: 4000, clear: 1000 },
      lowest_stock: { chaos: 100, clear: 20 },
      highest_stock: { chaos: 10000, clear: 400 },
      lowest_ratio: { chaos: 3, clear: 10 },
      highest_ratio: { chaos: 4, clear: 10 }
    }]
  });
  assert.equal(result.available, true);
  assert.equal(result.markets.length, 1);
  assert.deepEqual(result.markets[0].codes, ["chaos", "clear"]);
  assert.equal(result.markets[0].volumeTraded.clear, 1000);
});

test("attaches official chaos price range and hourly volume to items", () => {
  const exchange = normalizeCurrencyExchange({
    configured: true,
    available: true,
    league: "Standard",
    hour: 123456,
    markets: [{
      league: "Standard",
      market_id: "chaos|clear",
      volume_traded: { chaos: 350, clear: 1000 },
      lowest_stock: { chaos: 100, clear: 20 },
      highest_stock: { chaos: 10000, clear: 400 },
      lowest_ratio: { chaos: 3, clear: 10 },
      highest_ratio: { chaos: 4, clear: 10 }
    }]
  });
  const [item] = mergeCurrencyExchangeStats([{ id: "clear", marketCode: "clear", name: "Clear Oil", price: 0.35 }], exchange);
  assert.equal(item.cx.available, true);
  assert.equal(item.cx.lowPrice, 0.3);
  assert.equal(item.cx.highPrice, 0.4);
  assert.equal(item.cx.volume, 1000);
});

test("calculates historical Currency Exchange profit range", () => {
  const pair = {
    category: "oil",
    ratio: 3,
    input: {
      name: "Clear Oil", price: 1,
      cx: { available: true, lowPrice: 0.9, highPrice: 1.1, midpoint: 1, volume: 5000, hour: 123 }
    },
    output: {
      name: "Sepia Oil", price: 4,
      cx: { available: true, lowPrice: 3.8, highPrice: 4.2, midpoint: 4, volume: 3000, hour: 123 }
    }
  };
  const result = calculateOpportunity(pair, { useSecondSource: false });
  assert.equal(result.cxBoth, true);
  assert.ok(Math.abs(result.cxProfitLow - 0.5) < 1e-9);
  assert.ok(Math.abs(result.cxProfitHigh - 1.5) < 1e-9);
  assert.equal(result.minCxVolume, 3000);
});
