import { state } from '../state.js';
import { buildCorsi } from './buildCorsi.js';

export function corsiForYear() {
  return buildCorsi().filter((c) => c.anno === state.year);
}

