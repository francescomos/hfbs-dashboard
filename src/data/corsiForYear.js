import { state } from '../state.js?v=20260727b';
import { buildCorsi } from './buildCorsi.js?v=20260727b';

export function corsiForYear() {
  return buildCorsi().filter((c) => c.anno === state.year);
}

