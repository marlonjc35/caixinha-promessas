/* storage.js
   Helpers para persistência em LocalStorage: histórico, favoritos, progresso do ciclo, estatísticas.
*/

const LS = {
  get(key){ try { return JSON.parse(localStorage.getItem(key)); } catch(e){ return null } },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)); },
  remove(key){ localStorage.removeItem(key); }
};

export default LS;
