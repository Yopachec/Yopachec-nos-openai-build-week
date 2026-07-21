import { randomUUID } from "node:crypto";
import { generateEvaluatedCase } from "../../../lib/openai";

export const runtime = "nodejs";

const cache = new Map<string, { expiresAt: number; value: Awaited<ReturnType<typeof generateEvaluatedCase>> }>();
const inFlight = new Map<string, Promise<Awaited<ReturnType<typeof generateEvaluatedCase>>>>();

function visitorKey(request: Request) {
  const sessionId = request.headers.get("x-nos-session")?.trim();
  if (sessionId && /^[a-zA-Z0-9-]{16,80}$/.test(sessionId)) {
    return `session:${sessionId}`;
  }
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous"
  );
}

export async function POST(request: Request) {
  const key = visitorKey(request);
  const now = Date.now();
  const existing = cache.get(key);
  if (existing && existing.expiresAt > now) {
    return Response.json(existing.value, { headers: { "cache-control": "private, no-store" } });
  }

  try {
    let task = inFlight.get(key);
    if (!task) {
      task = generateEvaluatedCase(randomUUID());
      inFlight.set(key, task);
    }
    const value = await task;
    cache.set(key, { value, expiresAt: now + 6 * 60 * 60 * 1000 });
    return Response.json(value, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "The synthetic case could not be generated." },
      { status: 500 }
    );
  } finally {
    inFlight.delete(key);
  }
}
