# SocietyPro — Design System Document

**Version:** 1.0  
**Last Updated:** 18 July 2026

---

## 1. Design Philosophy

SocietyPro serves housing society committee members and residents — many of whom are **non-technical, middle-aged or elderly**. The UI must feel:

- **Trustworthy** — like a bank or government portal, not a flashy startup
- **Simple** — no cognitive overload, clear visual hierarchy
- **Accessible** — large text, good contrast, obvious buttons
- **Professional** — clean and modern without being trendy or distracting
- **Familiar** — common patterns users already know from WhatsApp, Google Pay, etc.

### Design Anti-Patterns to Avoid
- ❌ Generic SaaS blue/purple gradient look
- ❌ Tiny text or low-contrast elements
- ❌ Overly animated or flashy interfaces
- ❌ Complex multi-step forms without progress indicators
- ❌ Icons without labels (users won't guess meanings)
- ❌ Dark mode as default (keep it optional)

---

## 2. Color Palette

A warm, grounded palette that conveys trust and reliability — inspired by Indian architectural tones rather than generic tech blues.

### Primary Colors

| Name | Hex | Usage |
|---|---|---|
| **Deep Teal** | `#0F766E` | Primary buttons, active nav, headers |
| **Teal Light** | `#14B8A6` | Hover states, links, accents |
| **Teal Subtle** | `#CCFBF1` | Light backgrounds, badges, highlights |

### Neutral Colors

| Name | Hex | Usage |
|---|---|---|
| **Charcoal** | `#1E293B` | Primary text, headings |
| **Slate** | `#475569` | Secondary text, descriptions |
| **Gray Light** | `#F1F5F9` | Page backgrounds, cards |
| **White** | `#FFFFFF` | Card backgrounds, inputs |
| **Border** | `#E2E8F0` | Borders, dividers |

### Semantic Colors

| Name | Hex | Usage |
|---|---|---|
| **Success** | `#16A34A` | Payment captured, complaint resolved |
| **Warning** | `#D97706` | Pending payments, in-progress items |
| **Error** | `#DC2626` | Failed payments, validation errors |
| **Info** | `#2563EB` | Notices, informational alerts |

### Tailwind CSS v4 Custom Theme

```css
/* index.css */
@import "tailwindcss";

@theme {
  --color-primary: #0F766E;
  --color-primary-light: #14B8A6;
  --color-primary-subtle: #CCFBF1;
  --color-charcoal: #1E293B;
  --color-slate: #475569;
  --color-surface: #F1F5F9;
  --color-border: #E2E8F0;
  --color-success: #16A34A;
  --color-warning: #D97706;
  --color-error: #DC2626;
  --color-info: #2563EB;
}
```

---

## 3. Typography

### Font Family

**Primary:** `Inter` — clean, highly readable, excellent for interfaces  
**Fallback:** `system-ui, -apple-system, sans-serif`

```html
<!-- Add to index.html <head> -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

```css
@theme {
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
}
```

### Type Scale

| Element | Size | Weight | Usage |
|---|---|---|---|
| Page Title (h1) | 28px / `text-3xl` | 700 (Bold) | Dashboard headings, page titles |
| Section Title (h2) | 22px / `text-2xl` | 600 (Semibold) | Card headings, section titles |
| Subtitle (h3) | 18px / `text-lg` | 600 (Semibold) | Sub-sections |
| Body | 16px / `text-base` | 400 (Regular) | General content, form labels |
| Small | 14px / `text-sm` | 400 (Regular) | Descriptions, helper text |
| Caption | 12px / `text-xs` | 500 (Medium) | Badges, timestamps, metadata |

### Readability Rules
- **Minimum body text:** 16px (never go below 14px for any visible text)
- **Line height:** 1.5–1.75 for body text
- **Maximum line width:** 72 characters for readability
- **Contrast ratio:** Minimum 4.5:1 (WCAG AA)

---

## 4. Component Design Guidelines

### Buttons

```
Primary:    bg-primary text-white rounded-lg px-6 py-2.5 font-medium
Secondary:  bg-white border border-border text-charcoal rounded-lg px-6 py-2.5
Danger:     bg-error text-white rounded-lg px-6 py-2.5 font-medium
Disabled:   opacity-50 cursor-not-allowed
```

- Minimum button height: 44px (touch-friendly)
- Always use text labels — avoid icon-only buttons
- Hover state: slightly darker shade
- Loading state: show spinner + "Processing..." text

### Cards

```
bg-white rounded-xl shadow-sm border border-border p-6
```

- Use cards to group related information
- One primary action per card maximum
- Consistent padding: 24px (p-6)

### Forms

- Labels above inputs (never inline/floating for this audience)
- Input height: minimum 44px
- Clear placeholder text explaining expected format
- Validation errors shown below the input in red
- Required fields marked with red asterisk (*)

### Tables

- Use for listing residents, payments, societies
- Zebra striping for alternate rows (bg-surface on even rows)
- Sticky header on scroll
- Action buttons in last column
- Mobile: convert to card layout below 768px

### Navigation

- Sidebar for desktop (left, 260px wide, collapsible)
- Bottom tab bar for mobile
- Active state: primary color background with white text
- Icons + text labels for every nav item

---

## 5. Layout Structure

### Desktop (≥1024px)

```
┌─────────────────────────────────────────────────────┐
│  Top Bar (logo, user menu, notifications)           │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│  Side    │         Main Content Area                │
│  Nav     │         (max-width: 1200px, centered)    │
│  (260px) │                                          │
│          │                                          │
├──────────┴──────────────────────────────────────────┤
│  Footer (optional)                                  │
└─────────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌─────────────────────┐
│  Top Bar (hamburger) │
├─────────────────────┤
│                     │
│   Main Content      │
│   (full width,      │
│    padded 16px)     │
│                     │
├─────────────────────┤
│  Bottom Tab Nav     │
└─────────────────────┘
```

---

## 6. Spacing System

Use Tailwind's default spacing scale consistently:

| Token | Pixels | Usage |
|---|---|---|
| `1` | 4px | Tight spacing (icon gaps) |
| `2` | 8px | Inline element spacing |
| `3` | 12px | Compact padding |
| `4` | 16px | Standard padding, mobile page margins |
| `6` | 24px | Card padding, section gaps |
| `8` | 32px | Section spacing |
| `12` | 48px | Major section breaks |

---

## 7. Dashboard Widgets

Each role sees different dashboard cards:

### SuperAdmin
- Total Societies (count)
- Total Users (count)
- Recent Activity feed
- Quick-create society button

### SocietyAdmin
- Resident Count
- Pending Payments (amount + count)
- Open Complaints (count)
- Recent Notices
- Quick actions: Add Resident, Post Notice, Create Bill

### Resident
- My Pending Dues (amount)
- Pay Now button (prominent)
- Latest Notice (preview)
- My Complaints (status summary)

---

## 8. Iconography

Use **Lucide React** icons (clean, consistent, open-source):
- Install: `npm install lucide-react` (requires approval)
- Style: stroke-based, 24px default
- Always pair icons with text labels for this user base

---

## 9. Responsive Breakpoints

| Breakpoint | Width | Target |
|---|---|---|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops / sidebar breakpoint |
| `xl` | 1280px | Desktops |

Priority: **Mobile-first**. Design for phones first, then scale up.
