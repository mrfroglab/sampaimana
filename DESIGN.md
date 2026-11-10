# Sampai Mana — design system

"Clinical blueprint on frosted paper": a monochrome, shadcn-style workshop UI.
Black text, white cards floating on a soft gray canvas, hairline borders, pill
controls. Tokens live in `app/app.css`; primitives in `app/components/ui.tsx`.

## Rules

1. **Achromatic.** Everything is ink / gray / white. Emphasis comes from weight,
   size and the ink-filled treatment, never from color.
2. **One red (`ember`).** Only for: the live "current stage" dot on the status
   rail, the dot in the logo, overdue/attention states, and destructive or
   error states. Never decorative, never for links, never for brand.
3. **Radius = hierarchy.** Pills (`rounded-full`) for buttons, inputs, selects,
   badges, chips, tabs. `rounded-3xl` (24px) for cards/containers/dialogs.
   `rounded-2xl` (18px) for textareas, alerts, toasts and menus. `rounded-lg`
   (10px) for tiles nested inside a card. `rounded-sm` (6px) only for tiny
   things (kbd, checkbox). No square corners.
4. **Surfaces.** Canvas `bg-paper` (#f5f5f5) → card `bg-raised` (#fff) →
   fill `bg-sunk` / `bg-ink/[0.045]`. Sidebar `bg-alt`. Hover fills use
   translucent ink (`hover:bg-ink/[0.06]`) so they work on any surface.
5. **Cards always have the hairline border.** Use the `card` class
   (`rounded-3xl border border-line bg-raised shadow-card`), padding `p-5`
   (20px) or `p-6`. Inner header/footer strips use `border-b border-line px-5 py-4`
   (`CardHeader`).
6. **Elevation is a whisper.** `shadow-card` for cards, `shadow-pop` only for
   floating layers (menus, dialogs, toasts, hovered link-cards). No gradients,
   no colored shadows.
7. **Type: Geist only** (`font-sans`; `font-mono` = Geist Mono for case numbers,
   IDs, code, keyboard hints). There is no serif — don't use `font-serif`.
   Weights 400/500/600 only.

## Type scale

| Use | Class |
|---|---|
| Hero display | `text-display font-semibold` (tracking −0.05em built in) |
| Page title | `text-heading sm:text-heading-lg font-semibold` |
| Section title | `text-heading-sm font-semibold` |
| Card title | `text-[15px]`–`text-subheading font-semibold tracking-[-0.01em]` |
| Body | `text-sm` (14px) default; `text-body-lg` (16px) for reading/prose |
| Secondary | `text-[13px] text-muted` |
| Caption / label | `kicker` (12px uppercase, 0.05em, muted) |
| Big numbers | `text-heading-lg font-semibold tracking-[-0.04em] num` (`StatBlock`) |

Body text never goes lighter than `text-muted` (#737373). `text-faint` is only
for disabled text, separators and placeholder-like hints.

## Components (ui.tsx)

- `Button` / `LinkButton` / `buttonClass(variant, size)`: variants `primary`
  (ink pill), `secondary` (soft gray pill), `outline`, `ghost`, `quiet`,
  `danger`; sizes `xs sm md lg icon icon-sm`.
- `Card`, `CardHeader`, `StatBlock`, `PageHeader` (kicker/title/description/
  actions/crumbs), `Breadcrumbs`, `Kbd`.
- `Field`, `Input`, `Textarea`, `Select`, `Checkbox` — filled at rest,
  ring on focus.
- `Badge` tones: `neutral` (soft), `ink`/`accent` (solid), `outline`/`ok`
  (outline), `warn`/`danger` (ember, attention only).
- `Alert`, `EmptyState`, `Skeleton`, `PageSkeleton`, `Dialog`, `useToast`,
  `Pagination`, `RelTime`, `SectionHeading`, `CategoryTag`.

## Layout

Max width 1280px (`container-page`). Section gaps 48–80px. Element gap 8px.
Spacing on a 4px grid. Icons: lucide at 16px (`size-4`), stroke default,
colored `text-ink` or `text-muted`.
