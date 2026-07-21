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

function marketCodes(market) {
  if (Array.isArray(market?.market_pair)) {
    return market.market_pair.map((value) => String(value ?? ""));
  }
  return String(market?.market_id ?? "").split("|");
}

function positivePair(dictionary, codes) {
  return (
    dictionary &&
    typeof dictionary === "object" &&
    codes.length === 2 &&
    codes.every((code) => Number(dictionary[code]) > 0)
  );
}

function usableMarket(market) {
  const codes = marketCodes(market);
  if (codes.length !== 2 || !codes[0] || !codes[1] || codes[0] === codes[1]) {
    return false;
  }

  if (!positivePair(market?.volume_traded, codes)) {
    return false;
  }

  return (
    positivePair(market?.lowest_ratio, codes) ||
    positivePair(market?.highest_ratio, codes)
  );
}

async function requestHour(timestamp) {
  const response = await fetch(`${CDN_BASE}/${timestamp}`, {
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

  return {
    ok: true,
    payload: await response.json(),
  };
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

      const leagueMarkets = Array.isArray(result.payload?.markets)
        ? result.payload.markets.filter(
            (market) => String(market?.league ?? "") === league,
          )
        : [];
      const markets = leagueMarkets.filter(usableMarket);

      if (!markets.length && hoursAgo < MAX_LOOKBACK_HOURS) continue;

      const response = jsonResponse(
        {
          configured: true,
          available: markets.length > 0,
          league,
          hour: timestamp,
          next_change_id: result.payload?.next_change_id ?? null,
          markets,
          diagnostics: {
            received_for_league: leagueMarkets.length,
            usable: markets.length,
            filtered: leagueMarkets.length - markets.length,
          },
          source: "GGG Currency Exchange public CDN",
          historical: true,
          note:
            "Only completed hourly digests are returned; the current hour is unavailable.",
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
        : "No usable completed-hour markets were found for this league.",
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
