import { state } from '../state.js?v=20260715c';
import { buildCorsi } from './buildCorsi.js?v=20260715c';

export function corsiForYear() {
  return buildCorsi().filter((c) => c.anno === state.year);
}

