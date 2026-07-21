const CDN_BASE = "https://web.poecdn.com/api/currency-exchange";
const CACHE_SECONDS = 900;
const MAX_LOOKBACK_HOURS = 6;

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

function validLeague(league) {
  return Boolean(
    league &&
      league.length <= 80 &&
      /^[\p{L}\p{N} ._'’\-]+$/u.test(league),
  );
}

function completedHourTimestamp(hoursAgo = 1) {
  return Math.floor(Date.now() / 3_600_000) * 3_600 - hoursAgo * 3_600;
}

async function requestHour(timestamp) {
  const url = `${CDN_BASE}/${timestamp}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return {
      ok: false,
      status: response.status,
      detail: detail.slice(0, 300),
    };
  }

  const payload = await response.json();
  return { ok: true, payload };
}

export async function onRequestGet(context) {
  const requestUrl = new URL(context.request.url);
  const league = requestUrl.searchParams.get("league")?.trim();

  if (!validLeague(league)) {
    return jsonResponse(
      {
        configured: true,
        available: false,
        error: "Invalid league",
      },
      400,
    );
  }

  const newestHour = completedHourTimestamp(1);
  const cache = caches.default;
  const cacheUrl = new URL(requestUrl.toString());
  cacheUrl.searchParams.set("hour", String(newestHour));
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    let lastError = null;

    for (let hoursAgo = 1; hoursAgo <= MAX_LOOKBACK_HOURS; hoursAgo += 1) {
      const timestamp = completedHourTimestamp(hoursAgo);
      const result = await requestHour(timestamp);

      if (!result.ok) {
        lastError = result;

        if (result.status === 429) break;
        continue;
      }

      const markets = Array.isArray(result.payload?.markets)
        ? result.payload.markets.filter(
            (market) => String(market?.league ?? "") === league,
          )
        : [];

      if (!markets.length && hoursAgo < MAX_LOOKBACK_HOURS) continue;

      const response = jsonResponse(
        {
          configured: true,
          available: markets.length > 0,
          league,
          hour: timestamp,
          next_change_id: result.payload?.next_change_id ?? null,
          markets,
          source: "GGG Currency Exchange public CDN",
          historical: true,
          note:
            "The endpoint contains completed hourly digests and never includes the current hour.",
        },
        200,
        {
          "Cache-Control": `public, max-age=300, s-maxage=${CACHE_SECONDS}`,
          "X-Data-Source": "web.poecdn.com/api/currency-exchange",
        },
      );

      context.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    }

    return jsonResponse({
      configured: true,
      available: false,
      league,
      error: lastError
        ? `Currency Exchange CDN failed (${lastError.status})${
            lastError.detail ? `: ${lastError.detail}` : ""
          }`
        : "No completed-hour markets were found for this league.",
    });
  } catch (error) {
    return jsonResponse({
      configured: true,
      available: false,
      league,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
