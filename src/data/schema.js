const EXPECTED_KEYS = [
  'Config_Corsi',
  'OA_Summary',
  'OA_Studenti',
  'Brevo_Deals',
  'Brevo_Contacts',
  'Gravity_Forms',
  'Calendly',
  'Mktg_ExEd',
  'Mktg_ExEd_Weekly',
  'Budget_Prodotti',
  'Meta_Campaigns',
  'Meta_Campaign_Daily',
  'GAds_Campaigns',
  'GA4_Pages',
  'GA4_SourcePage',
  'Feedback',
  'OP_Revenue',
];

export function validateDatalake(data) {
  const warnings = [];
  if (!data || typeof data !== 'object') {
    return { ok: false, warnings: ['Risposta non è un oggetto JSON valido'] };
  }
  if (data.error) {
    return { ok: false, warnings: ['Errore dal datalake: ' + data.error] };
  }
  for (const k of EXPECTED_KEYS) {
    if (!(k in data)) warnings.push(`Chiave mancante: ${k}`);
    else if (!Array.isArray(data[k])) warnings.push(`${k} non è un array`);
  }
  if (warnings.length) console.warn('[Schema]', warnings);
  return { ok: true, warnings };
}
