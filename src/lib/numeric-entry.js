/** Accept either Turkish decimal comma or decimal point; never coerce invalid input to zero. */
export function parseEntryAmount(raw) {
  const text = String(raw ?? '').trim();
  if (!text) throw new Error('Miktarı gir. Sıfır kaydetmek için 0 yaz.');
  if (!/^\d+(?:[.,]\d+)?$/.test(text)) throw new Error('Geçerli bir sayı gir. Ondalık için virgül veya nokta kullanabilirsin.');
  const value = Number(text.replace(',', '.'));
  if (!Number.isFinite(value) || value < 0 || value > 1000000) throw new Error('Miktar 0 ile 1.000.000 arasında olmalı.');
  return value;
}
