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

Today uses a compact title, date/filter row, week selector and routine list. There is no hero or decorative summary card. Entry controls stay in the routine row. Navigation icons are SVG with text labels. The simple creation dialog shows name, tracking and repeat; advanced rules remain collapsed. Dialog header and footer remain in place while its body scrolls.

Use short labels and retain explanations only for a meaningful rule, error, recovery credential or destructive action. Stable save confirmation disappears after three seconds. Never replace an error with a transient toast alone.

## Review notes

The mechanical design detector found an avatar contrast issue and a skipped heading level; these were corrected. Its dialog-padding warning referred to the unpadded outer dialog, whose header/body/footer have explicit padding. The warm canvas is an intentional existing brand choice.
