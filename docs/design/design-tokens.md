# PACE Design Tokens

Source of truth: `src/styles/tokens.css`, `src/styles/foundation.css`, `src/styles/base.css`.

## Color Tokens (Dark Primary)
| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#0E0E0E` | Primary canvas background |
| `--surface-1` | `#171717` | Card & panel surface |
| `--surface-2` | `#202020` | Elevated/hover surface, inputs |
| `--fg` | `#F2F0EA` | Primary text & icons |
| `--fg-muted` | `#A09E97` | Secondary text & captions |
| `--border` | `#373737` | Structural `1px` / `2px` borders |
| `--signal` | `#C8FF2E` | Acid green primary CTA & completion |
| `--signal-fg` | `#0E0E0E` | Text on `--signal` background |
| `--danger` | `#FF4D4D` | Destructive actions & errors |
| `--warning` | `#FFB800` | Grace period / streak freeze alerts |

## Color Tokens (Light Inverted)
| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#F2F0EA` | Primary canvas background |
| `--surface-1` | `#E6E3DC` | Card & panel surface |
| `--surface-2` | `#DAD6CE` | Elevated/hover surface |
| `--fg` | `#0E0E0E` | Primary text & icons |
| `--border` | `#1C1C1C` | Structural borders |

## Geometry & Borders
- `--radius`: `0px` (enforced globally)
- `--border-width`: `1px` (standard), `2px` (active/focus/emphasis)
- `--shadow`: `none`

## Typography Tokens
- `--font-sans`: `'Inter Tight', 'Space Grotesk', system-ui, sans-serif`
- `--font-mono`: `'JetBrains Mono', ui-monospace, monospace`
