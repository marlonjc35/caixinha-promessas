/* search.js - Funções de busca por livro, palavra, capítulo, categoria */
import { VERSES } from './database.js';

export function search(query){
  // implementado na próxima etapa
  const q = String(query).toLowerCase().trim();
  return VERSES.filter(v => {
    return v.book.toLowerCase().includes(q) || v.text.toLowerCase().includes(q) || (v.category || '').toLowerCase().includes(q) || v.chapter === q;
  });
}
