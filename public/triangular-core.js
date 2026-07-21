const CURRENCIES = [
  {
    key: "chaos-orb",
    name: "Chaos Orb",
    short: "Chaos",
    category: "currency",
    metadata: "Metadata/Items/Currency/CurrencyRerollRare",
    aliases: ["chaos", "chaos-orb"],
  },
  {
    key: "divine-orb",
    name: "Divine Orb",
    short: "Divine",
    category: "currency",
    metadata: "Metadata/Items/Currency/CurrencyModValues",
    aliases: ["divine", "divine-orb"],
  },
  {
    key: "exalted-orb",
    name: "Exalted Orb",
    short: "Exalted",
    category: "currency",
    metadata: "Metadata/Items/Currency/CurrencyAddModToRare",
    aliases: ["exalted", "exalted-orb"],
  },
  {
    key: "orb-of-annulment",
    name: "Orb of Annulment",
    short: "Annul",
    category: "currency",
    metadata: "Metadata/Items/Currency/CurrencyRemoveMod",
    aliases: ["annulment", "orb-of-annulment"],
  },
  {
    key: "orb-of-fusing",
    name: "Orb of Fusing",
    short: "Fusing",
    category: "currency",
    metadata: "Metadata/Items/Currency/CurrencyRerollSocketLinks",
    aliases: ["fusing", "orb-of-fusing"],
  },
  {
    key: "orb-of-alteration",
    name: "Orb of Alteration",
    short: "Alteration",
    category: "currency",
    metadata: "Metadata/Items/Currency/CurrencyRerollMagic",
    aliases: ["alteration", "orb-of-alteration"],
  },
  {
    key: "orb-of-alchemy",
    name: "Orb of Alchemy",
    short: "Alchemy",
    category: "currency",
    metadata: "Metadata/Items/Currency/CurrencyUpgradeToRare",
    aliases: ["alchemy", "orb-of-alchemy"],
  },
  {
    key: "orb-of-scouring",
    name: "Orb of Scouring",
    short: "Scouring",
    category: "currency",
    metadata: "Metadata/Items/Currency/CurrencyConvertToNormal",
    aliases: ["scouring", "orb-of-scouring"],
  },
  {
    key: "orb-of-regret",
    name: "Orb of Regret",
    short: "Regret",
    category: "currency",
    metadata: "Metadata/Items/Currency/CurrencyPassiveSkillRefund",
    aliases: ["regret", "orb-of-regret"],
  },
  {
    key: "vaal-orb",
    name: "Vaal Orb",
    short: "Vaal",
    category: "currency",
    metadata: "Metadata/Items/Currency/CurrencyVaal",
    aliases: ["vaal", "vaal-orb"],
  },
  {
    key: "chromatic-orb",
    name: "Chromatic Orb",
    short: "Chromatic",
    category: "currency",
    metadata: "Metadata/Items/Currency/CurrencyRerollSocketColours",
    aliases: ["chromatic", "chromatic-orb"],
  },
  {
    key: "jewellers-orb",
    name: "Jeweller's Orb",
    short: "Jeweller",
    category: "currency",
    metadata: "Metadata/Items/Currency/CurrencyRerollSocketNumbers",
    aliases: ["jeweller", "jewellers-orb", "jeweller's-orb"],
  },
  {
    key: "orb-of-chance",
    name: "Orb of Chance",
    short: "Chance",
    category: "currency",
    metadata: "Metadata/Items/Currency/CurrencyUpgradeRandomly",
    aliases: ["chance", "orb-of-chance"],
  },
  {
    key: "regal-orb",
    name: "Regal Orb",
    short: "Regal",
    category: "currency",
    metadata: "Metadata/Items/Currency/CurrencyUpgradeMagicToRare",
    aliases: ["regal", "regal-orb"],
  },
  {
    key: "blessed-orb",
    name: "Blessed Orb",
    short: "Blessed",
    category: "currency",
    metadata: "Metadata/Items/Currency/CurrencyImplicitMod",
    aliases: ["blessed", "blessed-orb"],
  },
  {
    key: "gemcutters-prism",
    name: "Gemcutter's Prism",
    short: "GCP",
    category: "currency",
    metadata: "Metadata/Items/Currency/CurrencyGemQuality",
    aliases: ["gcp", "gemcutters-prism", "gemcutter's-prism"],
  },
  {
    key: "glassblowers-bauble",
    name: "Glassblower's Bauble",
    short: "Bauble",
    category: "currency",
    metadata: "Metadata/Items/Currency/CurrencyFlaskQuality",
    aliases: ["glassblowers-bauble", "glassblower's-bauble"],
  },
  {
    key: "cartographers-chisel",
    name: "Cartographer's Chisel",
    short: "Chisel",
    category: "currency",
    metadata: "Metadata/Items/Currency/CurrencyMapQuality",
    aliases: ["chisel", "cartographers-chisel", "cartographer's-chisel"],
  },
  {
    key: "orb-of-transmutation",
    name: "Orb of Transmutation",
    short: "Transmutation",
    category: "currency",
    metadata: "Metadata/Items/Currency/CurrencyUpgradeToMagic",
    aliases: ["transmutation", "orb-of-transmutation"],
  },
  {
    key: "orb-of-augmentation",
    name: "Orb of Augmentation",
    short: "Augmentation",
    category: "currency",
    metadata: "Metadata/Items/Currency/CurrencyAddModToMagic",
    aliases: ["augmentation", "orb-of-augmentation"],
  },
];


const ESSENCE_TIERS = [
  ["1", "Whispering"],
  ["2", "Muttering"],
  ["3", "Weeping"],
  ["4", "Wailing"],
  ["5", "Screaming"],
  ["6", "Shrieking"],
  ["7", "Deafening"],
];

const ESSENCE_FAMILIES = [
  ["Greed", "Greed"],
  ["Contempt", "Contempt"],
  ["Hatred", "Hatred"],
  ["Woe", "Woe"],
  ["Fear", "Fear"],
  ["Anger", "Anger"],
  ["Torment", "Torment"],
  ["Sorrow", "Sorrow"],
  ["Rage", "Rage"],
  ["Suffering", "Suffering"],
  ["Wrath", "Wrath"],
  ["Doubt", "Doubt"],
  ["Loathing", "Loathing"],
  ["Zeal", "Zeal"],
  ["Anguish", "Anguish"],
  ["Spite", "Spite"],
  ["Scorn", "Scorn"],
  ["Envy", "Envy"],
];

const ESSENCES = ESSENCE_FAMILIES.flatMap(([metadataFamily, displayFamily]) =>
  ESSENCE_TIERS.map(([metadataTier, displayTier]) => ({
    key: `essence-${displayTier.toLowerCase()}-${displayFamily.toLowerCase()}`,
    name: `${displayTier} Essence of ${displayFamily}`,
    short: `${displayTier} ${displayFamily}`,
    category: "essence",
    metadata:
      `Metadata/Items/Currency/CurrencyEssence${metadataFamily}${metadataTier}`,
    aliases: [],
  })),
);

const SPECIAL_ESSENCES = [
  ["Hysteria", "Essence of Hysteria"],
  ["Insanity", "Essence of Insanity"],
  ["Horror", "Essence of Horror"],
  ["Delirium", "Essence of Delirium"],
].map(([metadataName, name]) => ({
  key: `essence-${metadataName.toLowerCase()}`,
  name,
  short: name.replace(/^Essence of /, ""),
  category: "essence",
  metadata: `Metadata/Items/Currency/CurrencyEssence${metadataName}`,
  aliases: [],
}));

// First exact scarab catalogue. Unknown Metadata IDs are intentionally ignored:
// the interface must never display a guessed or misleading item name.
const SCARABS = [
  {
    key: "abyss-scarab",
    name: "Abyss Scarab",
    short: "Abyss Scarab",
    category: "scarab",
    metadata: "Metadata/Items/Scarabs/ScarabAbyssNew1",
    aliases: [],
  },
  {
    key: "bestiary-scarab",
    name: "Bestiary Scarab",
    short: "Bestiary Scarab",
    category: "scarab",
    metadata: "Metadata/Items/Scarabs/ScarabBeastsNew1",
    aliases: [],
  },
  {
    key: "expedition-scarab",
    name: "Expedition Scarab",
    short: "Expedition Scarab",
    category: "scarab",
    metadata: "Metadata/Items/Scarabs/ScarabExpedition1",
    aliases: [],
  },
  {
    key: "harvest-scarab",
    name: "Harvest Scarab",
    short: "Harvest Scarab",
    category: "scarab",
    metadata: "Metadata/Items/Scarabs/ScarabHarvest1",
    aliases: [],
  },
  {
    key: "legion-scarab",
    name: "Legion Scarab",
    short: "Legion Scarab",
    category: "scarab",
    metadata: "Metadata/Items/Scarabs/ScarabLegionNew1",
    aliases: [],
  },
  {
    key: "titanic-scarab",
    name: "Titanic Scarab",
    short: "Titanic Scarab",
    category: "scarab",
    metadata: "Metadata/Items/Scarabs/ScarabUniquesNew1",
    aliases: [],
  },
  {
    key: "torment-scarab-of-possession",
    name: "Torment Scarab of Possession",
    short: "Torment: Possession",
    category: "scarab",
    metadata: "Metadata/Items/Scarabs/ScarabTormentNew4",
    aliases: [],
  },
  {
    key: "cartography-scarab-of-singularity",
    name: "Cartography Scarab of Singularity",
    short: "Cartography: Singularity",
    category: "scarab",
    metadata: "Metadata/Items/Scarabs/ScarabMapsNew3",
    aliases: [],
  },
  {
    key: "cartography-scarab-of-corruption",
    name: "Cartography Scarab of Corruption",
    short: "Cartography: Corruption",
    category: "scarab",
    metadata: "Metadata/Items/Scarabs/ScarabMapsNew4",
    aliases: [],
  },
  {
    key: "scarab-of-adversaries",
    name: "Scarab of Adversaries",
    short: "Scarab: Adversaries",
    category: "scarab",
    metadata: "Metadata/Items/Scarabs/ScarabMisc2",
    aliases: [],
  },
  {
    key: "scarab-of-stability",
    name: "Scarab of Stability",
    short: "Scarab: Stability",
    category: "scarab",
    metadata: "Metadata/Items/Scarabs/ScarabMisc5",
    aliases: [],
  },
  {
    key: "scarab-of-evolution",
    name: "Scarab of Evolution",
    short: "Scarab: Evolution",
    category: "scarab",
    metadata: "Metadata/Items/Scarabs/ScarabMisc7",
    aliases: [],
  },
  {
    key: "horned-scarab-of-tradition",
    name: "Horned Scarab of Tradition",
    short: "Horned: Tradition",
    category: "scarab",
    metadata: "Metadata/Items/Scarabs/ScarabUber5",
    aliases: [],
  },
  {
    key: "anarchy-scarab-of-the-exceptional",
    name: "Anarchy Scarab of the Exceptional",
    short: "Anarchy: Exceptional",
    category: "scarab",
    metadata: "Metadata/Items/Scarabs/ScarabAnarchy4",
    aliases: [],
  },
  {
    key: "ritual-scarab-of-abundance",
    name: "Ritual Scarab of Abundance",
    short: "Ritual: Abundance",
    category: "scarab",
    metadata: "Metadata/Items/Scarabs/ScarabRitual3",
    aliases: [],
  },
];

const ALL_ASSETS = [
  ...CURRENCIES,
  ...ESSENCES,
  ...SPECIAL_ESSENCES,
  ...SCARABS,
];

const INTERMEDIATE_CATEGORIES = Object.freeze([
  { key: "currency", name: "Валюта" },
  { key: "essence", name: "Эссенции" },
  { key: "scarab", name: "Скарабеи" },
]);

const HARD_MAX_SPREAD_PERCENT = 50;
const HARD_MAX_VOLUME_UTILIZATION_PERCENT = 25;
const HARD_MIN_OBSERVED_LOTS = 3;

const ASSET_BY_KEY = new Map(ALL_ASSETS.map((asset) => [asset.key, asset]));
const ASSET_ALIASES = new Map();

function normalizedIdentifier(value) {
  return String(value ?? "").trim().toLowerCase();
}

for (const currency of ALL_ASSETS) {
  const aliases = [
    currency.key,
    currency.name,
    currency.short,
    currency.metadata,
    currency.metadata.split("/").at(-1),
    ...(currency.aliases ?? []),
  ];

  for (const alias of aliases) {
    ASSET_ALIASES.set(normalizedIdentifier(alias), currency);
  }
}

export function supportedCurrencies() {
  return CURRENCIES.map((currency) => ({ ...currency }));
}

export function supportedIntermediateCategories() {
  return INTERMEDIATE_CATEGORIES.map((category) => ({ ...category }));
}

export function supportedAssets() {
  return ALL_ASSETS.map((asset) => ({ ...asset }));
}

export function resolveCurrency(value) {
  return ASSET_ALIASES.get(normalizedIdentifier(value)) ?? null;
}

function normalizeAmountMap(source) {
  const result = new Map();

  if (!source || typeof source !== "object") return result;

  for (const [rawKey, rawValue] of Object.entries(source)) {
    const currency = resolveCurrency(rawKey);
    const value = Number(rawValue);

    if (currency && Number.isFinite(value)) {
      result.set(currency.key, value);
    }
  }

  return result;
}

function marketCurrencies(market) {
  const pair = Array.isArray(market?.market_pair)
    ? market.market_pair
    : String(market?.market_id ?? "").split("|");

  const resolved = pair.map(resolveCurrency).filter(Boolean);

  if (resolved.length !== 2 || resolved[0].key === resolved[1].key) {
    return null;
  }

  return resolved;
}

function greatestCommonDivisor(left, right) {
  let a = Math.abs(Math.trunc(left));
  let b = Math.abs(Math.trunc(right));

  while (b) {
    [a, b] = [b, a % b];
  }

  return a || 1;
}

function normalizedTradeLot(fromValue, toValue) {
  const rawFrom = Number(fromValue);
  const rawTo = Number(toValue);

  if (!(rawFrom > 0) || !(rawTo > 0)) return null;

  const fromIsInteger = Number.isInteger(rawFrom);
  const toIsInteger = Number.isInteger(rawTo);

  if (fromIsInteger && toIsInteger) {
    const divisor = greatestCommonDivisor(rawFrom, rawTo);

    return {
      fromLot: rawFrom / divisor,
      toLot: rawTo / divisor,
      rate: rawTo / rawFrom,
    };
  }

  return {
    fromLot: rawFrom,
    toLot: rawTo,
    rate: rawTo / rawFrom,
  };
}

function directedEdge({
  from,
  to,
  lowRatios,
  highRatios,
  volume,
  marketId,
}) {
  const candidates = [];

  for (const ratioMap of [lowRatios, highRatios]) {
    const quote = normalizedTradeLot(
      ratioMap.get(from.key),
      ratioMap.get(to.key),
    );

    if (!quote) continue;

    if (
      !candidates.some(
        (candidate) =>
          Math.abs(candidate.fromLot - quote.fromLot) < 1e-9 &&
          Math.abs(candidate.toLot - quote.toLot) < 1e-9,
      )
    ) {
      candidates.push(quote);
    }
  }

  if (!candidates.length) return null;

  candidates.sort((left, right) => left.rate - right.rate);

  const lowQuote = candidates[0];
  const highQuote = candidates.at(-1);
  const midpointRate = Math.sqrt(lowQuote.rate * highQuote.rate);
  const midpointQuote = candidates.reduce((best, candidate) => {
    const bestDistance = Math.abs(Math.log(best.rate / midpointRate));
    const candidateDistance = Math.abs(
      Math.log(candidate.rate / midpointRate),
    );

    return candidateDistance < bestDistance ? candidate : best;
  }, lowQuote);

  const volumeIn = Number(volume.get(from.key) ?? 0);
  const volumeOut = Number(volume.get(to.key) ?? 0);

  if (
    !(lowQuote.rate > 0) ||
    !(highQuote.rate > 0) ||
    !(volumeIn > 0) ||
    !(volumeOut > 0)
  ) {
    return null;
  }

  const middle = (lowQuote.rate + highQuote.rate) / 2;
  const spreadPercent = middle > 0
    ? ((highQuote.rate - lowQuote.rate) / middle) * 100
    : Number.POSITIVE_INFINITY;

  return {
    id: `${marketId}:${from.key}->${to.key}`,
    marketId,
    from,
    to,
    lowRate: lowQuote.rate,
    highRate: highQuote.rate,
    midpointRate,
    lowQuote,
    highQuote,
    midpointQuote,
    spreadPercent,
    volumeIn,
    volumeOut,
  };
}

export function buildDirectedExchangeEdges(markets) {
  const edges = [];
  const diagnostics = {
    received: Array.isArray(markets) ? markets.length : 0,
    unsupportedPair: 0,
    zeroVolumeOrRatio: 0,
    usableMarkets: 0,
    directedEdges: 0,
    assetsByCategory: {
      currency: 0,
      essence: 0,
      scarab: 0,
    },
  };

  for (const market of Array.isArray(markets) ? markets : []) {
    const currencies = marketCurrencies(market);

    if (!currencies) {
      diagnostics.unsupportedPair += 1;
      continue;
    }

    const [left, right] = currencies;
    const volume = normalizeAmountMap(market?.volume_traded);
    const lowRatios = normalizeAmountMap(market?.lowest_ratio);
    const highRatios = normalizeAmountMap(market?.highest_ratio);
    const marketId = String(market?.market_id ?? `${left.key}|${right.key}`);

    const forward = directedEdge({
      from: left,
      to: right,
      lowRatios,
      highRatios,
      volume,
      marketId,
    });

    const reverse = directedEdge({
      from: right,
      to: left,
      lowRatios,
      highRatios,
      volume,
      marketId,
    });

    if (!forward || !reverse) {
      diagnostics.zeroVolumeOrRatio += 1;
      continue;
    }

    diagnostics.usableMarkets += 1;
    edges.push(forward, reverse);
  }

  diagnostics.directedEdges = edges.length;

  const uniqueAssets = new Map();
  for (const edge of edges) {
    uniqueAssets.set(edge.from.key, edge.from);
    uniqueAssets.set(edge.to.key, edge.to);
  }

  for (const asset of uniqueAssets.values()) {
    if (diagnostics.assetsByCategory[asset.category] !== undefined) {
      diagnostics.assetsByCategory[asset.category] += 1;
    }
  }

  return { edges, diagnostics };
}

function finiteNonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function selectedQuote(edge, mode) {
  return mode === "midpoint" ? edge.midpointQuote : edge.lowQuote;
}

function executeWholeLotTrade(inputAmount, quote, safetyFactor = 1) {
  const availableInput = Math.floor(Number(inputAmount));

  if (
    !(availableInput > 0) ||
    !quote ||
    !(quote.fromLot > 0) ||
    !(quote.toLot > 0)
  ) {
    return null;
  }

  const protectedInput = Math.floor(availableInput * safetyFactor);
  const lots = Math.floor((protectedInput + 1e-9) / quote.fromLot);

  if (lots < 1) return null;

  const spentInput = lots * quote.fromLot;
  const rawOutput = lots * quote.toLot;
  const outputAmount = Math.floor(rawOutput + 1e-9);

  if (outputAmount < 1) return null;

  return {
    availableInput,
    protectedInput,
    lots,
    spentInput,
    outputAmount,
    leftoverInput: Math.max(0, availableInput - spentInput),
  };
}

function observedLotCapacity(edge, quote) {
  if (
    !edge ||
    !quote ||
    !(edge.volumeIn > 0) ||
    !(edge.volumeOut > 0) ||
    !(quote.fromLot > 0) ||
    !(quote.toLot > 0)
  ) {
    return 0;
  }

  return Math.floor(
    Math.min(
      edge.volumeIn / quote.fromLot,
      edge.volumeOut / quote.toLot,
    ),
  );
}

function cycleRisk(maxSpread, maxUtilization) {
  if (maxSpread > 20 || maxUtilization > 8) return "high";
  if (maxSpread > 10 || maxUtilization > 4) return "medium";
  return "low";
}

function createCycleRecord({
  routeKey,
  startCurrency,
  first,
  second,
  routeEdges,
  observedCapacities,
  safeExecutions,
  utilizationDetails,
  budget,
  grossAmounts,
  safeAmounts,
  routeMaxSpread,
  maxUtilization,
  mode,
  safetyPercent,
  maxSpread,
  maxVolumeUtilization,
}) {
  const grossResult = grossAmounts.at(-1);
  const safeResult = safeAmounts.at(-1);
  const grossProfit = grossResult - budget;
  const safeProfit = safeResult - budget;
  const roi = (safeProfit / budget) * 100;

  return {
    key: routeKey,
    startCurrency,
    intermediateCategories: [
      first.to.category,
      second.to.category,
    ],
    currencies: [
      startCurrency,
      first.to,
      second.to,
      startCurrency,
    ],
    edges: routeEdges.map((edge, index) => {
      const quote = selectedQuote(edge, mode);
      const execution = safeExecutions[index];

      return {
        ...edge,
        chosenRate: quote.rate,
        safeRate: quote.rate * (1 - safetyPercent / 100),
        fromLot: quote.fromLot,
        toLot: quote.toLot,
        availableInput: execution.availableInput,
        requiredInput: execution.spentInput,
        protectedInput: execution.protectedInput,
        tradeLots: execution.lots,
        leftoverInput: execution.leftoverInput,
        resultingAmount: execution.outputAmount,
        observedLotCapacity: observedCapacities[index],
        inputUtilizationPercent:
          utilizationDetails[index].inputPercent,
        outputUtilizationPercent:
          utilizationDetails[index].outputPercent,
        utilizationPercent:
          utilizationDetails[index].maximumPercent,
      };
    }),
    budget,
    grossResult,
    safeResult,
    grossProfit,
    safeProfit,
    roi,
    maxSpread: routeMaxSpread,
    maxUtilization,
    minimumObservedLotCapacity: Math.min(...observedCapacities),
    risk: cycleRisk(routeMaxSpread, maxUtilization),
    mode,
    safetyPercent,
    effectiveMaxSpread: maxSpread,
    effectiveMaxVolumeUtilization: maxVolumeUtilization,
    hardLimits: {
      maxSpreadPercent: HARD_MAX_SPREAD_PERCENT,
      maxVolumeUtilizationPercent:
        HARD_MAX_VOLUME_UTILIZATION_PERCENT,
      minObservedLots: HARD_MIN_OBSERVED_LOTS,
    },
  };
}

function emptySearchDiagnostics() {
  return {
    potentialRoutes: 0,
    technicallyExecutable: 0,
    accepted: 0,
    rejectedTotal: 0,
    rejected: {
      spread: 0,
      lowObservedLots: 0,
      wholeLot: 0,
      liquidity: 0,
      noProfit: 0,
      minProfit: 0,
      minRoi: 0,
    },
    effectiveLimits: {
      maxSpreadPercent: HARD_MAX_SPREAD_PERCENT,
      maxVolumeUtilizationPercent:
        HARD_MAX_VOLUME_UTILIZATION_PERCENT,
      minObservedLots: HARD_MIN_OBSERVED_LOTS,
    },
  };
}

function sortedCycles(cycles) {
  return cycles.sort(
    (left, right) =>
      right.safeProfit - left.safeProfit ||
      right.roi - left.roi ||
      left.maxUtilization - right.maxUtilization,
  );
}

function sortedNearest(cycles) {
  return cycles
    .sort(
      (left, right) =>
        right.safeProfit - left.safeProfit ||
        right.safeResult - left.safeResult ||
        left.maxUtilization - right.maxUtilization,
    )
    .slice(0, 5);
}

export function analyzeTriangularCycles(edges, options = {}) {
  const diagnostics = emptySearchDiagnostics();
  const cycles = [];
  const nearestCandidates = [];

  const startCurrency = resolveCurrency(
    options.startCurrency ?? "chaos-orb",
  );

  const budget = Math.floor(finiteNonNegative(options.budget, 0));

  if (!startCurrency || !(budget > 0)) {
    return {
      cycles,
      nearest: nearestCandidates,
      diagnostics,
    };
  }

  const safetyPercent = Math.min(
    25,
    finiteNonNegative(options.safetyPercent, 1),
  );
  const safetyFactor = 1 - safetyPercent / 100;
  const mode =
    options.mode === "midpoint" ? "midpoint" : "conservative";
  const minProfit = finiteNonNegative(options.minProfit, 0);
  const minRoi = finiteNonNegative(options.minRoi, 0);

  const allowedIntermediateCategories = new Set(
    Array.isArray(options.allowedIntermediateCategories)
      ? options.allowedIntermediateCategories
      : ["currency", "essence", "scarab"],
  );

  if (!allowedIntermediateCategories.size) {
    return {
      cycles,
      nearest: nearestCandidates,
      diagnostics,
    };
  }

  const requestedMaxSpread = finiteNonNegative(
    options.maxSpread,
    25,
  );
  const requestedMaxVolumeUtilization = finiteNonNegative(
    options.maxVolumeUtilization,
    10,
  );

  const maxSpread =
    requestedMaxSpread > 0
      ? Math.min(
          requestedMaxSpread,
          HARD_MAX_SPREAD_PERCENT,
        )
      : HARD_MAX_SPREAD_PERCENT;

  const maxVolumeUtilization =
    requestedMaxVolumeUtilization > 0
      ? Math.min(
          requestedMaxVolumeUtilization,
          HARD_MAX_VOLUME_UTILIZATION_PERCENT,
        )
      : HARD_MAX_VOLUME_UTILIZATION_PERCENT;

  diagnostics.effectiveLimits = {
    maxSpreadPercent: maxSpread,
    maxVolumeUtilizationPercent: maxVolumeUtilization,
    minObservedLots: HARD_MIN_OBSERVED_LOTS,
  };

  const reject = (reason) => {
    diagnostics.rejected[reason] += 1;
    diagnostics.rejectedTotal += 1;
  };

  const outgoing = new Map();

  for (const edge of Array.isArray(edges) ? edges : []) {
    if (!outgoing.has(edge.from.key)) {
      outgoing.set(edge.from.key, []);
    }

    outgoing.get(edge.from.key).push(edge);
  }

  const seen = new Set();

  for (const first of outgoing.get(startCurrency.key) ?? []) {
    if (first.to.key === startCurrency.key) continue;

    if (
      !allowedIntermediateCategories.has(first.to.category)
    ) {
      continue;
    }

    for (const second of outgoing.get(first.to.key) ?? []) {
      if (
        second.to.key === startCurrency.key ||
        second.to.key === first.from.key ||
        second.to.key === first.to.key
      ) {
        continue;
      }

      if (
        !allowedIntermediateCategories.has(second.to.category)
      ) {
        continue;
      }

      const thirdCandidates = (
        outgoing.get(second.to.key) ?? []
      ).filter((edge) => edge.to.key === startCurrency.key);

      for (const third of thirdCandidates) {
        const routeKey = [
          startCurrency.key,
          first.to.key,
          second.to.key,
          startCurrency.key,
        ].join(">");

        if (seen.has(routeKey)) continue;
        seen.add(routeKey);

        diagnostics.potentialRoutes += 1;

        const routeEdges = [first, second, third];
        const routeMaxSpread = Math.max(
          ...routeEdges.map((edge) => edge.spreadPercent),
        );

        if (routeMaxSpread > maxSpread) {
          reject("spread");
          continue;
        }

        const grossAmounts = [budget];
        const safeAmounts = [budget];
        const safeExecutions = [];
        const observedCapacities = [];

        let failedReason = null;

        for (const edge of routeEdges) {
          const quote = selectedQuote(edge, mode);
          const capacity = observedLotCapacity(edge, quote);

          if (capacity < HARD_MIN_OBSERVED_LOTS) {
            failedReason = "lowObservedLots";
            break;
          }

          const grossExecution = executeWholeLotTrade(
            grossAmounts.at(-1),
            quote,
            1,
          );

          const safeExecution = executeWholeLotTrade(
            safeAmounts.at(-1),
            quote,
            safetyFactor,
          );

          if (!grossExecution || !safeExecution) {
            failedReason = "wholeLot";
            break;
          }

          observedCapacities.push(capacity);
          safeExecutions.push(safeExecution);
          grossAmounts.push(grossExecution.outputAmount);
          safeAmounts.push(safeExecution.outputAmount);
        }

        if (failedReason) {
          reject(failedReason);
          continue;
        }

        const utilizationDetails = routeEdges.map(
          (edge, index) => {
            const execution = safeExecutions[index];

            const inputPercent =
              edge.volumeIn > 0
                ? (execution.spentInput / edge.volumeIn) * 100
                : Number.POSITIVE_INFINITY;

            const outputPercent =
              edge.volumeOut > 0
                ? (execution.outputAmount / edge.volumeOut) * 100
                : Number.POSITIVE_INFINITY;

            return {
              inputPercent,
              outputPercent,
              maximumPercent: Math.max(
                inputPercent,
                outputPercent,
              ),
            };
          },
        );

        const maxUtilization = Math.max(
          ...utilizationDetails.map(
            (detail) => detail.maximumPercent,
          ),
        );

        if (maxUtilization > maxVolumeUtilization) {
          reject("liquidity");
          continue;
        }

        diagnostics.technicallyExecutable += 1;

        const cycle = createCycleRecord({
          routeKey,
          startCurrency,
          first,
          second,
          routeEdges,
          observedCapacities,
          safeExecutions,
          utilizationDetails,
          budget,
          grossAmounts,
          safeAmounts,
          routeMaxSpread,
          maxUtilization,
          mode,
          safetyPercent,
          maxSpread,
          maxVolumeUtilization,
        });

        if (cycle.safeProfit <= 0) {
          reject("noProfit");
          nearestCandidates.push({
            ...cycle,
            rejectionReason: "noProfit",
            gapToBreakEven: Math.max(
              0,
              budget - cycle.safeResult,
            ),
            gapToMinProfit: Math.max(
              0,
              minProfit - cycle.safeProfit,
            ),
            gapToMinRoi: Math.max(0, minRoi - cycle.roi),
          });
          continue;
        }

        if (cycle.safeProfit < minProfit) {
          reject("minProfit");
          nearestCandidates.push({
            ...cycle,
            rejectionReason: "minProfit",
            gapToBreakEven: 0,
            gapToMinProfit: minProfit - cycle.safeProfit,
            gapToMinRoi: Math.max(0, minRoi - cycle.roi),
          });
          continue;
        }

        if (cycle.roi < minRoi) {
          reject("minRoi");
          nearestCandidates.push({
            ...cycle,
            rejectionReason: "minRoi",
            gapToBreakEven: 0,
            gapToMinProfit: 0,
            gapToMinRoi: minRoi - cycle.roi,
          });
          continue;
        }

        diagnostics.accepted += 1;
        cycles.push(cycle);
      }
    }
  }

  return {
    cycles: sortedCycles(cycles),
    nearest: sortedNearest(nearestCandidates),
    diagnostics,
  };
}

export function findTriangularCycles(edges, options = {}) {
  return analyzeTriangularCycles(edges, options).cycles;
}
