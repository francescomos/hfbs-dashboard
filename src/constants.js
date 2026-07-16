export const IF = {
  FA24: 'Fall 24', FA25: 'Fall 25',
  WI25: 'Winter 25', WI26: 'Winter 26',
  SP25: 'Spring 25', SP26: 'Spring 26',
  SU25: 'Summer 25', SU26: 'Summer 26',
  FA26: 'Fall 26', WI27: 'Winter 27',
  SP27: 'Spring 27', SU27: 'Summer 27',
};

export const IS = {
  'FALL 24': 'FA24', 'FALL 25': 'FA25',
  'WINTER 25': 'WI25', 'WINTER 26': 'WI26',
  'SPRING 25': 'SP25', 'SPRING 26': 'SP26',
  'SUMMER 25': 'SU25', 'SUMMER 26': 'SU26',
  'FALL 26': 'FA26', 'WINTER 27': 'WI27',
  'SPRING 27': 'SP27', 'SUMMER 27': 'SU27',
};

// Anno accademico → intake codes
export const AY = {
  '25/26': ['FA25', 'WI26', 'SP26', 'SU26'],
  '26/27': ['FA26', 'WI27', 'SP27', 'SU27'],
};
export const AY_KEYS = Object.keys(AY);

export const TL = {
  PM: 'Professional Master',
  ME: 'Master Executive',
  MB: 'MBA', MBA: 'MBA',
  IC: 'Impact Course',
  RE: 'Retreat', LR: 'Retreat',
  SS: 'Summer School',
  EM: 'Executive Master',
};

export const SC = {
  Booked: '#3b82f6',
  Interviewed: '#7c3aed',
  Negotiation: '#f59e0b',
  'Contract pending': '#d97706',
  'Closed Won': '#22c55e',
  'Closed Lost': '#dc2626',
  'No Show': '#991b1b',
  Canceled: '#9ca3af',
  Rescheduled: '#60a5fa',
};

export const PA = { RE1: 'RE', HP1: 'HP', AW: 'AW1' };

export const MESI_IT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];

// P&L intake order is now driven by AY[state.year] — see pl.js / plop.js

export const INTAKE_ORDER_PANORAMICA = [
  'FALL 24', 'FALL 25', 'WINTER 25', 'WINTER 26',
  'SPRING 25', 'SPRING 26', 'SUMMER 25', 'SUMMER 26',
];

export const BRAND_SIGLE = { BRAND: 1, EVENT: 1 };
