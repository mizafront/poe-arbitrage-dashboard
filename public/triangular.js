"use strict";

import {
  buildDirectedExchangeEdges,
  findTriangularCycles,
  supportedCurrencies,
  supportedIntermediateCategories,
} from "./triangular-core.js";

const SETTINGS_KEY = "poe-triangular-arbitrage:v1";

const state = {
  payload: null,
  graph: null,
  cycles: [],
  loading: false,
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value, maximumFractionDigits = 2) {
  if (!Number.isFinite(Number(value))) return "—";
  return Number(value).toLocaleString("ru-RU", {
    maximumFractionDigits,
  });
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return "—";
  return `${formatNumber(value, 2)}%`;
}

function formatHour(timestamp) {
  const number = Number(timestamp);
  if (!Number.isFinite(number)) return "неизвестно";

  return new Date(number * 1000).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function numberValue(element, fallback = 0) {
  const value = Number(element?.value);
  return Number.isFinite(value) ? value : fallback;
}

function panelMarkup() {
  return `
    <section id="trianglePanel" class="panel triangle-panel" aria-labelledby="triangleTitle">
      <div class="triangle-heading">
        <div>
          <div class="eyebrow">ВАЛЮТНЫЕ ЦЕПОЧКИ</div>
          <h2 id="triangleTitle">Треугольный арбитраж</h2>
          <p class="triangle-intro">
            Ищет циклы <strong>A → B → C → A</strong> по официальным рынкам GGG
            за последний завершённый час. Результат является кандидатом для ручной
            проверки, а не гарантией исполнения.
          </p>
        </div>
        <button id="triangleRefresh" class="primary" type="button">
          Найти цепочки
        </button>
      </div>

      <div class="triangle-controls">
        <label>
          Стартовая валюта
          <select id="triangleStart"></select>
        </label>

        <label>
          Бюджет
          <input id="triangleBudget" type="number" min="0.01" step="0.01" value="100">
        </label>

        <label>
          Мин. прибыль
          <input id="triangleMinProfit" type="number" min="0" step="0.01" value="1">
        </label>

        <label>
          Мин. ROI, %
          <input id="triangleMinRoi" type="number" min="0" step="0.1" value="0.5">
        </label>

        <label>
          Расчёт курса
          <select id="triangleMode">
            <option value="conservative">Консервативный</option>
            <option value="midpoint">Средний диапазон</option>
          </select>
        </label>

        <label>
          Запас на шаг, %
          <input id="triangleSafety" type="number" min="0" max="25" step="0.1" value="1">
        </label>

        <label>
          Макс. разброс курса, %
          <input id="triangleMaxSpread" type="number" min="0" step="1" value="25">
          <small>0 — использовать обязательный предел 50%</small>
        </label>

        <label>
          Макс. доля часового объёма, %
          <input id="triangleMaxUtilization" type="number" min="0" step="1" value="10">
          <small>0 — использовать обязательный предел 25%</small>
        </label>
      </div>

      <fieldset class="triangle-categories">
        <legend>Разрешённые промежуточные категории</legend>
        <div id="triangleCategoryOptions"></div>
      </fieldset>

      <div class="triangle-note">
        Поиск теперь включает обычную валюту, все основные эссенции и
        первый проверенный набор скарабеев. Каждый шаг выполняется только целыми
        торговыми лотами. Маршрут автоматически отклоняется при недостаточном
        часовом объёме, чрезмерном разбросе или единичном рынке. Неизвестные
        Metadata ID скарабеев намеренно пропускаются.
      </div>

      <div class="triangle-metrics">
        <div class="metric-card">
          <span>Рынков использовано</span>
          <strong id="triangleMarketCount">—</strong>
        </div>
        <div class="metric-card">
          <span>Активов в графе</span>
          <strong id="triangleCurrencyCount">—</strong>
        </div>
        <div class="metric-card">
          <span>Найдено цепочек</span>
          <strong id="triangleCycleCount">—</strong>
        </div>
        <div class="metric-card">
          <span>Час данных GGG</span>
          <strong id="triangleHour">—</strong>
        </div>
      </div>

      <div id="triangleCategorySummary" class="triangle-category-summary"></div>

      <div id="triangleStatus" class="triangle-status" aria-live="polite">
        Подготовка модуля…
      </div>
      <div id="triangleResults" class="triangle-results"></div>
    </section>
  `;
}

function insertPanel() {
  if (document.querySelector("#trianglePanel")) return;

  const template = document.createElement("template");
  template.innerHTML = panelMarkup().trim();
  const panel = template.content.firstElementChild;
  const notice = document.querySelector("main > .notice, .notice");
  const main = document.querySelector("main");

  if (notice?.parentNode) {
    notice.parentNode.insertBefore(panel, notice);
  } else if (main) {
    main.append(panel);
  } else {
    document.body.append(panel);
  }
}

function elements() {
  return {
    league: document.querySelector("#leagueInput"),
    mainBudget: document.querySelector("#budget"),
    mainMinProfit: document.querySelector("#minProfit"),
    mainMinRoi: document.querySelector("#minRoi"),
    globalRefresh: document.querySelector("#refreshButton"),
    start: document.querySelector("#triangleStart"),
    budget: document.querySelector("#triangleBudget"),
    minProfit: document.querySelector("#triangleMinProfit"),
    minRoi: document.querySelector("#triangleMinRoi"),
    mode: document.querySelector("#triangleMode"),
    safety: document.querySelector("#triangleSafety"),
    maxSpread: document.querySelector("#triangleMaxSpread"),
    maxUtilization: document.querySelector("#triangleMaxUtilization"),
    categoryOptions: document.querySelector("#triangleCategoryOptions"),
    categorySummary: document.querySelector("#triangleCategorySummary"),
    refresh: document.querySelector("#triangleRefresh"),
    status: document.querySelector("#triangleStatus"),
    results: document.querySelector("#triangleResults"),
    marketCount: document.querySelector("#triangleMarketCount"),
    currencyCount: document.querySelector("#triangleCurrencyCount"),
    cycleCount: document.querySelector("#triangleCycleCount"),
    hour: document.querySelector("#triangleHour"),
  };
}

function populateCategoryOptions() {
  const ui = elements();
  if (!ui.categoryOptions) return;

  ui.categoryOptions.innerHTML = supportedIntermediateCategories()
    .map(
      (category) => `
        <label class="triangle-category-option">
          <input
            type="checkbox"
            name="triangleCategory"
            value="${escapeHtml(category.key)}"
            checked
          >
          <span>${escapeHtml(category.name)}</span>
        </label>
      `,
    )
    .join("");
}

function selectedCategories() {
  return [
    ...document.querySelectorAll(
      'input[name="triangleCategory"]:checked',
    ),
  ].map((element) => element.value);
}

function readSettings() {
  const ui = elements();

  return {
    startCurrency: ui.start?.value || "chaos-orb",
    budget: Math.max(0.01, numberValue(ui.budget, 100)),
    minProfit: Math.max(0, numberValue(ui.minProfit, 1)),
    minRoi: Math.max(0, numberValue(ui.minRoi, 0.5)),
    mode: ui.mode?.value === "midpoint" ? "midpoint" : "conservative",
    safetyPercent: Math.max(0, numberValue(ui.safety, 1)),
    maxSpread: Math.max(0, numberValue(ui.maxSpread, 25)),
    maxVolumeUtilization: Math.max(
      0,
      numberValue(ui.maxUtilization, 10),
    ),
    allowedIntermediateCategories: selectedCategories(),
  };
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(readSettings()));
  } catch (error) {
    console.warn("Не удалось сохранить настройки цепочек:", error);
  }
}

function loadSettings() {
  const ui = elements();

  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null");
    if (!saved || typeof saved !== "object") return;

    const mapping = {
      startCurrency: ui.start,
      budget: ui.budget,
      minProfit: ui.minProfit,
      minRoi: ui.minRoi,
      mode: ui.mode,
      safetyPercent: ui.safety,
      maxSpread: ui.maxSpread,
      maxVolumeUtilization: ui.maxUtilization,
    };

    for (const [key, element] of Object.entries(mapping)) {
      if (element && saved[key] !== undefined) {
        element.value = String(saved[key]);
      }
    }

    if (Array.isArray(saved.allowedIntermediateCategories)) {
      const allowed = new Set(saved.allowedIntermediateCategories);

      for (const checkbox of document.querySelectorAll(
        'input[name="triangleCategory"]',
      )) {
        checkbox.checked = allowed.has(checkbox.value);
      }
    }
  } catch (error) {
    console.warn("Не удалось загрузить настройки цепочек:", error);
  }
}

function populateCurrencySelect(availableKeys = new Set()) {
  const ui = elements();
  if (!ui.start) return;

  const previous = ui.start.value;
  const currencies = supportedCurrencies().filter(
    (currency) => !availableKeys.size || availableKeys.has(currency.key),
  );

  ui.start.innerHTML = currencies
    .map(
      (currency) =>
        `<option value="${escapeHtml(currency.key)}">${escapeHtml(currency.name)}</option>`,
    )
    .join("");

  if (currencies.some((currency) => currency.key === previous)) {
    ui.start.value = previous;
  } else if (currencies.some((currency) => currency.key === "chaos-orb")) {
    ui.start.value = "chaos-orb";
  }
}

function routeText(cycle) {
  return cycle.currencies.map((currency) => currency.short).join(" → ");
}

function categoryLabel(category) {
  if (category === "essence") return "эссенция";
  if (category === "scarab") return "скарабей";
  return "валюта";
}

function riskLabel(risk) {
  if (risk === "high") return "высокий";
  if (risk === "medium") return "средний";
  return "низкий";
}

function renderCycle(cycle, index) {
  const steps = cycle.edges
    .map(
      (edge, stepIndex) => `
        <li>
          <div>
            <strong>
              ${stepIndex + 1}. ${escapeHtml(edge.from.short)}
              → ${escapeHtml(edge.to.short)}
              <em>${escapeHtml(categoryLabel(edge.to.category))}</em>
            </strong>
            <span>×${formatNumber(edge.safeRate, 6)}</span>
          </div>
          <small>
            Доступно ${formatNumber(edge.availableInput, 0)}
            ${escapeHtml(edge.from.short)}; обменено
            ${formatNumber(edge.requiredInput, 0)}
            ${escapeHtml(edge.from.short)}
            (${formatNumber(edge.tradeLots, 0)} лот.);
            получено ${formatNumber(edge.resultingAmount, 0)}
            ${escapeHtml(edge.to.short)};
            остаток ${formatNumber(edge.leftoverInput, 0)}
            ${escapeHtml(edge.from.short)};
            лот ${formatNumber(edge.fromLot, 0)}:${formatNumber(edge.toLot, 0)};
            объём входа/выхода
            ${formatNumber(edge.volumeIn, 0)}/${formatNumber(edge.volumeOut, 0)};
            доступно около ${formatNumber(edge.observedLotCapacity, 0)} лот.;
            используется ${formatPercent(edge.inputUtilizationPercent)}
            входа и ${formatPercent(edge.outputUtilizationPercent)} выхода;
            разброс ${formatPercent(edge.spreadPercent)}
          </small>
        </li>
      `,
    )
    .join("");

  return `
    <article class="triangle-card">
      <div class="triangle-card-head">
        <div>
          <span class="triangle-rank">#${index + 1}</span>
          <h3>${escapeHtml(routeText(cycle))}</h3>
          <div class="triangle-route-categories">
            ${cycle.intermediateCategories
              .map(
                (category) =>
                  `<span>${escapeHtml(categoryLabel(category))}</span>`,
              )
              .join("")}
          </div>
        </div>
        <span class="triangle-risk triangle-risk-${cycle.risk}">
          риск: ${riskLabel(cycle.risk)}
        </span>
      </div>

      <div class="triangle-card-metrics">
        <div>
          <span>Старт</span>
          <strong>${formatNumber(cycle.budget, 0)} ${escapeHtml(cycle.startCurrency.short)}</strong>
        </div>
        <div>
          <span>Результат с запасом</span>
          <strong>${formatNumber(cycle.safeResult, 0)} ${escapeHtml(cycle.startCurrency.short)}</strong>
        </div>
        <div>
          <span>Расчётная прибыль</span>
          <strong class="${cycle.safeProfit > 0 ? "triangle-positive" : "triangle-negative"}">
            ${cycle.safeProfit > 0 ? "+" : ""}${formatNumber(cycle.safeProfit, 0)}
            ${escapeHtml(cycle.startCurrency.short)}
          </strong>
        </div>
        <div>
          <span>ROI</span>
          <strong>${formatPercent(cycle.roi)}</strong>
        </div>
      </div>

      <div class="triangle-secondary">
        Валовая прибыль: ${cycle.grossProfit > 0 ? "+" : ""}${formatNumber(cycle.grossProfit)}
        ${escapeHtml(cycle.startCurrency.short)} ·
        максимальный разброс: ${formatPercent(cycle.maxSpread)} ·
        максимальная доля часового объёма: ${formatPercent(cycle.maxUtilization)}
      </div>

      <details>
        <summary>Показать все шаги</summary>
        <ol class="triangle-steps">${steps}</ol>
      </details>
    </article>
  `;
}

function render() {
  const ui = elements();

  if (!state.graph || !state.payload) {
    ui.results.innerHTML = "";
    return;
  }

  const settings = readSettings();
  state.cycles = findTriangularCycles(state.graph.edges, settings);

  ui.marketCount.textContent =
    state.graph.diagnostics.usableMarkets.toLocaleString("ru-RU");

  const currencyKeys = new Set();
  for (const edge of state.graph.edges) {
    currencyKeys.add(edge.from.key);
    currencyKeys.add(edge.to.key);
  }

  ui.currencyCount.textContent = currencyKeys.size.toLocaleString("ru-RU");
  ui.cycleCount.textContent = state.cycles.length.toLocaleString("ru-RU");

  if (ui.categorySummary) {
    const counts = state.graph.diagnostics.assetsByCategory ?? {};
    ui.categorySummary.textContent =
      `Распознано: валют ${counts.currency ?? 0}, ` +
      `эссенций ${counts.essence ?? 0}, ` +
      `скарабеев ${counts.scarab ?? 0}.`;
  }
  ui.hour.textContent = formatHour(state.payload?.hour);

  if (!state.cycles.length) {
    ui.status.textContent =
      "Исполнимых прибыльных циклов с текущими фильтрами не найдено.";

    ui.results.innerHTML = `
      <div class="triangle-empty">
        <strong>Цепочек пока нет</strong>
        <p>
          Попробуйте уменьшить «Мин. прибыль», снизить запас на шаг,
          увеличить допустимый разброс или выбрать режим «Средний диапазон».
          Последний режим менее консервативен и требует особенно тщательной
          ручной проверки.
        </p>
      </div>
    `;
    return;
  }

  const shown = state.cycles.slice(0, 25);
  ui.status.textContent =
    `Показано ${shown.length} из ${state.cycles.length} цепочек. ` +
    `Расчёт: ${settings.mode === "midpoint" ? "средний диапазон" : "консервативный"}.`;

  ui.results.innerHTML = shown.map(renderCycle).join("");
}

async function refresh({ silent = false } = {}) {
  if (state.loading) return;
  state.loading = true;

  const ui = elements();
  const league = ui.league?.value?.trim() || "Standard";

  if (!silent) {
    ui.status.textContent = `Загрузка рынков GGG для лиги ${league}…`;
  }

  ui.refresh.disabled = true;
  ui.refresh.textContent = "Загрузка…";

  try {
    const response = await fetch(
      `/api/currency-exchange?league=${encodeURIComponent(league)}`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
    );

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error || `HTTP ${response.status}`);
    }

    if (!payload?.configured) {
      throw new Error("Currency Exchange API не настроен.");
    }

    if (!payload?.available || !Array.isArray(payload?.markets)) {
      throw new Error(
        "За доступный завершённый час рынки выбранной лиги не найдены.",
      );
    }

    state.payload = payload;
    state.graph = buildDirectedExchangeEdges(payload.markets);

    const availableKeys = new Set();
    for (const edge of state.graph.edges) {
      availableKeys.add(edge.from.key);
      availableKeys.add(edge.to.key);
    }

    const previousStart = ui.start.value;
    populateCurrencySelect(availableKeys);

    if (availableKeys.has(previousStart)) {
      ui.start.value = previousStart;
    }

    render();
  } catch (error) {
    state.payload = null;
    state.graph = null;
    state.cycles = [];

    ui.marketCount.textContent = "—";
    ui.currencyCount.textContent = "—";
    ui.cycleCount.textContent = "—";
    ui.hour.textContent = "—";
    ui.status.textContent = `Ошибка: ${error instanceof Error ? error.message : String(error)}`;
    ui.results.innerHTML = "";
  } finally {
    state.loading = false;
    ui.refresh.disabled = false;
    ui.refresh.textContent = "Найти цепочки";
  }
}

function bindEvents() {
  const ui = elements();
  const controls = [
    ui.start,
    ui.budget,
    ui.minProfit,
    ui.minRoi,
    ui.mode,
    ui.safety,
    ui.maxSpread,
    ui.maxUtilization,
    ...document.querySelectorAll('input[name="triangleCategory"]'),
  ].filter(Boolean);

  for (const control of controls) {
    control.addEventListener("change", () => {
      saveSettings();
      render();
    });

    if (control instanceof HTMLInputElement) {
      control.addEventListener("input", () => {
        saveSettings();
        render();
      });
    }
  }

  ui.refresh?.addEventListener("click", () => refresh());

  ui.globalRefresh?.addEventListener("click", () => {
    window.setTimeout(() => refresh({ silent: true }), 300);
  });

  ui.league?.addEventListener("change", () => refresh());

  ui.mainBudget?.addEventListener("change", () => {
    if (ui.budget) {
      ui.budget.value = ui.mainBudget.value;
      saveSettings();
      render();
    }
  });
}

function syncDefaultsFromMainForm() {
  const ui = elements();

  if (ui.mainBudget && ui.budget) {
    ui.budget.value = ui.mainBudget.value || "100";
  }

  if (ui.mainMinProfit && ui.minProfit) {
    ui.minProfit.value = ui.mainMinProfit.value || "0";
  }

  if (ui.mainMinRoi && ui.minRoi) {
    ui.minRoi.value = ui.mainMinRoi.value || "0";
  }
}

function init() {
  insertPanel();
  populateCurrencySelect();
  populateCategoryOptions();
  syncDefaultsFromMainForm();
  loadSettings();
  bindEvents();
  refresh();

  window.setInterval(() => {
    if (!document.hidden) refresh({ silent: true });
  }, 15 * 60 * 1000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
