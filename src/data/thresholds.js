/**
 * Soglie numeriche usate in tutto il progetto.
 * Centralizzate qui per poter essere modificate in un unico posto.
 * Ogni soglia ha una nota che spiega il criterio.
 */

// Zona rossa: corsi con target <70% e <45 giorni al via = azione urgente.
export const ZR_PCT_TARGET = 70;
export const ZR_MAX_DAYS = 45;

// Marketing CPA considerato "alto": oltre €1.000 per iscritto.
// Sopra questa soglia, il costo di acquisizione supera tipicamente il margine unitario.
export const CPA_ALERT = 1000;

// No-show colloqui: oltre il 15% i qualifying call non sono sotto controllo (benchmark industry).
export const NO_SHOW_ALERT_PCT = 15;

// Dropout pipeline: oltre il 40% dei deal lost/(won+lost) indica qualifica debole a monte.
export const DROPOUT_ALERT_PCT = 40;

// Conversione: velocità dal lead al won.
// Sotto CONV_GOOD_DAYS = performance ottima, sopra CONV_BAD_DAYS = processo lento.
export const CONV_GOOD_DAYS = 14;
export const CONV_BAD_DAYS = 30;

// Margine target aziendale (al netto di costi diretti + mktg).
export const MARGIN_TARGET_PCT = 30;

// Delivery cost — % revenue spesa in delivery (costi fissi + variabili per pax).
// Sotto DELIVERY_GOOD_PCT ottimo, sopra DELIVERY_BAD_PCT preoccupante.
export const DELIVERY_GOOD_PCT = 30;
export const DELIVERY_BAD_PCT = 50;

// CPL — Cost Per Lead Meta.
// <20€ = buono, 20-40€ = attenzione, >40€ = alto.
export const CPL_GOOD = 20;
export const CPL_WARN = 40;

// Breakeven marker visibile nella card solo se cade dentro il range del target (1-100%).
export const BREAKEVEN_MAX_PCT = 100;
