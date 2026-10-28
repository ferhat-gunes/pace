# PACE — calm premium mobile system

## Approved direction

The owner chose a calm, premium mobile application. Replace the former warm ruled-list world with a coherent light consumer-app system. Orange remains the brand and action color. No marketing hero, motivational copy or decorative charts. The memorable interaction is a single editable time total with an exact completion action as the target approaches.

## Tokens

- Canvas #f5f6f8; surface #ffffff; ink #18212b; secondary #646f7c; border #e5e9ee.
- Action #c6491d; dark action #a63914; action surface #fff0e9.
- Completion #1e6b4a on #edf7f1; error #b42318.
- Manrope variable400–800, self-hosted with its SIL OFL license. No external font request at runtime.
- Headings28–30px, habit titles15–16px, body13–15px, numeric inputs16–18px.
- Primary touch targets48px; week navigation44px minimum height; control gaps8px.
- Habit surfaces16px radius, single subtle border, no decorative shadows. Mobile gutters20px.

## Today

A compact toolbar carries the date title, displayed scope and Add. The weekly selector is a separate seven-cell calendar with a solid orange selected state. Each routine is one recording surface: semanticSVG indicator/name, quantity state, slim progress and an aligned action area.

Minutes have one editable total in the header beside the target. Far from a minimum target, +5/+15/+30 minute controls are available. Within five minutes, one exact completion action replaces competing increments. Completed minute controls settle into confirmation while the total remains editable. Maximum targets retain recording controls. Other quantities use a cohesive inline stepper; check habits use one labeled action without a redundant progress bar.

Saved undo is available in a global eight-second toast, so habit height does not grow after saving. Error/conflict recovery stays persistent within the affected routine. Focused input and unchanged button descendants remain mounted during saving.

## Other screens

Progress uses the same surfaces and numeric typography, with clear grouped units. Habits use management rows; edits remain there. Forms use filled neutral fields, visible selected states and48px actions. Only the body of a dialog scrolls; header/footer stay reachable. Auth uses a narrow focused form and the shared typography/control system. Startup remains a neutral brand/status surface until session resolution.

## Responsive and accessibility

Desktop uses a232px sidebar and a max900px work area. Up to767px, navigation stays fixed at the bottom with active icon backplates; content reserves scroll space. Native hidden must override all component display rules. Input text stays at least16px for editable amount and form fields. Keyboard focus is visible, state labels are explicit, decorative SVGs are hidden from accessibility trees, and reduced motion is respected. Fixed viewport scaling remains the owner's earlier request.

## Decision trace

UI/UX Pro Max's generic landing-page and clay-style suggestions were rejected as off-brief; its mobile target and spacing guidance was used. Frontend Design supplies the coherent identity and restraint; Impeccable supplies component/contrast/render review. Source-specific browser regression checks take precedence over generic recommendations.
