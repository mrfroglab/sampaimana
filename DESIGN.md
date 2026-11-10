# Sampai Mana — design system

"Editorial zinc grid with confetti-orange punctuation": a restrained,
neutral-first UI. A zinc gray scale carries nearly everything, white cards sit on
a soft gray canvas, 1px hairlines replace drop shadows, and one vivid orange is
used as punctuation. Tokens live in `app/app.css`; primitives in
`app/components/ui.tsx`.

## Rules

1. **Zinc first.** Obsidian `#09090b` for headlines and primary actions,
   graphite `#18181b` for body, steel `#52525b` (`text-muted`) for metadata,
   ash `#a1a1aa` (`text-faint`) for placeholders/disabled. Emphasis comes from
   weight and size, never from color. Never pure black.
2. **One orange (`ember` `#ff5a00`).** Only for: the live "current stage" dot,
   the logo dot and the "?" in the hero, the `ember` highlight badge (one per
   view, dark text on orange), the unread count, and attention/error states.
   Orange text on white uses `text-ember-ink` (`#c2410c`) for contrast. Never for
   links, body text or large fills. No other hues (category colors only appear
   in the admin category manager).
3. **Radius = hierarchy.** Cards 36px (`card`, 28px on phones); dense cards and
   dialogs 28px (`card-dense`, `rounded-3xl`); menus, alerts, toasts 20px
   (`rounded-2xl`); buttons and inputs 14px (`rounded-xl`); badges, small
   buttons, segmented tabs and nested tiles 12px (`rounded-lg`). Pills
   (`rounded-full`) only for navigation CTAs (header nav, "Daftar", the white
   ghost CTA on dark bands) and for dots/avatars. Nothing square on visible UI.
4. **Surfaces.** Canvas `bg-paper` `#f4f4f5` → card `bg-raised` `#fff` →
   subtle `bg-alt` `#fafafa` / tile `bg-sunk`. Dark feature bands use `feature`
   (`#18181b`, white text, arrow bullets). Hover fills use translucent ink
   (`hover:bg-ink/[0.05]`) so they work on every surface and in dark mode.
5. **Elevation is a hairline.** Cards: `border border-line` (`#ececee`), no
   shadow; hover darkens the border to `line-strong` (`#d4d4d8`). The primary
   button has its own inset highlight (`shadow-button`). `shadow-pop` only for
   floating layers (menus, dialogs, toasts).
6. **Type: DM Sans only** (substitute for Cosmica), weights 400–700, normal
   letter spacing everywhere. `font-mono` = DM Mono, only for case numbers, IDs
   and code. No serif.

## Type scale

| Use | Class | Size |
|---|---|---|
| Hero display | `text-display font-semibold` | 64px (fluid from 40px) |
| Page title | `text-heading-lg font-semibold` | 56px (fluid from 34px) |
| Admin page title | `text-heading-sm sm:text-heading` | 32–40px |
| Section title | `text-heading-sm font-semibold` (dark bands: `font-bold`) | 32px |
| Card title | `text-base`–`text-subheading font-semibold` | 16–20px |
| Body | `text-body` (15px) default, `text-sm` (14px) in dense UI, `text-body-lg` for reading | |
| Secondary | `text-[13px] text-muted` | |
| Caption / label | `kicker` (12px, sentence case) | |
| Section eyebrow | `eyebrow` (tag pill with hairline border) | 13px |
| Big numbers | `text-heading`–`text-heading-lg font-semibold num`, label beside it on the baseline | 40–56px |

## Components (ui.tsx)

- `Button` / `LinkButton` / `buttonClass(variant, size, extra, pill?)`:
  variants `primary` (obsidian + inset highlight), `secondary` (soft gray),
  `outline` (white + hairline), `ghost`, `quiet`, `danger`; sizes
  `xs sm md lg icon icon-sm`. `pill` only for navigation CTAs.
- `Card`, `CardHeader`, `StatBlock`, `PageHeader` (eyebrow/title/description/
  actions/crumbs), `SectionHeading`, `Breadcrumbs`, `Kbd`.
- `Field`, `Input`, `Textarea`, `Select`, `Checkbox`: white with a hairline,
  14px radius, ring on focus.
- `Badge` tones: `neutral` (tag pill: hairline), `ink`/`accent` (filled iron
  `#3f3f46`), `outline`/`ok`, `ember` (the highlight chip), `warn`/`danger`
  (orange wash, attention only).
- `Alert`, `EmptyState`, `Skeleton`, `PageSkeleton`, `Dialog`, `useToast`,
  `Pagination`, `RelTime`, `CategoryTag`.

## Layout

Max width 1200px (`container-page`). Section gap 80px (`mt-20`, 64px on
phones). Card padding 28px (`p-7`; `p-6` on phones). Element gap 8px, spacing on
a 4px grid. The header floats on the canvas with no border until the page
scrolls; nav links are centered on wide screens. Icons: lucide at 16px
(`size-4`), `text-ink` or `text-muted`. The newsroom (`/redaksi`) is a
full-height tool screen without the site footer.
