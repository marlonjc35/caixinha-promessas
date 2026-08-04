/* audio.js - Gerencia sons opcionais (clique, reveal) */

let enabled = true;
export function setEnabled(v){ enabled = !!v; }
export function play(name){ if(!enabled) return; /* implementar reprodução de sons */ }
