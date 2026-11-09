# PACE — calm premium mobile system

## Approved direction

PACE is a calm, premium mobile habit tracking web application and PWA with a grounded, naturalistic aesthetic. Powered by the Astryx design system (Matcha base theme) extended into the PACE brand identity.

## Brand Palette & Semantic Tokens

- **Turuncu (`#E8753B`)**: Primary brand accent, primary action buttons, focused ring, active week day, and high-priority interactions.
- **Orman yeşili (`#244C3A`)**: Deep anchor color, navigation highlights, strong surfaces, completion indicators, and brand contrast.
- **Krem (`#F4F0E6`)**: Canvas background, warm light surfaces, PWA splash, and theme backdrop.
- **Adaçayı (`#A8B59A`)**: Habit progress bars, success highlights, secondary accents, and muted dark-mode text.
- **Koyu kahve (`#38352F`)**: Primary typography, dark icons, and high-contrast readability (> 8.6:1 WCAG AAA on Krem).
- Surface `#FFFFFF` (light cards on Krem canvas); Muted text `#6B665E`; Border `#E2DDD4`.

## Typography

- **Headings**: Nunito (weights 700 and 800) for page headings, brand mark, dialog headers, and prominent numbers.
- **Body**: DM Sans (Matcha body font, weights 400, 500, 600, 700) for habit titles, form inputs, and controls.
- Playwrite US Trad cursive heading font from original Matcha is completely removed in favor of clean, warm, readable Nunito.
- Fonts are self-hosted locally in `/assets/fonts/` (OFL licensed) for full PWA offline reliability with zero third-party font requests.

## Astryx Matcha Theme Foundation

- Base theme: `@astryxdesign/theme-matcha` integrated via CSS scope and Astryx token layer bridge (`[data-astryx-theme="matcha"]`).
- Generated theme files remain unedited; all customizations are applied through supported CSS token overrides and clean modular styling.
- Responsive mobile ergonomics: 48px touch targets, bottom navigation up to 767px, 232px sidebar on desktop, single 900px centered canvas.

## Today & Habit Recording

- Single editable time total with an exact completion action as target approaches.
- Increment controls (+5, +15, +30) with adaptive completion state.
- Check routines use simple, direct affirmative action with Orman yeşili completion feedback.
- Floating bottom toast for 8-second undo window.
