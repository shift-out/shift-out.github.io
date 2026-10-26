const ALLOWED_ORIGINS = new Set([
  "https://shift-out.github.io",
  "http://127.0.0.1:8788",
  "http://localhost:8788",
  "null",
]);

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://shift-out.github.io";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
}

function json(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(request),
  });
}

function cleanName(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16);
}

async function getScores(request, env) {
  const mode = new URL(request.url).searchParams.get("mode");
  if (!["standard", "strict"].includes(mode)) {
    return json(request, { error: "invalid mode" }, 400);
  }

  const { results } = await env.DB.prepare(
    `SELECT player_id AS playerId, name, score, updated_at AS updatedAt
     FROM leaderboard_scores
     WHERE mode = ?
     ORDER BY score DESC, updated_at ASC
     LIMIT 10`,
  )
    .bind(mode)
    .all();

  return json(request, { scores: results });
}

async function submitScore(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json(request, { error: "invalid json" }, 400);
  }

  const mode = body?.mode;
  const playerId = String(body?.playerId || "").slice(0, 80);
  const name = cleanName(body?.name);
  const score = Number(body?.score);

  if (!["standard", "strict"].includes(mode)) {
    return json(request, { error: "invalid mode" }, 400);
  }
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(playerId)) {
    return json(request, { error: "invalid player id" }, 400);
  }
  if (!name) {
    return json(request, { error: "name is required" }, 400);
  }
  if (!Number.isSafeInteger(score) || score < 0 || score > 1_000_000_000) {
    return json(request, { error: "invalid score" }, 400);
  }

  const now = Date.now();
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO leaderboard_scores (id, mode, player_id, name, score, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(mode, player_id) DO UPDATE SET
       name = excluded.name,
       score = MAX(leaderboard_scores.score, excluded.score),
       updated_at = CASE
         WHEN excluded.score > leaderboard_scores.score THEN excluded.updated_at
         ELSE leaderboard_scores.updated_at
       END`,
  )
    .bind(id, mode, playerId, name, score, now)
    .run();

  const { results } = await env.DB.prepare(
    `SELECT player_id AS playerId, name, score, updated_at AS updatedAt
     FROM leaderboard_scores
     WHERE mode = ?
     ORDER BY score DESC, updated_at ASC
     LIMIT 10`,
  )
    .bind(mode)
    .all();

  const rankIndex = results.findIndex((entry) => entry.playerId === playerId);
  return json(request, {
    accepted: true,
    rank: rankIndex >= 0 ? rankIndex + 1 : null,
    scores: results,
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return json(request, { ok: true });
    }
    if (url.pathname === "/scores" && request.method === "GET") {
      return getScores(request, env);
    }
    if (url.pathname === "/scores" && request.method === "POST") {
      return submitScore(request, env);
    }
    return json(request, { error: "not found" }, 404);
  },
};
