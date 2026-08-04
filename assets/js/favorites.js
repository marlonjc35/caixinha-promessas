/* favorites.js - Gerencia favoritos */
import LS from "./storage.js";
const FAV_KEY = "cp_favorites";

export function toggleFavorite(verse) {
  const favs = LS.get(FAV_KEY) || [];
  const idx = favs.findIndex((v) => v.id === verse.id);
  if (idx === -1) {
    favs.push(verse);
  } else {
    favs.splice(idx, 1);
  }
  LS.set(FAV_KEY, favs);
  return favs;
}

export function getFavorites() {
  return LS.get(FAV_KEY) || [];
}

export function removeFavorite(id) {
  const favs = LS.get(FAV_KEY) || [];
  const filtered = favs.filter((f) => f.id !== id);
  LS.set(FAV_KEY, filtered);
  return filtered;
}

export function clearFavorites() {
  LS.remove(FAV_KEY);
}

export function searchFavorites(q) {
  const ql = String(q || "")
    .toLowerCase()
    .trim();
  if (!ql) return getFavorites();
  return getFavorites().filter((v) => {
    return (
      (v.book && v.book.toLowerCase().includes(ql)) ||
      (v.text && v.text.toLowerCase().includes(ql)) ||
      (v.category && v.category.toLowerCase().includes(ql)) ||
      (v.chapter && String(v.chapter) === ql)
    );
  });
}
