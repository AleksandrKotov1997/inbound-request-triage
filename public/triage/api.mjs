import { isRecord, readResultFields } from "../../shared/triage.mjs";

/** @typedef {import("../../shared/triage.mjs").ResultFields & { status: "ready" }} ReadyResponse */
/** @typedef {ReadyResponse | { status: "invalid_input" | "manual_review" }} TriageResponse */

const MANUAL_REVIEW = Object.freeze({ status: "manual_review" });

/** @param {string} text @returns {Promise<TriageResponse>} */
export async function requestTriage(text) {
  try {
    const response = await fetch("/api/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (response.status === 400) return { status: "invalid_input" };
    if (response.status !== 200) return MANUAL_REVIEW;

    /** @type {unknown} */
    const body = await response.json();
    if (isRecord(body) && body.status === "ready") {
      const result = readResultFields(body);
      if (result) return { status: "ready", ...result };
    }
  } catch {
    return MANUAL_REVIEW;
  }

  return MANUAL_REVIEW;
}
