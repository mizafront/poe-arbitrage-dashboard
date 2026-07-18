const MAX_KEYS = 250;
const MAX_HOURS = 72;
const DEFAULT_HOURS = 24;

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function validLeague(league) {
  return Boolean(league && league.length <= 80 && /^[\p{L}\p{N} ._'’\-]+$/u.test(league));
}

function cleanKeys(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item ?? "").trim()).filter(Boolean))].slice(0, MAX_KEYS);
}

async function latestRun(db, league) {
  return db.prepare(`
    SELECT league, started_at, completed_at, recipe_count, source_count, status, error
    FROM collector_runs
    WHERE league = ?
    ORDER BY started_at DESC
    LIMIT 1
  `).bind(league).first();
}

async function queryChunk(db, league, keys, cutoff) {
  const placeholders = keys.map(() => "?").join(",");
  const statement = db.prepare(`
    SELECT
      recipe_key, category, card_category, input_category, output_category,
      input_name, output_name, ratio, output_quantity,
      input_ninja, input_watch, input_sources, input_watch_volume,
      output_ninja, output_watch, output_sources, output_watch_volume,
      captured_at
    FROM opportunity_snapshots
    WHERE league = ?
      AND captured_at >= ?
      AND recipe_key IN (${placeholders})
    ORDER BY captured_at ASC
  `).bind(league, cutoff, ...keys);
  const result = await statement.all();
  return Array.isArray(result?.results) ? result.results : [];
}

export async function onRequestPost(context) {
  if (!context.env?.PRICE_HISTORY) {
    return json({ configured: false, available: false, reason: "D1 binding PRICE_HISTORY is not configured." });
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ configured: true, available: false, error: "Invalid JSON body." }, 400);
  }

  const league = String(body?.league ?? "").trim();
  if (!validLeague(league)) return json({ configured: true, available: false, error: "Invalid league." }, 400);

  const keys = cleanKeys(body?.keys);
  if (!keys.length) return json({ configured: true, available: false, league, error: "No recipe keys supplied." }, 400);

  const hours = Math.min(MAX_HOURS, Math.max(1, Number(body?.hours) || DEFAULT_HOURS));
  const cutoff = Math.floor(Date.now() / 1000) - Math.round(hours * 3600);
  const chunks = [];
  for (let index = 0; index < keys.length; index += 80) chunks.push(keys.slice(index, index + 80));

  try {
    const [run, groups] = await Promise.all([
      latestRun(context.env.PRICE_HISTORY, league),
      Promise.all(chunks.map((chunk) => queryChunk(context.env.PRICE_HISTORY, league, chunk, cutoff)))
    ]);
    const snapshots = groups.flat();
    return json({
      configured: true,
      available: snapshots.length > 0,
      league,
      hours,
      requestedKeys: keys.length,
      snapshotCount: snapshots.length,
      latestRun: run ?? null,
      snapshots
    });
  } catch (error) {
    return json({
      configured: true,
      available: false,
      league,
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
}

export async function onRequestGet(context) {
  if (!context.env?.PRICE_HISTORY) {
    return json({ configured: false, available: false, reason: "D1 binding PRICE_HISTORY is not configured." });
  }
  const url = new URL(context.request.url);
  const league = String(url.searchParams.get("league") ?? "").trim();
  if (!validLeague(league)) return json({ configured: true, available: false, error: "Invalid league." }, 400);
  try {
    const run = await latestRun(context.env.PRICE_HISTORY, league);
    const count = await context.env.PRICE_HISTORY.prepare(`
      SELECT COUNT(*) AS count, MIN(captured_at) AS oldest, MAX(captured_at) AS newest
      FROM opportunity_snapshots
      WHERE league = ?
    `).bind(league).first();
    return json({
      configured: true,
      available: Number(count?.count ?? 0) > 0,
      league,
      count: Number(count?.count ?? 0),
      oldest: Number(count?.oldest ?? 0) || null,
      newest: Number(count?.newest ?? 0) || null,
      latestRun: run ?? null
    });
  } catch (error) {
    return json({ configured: true, available: false, league, error: error instanceof Error ? error.message : String(error) }, 500);
  }
}
