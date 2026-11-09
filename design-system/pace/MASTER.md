# PACE design system

## Product character

Calm, direct habit tracking for several routines. PACE encourages consistency without turning missed days into a moral score.
Built upon Astryx design system with Matcha theme foundation, customized into the PACE visual identity.

## Color tokens

- Primary action (Turuncu): `#E8753B`
- Dark anchor (Orman yeşili): `#244C3A`
- Canvas (Krem): `#F4F0E6`
- Surface: `#FFFFFF`
- Progress & secondary accent (Adaçayı): `#A8B59A`
- Main text & dark icons (Koyu kahve): `#38352F`
- Secondary text: `#6B665E`
- Border: `#E2DDD4`
- Error: `#C53B27`

Turuncu is an intentional accent for primary actions. Orman yeşili provides depth and grounding. Status always includes text or a symbol as well as color.

## Typography

- Headings: Nunito (700, 800)
- Body: DM Sans (400, 500, 600, 700)
- Fully self-hosted locally for PWA offline capability.

## Layout and interaction

- Mobile-first, with bottom navigation on small screens (up to 767px) and 232px sidebar on wide screens.
- Keep the main reading column constrained; Today is a list, not a wall of identical cards.
- Put advanced rules behind progressive disclosure.
- Use semantic controls, visible keyboard focus, 48px touch targets, and reduced-motion support.
- Keep the application shell lightweight and self-hosted; do not load third-party scripts or fonts.

## Voice

Use short, plain Turkish labels such as “Kaydet”, “Duraklat”, and “Arşivle”. Describe missed targets factually. Unscheduled days are not misses.
