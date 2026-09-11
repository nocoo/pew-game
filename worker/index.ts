import { createSessionToken, validateSubmission } from "../src/lib/anticheat";
import { getTopScores, insertScore } from "../src/lib/db";
import { APP_VERSION } from "../src/lib/version";

const MAX_BODY_BYTES = 4096;

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

async function readSubmission(request: Request): Promise<{ value: unknown } | { response: Response }> {
  const tooLarge = () => ({ response: json({ error: "request too large" }, 413) });
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) return tooLarge();
  const reader = request.body?.getReader();
  if (!reader) return { response: json({ error: "invalid JSON" }, 400) };
  let length = 0;
  let text = "";
  const decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false });
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY_BYTES) {
        await reader.cancel();
        return tooLarge();
      }
      text += decoder.decode(value, { stream: true });
    }
    return { value: JSON.parse(text + decoder.decode()) };
  } catch {
    return { response: json({ error: "invalid JSON" }, 400) };
  } finally {
    reader.releaseLock();
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (!path.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (!["/api/live", "/api/token", "/api/scores"].includes(path)) {
      return json({ error: "not found" }, 404);
    }
    const allowed = path === "/api/scores" ? ["GET", "POST"] : ["GET"];
    if (!allowed.includes(request.method)) {
      return json({ error: "method not allowed" }, 405, { Allow: allowed.join(", ") });
    }
    const secret = env.ANTICHEAT_SECRET;
    const configured = typeof secret === "string" && secret.length >= 32;
    if (path === "/api/live") {
      let connected = false;
      try {
        // An empty scores table is healthy; a missing schema or D1 failure is not.
        await env.DB.prepare("SELECT 1 FROM scores LIMIT 1").first();
        connected = true;
      } catch {
        console.error(JSON.stringify({ event: "database_unavailable", path }));
      }
      const healthy = connected && configured;
      return json({ status: healthy ? "ok" : "error", version: APP_VERSION, database: { connected } }, healthy ? 200 : 503);
    }
    try {
      if (path === "/api/scores" && request.method === "GET") {
        return json(await getTopScores(env.DB));
      }
      if (!configured) return json({ error: "service unavailable" }, 503);
      if (path === "/api/token") return json(await createSessionToken(secret));
      const body = await readSubmission(request);
      if ("response" in body) return body.response;
      const result = await validateSubmission(body.value, secret);
      if (!result.valid) return json({ error: result.error }, 403);
      const saved = await insertScore(env.DB, result.submission, result.duration);
      if (!saved.inserted) return json({ error: "session already used" }, 403);
      // Identical retries repeat the successful response with the original public score.
      return json(saved, 201);
    } catch {
      console.error(JSON.stringify({ event: "api_unavailable", path }));
      return json({ error: "service unavailable" }, 503);
    }
  },
} satisfies ExportedHandler<Env>;
