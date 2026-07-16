import { state } from '../state.js?v=20260716';
import { buildCorsi } from './buildCorsi.js?v=20260716';

export function corsiForYear() {
  return buildCorsi().filter((c) => c.anno === state.year);
}

