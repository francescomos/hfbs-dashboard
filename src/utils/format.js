export const fE = (n) => (n ? '€' + Math.round(n).toLocaleString('it-IT') : '€0');

export const fEk = (n) => {
  if (!n) return '€0';
  if (Math.abs(n) >= 1_000_000) return '€' + (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 10_000) return '€' + Math.round(n / 1000) + 'k';
  return '€' + Math.round(n).toLocaleString('it-IT');
};

export const fD = (s) => {
  if (!s) return '';
  try {
    const d = new Date(s);
    if (isNaN(d)) return s;
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return s;
  }
};

export const fDshort = (s) => {
  if (!s) return '';
  try {
    const d = new Date(s);
    if (isNaN(d)) return s;
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
  } catch {
    return s;
  }
};
