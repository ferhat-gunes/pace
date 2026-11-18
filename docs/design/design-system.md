# PACE Design System — Disciplined Brutalism

## 1. Aesthetic Direction
PACE uses a **Disciplined Brutalism** design system: high-contrast, zero-ornament, functional, and tactile. Every surface, border, and typographic hierarchy is designed to minimize cognitive friction during daily habit check-ins.

- **No soft shadows or gradients**: Depth is communicated strictly through surface value steps (`#0E0E0E` → `#171717` → `#202020`) and crisp `1px`/`2px` borders (`#373737`).
- **Sharp geometry**: `0px` border-radius across all cards, buttons, inputs, badges, and modals.
- **High-signal accent**: Acid green (`#C8FF2E`) is reserved exclusively for primary actions, active states, and completion signals.
- **Dual-theme support**: Dark primary (`#0E0E0E` background, `#F2F0EA` foreground) and Light inverted (`#F2F0EA` background, `#0E0E0E` foreground), controlled via `[data-theme="light"]` / `[data-theme="dark"]` in `src/styles/tokens.css`.

## 2. Typography
- **Display / UI Sans**: `Inter Tight`, `Space Grotesk`, system sans-serif.
- **Monospace (Data, Streaks, Timestamps, Labels)**: `JetBrains Mono`, `ui-monospace`, monospace — used for all numeric metrics, dates, badges, and technical labels (`tabular-nums`).

## 3. Layout & Spacing
- **8px / 4px grid**: Consistent spacing tokens (`--space-1` through `--space-12`).
- **Mobile-first**: Bottom navigation bar (`MobileNav`) on `< 768px`, persistent left `Sidebar` on desktop (`>= 768px`).
- **Touch targets**: Minimum `44px × 44px` interactive targets on mobile.

## 4. Accessibility
- WCAG AA contrast ratios for all foreground/background pairs.
- Visible `2px solid var(--signal)` focus-visible outlines.
- `prefers-reduced-motion: reduce` respected in `src/styles/base.css`.
- Semantic landmarks (`<main>`, `<nav>`, `<header>`), ARIA labels, and keyboard navigation.
