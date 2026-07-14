const ALLOWED_TYPES = new Set(["Oil", "Essence", "DivinationCard", "Currency", "Fragment"]);
const APP_USER_AGENT = "PoE-Arbitrage-Dashboard/0.2 (+https://example.pages.dev; economy analysis)";
const CACHE_SECONDS = 300;

function textResponse(message, status) {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}

function validLeague(league) {
  return Boolean(league && league.length <= 80 && /^[\p{L}\p{N} ._'’\-]+$/u.test(league));
}

function sourceUrls(league, type) {
  const current = new URL("https://poe.ninja/poe1/api/economy/exchange/current/overview");
  current.searchParams.set("league", league);
  current.searchParams.set("type", type);

  const legacyKind = type === "Currency" || type === "Fragment" ? "currencyoverview" : "itemoverview";
  const legacy = new URL(`https://poe.ninja/api/data/${legacyKind}`);
  legacy.searchParams.set("league", league);
  legacy.searchParams.set("type", type);
  return [current, legacy];
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
  const type = requestUrl.searchParams.get("type")?.trim();

  if (!validLeague(league)) return textResponse("Invalid league", 400);
  if (!type || !ALLOWED_TYPES.has(type)) return textResponse("Invalid type", 400);

  const cache = caches.default;
  const cacheKey = new Request(requestUrl.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let lastStatus = 502;
  for (const source of sourceUrls(league, type)) {
    const result = await requestJson(source);
    if (!result.ok) {
      lastStatus = result.status;
      continue;
    }

    const response = new Response(result.text, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": `public, max-age=120, s-maxage=${CACHE_SECONDS}`,
        "X-Data-Source": result.source,
        "X-Content-Type-Options": "nosniff"
      }
    });
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  }

  return textResponse(`poe.ninja price sources failed (${lastStatus})`, 502);
}
