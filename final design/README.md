# Handoff: NK Herbal CRM — "Soft" Direction

## Overview
Full-stack redesign of the NK Herbal CRM dashboard and seven supporting screens (Dashboard, Orders, Leads, Customers, Follow-ups, WhatsApp, Reports, Settings). The goal is to replace the existing purple-accented dashboard with a **modern, minimalist, monochrome + green** aesthetic that feels like Notion / Linear — calm, generous whitespace, rounded cards, tabular numerals.

## About the Design Files
The files in `prototype/` are **design references created in HTML/React via Babel-in-the-browser**. They are prototypes showing the intended look, layout, and behavior — **not production code to copy directly**. Recreate these designs in your existing CRM codebase using its established patterns (likely React + your component library / Tailwind / CSS-in-JS — whichever the live site at `adorable-crisp-3f55ab.netlify.app` is built with).

If the existing codebase has a design system, integrate these tokens into it. If it doesn't, the design tokens listed below are the canonical reference.

## Fidelity
**High-fidelity.** Pixel-perfect mockups. Final colors, typography, spacing, radii, shadows, and interaction patterns are decided. Implement exactly as shown — only diverge from the spec where the existing component library forces a different primitive (e.g. your dropdown component might already exist).

## How to Open the Prototype

**Easiest — works offline, no setup:**
Double-click `NK Herbal CRM (standalone).html` at the root of this bundle. Single self-contained file, opens in any modern browser directly from `file://`.

**Source version (for editing):**
The `prototype/` folder contains the unbundled source files. To run those, serve the folder over HTTP (e.g. `cd prototype && python3 -m http.server 8000`, then visit http://localhost:8000/NK%20Herbal%20CRM.html). Chrome blocks Babel-in-the-browser when opening unbundled files via `file://`, so a local server is required.

The design canvas lets you:
- See all 7 screens of the chosen "Soft" direction side-by-side
- Click the expand icon on any artboard to view fullscreen (1440×1000)
- Toggle dark mode via the Tweaks button (top toolbar of the host)
- Drag artboards to reorder

The file is self-contained except for Google Fonts (Inter, JetBrains Mono).

---

## Design Tokens

### Colors — Light theme
| Token            | Hex / value             | Usage                                        |
| ---------------- | ----------------------- | -------------------------------------------- |
| `--bg`           | `#f6f4ee`               | Page background — warm off-white             |
| `--card`         | `#ffffff`               | Card / surface                               |
| `--card-soft`    | `#fbf9f4`               | Subtle alternative surface                   |
| `--fg`           | `#252320`               | Primary text                                 |
| `--muted`        | `rgba(37,35,32,.58)`    | Secondary text, captions                     |
| `--faint`        | `rgba(37,35,32,.34)`    | Tertiary text, disabled                      |
| `--rule`         | `rgba(37,35,32,.07)`    | Borders, dividers                            |
| `--hover`        | `rgba(37,35,32,.04)`    | Hover bg on transparent items                |
| `--accent`       | `#3d8a5c`               | Primary CTA, success, brand green            |
| `--accent-bg`    | `rgba(61,138,92,.1)`    | Accent surface (chips, hover)                |
| `--accent-ink`   | `#ffffff`               | Foreground on accent                         |
| `--chip`         | `rgba(37,35,32,.05)`    | Neutral chip background                      |
| `--danger`       | `#b04638`               | Errors, destructive                          |
| `--danger-bg`    | `rgba(176,70,56,.08)`   |                                              |
| `--warn`         | `#a87a1a`               | Warnings, pending                            |
| `--warn-bg`      | `rgba(168,122,26,.08)`  |                                              |
| `--info`         | `#3a6ba8`               | Informational chips (channel, source)        |
| `--info-bg`      | `rgba(58,107,168,.08)`  |                                              |

### Colors — Dark theme
| Token            | Value                   |
| ---------------- | ----------------------- |
| `--bg`           | `#1a1815`               |
| `--card`         | `#221f1b`               |
| `--card-soft`    | `#1f1d19`               |
| `--fg`           | `#f2efe8`               |
| `--muted`        | `rgba(242,239,232,.58)` |
| `--faint`        | `rgba(242,239,232,.34)` |
| `--rule`         | `rgba(255,255,255,.06)` |
| `--accent`       | `#7fbf95`               |
| `--accent-bg`    | `rgba(127,191,149,.12)` |
| `--accent-ink`   | `#0e0e0c`               |
| `--danger`       | `#e88478`               |
| `--warn`         | `#e0b061`               |
| `--info`         | `#7fa9e0`               |

### Typography
- **UI font:** `Inter` — weights 400 / 500 / 600 / 700
- **Numerals & monospace:** `JetBrains Mono` — weights 400 / 500 / 600. Use with `font-variant-numeric: tabular-nums`. Apply to ALL numbers (currency, counts, percentages, dates, IDs, phone numbers).
- **System fallbacks:** `-apple-system, system-ui, sans-serif`

#### Type scale
| Role             | Size  | Weight | Letter-spacing |
| ---------------- | ----- | ------ | -------------- |
| Page title (H1)  | 26–28 | 600    | -0.02em        |
| Section title    | 14    | 600    | normal         |
| Big metric       | 28    | 600    | -0.02em        |
| Body             | 13    | 400    | normal         |
| Body small       | 12    | 400    | normal         |
| Caption          | 11–12 | 400    | normal         |
| Label / eyebrow  | 11    | 500    | normal         |
| Table header     | 10.5  | 500    | .02em uppercase|
| Mono numeral     | 11–12 | 500    | tabular-nums   |

### Spacing
4 / 6 / 8 / 10 / 12 / 14 / 16 / 18 / 20 / 22 / 24 / 28 / 32 px

Card padding: `18px 20px` (default), `22px` (feature card), `10px 12px` (filter bars)

### Radii
- `4` — pills/labels (rare)
- `6–8` — buttons, inputs
- `9` — buttons (default)
- `10–12` — inline cards, search field
- `14` — main cards
- `16` — feature/highlight strips
- `999` — chips/status pills (fully rounded)

### Borders & Shadows
- **Borders:** always `1px solid var(--rule)` — never thicker
- **Shadows:** intentionally minimal. Selected nav item gets `0 1px 0 var(--rule), 0 0 0 1px var(--rule)` as a soft "lift". No drop-shadows on cards.

### Iconography
Stroke icons at `1.6` stroke-width, sized `13–16px` for inline, `20px` for feature cards. See `prototype/primitives.jsx` for the full set: `grid`, `box`, `target`, `users`, `bell`, `message`, `chart`, `gear`, `search`, `plus`, `arrow-up/down/right`, `check`, `dot`, `sun`, `moon`, `download`, `filter`, `more`, `leaf`, `calendar`, `export`, `whatsapp`. Replace with [Lucide](https://lucide.dev/) icons in production — they match the visual style.

---

## Layout Shell

All screens share this shell:

```
┌─────────────┬─────────────────────────────────────────────┐
│ Sidebar     │ Main                                        │
│  232px      │  padding: 24px 28px 28px                    │
│  (fixed)    │                                             │
│             │  ┌──────────────────────────────┐           │
│  • Logo+Brand│  │ Page header                  │           │
│  • Search    │  │  eyebrow / H1 / subtitle     │           │
│  • Nav (8)   │  │  + action buttons (right)    │           │
│  • Target    │  └──────────────────────────────┘           │
│    progress  │                                             │
│             │  Content cards…                             │
└─────────────┴─────────────────────────────────────────────┘
Total: 1440 × 1000 (design canvas size; responsive in production)
```

### Sidebar (`232px wide`)
1. **Brand block** — 32×32 green square logo (leaf icon) + "NK Herbal" / "Sales workspace"
2. **Search field** — full-width, rounded-10, ⌘K hint right-aligned
3. **Nav items** — 8 entries with icon + label + optional badge count (rounded chip):
   - Dashboard, Orders (12), Leads (6), Customers, Follow-ups (4), WhatsApp, Reports, Settings
   - Selected state: white card background, 1px border, fg color
   - Unselected: transparent, muted color
4. **Monthly target card** (bottom) — small card showing `77%`, progress bar, `₹3.86L of ₹5.00L`

---

## Screens

### 1. Dashboard
- **Eyebrow:** weekday + date
- **Title:** `Hello Jassim 👋`
- **Subtitle:** "Here's how NK Herbal is performing today."
- **Actions:** Date picker · Channel filter · Primary "+ New order"

**Highlight strip** (single card, 4 columns, dividers between):
- Revenue · Orders · New customers · Delivered rate
- Each: label, big mono number, mini sparkline (right), `↑ +18.2% vs March` in accent-green mono

**Row 2** (2-column grid 2fr/1fr):
- **Revenue trend** — line chart, 6 months, area fill in accent
- **Channels** — donut + legend with % values

**Row 3** (1.5fr/1fr):
- **Recent orders** — last 6, with avatar / name+city / product / amount / status chip
- **Top products** — rank chip + name + revenue + progress bar

### 2. Orders
- **Title:** `Orders` · subtitle "{N} total · {M} this week"
- **Actions:** "Sync WooCommerce" + "+ New order"
- **Filter bar** (rounded card): search + From date + To date + Channel ▾ + Status ▾ + Payment ▾ + Filter button
- **Table** (single rounded card): 10 columns
  - ORDER ID (mono) · DATE (mono) · CUSTOMER (avatar + name/city) · PRODUCT · QTY · VALUE · CHANNEL (info chip) · PAYMENT (status chip) · STATUS (status chip) · `⋯` menu
- **Pagination** (bottom of card): "Showing 1–8 of 142" + Prev/Next

### 3. Leads
- **Title:** `Leads` · subtitle auto-captured from WhatsApp
- **Action:** "+ Add lead"
- **Stat row** (4 cards): Interested (info) · Not Interested (danger) · Converted (ok) · Follow Up (warn). Each: 36px rounded icon tile + label + big mono number.
- **Filter bar:** search + Status ▾ + Sources ▾ + Filter
- **Table:** LEAD ID · DATE · avatar · NAME · MOBILE · SOURCE · PRODUCT · STATUS · `⋯`

### 4. Customers
- **Title:** `Customers`
- **Actions:** "Recalculate stats" + "+ Add customer"
- **Filter bar:** search + Type ▾ + Filter
- **Table:** avatar · Name · Mobile (mono) · City · Type chip (Repeat=ok / New=info) · Orders (mono right) · Revenue (mono right) · Last order · `→`

### 5. Follow-ups
- **Title:** `Follow-up reminders`
- **Subtitle:** "Send 3-monthly follow-ups…"
- **Action:** Refresh
- **Stage cards** (3 columns) — Month 1 (Day 30) info / Month 2 (Day 60) warn / Month 3 (Day 90) ok. Each: numbered chip + title + description.
- **Tabs** (segmented control with rounded pills): Pending · Sent · Skipped — selected uses accent-bg + accent fg
- **Table:** avatar · D+30 chip (mono) · NAME · PRODUCT · EMAIL (mono) · STATUS chip · "Send" button (primary green)
- **Empty state:** centered icon tile (accent green check) + "No pending follow-ups" + supporting text

### 6. WhatsApp
- **3-column layout inside one rounded card** (height: 700):
  - **Left (320px)** — conversation list. Each row: avatar · name + LANG chip (HI/EN/ML) · preview text · time · unread count badge (green dot)
  - **Middle (flex)** — message thread:
    - Top bar: avatar + name/phone/lang + "Bot active" chip
    - Messages: their messages left (bg-cream, 4px corner left), bot messages right (accent green bg, white text, 4px corner right). Sender label + time below each.
    - Bottom: disabled input "Bot is typing reply…" + "Take over" primary button
  - **Right (280px)** — customer details: avatar (56), name, status, then key/value rows (Mobile, Language, Source chip, Interested in, Status), then "Convert to order" primary button

### 7. Reports
- **Title:** `Reports & Export`
- **Period card:** Start date · End date · Channel ▾ · "Load preview" primary
- **Two feature cards** (50/50): Excel export (green icon tile) and PDF export (warn-orange icon tile). Each shows file stats + download button.
- **Recent exports table:** date (mono) · type chip (Excel=ok, PDF=warn) · range · size (mono) · user · download icon

### 8. Settings
- **Title:** `Settings`
- **Two-column layout (220px nav / 1fr content):**
  - **Settings nav:** Profile (selected) · WooCommerce · WhatsApp Bot · Notifications · Appearance · Billing · Team
  - **Content:** stacked cards
    - **Profile:** big avatar + name/email/Admin + "Change photo" button. 2x2 fields grid (Name/Email/Phone/Role). Cancel / Save buttons bottom-right.
    - **WooCommerce integration:** status chip "● Connected" right-aligned in title. Store URL / Consumer key / Consumer secret fields. Auto-sync description + "Sync now" button.
    - **Appearance:** 3 theme cards (Light / Dark / System). Selected gets 2px accent border. Each shows preview swatch + name + "Active" chip if selected.

---

## Component Library Spec

### `Chip` / Status pill
- Padding: `3px 9px`
- Border-radius: `999px`
- Font-size: `10.5px`
- Font-weight: `500`
- Tones: `ok` (accent), `warn`, `danger`, `info`, `muted`. Each uses `*-bg` background + `*` color.

### `Button`
- **Default:** white card bg, 1px rule border, fg color, padding `8px 13px`, radius `9`, font-size `12`, weight `500`. With icon: 6px gap.
- **Primary:** accent bg, accent-ink color, no border. Same dims.
- **Icon-only ghost** (table actions): no bg, 4px padding, radius `6`, muted color.

### `Avatar`
- Sizes: 22 / 24 / 28 / 30 / 36 / 56
- Background: `--accent-bg`, foreground: `--accent` (in this Soft direction)
- Initials: first letters of first 2 words, uppercase
- Font-weight: 600, size = 38% of avatar size

### `Card`
- Background: `--card`
- Border: `1px solid --rule`
- Border-radius: `14px`
- Default padding: `18px 20px`
- Header: title (14/600) + subtitle (11.5/muted) on left; right slot for filter/link

### `Field` (read-only display field)
- Label: 11px muted, 6px below
- Value bar: bg `--bg`, padding `9px 12px`, radius `9`, font-size `12.5`

### `Sparkline`
- 56×20 default
- Stroke 1.4px, currentColor
- Optional area fill (25% opacity)
- Optional dot at last point

### `Donut`
- Default 120×120, thickness 18px
- Track: `--rule`
- Segments in priority colors: accent → fg → muted → faint

### `Progress`
- Height: `4px` for inline, `6px` for the sidebar target card
- Track: `--rule`
- Fill: `--accent`
- Border-radius matches height/2

### `LineChart`
- Default 760×210 (full width) or as needed
- Stroke 1.6px in `--accent`
- Area fill at 60% opacity
- Dotted gridlines in `--rule`, `2 4` dasharray
- 1.8px dots at each data point

---

## Interactions & State

### Navigation
- Sidebar items route to their respective screens
- Active item: white card bg + soft border ring
- Hover (non-active): subtle bg change

### Tables
- Row hover: subtle bg darkening (use `--hover`)
- Click row: open detail drawer or navigate to detail page (your call)
- `⋯` menu: opens action popover (Edit / Delete / View)
- Sort by clicking column headers (add caret indicator)

### Filters
- Date pickers open native date input or your popover
- Dropdown buttons (`▾`) open select menus
- "Filter" primary button applies filters; "Clear" resets

### Forms
- Inline validation: red border + danger-color helper text under field
- Required fields marked with subtle `*` in label
- Save button disabled until form is dirty AND valid

### Dark mode
- Theme toggle in Settings → Appearance
- Persist to `localStorage` and respect `prefers-color-scheme` on first load
- Use CSS custom properties so theme switch is instant

### WhatsApp screen
- Conversation list: clicking a row loads its messages in the middle pane and customer details on right
- "Take over" disables bot for that conversation; input becomes editable
- Lang chip auto-detected from incoming message (hardcode for now)

### Empty states
- All tables/lists need an empty state matching the Follow-ups pattern: centered icon tile (accent-bg, accent fg) + heading + description text

### Loading states
- Tables: skeleton rows (use `--rule` bars at row heights)
- Charts: subtle pulse animation
- Buttons: replace icon/text with spinner; keep dimensions

---

## Data Model

The CRM tracks Orders, Customers, Leads, Follow-ups, WhatsApp messages. Schemas follow what your existing backend uses; the prototype's `data.jsx` lists all the fields the UI surfaces:

- **Orders:** id, date, customer name + mobile + city, product, qty, amount (₹), GST breakdown, channel (Website/WhatsApp/Amazon/Offline), payment (Paid/COD/Pending), status (Processing/Shipped/Delivered/Cancelled/RTO), customer type (New/Repeat), billing address, payment method, follow-up done flag, upsell done flag, notes
- **Customers:** name, mobile, city, total orders, total revenue, type (New/Repeat), first order date, last order date, full order history
- **Leads:** name, mobile, source (Ads/WhatsApp/Website/Referral/Direct), interested product, status (Interested/Follow Up/Converted/Not Interested), date, notes, auto-captured flag
- **Follow-ups:** customer, product, day (30/60/90), status (Pending/Sent/Skipped), email body
- **WhatsApp messages:** customer mobile, conversation thread (each: from, text, time, language detected), bot active flag

---

## Currency & Number Formatting

Indian rupee throughout. Use the helpers in `data.jsx`:
- `inr(386100, { compact: true })` → `₹3.86L`
- `inr(386100)` → `₹3,86,100` (Indian comma grouping)
- `num(142)` → `142`

Compact: `≥1Cr → "X.XXCr"`, `≥1L → "X.XXL"`, `≥1K → "X.XK"`.

ALL numerals render in JetBrains Mono with `tabular-nums`.

---

## Files in This Bundle

- `NK Herbal CRM (standalone).html` — **single self-contained file** (open this one)
- `prototype/NK Herbal CRM.html` — main entry for the source version (serve over HTTP)
- `prototype/app.jsx` — canvas layout + dark mode tweak
- `prototype/data.jsx` — mock data + currency helpers
- `prototype/primitives.jsx` — Icon set, Spark, Donut, Bars, LineChart, Progress, Avatar
- `prototype/variant-soft.jsx` — Soft direction: dashboard only
- `prototype/variant-soft-full.jsx` — **Soft direction: all 7 screens (THE SPEC)**
- `prototype/variant-editorial.jsx` — Reference: Editorial direction (not selected)
- `prototype/variant-linear.jsx` — Reference: Linear/Stripe direction (not selected)
- `prototype/variant-mono.jsx` — Reference: Mono brutalist direction (not selected)
- `prototype/design-canvas.jsx`, `prototype/tweaks-panel.jsx` — host scaffolding (don't ship)

---

## Implementation Checklist

1. [ ] Add Inter + JetBrains Mono to your font stack (Google Fonts or self-host)
2. [ ] Define CSS custom properties for both themes (light + dark)
3. [ ] Build the 7 component primitives: `Chip`, `Button`, `Avatar`, `Card`, `Field`, `Sparkline`, `Donut`, `Progress`, `LineChart`
4. [ ] Build the shell: sidebar + main + page header
5. [ ] Implement screens in this order (smallest blast radius first):
   - Settings (mostly static forms)
   - Reports (cards + small table)
   - Customers (table)
   - Orders (filter bar + table)
   - Leads (stat row + table)
   - Follow-ups (stages + tabs + table + empty state)
   - WhatsApp (3-pane layout)
   - Dashboard (charts + tables)
6. [ ] Wire dark mode with localStorage persistence + media query default
7. [ ] Replace stub icons with Lucide
8. [ ] Connect to your existing backend endpoints
9. [ ] QA at 1280, 1440, 1920 widths and verify all chip/status combinations

---

## Open Questions for the Developer

- Does the existing app already have a component library or CSS framework? If yes, which? (Tailwind, Mantine, MUI, custom?) — that determines whether to lift these styles wholesale or map them into existing primitives.
- Are there real product images for the Top Products list, or do we keep avatar-style placeholders?
- WhatsApp conversation pane: do you want full message history, or just the last 24h with "load more"?
- Do you want a global command palette (⌘K) or is the sidebar search just visual for now?

Reach back out with answers and we'll iterate.
