const SOURCE_URL = "https://poe.ninja/poe1/api/economy/leagues";
const APP_USER_AGENT = "PoE-Arbitrage-Dashboard/0.5.0 (+https://poe-arbitrage-dashboard.pages.dev; economy analysis)";
const CACHE_SECONDS = 900;

function extractLeagues(payload) {
  const candidates = [
    payload,
    payload?.leagues,
    payload?.economyLeagues,
    payload?.items,
    payload?.lines
  ];
  const source = candidates.find(Array.isArray) ?? [];
  const seen = new Set();
  const leagues = [];

  for (const entry of source) {
    const id = typeof entry === "string" ? entry : entry?.id ?? entry?.name;
    if (!id || seen.has(id) || /\bSSF\b/i.test(id)) continue;
    seen.add(id);
    leagues.push({
      id,
      name: typeof entry === "string" ? entry : entry?.name ?? id,
      current: Boolean(entry?.current ?? entry?.category?.current)
    });
  }

  // poe.ninja may return only temporary challenge leagues. Standard is a valid
  // permanent economy league, so keep it available even when it is absent
  // from the upstream league list.
  if (!seen.has("Standard")) {
    leagues.push({ id: "Standard", name: "Standard", current: false });
  }

  return leagues.sort((a, b) => Number(b.current) - Number(a.current) || a.name.localeCompare(b.name));
}

export async function onRequestGet(context) {
  const cache = caches.default;
  const cacheKey = new Request(context.request.url, { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const upstream = await fetch(SOURCE_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": APP_USER_AGENT
    }
  });

  if (!upstream.ok) {
    return new Response(JSON.stringify([
      { id: "Standard", name: "Standard", current: false },
      { id: "Hardcore", name: "Hardcore", current: false }
    ]), {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }

  const payload = await upstream.json();
  const leagues = extractLeagues(payload);
  const response = new Response(JSON.stringify(leagues.length ? leagues : [
    { id: "Standard", name: "Standard", current: false },
    { id: "Hardcore", name: "Hardcore", current: false }
  ]), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=300, s-maxage=${CACHE_SECONDS}`,
      "X-Content-Type-Options": "nosniff"
    }
  });
  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
