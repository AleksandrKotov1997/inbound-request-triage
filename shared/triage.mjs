export const TOPIC_LABELS = Object.freeze({
  delivery: "Доставка",
  pricing: "Цена",
  other: "Другое",
});

/** @typedef {keyof typeof TOPIC_LABELS} Topic */
/** @typedef {{ topic: Topic, draft: string }} ResultFields */

const VISIBLE_CHARACTER = /[^\s\p{Other}\p{Default_Ignorable_Code_Point}]/u;

/** @param {unknown} value @returns {value is Record<string, unknown>} */
export function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** @param {unknown} value @returns {value is Topic} */
function isTopic(value) {
  return typeof value === "string" && Object.hasOwn(TOPIC_LABELS, value);
}

/** @param {unknown} value @returns {ResultFields | null} */
export function readResultFields(value) {
  if (!isRecord(value)) return null;

  const { topic, draft } = value;
  if (!isTopic(topic) || typeof draft !== "string" || !VISIBLE_CHARACTER.test(draft)) {
    return null;
  }

  return { topic, draft };
}
