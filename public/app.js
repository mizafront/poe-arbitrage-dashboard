"use strict";

import {
  buildEssencePairs,
  buildFixedCurrencyCardPairs,
  buildOilPairs,
  calculateOpportunity,
  normalizeExchange,
  recipeKey
} from "./core.js";
import { FIXED_CURRENCY_CARD_CATALOG } from "./cards.js";

const SETTINGS_KEY = "poe-arbitrage-settings:v2";
const HISTORY_PREFIX = "poe-arbitrage-history:v2:";
const MAX_HISTORY_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_HISTORY_SNAPSHOTS = 600;
const DEMO_MODE = new URLSearchParams(window.location.search).get("demo") === "1";

const state = {
  pairs: [],
  rows: [],
  history: [],
  activeCategory: "all",
  sourcePrimary: "Chaos Orb",
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
  buyPremium: document.querySelector("#buyPremium"),
  sellDiscount: document.querySelector("#sellDiscount"),
  autoRefresh: document.querySelector("#autoRefresh"),
  sort: document.querySelector("#sortSelect"),
  refresh: document.querySelector("#refreshButton"),
  export: document.querySelector("#exportButton"),
  clearHistory: document.querySelector("#clearHistoryButton"),
  status: document.querySelector("#status"),
  countdown: document.querySelector("#countdown"),
  body: document.querySelector("#resultsBody"),
  count: document.querySelector("#opportunityCount"),
  bestProfit: document.querySelector("#bestProfit"),
  bestBudgetProfit: document.querySelector("#bestBudgetProfit"),
  stableCount: document.querySelector("#stableCount"),
  updated: document.querySelector("#updatedAt"),
  tabs: [...document.querySelectorAll(".tab")]
};

function numberInput(element, fallback = 0) {
  const value = Number(element.value);
  return Number.isFinite(value) ? value : fallback;
}

function settings() {
  return {
    budget: Math.max(0, numberInput(elements.budget, 0)),
    minProfit: Math.max(0, numberInput(elements.minProfit, 0)),
    minRoi: Math.max(0, numberInput(elements.minRoi, 0)),
    minStability: Math.max(1, numberInput(elements.minStability, 1)),
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
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null");
    if (!saved || typeof saved !== "object") return;
    const mapping = {
      budget: elements.budget,
      minProfit: elements.minProfit,
      minRoi: elements.minRoi,
      minStability: elements.minStability,
      buyPremium: elements.buyPremium,
      sellDiscount: elements.sellDiscount,
      autoRefresh: elements.autoRefresh,
      sort: elements.sort,
      league: elements.league
    };
    for (const [key, element] of Object.entries(mapping)) {
      if (saved[key] !== undefined && saved[key] !== null) element.value = String(saved[key]);
    }
  } catch (error) {
    console.warn("Не удалось прочитать настройки:", error);
  }
}

function historyKey(league) {
  return `${HISTORY_PREFIX}${league}`;
}

function loadHistory(league) {
  try {
    const history = JSON.parse(localStorage.getItem(historyKey(league)) ?? "[]");
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
    const trimmed = history.slice(-MAX_HISTORY_SNAPSHOTS);
    localStorage.setItem(historyKey(league), JSON.stringify(trimmed));
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
        volume: item.volume
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
  state.history = state.history
    .filter((item) => item.ts >= cutoff)
    .slice(-MAX_HISTORY_SNAPSHOTS);
  saveHistory(league, state.history);
}

function opportunityAtSnapshot(pair, snapshot, currentSettings) {
  const inputCategory = pair.inputCategory ?? pair.category;
  const outputCategory = pair.outputCategory ?? pair.category;
  const input = snapshot?.prices?.[priceKey(inputCategory, pair.input.name)];
  const output = snapshot?.prices?.[priceKey(outputCategory, pair.output.name)];
  if (!input || !output) return null;
  return calculateOpportunity({
    ...pair,
    input: { ...pair.input, price: Number(input.price), volume: Number(input.volume ?? 0) },
    output: { ...pair.output, price: Number(output.price), volume: Number(output.volume ?? 0) }
  }, currentSettings);
}

function historyMetrics(pair, currentSettings) {
  const points = state.history
    .map((snapshot) => ({ snapshot, opportunity: opportunityAtSnapshot(pair, snapshot, currentSettings) }))
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
    baselinePoint = [...points].reverse().find((point) => point.snapshot.ts <= target) ?? points[0];
  }
  const marginTrend = current && baselinePoint
    ? current.profit - baselinePoint.opportunity.profit
    : Number.NaN;

  return {
    samples: points.length,
    streak,
    marginTrend
  };
}

function confidenceScore(row, metrics) {
  const historyPoints = Math.min(35, metrics.samples * 7);
  const stabilityPoints = Math.min(30, metrics.streak * 8);
  const minimumVolume = Math.max(0, Math.min(row.input.volume || 0, row.output.volume || 0));
  const volumePoints = Math.min(25, Math.log10(minimumVolume + 1) * 9);
  const marginPoints = row.roi >= 30 ? 10 : row.roi >= 15 ? 7 : row.roi > 0 ? 3 : 0;
  return Math.round(Math.min(100, historyPoints + stabilityPoints + volumePoints + marginPoints));
}

function recalculateRows() {
  const currentSettings = settings();
  state.rows = state.pairs.map((pair) => {
    const base = calculateOpportunity(pair, currentSettings);
    const metrics = historyMetrics(pair, currentSettings);
    return {
      ...base,
      ...metrics,
      confidence: confidenceScore(base, metrics),
      key: recipeKey(pair)
    };
  });
}

function currentRows() {
  const currentSettings = settings();
  return state.rows
    .filter((row) => state.activeCategory === "all" || row.category === state.activeCategory)
    .filter((row) => row.profit >= currentSettings.minProfit)
    .filter((row) => row.roi >= currentSettings.minRoi)
    .filter((row) => row.streak >= currentSettings.minStability)
    .sort((a, b) => {
      if (currentSettings.sort === "roi") return b.roi - a.roi;
      if (currentSettings.sort === "budgetProfit") return b.budgetProfit - a.budgetProfit;
      if (currentSettings.sort === "stability") return b.streak - a.streak || b.profit - a.profit;
      if (currentSettings.sort === "cost") return a.cost - b.cost;
      if (currentSettings.sort === "profit") return b.profit - a.profit;
      return b.confidence - a.confidence || b.profit - a.profit;
    });
}

function formatChaos(value) {
  if (!Number.isFinite(value)) return "—";
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} c`;
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

function itemCell(item, quantity = 1) {
  const image = item.icon
    ? `<img src="${escapeAttribute(item.icon)}" alt="" loading="lazy">`
    : "";
  const prefix = quantity > 1 ? `${quantity} × ` : "";
  return `<div class="item-cell">${image}<span class="item-name">${prefix}${escapeHtml(item.name)}<small class="item-price">${formatChaos(item.price)}</small></span></div>`;
}

function confidenceBadge(score) {
  const level = score >= 70 ? "high" : score >= 45 ? "medium" : "low";
  return `<span class="confidence-badge confidence-${level}">${score}/100</span>`;
}

function trendCell(value) {
  if (!Number.isFinite(value)) return `<span class="trend-flat">нет истории</span>`;
  const className = value > 0.05 ? "trend-up" : value < -0.05 ? "trend-down" : "trend-flat";
  const sign = value > 0 ? "+" : "";
  return `<span class="${className}">${sign}${formatChaos(value)}</span>`;
}

function render() {
  const rows = currentRows();
  const currentSettings = settings();
  elements.count.textContent = rows.length.toLocaleString("ru-RU");
  elements.bestProfit.textContent = rows.length ? formatChaos(Math.max(...rows.map((row) => row.profit))) : "—";
  elements.bestBudgetProfit.textContent = rows.length ? formatChaos(Math.max(...rows.map((row) => row.budgetProfit))) : "—";
  elements.stableCount.textContent = state.rows.filter((row) => row.streak >= currentSettings.minStability && row.profit > 0).length.toLocaleString("ru-RU");

  if (!rows.length) {
    const hint = state.history.length < currentSettings.minStability
      ? `Для фильтра «${currentSettings.minStability} замера» нужно дождаться нескольких обновлений или временно поставить 1 замер.`
      : "Нет операций, проходящих заданные фильтры.";
    elements.body.innerHTML = `<tr><td colspan="11" class="empty-state">${escapeHtml(hint)}</td></tr>`;
    return;
  }

  elements.body.innerHTML = rows.map((row) => {
    const label = row.category === "oil"
      ? "Масло"
      : row.category === "essence"
        ? "Эссенция"
        : "Карточка";
    const profitClass = row.profit >= 0 ? "profit" : "loss";
    const budgetText = row.maxOperations > 0
      ? `${formatChaos(row.budgetProfit)}<small class="item-price">${row.maxOperations} оп.</small>`
      : "—";
    return `
      <tr title="Теоретическая прибыль без запаса: ${formatChaos(row.theoreticalProfit)}">
        <td><span class="category-badge">${label}</span></td>
        <td>${itemCell(row.input, row.ratio)}</td>
        <td>${itemCell(row.output, row.outputQuantity ?? 1)}</td>
        <td class="number">${formatChaos(row.cost)}</td>
        <td class="number">${formatChaos(row.sale)}</td>
        <td class="number ${profitClass}">${formatChaos(row.profit)}</td>
        <td class="number ${profitClass}">${formatPercent(row.roi)}</td>
        <td class="number ${profitClass}">${budgetText}</td>
        <td class="number"><span class="stability-badge">${row.streak} / ${row.samples}</span></td>
        <td class="number">${trendCell(row.marginTrend)}</td>
        <td class="number">${confidenceBadge(row.confidence)}</td>
      </tr>`;
  }).join("");
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
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
      ["The Hoarder", 3.2, 170], ["Lucky Connections", 1.1, 90], ["The Seeker", 9, 55]
    ],
    Currency: [
      ["Chaos Orb", 1, 10000], ["Divine Orb", 150, 3400], ["Exalted Orb", 12, 3100],
      ["Orb of Fusing", 0.24, 7000], ["Orb of Annulment", 28, 900]
    ]
  };
  const items = {};
  const lines = (demoItems[type] ?? []).map(([name, price, volume], index) => {
    const id = `${type.toLowerCase()}-${index}`;
    items[id] = { id, name, icon: "" };
    return { id, primaryValue: price, volumePrimaryValue: volume };
  });
  return { core: { primary: "chaos", items }, lines };
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

    // Always expose the permanent Standard league, even if the upstream
    // endpoint temporarily omits it or an older cached response is returned.
    const leagues = [...sourceLeagues];
    const knownSourceIds = new Set(leagues.map((league) => league?.id ?? league?.name ?? league));
    if (!knownSourceIds.has("Standard")) {
      leagues.push({ id: "Standard", name: "Standard", current: false });
    }

    elements.leagueOptions.innerHTML = leagues.map((league) => {
      const id = league?.id ?? league?.name ?? league;
      return `<option value="${escapeAttribute(id)}"></option>`;
    }).join("");

    const currentLeague = leagues.find((league) => league?.current)?.id;
    const knownIds = leagues.map((league) => league?.id ?? league?.name ?? league);
    if (currentLeague && !knownIds.includes(elements.league.value.trim())) {
      elements.league.value = currentLeague;
    }
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
    elements.status.textContent = "Загружаю масла, эссенции, карточки и валюту…";
  }

  try {
    const [oilPayload, essencePayload, cardPayload, currencyPayload] = DEMO_MODE
      ? [demoPayload("Oil"), demoPayload("Essence"), demoPayload("DivinationCard"), demoPayload("Currency")]
      : await Promise.all([
          fetchJson(`/api/prices?league=${encodeURIComponent(league)}&type=Oil`),
          fetchJson(`/api/prices?league=${encodeURIComponent(league)}&type=Essence`),
          fetchJson(`/api/prices?league=${encodeURIComponent(league)}&type=DivinationCard`),
          fetchJson(`/api/prices?league=${encodeURIComponent(league)}&type=Currency`)
        ]);

    const oilsNormalized = normalizeExchange(oilPayload);
    const essencesNormalized = normalizeExchange(essencePayload);
    const cardsNormalized = normalizeExchange(cardPayload);
    const currencyNormalized = normalizeExchange(currencyPayload);
    const oils = oilsNormalized.items;
    const essences = essencesNormalized.items;
    const cards = cardsNormalized.items;
    const currencies = currencyNormalized.items;
    state.sourcePrimary = oilsNormalized.primaryName || essencesNormalized.primaryName || cardsNormalized.primaryName || currencyNormalized.primaryName || "Chaos Orb";
    const cardPairs = buildFixedCurrencyCardPairs(cards, currencies, FIXED_CURRENCY_CARD_CATALOG);
    state.pairs = [...buildOilPairs(oils), ...buildEssencePairs(essences), ...cardPairs];

    state.history = loadHistory(league);
    appendSnapshot(league, createSnapshot({ oil: oils, essence: essences, card: cards, currency: currencies }));
    recalculateRows();
    saveSettings();

    const now = new Date();
    elements.updated.textContent = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    elements.status.className = "status success";
    elements.status.textContent = `${DEMO_MODE ? "Демо: " : ""}получено ${oils.length} масел, ${essences.length} эссенций, ${cards.length} карточек и ${currencies.length} валют. Фиксированных карточных цепочек: ${cardPairs.length}. Валюта расчёта: ${state.sourcePrimary}. История: ${state.history.length} замеров.`;
    render();
    scheduleAutoRefresh();
  } catch (error) {
    console.error(error);
    elements.status.className = "status error";
    elements.status.textContent = `Не удалось получить данные: ${error.message}`;
    elements.body.innerHTML = `<tr><td colspan="11" class="empty-state">Проверьте функции /api/leagues и /api/prices. Для просмотра интерфейса откройте адрес с параметром ?demo=1.</td></tr>`;
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
    if (document.visibilityState === "visible") refreshData({ silent: true });
    else scheduleAutoRefresh();
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
  const headers = ["Категория", "Покупка", "Результат", "Затраты chaos", "Продажа chaos", "Прибыль chaos", "ROI %", "Операций", "Прибыль на бюджет", "Стабильность", "Замеров", "Тренд маржи", "Доверие"];
  const data = rows.map((row) => [
    row.category,
    `${row.ratio} x ${row.input.name}`,
    `${row.outputQuantity ?? 1} x ${row.output.name}`,
    row.cost,
    row.sale,
    row.profit,
    row.roi,
    row.maxOperations,
    row.budgetProfit,
    row.streak,
    row.samples,
    row.marginTrend,
    row.confidence
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
  elements.status.textContent = `История лиги ${league} очищена. Новый замер появится после обновления цен.`;
}

const recalculationInputs = [
  elements.budget,
  elements.minProfit,
  elements.minRoi,
  elements.minStability,
  elements.buyPremium,
  elements.sellDiscount,
  elements.sort
];

for (const input of recalculationInputs) {
  input.addEventListener("input", () => {
    saveSettings();
    if (state.pairs.length) {
      recalculateRows();
      render();
    }
  });
}

elements.autoRefresh.addEventListener("change", () => {
  saveSettings();
  scheduleAutoRefresh();
});
elements.refresh.addEventListener("click", () => refreshData());
elements.export.addEventListener("click", exportCsv);
elements.clearHistory.addEventListener("click", clearHistory);
elements.league.addEventListener("change", () => refreshData());
elements.league.addEventListener("keydown", (event) => {
  if (event.key === "Enter") refreshData();
});

elements.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.activeCategory = tab.dataset.category;
    for (const item of elements.tabs) {
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
  loadSettings();
  await loadLeagues();
  await refreshData();
})();
