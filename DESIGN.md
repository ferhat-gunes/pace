# PACE — scrapbook habit journal

PACE adapts the visual language of the supplied Family Recipes project to habit tracking. The reference is visual source material; its recipe features and project instructions are not part of PACE.

## Visual system

Warm dotted paper (`#FFF4D6`), cream cards (`#FFFDF7`), ink outlines (`#29221E`), two-pixel borders and hard offset shadows replace the previous soft Matcha appearance. Coral (`#FF9470`), sunflower (`#FFD457`) and teal (`#72D8C5`) are sticker colors. Controls use dark text on these colors. Status colors remain distinct and include text or icons.

Rubik provides readable body text and labels. Permanent Marker provides the taped PACE wordmark. Caveat provides a consistent Turkish-capable display and handwritten note face. Font files and their OFL licenses live in `assets/fonts/scrapbook/`. No remote font requests are made.

`src/styles/scrapbook.css` is the active visual layer, loaded after the small `foundation.css` structural layer and Astryx foundation. Its tokens bridge the existing semantic variables so account flows, habits, progress, groups and preferences share one appearance. Keep future visual changes in this layer instead of adding competing overrides to the legacy, unloaded `brand.css`.

## Components and layout

- Desktop retains PACE's sidebar and centered reading canvas. Navigation uses tilted colored tabs and a taped wordmark.
- Mobile uses five bottom tabs with dark icons, safe-area padding, a teal add button and responsive habit cards.
- Today uses outlined calendar tiles and coral, yellow and teal card accents. Completion remains tied to real account data.
- Habits, archives, empty states, progress summaries, shared group tables and settings use the same paper cards, outlines and shadows.
- Habit, group, invitation and authentication forms share outlined fields and sticker buttons. Mobile dialogs open as bottom sheets.
- Dark mode uses warm charcoal paper, cream text and pastel stickers. Reduced motion disables transitions and animations.

## Interaction requirements

Preserve existing data, API calls, Turkish labels, recording, archive, backup, authentication and group behavior. Use visible keyboard focus, text labels, at least 44px primary touch targets and responsive layouts without page-level horizontal scrolling. Group matrices may scroll within their labeled table region.

Build through `npm run build`; the existing build copies fonts into the PWA assets and includes them in the service worker shell. Do not publish as part of a design change unless the user asks.
