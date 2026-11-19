/**
 * Non-judgmental "Rutin Şablonları" (Discover) catalog.
 * Framed around calm experimentation and friend sharing rather than streaks or leaderboards.
 */

export const DISCOVER_CATEGORIES = ['Tümü', 'Odaklanma', 'Hareket', 'Okuma', 'Dinginlik'];

export const DISCOVER_PRESETS = [
  {
    id: 'focus-sprint-25',
    category: 'Odaklanma',
    name: 'Derin Odaklanma',
    description: 'Günde tek bir 25 dakikalık dikkat dağınıklığı olmadan çalışma bloğu dene.',
    durationLabel: 'Haftada 5 gün • 25 dk',
    tracking: 'quantity',
    direction: 'at_least',
    unit: 'dk',
    target: 25,
    schedule: { type: 'weekly_quota', days: [], times_per_week: 5 },
  },
  {
    id: 'morning-walk-15',
    category: 'Hareket',
    name: 'Açık Hava Yürüyüşü',
    description: 'Zorlamadan haftada 3 gün 15 dakika yürüyüşle düzenli hareket alışkanlığı kur.',
    durationLabel: 'Haftada 3 gün • 15 dk',
    tracking: 'quantity',
    direction: 'at_least',
    unit: 'dk',
    target: 15,
    schedule: { type: 'weekly_quota', days: [], times_per_week: 3 },
  },
  {
    id: 'evening-reading-15',
    category: 'Okuma',
    name: 'Yatmadan Önce Okuma',
    description: 'Ekranı kapatıp günde 15 sayfa kitap okuyarak zihnini dinlendir.',
    durationLabel: 'Her gün • 15 sayfa',
    tracking: 'quantity',
    direction: 'at_least',
    unit: 'sayfa',
    target: 15,
    schedule: { type: 'daily', days: [], times_per_week: null },
  },
  {
    id: 'screen-limit-evening',
    category: 'Dinginlik',
    name: 'Akşam Ekran Sınırı',
    description: 'Akşamları sosyal medya/ekran süresini en fazla 30 dakikada tut.',
    durationLabel: 'Her gün • En fazla 30 dk',
    tracking: 'quantity',
    direction: 'at_most',
    unit: 'dk',
    target: 30,
    schedule: { type: 'daily', days: [], times_per_week: null },
  },
  {
    id: 'hydration-2l',
    category: 'Hareket',
    name: 'Günlük Su Takibi',
    description: 'Gün içine yayarak 8 bardak su içmeyi tek dokunuşla takip et.',
    durationLabel: 'Her gün • 8 bardak',
    tracking: 'quantity',
    direction: 'at_least',
    unit: 'bardak',
    target: 8,
    schedule: { type: 'daily', days: [], times_per_week: null },
  },
  {
    id: 'breath-reset-5',
    category: 'Dinginlik',
    name: '5 Dakika Nefes Molası',
    description: 'Gün ortasında kısa bir nefes ve esneme molasıyla enerjini tazele.',
    durationLabel: 'Hafta içi • 1 kez',
    tracking: 'check',
    direction: 'at_least',
    unit: '',
    target: 1,
    schedule: { type: 'weekdays', days: [1, 2, 3, 4, 5], times_per_week: null },
  },
];

export function findDiscoverPreset(presetId) {
  if (!presetId) return null;
  return DISCOVER_PRESETS.find((item) => item.id === presetId) || null;
}

export function buildDiscoverShareUrl(presetId, origin = '') {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  const cleanId = encodeURIComponent(String(presetId || ''));
  return `${base}/?view=discover&preset=${cleanId}`;
}
