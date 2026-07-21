"use strict";

import {
  buildDirectedExchangeEdges,
  analyzeTriangularCycles,
  supportedCurrencies,
  supportedIntermediateCategories,
} from "./triangular-core.js";

const SETTINGS_KEY = "poe-triangular-arbitrage:v1";

const state = {
  payload: null,
  graph: null,
  cycles: [],
  analysis: null,
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
          <select id="triangleMode" disabled>
            <option value="average">Средний фактический курс часа</option>
          </select>
        </label>

        <label>
          Запас на шаг, %
          <input id="triangleSafety" type="number" min="0" max="25" step="0.1" value="1">
        </label>

        <label>
          Макс. разброс курса, %
          <input id="triangleMaxSpread" type="number" min="0" step="1" value="25">
          <small>0 — не фильтровать; диапазон используется как предупреждение</small>
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
        Рабочий курс рассчитывается по отношению суммарных объёмов,
        реально обменянных за завершённый час. Минимальный и максимальный ratios
        больше не используются как цена сделки: они показывают только ширину
        исторического диапазона. На каждом шаге результат округляется вниз до
        целого предмета, а маршрут ограничивается часовым объёмом.
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

      <details id="triangleDiagnostics" class="triangle-diagnostics" open>
        <summary>Диагностика поиска</summary>

        <div class="triangle-diagnostic-metrics">
          <div>
            <span>Полных маршрутов проверено</span>
            <strong id="triangleCheckedRoutes">—</strong>
          </div>
          <div>
            <span>Технически исполнимо</span>
            <strong id="triangleExecutableRoutes">—</strong>
          </div>
          <div>
            <span>Отброшено</span>
            <strong id="triangleRejectedRoutes">—</strong>
          </div>
          <div>
            <span>Принято</span>
            <strong id="triangleAcceptedRoutes">—</strong>
          </div>
        </div>

        <p class="triangle-diagnostic-help">
          Каждый полный маршрут учитывается один раз — по первой причине,
          из-за которой он был отклонён.
        </p>

        <div id="triangleRejectReasons" class="triangle-reject-reasons"></div>
        <div id="triangleNearestRoutes" class="triangle-nearest-routes"></div>
      </details>

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
    checkedRoutes: document.querySelector("#triangleCheckedRoutes"),
    executableRoutes: document.querySelector("#triangleExecutableRoutes"),
    rejectedRoutes: document.querySelector("#triangleRejectedRoutes"),
    acceptedRoutes: document.querySelector("#triangleAcceptedRoutes"),
    rejectReasons: document.querySelector("#triangleRejectReasons"),
    nearestRoutes: document.querySelector("#triangleNearestRoutes"),
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
    mode: "average",
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
            ${escapeHtml(edge.from.short)};
            получено ${formatNumber(edge.resultingAmount, 0)}
            ${escapeHtml(edge.to.short)};
            остаток ${formatNumber(edge.leftoverInput, 0)}
            ${escapeHtml(edge.from.short)};
            средний курс часа ×${formatNumber(edge.chosenRate, 6)};
            объём входа/выхода
            ${formatNumber(edge.volumeIn, 0)}/${formatNumber(edge.volumeOut, 0)};
            используется ${formatPercent(edge.inputUtilizationPercent)}
            входа и ${formatPercent(edge.outputUtilizationPercent)} выхода;
            исторический диапазон ${formatPercent(edge.spreadPercent)}
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

const REJECTION_LABELS = {
  spread: "Превышен выбранный предел исторического диапазона",
  wholeLot: "Нельзя выполнить следующий целый лот",
  liquidity: "Превышена допустимая доля часового объёма",
  noProfit: "Результат не превышает стартовый бюджет",
  minProfit: "Прибыль ниже заданного минимума",
  minRoi: "ROI ниже заданного минимума",
};

function nearestReasonText(cycle) {
  if (cycle.rejectionReason === "noProfit") {
    return cycle.gapToBreakEven > 0
      ? `До безубыточности не хватает ${formatNumber(
          cycle.gapToBreakEven,
          0,
        )} ${escapeHtml(cycle.startCurrency.short)}`
      : "Маршрут вышел ровно в ноль";
  }

  if (cycle.rejectionReason === "minProfit") {
    return `До фильтра прибыли не хватает ${formatNumber(
      cycle.gapToMinProfit,
      0,
    )} ${escapeHtml(cycle.startCurrency.short)}`;
  }

  return `До фильтра ROI не хватает ${formatNumber(
    cycle.gapToMinRoi,
    2,
  )} п.п.`;
}

function renderSearchDiagnostics(analysis) {
  const ui = elements();
  const diagnostics = analysis?.diagnostics;

  if (!diagnostics) {
    for (const element of [
      ui.checkedRoutes,
      ui.executableRoutes,
      ui.rejectedRoutes,
      ui.acceptedRoutes,
    ]) {
      if (element) element.textContent = "—";
    }

    if (ui.rejectReasons) ui.rejectReasons.innerHTML = "";
    if (ui.nearestRoutes) ui.nearestRoutes.innerHTML = "";
    return;
  }

  ui.checkedRoutes.textContent =
    diagnostics.potentialRoutes.toLocaleString("ru-RU");
  ui.executableRoutes.textContent =
    diagnostics.technicallyExecutable.toLocaleString("ru-RU");
  ui.rejectedRoutes.textContent =
    diagnostics.rejectedTotal.toLocaleString("ru-RU");
  ui.acceptedRoutes.textContent =
    diagnostics.accepted.toLocaleString("ru-RU");

  const reasonEntries = Object.entries(
    diagnostics.rejected,
  ).filter(([, count]) => count > 0);

  ui.rejectReasons.innerHTML = reasonEntries.length
    ? `
      <h4>Почему маршруты отклонены</h4>
      <div class="triangle-reason-list">
        ${reasonEntries
          .map(
            ([reason, count]) => `
              <div class="triangle-reason-row">
                <span>${escapeHtml(
                  REJECTION_LABELS[reason] ?? reason,
                )}</span>
                <strong>${count.toLocaleString("ru-RU")}</strong>
              </div>
            `,
          )
          .join("")}
      </div>
    `
    : `
      <div class="triangle-diagnostic-empty">
        Отклонённых полных маршрутов нет.
      </div>
    `;

  const nearest = Array.isArray(analysis.nearest)
    ? analysis.nearest.slice(0, 3)
    : [];

  if (!nearest.length) {
    ui.nearestRoutes.innerHTML = `
      <div class="triangle-nearest-head">
        <h4>Ближайшие к прибыли</h4>
      </div>
      <div class="triangle-diagnostic-empty">
        Нет технически исполнимых отклонённых маршрутов для сравнения.
      </div>
    `;
    return;
  }

  ui.nearestRoutes.innerHTML = `
    <div class="triangle-nearest-head">
      <h4>Ближайшие к прибыли</h4>
      <span>Не являются торговыми сигналами</span>
    </div>

    <div class="triangle-nearest-list">
      ${nearest
        .map(
          (cycle, index) => `
            <article class="triangle-nearest-card">
              <div>
                <span class="triangle-rank">#${index + 1}</span>
                <strong>${escapeHtml(routeText(cycle))}</strong>
              </div>

              <div class="triangle-nearest-values">
                <span>
                  Итог:
                  <b>${formatNumber(cycle.safeResult, 0)}
                  ${escapeHtml(cycle.startCurrency.short)}</b>
                </span>
                <span>
                  Прибыль:
                  <b class="${
                    cycle.safeProfit > 0
                      ? "triangle-positive"
                      : "triangle-negative"
                  }">
                    ${cycle.safeProfit > 0 ? "+" : ""}
                    ${formatNumber(cycle.safeProfit, 0)}
                  </b>
                </span>
                <span>ROI: <b>${formatPercent(cycle.roi)}</b></span>
              </div>

              <small>${nearestReasonText(cycle)}</small>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function render() {
  const ui = elements();

  if (!state.graph || !state.payload) {
    ui.results.innerHTML = "";
    return;
  }

  const settings = readSettings();
  state.analysis = analyzeTriangularCycles(
    state.graph.edges,
    settings,
  );
  state.cycles = state.analysis.cycles;
  renderSearchDiagnostics(state.analysis);

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
          Посмотрите блок «Диагностика поиска»: он покажет, сколько
          маршрутов не прошло проверку целых предметов, ликвидности,
          пользовательского предела диапазона и прибыльности. Расчёт основан
          на среднем фактическом курсе завершённого часа и всё равно требует
          ручной проверки перед обменом.
        </p>
      </div>
    `;
    return;
  }

  const shown = state.cycles.slice(0, 25);
  ui.status.textContent =
    `Показано ${shown.length} из ${state.cycles.length} цепочек. ` +
    "Расчёт: средний фактический курс завершённого часа.";

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
    state.analysis = null;
    renderSearchDiagnostics(null);

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
