import worker from "./index.js";

function requiredEnv(name) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function formatApiErrors(payload) {
  const errors = Array.isArray(payload?.errors) ? payload.errors : [];
  if (!errors.length) return "Unknown Cloudflare API error";
  return errors.map((item) => item?.message ?? JSON.stringify(item)).join("; ");
}

class RestD1Statement {
  constructor(database, sql, params = []) {
    this.database = database;
    this.sql = sql;
    this.params = params;
  }

  bind(...params) {
    return new RestD1Statement(this.database, this.sql, params);
  }

  async run() {
    const [result] = await this.database.execute({
      sql: this.sql,
      params: this.params,
    });
    return result ?? { success: true };
  }

  async all() {
    const [result] = await this.database.execute({
      sql: this.sql,
      params: this.params,
    });
    return {
      success: result?.success !== false,
      meta: result?.meta ?? {},
      results: Array.isArray(result?.results) ? result.results : [],
    };
  }
}

class RestD1Database {
  constructor({ accountId, databaseId, apiToken }) {
    this.endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
    this.apiToken = apiToken;
  }

  prepare(sql) {
    return new RestD1Statement(this, sql);
  }

  async batch(statements) {
    return this.execute({
      batch: statements.map((statement) => ({
        sql: statement.sql,
        params: statement.params,
      })),
    });
  }

  async execute(body) {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.success) {
      throw new Error(
        `Cloudflare D1 API request failed (${response.status}): ${formatApiErrors(payload)}`,
      );
    }

    const results = Array.isArray(payload.result) ? payload.result : [];
    const failed = results.find((item) => item?.success === false);
    if (failed) {
      throw new Error(`Cloudflare D1 query failed: ${JSON.stringify(failed)}`);
    }

    return results;
  }
}

const env = {
  PRICE_HISTORY: new RestD1Database({
    accountId: requiredEnv("CLOUDFLARE_ACCOUNT_ID"),
    databaseId: requiredEnv("CLOUDFLARE_D1_DATABASE_ID"),
    apiToken: requiredEnv("CLOUDFLARE_API_TOKEN"),
  }),
  COLLECT_LEAGUES: String(process.env.COLLECT_LEAGUES ?? "auto"),
  RETENTION_DAYS: String(process.env.RETENTION_DAYS ?? "14"),
};

const pendingTasks = [];
const context = {
  waitUntil(promise) {
    pendingTasks.push(Promise.resolve(promise));
  },
};

await worker.scheduled(
  { cron: "github-actions", scheduledTime: Date.now() },
  env,
  context,
);

if (!pendingTasks.length) {
  throw new Error("The collector did not register a scheduled task.");
}

const taskResults = await Promise.all(pendingTasks);
const collectorResults = taskResults.at(-1);
console.log(JSON.stringify(collectorResults, null, 2));

if (
  Array.isArray(collectorResults) &&
  collectorResults.some((item) => item?.ok === false)
) {
  process.exitCode = 1;
}
