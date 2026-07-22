"use strict";

import {
  analyzeGuaranteedChains,
  HARD_MAX_HOURLY_VOLUME_PERCENT,
  routeTypeLabel,
} from "./triangular-core.js";

const SETTINGS_KEY = "poe-guaranteed-chains:v0.13.0";

const state = {
  marketData: null,
  analysis: null,
};

const TYPE_OPTIONS = Object.freeze([
  {
    key: "vendor",
    name: "Обмены торговцев",
    description: "Фиксированные курсы NPC",
  },
  {
    key: "shard",
    name: "Осколки",
    description: "20 осколков автоматически собираются в целую валюту",
  },
  {
    key: "splinter",
    name: "Сплинтеры",
    description: "Сборка эмблем, ключей и специальных предметов",
  },
  {
    key: "stack",
    name: "Прочие стаки",
    description: "Другие автоматические сборки, например Scroll Fragment 5:1",
  },
  {
    key: "oil",
    name: "Масла",
    description: "Несколько улучшений 3:1 подряд",
  },
  {
    key: "essence",
    name: "Эссенции",
    description: "Несколько улучшений 3:1 подряд",
  },
  {
    key: "card",
    name: "Карты + продолжение",
    description: "Комплект карт, затем ещё одно преобразование",
  },
]);

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function numberInput(element, fallback = 0) {
  const value = Number(element?.value);
  return Number.isFinite(value) ? value : fallback;
}

function formatNumber(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return number.toLocaleString("ru-RU", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

function formatPercent(value, digits = 2) {
  const number = Number(value);
  return Number.isFinite(number)
    ? `${formatNumber(number, digits)}%`
    : "—";
}

function insertPanel() {
  if (document.querySelector("#trianglePanel")) return;
  const notice = document.querySelector("main .notice");
  if (!notice) return;

  const panel = document.createElement("section");
  panel.id = "trianglePanel";
  panel.className = "panel triangle-panel";
  panel.innerHTML = `
    <div class="triangle-heading">
      <div>
        <p class="eyebrow">ГАРАНТИРОВАННЫЕ ПРЕОБРАЗОВАНИЯ</p>
        <h2>Многошаговые цепочки</h2>
        <p class="triangle-intro">
          Поиск маршрутов длиной до пяти шагов: покупка за Chaos,
          сборка осколков или сплинтеров, обмены торговцев, рецепты и продажа
          результата. Чистые рыночные циклы по историческим курсам GGG
          больше не используются.
        </p>
      </div>
      <button id="triangleRefresh" class="primary-button" type="button">
        Пересчитать цепочки
      </button>
    </div>

    <div class="triangle-controls">
      <label>
        Бюджет, Chaos
        <input id="triangleBudget" type="number" min="0" step="10" value="100">
      </label>
      <label>
        Мин. прибыль, Chaos
        <input id="triangleMinProfit" type="number" min="0" step="0.1" value="1">
      </label>
      <label>
        Мин. ROI, %
        <input id="triangleMinRoi" type="number" min="0" step="1" value="5">
      </label>
      <label>
        Максимальная длина
        <select id="triangleMaxSteps">
          <option value="3">3 шага</option>
          <option value="4">4 шага</option>
          <option value="5" selected>5 шагов</option>
        </select>
        <small>Покупка и продажа тоже считаются шагами</small>
      </label>
      <label>
        Наценка покупки, %
        <input id="triangleBuyPremium" type="number" min="0" max="100" step="1" value="5">
      </label>
      <label>
        Скидка продажи, %
        <input id="triangleSellDiscount" type="number" min="0" max="100" step="1" value="10">
      </label>
      <label>
        Макс. расхождение источников, %
        <input id="triangleMaxDiscrepancy" type="number" min="0" max="100" step="1" value="15">
        <small>0 — не фильтровать</small>
      </label>
      <label>
        Макс. доля объёма GGG, %
        <input id="triangleMaxUtilization" type="number" min="0" max="25" step="1" value="25">
        <small>Жёсткий предел — ${HARD_MAX_HOURLY_VOLUME_PERCENT}%</small>
      </label>
    </div>

    <fieldset class="triangle-categories">
      <legend>Разрешённые преобразования</legend>
      <div id="triangleCategoryOptions"></div>
      <div class="triangle-category-summary" id="triangleCategorySummary">
        Ожидание рыночных данных…
      </div>
    </fieldset>

    <div class="triangle-chain-flags">
      <label class="triangle-category-option">
        <input id="triangleUseSecondSource" type="checkbox" checked>
        <span>Консервативно по poe.ninja + poe.watch</span>
      </label>
      <label class="triangle-category-option">
        <input id="triangleRequireConfirmed" type="checkbox">
        <span>Только две подтверждённые цены</span>
      </label>
      <label class="triangle-category-option">
        <input id="triangleRequireLiquidity" type="checkbox">
        <span>Требовать рынки GGG для входа и выхода</span>
      </label>
    </div>

    <div class="triangle-note">
      Одиночные улучшения масел, эссенций и обычная сдача комплекта карт
      намеренно исключены: они уже показаны в основной таблице. Сборка осколков,
      сплинтеров и других полных стаков показывается даже одним фиксированным
      шагом, а также может продолжаться через обмен торговца или другой рецепт.
    </div>

    <div class="triangle-metrics">
      <article class="metric-card">
        <span>Фиксированных переходов</span>
        <strong id="triangleMarketCount">—</strong>
      </article>
      <article class="metric-card">
        <span>Маршрутов проверено</span>
        <strong id="triangleCurrencyCount">—</strong>
      </article>
      <article class="metric-card">
        <span>Выгодных цепочек</span>
        <strong id="triangleCycleCount">—</strong>
      </article>
      <article class="metric-card">
        <span>Лучшая прибыль</span>
        <strong id="triangleHour">—</strong>
      </article>
    </div>

    <details id="triangleDiagnostics" class="triangle-diagnostics" open>
      <summary>Диагностика поиска</summary>
      <div class="triangle-diagnostic-metrics">
        <div>
          <span>Сгенерировано маршрутов</span>
          <strong id="triangleCheckedRoutes">—</strong>
        </div>
        <div>
          <span>Рассчитано по бюджету</span>
          <strong id="triangleExecutableRoutes">—</strong>
        </div>
        <div>
          <span>Отклонено</span>
          <strong id="triangleRejectedRoutes">—</strong>
        </div>
        <div>
          <span>Принято</span>
          <strong id="triangleAcceptedRoutes">—</strong>
        </div>
      </div>
      <p class="triangle-diagnostic-help">
        Каждый маршрут получает одну первую причину отказа. Часовые данные GGG
        используются только для оценки объёма, но не для расчёта цены.
      </p>
      <div id="triangleRejectReasons" class="triangle-reject-reasons"></div>
      <div id="triangleNearestRoutes" class="triangle-nearest-routes"></div>
    </details>

    <p id="triangleStatus" class="triangle-status" aria-live="polite">
      Ожидание загрузки цен основного сканера…
    </p>
    <div id="triangleResults" class="triangle-results"></div>
  `;
  notice.before(panel);
}

function elements() {
  return {
    panel: document.querySelector("#trianglePanel"),
    budget: document.querySelector("#triangleBudget"),
    minProfit: document.querySelector("#triangleMinProfit"),
    minRoi: document.querySelector("#triangleMinRoi"),
    maxSteps: document.querySelector("#triangleMaxSteps"),
    buyPremium: document.querySelector("#triangleBuyPremium"),
    sellDiscount: document.querySelector("#triangleSellDiscount"),
    maxDiscrepancy: document.querySelector("#triangleMaxDiscrepancy"),
    maxUtilization: document.querySelector("#triangleMaxUtilization"),
    useSecondSource: document.querySelector("#triangleUseSecondSource"),
    requireConfirmed: document.querySelector("#triangleRequireConfirmed"),
    requireLiquidity: document.querySelector("#triangleRequireLiquidity"),
    categoryOptions: document.querySelector("#triangleCategoryOptions"),
    categorySummary: document.querySelector("#triangleCategorySummary"),
    refresh: document.querySelector("#triangleRefresh"),
    status: document.querySelector("#triangleStatus"),
    results: document.querySelector("#triangleResults"),
    fixedCount: document.querySelector("#triangleMarketCount"),
    checkedCount: document.querySelector("#triangleCurrencyCount"),
    acceptedCount: document.querySelector("#triangleCycleCount"),
    bestProfit: document.querySelector("#triangleHour"),
    generatedRoutes: document.querySelector("#triangleCheckedRoutes"),
    evaluatedRoutes: document.querySelector("#triangleExecutableRoutes"),
    rejectedRoutes: document.querySelector("#triangleRejectedRoutes"),
    acceptedRoutes: document.querySelector("#triangleAcceptedRoutes"),
    rejectReasons: document.querySelector("#triangleRejectReasons"),
    nearestRoutes: document.querySelector("#triangleNearestRoutes"),
    mainBudget: document.querySelector("#budget"),
    mainMinProfit: document.querySelector("#minProfit"),
    mainMinRoi: document.querySelector("#minRoi"),
    mainBuyPremium: document.querySelector("#buyPremium"),
    mainSellDiscount: document.querySelector("#sellDiscount"),
    mainMaxDiscrepancy: document.querySelector("#maxDiscrepancy"),
    mainUseSecondSource: document.querySelector("#useSecondSource"),
  };
}

function populateTypeOptions() {
  const ui = elements();
  if (!ui.categoryOptions) return;
  ui.categoryOptions.innerHTML = TYPE_OPTIONS.map(
    (option) => `
      <label class="triangle-category-option" title="${escapeHtml(option.description)}">
        <input
          type="checkbox"
          name="triangleCategory"
          value="${escapeHtml(option.key)}"
          checked
        >
        <span>${escapeHtml(option.name)}</span>
      </label>
    `,
  ).join("");
}

function selectedTypes() {
  return [
    ...document.querySelectorAll('input[name="triangleCategory"]:checked'),
  ].map((input) => input.value);
}

function readSettings() {
  const ui = elements();
  return {
    budget: Math.max(0, numberInput(ui.budget, 0)),
    minProfit: Math.max(0, numberInput(ui.minProfit, 0)),
    minRoi: Math.max(0, numberInput(ui.minRoi, 0)),
    maxTotalSteps: Math.max(3, Math.min(5, numberInput(ui.maxSteps, 5))),
    buyPremium: Math.max(0, numberInput(ui.buyPremium, 0)),
    sellDiscount: Math.max(0, numberInput(ui.sellDiscount, 0)),
    maxDiscrepancy: Math.max(0, numberInput(ui.maxDiscrepancy, 0)),
    maxCxUtilization: Math.max(0, numberInput(ui.maxUtilization, 25)),
    useSecondSource: Boolean(ui.useSecondSource?.checked),
    requireConfirmed: Boolean(ui.requireConfirmed?.checked),
    requireGggLiquidity: Boolean(ui.requireLiquidity?.checked),
    enabledTypes: selectedTypes(),
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
      budget: ui.budget,
      minProfit: ui.minProfit,
      minRoi: ui.minRoi,
      maxTotalSteps: ui.maxSteps,
      buyPremium: ui.buyPremium,
      sellDiscount: ui.sellDiscount,
      maxDiscrepancy: ui.maxDiscrepancy,
      maxCxUtilization: ui.maxUtilization,
    };
    for (const [key, element] of Object.entries(mapping)) {
      if (element && saved[key] !== undefined) element.value = String(saved[key]);
    }
    if (ui.useSecondSource && saved.useSecondSource !== undefined) {
      ui.useSecondSource.checked = Boolean(saved.useSecondSource);
    }
    if (ui.requireConfirmed && saved.requireConfirmed !== undefined) {
      ui.requireConfirmed.checked = Boolean(saved.requireConfirmed);
    }
    if (ui.requireLiquidity && saved.requireGggLiquidity !== undefined) {
      ui.requireLiquidity.checked = Boolean(saved.requireGggLiquidity);
    }
    if (Array.isArray(saved.enabledTypes)) {
      for (const input of document.querySelectorAll('input[name="triangleCategory"]')) {
        input.checked = saved.enabledTypes.includes(input.value);
      }
    }
  } catch (error) {
    console.warn("Не удалось прочитать настройки цепочек:", error);
  }
}

function syncDefaultsFromMainForm() {
  const ui = elements();
  const mappings = [
    [ui.mainBudget, ui.budget],
    [ui.mainMinProfit, ui.minProfit],
    [ui.mainMinRoi, ui.minRoi],
    [ui.mainBuyPremium, ui.buyPremium],
    [ui.mainSellDiscount, ui.sellDiscount],
    [ui.mainMaxDiscrepancy, ui.maxDiscrepancy],
  ];
  for (const [source, target] of mappings) {
    if (source && target) target.value = source.value;
  }
  if (ui.mainUseSecondSource && ui.useSecondSource) {
    ui.useSecondSource.checked = ui.mainUseSecondSource.checked;
  }
}

function routeText(route) {
  const names = [route.inputItem.name];
  for (const edge of route.path) names.push(edge.to.name);
  return ["Chaos", ...names, "Chaos"].join(" → ");
}

function routeRisk(route) {
  if (route.confidence >= 80) return { key: "low", label: "высокое доверие" };
  if (route.confidence >= 55) return { key: "medium", label: "среднее доверие" };
  return { key: "high", label: "низкое доверие" };
}

function renderRoute(route, index) {
  const risk = routeRisk(route);
  const fixedSteps = route.path.map((edge, edgeIndex) => {
    const inputAmount = route.amounts[edgeIndex];
    const outputAmount = route.amounts[edgeIndex + 1];
    return `
      <li>
        <div>
          <strong>
            ${edgeIndex + 2}. ${escapeHtml(routeTypeLabel(edge.type))}
            <em>${escapeHtml(edge.type)}</em>
          </strong>
          <span>
            ${formatNumber(inputAmount, 0)} ${escapeHtml(edge.from.name)}
            → ${formatNumber(outputAmount, 0)} ${escapeHtml(edge.to.name)}
          </span>
        </div>
        <small>${escapeHtml(edge.details || edge.label)}</small>
      </li>
    `;
  }).join("");

  const volumeText = Number.isFinite(route.maxCxUtilization)
    ? `макс. доля прошлого часового объёма ${formatPercent(route.maxCxUtilization)}`
    : "объём GGG не подтверждён для обеих сторон";
  const sourceText = route.bothSources
    ? `две цены, расхождение ${formatPercent(route.maxDiscrepancy)}`
    : "один из краёв рассчитан только по poe.ninja";

  return `
    <article class="triangle-card">
      <div class="triangle-card-head">
        <div>
          <span class="triangle-rank">#${index + 1}</span>
          <h3>${escapeHtml(routeText(route))}</h3>
          <div class="triangle-route-categories">
            ${route.types
              .map((type) => `<span>${escapeHtml(routeTypeLabel(type))}</span>`)
              .join("")}
            <span>${route.totalSteps} шаг.</span>
          </div>
        </div>
        <span class="triangle-risk triangle-risk-${risk.key}">
          ${escapeHtml(risk.label)} · ${route.confidence}/100
        </span>
      </div>

      <div class="triangle-card-metrics">
        <div>
          <span>Вложено</span>
          <strong>${formatNumber(route.totalCost)} Chaos</strong>
        </div>
        <div>
          <span>Итог с остатком</span>
          <strong>${formatNumber(route.finalChaos)} Chaos</strong>
        </div>
        <div>
          <span>Прибыль</span>
          <strong class="triangle-positive">+${formatNumber(route.profit)} Chaos</strong>
        </div>
        <div>
          <span>ROI</span>
          <strong>${formatPercent(route.roi)}</strong>
        </div>
      </div>

      <div class="triangle-secondary">
        Выполнений цепочки: ${formatNumber(route.operations, 0)} ·
        остаток бюджета: ${formatNumber(route.leftoverChaos)} Chaos ·
        ${escapeHtml(sourceText)} · ${escapeHtml(volumeText)}.
      </div>

      <details>
        <summary>Показать точные действия</summary>
        <ol class="triangle-steps">
          <li>
            <div>
              <strong>1. Купить исходный предмет</strong>
              <span>
                ${formatNumber(route.inputQuantity, 0)} ${escapeHtml(route.inputItem.name)}
                за ${formatNumber(route.totalCost)} Chaos
              </span>
            </div>
            <small>
              Консервативная цена покупки: ${formatNumber(route.inputUnitPrice, 6)} Chaos/шт.,
              включая наценку из настроек при расчёте общей стоимости.
            </small>
          </li>
          ${fixedSteps}
          <li>
            <div>
              <strong>${route.totalSteps}. Продать результат</strong>
              <span>
                ${formatNumber(route.outputQuantity, 0)} ${escapeHtml(route.outputItem.name)}
                за ${formatNumber(route.totalSale)} Chaos
              </span>
            </div>
            <small>
              Консервативная цена продажи: ${formatNumber(route.outputUnitPrice, 6)} Chaos/шт.,
              итог уже учитывает скидку быстрой продажи.
            </small>
          </li>
        </ol>
      </details>
    </article>
  `;
}

const REJECTION_LABELS = Object.freeze({
  duplicateSingleStep: "Одиночная операция уже есть в основной таблице",
  missingPrice: "Нет цены входного или выходного предмета",
  integerBatch: "Не удалось собрать целую партию без дробных предметов",
  budget: "Бюджета не хватает даже на одну полную цепочку",
  unconfirmed: "Нет двух подтверждённых источников цены",
  discrepancy: "Слишком большое расхождение poe.ninja и poe.watch",
  missingLiquidity: "Нет рынков GGG для входа и выхода",
  liquidity: "Превышена допустимая доля прошлого часового объёма",
  noProfit: "Цепочка убыточна после запасов",
  minProfit: "Прибыль ниже выбранного минимума",
  minRoi: "ROI ниже выбранного минимума",
});

function nearestReason(route) {
  if (route.rejectionReason === "noProfit") {
    return `До безубыточности не хватает ${formatNumber(route.gapToBreakEven)} Chaos`;
  }
  if (route.rejectionReason === "minProfit") {
    return `До фильтра прибыли не хватает ${formatNumber(route.gapToMinProfit)} Chaos`;
  }
  return `До фильтра ROI не хватает ${formatNumber(route.gapToMinRoi)} п.п.`;
}

function renderDiagnostics(analysis) {
  const ui = elements();
  const diagnostics = analysis?.diagnostics;
  if (!diagnostics) return;

  ui.generatedRoutes.textContent = diagnostics.generatedRoutes.toLocaleString("ru-RU");
  ui.evaluatedRoutes.textContent = diagnostics.evaluatedRoutes.toLocaleString("ru-RU");
  ui.rejectedRoutes.textContent = diagnostics.rejectedTotal.toLocaleString("ru-RU");
  ui.acceptedRoutes.textContent = diagnostics.accepted.toLocaleString("ru-RU");

  const reasons = Object.entries(diagnostics.rejected).filter(([, count]) => count > 0);
  ui.rejectReasons.innerHTML = reasons.length
    ? `
      <h4>Почему маршруты отклонены</h4>
      <div class="triangle-reason-list">
        ${reasons.map(([reason, count]) => `
          <div class="triangle-reason-row">
            <span>${escapeHtml(REJECTION_LABELS[reason] ?? reason)}</span>
            <strong>${count.toLocaleString("ru-RU")}</strong>
          </div>
        `).join("")}
      </div>
    `
    : `<div class="triangle-diagnostic-empty">Отклонённых маршрутов нет.</div>`;

  const nearest = analysis.nearest.slice(0, 3);
  ui.nearestRoutes.innerHTML = `
    <div class="triangle-nearest-head">
      <h4>Ближайшие к условиям</h4>
      <span>Не являются выгодными сигналами</span>
    </div>
    ${nearest.length ? `
      <div class="triangle-nearest-list">
        ${nearest.map((route, index) => `
          <article class="triangle-nearest-card">
            <div>
              <span class="triangle-rank">#${index + 1}</span>
              <strong>${escapeHtml(routeText(route))}</strong>
            </div>
            <div class="triangle-nearest-values">
              <span>Прибыль: <b>${formatNumber(route.profit)} Chaos</b></span>
              <span>ROI: <b>${formatPercent(route.roi)}</b></span>
            </div>
            <small>${escapeHtml(nearestReason(route))}</small>
          </article>
        `).join("")}
      </div>
    ` : `
      <div class="triangle-diagnostic-empty">
        Нет рассчитанных маршрутов, близких к заданным фильтрам.
      </div>
    `}
  `;
}

function render() {
  const ui = elements();
  if (!state.marketData) {
    ui.status.textContent = "Ожидание загрузки цен основного сканера…";
    ui.results.innerHTML = "";
    return;
  }

  const currentSettings = readSettings();
  state.analysis = analyzeGuaranteedChains(
    state.marketData.itemsByCategory,
    state.marketData.cardPairs,
    currentSettings,
  );

  const { analysis } = state;
  const best = analysis.routes[0];
  ui.fixedCount.textContent = analysis.diagnostics.fixedEdges.toLocaleString("ru-RU");
  ui.checkedCount.textContent = analysis.diagnostics.evaluatedRoutes.toLocaleString("ru-RU");
  ui.acceptedCount.textContent = analysis.routes.length.toLocaleString("ru-RU");
  ui.bestProfit.textContent = best ? `+${formatNumber(best.profit)} Chaos` : "—";

  const counts = analysis.conversionCounts;
  ui.categorySummary.textContent =
    `Доступно переходов: торговцы ${counts.vendor ?? 0}, ` +
    `осколки ${counts.shard ?? 0}, сплинтеры ${counts.splinter ?? 0}, ` +
    `прочие стаки ${counts.stack ?? 0}, масла ${counts.oil ?? 0}, ` +
    `эссенции ${counts.essence ?? 0}, карты ${counts.card ?? 0}.`;

  renderDiagnostics(analysis);

  if (!analysis.routes.length) {
    ui.status.textContent =
      `Выгодных многошаговых цепочек в лиге ${state.marketData.league} ` +
      "с текущими фильтрами не найдено.";
    ui.results.innerHTML = `
      <div class="triangle-empty">
        <strong>Цепочек пока нет</strong>
        <p>
          Это нормальный результат: после наценки покупки, скидки продажи,
          целых партий и ограничения объёма большинство цепочек должно
          отсеиваться. Причины показаны в диагностике выше.
        </p>
      </div>
    `;
    return;
  }

  const shown = analysis.routes.slice(0, 25);
  ui.status.textContent =
    `Показано ${shown.length} из ${analysis.routes.length} цепочек для ` +
    `${state.marketData.league}. Цены взяты из основного сканера; ` +
    "GGG используется только как проверка прошлого часового объёма.";
  ui.results.innerHTML = shown.map(renderRoute).join("");
}

function bindEvents() {
  const ui = elements();
  const controls = [
    ui.budget,
    ui.minProfit,
    ui.minRoi,
    ui.maxSteps,
    ui.buyPremium,
    ui.sellDiscount,
    ui.maxDiscrepancy,
    ui.maxUtilization,
    ui.useSecondSource,
    ui.requireConfirmed,
    ui.requireLiquidity,
    ...document.querySelectorAll('input[name="triangleCategory"]'),
  ].filter(Boolean);

  for (const control of controls) {
    control.addEventListener("change", () => {
      saveSettings();
      render();
    });
    if (control instanceof HTMLInputElement && control.type !== "checkbox") {
      control.addEventListener("input", () => {
        saveSettings();
        render();
      });
    }
  }

  ui.refresh?.addEventListener("click", () => {
    syncDefaultsFromMainForm();
    saveSettings();
    render();
  });

  const mainControls = [
    ui.mainBudget,
    ui.mainMinProfit,
    ui.mainMinRoi,
    ui.mainBuyPremium,
    ui.mainSellDiscount,
    ui.mainMaxDiscrepancy,
    ui.mainUseSecondSource,
  ].filter(Boolean);

  for (const control of mainControls) {
    control.addEventListener("change", () => {
      syncDefaultsFromMainForm();
      saveSettings();
      render();
    });
  }

  window.addEventListener("poe-market-data", (event) => {
    state.marketData = event.detail;
    render();
  });
}

function init() {
  insertPanel();
  populateTypeOptions();
  syncDefaultsFromMainForm();
  loadSettings();
  bindEvents();

  if (window.__POE_MARKET_DATA__) {
    state.marketData = window.__POE_MARKET_DATA__;
  }
  render();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
