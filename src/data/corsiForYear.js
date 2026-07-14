import { state } from '../state.js';
import { AY } from '../constants.js';
import { buildCorsi } from './buildCorsi.js';

export function corsiForYear() {
  const intakes = AY[state.year] || [];
  return buildCorsi().filter((c) => intakes.indexOf(c.intake) >= 0);
}
