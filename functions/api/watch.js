const APP_USER_AGENT = "PoE-Arbitrage-Dashboard/0.8.0 (+https://poe-arbitrage-dashboard.pages.dev; economy analysis)";
const CACHE_SECONDS = 600;

function textResponse(message, status) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}

function validLeague(league) {
  return Boolean(league && league.length <= 80 && /^[\p{L}\p{N} ._'’\-]+$/u.test(league));
}

function sourceUrls(league) {
  const compactAll = new URL("https://api.poe.watch/compact");
  compactAll.searchParams.set("league", league);
  compactAll.searchParams.set("all", "true");

  const compact = new URL("https://api.poe.watch/compact");
  compact.searchParams.set("league", league);

  const getAll = new URL("https://api.poe.watch/get");
  getAll.searchParams.set("league", league);
  getAll.searchParams.set("all", "true");

  return [compactAll, compact, getAll];
}

async function requestJson(url) {
  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": APP_USER_AGENT
    }
  });
  if (!response.ok) return { ok: false, status: response.status };
  const text = await response.text();
  try {
    JSON.parse(text);
    return { ok: true, text, source: url.pathname };
  } catch {
    return { ok: false, status: 502 };
  }
}

export async function onRequestGet(context) {
  const requestUrl = new URL(context.request.url);
  const league = requestUrl.searchParams.get("league")?.trim();
  if (!validLeague(league)) return textResponse("Invalid league", 400);

  const cache = caches.default;
  const cacheKey = new Request(requestUrl.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let lastStatus = 502;
  for (const source of sourceUrls(league)) {
    const result = await requestJson(source);
    if (!result.ok) {
      lastStatus = result.status;
      continue;
    }
    const response = new Response(result.text, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": `public, max-age=180, s-maxage=${CACHE_SECONDS}`,
        "X-Data-Source": result.source,
        "X-Content-Type-Options": "nosniff"
      }
    });
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  }

  return textResponse(`poe.watch price sources failed (${lastStatus})`, 502);
}
