export async function GET() {
  const api = Boolean(process.env.OPENAI_API_KEY);
  const vectorStore = Boolean(process.env.OPENAI_VECTOR_STORE_ID);

  return Response.json(
    {
      ready: api && vectorStore,
      checks: { api, vectorStore },
      version: "1.2.5"
    },
    {
      headers: {
        "cache-control": "no-store"
      }
    }
  );
}
