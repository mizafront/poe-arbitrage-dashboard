import {
  buildEssencePairs,
  buildFixedRewardCardPairs,
  buildOilPairs,
  mergeMarketSources,
  normalizeExchange,
  normalizePoeWatch,
  recipeKey
} from "./core.js";
import { FIXED_CARD_REWARD_CATALOG } from "./cards.js";

const APP_USER_AGENT = "PoE-Arbitrage-History-Collector/0.8.0 (+https://poe-arbitrage-dashboard.pages.dev; contact: dashboard owner)";
const NINJA_TYPES = [
  ["oil", "Oil", false],
  ["essence", "Essence", false],
  ["card", "DivinationCard", false],
  ["currency", "Currency", false],
  ["fragment", "Fragment", true],
  ["uniqueMap", "UniqueMap", true],
  ["scarab", "Scarab", true],
  ["skillGem", "SkillGem", true],
  ["uniqueAccessory", "UniqueAccessory", true],
  ["uniqueWeapon", "UniqueWeapon", true],
  ["uniqueArmour", "UniqueArmour", true],
  ["uniqueFlask", "UniqueFlask", true],
  ["uniqueJewel", "UniqueJewel", true]
];

function response(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function validLeague(league) {
  return Boolean(league && league.length <= 80 && /^[\p{L}\p{N} ._'’\-]+$/u.test(league));
}


async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function requestJson(url) {
  const result = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": APP_USER_AGENT }
  });
  if (!result.ok) throw new Error(`${result.status} ${result.statusText} for ${url}`);
  return result.json();
}

function ninjaUrls(league, type) {
  const current = new URL("https://poe.ninja/poe1/api/economy/exchange/current/overview");
  current.searchParams.set("league", league);
  current.searchParams.set("type", type);
  const legacyKind = type === "Currency" || type === "Fragment" ? "currencyoverview" : "itemoverview";
  const legacy = new URL(`https://poe.ninja/api/data/${legacyKind}`);
  legacy.searchParams.set("league", league);
  legacy.searchParams.set("type", type);
  return [current.toString(), legacy.toString()];
}

async function fetchNinjaType(league, type, optional) {
  let lastError;
  for (const url of ninjaUrls(league, type)) {
    try {
      return await requestJson(url);
    } catch (error) {
      lastError = error;
    }
  }
  if (optional) return { lines: [] };
  throw lastError ?? new Error(`Unable to load ${type}`);
}

async function fetchWatch(league) {
  const urls = [
    `https://api.poe.watch/compact?league=${encodeURIComponent(league)}&all=true`,
    `https://api.poe.watch/compact?league=${encodeURIComponent(league)}`,
    `https://api.poe.watch/get?league=${encodeURIComponent(league)}&all=true`
  ];
  for (const url of urls) {
    try {
      return await requestJson(url);
    } catch {
      // Continue with the next supported poe.watch shape.
    }
  }
  return null;
}

async function currentLeagues() {
  try {
    const payload = await requestJson("https://poe.ninja/poe1/api/economy/leagues");
    const source = Array.isArray(payload) ? payload : payload?.leagues ?? payload?.economyLeagues ?? [];
    const eligible = source
      .map((entry) => ({
        name: String(entry?.id ?? entry?.name ?? "").trim(),
        current: Boolean(entry?.current ?? entry?.category?.current)
      }))
      .filter((entry) => validLeague(entry.name) && !/\bSSF\b/i.test(entry.name));
    const current = eligible.filter((entry) => entry.current).map((entry) => entry.name);
    if (current.length) return [...new Set(current)];
    const fallback = eligible.find((entry) => entry.name !== "Standard")?.name;
    return fallback ? [fallback] : [];
  } catch {
    return [];
  }
}

async function configuredLeagues(env) {
  const raw = String(env?.COLLECT_LEAGUES ?? "auto").trim();
  if (raw && raw.toLowerCase() !== "auto") {
    return [...new Set(raw.split(",").map((item) => item.trim()).filter(validLeague))].slice(0, 4);
  }
  const active = await currentLeagues();
  return [...new Set([...active.slice(0, 1), "Standard"])];
}

function rawPrice(item, key, fallback) {
  const value = Number(item?.[key]);
  if (Number.isFinite(value) && value > 0) return value;
  const fallbackValue = Number(item?.[fallback]);
  return Number.isFinite(fallbackValue) && fallbackValue > 0 ? fallbackValue : null;
}

function snapshotStatement(db, league, pair, capturedAt) {
  return db.prepare(`
    INSERT OR REPLACE INTO opportunity_snapshots (
      league, recipe_key, category, card_category, input_category, output_category,
      input_name, output_name, ratio, output_quantity,
      input_ninja, input_watch, input_sources, input_watch_volume,
      output_ninja, output_watch, output_sources, output_watch_volume,
      captured_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    league,
    recipeKey(pair),
    pair.category,
    pair.cardCategory ?? "",
    pair.inputCategory ?? pair.category,
    pair.outputCategory ?? pair.category,
    pair.input.name,
    pair.output.name,
    Number(pair.ratio ?? 3),
    Number(pair.outputQuantity ?? 1),
    rawPrice(pair.input, "ninjaPrice", "price"),
    rawPrice(pair.input, "watchPrice", "watchPrice"),
    Number(pair.input?.sources ?? 1),
    Number(pair.input?.watchVolume ?? 0),
    rawPrice(pair.output, "ninjaPrice", "price"),
    rawPrice(pair.output, "watchPrice", "watchPrice"),
    Number(pair.output?.sources ?? 1),
    Number(pair.output?.watchVolume ?? 0),
    capturedAt
  );
}

async function storeStatements(db, statements) {
  for (let index = 0; index < statements.length; index += 50) {
    await db.batch(statements.slice(index, index + 50));
  }
}

async function collectLeague(env, league) {
  const startedAt = Math.floor(Date.now() / 1000);
  const capturedAt = Math.floor(startedAt / 900) * 900;
  try {
    const entries = await mapLimit(NINJA_TYPES, 4, async ([key, type, optional]) => [
      key,
      await fetchNinjaType(league, type, optional)
    ]);
    const payloads = Object.fromEntries(entries);
    const watchPayload = await fetchWatch(league);
    const watchItems = watchPayload ? normalizePoeWatch(watchPayload) : [];
    const normalized = Object.fromEntries(
      Object.entries(payloads).map(([key, payload]) => [key, normalizeExchange(payload).items])
    );
    const withWatch = (items) => mergeMarketSources(items, watchItems);

    const oils = withWatch(normalized.oil);
    const essences = withWatch(normalized.essence);
    const cards = withWatch(normalized.card);
    const currencies = withWatch(normalized.currency);
    const fragments = withWatch(normalized.fragment);
    const uniqueMaps = withWatch(normalized.uniqueMap);
    const scarabs = withWatch(normalized.scarab);
    const skillGems = withWatch(normalized.skillGem);
    const uniqueAccessories = withWatch(normalized.uniqueAccessory);
    const uniqueWeapons = withWatch(normalized.uniqueWeapon);
    const uniqueArmours = withWatch(normalized.uniqueArmour);
    const uniqueFlasks = withWatch(normalized.uniqueFlask);
    const uniqueJewels = withWatch(normalized.uniqueJewel);

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
    const pairs = [...buildOilPairs(oils), ...buildEssencePairs(essences), ...cardPairs];
    const statements = pairs.map((pair) => snapshotStatement(env.PRICE_HISTORY, league, pair, capturedAt));
    await storeStatements(env.PRICE_HISTORY, statements);

    const retentionDays = Math.min(60, Math.max(1, Number(env?.RETENTION_DAYS ?? 14)));
    const cutoff = capturedAt - Math.round(retentionDays * 86400);
    await env.PRICE_HISTORY.prepare(`DELETE FROM opportunity_snapshots WHERE captured_at < ?`).bind(cutoff).run();
    await env.PRICE_HISTORY.prepare(`DELETE FROM collector_runs WHERE started_at < ?`).bind(cutoff - retentionDays * 86400).run();
    await env.PRICE_HISTORY.prepare(`
      INSERT INTO collector_runs (league, started_at, completed_at, recipe_count, source_count, status, error)
      VALUES (?, ?, ?, ?, ?, 'success', NULL)
    `).bind(league, startedAt, Math.floor(Date.now() / 1000), pairs.length, watchItems.length ? 2 : 1).run();

    return { league, ok: true, recipes: pairs.length, watchItems: watchItems.length, capturedAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await env.PRICE_HISTORY.prepare(`
      INSERT INTO collector_runs (league, started_at, completed_at, recipe_count, source_count, status, error)
      VALUES (?, ?, ?, 0, 0, 'error', ?)
    `).bind(league, startedAt, Math.floor(Date.now() / 1000), message.slice(0, 1000)).run().catch(() => {});
    return { league, ok: false, error: message };
  }
}

async function collectAll(env) {
  if (!env?.PRICE_HISTORY) throw new Error("D1 binding PRICE_HISTORY is not configured.");
  const leagues = await configuredLeagues(env);
  const results = [];
  for (const league of leagues) results.push(await collectLeague(env, league));
  return results;
}

async function latestRuns(env) {
  if (!env?.PRICE_HISTORY) return [];
  const result = await env.PRICE_HISTORY.prepare(`
    SELECT league, started_at, completed_at, recipe_count, source_count, status, error
    FROM collector_runs
    WHERE id IN (SELECT MAX(id) FROM collector_runs GROUP BY league)
    ORDER BY league
  `).all();
  return result?.results ?? [];
}

export default {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(collectAll(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/run") {
      const expected = String(env?.COLLECTOR_SECRET ?? "").trim();
      const supplied = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
      if (!expected || supplied !== expected) return response({ ok: false, error: "Unauthorized" }, 401);
      const results = await collectAll(env);
      return response({ ok: results.every((item) => item.ok), results });
    }
    return response({
      service: "PoE Arbitrage History Collector",
      version: "0.8.0",
      d1Configured: Boolean(env?.PRICE_HISTORY),
      configuredLeagues: await configuredLeagues(env),
      latestRuns: await latestRuns(env),
      manualRun: "POST /run with Authorization: Bearer <COLLECTOR_SECRET>"
    });
  }
};
