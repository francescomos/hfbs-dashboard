import { state } from '../state.js?v=20260727';
import { buildCorsi } from './buildCorsi.js?v=20260727';

export function corsiForYear() {
  return buildCorsi().filter((c) => c.anno === state.year);
}

