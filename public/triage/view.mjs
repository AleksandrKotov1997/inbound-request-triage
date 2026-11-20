import { TOPIC_LABELS } from "../../shared/triage.mjs";

/** @typedef {import("./api.mjs").TriageResponse | { status: "pending" }} TriageState */
/**
 * @typedef {object} TriageView
 * @property {HTMLTextAreaElement} input
 * @property {HTMLButtonElement} submit
 * @property {HTMLElement} status
 * @property {HTMLElement} result
 * @property {HTMLElement} topic
 * @property {HTMLElement} draft
 */

const STATUS_MESSAGES = {
  pending: "Разбираем заявку…",
  invalid_input: "Введите текст заявки",
  manual_review: "Автоматический разбор недоступен. Разберите заявку вручную и подготовьте ответ клиенту",
  ready: "",
};

/** @param {TriageView} view @param {TriageState} state */
export function renderTriage(view, state) {
  const ready = state.status === "ready";

  view.submit.disabled = state.status === "pending";
  view.input.setAttribute("aria-invalid", String(state.status === "invalid_input"));
  view.status.textContent = STATUS_MESSAGES[state.status];
  view.topic.textContent = ready ? TOPIC_LABELS[state.topic] : "";
  view.draft.textContent = ready ? state.draft : "";
  view.result.hidden = !ready;
}
