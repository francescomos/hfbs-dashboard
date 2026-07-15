import { state } from '../state.js?v=20260715b';
import { buildCorsi } from './buildCorsi.js?v=20260715b';

export function corsiForYear() {
  return buildCorsi().filter((c) => c.anno === state.year);
}

