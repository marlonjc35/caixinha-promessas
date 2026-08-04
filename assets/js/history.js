/* history.js - Gerencia histórico de promessas exibidas */

import LS from "./storage.js";

const HISTORY_KEY = "cp_history";

export function addToHistory(entry) {
  const h = LS.get(HISTORY_KEY) || [];
  h.unshift(entry);
  LS.set(HISTORY_KEY, h);
}

export function getHistory() {
  return LS.get(HISTORY_KEY) || [];
}

export function removeFromHistory(id) {
  const h = LS.get(HISTORY_KEY) || [];
  const filtered = h.filter((item) => item.id !== id);
  LS.set(HISTORY_KEY, filtered);
  return filtered;
}

export function clearHistory() {
  LS.remove(HISTORY_KEY);
}

export function searchHistory(query) {
  const q = String(query || "")
    .toLowerCase()
    .trim();
  if (!q) return getHistory();
  return getHistory().filter((v) => {
    return (
      (v.book && v.book.toLowerCase().includes(q)) ||
      (v.text && v.text.toLowerCase().includes(q)) ||
      (v.category && v.category.toLowerCase().includes(q)) ||
      (v.chapter && String(v.chapter) === q)
    );
  });
}
