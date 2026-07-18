"use strict";

import {
  buildEssencePairs,
  buildFixedRewardCardPairs,
  buildOilPairs,
  calculateOpportunity,
  mergeMarketSources,
  mergeCurrencyExchangeStats,
  normalizeCurrencyExchange,
  normalizeExchange,
  normalizePoeWatch,
  priceDiscrepancyPercent,
  recipeKey
} from "./core.js";
import { FIXED_CARD_REWARD_CATALOG } from "./cards.js";

const SETTINGS_KEY = "poe-arbitrage-settings:v8";
const LEGACY_SETTINGS_KEY = "poe-arbitrage-settings:v7";
const HISTORY_PREFIX = "poe-arbitrage-history:v8:";
const LEGACY_HISTORY_PREFIX = "poe-arbitrage-history:v7:";
const NOTIFICATION_STATE_KEY = "poe-arbitrage-notifications:v8";
const MAX_HISTORY_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_HISTORY_SNAPSHOTS = 600;
const DEMO_MODE = new URLSearchParams(window.location.search).get("demo") === "1";

const state = {
  pairs: [],
  rows: [],
  history: [],
  serverHistory: new Map(),
  serverHistoryConfigured: false,
  serverHistoryAvailable: false,
  serverHistorySnapshotCount: 0,
  serverHistoryLatestRun: null,
  notificationMemory: {},
  notificationsEnabled: false,
  activeCategory: "all",
  activeCardCategory: "all",
  sourcePrimary: "Chaos Orb",
  watchAvailable: false,
  watchItemCount: 0,
  watchMatchCount: 0,
  cxConfigured: false,
  cxAvailable: false,
  cxMarketCount: 0,
  cxMatchCount: 0,
  cxHour: Number.NaN,
  cxError: "",
  notificationForceNext: false,
  autoTimer: null,
  countdownTimer: null,
  nextRefreshAt: 0,
  isRefreshing: false
};

const elements = {
  league: document.querySelector("#leagueInput"),
  leagueOptions: document.querySelector("#leagueOptions"),
  budget: document.querySelector("#budget"),
  minProfit: document.querySelector("#minProfit"),
  minRoi: document.querySelector("#minRoi"),
  minStability: document.querySelector("#minStability"),
  maxDiscrepancy: document.querySelector("#maxDiscrepancy"),
  useSecondSource: document.querySelector("#useSecondSource"),
  notificationButton: document.querySelector("#notificationButton"),
  testNotification: document.querySelector("#testNotificationButton"),
  notificationStatus: document.querySelector("#notificationStatus"),
  notifyMinProfit: document.querySelector("#notifyMinProfit"),
  notifyMinRoi: document.querySelector("#notifyMinRoi"),
  notifyMinStability: document.querySelector("#notifyMinStability"),
  notifyCooldown: document.querySelector("#notifyCooldown"),
  notifyRequireConfirmed: document.querySelector("#notifyRequireConfirmed"),
  buyPremium: document.querySelector("#buyPremium"),
  sellDiscount: document.querySelector("#sellDiscount"),
  autoRefresh: document.querySelector("#autoRefresh"),
  sort: document.querySelector("#sortSelect"),
  refresh: document.querySelector("#refreshButton"),
  export: document.querySelector("#exportButton"),
  clearHistory: document.querySelector("#clearHistoryButton"),
  resetFilters: document.querySelector("#resetFiltersButton"),
  diagnostics: document.querySelector("#filterDiagnostics"),
  status: document.querySelector("#status"),
  countdown: document.querySelector("#countdown"),
  body: document.querySelector("#resultsBody"),
  count: document.querySelector("#opportunityCount"),
  bestProfit: document.querySelector("#bestProfit"),
  bestBudgetProfit: document.querySelector("#bestBudgetProfit"),
  stableCount: document.querySelector("#stableCount"),
  confirmedCount: document.querySelector("#confirmedCount"),
  cxStatus: document.querySelector("#cxStatus"),
  serverHistoryStatus: document.querySelector("#serverHistoryStatus"),
  updated: document.querySelector("#updatedAt"),
  tabs: [...document.querySelectorAll(".tab")],
  cardSubtabsContainer: document.querySelector("#cardSubtabs"),
  cardTabs: [...document.querySelectorAll(".card-subtab")]
};

function numberInput(element, fallback = 0) {
  const value = Number(element?.value);
  return Number.isFinite(value) ? value : fallback;
}

function settings() {
  return {
    budget: Math.max(0, numberInput(elements.budget, 0)),
    minProfit: Math.max(0, numberInput(elements.minProfit, 0)),
    minRoi: Math.max(0, numberInput(elements.minRoi, 0)),
    minStability: Math.max(1, numberInput(elements.minStability, 1)),
    maxDiscrepancy: Math.max(0, numberInput(elements.maxDiscrepancy, 0)),
    useSecondSource: Boolean(elements.useSecondSource?.checked),
    notifyMinProfit: Math.max(0, numberInput(elements.notifyMinProfit, 10)),
    notifyMinRoi: Math.max(0, numberInput(elements.notifyMinRoi, 15)),
    notifyMinStability: Math.max(1, numberInput(elements.notifyMinStability, 2)),
    notifyCooldown: Math.max(5, numberInput(elements.notifyCooldown, 30)),
    notifyRequireConfirmed: Boolean(elements.notifyRequireConfirmed?.checked),
    notificationsEnabled: Boolean(state.notificationsEnabled),
    buyPremium: Math.max(0, numberInput(elements.buyPremium, 0)),
    sellDiscount: Math.max(0, numberInput(elements.sellDiscount, 0)),
    autoRefresh: Math.max(0, numberInput(elements.autoRefresh, 0)),
    sort: elements.sort.value,
    league: elements.league.value.trim()
  };
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings()));
  } catch (error) {
    console.warn("Не удалось сохранить настройки:", error);
  }
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? localStorage.getItem(LEGACY_SETTINGS_KEY) ?? "null");
    if (!saved || typeof saved !== "object") return;
    const mapping = {
      budget: elements.budget,
      minProfit: elements.minProfit,
      minRoi: elements.minRoi,
      minStability: elements.minStability,
      maxDiscrepancy: elements.maxDiscrepancy,
      notifyMinProfit: elements.notifyMinProfit,
      notifyMinRoi: elements.notifyMinRoi,
      notifyMinStability: elements.notifyMinStability,
      notifyCooldown: elements.notifyCooldown,
      buyPremium: elements.buyPremium,
      sellDiscount: elements.sellDiscount,
      autoRefresh: elements.autoRefresh,
      sort: elements.sort,
      league: elements.league
    };
    for (const [key, element] of Object.entries(mapping)) {
      if (element && saved[key] !== undefined && saved[key] !== null) element.value = String(saved[key]);
    }
    if (elements.useSecondSource && saved.useSecondSource !== undefined) {
      elements.useSecondSource.checked = Boolean(saved.useSecondSource);
    }
    if (elements.notifyRequireConfirmed && saved.notifyRequireConfirmed !== undefined) {
      elements.notifyRequireConfirmed.checked = Boolean(saved.notifyRequireConfirmed);
    }
    state.notificationsEnabled = Boolean(saved.notificationsEnabled);
  } catch (error) {
    console.warn("Не удалось прочитать настройки:", error);
  }
}

function historyKey(league) {
  return `${HISTORY_PREFIX}${league}`;
}

function legacyHistoryKey(league) {
  return `${LEGACY_HISTORY_PREFIX}${league}`;
}

function loadHistory(league) {
  try {
    const history = JSON.parse(localStorage.getItem(historyKey(league)) ?? localStorage.getItem(legacyHistoryKey(league)) ?? "[]");
    const cutoff = Date.now() - MAX_HISTORY_AGE_MS;
    return Array.isArray(history)
      ? history.filter((snapshot) => Number(snapshot?.ts) >= cutoff && snapshot?.prices)
      : [];
  } catch (error) {
    console.warn("Не удалось прочитать историю:", error);
    return [];
  }
}

function saveHistory(league, history) {
  try {
    localStorage.setItem(historyKey(league), JSON.stringify(history.slice(-MAX_HISTORY_SNAPSHOTS)));
  } catch (error) {
    console.warn("Не удалось сохранить историю цен:", error);
  }
}

function priceKey(category, name) {
  return `${category}|${name}`;
}

function createSnapshot(itemsByCategory) {
  const prices = {};
  for (const [category, items] of Object.entries(itemsByCategory)) {
    for (const item of items) {
      prices[priceKey(category, item.name)] = {
        price: item.price,
        ninjaPrice: item.ninjaPrice,
        watchPrice: item.watchPrice,
        ninjaVolume: item.ninjaVolume,
        watchVolume: item.watchVolume,
        volume: item.volume,
        change24h: item.change24h,
        history7d: item.history7d,
        discrepancy: item.discrepancy,
        sources: item.sources,
        cx: item.cx
      };
    }
  }
  return { ts: Date.now(), prices };
}

function appendSnapshot(league, snapshot) {
  const previous = state.history.at(-1);
  const sameWindow = previous && snapshot.ts - previous.ts < 4 * 60 * 1000;
  if (sameWindow) state.history[state.history.length - 1] = snapshot;
  else state.history.push(snapshot);

  const cutoff = Date.now() - MAX_HISTORY_AGE_MS;
  state.history = state.history.filter((item) => item.ts >= cutoff).slice(-MAX_HISTORY_SNAPSHOTS);
  saveHistory(league, state.history);
}


function loadNotificationMemory() {
  try {
    const value = JSON.parse(localStorage.getItem(NOTIFICATION_STATE_KEY) ?? "{}");
    state.notificationMemory = value && typeof value === "object" ? value : {};
  } catch {
    state.notificationMemory = {};
  }
}

function saveNotificationMemory() {
  try {
    localStorage.setItem(NOTIFICATION_STATE_KEY, JSON.stringify(state.notificationMemory));
  } catch (error) {
    console.warn("Не удалось сохранить состояние уведомлений:", error);
  }
}

function serverRecordOpportunity(pair, record, currentSettings) {
  const makeItem = (side) => {
    const ninjaPrice = Number(record?.[`${side}_ninja`]);
    const watchPrice = Number(record?.[`${side}_watch`]);
    const sources = Number(record?.[`${side}_sources`] ?? 1);
    return {
      ...(side === "input" ? pair.input : pair.output),
      price: Number.isFinite(ninjaPrice) ? ninjaPrice : watchPrice,
      ninjaPrice: Number.isFinite(ninjaPrice) ? ninjaPrice : Number.NaN,
      watchPrice: Number.isFinite(watchPrice) ? watchPrice : Number.NaN,
      sources,
      watchVolume: Number(record?.[`${side}_watch_volume`] ?? 0),
      discrepancy: priceDiscrepancyPercent(ninjaPrice, watchPrice)
    };
  };
  return calculateOpportunity({
    ...pair,
    input: makeItem("input"),
    output: makeItem("output"),
    ratio: Number(record?.ratio ?? pair.ratio),
    outputQuantity: Number(record?.output_quantity ?? pair.outputQuantity ?? 1)
  }, currentSettings);
}

async function loadServerHistory(league, pairs) {
  state.serverHistory = new Map();
  state.serverHistoryConfigured = false;
  state.serverHistoryAvailable = false;
  state.serverHistorySnapshotCount = 0;
  state.serverHistoryLatestRun = null;
  if (DEMO_MODE) return;

  try {
    const payload = await fetchJson("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ league, hours: 24, keys: pairs.map(recipeKey) })
    });
    state.serverHistoryConfigured = Boolean(payload?.configured);
    state.serverHistoryAvailable = Boolean(payload?.available);
    state.serverHistorySnapshotCount = Number(payload?.snapshotCount ?? 0);
    state.serverHistoryLatestRun = payload?.latestRun ?? null;
    for (const record of payload?.snapshots ?? []) {
      const key = String(record?.recipe_key ?? "");
      if (!key) continue;
      if (!state.serverHistory.has(key)) state.serverHistory.set(key, []);
      state.serverHistory.get(key).push(record);
    }
  } catch (error) {
    console.warn("Серверная история недоступна:", error);
  }
}

function opportunityAtSnapshot(pair, snapshot, currentSettings) {
  const inputCategory = pair.inputCategory ?? pair.category;
  const outputCategory = pair.outputCategory ?? pair.category;
  const input = snapshot?.prices?.[priceKey(inputCategory, pair.input.name)];
  const output = snapshot?.prices?.[priceKey(outputCategory, pair.output.name)];
  if (!input || !output) return null;
  return calculateOpportunity({
    ...pair,
    input: { ...pair.input, ...input },
    output: { ...pair.output, ...output }
  }, currentSettings);
}

function historyMetrics(pair, currentSettings) {
  const serverRecords = state.serverHistory.get(recipeKey(pair)) ?? [];
  const serverPoints = serverRecords.map((record) => ({
    ts: Number(record.captured_at) * 1000,
    opportunity: serverRecordOpportunity(pair, record, currentSettings)
  })).filter((point) => point.opportunity);
  if (serverPoints.length) {
    const lastTimestamp = serverPoints.at(-1)?.ts ?? 0;
    if (Date.now() - lastTimestamp > 60_000) {
      serverPoints.push({ ts: Date.now(), opportunity: calculateOpportunity(pair, currentSettings) });
    }
  }
  const points = serverPoints.length
    ? serverPoints
    : state.history
        .map((snapshot) => ({ ts: snapshot.ts, opportunity: opportunityAtSnapshot(pair, snapshot, currentSettings) }))
        .filter((point) => point.opportunity);

  let streak = 0;
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const opportunity = points[index].opportunity;
    if (opportunity.profit > 0 && opportunity.roi > 0) streak += 1;
    else break;
  }

  const current = points.at(-1)?.opportunity;
  let baselinePoint = null;
  if (points.length > 1) {
    const target = Date.now() - 60 * 60 * 1000;
    baselinePoint = [...points].reverse().find((point) => point.ts <= target) ?? points[0];
  }
  const marginTrend = current && baselinePoint
    ? current.profit - baselinePoint.opportunity.profit
    : Number.NaN;

  return { samples: points.length, streak, marginTrend, historySource: serverRecords.length ? "server" : "local" };
}

function confidenceBreakdown(row, metrics) {
  const entries = [];
  const add = (label, points, tone = points >= 0 ? "positive" : "negative") => {
    entries.push({ label, points, tone });
    return points;
  };

  let score = 0;
  const historyPoints = Math.min(15, metrics.samples * 3);
  score += add(metrics.samples
    ? `${metrics.historySource === "server" ? "Серверная" : "Локальная"} история: ${metrics.samples} замеров`
    : "История ещё не накоплена", historyPoints, metrics.samples ? "positive" : "neutral");

  const stabilityPoints = Math.min(15, metrics.streak * 5);
  score += add(metrics.streak
    ? `Прибыль держится ${metrics.streak} замер(а)`
    : "Сигнал появился только сейчас или уже исчез", stabilityPoints, metrics.streak ? "positive" : "neutral");

  if (row.bothSources) score += add("Цены подтверждены poe.ninja и poe.watch", 25);
  else score += add("Цена подтверждена только одним источником", 5, "warning");

  if (Number.isFinite(row.maxDiscrepancy)) {
    const points = row.maxDiscrepancy <= 7 ? 15 : row.maxDiscrepancy <= 15 ? 8 : row.maxDiscrepancy <= 25 ? 3 : 0;
    score += add(`Расхождение источников: ${row.maxDiscrepancy.toFixed(1)}%`, points, points >= 8 ? "positive" : points > 0 ? "warning" : "negative");
  } else {
    add("Расхождение источников посчитать нельзя", 0, "neutral");
  }

  if (row.minWatchVolume > 0) {
    const points = Math.min(10, Math.log10(row.minWatchVolume + 1) * 3.5);
    score += add(`Минимальный объём poe.watch: ${Math.round(row.minWatchVolume)}`, points);
  } else {
    add("Нет подтверждённого объёма poe.watch", 0, "neutral");
  }

  if (row.cxBoth) {
    score += add("Обе стороны торговались на официальном Currency Exchange", 12);
    if (Number.isFinite(row.minCxVolume)) {
      const points = row.minCxVolume >= 1000 ? 6 : row.minCxVolume >= 100 ? 4 : row.minCxVolume > 0 ? 2 : 0;
      score += add(`Минимальный объём Currency Exchange: ${Math.round(row.minCxVolume)}`, points, points >= 4 ? "positive" : points > 0 ? "warning" : "neutral");
    }
    if (Number.isFinite(row.maxCxDiscrepancy)) {
      const points = row.maxCxDiscrepancy <= 10 ? 6 : row.maxCxDiscrepancy <= 25 ? 2 : -8;
      score += add(`Отклонение от прошлого часа GGG: ${row.maxCxDiscrepancy.toFixed(1)}%`, points, points >= 6 ? "positive" : points > 0 ? "warning" : "negative");
    }
    if (Number.isFinite(row.cxProfitLow)) {
      score += add(
        row.cxProfitLow > 0
          ? `Даже консервативный диапазон прошлого часа был прибыльным: ${row.cxProfitLow.toFixed(1)}c`
          : `По консервативному диапазону прошлого часа прибыль не подтверждена: ${row.cxProfitLow.toFixed(1)}c`,
        row.cxProfitLow > 0 ? 5 : -5,
        row.cxProfitLow > 0 ? "positive" : "warning"
      );
    }
  } else if (row.inputCx || row.outputCx) {
    score += add("Currency Exchange подтвердил только одну сторону операции", 3, "warning");
  } else if (state.cxConfigured) {
    add("Для этой операции нет рынка Currency Exchange за проверенный час", 0, "neutral");
  } else {
    add("Официальный Currency Exchange API ещё не настроен", 0, "neutral");
  }

  const marginPoints = row.roi >= 30 ? 10 : row.roi >= 15 ? 7 : row.roi > 0 ? 3 : 0;
  score += add(`ROI: ${row.roi.toFixed(1)}%`, marginPoints, marginPoints >= 7 ? "positive" : marginPoints > 0 ? "warning" : "negative");

  if (row.catalogConfidence === "medium") {
    score += add("Награда точная, но цена уникального предмета зависит от роллов", 4, "warning");
  } else {
    score += add("Точное сопоставление награды", 10);
  }

  return { score: Math.round(Math.min(100, Math.max(0, score))), entries };
}

function recalculateRows() {
  const currentSettings = settings();
  state.rows = state.pairs.map((pair) => {
    const base = calculateOpportunity(pair, currentSettings);
    const metrics = historyMetrics(pair, currentSettings);
    const confidence = confidenceBreakdown(base, metrics);
    return {
      ...base,
      ...metrics,
      confidence: confidence.score,
      confidenceEntries: confidence.entries,
      key: recipeKey(pair)
    };
  });
}

function categoryScopedRows() {
  return state.rows
    .filter((row) => state.activeCategory === "all" || row.category === state.activeCategory)
    .filter((row) => state.activeCategory !== "card" || state.activeCardCategory === "all" || row.cardCategory === state.activeCardCategory);
}

function sortRows(rows, currentSettings) {
  return [...rows].sort((a, b) => {
    if (currentSettings.sort === "roi") return b.roi - a.roi;
    if (currentSettings.sort === "budgetProfit") return b.budgetProfit - a.budgetProfit;
    if (currentSettings.sort === "stability") return b.streak - a.streak || b.profit - a.profit;
    if (currentSettings.sort === "cost") return a.cost - b.cost;
    if (currentSettings.sort === "profit") return b.profit - a.profit;
    if (currentSettings.sort === "discrepancy") return (a.maxDiscrepancy ?? Infinity) - (b.maxDiscrepancy ?? Infinity);
    if (currentSettings.sort === "volume") return b.minWatchVolume - a.minWatchVolume;
    return b.confidence - a.confidence || b.profit - a.profit;
  });
}

function filterDiagnostics() {
  const currentSettings = settings();
  const scoped = categoryScopedRows();
  const afterProfit = scoped.filter((row) => row.profit >= currentSettings.minProfit);
  const afterRoi = afterProfit.filter((row) => row.roi >= currentSettings.minRoi);
  const afterStability = afterRoi.filter((row) => row.streak >= currentSettings.minStability);
  const afterDiscrepancy = afterStability.filter((row) =>
    !currentSettings.maxDiscrepancy || !Number.isFinite(row.maxDiscrepancy) || row.maxDiscrepancy <= currentSettings.maxDiscrepancy
  );
  return {
    total: scoped.length,
    hiddenProfit: scoped.length - afterProfit.length,
    hiddenRoi: afterProfit.length - afterRoi.length,
    hiddenStability: afterRoi.length - afterStability.length,
    hiddenDiscrepancy: afterStability.length - afterDiscrepancy.length,
    visible: sortRows(afterDiscrepancy, currentSettings)
  };
}

function currentRows() {
  return filterDiagnostics().visible;
}

function formatChaos(value) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} c`;
}

function formatNumber(value) {
  if (!Number.isFinite(Number(value))) return "—";
  return Number(value).toLocaleString("ru-RU", { notation: Number(value) >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 });
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 1 })}%`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function priceSourcesHtml(item) {
  const ninja = Number.isFinite(item.ninjaPrice) ? `N: ${formatChaos(item.ninjaPrice)}` : "N: —";
  const watch = Number.isFinite(item.watchPrice) ? `W: ${formatChaos(item.watchPrice)}` : "W: —";
  const cx = item?.cx?.available
    ? `GGG: ${formatChaos(item.cx.lowPrice)}–${formatChaos(item.cx.highPrice)}`
    : "";
  return `<small class="source-prices"><span>${ninja}</span><span>${watch}</span>${cx ? `<span>${cx}</span>` : ""}</small>`;
}

function itemCell(item, quantity = 1) {
  const image = item.icon ? `<img src="${escapeAttribute(item.icon)}" alt="" loading="lazy">` : "";
  const prefix = quantity > 1 ? `${quantity} × ` : "";
  const change = Number.isFinite(item.change24h)
    ? `<small class="item-change ${item.change24h > 0 ? "trend-up" : item.change24h < 0 ? "trend-down" : "trend-flat"}">24ч: ${item.change24h > 0 ? "+" : ""}${formatPercent(item.change24h)}</small>`
    : "";
  return `<div class="item-cell">${image}<span class="item-name">${prefix}${escapeHtml(item.name)}${priceSourcesHtml(item)}${change}</span></div>`;
}

function confidenceDetails(row) {
  const level = row.confidence >= 70 ? "high" : row.confidence >= 45 ? "medium" : "low";
  const items = (row.confidenceEntries ?? []).map((entry) => {
    const sign = entry.points > 0 ? `+${Math.round(entry.points)}` : entry.points < 0 ? String(Math.round(entry.points)) : "0";
    return `<li class="confidence-reason reason-${escapeAttribute(entry.tone)}"><span>${escapeHtml(entry.label)}</span><strong>${sign}</strong></li>`;
  }).join("");
  return `<details class="confidence-details"><summary class="confidence-badge confidence-${level}">${row.confidence}/100</summary><div class="confidence-popover"><strong>Почему такая оценка</strong><ul>${items}</ul></div></details>`;
}

function discrepancyBadge(value, confirmed) {
  if (!confirmed || !Number.isFinite(value)) return `<span class="source-badge source-one">1 источник</span>`;
  const level = value <= 7 ? "high" : value <= 15 ? "medium" : "low";
  return `<span class="confidence-badge confidence-${level}">${formatPercent(value)}</span>`;
}

function trendCell(value) {
  if (!Number.isFinite(value)) return `<span class="trend-flat">нет истории</span>`;
  const className = value > 0.05 ? "trend-up" : value < -0.05 ? "trend-down" : "trend-flat";
  const sign = value > 0 ? "+" : "";
  return `<span class="${className}">${sign}${formatChaos(value)}</span>`;
}

function sparkline(values) {
  const points = Array.isArray(values) ? values.map(Number).filter(Number.isFinite).slice(-7) : [];
  if (points.length < 2) return `<span class="trend-flat">нет данных</span>`;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points.map((value, index) => {
    const x = (index / (points.length - 1)) * 100;
    const y = 28 - ((value - min) / range) * 24;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const change = points[0] ? (points.at(-1) - points[0]) / points[0] * 100 : Number.NaN;
  const className = change > 0 ? "spark-up" : change < 0 ? "spark-down" : "spark-flat";
  return `<div class="sparkline-wrap"><svg class="sparkline ${className}" viewBox="0 0 100 32" preserveAspectRatio="none" aria-label="График за 7 дней"><polyline points="${coords}"></polyline></svg><small>${Number.isFinite(change) ? `${change > 0 ? "+" : ""}${formatPercent(change)}` : "—"}</small></div>`;
}

function liquidityCell(row) {
  if (!row.bothSources) return `<span class="trend-flat">нет poe.watch</span>`;
  const inputChange = Number.isFinite(row.input.change24h) ? `${row.input.change24h > 0 ? "+" : ""}${formatPercent(row.input.change24h)}` : "—";
  const outputChange = Number.isFinite(row.output.change24h) ? `${row.output.change24h > 0 ? "+" : ""}${formatPercent(row.output.change24h)}` : "—";
  return `<div class="liquidity-cell"><strong>${formatNumber(row.minWatchVolume)}</strong><small>вход ${inputChange}</small><small>выход ${outputChange}</small></div>`;
}

function formatExchangeHour(timestamp) {
  if (!Number.isFinite(timestamp)) return "";
  return new Date(timestamp * 1000).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function currencyExchangeCell(row) {
  if (!state.cxConfigured) return `<span class="source-badge source-one">не настроен</span>`;
  if (!row.inputCx && !row.outputCx) return `<span class="trend-flat">нет рынка</span>`;
  if (!row.cxBoth) {
    const side = row.inputCx ? "только вход" : "только выход";
    return `<div class="cx-cell"><span class="source-badge source-one">частично</span><small>${side}</small></div>`;
  }
  const profitClass = row.cxProfitLow > 0 ? "trend-up" : row.cxProfitHigh < 0 ? "trend-down" : "trend-flat";
  const profitText = Number.isFinite(row.cxProfitLow) && Number.isFinite(row.cxProfitHigh)
    ? `${formatChaos(row.cxProfitLow)}…${formatChaos(row.cxProfitHigh)}`
    : "—";
  return `<div class="cx-cell">
    <small>вход ${formatChaos(row.inputCx.lowPrice)}–${formatChaos(row.inputCx.highPrice)}</small>
    <small>выход ${formatChaos(row.outputCx.lowPrice)}–${formatChaos(row.outputCx.highPrice)}</small>
    <strong class="${profitClass}">${profitText}</strong>
    <small>объём ${formatNumber(row.minCxVolume)} · ${escapeHtml(formatExchangeHour(row.cxHour))}</small>
  </div>`;
}

function rewardMeta(row) {
  const parts = [];
  if (row.rewardDescription) parts.push(row.rewardDescription);
  if (Number.isFinite(row.output.gemLevel)) parts.push(`ур. ${row.output.gemLevel}`);
  if (Number.isFinite(row.output.gemQuality)) parts.push(`кач. ${row.output.gemQuality}%`);
  if (row.output.corrupted === true) parts.push("осквернён");
  if (row.output.corrupted === false && row.cardCategory === "unique") parts.push("не осквернён");
  return parts.length ? `<small class="reward-meta">${escapeHtml([...new Set(parts)].join(" · "))}</small>` : "";
}

function renderDiagnostics(diagnostics) {
  if (!elements.diagnostics) return;
  const chips = [
    ["Рассчитано", diagnostics.total, "neutral"],
    ["Скрыто прибылью", diagnostics.hiddenProfit, diagnostics.hiddenProfit ? "warning" : "neutral"],
    ["Скрыто ROI", diagnostics.hiddenRoi, diagnostics.hiddenRoi ? "warning" : "neutral"],
    ["Скрыто стабильностью", diagnostics.hiddenStability, diagnostics.hiddenStability ? "warning" : "neutral"],
    ["Скрыто расхождением", diagnostics.hiddenDiscrepancy, diagnostics.hiddenDiscrepancy ? "warning" : "neutral"],
    ["Показано", diagnostics.visible.length, diagnostics.visible.length ? "success" : "warning"]
  ];
  elements.diagnostics.innerHTML = chips.map(([label, value, tone]) =>
    `<span class="diagnostic-chip diagnostic-${tone}">${escapeHtml(label)}: <strong>${Number(value).toLocaleString("ru-RU")}</strong></span>`
  ).join("");
}

function emptyReason(diagnostics, currentSettings) {
  if (!diagnostics.total) return "В выбранной категории пока нет сопоставленных рыночных цепочек.";
  if (diagnostics.hiddenDiscrepancy) return `Все подходящие операции скрыты фильтром расхождения до ${currentSettings.maxDiscrepancy}%. Нажмите «Показать всё» или увеличьте предел.`;
  if (diagnostics.hiddenStability) return `Операции скрыты фильтром стабильности «${currentSettings.minStability} замера». Дождитесь обновлений или поставьте 1 замер.`;
  if (diagnostics.hiddenRoi) return `Операции скрыты минимальным ROI ${currentSettings.minRoi}%.`;
  if (diagnostics.hiddenProfit) return `Операции скрыты минимальной прибылью ${currentSettings.minProfit} chaos.`;
  return "Нет операций, проходящих заданные фильтры.";
}

function render() {
  const diagnostics = filterDiagnostics();
  const rows = diagnostics.visible;
  const currentSettings = settings();
  renderDiagnostics(diagnostics);
  elements.count.textContent = rows.length.toLocaleString("ru-RU");
  elements.bestProfit.textContent = rows.length ? formatChaos(Math.max(...rows.map((row) => row.profit))) : "—";
  elements.bestBudgetProfit.textContent = rows.length ? formatChaos(Math.max(...rows.map((row) => row.budgetProfit))) : "—";
  elements.stableCount.textContent = rows.filter((row) => row.streak >= currentSettings.minStability && row.profit > 0).length.toLocaleString("ru-RU");
  elements.confirmedCount.textContent = rows.filter((row) => row.bothSources).length.toLocaleString("ru-RU");
  if (elements.cxStatus) {
    elements.cxStatus.textContent = !state.cxConfigured
      ? "не настроен"
      : state.cxAvailable
        ? `${state.cxMatchCount} совп. / ${state.cxMarketCount} рынков`
        : "нет данных";
  }
  if (elements.serverHistoryStatus) {
    elements.serverHistoryStatus.textContent = !state.serverHistoryConfigured
      ? "не настроена"
      : state.serverHistoryAvailable
        ? `${state.serverHistorySnapshotCount.toLocaleString("ru-RU")} замеров`
        : "пока пусто";
  }

  if (!rows.length) {
    elements.body.innerHTML = `<tr><td colspan="15" class="empty-state">${escapeHtml(emptyReason(diagnostics, currentSettings))}</td></tr>`;
    return;
  }

  elements.body.innerHTML = rows.map((row) => {
    const cardLabels = {
      currency: "Карточка · Валюта",
      "map-fragment": "Карточка · Карта/фрагмент",
      scarab: "Карточка · Скараб",
      gem: "Карточка · Камень",
      unique: "Карточка · Уникальный"
    };
    const label = row.category === "oil"
      ? "Масло"
      : row.category === "essence"
        ? "Эссенция"
        : cardLabels[row.cardCategory] ?? "Карточка";
    const profitClass = row.profit >= 0 ? "profit" : "loss";
    const budgetText = row.maxOperations > 0
      ? `${formatChaos(row.budgetProfit)}<small class="item-price">${row.maxOperations} оп.</small>`
      : "—";
    const graphValues = row.output.history7d?.length ? row.output.history7d : row.input.history7d;
    return `
      <tr title="Расчётная прибыль до наценки и скидки: ${formatChaos(row.theoreticalProfit)}">
        <td><span class="category-badge">${label}</span></td>
        <td>${itemCell(row.input, row.ratio)}</td>
        <td>${itemCell(row.output, row.outputQuantity ?? 1)}${rewardMeta(row)}</td>
        <td class="number">${formatChaos(row.cost)}</td>
        <td class="number">${formatChaos(row.sale)}</td>
        <td class="number ${profitClass}">${formatChaos(row.profit)}</td>
        <td class="number ${profitClass}">${formatPercent(row.roi)}</td>
        <td class="number ${profitClass}">${budgetText}</td>
        <td class="number">${discrepancyBadge(row.maxDiscrepancy, row.bothSources)}</td>
        <td class="number">${liquidityCell(row)}</td>
        <td class="number">${currencyExchangeCell(row)}</td>
        <td class="number">${sparkline(graphValues)}</td>
        <td class="number"><span class="stability-badge">${row.streak} / ${row.samples}</span></td>
        <td class="number">${trendCell(row.marginTrend)}</td>
        <td class="number">${confidenceDetails(row)}</td>
      </tr>`;
  }).join("");
}


function notificationSupported() {
  return "Notification" in window && window.isSecureContext;
}

function updateNotificationUi() {
  if (!elements.notificationStatus || !elements.notificationButton) return;
  if (!notificationSupported()) {
    elements.notificationStatus.className = "notification-status error";
    elements.notificationStatus.textContent = "Этот браузер или текущий адрес не поддерживает уведомления. Нужен HTTPS.";
    elements.notificationButton.disabled = true;
    elements.testNotification.disabled = true;
    return;
  }

  const permission = Notification.permission;
  if (permission === "denied") {
    elements.notificationStatus.className = "notification-status error";
    elements.notificationStatus.textContent = "Уведомления заблокированы в настройках браузера для этого сайта.";
    elements.notificationButton.textContent = "Заблокировано";
    elements.notificationButton.disabled = true;
    return;
  }

  const enabled = state.notificationsEnabled && permission === "granted";
  elements.notificationStatus.className = `notification-status ${enabled ? "success" : "warning"}`;
  elements.notificationStatus.textContent = enabled
    ? "Уведомления включены. Сигналы приходят, пока сайт открыт или находится в фоновой вкладке."
    : permission === "granted"
      ? "Разрешение выдано, но сигналы выключены кнопкой."
      : "Нажмите «Включить уведомления» и разрешите их в браузере.";
  elements.notificationButton.textContent = enabled ? "Выключить уведомления" : "Включить уведомления";
  elements.notificationButton.disabled = false;
  elements.testNotification.disabled = permission !== "granted";
}

function showNotification(title, body, tag = "poe-arbitrage") {
  if (!notificationSupported() || Notification.permission !== "granted") return false;
  try {
    const notification = new Notification(title, {
      body,
      tag,
      renotify: true,
      icon: "/icon.svg"
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch (error) {
    console.warn("Не удалось показать уведомление:", error);
    return false;
  }
}

async function toggleNotifications() {
  if (!notificationSupported()) {
    updateNotificationUi();
    return;
  }
  if (state.notificationsEnabled && Notification.permission === "granted") {
    state.notificationsEnabled = false;
    saveSettings();
    updateNotificationUi();
    return;
  }

  const permission = await Notification.requestPermission();
  state.notificationsEnabled = permission === "granted";
  state.notificationForceNext = state.notificationsEnabled;
  saveSettings();
  updateNotificationUi();
  if (state.notificationsEnabled && state.rows.length) {
    processNotifications({ force: true });
    state.notificationForceNext = false;
  }
}

function testNotification() {
  if (Notification.permission !== "granted") return;
  showNotification(
    "PoE Arbitrage Dashboard",
    "Тестовое уведомление работает. Новые выгодные сигналы будут выглядеть примерно так.",
    "poe-arbitrage-test"
  );
}

function notificationEligible(row, currentSettings) {
  if (row.profit < currentSettings.notifyMinProfit) return false;
  if (row.roi < currentSettings.notifyMinRoi) return false;
  if (row.streak < currentSettings.notifyMinStability) return false;
  if (currentSettings.notifyRequireConfirmed && !row.bothSources) return false;
  if (currentSettings.maxDiscrepancy > 0 && Number.isFinite(row.maxDiscrepancy) && row.maxDiscrepancy > currentSettings.maxDiscrepancy) return false;
  return true;
}

function processNotifications({ force = false } = {}) {
  if (DEMO_MODE || !state.notificationsEnabled || !notificationSupported() || Notification.permission !== "granted") return;
  const currentSettings = settings();
  const now = Date.now();
  const cooldownMs = currentSettings.notifyCooldown * 60_000;
  const eligible = state.rows.filter((row) => notificationEligible(row, currentSettings));
  const eligibleKeys = new Set(eligible.map((row) => row.key));

  for (const [key, memory] of Object.entries(state.notificationMemory)) {
    if (!eligibleKeys.has(key)) state.notificationMemory[key] = { ...memory, active: false };
  }

  let sent = 0;
  for (const row of eligible.sort((a, b) => b.confidence - a.confidence || b.profit - a.profit)) {
    if (sent >= 3) break;
    const previous = state.notificationMemory[row.key] ?? {};
    const cooldownPassed = now - Number(previous.lastNotifiedAt ?? 0) >= cooldownMs;
    const profitGrew = row.profit >= Math.max(Number(previous.lastProfit ?? 0) * 1.25, Number(previous.lastProfit ?? 0) + 1);
    const shouldNotify = force || !previous.active || (cooldownPassed && profitGrew);

    if (shouldNotify) {
      const category = row.category === "oil" ? "Масла" : row.category === "essence" ? "Эссенции" : "Карточки";
      const body = `${row.ratio} × ${row.input.name} → ${row.outputQuantity ?? 1} × ${row.output.name}\nПрибыль ${formatChaos(row.profit)}, ROI ${formatPercent(row.roi)}, стабильность ${row.streak} зам.`;
      if (showNotification(`${category}: найден выгодный сигнал`, body, `poe-arbitrage-${row.key}`)) sent += 1;
      state.notificationMemory[row.key] = {
        active: true,
        lastNotifiedAt: now,
        lastProfit: row.profit,
        lastSeenAt: now
      };
    } else {
      state.notificationMemory[row.key] = { ...previous, active: true, lastSeenAt: now };
    }
  }
  saveNotificationMemory();
}

async function fetchJson(url, options = {}) {
  const headers = { Accept: "application/json", ...(options.headers ?? {}) };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`${response.status} ${response.statusText}${message ? `: ${message}` : ""}`);
  }
  return response.json();
}

function demoPayload(type) {
  const demoItems = {
    Oil: [
      ["Clear Oil", 0.12, 300], ["Sepia Oil", 0.35, 292], ["Amber Oil", 0.75, 284],
      ["Verdant Oil", 1.8, 276], ["Teal Oil", 4.9, 268], ["Azure Oil", 14.2, 260],
      ["Indigo Oil", 39, 252], ["Violet Oil", 115, 244]
    ],
    Essence: [
      ["Whispering Essence of Greed", 0.8, 300], ["Muttering Essence of Greed", 2.8, 292],
      ["Weeping Essence of Greed", 9.2, 284], ["Wailing Essence of Greed", 31, 276],
      ["Screaming Essence of Greed", 3, 260], ["Shrieking Essence of Greed", 11.5, 250],
      ["Deafening Essence of Greed", 39, 240], ["Screaming Essence of Wrath", 4, 230],
      ["Shrieking Essence of Wrath", 15, 220], ["Deafening Essence of Wrath", 52, 210]
    ],
    DivinationCard: [
      ["The Wrath", 0.82, 190], ["The Fortunate", 18, 130], ["Rain of Chaos", 0.18, 400],
      ["The Hoarder", 3.2, 170], ["Lucky Connections", 1.1, 90], ["The Seeker", 9, 55],
      ["Altered Perception", 14, 80], ["Boon of Justice", 2.2, 110], ["Checkmate", 0.32, 150],
      ["Last Hope", 5, 70], ["Eternal Bonds", 19, 42], ["Scholar of the Seas", 1.1, 65],
      ["The Professor", 3.5, 55], ["The Wolf's Legacy", 1.8, 48], ["Buried Treasure", 0.21, 180],
      ["Man With Bear", 0.28, 160], ["The Card Sharp", 0.35, 145], ["The Deal", 0.4, 130],
      ["A Chilling Wind", 7.5, 45], ["The Dragon's Heart", 21, 35], ["The Enlightened", 5.5, 72],
      ["The Apothecary", 32, 110], ["The Doctor", 18, 130], ["Hunter's Reward", 3.5, 90],
      ["The Hunger", 2.8, 95], ["The Shieldbearer", 11, 65]
    ],
    Currency: [
      ["Chaos Orb", 1, 10000], ["Divine Orb", 150, 3400], ["Exalted Orb", 12, 3100],
      ["Orb of Fusing", 0.24, 7000], ["Orb of Annulment", 28, 900]
    ],
    Fragment: [
      ["Simulacrum", 58, 780], ["Offering to the Goddess", 19, 1300],
      ["Simulacrum Splinter", 0.11, 12000], ["Mortal Hope", 31, 640]
    ],
    UniqueMap: [
      ["Replica Cortex", 115, 95], ["Mao Kun", 12, 420],
      ["The Putrid Cloister", 22, 250], ["Vaults of Atziri", 11, 300]
    ],
    Scarab: [
      ["Sulphite Scarab", 1.4, 2500], ["Bestiary Scarab", 1.7, 2200],
      ["Divination Scarab", 2.2, 1850], ["Cartography Scarab", 2.6, 2100]
    ],
    SkillGem: [
      ["Vaal Cold Snap", 42, 130, { gemLevel: 21, gemQuality: 20, corrupted: true }],
      ["Empower Support", 310, 80, { gemLevel: 4, gemQuality: 0, corrupted: true }],
      ["Enlighten Support", 65, 170, { gemLevel: 3, gemQuality: 0, corrupted: false }],
      ["Enlighten Support", 350, 60, { gemLevel: 4, gemQuality: 0, corrupted: true }]
    ],
    UniqueAccessory: [
      ["Mageblood", 180, 95, { corrupted: false }], ["Headhunter", 150, 120, { corrupted: false }],
      ["The Taming", 18, 220, { corrupted: false }]
    ],
    UniqueWeapon: [],
    UniqueArmour: [
      ["The Squire", 110, 75, { corrupted: false, links: 0 }]
    ],
    UniqueFlask: [
      ["Taste of Hate", 29, 260, { corrupted: false }]
    ],
    UniqueJewel: []
  };
  const items = {};
  const lines = (demoItems[type] ?? []).map(([name, price, volume, metadata = {}], index) => {
    const id = `${type.toLowerCase()}-${index}`;
    items[id] = { id, name, icon: "", ...metadata };
    return { id, primaryValue: price, volumePrimaryValue: volume, ...metadata };
  });
  return { core: { primary: "chaos", items }, lines };
}

function demoWatchPayload() {
  const base = [
    ["Clear Oil", 0.13, 420, 2.5], ["Sepia Oil", 0.36, 390, 4.1], ["Amber Oil", 0.78, 360, -1.2],
    ["Verdant Oil", 1.75, 330, 3.3], ["Teal Oil", 5.05, 300, 6.2], ["Azure Oil", 13.9, 280, -2.1],
    ["Indigo Oil", 40, 240, 5.5], ["Violet Oil", 112, 210, -3.5],
    ["Whispering Essence of Greed", 0.82, 650, 1.1], ["Muttering Essence of Greed", 2.7, 580, -0.8],
    ["Weeping Essence of Greed", 9.5, 520, 4.2], ["Wailing Essence of Greed", 30.2, 480, 2.9],
    ["Screaming Essence of Greed", 3.1, 900, 5.4], ["Shrieking Essence of Greed", 11.2, 760, -1.6],
    ["Deafening Essence of Greed", 38, 620, 3.8], ["Screaming Essence of Wrath", 4.2, 850, 7.1],
    ["Shrieking Essence of Wrath", 14.7, 710, -2.3], ["Deafening Essence of Wrath", 50, 590, 1.8],
    ["The Wrath", 0.86, 170, 4.4], ["The Fortunate", 18.6, 120, 8.1], ["Rain of Chaos", 0.19, 390, -1.4],
    ["The Hoarder", 3.1, 150, 3.2], ["Lucky Connections", 1.12, 88, 2.1], ["The Seeker", 8.7, 52, -4.2],
    ["Altered Perception", 14.5, 75, 6.2], ["Boon of Justice", 2.3, 105, 1.4], ["Checkmate", 0.34, 142, -0.8],
    ["Last Hope", 5.2, 68, 4.3], ["Eternal Bonds", 20, 40, 7.1], ["Scholar of the Seas", 1.15, 61, -2.0],
    ["The Professor", 3.6, 51, 2.4], ["The Wolf's Legacy", 1.9, 44, -1.2], ["Buried Treasure", 0.22, 170, 3.1],
    ["Man With Bear", 0.29, 152, 1.8], ["The Card Sharp", 0.36, 138, 5.2], ["The Deal", 0.42, 125, -0.5],
    ["Chaos Orb", 1, 30000, 0], ["Divine Orb", 148, 9500, 2.2], ["Exalted Orb", 12.4, 8700, -1.1],
    ["Orb of Fusing", 0.25, 12000, 3.6], ["Orb of Annulment", 27.5, 3200, -2.2],
    ["Simulacrum", 56, 760, 4.1], ["Offering to the Goddess", 18.5, 1260, -1.1],
    ["Simulacrum Splinter", 0.105, 11800, 2.3], ["Mortal Hope", 30, 610, 5.0],
    ["Replica Cortex", 112, 90, 4.7], ["Mao Kun", 11.5, 405, -2.3],
    ["The Putrid Cloister", 21, 238, 1.2], ["Vaults of Atziri", 10.5, 286, -1.8],
    ["Sulphite Scarab", 1.35, 2380, 2.0], ["Bestiary Scarab", 1.65, 2100, 3.5],
    ["Divination Scarab", 2.1, 1760, 4.8], ["Cartography Scarab", 2.5, 1980, -0.9],
    ["A Chilling Wind", 7.8, 42, 2.4], ["The Dragon's Heart", 21.5, 32, 3.2],
    ["The Enlightened", 5.7, 68, -1.0], ["The Apothecary", 33, 105, 5.0],
    ["The Doctor", 18.5, 125, 2.0], ["Hunter's Reward", 3.7, 86, -0.5],
    ["The Hunger", 2.9, 90, 1.2], ["The Shieldbearer", 11.2, 60, 2.1],
    ["Vaal Cold Snap", 40, 120, 1.1, { gemLevel: 21, gemQuality: 20, corrupted: true }],
    ["Empower Support", 300, 75, 2.5, { gemLevel: 4, gemQuality: 0, corrupted: true }],
    ["Enlighten Support", 64, 160, -1.2, { gemLevel: 3, gemQuality: 0, corrupted: false }],
    ["Enlighten Support", 340, 55, 1.8, { gemLevel: 4, gemQuality: 0, corrupted: true }],
    ["Mageblood", 175, 90, 1.4, { corrupted: false }], ["Headhunter", 148, 115, -1.0, { corrupted: false }],
    ["The Taming", 17.5, 210, 0.8, { corrupted: false }],
    ["Taste of Hate", 28, 250, 1.2, { corrupted: false }],
    ["The Squire", 108, 70, -0.8, { corrupted: false, links: 0 }]
  ];
  return {
    items: base.map(([name, mean, volume, change24h, metadata = {}], index) => ({
      id: index + 1,
      name,
      mean,
      volume,
      change24h,
      ...metadata,
      history7d: [mean * 0.91, mean * 0.94, mean * 0.97, mean * 0.95, mean * 1.01, mean * 0.99, mean]
    }))
  };
}

function demoCurrencyExchangePayload() {
  const hour = Math.floor(Date.now() / 3_600_000) * 3_600 - 3_600;
  const markets = [
    ["chaos|oil-0", 3000, 0.11, 0.14], ["chaos|oil-1", 2600, 0.33, 0.38],
    ["chaos|essence-4", 4200, 2.9, 3.3], ["chaos|essence-5", 3600, 10.8, 12.1],
    ["chaos|divinationcard-1", 900, 17.5, 19.2], ["chaos|currency-1", 9500, 146, 152],
    ["chaos|scarab-0", 4200, 1.25, 1.55], ["chaos|fragment-0", 1100, 54, 60]
  ].map(([market_id, volume, low, high]) => {
    const [chaos, item] = market_id.split("|");
    return {
      league: "Mirage",
      market_id,
      volume_traded: { [chaos]: Math.round(volume * ((low + high) / 2)), [item]: volume },
      lowest_stock: { [chaos]: 1000, [item]: 25 },
      highest_stock: { [chaos]: 25000, [item]: 1000 },
      lowest_ratio: { [chaos]: low, [item]: 1 },
      highest_ratio: { [chaos]: high, [item]: 1 }
    };
  });
  return { configured: true, available: true, league: "Mirage", hour, next_change_id: hour + 3600, markets };
}

async function loadLeagues() {
  if (DEMO_MODE) {
    elements.leagueOptions.innerHTML = `<option value="Mirage"></option><option value="Standard"></option>`;
    return;
  }
  try {
    const payload = await fetchJson("/api/leagues");
    const sourceLeagues = Array.isArray(payload) ? payload : payload?.leagues;
    if (!Array.isArray(sourceLeagues)) return;
    const leagues = [...sourceLeagues];
    const knownSourceIds = new Set(leagues.map((league) => league?.id ?? league?.name ?? league));
    if (!knownSourceIds.has("Standard")) leagues.push({ id: "Standard", name: "Standard", current: false });
    elements.leagueOptions.innerHTML = leagues.map((league) => {
      const id = league?.id ?? league?.name ?? league;
      return `<option value="${escapeAttribute(id)}"></option>`;
    }).join("");
    const currentLeague = leagues.find((league) => league?.current)?.id;
    const knownIds = leagues.map((league) => league?.id ?? league?.name ?? league);
    if (currentLeague && !knownIds.includes(elements.league.value.trim())) elements.league.value = currentLeague;
  } catch (error) {
    console.warn("Не удалось загрузить список лиг:", error);
  }
}

async function refreshData({ silent = false } = {}) {
  if (state.isRefreshing) return;
  const league = elements.league.value.trim();
  if (!league) return;

  state.isRefreshing = true;
  elements.refresh.disabled = true;
  if (!silent) {
    elements.status.className = "status";
    elements.status.textContent = "Загружаю poe.ninja, poe.watch и историю Currency Exchange…";
  }

  try {
    const ninjaTypes = [
      { key: "oil", type: "Oil", optional: false },
      { key: "essence", type: "Essence", optional: false },
      { key: "card", type: "DivinationCard", optional: false },
      { key: "currency", type: "Currency", optional: false },
      { key: "fragment", type: "Fragment", optional: true },
      { key: "uniqueMap", type: "UniqueMap", optional: true },
      { key: "scarab", type: "Scarab", optional: true },
      { key: "skillGem", type: "SkillGem", optional: true },
      { key: "uniqueAccessory", type: "UniqueAccessory", optional: true },
      { key: "uniqueWeapon", type: "UniqueWeapon", optional: true },
      { key: "uniqueArmour", type: "UniqueArmour", optional: true },
      { key: "uniqueFlask", type: "UniqueFlask", optional: true },
      { key: "uniqueJewel", type: "UniqueJewel", optional: true }
    ];
    const optionalErrors = [];
    const payloadEntries = await Promise.all(ninjaTypes.map(async ({ key, type, optional }) => {
      if (DEMO_MODE) return [key, demoPayload(type)];
      try {
        return [key, await fetchJson(`/api/prices?league=${encodeURIComponent(league)}&type=${encodeURIComponent(type)}`)];
      } catch (error) {
        if (!optional) throw error;
        optionalErrors.push(`${type}: ${error.message}`);
        console.warn(`Не удалось загрузить необязательную категорию ${type}:`, error);
        return [key, { lines: [] }];
      }
    }));
    const ninjaPayloads = Object.fromEntries(payloadEntries);

    let watchPayload = null;
    let watchError = null;
    try {
      watchPayload = DEMO_MODE ? demoWatchPayload() : await fetchJson(`/api/watch?league=${encodeURIComponent(league)}`);
    } catch (error) {
      watchError = error;
      console.warn("poe.watch недоступен, продолжаю только с poe.ninja:", error);
    }

    let cxPayload = null;
    let cxError = null;
    try {
      cxPayload = DEMO_MODE ? demoCurrencyExchangePayload() : await fetchJson(`/api/currency-exchange?league=${encodeURIComponent(league)}`);
    } catch (error) {
      cxError = error;
      console.warn("Currency Exchange API недоступен, продолжаю без него:", error);
    }
    const cxExchange = normalizeCurrencyExchange(cxPayload ?? {});

    const normalized = Object.fromEntries(
      Object.entries(ninjaPayloads).map(([key, payload]) => [key, normalizeExchange(payload)])
    );
    const watchItems = watchPayload ? normalizePoeWatch(watchPayload) : [];
    const withSources = (items) => mergeCurrencyExchangeStats(mergeMarketSources(items, watchItems), cxExchange);

    const oils = withSources(normalized.oil.items);
    const essences = withSources(normalized.essence.items);
    const cards = withSources(normalized.card.items);
    const currencies = withSources(normalized.currency.items);
    const fragments = withSources(normalized.fragment.items);
    const uniqueMaps = withSources(normalized.uniqueMap.items);
    const scarabs = withSources(normalized.scarab.items);
    const skillGems = withSources(normalized.skillGem.items);
    const uniqueAccessories = withSources(normalized.uniqueAccessory.items);
    const uniqueWeapons = withSources(normalized.uniqueWeapon.items);
    const uniqueArmours = withSources(normalized.uniqueArmour.items);
    const uniqueFlasks = withSources(normalized.uniqueFlask.items);
    const uniqueJewels = withSources(normalized.uniqueJewel.items);

    const allMerged = [
      ...oils, ...essences, ...cards, ...currencies, ...fragments, ...uniqueMaps, ...scarabs,
      ...skillGems, ...uniqueAccessories, ...uniqueWeapons, ...uniqueArmours, ...uniqueFlasks, ...uniqueJewels
    ];
    state.watchAvailable = watchItems.length > 0;
    state.watchItemCount = watchItems.length;
    state.watchMatchCount = allMerged.filter((item) => item.sources === 2).length;
    state.cxConfigured = cxExchange.configured;
    state.cxAvailable = cxExchange.available;
    state.cxMarketCount = cxExchange.markets.length;
    state.cxMatchCount = allMerged.filter((item) => item.cx?.available && !item.cx.synthetic).length;
    state.cxHour = cxExchange.hour;
    state.cxError = cxError?.message ?? cxExchange.error ?? "";
    state.sourcePrimary = Object.values(normalized).map((entry) => entry.primaryName).find(Boolean) || "Chaos Orb";

    const cardPairs = buildFixedRewardCardPairs(cards, {
      currency: currencies,
      fragment: fragments,
      "unique-map": uniqueMaps,
      scarab: scarabs,
      "skill-gem": skillGems,
      "unique-accessory": uniqueAccessories,
      "unique-weapon": uniqueWeapons,
      "unique-armour": uniqueArmours,
      "unique-flask": uniqueFlasks,
      "unique-jewel": uniqueJewels
    }, FIXED_CARD_REWARD_CATALOG);
    const cardCounts = cardPairs.reduce((acc, pair) => {
      acc[pair.cardCategory] = (acc[pair.cardCategory] ?? 0) + 1;
      return acc;
    }, {});

    state.pairs = [...buildOilPairs(oils), ...buildEssencePairs(essences), ...cardPairs];
    state.history = loadHistory(league);
    appendSnapshot(league, createSnapshot({
      oil: oils,
      essence: essences,
      card: cards,
      currency: currencies,
      fragment: fragments,
      "unique-map": uniqueMaps,
      scarab: scarabs,
      "skill-gem": skillGems,
      "unique-accessory": uniqueAccessories,
      "unique-weapon": uniqueWeapons,
      "unique-armour": uniqueArmours,
      "unique-flask": uniqueFlasks,
      "unique-jewel": uniqueJewels
    }));
    await loadServerHistory(league, state.pairs);
    recalculateRows();
    saveSettings();

    const now = new Date();
    elements.updated.textContent = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    const hasWarning = Boolean(watchError || optionalErrors.length || cxError || (cxExchange.configured && !cxExchange.available));
    elements.status.className = hasWarning ? "status warning" : "status success";
    const watchText = watchError
      ? `poe.watch недоступен: используется только poe.ninja. ${watchError.message}`
      : `poe.watch: ${watchItems.length} позиций, совпало ${state.watchMatchCount}.`;
    const optionalText = optionalErrors.length
      ? ` Не загрузились необязательные категории: ${optionalErrors.join("; ")}.`
      : "";
    const cxText = !cxExchange.configured
      ? " Currency Exchange API не настроен."
      : cxExchange.available
        ? ` Currency Exchange: ${cxExchange.markets.length} рынков за ${formatExchangeHour(cxExchange.hour)}, совпало позиций ${state.cxMatchCount}.`
        : ` Currency Exchange: данных нет${state.cxError ? ` (${state.cxError})` : ""}.`;
    const uniqueMarketCount = uniqueAccessories.length + uniqueWeapons.length + uniqueArmours.length + uniqueFlasks.length + uniqueJewels.length;
    const serverHistoryText = !state.serverHistoryConfigured
      ? " Серверная история не настроена."
      : state.serverHistoryAvailable
        ? ` Серверная история: ${state.serverHistorySnapshotCount} замеров за последние 24 часа.`
        : " Серверная история настроена, но пока не накопила данные.";
    elements.status.textContent = `${DEMO_MODE ? "Демо. " : ""}poe.ninja: ${oils.length} масел, ${essences.length} эссенций, ${cards.length} карточек, ${currencies.length} валют, ${fragments.length} фрагментов, ${uniqueMaps.length} уникальных карт, ${scarabs.length} скараба, ${skillGems.length} камней, ${uniqueMarketCount} уникальных предметов. ${watchText}${cxText}${optionalText} Карточные цепочки: ${cardPairs.length} (валюта ${cardCounts.currency ?? 0}, карты/фрагменты ${cardCounts["map-fragment"] ?? 0}, скарабы ${cardCounts.scarab ?? 0}, камни ${cardCounts.gem ?? 0}, уникальные ${cardCounts.unique ?? 0}). Локальная история: ${state.history.length}.${serverHistoryText}`;
    render();
    processNotifications({ force: state.notificationForceNext });
    state.notificationForceNext = false;
    scheduleAutoRefresh();
  } catch (error) {
    console.error(error);
    elements.status.className = "status error";
    elements.status.textContent = `Не удалось получить основные данные poe.ninja: ${error.message}`;
    elements.body.innerHTML = `<tr><td colspan="15" class="empty-state">Проверьте /api/leagues, /api/prices, /api/watch, /api/history и /api/currency-exchange. Для демо откройте адрес с параметром ?demo=1.</td></tr>`;
  } finally {
    state.isRefreshing = false;
    elements.refresh.disabled = false;
  }
}

function scheduleAutoRefresh() {
  clearTimeout(state.autoTimer);
  clearInterval(state.countdownTimer);
  state.autoTimer = null;
  state.countdownTimer = null;
  const minutes = settings().autoRefresh;
  if (!minutes) {
    elements.countdown.textContent = "Автообновление выключено.";
    return;
  }
  const delay = minutes * 60 * 1000;
  state.nextRefreshAt = Date.now() + delay;
  state.autoTimer = setTimeout(() => {
    refreshData({ silent: true });
  }, delay);
  updateCountdown();
  state.countdownTimer = setInterval(updateCountdown, 1000);
}

function updateCountdown() {
  if (!state.nextRefreshAt || !settings().autoRefresh) return;
  const seconds = Math.max(0, Math.ceil((state.nextRefreshAt - Date.now()) / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  elements.countdown.textContent = `Следующее обновление через ${minutes}:${String(rest).padStart(2, "0")}.`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[;"\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function exportCsv() {
  const rows = currentRows();
  if (!rows.length) return;
  const headers = [
    "Категория", "Подкатегория карточек", "Покупка", "Результат", "Ninja вход", "Watch вход", "Ninja выход", "Watch выход",
    "Расхождение %", "Watch объём", "GGG CX вход min", "GGG CX вход max", "GGG CX выход min", "GGG CX выход max", "GGG CX объём", "GGG CX прибыль min", "GGG CX прибыль max", "Вход 24ч %", "Выход 24ч %", "Затраты chaos", "Продажа chaos",
    "Прибыль chaos", "ROI %", "Операций", "Прибыль на бюджет", "Стабильность", "Замеров", "Доверие"
  ];
  const data = rows.map((row) => [
    row.category,
    row.cardCategory ?? "",
    `${row.ratio} x ${row.input.name}`,
    `${row.outputQuantity ?? 1} x ${row.output.name}`,
    row.input.ninjaPrice, row.input.watchPrice, row.output.ninjaPrice, row.output.watchPrice,
    row.maxDiscrepancy, row.minWatchVolume,
    row.inputCx?.lowPrice, row.inputCx?.highPrice, row.outputCx?.lowPrice, row.outputCx?.highPrice,
    row.minCxVolume, row.cxProfitLow, row.cxProfitHigh,
    row.input.change24h, row.output.change24h,
    row.cost, row.sale, row.profit, row.roi, row.maxOperations, row.budgetProfit, row.streak, row.samples, row.confidence
  ]);
  const csv = [headers, ...data].map((line) => line.map(csvEscape).join(";")).join("\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `poe-arbitrage-${settings().league || "league"}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function clearHistory() {
  const league = elements.league.value.trim();
  if (!league) return;
  localStorage.removeItem(historyKey(league));
  state.history = [];
  recalculateRows();
  render();
  elements.status.className = "status success";
  elements.status.textContent = `Локальная история лиги ${league} очищена. Серверная история D1 не удалена.`;
}

function resetFilters() {
  elements.minProfit.value = "0";
  elements.minRoi.value = "0";
  elements.minStability.value = "1";
  elements.maxDiscrepancy.value = "0";
  saveSettings();
  if (state.pairs.length) {
    recalculateRows();
    render();
  }
}

const recalculationInputs = [
  elements.budget, elements.minProfit, elements.minRoi, elements.minStability,
  elements.maxDiscrepancy, elements.useSecondSource, elements.buyPremium,
  elements.sellDiscount, elements.sort, elements.notifyMinProfit, elements.notifyMinRoi,
  elements.notifyMinStability, elements.notifyCooldown, elements.notifyRequireConfirmed
];

for (const input of recalculationInputs) {
  input?.addEventListener("input", () => {
    saveSettings();
    if (state.pairs.length) {
      recalculateRows();
      render();
    }
  });
  if (input?.type === "checkbox") {
    input.addEventListener("change", () => {
      saveSettings();
      if (state.pairs.length) {
        recalculateRows();
        render();
      }
    });
  }
}

elements.autoRefresh.addEventListener("change", () => { saveSettings(); scheduleAutoRefresh(); });
elements.refresh.addEventListener("click", () => refreshData());
elements.export.addEventListener("click", exportCsv);
elements.clearHistory.addEventListener("click", clearHistory);
elements.resetFilters?.addEventListener("click", resetFilters);
elements.notificationButton?.addEventListener("click", toggleNotifications);
elements.testNotification?.addEventListener("click", testNotification);
elements.league.addEventListener("change", () => refreshData());
elements.league.addEventListener("keydown", (event) => { if (event.key === "Enter") refreshData(); });

function syncCardSubtabs() {
  if (!elements.cardSubtabsContainer) return;
  elements.cardSubtabsContainer.hidden = state.activeCategory !== "card";
}

elements.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.activeCategory = tab.dataset.category;
    for (const item of elements.tabs) {
      const active = item === tab;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    }
    syncCardSubtabs();
    render();
  });
});

elements.cardTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.activeCardCategory = tab.dataset.cardCategory;
    for (const item of elements.cardTabs) {
      const active = item === tab;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    }
    render();
  });
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && state.nextRefreshAt && Date.now() >= state.nextRefreshAt) {
    refreshData({ silent: true });
  }
});

(async function init() {
  loadNotificationMemory();
  loadSettings();
  updateNotificationUi();
  syncCardSubtabs();
  await loadLeagues();
  await refreshData();
})();
