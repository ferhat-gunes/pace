/**
 * Yerel saat dilimine göre YYYY-MM-DD tarih dizesi üretir.
 * UTC kayması (ör. Türkiye'de 00:00-03:00 arası bir önceki güne düşme) sorununu önler.
 */
export function localDateIso(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDaysIso(iso, days) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localDateIso(d);
}
