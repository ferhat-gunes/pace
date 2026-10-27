# PACE design system

## Product character

Calm, direct habit tracking for several routines. PACE encourages consistency without turning missed days into a moral score.

## Color tokens

- Primary action: `#C2410C` (high-contrast deep orange)
- Warm highlight: `#FFEDD5`
- Canvas: `#FBF8F4`
- Surface: `#FFFFFF`
- Main text: `#1F2937`
- Secondary text: `#6B7280`
- Border: `#E7E1DA`
- Success: `#166534`; error: `#B91C1C`

Orange is an accent, not a page fill. Status always includes text or a symbol as well as color.

## Layout and interaction

- Mobile-first, with bottom navigation on small screens and a narrow left navigation on wide screens.
- Keep the main reading column constrained; Today is a list, not a wall of identical cards.
- Put advanced rules behind progressive disclosure.
- Use semantic controls, visible keyboard focus, 44 px or larger touch targets, and reduced-motion support.
- Keep the application shell lightweight and self-hosted; do not load third-party scripts or fonts.

## Voice

Use short, plain Turkish labels such as “Kaydet”, “Duraklat”, and “Arşivle”. Describe missed targets factually. Unscheduled days are not misses.

## Avoid

Orange gradients, excessive badges, shame-driven streaks, hidden save failures, and browser storage as the cloud source of truth.
