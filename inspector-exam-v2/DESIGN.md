# אלקטרה אפיקים — Examination Portal Visual Contract

## North star
A calm, institutional public-transit assessment console that employees and supervisors can operate on a phone in Hebrew. Legible, trustworthy, and direct — not a marketing landing page and not a generic AI dashboard.

## Canonical source
- Runtime visual tokens: `styles.css` (`:root` and the scoped `auth-*` login components).
- Brand asset: same approved Electra Afikim image URL already present in `../inspector-exam-review-demo/index.html`.
- All user-facing screens default to Hebrew and `dir=rtl`; numeric IDs, passwords, and invitation codes are left-to-right.
- Breakpoints: mobile first under 820px; very narrow phones under 440px.

## Palette and purpose
- Deep navy `#0c2639`: brand, headings, manager authority.
- Dark ink `#10283c`: readable text.
- Transit teal `#128b84`: active actions and focus state.
- Canvas `#f5f7fa`: calm neutral working area.
- White `#ffffff`: forms and review data.
- Blue-grey `#65798a`: secondary information.

## Composition
- Login: two independent HTML entry points, `/` for workers and `/admin.html` for authorized staff. Each contains only its own two-field form, without role tabs or combined views.
- Worker entry: light transit-teal overview and a focused invitation/identity form; compact unboxed heading on mobile. Manager entry: deep navy overview and a staff-number/password form; on mobile, a contained navy introduction above a white form. Both preserve the approved Electra Afikim visual language.
- Manager: dense, scannable candidate list, owner-controlled staff access.
- Worker exam: one question at a time, progress and deadline visible, no answer key or final score for worker.
- Notice: staging-only warning remains prominent but understated and never implies approval for real personnel records.

## Behavior and accessibility
- Stable form/button geometry during pending requests; errors readable to Hebrew RTL screen readers.
- Focus-visible on inputs and controls, no horizontal overflow on narrow screens.
- Native HTML labels and form semantics are canonical.
- Avoid duplicate decorative text that crowds the mobile header.
- Keep server authorization, audit, and PostgreSQL persistence independent of visual changes.
