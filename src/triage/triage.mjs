import { classify } from "../../mock-ai.mjs";
import { readModelResult } from "./validation.mjs";

const MODEL_TIMEOUT_MS = 300;
const MANUAL_REVIEW = Object.freeze({ status: "manual_review", topic: null, draft: null });

/** @param {string} text */
export async function triageApplication(text) {
  const controller = new AbortController();
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  /** @type {Promise<null>} */
  const deadline = new Promise((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, MODEL_TIMEOUT_MS);
  });

  let reply;
  try {
    reply = await Promise.race([classify(text, { signal: controller.signal }), deadline]);
  } catch {
    return MANUAL_REVIEW;
  } finally {
    clearTimeout(timer);
  }

  const result = readModelResult(reply);
  return result ? { status: "ready", topic: result.topic, draft: result.draft } : MANUAL_REVIEW;
}
