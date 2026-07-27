import { state } from '../state.js?v=20260717';
import { buildCorsi } from './buildCorsi.js?v=20260717';

export function corsiForYear() {
  return buildCorsi().filter((c) => c.anno === state.year);
}

