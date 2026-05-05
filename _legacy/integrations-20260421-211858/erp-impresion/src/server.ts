import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { checkDatabaseHealth } from "./db/postgres.js";
import {
  calculateFlexoRegularFromRequest,
  loadInventoryViews,
  loadWebCatalogs
} from "./web/server-helpers.js";

const publicDir = resolve(process.cwd(), "public");
const port = 3000;

const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function sendJson(res: ServerResponse, statusCode: number, body: unknown) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(body));
}

async function readRequestBody(req: IncomingMessage): Promise<string> {
  let rawBody = "";

  for await (const chunk of req) {
    rawBody += chunk;
  }

  return rawBody;
}

async function serveStatic(pathname: string, res: ServerResponse) {
  const targetPath =
    pathname === "/" ? resolve(publicDir, "index.html") : resolve(publicDir, `.${pathname}`);

  const content = await readFile(targetPath);
  const contentType = mimeTypes[extname(targetPath)] ?? "text/plain; charset=utf-8";
  res.writeHead(200, { "Content-Type": contentType });
  res.end(content);
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/catalogs") {
      const catalogs = await loadWebCatalogs();
      sendJson(res, 200, catalogs);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/inventories") {
      const inventories = await loadInventoryViews();
      sendJson(res, 200, inventories);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/database/health") {
      const health = await checkDatabaseHealth();
      sendJson(res, health.ok ? 200 : 500, health);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/flexo-regular/calculate") {
      const rawBody = await readRequestBody(req);
      const payload = JSON.parse(rawBody || "{}") as {
        selectedMachineId?: string;
        selectedTroquelId?: string;
        input: Record<string, unknown>;
      };

      const result = await calculateFlexoRegularFromRequest(payload);
      sendJson(res, 200, result);
      return;
    }

    await serveStatic(url.pathname, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno.";
    sendJson(res, 500, { error: message });
  }
}).listen(port, () => {
  console.log(`Servidor local en http://localhost:${port}`);
});
