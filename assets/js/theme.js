/* theme.js - Gerencia Light/Dark e preferências */
import LS from './storage.js';
const THEME_KEY = 'cp_theme';

export function applyTheme(theme){
  if(theme === 'dark') document.documentElement.setAttribute('data-theme','dark');
  else document.documentElement.removeAttribute('data-theme');
  LS.set(THEME_KEY, theme);
}

export function loadTheme(){
  const t = LS.get(THEME_KEY) || 'light';
  applyTheme(t);
}
