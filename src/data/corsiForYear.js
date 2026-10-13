import { state } from '../state.js?v=20261013d';
import { buildCorsi } from './buildCorsi.js?v=20261013d';

export function corsiForYear() {
  return buildCorsi().filter((c) => c.anno === state.year);
}

