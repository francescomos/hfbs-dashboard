import { state } from '../state.js?v=20261013c';
import { buildCorsi } from './buildCorsi.js?v=20261013c';

export function corsiForYear() {
  return buildCorsi().filter((c) => c.anno === state.year);
}

