# PACE — Playful Duoverse & Tactile 3D UI

## Approved direction

PACE is a vibrant, gamified mobile habit tracking web application and PWA with tactile 3D controls, clear feedback, and high-contrast readability. Powered by the Astryx design system (`@astryxdesign/theme-matcha` bridge) extended into the PACE brand identity (`src/styles/brand.css`).

## Brand Palette & Semantic Tokens

- **Canlı Yeşil (`#58CC02`, alt gölge `#46A302`)**: Tamamlama aksiyonları, başarı rozetleri ve aktif seçim göstergeleri.
- **Canlı Mavi (`#1CB0F6`, alt gölge `#1899D6`)**: Birincil odak aksiyonları, akıllı tamamlama kısayolları ve bildirim/kalkan vurguları.
- **Parlak Turuncu (`#FF9600`, alt gölge `#CC7800`)**: Seri (streak) göstergesi, aktif takvim günü ve ilerleme vurgusu.
- **Altın Sarı (`#FFC800`, alt gölge `#D6A700`)**: XP, seviye ve günlük sandık ödülleri.
- **Mistik Mor (`#CE82FF`, alt gölge `#A85CE5`)**: Sosyal gruplar ve seviye özet vurgusu.
- **Dinamik Kırmızı (`#FF4B4B`, alt gölge `#EA2B2B`)**: Hata, uyarı ve silme/arşivleme onay aksiyonları.
- **Zemin & Yüzey**: Açık modda `#F8FAFD` kanvas, `#FFFFFF` kart yüzeyi, `#111827` metin; Koyu modda (`[data-theme="dark"]`) `#0F172A` kanvas, `#1E293B` kart yüzeyi, `#F8FAFC` metin.

## Typography

- **Headings**: Nunito (weights 700 and 800) for page headings, brand mark, dialog headers, and prominent numbers.
- **Body**: DM Sans (Matcha body font, weights 400, 500, 600, 700) for habit titles, form inputs, and controls.
- Playwrite US Trad cursive heading font from original Matcha is completely removed in favor of clean, warm, readable Nunito.
- Fonts are self-hosted locally in `/assets/fonts/` (OFL licensed) for full PWA offline reliability with zero third-party font requests.

## Astryx Matcha Theme Foundation

- Base theme: `@astryxdesign/theme-matcha` integrated via CSS scope bridge (`[data-astryx-theme="matcha"]`).
- Generated theme files remain unedited; customizations are applied cleanly through CSS tokens in `src/styles/brand.css`.
- Responsive mobile-first ergonomics (`320px–430px`): minimum `44px × 44px` touch targets, compact 5-tab bottom navigation (`Bugün`, `Rutinler`, `İlerleme`, `Gruplar`, `Ayarlar`), 232px sidebar on desktop, and responsive mobile cards replacing wide horizontal tables below `768px`.

## Today & Habit Recording

- Single editable time total with an exact completion action as target approaches.
- Increment controls (+5, +15, +30) with adaptive completion state.
- Check routines use simple, direct affirmative action with Orman yeşili completion feedback.
- Floating bottom toast for 8-second undo window.
