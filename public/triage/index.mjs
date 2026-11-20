import { requestTriage } from "./api.mjs";
import { renderTriage } from "./view.mjs";

const form = document.getElementById("triage-form");
const input = document.getElementById("message");
const submit = document.getElementById("triage-submit");
const status = document.getElementById("triage-status");
const result = document.getElementById("triage-result");
const topic = document.getElementById("triage-topic");
const draft = document.getElementById("triage-draft");

if (
  !(form instanceof HTMLFormElement) ||
  !(input instanceof HTMLTextAreaElement) ||
  !(submit instanceof HTMLButtonElement) ||
  !status || !result || !topic || !draft
) {
  throw new Error("The triage form is incomplete");
}

const view = { input, submit, status, result, topic, draft };

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submit.disabled) return;

  const text = input.value;
  if (!text.trim()) {
    renderTriage(view, { status: "invalid_input" });
    input.focus();
    return;
  }

  renderTriage(view, { status: "pending" });
  renderTriage(view, await requestTriage(text));
});
