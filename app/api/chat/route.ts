import { respondAsNos } from "../../../lib/openai";
import { checkRateLimit } from "../../../lib/rate-limit";
import type { ChatMessage } from "../../../lib/types";

export const runtime = "nodejs";

function clientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous"
  );
}

export async function POST(request: Request) {
  try {
    const rate = checkRateLimit(clientKey(request));
    if (!rate.allowed) {
      return Response.json(
        { error: "The demonstration has reached its temporary usage limit. Please try again later." },
        { status: 429 }
      );
    }

    const body = (await request.json()) as { messages?: ChatMessage[] };
    const messages = body.messages || [];
    if (!messages.length || messages.length > 10) {
      return Response.json(
        { error: "The demonstration allows up to five exchanges per session." },
        { status: 400 }
      );
    }
    if (messages.some((message) => message.content.length > 5000)) {
      return Response.json({ error: "The message is too long for this demonstration." }, { status: 400 });
    }

    const result = await respondAsNos(messages);
    return Response.json({ ...result, remaining: rate.remaining });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return Response.json({ error: message }, { status: 500 });
  }
}
