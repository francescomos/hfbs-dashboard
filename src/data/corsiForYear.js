import { state } from '../state.js?v=20261013';
import { buildCorsi } from './buildCorsi.js?v=20261013';

export function corsiForYear() {
  return buildCorsi().filter((c) => c.anno === state.year);
}

