# Swift Recruit CRM — Design Token Audit

Source: `sr-crm-green` repo, `develop` branch.
Files: `tailwind.config.ts`, `src/index.css`, `src/components/ui/*.tsx`.

---

## 1. Colour Palette

### 1a. Primary / Brand — "Swift Teal"

| Token | HSL | Hex |
|---|---|---|
| `--primary` (light) | `189 94% 37%` | `#0891B2` |
| `--primary` (dark) | `189 94% 43%` | `#13B5CF` (approx) |
| `--primary-foreground` | `0 0% 100%` | `#FFFFFF` |
| `--ring` | `189 94% 37%` | `#0891B2` |
| `swift-teal.DEFAULT` | — | `#0891B2` |
| `swift-teal.hover` | — | `#0E7490` |
| `swift-teal.light` | — | `#CFFAFE` |
| `swift-teal.50` | — | `#ECFEFF` |
| `swift-teal.100` | — | `#CFFAFE` |
| `swift-teal.500` | — | `#0891B2` |
| `swift-teal.600` | — | `#0E7490` |
| `swift-teal.700` | — | `#155E75` |

Button hover teal: `hsl(187 91% 30%)` (used in `.btn-primary:hover` and `.glass-input:focus`).
Focus ring: `hsl(187 91% 36% / 0.12)` box-shadow on inputs.

### 1b. IBMG Brand

| Token | HSL |
|---|---|
| `--ibmg-gold` | `43 85% 55%` |
| `--ibmg-slate` | `206 30% 25%` |
| `--ibmg-gold-light` | `43 85% 85%` |
| `--ibmg-slate-dark` | `206 40% 15%` |
| `--ibmg-gold-muted` | `43 60% 70%` |

### 1c. Status Colours (CSS variables, light mode :root)

| Status | HSL | Approx Hex |
|---|---|---|
| `--success` | `160 84% 39%` | `#10B981` |
| `--warning` | `38 92% 50%` | `#F59E0B` |
| `--destructive` | `0 84% 60%` | `#EF4444` |

All three have `foreground: 0 0% 100%` (white text on top).

### 1d. Status Badge System (hardcoded hex in Badge component + CSS classes)

| Variant | Background | Text | Border | Dot |
|---|---|---|---|---|
| `success` / `approved` | `#D1FAE5` | `#065F46` | `#A7F3D0` | `#065F46` |
| `default` / `confirmed` | `#DBEAFE` | `#1E40AF` | `#BFDBFE` | `#1E40AF` |
| `warning` / `pending` | `#FEF3C7` | `#92400E` | `#FDE68A` | `#92400E` |
| `destructive` / `missed` / `cancelled` | `#FEE2E2` | `#991B1B` | `#FECACA` | `#991B1B` |
| `secondary` / `open` | `#F1F5F9` | `#475569` | `#E2E8F0` | `#94A3B8` (secondary dot) / `#475569` (open dot) |
| `outline` | `#FFFFFF` (white) | foreground | `#E5E7EB` | `#94A3B8` |
| `ibmg` | `#EDE9FE` | `#5B21B6` | `#DDD6FE` | `#5B21B6` |
| `cold` | `#F1F5F9` | `#94A3B8` | `#E2E8F0` | `#CBD5E1` |

`cancelled` variant also applies `line-through` text decoration.

CSS variable badge tokens (used in index.css, HSL format):

| Token | HSL |
|---|---|
| `--badge-approved-bg` | `152 81% 91%` |
| `--badge-approved-text` | `160 90% 20%` |
| `--badge-confirmed-bg` | `214 95% 93%` |
| `--badge-confirmed-text` | `224 76% 48%` |
| `--badge-pending-bg` | `48 96% 89%` |
| `--badge-pending-text` | `22 78% 31%` |
| `--badge-missed-bg` | `0 93% 94%` |
| `--badge-missed-text` | `0 74% 42%` |
| `--badge-open-bg` | `210 40% 96%` |
| `--badge-open-text` | `215 19% 35%` |

### 1e. Ad-hoc Tailwind Status Colours (used inline across components)

| Context | Classes |
|---|---|
| Healthy / positive | `bg-green-50 text-green-600 border-green-200` / `bg-green-100 text-green-800` |
| Warning | `bg-amber-50 text-amber-600 border-amber-200` / `bg-amber-100 text-amber-800` |
| Critical / error | `bg-red-50 text-red-600 border-red-200` / `bg-red-100 text-red-800` |
| Teal accent | `bg-teal-50 text-teal-700 border-teal-200` |

### 1f. Background / Surface / Border (light :root)

| Token | HSL | Hex equiv |
|---|---|---|
| `--background` | `250 5% 98%` | `~#FAFAFA` |
| `--foreground` | `222 47% 11%` | `#0F172A` |
| `--card` | `0 0% 100%` | `#FFFFFF` |
| `--card-foreground` | `222 47% 11%` | `#0F172A` |
| `--secondary` | `210 40% 96%` | `#F1F5F9` |
| `--secondary-foreground` | `215 25% 27%` | `#334155` |
| `--muted` | `210 40% 96%` | `#F1F5F9` |
| `--muted-foreground` | `215 16% 47%` | `#64748B` |
| `--accent` | `210 40% 96%` | `#F1F5F9` |
| `--accent-foreground` | `222 47% 11%` | `#0F172A` |
| `--border` | `220 13% 91%` | `#E5E7EB` |
| `--input` | `220 13% 91%` | `#E5E7EB` |

Surface scale:

| Token | HSL | Hex equiv |
|---|---|---|
| `--surface-0` | `210 20% 98%` | `#F8FAFC` |
| `--surface-1` | `210 20% 98%` | `#F8FAFC` |
| `--surface-2` | `0 0% 100%` | `#FFFFFF` |
| `--surface-3` | `0 0% 100%` | `#FFFFFF` |
| `--surface-4` | `210 40% 96%` | `#F1F5F9` |
| `--surface-topbar` | `0 0% 100%` | `#FFFFFF` |

Design-mode raw hex tokens (light):

| Token | Value |
|---|---|
| `--dm-bg-primary` | `#FAFBFC` |
| `--dm-glass-bg` | `#FFFFFF` |
| `--dm-glass-border-top` | `#E5E7EB` |
| `--dm-glass-shadow` | `rgba(0,0,0,0.04)` |
| `--dm-text-primary-raw` | `#0F172A` |
| `--dm-text-secondary-raw` | `#475569` |
| `--dm-text-muted-raw` | `#94A3B8` |
| `--dm-stat-card-neutral-bg` | `#F8FAFC` |
| `--dm-table-bg` | `#FFFFFF` |
| `--dm-row-hover` | `#F6F8FA` |
| `--dm-input-bg` | `#FFFFFF` |
| `--dm-pill-bg` | `#F1F5F9` |
| `--dm-pill-border` | `#E2E8F0` |
| `--dm-border-global` | `#E5E7EB` |
| `--dm-nav-bg` | `#F1F5F9` |
| `--dm-topbar-bg` | `#FFFFFF` |
| `--dm-heading-color` | `#0F172A` |
| `--dm-section-label` | `#94A3B8` |

### 1g. Chart Colours

| Token | HSL | Approx Hex |
|---|---|---|
| `--chart-1` | `187 91% 36%` | `#0891B2` (teal) |
| `--chart-2` | `160 84% 39%` | `#10B981` (green) |
| `--chart-3` | `38 92% 50%` | `#F59E0B` (amber) |
| `--chart-4` | `0 84% 60%` | `#EF4444` (red) |
| `--chart-5` | `262 83% 58%` | `#8B5CF6` (purple) |

### 1h. Stat-Card Accent Borders

| Class | Colour |
|---|---|
| `.stat-card-accent-blue` | `hsl(187 91% 36%)` |
| `.stat-card-accent-green` | `#10B981` |
| `.stat-card-accent-amber` | `#F59E0B` |
| `.stat-card-accent-red` | `#EF4444` |
| `.stat-card-featured` border-left | `hsl(var(--primary))` |

### 1i. Stat-Card Tinted Variants (light mode)

| Variant | Background | Border | Value text | Label text |
|---|---|---|---|---|
| `.stat-card-success` | `#D1FAE5` | `#A7F3D0` | `#065F46` | `#047857` |
| `.stat-card-warning` | `#FEF3C7` | `#FDE68A` | `#92400E` | `#B45309` |
| `.stat-card-danger` | `#FEE2E2` | `#FECACA` | `#991B1B` | `#B91C1C` |
| `.stat-card-info` | `#DBEAFE` | `#BFDBFE` | `#1E40AF` | `#1D4ED8` |
| `.stat-card-financial` | `#EDE9FE` | `#DDD6FE` | `#5B21B6` | `#6D28D9` |
| `.stat-card-neutral` | `var(--dm-stat-card-neutral-bg)` | `var(--dm-glass-border-top)` | `var(--dm-text-primary-raw)` | `var(--dm-text-muted-raw)` |

### 1j. Text Hierarchy (light :root)

| Token | HSL | Hex equiv |
|---|---|---|
| `--text-primary` | `222 47% 11%` | `#0F172A` |
| `--text-secondary` | `215 19% 35%` | `#475569` |
| `--text-muted` | `215 16% 47%` | `#64748B` |
| `--text-dimmed` | `215 14% 64%` | `#94A3B8` |

Stat delta colours: `.stat-delta-positive: #065F46`, `.stat-delta-negative: #991B1B`.

---

## 2. Typography

### 2a. Font Families

Loaded via Google Fonts (`index.html`):
```
Inter:wght@300;400;500;600;700
Geist:wght@300;400;500;600;700
Geist Mono:wght@400;500;600
```

| Tailwind alias | Stack |
|---|---|
| `font-sans` (default body) | `'Inter', 'Geist', system-ui, -apple-system, sans-serif` |
| `font-mono` | `'Geist Mono', 'JetBrains Mono', 'SF Mono', monospace` |
| `font-inter` | `'Inter', 'Geist', system-ui, sans-serif` |
| `font-data` | `'Calibri', 'Inter', system-ui, sans-serif` |

Body: `font-feature-settings: "cv11", "ss01"; font-variation-settings: "opsz" 32; -webkit-font-smoothing: antialiased`.
Monospace: `font-feature-settings: "tnum"` (tabular numbers).

### 2b. Type Scale (from `index.css` base styles)

| Element | Size | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|
| `h1` | `20px` | `600` | `1.3` | `-0.025em` |
| `h2` | `16px` | `600` | `1.4` | `-0.025em` |
| `h3` | `14px` | `600` | `1.4` | `-0.025em` |
| `h4` | `13px` | `400` | `1.5` | `-0.025em` |
| Body (button text) | `13px` (`text-[13px]`) | `500` (font-medium) | — | — |
| Badge text | `11px` (`text-[11px]`) | `500` (font-medium) | — | — |
| CardTitle | `text-sm` (14px) | `500` | none | `tracking-tight` |
| CardDescription | `text-xs` (12px) | — | — | — |
| `.stat-label` | `11px` | `500` | — | `0.05em`, uppercase |
| `.stat-value` | `26px` | `600` | `1.2` | `-0.03em` |
| `.stat-delta` | `12px` | `500` | — | — |
| `.section-label` | `11px` | `500` | — | `0.05em`, uppercase |
| `.table-header-enterprise` | `11px` | `500` | — | `0.06em`, uppercase |

---

## 3. Component Patterns

### 3a. Badge (`src/components/ui/badge.tsx`)

- Shape: `rounded-full` (pill)
- Border: `1px solid` (colour per variant)
- Padding: `px-2 py-0.5`
- Text: `11px`, `font-medium`
- Includes a leading dot: `5px x 5px` circle, `rounded-full`, colour-matched per variant
- Dot rendered by default (`showDot={true}`), toggleable via prop
- 12 named variants: `default`, `secondary`, `destructive`, `outline`, `success`, `warning`, `approved`, `confirmed`, `pending`, `missed`, `open`, `cancelled`, `ibmg`, `cold`
- CSS class aliases also exist: `.badge-approved`, `.badge-confirmed`, `.badge-pending`, `.badge-missed`, `.badge-open` (same colours, no dot)
- `.glass-badge`: `var(--dm-pill-bg)` bg, `var(--dm-pill-border)` border, `rounded-full` (999px)

### 3b. Button (`src/components/ui/button.tsx`)

| Variant | Styles |
|---|---|
| `default` (primary) | `rounded-lg`, `bg-[#0891B2]`, white text, `hover:bg-[#0E7490]`, `shadow-sm` |
| `destructive` | `rounded-lg`, `bg-[#EF4444]`, white text, `hover:bg-[#DC2626]`, `shadow-sm` |
| `outline` | `rounded-lg`, `var(--dm-glass-bg)` bg, `var(--dm-border-global)` border, `var(--dm-text-primary-raw)` text, hover bg `var(--dm-row-hover)` |
| `secondary` | `rounded-lg`, `var(--dm-pill-bg)` bg, `var(--dm-text-secondary-raw)` text, `hover:opacity-80` |
| `ghost` | `rounded-lg`, transparent bg, `var(--dm-text-secondary-raw)` text, hover bg `var(--dm-row-hover)` |
| `link` | No border/bg, `text-[#0891B2]`, `underline-offset-4 hover:underline` |

Sizes:

| Size | Height | Padding |
|---|---|---|
| `default` | `h-9` (36px) | `px-4 py-2` |
| `sm` | `h-8` (32px) | `px-3`, `text-xs` |
| `lg` | `h-10` (40px) | `px-6` |
| `icon` | `h-8 w-8` (32x32) | — |

All buttons: `transition-all duration-150`, `active:scale-[0.98]`, icon children `size-4` (16px).

### 3c. Card (`src/components/ui/card.tsx`)

- Border radius: `rounded-lg` (= `var(--radius)` = `0.5rem` = 8px)
- Background: `var(--dm-glass-bg)` (inline style) = `#FFFFFF` light
- Border: `1px solid var(--dm-border-global)` (inline style) = `#E5E7EB` light
- Shadow: `0 1px 3px rgba(0,0,0,0.04)`
- Padding: `CardHeader` = `p-5`, `CardContent` = `p-5 pt-0`, `CardFooter` = `p-5 pt-0`
- `.glass-surface` (CSS class equivalent): same bg/border/radius/shadow
- `.card-hero`: `background: #F8FAFC`, `border-left: 2px solid hsl(var(--primary))`
- `.card-gradient`: `background: #F8FAFC`, no border

### 3d. Alert / Banner (`src/components/ui/alert.tsx`)

- Shape: `rounded-lg`, `border`, `p-4`
- Variants: `default` (bg-background/text-foreground) and `destructive` (border-destructive/50, text-destructive)
- Icon layout: SVG positioned `absolute left-4 top-4`, sibling content `pl-7`

### 3e. Collapsible Sections

Two primitives used:
1. **Collapsible** (`@radix-ui/react-collapsible`): `CollapsibleTrigger` wraps a ghost button with `ChevronDown` icon, `rotate-180` on open. Used in compliance tiles for nested expandable sections.
2. **Accordion** (`@radix-ui/react-accordion`): `AccordionItem` has `border-b`. Trigger has `ChevronDown h-4 w-4`, `duration-200` rotate transition. Content animates with `accordion-down` / `accordion-up` at `0.5s cubic-bezier(0.4, 0, 0.2, 1)`.

### 3f. Stat Cards

- `.stat-card-glass`: `border-radius: 8px`, `padding: 16px 18px`
- Accent border: `border-left: 3px solid <colour>` via `.stat-card-accent-*` classes
- Featured: `border-left: 3px solid hsl(var(--primary))`
- Tinted variants: solid background with matching border and value/label colours (see 1i)
- Shadow: `0 1px 3px rgba(0,0,0,0.04)` on all tinted variants

### 3g. Table

- Header: `.table-header-enterprise` — `bg: #F9FAFB`, `border-bottom: 1px solid #E5E7EB`, `11px` uppercase `0.06em` tracking
- Sticky header: `.table-header-sticky` — `sticky top-[56px] z-30`, `bg: #FFFFFF`, `border-bottom: 1px solid #E5E7EB`
- Row: `.table-row-enterprise` — `min-height: 44px`, `border-bottom: 1px solid var(--dm-glass-border-bottom)`, `hover bg: var(--dm-row-hover)` (`#F6F8FA`)
- Empty cell: `::before { content: '---'; color: #CBD5E1; }`

### 3h. Input

- `.glass-input`: `var(--dm-input-bg)` bg, `1px solid var(--dm-pill-border)` border, `border-radius: 6px`
- Focus: `border-color: hsl(187 91% 36%)`, `box-shadow: 0 0 0 3px hsl(187 91% 36% / 0.12)`

### 3i. Dropdown / Popover

- `.glass-dropdown`: `var(--dm-dropdown-bg)` bg, `1px solid var(--dm-glass-border-top)` border, `border-radius: 8px`
- Shadow: `0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)`

---

## 4. Iconography

**Library**: `lucide-react` (exclusively)

### Common Icons by Domain

| Domain | Icon name(s) | Typical size |
|---|---|---|
| Phone / dialer | `Phone` | `h-4 w-4` |
| Calendar / bookings | `Calendar`, `CalendarCheck`, `CalendarDays`, `CalendarIcon` | `h-4 w-4` |
| Notes | `StickyNote`, `FileText` | `h-4 w-4` |
| Warning / alert | `AlertTriangle` (primary), `AlertCircle` | `h-3 w-3` to `h-5 w-5` |
| Licence / ID / compliance | `Shield`, `ShieldCheck`, `ShieldAlert`, `IdCard` (via `User`/`Crown`) | `h-4 w-4` |
| Location | `MapPin` | `h-4 w-4` |
| People / users | `Users`, `User`, `UserPlus`, `UserCheck`, `UserCog`, `Contact2` | `h-4 w-4` |
| Money | `PoundSterling`, `DollarSign` | `h-4 w-4` |
| Search | `Search` | `h-4 w-4` |
| Expand/collapse | `ChevronDown`, `ChevronUp`, `ChevronLeft`, `ChevronRight` | `h-3 w-3` to `h-4 w-4` |
| Status indicators | `CheckCircle`, `CheckCircle2`, `XCircle`, `Clock` | `h-3 w-3` to `h-4 w-4` |
| Company / building | `Building`, `Building2` | `h-4 w-4` |
| Jobs / vacancy | `Briefcase` | `h-4 w-4` |
| Edit | `Pencil`, `Edit`, `FileEdit` | `h-4 w-4` |
| Download / upload | `Download`, `Upload` | `h-4 w-4` |
| Navigation | `ArrowLeft`, `ArrowRight`, `ExternalLink` | `h-4 w-4` |
| Sort | `ArrowUpDown`, `ArrowUp`, `ArrowDown` | `h-4 w-4` |
| Filter | `Filter`, `SlidersHorizontal` | `h-4 w-4` |
| Add | `Plus` | `h-4 w-4` |
| Close | `X` | `h-4 w-4` |
| Email | `Mail` | `h-4 w-4` |
| Messaging | `MessageSquare` | `h-4 w-4` |
| Loading | `Loader2` (spinning) | `h-4 w-4` |
| Settings | `Settings`, `Wrench` | `h-4 w-4` |
| Star / priority | `Star` | `h-4 w-4` |

Default icon size inside buttons: `size-4` (16px) enforced by button base class `[&_svg]:size-4`.

---

## 5. Distinctive Patterns

### 5a. Brand Teal Saturation
The entire UI pivots on a single high-saturation teal: `#0891B2` / `hsl(189 94% 37%)`. It is used for primary buttons, focus rings, active nav items, link text, chart-1, sidebar-primary, and the card-hero left border. The hover shade is `#0E7490` / `hsl(187 91% 30%)`.

### 5b. Three Theme Modes
The system has three `:root`-level themes — default light (`:root`), `.dark`, and `.pink`. The Chrome extension should target the light theme unless dark/pink support is needed.

### 5c. Spacing Rhythm
- Cards: `p-5` (20px) header/footer/content
- Stat cards: `16px 18px` padding
- Table row min-height: `44px`
- Container: `max-w-7xl`, horizontal padding `px-4 sm:px-6 lg:px-8`
- Custom spacings: `4.5rem` (18), `22rem` (88), `32rem` (128)
- Border radius: `--radius: 0.5rem` (8px). Derived: `md = 6px`, `sm = 4px`, `2xl = 1rem`, `3xl = 1.5rem`

### 5d. Shadow System
Minimal, flat shadows:
- Card / surface: `0 1px 3px rgba(0,0,0,0.04)`
- Dropdown: `0 4px 16px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)`
- Floating nav: `0 8px 32px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)`
- Button: `shadow-sm` (Tailwind default: `0 1px 2px rgba(0,0,0,0.05)`)

### 5e. Active Press Feedback
All buttons: `active:scale-[0.98]`, `transition-all duration-150`.

### 5f. Active Nav Item
Active nav items get: `background: hsl(187 91% 36% / 0.08)`, `color: hsl(187 91% 36%)`, `font-weight: 600`.

### 5g. Stat Value Typography
KPI numbers use monospace font (`Geist Mono`) at `26px`, `font-weight: 600`, `letter-spacing: -0.03em`. This gives the dashboard its distinctive data-dense appearance.

### 5h. Section Label Pattern
Uppercase micro-labels: `11px`, `font-weight: 500`, `letter-spacing: 0.05em`, `text-transform: uppercase`, `color: #94A3B8`.

### 5i. Empty State Dash
Empty table cells render `---` via `::before` pseudo-element, coloured `#CBD5E1`.

### 5j. Dot-prefixed Badges
Badges include a 5px coloured dot before the text label by default. This is the primary visual differentiator versus generic pill badges.

### 5k. Global Border Default
All elements inherit `border-color: var(--dm-border-global)` (`#E5E7EB` in light mode) via a global `*, *::before, *::after` rule.

### 5l. Transition Baseline
A global `*` rule applies: `transition: background-color 0.15s ease, border-color 0.15s ease, color 0.1s ease` — overridden to `none` on bookings and timesheets pages for performance.
