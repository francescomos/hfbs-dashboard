import { state } from '../state.js?v=20260727d';
import { buildCorsi } from './buildCorsi.js?v=20260727d';

export function corsiForYear() {
  return buildCorsi().filter((c) => c.anno === state.year);
}

