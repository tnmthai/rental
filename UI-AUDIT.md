# RentFinder NZ — UI Consistency Audit

**Date:** 2026-05-26  
**Audited by:** MasterD (automated scan)  
**Scope:** All 18 page files, 7 component files, layout, providers, globals.css, package.json

---

## 1. Current State

### 1.1 Design System (globals.css)

A proper design system **does exist** in `globals.css` with CSS variables, utility classes, and component classes:

- **CSS Variables:** `--brand-primary` (#0f766e), `--brand-blue` (#2563eb), `--brand-purple` (#7c3aed), full neutral palette, status colors, radius tokens, shadow tokens
- **Utility classes:** `.btn`, `.btn-primary`, `.btn-blue`, `.btn-outline`, `.btn-ghost`, `.btn-sm`, `.btn-danger`
- **Component classes:** `.card`, `.card-body`, `.badge`, `.input`, `.select`, `.textarea`, `.label`, `.page-container`, `.section`, `.back-link`, `.hero`, `.hero-badge`, `.gradient-text`, `.status-badge`, `.faq-card`, `.list-item`, `.scroll-container`
- **Typography:** Inter font stack defined in body rule
- **Dark mode:** Full `[data-theme="dark"]` variable overrides

**However**, many pages **ignore the design system** and use inline styles instead.

---

### 1.2 Font Usage Per Page

| Page | Font Family | Sizes Used | Weights Used |
|------|------------|------------|--------------|
| **globals.css** | `'Inter', system-ui, -apple-system...` | — | — |
| **app/page.tsx** (home) | Inherited (Inter) | 12, 13, 14, 16, 17, 20px | 600, 700, 800, 850, 900 |
| **app/about/page.tsx** | Inherited | 13, 14, 15, 17, 24, 32px (clamp) | 600, 800, 900 |
| **app/contact/page.tsx** | Inherited | 13, 14, 15, 20, 24, 48px | 600, 800 |
| **app/login/page.tsx** | Inherited | 13, 14, 15, 16, 18, 30, 38px | 600, 650, 700, 800, 850, 900 |
| **app/dashboard/page.tsx** | Inherited | 12, 13, 14, 20px | 600, 700, 800 |
| **app/map/page.tsx** | Inherited | 14, 28px | 700 |
| **app/post/page.tsx** | Inherited | 12, 13, 14, 16, 22, 38px | 600, 650, 700, 750, 800, 850 |
| **app/wanted/page.tsx** | Inherited | 13, default | 600, 700 |
| **app/wanted/post/page.tsx** | Inherited | 13, 14, 16, 22, 38px | 600, 700, 750, 800, 850 |
| **app/hosts/page.tsx** | Inherited | 13, 14, 15, 18, 24, 36px | 600, 700, 800 |
| **app/rent/[slug]/page.tsx** | Inherited | 13, default | — |
| **app/listing/[id]/page.tsx** | Inherited | 12, 13, 14, 16px | 600, 700 |
| **app/privacy/page.tsx** | Inherited | 14, 15, 16, 20px (clamp 28-40) | 600, 700, 800, 900 |
| **app/terms/page.tsx** | Inherited | 14, 15, 16, 20px (clamp 28-40) | 600, 700, 800, 900 |
| **app/admin/growth/page.tsx** | Inherited | 12, 13, 24px | 600, 800 |
| **app/admin/moderation/page.tsx** | Inherited | 13, 18px | 600, 700 |
| **app/admin/users/page.tsx** | Inherited | 13px | 600, 700 |
| **app/admin/wanted/page.tsx** | Inherited | 13px | 700 |

**Key finding:** All pages inherit the Inter font from `globals.css`. No page overrides `fontFamily`. ✅ Font stack is consistent.

**Problem:** Font sizes and weights are **wildly inconsistent** across pages. The design system defines no typography scale — each page picks its own sizes.

---

### 1.3 Button Styles Per Page

| Page | Uses `.btn` classes? | Inline button styles? | Border-radius | Colors |
|------|---------------------|----------------------|---------------|--------|
| **home** | ✅ `btn btn-primary`, `btn btn-outline`, `btn btn-sm` | ✅ Many inline (compare, filters, language, theme) | 8px, 10px, 999px (pill) | Teal, blue, white, gray |
| **about** | ✅ `btn btn-outline` | ❌ | pill (via class) | White/teal |
| **contact** | ✅ `btn btn-primary`, `btn btn-ghost` | ❌ | pill (via class) | Teal, ghost |
| **login** | ✅ `btn btn-outline`, `btn btn-blue` | ✅ Facebook button inline | 12px, 999px (toggle) | Blue, white, #1877F2 |
| **dashboard** | ✅ `btn btn-primary`, `btn btn-outline`, `btn btn-sm`, `btn btn-danger`, `btn btn-blue` | ✅ Boost button inline | pill (via class) | Teal, blue, amber, red |
| **map** | ❌ | ✅ All inline | 999px | Teal outline, teal filled |
| **post** | ❌ | ✅ All inline | 999px | Blue, purple, amber |
| **wanted** | ❌ | ✅ All inline | 8px, 999px | Blue |
| **wanted/post** | ❌ | ✅ All inline | 999px | Teal, orange |
| **hosts** | ✅ `btn btn-outline btn-sm`, `btn btn-blue` | ❌ | pill (via class) | Blue, outline |
| **rent/[slug]** | ❌ | ❌ | — | — |
| **listing/[id]** | ❌ | ❌ | — | — |
| **privacy** | ❌ | ❌ | — | — |
| **terms** | ❌ | ❌ | — | — |
| **admin/growth** | ❌ | ✅ All inline | 8px | Black/white toggle |
| **admin/moderation** | ❌ | ✅ All inline | 8px | Green, red, blue, amber, gray |
| **admin/users** | ❌ | ✅ All inline | 8px | Green, red |
| **admin/wanted** | ❌ | ✅ All buttons unstyled (browser default!) | — | Browser default + red text |

**Key findings:**
- **Home, about, contact, dashboard, hosts** use the design system's `.btn` classes
- **Map, post, wanted, wanted/post, all admin pages** use **entirely inline styles**
- **admin/wanted** has **completely unstyled buttons** (no border, no background, no color — raw browser defaults)
- Button border-radius is inconsistent: some use pill (999px), some use 8px, some use 12px
- Primary button color varies: teal (#0f766e) on some pages, blue (#2563eb) on others

---

### 1.4 Card/Listing Styles Per Page

| Page | Uses `.card` class? | Inline card styles? | Border-radius | Shadow |
|------|--------------------|--------------------|---------------|--------|
| **home** | ✅ `.card` on listing articles | Mixed inline on search area | 22px (hero), 24px (search bar) | Large drop shadows |
| **about** | ✅ `.card .card-body` | ❌ | Via CSS (16px) | Via CSS |
| **contact** | ✅ `.card .card-body` | ❌ | Via CSS (16px) | Via CSS |
| **login** | ❌ | ✅ Full inline | 24px | `0 24px 70px` |
| **dashboard** | ✅ `.card .card-body` for growth | Mixed | 12px (scroll containers) | — |
| **map** | ❌ | ✅ Inline | 16px | `0 8px 30px` |
| **post** | ❌ | ✅ Full inline | 24px | `0 18px 50px`, `0 20px 60px` |
| **wanted** | ❌ | ❌ (no cards) | — | — |
| **wanted/post** | ❌ | ✅ Full inline | 24px, 18px | `0 18px 50px`, `0 20px 60px` |
| **hosts** | ✅ `.card .card-body` | ❌ | Via CSS | Via CSS |
| **rent/[slug]** | ❌ | ❌ (articles with borderTop) | — | — |
| **listing/[id]** | ❌ | ✅ Inline description box | 8px, 12px | `0 14px 28px` (map) |
| **privacy** | ❌ | ❌ (no cards) | — | — |
| **terms** | ❌ | ❌ (no cards) | — | — |
| **admin/growth** | ❌ | ✅ Inline | 12px | — |
| **admin/moderation** | ❌ | ✅ Inline | 12px | `0 2px 8px` |
| **admin/users** | ❌ | ✅ Inline | 10px | — |
| **admin/wanted** | ❌ | ✅ Inline | 10px | — |

**Key findings:**
- Border-radius for cards/containers varies: 8px, 10px, 12px, 16px, 18px, 22px, 24px across pages
- Shadow styles vary significantly
- Only about, contact, hosts consistently use `.card` class

---

### 1.5 Icon Usage

| Icon Type | Where Used | Notes |
|-----------|-----------|-------|
| **Emoji icons** (📱, 📘, 💬, 🔗, ↗️, ✅, ⚙️, 💡, 🗺️, 🏠, 👀, 🟢, ☀️, 🌙, 📋, ⭐, 🔔, ❓) | home, share buttons, SubNav, dashboard, listing detail, admin/moderation | Heavy emoji usage for functional icons |
| **SVG Icon component** (`Icon` component) | home (star, shield, zap, check, x), dashboard (star, zap, shield), listing detail (check, x, star, shield), ReviewSection (edit) | Feather-style SVG icons via custom `Icon` component |
| **Unicode characters** (←, ✕, ‹, ›, ⇔, ✓) | Various pages for back buttons, close buttons, navigation | Mixed with emoji |
| **🤖 Robot icon** | **NONE** | No robot icons found anywhere in the codebase ✅ |

**Key findings:**
- Two parallel icon systems: emoji and SVG `Icon` component
- No robot icons to remove
- Inconsistent icon style — some pages use emoji, others use SVG, some use raw Unicode

---

### 1.6 Color Palette Being Used

**From globals.css variables:**
- Primary: `#0f766e` (teal), `#2563eb` (blue), `#7c3aed` (purple)
- Neutrals: `#0f172a`, `#334155`, `#6b7280`, `#9ca3af`, `#f8fbff`, `#ffffff`, `#f8fafc`, `#e5eaf2`, `#eef2f7`
- Status: green (`#166534`/`#dcfce7`), red (`#991b1b`/`#fee2e2`), yellow (`#854d0e`/`#fef9c3`), blue (`#1e40af`/`#dbeafe`)

**Hardcoded colors used inline (bypassing CSS variables):**
- `#1f2937`, `#111827`, `#374151`, `#4b5563`, `#6b7280`, `#9ca3af` (gray scale — duplicates of CSS vars)
- `#0f766e`, `#0d6b63` (teal — duplicates)
- `#2563eb`, `#1a73e8`, `#1d4ed8`, `#3b82f6`, `#93c5fd`, `#bfdbfe`, `#dbeafe` (blue variants)
- `#1877f2` (Facebook blue), `#25D366` (WhatsApp green), `#0068FF` (Zalo blue)
- `#ef4444`, `#dc2626`, `#b91c1c`, `#991b1b` (red variants)
- `#f59e0b`, `#fcd34d`, `#92400e`, `#d97706` (amber variants)
- `#16a34a`, `#166534`, `#059669` (green variants)
- `#8b5cf6`, `#7c3aed`, `#4338ca`, `#c4b5fd` (purple variants)
- `#006621` (dark green for source links)
- `#1a0dab` (Google-style blue for links)
- `#4285F4` (Google G color)
- `#ea580c` (orange for wanted/post login CTA)

**Key finding:** The CSS variables are defined but many pages hardcode the same or similar colors inline. There are at least **5 different shades of blue** used for primary actions across pages.

---

### 1.7 Spacing/Layout Patterns

| Pattern | Pages Using |
|---------|-----------|
| `maxWidth: 1080/1100/1120, margin: '0 auto', padding: 24` | home, dashboard, post, admin pages |
| `maxWidth: 980, margin: '0 auto', padding: 24` | listing detail, rent/slug, wanted, admin/moderation, admin/users, admin/wanted |
| `maxWidth: 900, margin: '0 auto'` | hosts |
| `maxWidth: 760, margin: '0 auto'` | privacy, terms, post (login required state) |
| `.page-container` class (maxWidth: 1080, margin auto, padding 32px 20px 80px) | about, contact, dashboard |
| No container (full width with padding) | map |

**Key finding:** At least **5 different max-width values** used across pages. No consistent container system.

---

### 1.8 Inline Styles vs CSS Classes

| Page | Inline % (est.) | Uses CSS classes? |
|------|-----------------|-------------------|
| **home** | ~80% | Minimal (`.card`, `.badge`, `.btn`, `.descClamp`) |
| **about** | ~30% | Heavy (`.page-container`, `.hero`, `.card`, `.section`, `.back-link`, `.gradient-text`) |
| **contact** | ~35% | Heavy (`.page-container`, `.hero`, `.card`, `.btn`, `.faq-card`, `.input`, `.label`) |
| **login** | ~90% | Minimal (`.btn`) |
| **dashboard** | ~40% | Moderate (`.page-container`, `.card`, `.btn`, `.status-badge`, `.list-item`, `.scroll-container`) |
| **map** | ~95% | Only SubNav |
| **post** | ~95% | Only SubNav |
| **wanted** | ~90% | Only SubNav |
| **wanted/post** | ~90% | Only SubNav |
| **hosts** | ~25% | Heavy (`.page-container`, `.hero`, `.card`, `.btn`) |
| **rent/[slug]** | ~90% | None |
| **listing/[id]** | ~85% | Minimal (`.btn` via FavoriteButtonWrapper) |
| **privacy** | ~95% | None |
| **terms** | ~95% | None |
| **admin/growth** | ~90% | Only SubNav |
| **admin/moderation** | ~95% | Only SubNav |
| **admin/users** | ~95% | Only SubNav |
| **admin/wanted** | ~95% | Only SubNav |

---

## 2. Inconsistencies Found

### 2.1 Critical: admin/wanted Has Unstyled Buttons

The `admin/wanted/page.tsx` has buttons with **no styles at all** — raw browser default buttons:
```tsx
<button onClick={() => setScope('pending')}>Pending only</button>
<button onClick={() => setScope('all')}>All requests</button>
<button onClick={() => act(i.id, 'approve')}>Approve</button>
<button onClick={() => act(i.id, 'reject')}>Reject</button>
```
Every other admin page at least applies inline border/background/radius.

### 2.2 Critical: Mixed Button Color System

- **Teal primary** (#0f766e): Used by `.btn-primary` in CSS, home search, wanted/post submit, map "Post a listing"
- **Blue primary** (#2563eb): Used by `.btn-blue` in CSS, login submit, post publish, wanted "Contact renter", home "Compare Now"
- **No clear rule** for when teal vs blue is the primary action color

### 2.3 High: Inconsistent Border-Radius

| Token | Value | Pages Using |
|-------|-------|-----------|
| `--radius-sm` | 8px | Admin pages (inline), some home buttons |
| `--radius-md` | 12px | Login inputs, listing detail map, admin cards |
| `--radius-lg` | 16px | Map container, about cards (via CSS) |
| `--radius-xl` | 20px | About section bg (via CSS) |
| `--radius-2xl` | 24px | Login shell, post hero, wanted/post hero, home hero (22px) |
| `--radius-pill` | 999px | Most buttons, badges, toggle chips |

Many pages use hardcoded `borderRadius: 10` or `borderRadius: 8` or `borderRadius: 12` without referencing CSS variables.

### 2.4 High: SubNav Component Is Inconsistent With Page Design

`SubNav` renders raw inline-styled buttons with `border: '1px solid #ddd'` — doesn't use the `.btn` system at all. Used by: dashboard, map, post, wanted, wanted/post, listing/[id], all admin pages.

### 2.5 High: Link Colors Vary

- `#0f766e` (teal) — about back-link, privacy/terms back-link
- `#1a73e8` (Google blue) — home footer, listing detail source, admin links
- `#1a0dab` (Google result blue) — rent/[slug] listing titles
- `#2563eb` (brand blue) — dashboard notifications, login
- `#006621` (dark green) — source URLs on home & listing detail
- `var(--brand-primary)` — contact page links (via CSS)

### 2.6 Medium: Wanted Page vs Wanted/Post Page — Different Design Languages

- `wanted/page.tsx`: Minimal, plain, no design system usage, basic `<article>` with borderTop separator
- `wanted/post/page.tsx`: Rich hero section, gradient backgrounds, side panel with dark bg, toggle chips, full form styling

These two pages in the same feature area look like they belong to different apps.

### 2.7 Medium: Rent/[slug] Page Has No Design System Usage

The `rent/[slug]/page.tsx` uses zero design system classes. Listings are rendered as plain `<article>` elements with `borderTop: '1px solid #eee'` — no cards, no badges, no structured layout. This is an SEO page but should still look like it belongs to the same app.

### 2.8 Medium: Listing/[id] Page Mixes Inline Status Badges

The listing detail page creates status badge styles inline instead of using the `.status-badge` classes from globals.css:
```tsx
// Inline in listing/[id]
style={{ background: '#dcfce7', color: '#166534' }}

// CSS class exists but not used here
.status-approved { background: var(--status-success-bg); color: var(--status-success); }
```

### 2.9 Medium: Post Page Hero Gradient Differs From Wanted/Post

- `post/page.tsx`: `linear-gradient(135deg, #eff6ff 0%, #ffffff 56%, #ecfeff 100%)` (blue-cyan)
- `wanted/post/page.tsx`: `linear-gradient(135deg, #f0fdfa 0%, #ffffff 58%, #eef2ff 100%)` (teal-indigo)
- `home/page.tsx`: `linear-gradient(135deg, #ffffff 0%, #f0fdfa 42%, #eff6ff 100%)` (white-teal-blue)

Three different gradients for hero sections.

### 2.10 Low: Privacy & Terms Pages Are Pixel-Identical But Separate

Both pages share the exact same layout structure, styles, and spacing. Could be extracted into a shared `LegalPage` wrapper component.

### 2.11 Low: Home Page Has `<style jsx global>` Overrides

The home page injects global CSS via styled-jsx that overrides body background and adds mobile breakpoints. This conflicts with globals.css.

### 2.12 Low: Inconsistent "Back" Navigation

| Page | Back Element | Style |
|------|-------------|-------|
| about, contact | `<a className="back-link">` | CSS class, teal |
| privacy, terms | `<a style={...}>` | Inline, teal |
| hosts | `<a className="btn btn-outline btn-sm">` | Button-style, gray |
| listing/[id] | `<SubNav />` | Inline gray buttons |
| map, post, wanted, admin | `<SubNav />` | Inline gray buttons |

---

## 3. Recommendations

### 3.1 Unified Container System

Replace all hardcoded `maxWidth` + `margin: '0 auto'` + `padding` with the existing `.page-container` class:

```tsx
// Before (used by 10+ pages):
<main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>

// After:
<main className="page-container" style={{ maxWidth: 980 }}>
```

Or add variants:
```css
.page-container { max-width: 1080px; ... }
.page-container--narrow { max-width: 760px; }
.page-container--wide { max-width: 1200px; }
```

### 3.2 Unified Button System

All pages should use `.btn` classes. The current system is good — it just needs to be used everywhere.

**Action items:**
1. **admin/wanted**: Add `.btn btn-outline btn-sm` to all buttons
2. **admin/moderation**: Replace inline button styles with `.btn btn-primary btn-sm`, `.btn btn-danger btn-sm`, `.btn btn-outline btn-sm`
3. **admin/users**: Same as above
4. **admin/growth**: Replace toggle buttons with `.btn btn-outline btn-sm` + active state
5. **map page**: Replace inline link styles with `.btn btn-outline` and `.btn btn-primary`
6. **post page**: Replace inline submit button with `.btn btn-blue`
7. **wanted/post**: Replace inline submit with `.btn btn-primary`
8. **SubNav**: Replace inline styles with `.btn btn-ghost btn-sm`

### 3.3 Unified Card System

Standardize on the existing `.card` / `.card-body` classes:

```css
/* Already in globals.css: */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);  /* 20px */
  overflow: hidden;
  box-shadow: var(--shadow-md);
}
```

**Action items:**
1. **post page**: Hero section and form container → `.card`
2. **wanted/post**: Same
3. **login**: Shell container → `.card`
4. **admin pages**: All list items → `.card` or `.list-item`
5. **rent/[slug]**: Listing articles → `.card`

### 3.4 Unified Typography Scale

Add to globals.css:
```css
.text-xs   { font-size: 12px; }
.text-sm   { font-size: 13px; }
.text-base { font-size: 14px; }
.text-md   { font-size: 16px; }
.text-lg   { font-size: 20px; }
.text-xl   { font-size: 24px; }
.text-2xl  { font-size: 32px; }
.text-3xl  { font-size: 38px; }

.font-medium  { font-weight: 600; }
.font-bold    { font-weight: 700; }
.font-extrabold { font-weight: 800; }
.font-black   { font-weight: 900; }
```

### 3.5 Unified Link Color

Standardize all link colors:
- **Primary links:** `var(--brand-primary)` (#0f766e) — for navigation, CTAs
- **Source/external links:** `var(--brand-blue)` (#2563eb) — for external URLs
- **Muted links:** `var(--text-muted)` (#6b7280) — for footer, secondary nav

Remove hardcoded `#1a73e8`, `#1a0dab`, `#006621`.

### 3.6 Unified Hero Section

Three hero variants exist (blue gradient, teal gradient, white gradient). Standardize to one or two:

```css
.hero--brand {
  background: linear-gradient(135deg, var(--brand-primary-light) 0%, var(--bg-card) 50%, var(--brand-blue-light) 100%);
}
.hero--dark {
  background: var(--text-primary);
  color: #fff;
}
```

### 3.7 Replace SubNav With BackLink Component

The current SubNav is too minimal and doesn't use the design system. Replace with:
```tsx
function BackLink({ href = '/', label = 'Back to home' }: { href?: string; label?: string }) {
  return (
    <a href={href} className="back-link">
      ← {label}
    </a>
  );
}
```

### 3.8 Icon System Consolidation

**Current state:** Two systems coexist (emoji + SVG Icon component).

**Recommendation:** Keep both but standardize usage:
- **Functional/action icons:** Use `Icon` component (star, shield, check, x, zap, edit, etc.)
- **Decorative/brand icons:** Emoji is fine (🗺️, 📱, 🏠)
- **Remove:** Mixed Unicode symbols (←, ✕) → use `Icon` component instead

### 3.9 Remove Hardcoded Colors

Replace all inline color values with CSS variable references:
```tsx
// Before:
style={{ color: '#6b7280' }}

// After:
style={{ color: 'var(--text-muted)' }}
```

This enables dark mode to work on all pages (currently only pages using CSS variables get dark mode support).

### 3.10 Specific Pages Requiring Full Rework

| Priority | Page | Issue |
|----------|------|-------|
| 🔴 P0 | `admin/wanted` | Unstyled buttons, no design system |
| 🔴 P0 | `wanted/page.tsx` | No design system, looks like a different app |
| 🟡 P1 | `rent/[slug]/page.tsx` | No design system, plain articles |
| 🟡 P1 | `map/page.tsx` | 95% inline, no design system |
| 🟡 P1 | `privacy/page.tsx` + `terms/page.tsx` | 95% inline, should use shared legal template |
| 🟢 P2 | `post/page.tsx` | Good design but 95% inline |
| 🟢 P2 | `wanted/post/page.tsx` | Good design but 95% inline |
| 🟢 P2 | `login/page.tsx` | Good design but 90% inline |
| 🟢 P2 | `admin/moderation/page.tsx` | Functional but all inline |
| 🟢 P2 | `admin/growth/page.tsx` | Functional but all inline |
| 🟢 P2 | `admin/users/page.tsx` | Functional but all inline |

---

## 4. Summary

**What's working well:**
- ✅ `globals.css` has a solid design system foundation (variables, classes, dark mode)
- ✅ Font stack is consistent (Inter everywhere via inheritance)
- ✅ No robot icons anywhere
- ✅ Pages that use CSS classes (about, contact, hosts, dashboard) look cohesive
- ✅ `Icon` component provides clean SVG icons
- ✅ Badge system works well where used

**What needs fixing:**
- ❌ ~60% of pages bypass the design system entirely with inline styles
- ❌ Button styles are inconsistent (3+ border-radius values, 2+ color systems)
- ❌ Container max-width varies across 5+ values
- ❌ admin/wanted has completely unstyled buttons
- ❌ Link colors are all over the place (6+ different blues/greens)
- ❌ Hero gradients differ per page
- ❌ Dark mode only works on pages using CSS variables
- ❌ SubNav component doesn't use the design system

**Estimated effort to fix:**
- P0 items (unstyled pages): ~2-3 hours
- P1 items (major reworks): ~3-4 hours
- P2 items (inline → class migration): ~4-6 hours
- Total: ~1-2 days of focused UI work
