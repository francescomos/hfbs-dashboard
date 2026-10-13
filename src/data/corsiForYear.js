import { state } from '../state.js?v=20261013b';
import { buildCorsi } from './buildCorsi.js?v=20261013b';

export function corsiForYear() {
  return buildCorsi().filter((c) => c.anno === state.year);
}

