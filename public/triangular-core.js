const CURRENCIES = [
  {
    key: "chaos-orb",
    name: "Chaos Orb",
    short: "Chaos",
    metadata: "Metadata/Items/Currency/CurrencyRerollRare",
    aliases: ["chaos", "chaos-orb"],
  },
  {
    key: "divine-orb",
    name: "Divine Orb",
    short: "Divine",
    metadata: "Metadata/Items/Currency/CurrencyModValues",
    aliases: ["divine", "divine-orb"],
  },
  {
    key: "exalted-orb",
    name: "Exalted Orb",
    short: "Exalted",
    metadata: "Metadata/Items/Currency/CurrencyAddModToRare",
    aliases: ["exalted", "exalted-orb"],
  },
  {
    key: "orb-of-annulment",
    name: "Orb of Annulment",
    short: "Annul",
    metadata: "Metadata/Items/Currency/CurrencyRemoveMod",
    aliases: ["annulment", "orb-of-annulment"],
  },
  {
    key: "orb-of-fusing",
    name: "Orb of Fusing",
    short: "Fusing",
    metadata: "Metadata/Items/Currency/CurrencyRerollSocketLinks",
    aliases: ["fusing", "orb-of-fusing"],
  },
  {
    key: "orb-of-alteration",
    name: "Orb of Alteration",
    short: "Alteration",
    metadata: "Metadata/Items/Currency/CurrencyRerollMagic",
    aliases: ["alteration", "orb-of-alteration"],
  },
  {
    key: "orb-of-alchemy",
    name: "Orb of Alchemy",
    short: "Alchemy",
    metadata: "Metadata/Items/Currency/CurrencyUpgradeToRare",
    aliases: ["alchemy", "orb-of-alchemy"],
  },
  {
    key: "orb-of-scouring",
    name: "Orb of Scouring",
    short: "Scouring",
    metadata: "Metadata/Items/Currency/CurrencyConvertToNormal",
    aliases: ["scouring", "orb-of-scouring"],
  },
  {
    key: "orb-of-regret",
    name: "Orb of Regret",
    short: "Regret",
    metadata: "Metadata/Items/Currency/CurrencyPassiveSkillRefund",
    aliases: ["regret", "orb-of-regret"],
  },
  {
    key: "vaal-orb",
    name: "Vaal Orb",
    short: "Vaal",
    metadata: "Metadata/Items/Currency/CurrencyVaal",
    aliases: ["vaal", "vaal-orb"],
  },
  {
    key: "chromatic-orb",
    name: "Chromatic Orb",
    short: "Chromatic",
    metadata: "Metadata/Items/Currency/CurrencyRerollSocketColours",
    aliases: ["chromatic", "chromatic-orb"],
  },
  {
    key: "jewellers-orb",
    name: "Jeweller's Orb",
    short: "Jeweller",
    metadata: "Metadata/Items/Currency/CurrencyRerollSocketNumbers",
    aliases: ["jeweller", "jewellers-orb", "jeweller's-orb"],
  },
  {
    key: "orb-of-chance",
    name: "Orb of Chance",
    short: "Chance",
    metadata: "Metadata/Items/Currency/CurrencyUpgradeRandomly",
    aliases: ["chance", "orb-of-chance"],
  },
  {
    key: "regal-orb",
    name: "Regal Orb",
    short: "Regal",
    metadata: "Metadata/Items/Currency/CurrencyUpgradeMagicToRare",
    aliases: ["regal", "regal-orb"],
  },
  {
    key: "blessed-orb",
    name: "Blessed Orb",
    short: "Blessed",
    metadata: "Metadata/Items/Currency/CurrencyImplicitMod",
    aliases: ["blessed", "blessed-orb"],
  },
  {
    key: "gemcutters-prism",
    name: "Gemcutter's Prism",
    short: "GCP",
    metadata: "Metadata/Items/Currency/CurrencyGemQuality",
    aliases: ["gcp", "gemcutters-prism", "gemcutter's-prism"],
  },
  {
    key: "glassblowers-bauble",
    name: "Glassblower's Bauble",
    short: "Bauble",
    metadata: "Metadata/Items/Currency/CurrencyFlaskQuality",
    aliases: ["glassblowers-bauble", "glassblower's-bauble"],
  },
  {
    key: "cartographers-chisel",
    name: "Cartographer's Chisel",
    short: "Chisel",
    metadata: "Metadata/Items/Currency/CurrencyMapQuality",
    aliases: ["chisel", "cartographers-chisel", "cartographer's-chisel"],
  },
  {
    key: "orb-of-transmutation",
    name: "Orb of Transmutation",
    short: "Transmutation",
    metadata: "Metadata/Items/Currency/CurrencyUpgradeToMagic",
    aliases: ["transmutation", "orb-of-transmutation"],
  },
  {
    key: "orb-of-augmentation",
    name: "Orb of Augmentation",
    short: "Augmentation",
    metadata: "Metadata/Items/Currency/CurrencyAddModToMagic",
    aliases: ["augmentation", "orb-of-augmentation"],
  },
];

const CURRENCY_BY_KEY = new Map(CURRENCIES.map((currency) => [currency.key, currency]));
const CURRENCY_ALIASES = new Map();

function normalizedIdentifier(value) {
  return String(value ?? "").trim().toLowerCase();
}

for (const currency of CURRENCIES) {
  const aliases = [
    currency.key,
    currency.name,
    currency.short,
    currency.metadata,
    currency.metadata.split("/").at(-1),
    ...(currency.aliases ?? []),
  ];

  for (const alias of aliases) {
    CURRENCY_ALIASES.set(normalizedIdentifier(alias), currency);
  }
}

export function supportedCurrencies() {
  return CURRENCIES.map((currency) => ({ ...currency }));
}

export function resolveCurrency(value) {
  return CURRENCY_ALIASES.get(normalizedIdentifier(value)) ?? null;
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

function cycleRisk(maxSpread, maxUtilization) {
  if (maxSpread > 20 || maxUtilization > 8) return "high";
  if (maxSpread > 10 || maxUtilization > 4) return "medium";
  return "low";
}

export function findTriangularCycles(edges, options = {}) {
  const startCurrency = resolveCurrency(options.startCurrency ?? "chaos-orb");
  if (!startCurrency) return [];

  const budget = Math.floor(finiteNonNegative(options.budget, 0));
  if (!(budget > 0)) return [];

  const safetyPercent = Math.min(
    25,
    finiteNonNegative(options.safetyPercent, 1),
  );
  const safetyFactor = 1 - safetyPercent / 100;
  const mode = options.mode === "midpoint" ? "midpoint" : "conservative";
  const minProfit = finiteNonNegative(options.minProfit, 0);
  const minRoi = finiteNonNegative(options.minRoi, 0);
  const maxSpread = finiteNonNegative(options.maxSpread, 25);
  const maxVolumeUtilization = finiteNonNegative(
    options.maxVolumeUtilization,
    10,
  );

  const outgoing = new Map();

  for (const edge of Array.isArray(edges) ? edges : []) {
    if (!outgoing.has(edge.from.key)) outgoing.set(edge.from.key, []);
    outgoing.get(edge.from.key).push(edge);
  }

  const cycles = [];
  const seen = new Set();

  for (const first of outgoing.get(startCurrency.key) ?? []) {
    if (first.to.key === startCurrency.key) continue;

    for (const second of outgoing.get(first.to.key) ?? []) {
      if (
        second.to.key === startCurrency.key ||
        second.to.key === first.from.key ||
        second.to.key === first.to.key
      ) {
        continue;
      }

      const thirdCandidates = (outgoing.get(second.to.key) ?? []).filter(
        (edge) => edge.to.key === startCurrency.key,
      );

      for (const third of thirdCandidates) {
        const routeKey = [
          startCurrency.key,
          first.to.key,
          second.to.key,
          startCurrency.key,
        ].join(">");

        if (seen.has(routeKey)) continue;
        seen.add(routeKey);

        const routeEdges = [first, second, third];
        const routeMaxSpread = Math.max(
          ...routeEdges.map((edge) => edge.spreadPercent),
        );

        if (maxSpread > 0 && routeMaxSpread > maxSpread) continue;

        const grossAmounts = [budget];
        const safeAmounts = [budget];
        const grossExecutions = [];
        const safeExecutions = [];
        let executable = true;

        for (const edge of routeEdges) {
          const quote = selectedQuote(edge, mode);
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
            executable = false;
            break;
          }

          grossExecutions.push(grossExecution);
          safeExecutions.push(safeExecution);
          grossAmounts.push(grossExecution.outputAmount);
          safeAmounts.push(safeExecution.outputAmount);
        }

        if (!executable) continue;

        const utilizations = routeEdges.map((edge, index) => {
          const spentInput = safeExecutions[index].spentInput;
          return edge.volumeIn > 0
            ? (spentInput / edge.volumeIn) * 100
            : Number.POSITIVE_INFINITY;
        });

        const maxUtilization = Math.max(...utilizations);

        if (
          maxVolumeUtilization > 0 &&
          maxUtilization > maxVolumeUtilization
        ) {
          continue;
        }

        const grossResult = grossAmounts.at(-1);
        const safeResult = safeAmounts.at(-1);
        const grossProfit = grossResult - budget;
        const safeProfit = safeResult - budget;
        const roi = (safeProfit / budget) * 100;

        if (safeProfit < minProfit || roi < minRoi) continue;

        cycles.push({
          key: routeKey,
          startCurrency,
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
              safeRate: quote.rate * safetyFactor,
              fromLot: quote.fromLot,
              toLot: quote.toLot,
              availableInput: execution.availableInput,
              requiredInput: execution.spentInput,
              protectedInput: execution.protectedInput,
              tradeLots: execution.lots,
              leftoverInput: execution.leftoverInput,
              resultingAmount: execution.outputAmount,
              utilizationPercent: utilizations[index],
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
          risk: cycleRisk(routeMaxSpread, maxUtilization),
          mode,
          safetyPercent,
        });
      }
    }
  }

  return cycles.sort(
    (left, right) =>
      right.safeProfit - left.safeProfit ||
      right.roi - left.roi ||
      left.maxUtilization - right.maxUtilization,
  );
}
