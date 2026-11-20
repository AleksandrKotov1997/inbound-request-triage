import { isRecord, readResultFields } from "../../shared/triage.mjs";

/** @param {unknown} body */
export function readApplicationText(body) {
  if (!isRecord(body) || typeof body.text !== "string" || !body.text.trim()) {
    return null;
  }

  return body.text;
}

/** @param {unknown} reply */
export function readModelResult(reply) {
  if (typeof reply !== "string") return null;

  /** @type {unknown} */
  let body;
  try {
    body = JSON.parse(reply);
  } catch {
    return null;
  }

  return readResultFields(body);
}
