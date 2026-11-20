import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { readApplicationText, triageApplication } from "../triage/index.mjs";

/** @typedef {import("node:http").IncomingMessage} IncomingMessage */
/** @typedef {import("node:http").ServerResponse} ServerResponse */

const HTML = "text/html; charset=utf-8";
const JAVASCRIPT = "text/javascript; charset=utf-8";
const STATIC_FILES = new Map([
  ["/", { file: "../../index.html", type: HTML }],
  ["/triage/index.mjs", { file: "../../public/triage/index.mjs", type: JAVASCRIPT }],
  ["/triage/api.mjs", { file: "../../public/triage/api.mjs", type: JAVASCRIPT }],
  ["/triage/view.mjs", { file: "../../public/triage/view.mjs", type: JAVASCRIPT }],
  ["/shared/triage.mjs", { file: "../../shared/triage.mjs", type: JAVASCRIPT }],
]);

/** @param {ServerResponse} response @param {number} status @param {object} body */
function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

/** @param {IncomingMessage} request @returns {Promise<unknown>} */
async function readRequestJson(request) {
  /** @type {Buffer[]} */
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);

  const json = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(json);
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

/** @param {IncomingMessage} request @param {ServerResponse} response */
async function handleRequest(request, response) {
  const { method, url = "" } = request;
  if (method === "GET") {
    const asset = STATIC_FILES.get(url);
    if (asset) {
      const content = await readFile(new URL(asset.file, import.meta.url));
      response.writeHead(200, { "Content-Type": asset.type });
      response.end(content);
      return;
    }
  }

  if (method !== "POST" || url !== "/api/triage") {
    sendJson(response, 404, { status: "not_found" });
    return;
  }

  const body = await readRequestJson(request);
  const text = readApplicationText(body);
  if (text === null) {
    sendJson(response, 400, { status: "invalid_input" });
    return;
  }

  const result = await triageApplication(text);
  if (!response.destroyed) sendJson(response, 200, result);
}

export function createTriageServer() {
  return createServer((request, response) => {
    handleRequest(request, response).catch(() => {
      if (response.destroyed) return;

      if (response.headersSent) {
        response.destroy();
        return;
      }

      sendJson(response, 500, { status: "server_error" });
    });
  });
}
