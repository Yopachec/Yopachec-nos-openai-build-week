import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const serverDir = resolve("dist/server");
const entryPath = resolve(serverDir, "index.js");
const runtimePath = resolve(serverDir, "vinext-runtime.js");
const htmlPath = resolve(serverDir, "prerendered-routes/index.html");

const html = await readFile(htmlPath, "utf8");
await rename(entryPath, runtimePath);

const wrapper = `import runtime from "./vinext-runtime.js";

const homepage = ${JSON.stringify(html)};

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") {
      return new Response(homepage, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=60, stale-while-revalidate=300",
        },
      });
    }
    if (typeof runtime === "function") {
      return runtime(request, env, context);
    }
    return runtime.fetch(request, env, context);
  },
};
`;

await writeFile(entryPath, wrapper);
