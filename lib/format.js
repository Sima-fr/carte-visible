export function parsePrice(str) {
  if (!str) return 0;
  const match = String(str).replace(',', '.').match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

export function formatPrice(str) {
  const n = parsePrice(str);
  if (!n) return '';
  const hasCents = n % 1 !== 0;
  const formatted = hasCents ? n.toFixed(2).replace('.', ',') : String(n);
  return `${formatted} €`;
}
