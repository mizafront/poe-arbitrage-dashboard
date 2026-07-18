const API_BASE = "https://api.pathofexile.com";
const TOKEN_URL = "https://www.pathofexile.com/oauth/token";
const CACHE_SECONDS = 900;
const MAX_LOOKBACK_HOURS = 4;

let memoryToken = "";

function gggUserAgent(env) {
  const clientId = env?.POE_CLIENT_ID?.trim?.() || "poe-arbitrage-dashboard";
  const contact = env?.POE_CONTACT?.trim?.() || "https://poe-arbitrage-dashboard.pages.dev";
  return `OAuth ${clientId}/0.8.0 (contact: ${contact}) PoE-Arbitrage-Dashboard`;
}

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders
    }
  });
}

function validLeague(league) {
  return Boolean(league && league.length <= 80 && /^[\p{L}\p{N} ._'’\-]+$/u.test(league));
}

function completedHourTimestamp(hoursAgo = 1) {
  return Math.floor(Date.now() / 3_600_000) * 3_600 - hoursAgo * 3_600;
}

async function getAccessToken(env) {
  if (typeof env?.POE_CX_ACCESS_TOKEN === "string" && env.POE_CX_ACCESS_TOKEN.trim()) {
    return env.POE_CX_ACCESS_TOKEN.trim();
  }
  if (memoryToken) return memoryToken;

  const clientId = env?.POE_CLIENT_ID?.trim?.();
  const clientSecret = env?.POE_CLIENT_SECRET?.trim?.();
  if (!clientId || !clientSecret) return "";

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
    scope: "service:cxapi"
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": gggUserAgent(env)
    },
    body: body.toString()
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OAuth ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`);
  }

  const payload = await response.json();
  if (!payload?.access_token || !String(payload?.scope ?? "").includes("service:cxapi")) {
    throw new Error("OAuth token does not include service:cxapi");
  }
  memoryToken = String(payload.access_token);
  return memoryToken;
}

async function requestHour(token, timestamp, env) {
  const url = new URL(`${API_BASE}/currency-exchange/${timestamp}`);
  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": gggUserAgent(env)
    }
  });

  const rateHeaders = {};
  for (const [key, value] of response.headers.entries()) {
    if (key.toLowerCase().startsWith("x-rate-limit")) rateHeaders[key] = value;
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return { ok: false, status: response.status, detail: detail.slice(0, 300), rateHeaders };
  }

  const payload = await response.json();
  return { ok: true, payload, rateHeaders };
}

export async function onRequestGet(context) {
  const requestUrl = new URL(context.request.url);
  const league = requestUrl.searchParams.get("league")?.trim();
  if (!validLeague(league)) return jsonResponse({ available: false, configured: false, error: "Invalid league" }, 400);

  const hasClientId = Boolean(context.env?.POE_CLIENT_ID?.trim?.());
  const hasToken = Boolean(context.env?.POE_CX_ACCESS_TOKEN?.trim?.() && hasClientId);
  const hasClientCredentials = Boolean(hasClientId && context.env?.POE_CLIENT_SECRET?.trim?.());
  if (!hasToken && !hasClientCredentials) {
    return jsonResponse({
      configured: false,
      available: false,
      league,
      reason: "Set POE_CLIENT_ID and either POE_CX_ACCESS_TOKEN or POE_CLIENT_SECRET in Cloudflare secrets."
    });
  }

  const newestHour = completedHourTimestamp(1);
  const cache = caches.default;
  const cacheUrl = new URL(requestUrl.toString());
  cacheUrl.searchParams.set("hour", String(newestHour));
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const token = await getAccessToken(context.env);
    if (!token) {
      return jsonResponse({ configured: false, available: false, league, reason: "Currency Exchange token is unavailable." });
    }

    let lastError = null;
    for (let hoursAgo = 1; hoursAgo <= MAX_LOOKBACK_HOURS; hoursAgo += 1) {
      const timestamp = completedHourTimestamp(hoursAgo);
      const result = await requestHour(token, timestamp, context.env);
      if (!result.ok) {
        lastError = result;
        if (result.status === 401 || result.status === 403) break;
        continue;
      }

      const markets = Array.isArray(result.payload?.markets)
        ? result.payload.markets.filter((market) => market?.league === league)
        : [];

      if (!markets.length && hoursAgo < MAX_LOOKBACK_HOURS) continue;

      const response = jsonResponse({
        configured: true,
        available: markets.length > 0,
        league,
        hour: timestamp,
        next_change_id: result.payload?.next_change_id ?? null,
        markets,
        source: "GGG Currency Exchange API",
        historical: true,
        note: "The API contains completed hourly digests and never includes the current hour."
      }, 200, {
        "Cache-Control": `public, max-age=300, s-maxage=${CACHE_SECONDS}`,
        "X-Data-Source": "api.pathofexile.com/currency-exchange"
      });
      context.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    }

    return jsonResponse({
      configured: true,
      available: false,
      league,
      error: lastError
        ? `Currency Exchange API failed (${lastError.status})${lastError.detail ? `: ${lastError.detail}` : ""}`
        : "No completed-hour markets were found for this league."
    });
  } catch (error) {
    return jsonResponse({ configured: true, available: false, league, error: error instanceof Error ? error.message : String(error) });
  }
}
