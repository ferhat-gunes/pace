# PACE interface system

## Direction

A quiet daily tool with orange for the primary action and selected state. Preserve the chosen warm neutral canvas; it supports the orange brand and a low-glare daily-use surface. White defines controls and dialogs. Green is reserved for completion, red for actionable errors.

## Tokens

- Canvas: #fbf8f4. Surface: #ffffff.
- Primary: #c2410c. Dark orange: #9a3412. Soft orange: #ffedd5.
- Main text: #1f2937. Secondary text: #645f59.
- Success: #166534. Error: #b91c1c.
- System sans-serif, 16px mobile inputs, restrained weights.
- Interactive controls generally at least 44 px; visible keyboard focus; reduced-motion preference respected.

## Layout and copy

Today uses a clickable date title, a compact Planlı/Tümü filter alongside Add, a week selector and the routine list. There is no hero or decorative summary card. Entry controls stay in the routine row. Navigation icons are SVG with text labels. The simple creation dialog shows name, tracking and repeat; advanced rules remain collapsed. Dialog header and footer remain in place while its body scrolls.

Use short labels and retain explanations only for a meaningful rule, error, recovery credential or destructive action. Stable save confirmation disappears after three seconds. Never replace an error with a transient toast alone.

## Review notes

The mechanical design detector found an avatar contrast issue and a skipped heading level; these were corrected. Its dialog-padding warning referred to the unpadded outer dialog, whose header/body/footer have explicit padding. The warm canvas is an intentional existing brand choice.

## Mobile refinement — 28 October 2026

Remove Today row overflow/edit actions. Align amount controls to the left on phones. Keep navigation fixed with an opaque surface. Use minimum16px inputs and a fixed viewport scale per the product owner request; touch gestures prioritize scrolling rather than accidental zoom. Progress uses quiet ruled sections and two-column mobile definition lists, not charts without meaningful data.

## Critique resolutions

Enforce20px mobile gutters with safe-area fallbacks, including the supplied490×779 screenshot dimensions. Use one-column habit rows with left-aligned actions for every tracking type. Quantities pair actual and target on one line and use the available track width. Remove binary progress tracks. Date input stays collapsed behind the heading; save status occupies the existing caption line without causing layout movement. Bottom navigation stays fixed through767px widths and scrolling. Native input spinner chrome is hidden for amount fields; keyboard semantics and16px text remain.

## Spacing and startup review loop

Primary recording controls use48px targets with8px gaps; week dates remain44px. Minute controls fit the280px inner width at320px without overflow; safe-area pressure permits wrapping. Rows use16px vertical padding and8px internal gaps. Advanced progression presets form one horizontal row above their fields, with an orange selected state. Startup is centered brand/status, with recovery in a collapsed disclosure; app and login stay hidden until session resolution.
