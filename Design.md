# SocietyPro — UI/UX Design System Specification
**Desktop-First Administrative Web Portal**  
**Framework:** TailwindCSS v4 • React 19 • Lucide Icons  
**Version:** 1.0 • September 2026

---

## 1. Design Philosophy & Administrative Principles

SocietyPro's administrative interface is designed specifically for housing society managing committees, resident welfare associations (RWAs), and society owners. Administrative workflows differ fundamentally from consumer web applications:

1. **Desktop-First & Information Density**: Administrators perform work on laptops and desktop displays (1280px+). Interfaces prioritize scannability, compact row spacing, and immediate visibility of operational metrics over oversized whitespace.
2. **Deterministic Status Feedback**: In property management, ambiguous status produces real-world disputes. Statuses (Active, Pending, Rejected, Overdue) utilize a rigorous 4-color semantic scheme combining background tints, high-contrast text, borders, and icon indicators.
3. **Financial Precision**: All monetary figures represent Paise integers formatted in Indian Numbering System (`₹12,45,000`). Number columns utilize tabular monospace figures (`font-mono tabular-nums`) right-aligned for vertical decimal parity.
4. **TailwindCSS v4 Native Architecture**: Built on modern `@theme` directives with CSS custom properties, eliminating legacy `tailwind.config.js` in favor of declarative token definitions in `index.css`.
5. **Fail-Safe Action Confirmation**: Destructive or irrevocable actions (rejecting resident verification, voiding maintenance ledger entries, deleting user profiles) enforce double-confirmation dialogs with explicit color coding.

---

## 2. Color Palette & Token Definitions (TailwindCSS v4)

### 2.1 Foundational Neutral Palette (Slate & Zinc)
Administrative portals require clean, low-glare neutral backdrops that let semantic status colors stand out:

| Role | Color Name | Hex Code | Tailwind Token / Class | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Canvas Background** | Slate 50 | `#F8FAFC` | `bg-slate-50` / `bg-surface` | Default page background behind cards |
| **Card / Surface** | Pure White | `#FFFFFF` | `bg-white` | Cards, modals, top bar, sidebar |
| **Subtle Surface** | Slate 100 | `#F1F5F9` | `bg-slate-100` | Input backgrounds, table headers, hover rows |
| **Card Borders** | Slate 200 | `#E2E8F0` | `border-slate-200` / `border-border` | Default card dividers, table borders |
| **Muted Text / Icons** | Slate 400 | `#94A3B8` | `text-slate-400` | Placeholder text, secondary icons, timestamps |
| **Body Text** | Slate 600 | `#475569` | `text-slate-600` / `text-slate` | Descriptions, labels, secondary metadata |
| **Headings & Emphasis**| Slate 900 | `#0F172A` | `text-slate-900` / `text-charcoal` | Page titles, table cell primary text, bold metrics |

---

### 2.2 Primary Brand Tones (Deep Emerald & Indigo Accents)
SocietyPro employs a professional, trustworthy **Deep Emerald / Teal** as its primary brand foundation, accented with **Indigo** for administrative authority.

| Token | Name | Hex Code | Utility Class | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `--color-primary` | Emerald Dark | `#0F766E` | `bg-primary`, `text-primary` | Primary action buttons, active sidebar item, brand links |
| `--color-primary-hover`| Emerald Mid | `#115E59` | `hover:bg-primary-hover` | Button hover state, interactive elements |
| `--color-primary-light`| Teal Vibrant | `#14B8A6` | `bg-primary-light` | Metric badges, gradient highlights |
| `--color-primary-subtle`| Teal Frost | `#CCFBF1` | `bg-primary-subtle` | Active nav pill, avatar badge background |
| `--color-accent` | Indigo 600 | `#4F46E5` | `bg-indigo-600` | SuperAdmin badges, secondary highlights |
| `--color-accent-subtle`| Indigo 50 | `#EEF2FF` | `bg-indigo-50` | Committee elevated role badges |

---

### 2.3 Semantic Status Palette
Status colors are never used raw; they are applied in **3-part coordinate systems** (Tonal Background + Border + High-Contrast Foreground Text):

```
┌─────────────────────────────────────────────────────────────┐
│  Active / Approved  │ Emerald (bg-emerald-50, border-emerald-200, text-emerald-700) │
├─────────────────────┼─────────────────────────────────────────┤
│  Pending / Warning  │ Amber   (bg-amber-50,   border-amber-200,   text-amber-700)   │
├─────────────────────┼─────────────────────────────────────────┤
│  Rejected / Danger  │ Rose    (bg-rose-50,    border-rose-200,    text-rose-700)    │
├─────────────────────┼─────────────────────────────────────────┤
│  Informational      │ Sky     (bg-sky-50,     border-sky-200,     text-sky-700)     │
└─────────────────────────────────────────────────────────────┘
```

| Semantic Status | Meaning in SocietyPro | Background | Border | Text | Dot / Icon Indicator |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Active / Approved** | Verified resident, Paid bill, Resolved grievance | `bg-emerald-50` | `border-emerald-200` | `text-emerald-700` | `text-emerald-600` / `bg-emerald-500` |
| **Pending / In Review**| Gatekeeper queue, Unpaid bill, Under investigation | `bg-amber-50` | `border-amber-200` | `text-amber-700` | `text-amber-600` / `bg-amber-500` |
| **Rejected / Danger** | Denied registration, Voided payment, Escalated ticket | `bg-rose-50` | `border-rose-200` | `text-rose-700` | `text-rose-600` / `bg-rose-500` |
| **Info / Scheduled** | Pinned announcement, Notice board post, Audit record | `bg-sky-50` | `border-sky-200` | `text-sky-700` | `text-sky-600` / `bg-sky-500` |

---

### 2.4 Complete TailwindCSS v4 `@theme` Specification
Drop this directly into `frontend/src/index.css`:

```css
@import "tailwindcss";

@theme {
  /* Brand Primary Colors */
  --color-primary: #0F766E;
  --color-primary-hover: #115E59;
  --color-primary-light: #14B8A6;
  --color-primary-subtle: #CCFBF1;

  /* Neutral Slate Scale */
  --color-surface: #F8FAFC;
  --color-charcoal: #0F172A;
  --color-slate-muted: #94A3B8;
  --color-slate-body: #475569;
  --color-border: #E2E8F0;
  --color-border-subtle: #F1F5F9;

  /* Semantic Status Tokens */
  --color-success: #059669;
  --color-success-bg: #ECFDF5;
  --color-success-border: #A7F3D0;

  --color-warning: #D97706;
  --color-warning-bg: #FFFBEB;
  --color-warning-border: #FDE68A;

  --color-danger: #E11D48;
  --color-danger-bg: #FFF1F2;
  --color-danger-border: #FECDD3;

  --color-info: #0284C7;
  --color-info-bg: #F0F9FF;
  --color-info-border: #BAE6FD;

  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;

  /* Elevation Shadows */
  --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05);
  --shadow-card-hover: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-dropdown: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04);
}
```

---

## 3. Typography & Hierarchy

### 3.1 Typeface & Font Stack
The primary UI typeface is **Inter** imported via Google Fonts in `index.html`. It provides optimal legibility at 11px–14px body text, crisp tabular digits for currency, and clean vertical metrics.

```html
<!-- In index.html <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
```

---

### 3.2 Type Hierarchy Scale

| Level | Size | Weight | Tracking | Tailwind Classes | Example Context |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Page Title** | 24px (`1.5rem`) | 700 (Bold) | `-0.025em` | `text-2xl font-bold tracking-tight text-slate-900` | "Resident Approvals", "Society Financial Ledger" |
| **Section Header** | 18px (`1.125rem`) | 600 (Semibold) | `-0.015em` | `text-lg font-semibold text-slate-900` | "Pending Verifications (12)", "Monthly Breakdown" |
| **Card Metric** | 30px (`1.875rem`) | 800 (Extrabold) | `-0.03em` | `text-3xl font-extrabold text-slate-900 font-mono tabular-nums` | "₹4,82,500" (Total Reserve) |
| **Table Header** | 12px (`0.75rem`) | 600 (Semibold) | `0.05em` | `text-xs font-semibold uppercase tracking-wider text-slate-500` | "FLAT / UNIT", "RESIDENT NAME", "AMOUNT DUE" |
| **Table Body / Primary** | 14px (`0.875rem`) | 500 (Medium) | `normal` | `text-sm font-medium text-slate-900` | "A-402 • Priya Sharma", "Tower B" |
| **Table Body / Muted** | 13px (`0.8125rem`)| 400 (Regular) | `normal` | `text-[13px] text-slate-500` | "priya.sharma@example.com", "Paid via UPI" |
| **Form Label** | 13px (`0.8125rem`)| 600 (Semibold) | `normal` | `text-xs font-semibold text-slate-700` | "Flat / Unit Number *", "Monthly Due Date" |
| **Micro-Badge / Tag** | 11px (`0.6875rem`)| 700 (Bold) | `0.05em` | `text-[11px] font-bold uppercase tracking-wider` | "ACTIVE", "TREASURER", "OVERDUE" |

---

### 3.3 Numeric & Currency Formatting Standards
- **Rule 1**: Always use `font-mono tabular-nums` for columns or cards displaying monetary amounts so vertical digits align identically across rows.
- **Rule 2**: Format all rupee amounts with the Indian Numbering grouping:
  ```javascript
  export const formatINR = (paise) => {
    const rupees = (paise || 0) / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(rupees);
  };
  ```
- **Rule 3**: Right-align all numeric and monetary table columns with `text-right`.

---

## 4. Layout Guidelines & Desktop Shell

The administrative dashboard utilizes a desktop-optimized 3-zone shell with fixed navigation anchors and a fluid, scrollable workspace.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: [Logo: SocietyPro] [Society Selector: "Green Heights RWA (GRN-4921)"] [User / Sign-Out] │ (Fixed: h-16)
├──────────────────────┬─────────────────────────────────────────────────────────────────┤
│ SIDEBAR              │ MAIN WORKSPACE CANVAS (Scrollable: h-[calc(100vh-4rem)])       │
│                      │                                                                 │
│ ⌂ Dashboard          │ ┌─────────────────────────────────────────────────────────────┐ │
│ 🏢 Society Profile   │ │ Breadcrumbs: Home / Accounting / Maintenance Ledger          │ │
│ 👥 Residents Queue   │ │ Page Title & Action Button (e.g. "+ Generate Monthly Bills")  │ │
│ 💳 Payments & Dues   │ ├─────────────────────────────────────────────────────────────┤ │
│ 📋 Notice Board      │ │ KPI Summary Cards (Total Collected, Pending, Net Reserve)   │ │
│ ⚖ Grievances Redress │ ├─────────────────────────────────────────────────────────────┤ │
│                      │ │ Filter & Search Toolbar                                     │ │
│ [Collapse Icon <]    │ │ Sticky-Header Data Table (overflow-x-auto)                  │ │
│ (Fixed: w-64 / w-18) │ └─────────────────────────────────────────────────────────────┘ │
└──────────────────────┴─────────────────────────────────────────────────────────────────┘
```

### 4.1 Global Top Bar Anatomy (`h-16`)
- **Fixed Position**: `sticky top-0 z-30 h-16 bg-white border-b border-slate-200 shadow-xs`
- **Left**: SocietyPro brand mark + tenant badge pill (`bg-teal-50 text-teal-700 border-teal-200 font-semibold px-2 py-0.5 text-xs rounded-full`).
- **Center / Society Switcher**: Active society dropdown badge displaying Society Name and `societyCode` (`bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800`).
- **Right Profile**: User avatar circle with initials, Name + Role Badge (`SocietyOwner` / `Treasurer` / `Secretary`), and a distinct Sign-Out button (`hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200`).

---

### 4.2 Collapsible Sidebar (`w-64` Desktop Expanded, `w-18` Collapsed Rail)
- **Navigation Items**:
  - `Dashboard` (`Home`)
  - `My Society` (`Building`) — visible to SocietyOwner / Committee
  - `Committee` (`UserCheck`) — visible to SocietyOwner
  - `Residents` (`Users`) — gatekeeper approval queue & directory
  - `Payments & Ledger` (`CreditCard`) — billing, invoices, receipts
  - `Notices` (`Bell`) — pinned broadcasts & circulars
  - `Grievances` (`MessageSquareWarning`) — redressed complaints & upvotes
- **Active Navigation Item**: `bg-teal-50 text-teal-800 border border-teal-200/60 font-semibold shadow-xs`
- **Inactive Navigation Item**: `text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors`
- **Mobile Drawer**: Off-canvas slide-out triggered by top-bar hamburger (`z-50`), with a `bg-slate-900/40 backdrop-blur-xs` overlay.

---

### 4.3 Main Canvas Container
- **Max Width**: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full`
- **Background**: `bg-slate-50 min-h-[calc(100vh-4rem)]`
- **Vertical Rhythm**: Generous 24px (`gap-6` or `space-y-6`) spacing between page header, KPI stats grid, filter toolbar, and primary data tables.

---

## 5. Component Design Patterns & Production JSX Snippets

### 5.1 Form Controls & Input Fields

Form controls must have explicit focus rings, crisp borders, and dedicated helper or error label slots.

#### Text Input with Icon & Validation State
```jsx
export const FormInput = ({ label, error, icon: Icon, required, ...props }) => (
  <div className="space-y-1.5">
    {label && (
      <label className="block text-xs font-semibold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
    )}
    <div className="relative rounded-lg shadow-xs">
      {Icon && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          <Icon className="h-4 w-4" />
        </div>
      )}
      <input
        {...props}
        className={`block w-full rounded-lg border bg-white py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
          Icon ? 'pl-9 pr-3' : 'px-3'
        } ${
          error
            ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
            : 'border-slate-200 hover:border-slate-300 focus:border-teal-600 focus:ring-teal-100'
        }`}
      />
    </div>
    {error && (
      <p className="text-xs font-medium text-rose-600 flex items-center gap-1 mt-1">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        {error}
      </p>
    )}
  </div>
);
```

#### Filter Dropdown / Select
```jsx
export const FilterSelect = ({ label, options, value, onChange }) => (
  <div className="inline-flex items-center space-x-2">
    {label && <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}:</span>}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-lg px-3 py-1.5 shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all cursor-pointer"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);
```

---

### 5.2 Data Tables with Sticky Headers

Desktop administration requires tables capable of displaying 50+ rows smoothly with sticky headers, subtle row hover states, and fixed cell alignments.

```jsx
export const AdminDataTable = ({ columns, data, keyField = '_id' }) => {
  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Scrollable Container with Sticky Header */}
      <div className="overflow-x-auto max-h-[600px] relative">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm border-separate border-spacing-0">
          {/* Sticky Table Header */}
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs shadow-[0_1px_0_0_#E2E8F0]">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className={`py-3.5 px-4 text-xs font-semibold tracking-wider uppercase text-slate-500 ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 bg-white">
            {data.map((row, rowIdx) => (
              <tr
                key={row[keyField] || rowIdx}
                className="hover:bg-slate-50/80 transition-colors duration-100 group"
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    className={`py-3.5 px-4 whitespace-nowrap text-slate-700 text-sm ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    }`}
                  >
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer / Row Summary */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>Showing {data.length} records</span>
        <span className="text-slate-400">SocietyPro Tenant Isolated Query</span>
      </div>
    </div>
  );
};
```

---

### 5.3 Semantic Status Badges & Pill Indicators

Badges must convey status instantly without requiring users to parse text. Each status uses a subtle background, matching border, and high-contrast text:

```jsx
export const StatusBadge = ({ status }) => {
  const configs = {
    // Approved / Active / Paid / Resolved
    active: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
      label: 'Active'
    },
    approved: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
      label: 'Approved'
    },
    paid: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
      label: 'Paid'
    },
    resolved: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
      label: 'Resolved'
    },

    // Pending / Under Review / Unpaid / Open
    pending: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
      label: 'Pending'
    },
    in_progress: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
      label: 'In Progress'
    },

    // Rejected / Danger / Voided / Critical
    rejected: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-700',
      dot: 'bg-rose-500',
      label: 'Rejected'
    },
    voided: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-700',
      dot: 'bg-rose-500',
      label: 'Voided'
    },

    // Info / Broadcast / Audit
    info: {
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      text: 'text-sky-700',
      dot: 'bg-sky-500',
      label: 'Notice'
    }
  };

  const key = String(status || '').toLowerCase().replace(/[\s-]/g, '_');
  const config = configs[key] || {
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
    label: status || 'Unknown'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${config.bg} ${config.border} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};
```

---

### 5.4 Statistic Summary Cards (KPIs: Revenue, Outflow, Reserve)

Financial KPI cards must render monetary numbers with high visual weight, context metrics, and distinct semantic accents:

```jsx
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';

export const FinancialSummaryCards = ({ revenuePaise, outflowPaise, reservePaise }) => {
  const formatINR = (paise) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format((paise || 0) / 100);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* 1. Total Revenue / Collections */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            Total Revenue
          </span>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <h2 className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
            {formatINR(revenuePaise)}
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-600 font-semibold inline-flex items-center">
              <ArrowUpRight className="w-3.5 h-3.5" /> Maintenance Dues
            </span>
            <span>• Verified Razorpay & UPI</span>
          </p>
        </div>
      </div>

      {/* 2. Total Outflow / Expenses */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
            Total Outflow
          </span>
          <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <h2 className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
            {formatINR(outflowPaise)}
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-rose-600 font-semibold inline-flex items-center">
              <ArrowDownRight className="w-3.5 h-3.5" /> Vendor Disbursements
            </span>
            <span>• Security, Cleaning, Lifts</span>
          </p>
        </div>
      </div>

      {/* 3. Net Reserve / Treasury Balance */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
            Net Reserve
          </span>
          <div className="p-2 bg-teal-50 text-teal-700 rounded-lg">
            <PiggyBank className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4">
          <h2 className="text-3xl font-extrabold text-slate-900 font-mono tabular-nums">
            {formatINR(reservePaise)}
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-teal-700 font-semibold inline-flex items-center">
              <Wallet className="w-3.5 h-3.5" /> Society Bank Balance
            </span>
            <span>• Audit Reconciled</span>
          </p>
        </div>
      </div>
    </div>
  );
};
```

---

### 5.5 Action Buttons & State Triggers

Administrative action buttons must provide crisp tactile feedback, prevent double-clicks with spinner states, and clearly communicate consequence:

```jsx
import { Check, X, ThumbsUp, RotateCcw, Loader2 } from 'lucide-react';

/* 1. Approve Action Button (Emerald) */
export const ApproveButton = ({ onClick, loading, label = "Approve" }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-xs px-3 py-1.5 rounded-lg shadow-xs transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:opacity-50 cursor-pointer"
  >
    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
    <span>{label}</span>
  </button>
);

/* 2. Reject Action Button (Rose Subtle) */
export const RejectButton = ({ onClick, loading, label = "Reject" }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="inline-flex items-center gap-1.5 bg-white border border-rose-300 hover:bg-rose-50 active:bg-rose-100 text-rose-700 font-medium text-xs px-3 py-1.5 rounded-lg shadow-xs transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-1 disabled:opacity-50 cursor-pointer"
  >
    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
    <span>{label}</span>
  </button>
);

/* 3. Upvote Action Button (Interactive Counter for Complaints) */
export const UpvoteButton = ({ count, active, onToggle, loading }) => (
  <button
    onClick={onToggle}
    disabled={loading}
    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all duration-150 cursor-pointer ${
      active
        ? 'bg-teal-50 border-teal-300 text-teal-800 shadow-xs'
        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
    }`}
    title={active ? "Remove your upvote" : "Upvote this grievance"}
  >
    <ThumbsUp className={`w-3.5 h-3.5 ${active ? 'fill-teal-700 text-teal-700' : 'text-slate-400'}`} />
    <span className="font-mono tabular-nums">{count}</span>
  </button>
);

/* 4. Reopen Grievance Button (Amber Subtle) */
export const ReopenButton = ({ onClick, loading, label = "Reopen" }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="inline-flex items-center gap-1.5 bg-white border border-amber-300 hover:bg-amber-50 active:bg-amber-100 text-amber-800 font-medium text-xs px-3 py-1.5 rounded-lg shadow-xs transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 disabled:opacity-50 cursor-pointer"
  >
    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
    <span>{label}</span>
  </button>
);
```

---

## 6. Accessibility, States & Empty/Loading Handling

### 6.1 Table Skeleton Loaders
Administrative portals must never cause jarring layout jumps. Skeletons replicate the exact row height (48px) and column counts:

```jsx
export const TableSkeleton = ({ rows = 5, columns = 5 }) => (
  <div className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs animate-pulse">
    {/* Header Skeleton */}
    <div className="h-11 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-4">
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="h-3.5 bg-slate-200 rounded w-1/4" />
      ))}
    </div>
    {/* Rows Skeleton */}
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="h-14 px-4 flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
          <div className="h-3.5 bg-slate-200 rounded w-1/3" />
          <div className="h-3 bg-slate-100 rounded w-1/4" />
          <div className="h-4 bg-slate-200 rounded-full w-20 ml-auto" />
        </div>
      ))}
    </div>
  </div>
);
```

---

### 6.2 Zero-Data / Empty States
Empty states should never feel like an application error; they should clearly explain why no data is present and guide the administrator's next step:

```jsx
import { Inbox, PlusCircle, Search } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = "No Records Found",
  description = "There are currently no items to display in this view.",
  actionLabel,
  onAction,
  isFiltered = false
}) => (
  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
      {isFiltered ? <Search className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
    </div>
    <h3 className="text-base font-bold text-slate-900">{title}</h3>
    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
      {description}
    </p>
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="mt-5 inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-xs transition-colors cursor-pointer"
      >
        <PlusCircle className="w-4 h-4" />
        {actionLabel}
      </button>
    )}
  </div>
);
```

---

### 6.3 Accessibility & Focus Rings (WCAG 2.1 AA)
1. **Focus Ring Standard**: Interactive buttons and inputs must use visible two-step focus outlines:
   `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2`
2. **Text Contrast Ratios**:
   - Primary text (`text-slate-900`) against white surface: `16.0:1` (Exceeds AAA).
   - Secondary text (`text-slate-600`) against white surface: `5.7:1` (Exceeds AA 4.5:1).
   - Semantic badge text (`text-emerald-700`, `text-amber-700`, `text-rose-700`) against tinted backgrounds: all exceed `4.8:1`.
3. **Screen Readers & Keyboard Navigation**:
   - Action icon buttons must provide `aria-label` (e.g., `aria-label="Approve Resident A-402"`).
   - Modals and drawers must trap focus and close on `Escape`.

---

## 7. Motion & Transition Conventions

SocietyPro applies conservative micro-animations to enhance responsiveness without delaying data entry:

| Effect | Duration | Easing | Tailwind Class | Application |
| :--- | :--- | :--- | :--- | :--- |
| **Hover Transitions** | 150ms | `ease-out` | `transition-colors duration-150` | Button hovers, sidebar links, table row highlights |
| **Card Elevate** | 200ms | `ease-out` | `transition-shadow duration-200` | KPI card hover shadow elevation |
| **Modal / Drawer** | 200ms | `cubic-bezier(0.16, 1, 0.3, 1)` | `animate-in fade-in duration-200` | Confirmation dialogs, mobile sidebar drawers |
| **Continuous Spin** | 1000ms | `linear` | `animate-spin` | Razorpay order creation & payment verification loaders |
| **Pulse Warning** | 2000ms | `ease-in-out` | `animate-pulse` | Overdue bill dot indicator, table skeleton placeholders |

---

## 8. Summary Checklist for Frontend Contributors

When building or updating SocietyPro portal views:
- [ ] Are all monetary values stored in Paise and displayed formatted as `₹XX,XX,XXX` with `font-mono tabular-nums`?
- [ ] Do data tables feature a sticky header (`sticky top-0 bg-slate-50/95`)?
- [ ] Are status badges composed of a 3-part system (tinted background, matching border, dark foreground text)?
- [ ] Do all interactive action triggers include explicit loading and disabled states?
- [ ] Are zero-data and network loading states handled with Skeletons or contextual Empty States instead of blank screens?
- [ ] Does the page layout adhere to the responsive desktop shell (`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8`)?
