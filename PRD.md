# SocietyPro — Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** September 2026  
**Status:** Active Development  
**Stack:** MERN (MongoDB · Express.js · React 19 · Node.js)  
**Migration Origin:** Flutter + Firebase → MERN SaaS  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Target Audience](#3-target-audience)
4. [User Personas & Permission Model](#4-user-personas--permission-model)
5. [System Architecture Overview](#5-system-architecture-overview)
6. [Functional Modules & Requirements](#6-functional-modules--requirements)
7. [API Surface Reference](#7-api-surface-reference)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Data Models](#9-data-models)
10. [Frontend Pages & Navigation](#10-frontend-pages--navigation)
11. [Planned Enhancements & Roadmap](#11-planned-enhancements--roadmap)
12. [Glossary](#12-glossary)

---

## 1. Executive Summary

SocietyPro is a **multi-tenant, role-gated housing society management SaaS** that digitalises the complete operational lifecycle of residential societies — from owner onboarding and committee delegation, to automated maintenance billing, grievance resolution, and community communication.

The product migrated from a Flutter + Firebase prototype to a **production-grade MERN stack** in order to gain:

| Goal | Rationale |
|---|---|
| True multi-tenancy | Each society is a hard-isolated tenant via `societyId` embedded in every JWT and enforced at every API boundary |
| Server-side permission enforcement | Fine-grained, DB-persisted permission arrays replace Firebase security rules |
| Razorpay payment rails | INR-native checkout with HMAC-SHA256 webhook verification, amounts stored in Paise |
| Scalable data layer | MongoDB Atlas replaces Firestore; Mongoose schemas enforce structural contracts |
| React 19 SPA | Vite-powered frontend with React Router v7, Tailwind CSS v4, and Axios |

SocietyPro is **not** a property listing or real-estate marketplace. It is an **operations platform** exclusively for the managing committee and registered residents of a single housing complex (the "tenant").

---

## 2. Problem Statement

Traditional housing society management in India is fragmented across WhatsApp groups, paper registers, spreadsheets, and in-person meetings. The core pain points are:

### 2.1 Financial Chaos

- Maintenance dues tracked manually in Excel; no audit trail.
- Late fees calculated inconsistently or not enforced at all.
- Per-flat billing exceptions (commercial units, larger flats) require error-prone manual overrides.
- Cash payments undocumented; no receipts generated.

### 2.2 Communication Breakdown

- Notices circulated via WhatsApp; messages get buried in chat history.
- Residents miss urgent announcements (emergency shutdowns, AGM schedules).
- No priority or pinning mechanism.

### 2.3 Grievance Black Holes

- Complaints raised verbally or over chat have no status tracking.
- Committee cannot distinguish between isolated incidents and widespread issues affecting multiple flats.
- Resolved complaints are never confirmed by the resident who raised them, leading to re-escalations.

### 2.4 Committee Accountability Gap

- Ad-hoc role assignments (Secretary, Treasurer) have no system-enforced scope.
- A committee member with access to billing may inadvertently delete resident records.
- Ownership changes are manual and opaque.

### 2.5 Resident On-Boarding Friction

- New residents require in-person registration; no self-service mechanism.
- No gatekeeper approval step; anyone who obtains the society code can claim residency.

---

## 3. Target Audience

| Persona | Profile |
|---|---|
| **Society Owner** | The primary account holder who registers the society on SocietyPro. Typically the elected Secretary or designated Admin of the RWA/co-operative. Tech-comfort: medium to high. |
| **Managing Committee** | Elected or appointed members (Secretary, Treasurer, Joint Secretary, etc.). Operate within delegated permissions. Tech-comfort: low to medium. |
| **Flat Resident** | Occupants (owner-residents or tenants) who self-register using a society code. Primary interactions: viewing bills, making payments, raising and tracking complaints, reading notices. Tech-comfort: variable; must support mobile-first usage. |

---

## 4. User Personas & Permission Model

### 4.1 Role Hierarchy

```
SocietyOwner  (implicit: all permissions within their society)
    └── Committee  (explicit: discrete permission strings assigned by SocietyOwner)
            └── Resident  (self-service only; no admin permissions)
```

All three roles are stored in the `User` collection with a `role` discriminator field. Multi-tenancy is enforced by `societyId`, which is always sourced from the JWT — never from the request body.

---

### 4.2 SocietyOwner

**Identity:** The user record created atomically alongside the `Society` document at registration. The society's `ownerId` references this user's `_id`.

**Capabilities (implicit, no permission array needed):**

| Capability | Description |
|---|---|
| Society CRUD | Create (via registration), read, update name/address/city/registrationNumber, and delete the society |
| Default Rate Management | Define society-wide maintenance rate line items (name, amount in INR, GST flag) |
| Late Fee Configuration | Set `ratePercentPerYear`, `gracePeriodDays`, and `dueDateDay` for automated late-fee calculation |
| Committee Provisioning | Create committee member accounts with a `customLabel` (e.g., "Secretary") and assign a subset of system permissions |
| Permission Management | Update or revoke any committee member's permissions and label at any time |
| Committee Removal | Delete a committee member's account from the society |
| Resident Oversight | View all users in the society, update resident details, remove residents |
| Custom Resident Rates | Override the society default rate with a per-resident rate schedule |
| Bill Generation | Create maintenance invoices for any resident |
| Full Payment History | View all payment records across all flats |

**Constraints:**
- A SocietyOwner can only manage their **own** society. Cross-society access returns HTTP 403.
- The `ownerId` on `Society` is set at creation time and cannot be changed via the current API (planned: ownership transfer).

---

### 4.3 Committee

**Identity:** A `User` record with `role: 'Committee'`, created by a SocietyOwner. Shares the same `societyId`.

**`customLabel`:** A human-readable title persisted on the User document (e.g., `"Treasurer"`, `"Joint Secretary"`). Displayed in the UI; has no system-level effect on permissions.

**Permission Strings (granular, explicit):**

| Permission Key | Grants Access To |
|---|---|
| `manageResidents` | `GET /api/users/` (all residents), `GET /api/users/:id`, `PATCH /api/users/:id`, `DELETE /api/users/:id`, `PATCH /api/users/:id/rate` |
| `manageBills` | `POST /api/payments/generate-bill`, `GET /api/payments/` (society-wide view) |
| `manageNotices` | Post, edit, pin, and delete notices on the community notice board *(module planned)* |
| `resolveComplaints` | Update grievance status, post resolution notes *(module planned)* |
| `manageSociety` | `GET /api/society/:id`, `PATCH /api/society/:id` — society profile read/update |

**Permission Enforcement Chain:**

```
Request → tenantMiddleware (JWT decode + societyId bind)
        → requirePermission('manageResidents')
              SocietyOwner?  → next()  (implicit bypass)
              Committee?     → check req.user.permissions.includes('manageResidents')
              Resident?      → HTTP 403
```

- Permissions are stored as a `String[]` on the `User` document and **re-embedded into the JWT** at login. Permission changes take effect at the next login. (Planned: short-lived tokens for immediate revocation.)
- An empty `permissions` array (`[]`) makes a Committee member effectively read-only on all admin resources.

---

### 4.4 Resident

**Identity:** A `User` record with `role: 'Resident'`, self-registered via `POST /api/auth/register-resident` using a valid `societyCode`.

**Capabilities:**

| Capability | Description |
|---|---|
| Self-registration | Enter society code, unit number, name, email, password |
| Bill viewing | `GET /api/payments/` returns only their own payment records |
| Payment initiation | `POST /api/payments/create-order` — Razorpay order creation for their own dues |
| Payment verification | `POST /api/payments/verify` — HMAC signature validation after checkout |
| Rate inspection | `GET /api/users/:id/rate` — view their own effective maintenance rate (custom or default) |
| Notice viewing | Read community notices; bookmark personally relevant ones *(module planned)* |
| Grievance filing | Submit complaints; track status; confirm resolution or reopen *(module planned)* |
| "Facing Same Issue" | Upvote an existing complaint from their flat to signal shared impact *(module planned)* |

**Constraints:**
- Residents **cannot** access other residents' data. All queries are scoped to `residentId: req.user.id`.
- A resident's `unitNumber` is captured at registration but can be updated by SocietyOwner/Committee with `manageResidents`.
- No gatekeeper approval step is implemented yet (see §11 Roadmap). Currently, any resident with a valid `societyCode` is activated immediately.

---

## 5. System Architecture Overview

```
┌──────────────────────────────────────────────────┐
│                  React 19 SPA                    │
│  Vite · React Router v7 · Tailwind CSS v4        │
│  Axios · lucide-react · AuthContext              │
└───────────────────┬──────────────────────────────┘
                    │ HTTPS / JSON REST
┌───────────────────▼──────────────────────────────┐
│              Express.js v5 API Server            │
│  ┌──────────────────────────────────────────┐    │
│  │  Middleware Stack                        │    │
│  │  cors → express.json → tenantMiddleware  │    │
│  │  → requireRole / requirePermission       │    │
│  └──────────────────────────────────────────┘    │
│  Routes: /api/auth  /api/society  /api/users     │
│          /api/payments  /api/committee           │
└───────────────────┬──────────────────────────────┘
                    │ Mongoose ODM
┌───────────────────▼──────────────────────────────┐
│              MongoDB Atlas                       │
│  Collections: users · societies · payments       │
└──────────────────────────────────────────────────┘
                    │
          ┌─────────▼─────────┐
          │  Razorpay API     │
          │  (order creation  │
          │   + HMAC verify)  │
          └───────────────────┘
```

**Key architectural decisions:**

1. **JWT as the authority record.** The token carries `id`, `role`, `societyId`, and `permissions`. The backend never trusts client-supplied societyId — it always reads from `req.user.societyId` (JWT).
2. **Paise as base monetary unit.** All `amount` fields in the `Payment` model are stored in Paise (integer). Conversion from INR to Paise happens in the controller (`Math.round(amount * 100)`), never on the frontend.
3. **Tenant isolation at query level.** Every DB query filters by `societyId: req.user.societyId`. Cross-tenant reads are blocked by explicit `403` checks even when IDs are known.
4. **No server-side sessions.** Auth is stateless JWT with a 7-day expiry. Token refresh and logout are planned (§11).

---

## 6. Functional Modules & Requirements

---

### 6.1 Auth & Tenant Onboarding

#### 6.1.1 Society Owner Registration (`POST /api/auth/register-owner`)

**Flow:**

1. Client submits: `name`, `email`, `password`, `societyName`, `address`, `city`, `registrationNumber` (optional).
2. Server checks email uniqueness globally across all tenants.
3. Password hashed with **bcryptjs** (salt rounds: 10).
4. A unique `societyCode` is generated — format: `[A-Z]{3}[0-9]{4}` (e.g., `KXP7391`). Uniqueness is guaranteed by a retry loop querying `Society.findOne({ societyCode })`.
5. `Society` document created first; a pre-allocated `ObjectId` is used as `ownerId` so both documents can be created in a consistent state.
6. `User` document created with `role: 'SocietyOwner'` and `societyId` referencing the new society.
7. JWT signed (7-day expiry) and returned alongside user and society summaries including the `societyCode`.

**Validation rules:**
- `name`, `email`, `password`, `societyName`, `address`, `city` are all required.
- Email must be unique (case-insensitive via Mongoose `lowercase: true`).
- `registrationNumber` is optional.

---

#### 6.1.2 Resident Self-Registration (`POST /api/auth/register-resident`)

**Flow:**

1. Client submits: `name`, `email`, `password`, `societyCode`, `unitNumber` (optional).
2. Server validates `societyCode` against the `Society` collection — returns 400 if no match.
3. Password hashed; `User` created with `role: 'Resident'` and `societyId` from the matched society.
4. JWT returned immediately (no pending/approval state — see §11 for planned gatekeeper lifecycle).

**Gatekeeper Lifecycle (Planned):**

```
Resident submits registration
    → status: 'pending'
    → Committee/Owner notified
    → Approves: status: 'active', JWT issued
    → Rejects: account removed
```

---

#### 6.1.3 Login (`POST /api/auth/login`)

- Accepts `email` and `password`.
- Compares password against `passwordHash` using `bcrypt.compare`.
- On success: JWT signed carrying `{ id, role, societyId, permissions }`.
- On failure: generic "Invalid email or password" (no enumeration leakage).

---

### 6.2 Society Management

Base path: `/api/society`  
Middleware: `tenantMiddleware` (all routes) + role/permission guards.

#### Functional Requirements

| Requirement | Route | Access |
|---|---|---|
| View society profile | `GET /api/society/:id` | SocietyOwner, Committee (`manageSociety`) |
| Update society details | `PATCH /api/society/:id` | SocietyOwner, Committee (`manageSociety`) |
| Delete society | `DELETE /api/society/:id` | SocietyOwner only |
| Get default rate schedule | `GET /api/society/rates/default` | Any authenticated user in society |
| Update default rate schedule | `PATCH /api/society/rates/default` | SocietyOwner only |
| Get late fee settings | `GET /api/society/late-fee-settings` | Any authenticated user in society |
| Update late fee settings | `PATCH /api/society/late-fee-settings` | SocietyOwner only |

#### Default Rate Schedule

- Stored as an embedded array `defaultRateItems[]` on the `Society` document.
- Each item: `{ name: String, amount: Number (INR), gstApplicable: Boolean }`.
- Validation: every item must have a non-empty `name` and a positive numeric `amount`.
- This schedule is the **fallback** for residents who do not have a custom rate override.

#### Late Fee Settings

Stored as `lateFeeSettings` embedded on `Society`:

| Field | Type | Default | Meaning |
|---|---|---|---|
| `ratePercentPerYear` | Number | `21` | Annual interest rate for late fee calculation |
| `gracePeriodDays` | Number (int) | `5` | Days after due date before late fee accrues |
| `dueDateDay` | Number (int, 1-28) | `10` | Day-of-month the maintenance bill is due |

Validation enforced server-side:
- `ratePercentPerYear`: number in `(0, 100]`.
- `gracePeriodDays`: non-negative integer.
- `dueDateDay`: integer in `[1, 28]` (28 ensures validity across all months).

---

### 6.3 Committee Provisioning

Base path: `/api/committee`  
Access: **SocietyOwner only** (all routes).

#### Functional Requirements

| Requirement | Route | Notes |
|---|---|---|
| Create committee member | `POST /api/committee` | Requires `name`, `email`, `password`, `customLabel`; optional `permissions[]` |
| List all committee members | `GET /api/committee` | Returns all `role: 'Committee'` users in society; `passwordHash` excluded |
| Update member label/permissions | `PATCH /api/committee/:id` | Partial update — only fields provided are changed |
| Remove committee member | `DELETE /api/committee/:id` | Hard delete from `User` collection |

#### Business Rules

- All committee members belong to the same `societyId` as the creating owner. The server sets `societyId` from `req.user.societyId` — the client cannot override it.
- Cross-tenant protection: `PATCH` and `DELETE` verify `user.societyId === req.user.societyId` before proceeding.
- The `customLabel` field is free-text (e.g., `"Secretary"`, `"Treasurer"`, `"Joint Secretary"`). It does not map to a fixed enum — label semantics are organisation-defined.
- Permissions array is a subset of: `['manageResidents', 'manageBills', 'manageNotices', 'resolveComplaints', 'manageSociety']`.

---

### 6.4 Resident Management & Custom Rates

Base path: `/api/users`  
Middleware: `tenantMiddleware` + `requirePermission('manageResidents')`.

#### Functional Requirements

| Requirement | Route | Access |
|---|---|---|
| List all society users | `GET /api/users/` | SocietyOwner, Committee (`manageResidents`) |
| Get single user | `GET /api/users/:id` | SocietyOwner, Committee (`manageResidents`) |
| Update user (name, unitNumber) | `PATCH /api/users/:id` | SocietyOwner, Committee (`manageResidents`) |
| Remove user | `DELETE /api/users/:id` | SocietyOwner, Committee (`manageResidents`) |
| Set resident custom rate | `PATCH /api/users/:id/rate` | SocietyOwner, Committee (`manageResidents`) |
| Get resident effective rate | `GET /api/users/:id/rate` | SocietyOwner, Committee (`manageResidents`), or the Resident themselves |

#### Custom Rate Override Logic

Each `User` document stores:
- `customRateItems[]`: array of `{ name, amount, gstApplicable }` — identical schema to `Society.defaultRateItems`.
- `usingCustomRate: Boolean` — flag toggled automatically.

**Effective rate resolution (server-side):**

```
if resident.usingCustomRate:
    return { source: 'custom', rateItems: resident.customRateItems }
else:
    return { source: 'default', rateItems: society.defaultRateItems }
```

**Reset to default:** Send `PATCH /api/users/:id/rate` with `rateItems: []`. The server sets `usingCustomRate = false` and clears `customRateItems`.

**Tenant isolation:** The endpoint verifies `resident.societyId === req.user.societyId`. A resident from Society B cannot access Society A data even if they know the ObjectId.

---

### 6.5 Financial Ledger & Invoicing

Base path: `/api/payments`

SocietyPro uses Razorpay as its payment gateway. All monetary amounts are stored internally in **Paise** (1 INR = 100 Paise).

#### 6.5.1 Admin Bill Generation (`POST /api/payments/generate-bill`)

**Access:** SocietyOwner or Committee with `manageBills`.

**Flow:**

1. Admin provides: `residentId`, `amount` (INR), `unitNumber`, `month` (e.g., `"September 2026"`), `dueDate` (ISO date).
2. Server validates: all fields required; `amount > 0`; `resident.societyId === req.user.societyId`.
3. `amount` converted to Paise: `Math.round(amount * 100)`.
4. `Payment` document created with `status: 'created'`.
5. No Razorpay order is created at this stage — this is a pure ledger entry. Payment is initiated separately by the resident.

**Use cases:** Monthly maintenance bills, one-time levies (special assessments, event fees).

---

#### 6.5.2 Resident Payment Initiation (`POST /api/payments/create-order`)

**Access:** Residents only.

**Flow:**

1. Resident provides `amount` (INR).
2. Server converts to Paise, creates a Razorpay `order` via the SDK.
3. A `Payment` document is created with `razorpayOrderId` and `status: 'created'`.
4. Response returns: `orderId`, `amount` (Paise), `currency: 'INR'`, `key` (Razorpay public key ID), `paymentRecordId`.
5. Frontend uses returned data to open Razorpay Checkout JS widget.

---

#### 6.5.3 Payment Verification (`POST /api/payments/verify`)

**Access:** Residents only.

**Flow:**

1. After Razorpay checkout completes, frontend posts: `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`.
2. Server recomputes HMAC-SHA256 of `"${order_id}|${payment_id}"` using `RAZORPAY_KEY_SECRET`.
3. **Signature match** → `Payment.status` updated to `'captured'`; `razorpayPaymentId` stored.
4. **Signature mismatch** → `Payment.status` updated to `'failed'`; HTTP 400 returned.

---

#### 6.5.4 Payment History (`GET /api/payments/`)

**Role-scoped filtering (enforced in controller):**

| Role | Filter Applied |
|---|---|
| `Resident` | `residentId: req.user.id` (own records only) |
| `SocietyOwner` | `societyId: req.user.societyId` (all records in society) |
| `Committee` with `manageBills` | `societyId: req.user.societyId` (all records in society) |
| `Committee` without `manageBills` | HTTP 403 |

Optional query filter: `?status=created|authorized|captured|failed`.

---

#### 6.5.5 Payment Status Lifecycle

```
created ────────────────────────────────────────────► failed
   │                                                     ▲
   │  (Razorpay order created; awaiting checkout)        │
   ▼                                                     │
authorized ───────────────────────────────────────► captured
                    (HMAC verified)
```

| Status | Meaning |
|---|---|
| `created` | Bill generated or Razorpay order created; no payment attempt yet |
| `authorized` | Payment authorised by bank but not yet captured (Razorpay-managed) |
| `captured` | Payment fully settled; HMAC verified |
| `failed` | Signature mismatch or Razorpay failure |

---

### 6.6 Late Fee Engine

Utility: `backend/utils/calculateLateFee.js`

**Formula:**

```
chargeableDays = daysOverdue - gracePeriodDays
if chargeableDays <= 0: lateFee = 0
else: lateFee = (principal × ratePercentPerYear) / 365 / 100 × chargeableDays
```

**Parameters sourced from `Society.lateFeeSettings`:**

| Parameter | Default |
|---|---|
| `ratePercentPerYear` | 21% |
| `gracePeriodDays` | 5 days |
| `dueDateDay` | 10th of month |

**Planned integration:** The late fee calculator is currently a standalone utility. It will be integrated into the bill generation and payment listing flows to display accrued late fees on outstanding invoices.

---

### 6.7 Grievance Redressal Engine

> **Status: Planned Module** — No backend model or controller exists yet. This section defines the full target specification.

#### 6.7.1 Data Model (Planned: `Complaint` Collection)

```
Complaint {
  societyId:        ObjectId (ref: Society)   [tenant key]
  raisedBy:         ObjectId (ref: User)      [Resident]
  unitNumber:       String                    [denormalized for display]
  title:            String                    [required]
  description:      String                    [required]
  category:         Enum ['maintenance', 'security', 'sanitation', 'noise', 'other']
  status:           Enum ['open', 'in_progress', 'resolved', 'closed', 'reopened']
  priority:         Enum ['low', 'medium', 'high', 'critical']
  facingSameIssue:  [ObjectId]                [array of Resident _ids who upvoted]
  facingFlats:      [String]                  [unit numbers of upvoting residents]
  resolutionNote:   String                    [written by Committee/Owner]
  resolvedAt:       Date
  residentVerdict:  Enum ['confirmed', 'reopened', null]
  verdictAt:        Date
  createdAt:        Date
  updatedAt:        Date
}
```

#### 6.7.2 Status Lifecycle

```
open
 │
 ├─► in_progress  (Committee/Owner picks up the complaint)
 │       │
 │       └─► resolved  (Committee/Owner marks resolved + resolutionNote)
 │                │
 │                ├─► closed    (Resident confirms → residentVerdict: 'confirmed')
 │                └─► reopened  (Resident disputes → residentVerdict: 'reopened')
 │
 └─► closed  (Admin closes without resolution note — low priority)
```

#### 6.7.3 Functional Requirements

| Requirement | Access |
|---|---|
| File a new complaint | Resident (own society) |
| View all complaints in society | SocietyOwner, Committee (`resolveComplaints`) |
| View own complaints | Resident |
| Update complaint status / add resolution note | Committee (`resolveComplaints`), SocietyOwner |
| "Facing Same Issue" upvote | Any Resident in the same society (once per flat per complaint) |
| Confirm resolution | The original `raisedBy` Resident only |
| Reopen complaint | The original `raisedBy` Resident only (within 7 days of resolution) |
| View upvote count and affected flats | SocietyOwner, Committee (`resolveComplaints`) |

#### 6.7.4 Business Rules

- A resident may upvote any complaint that is **not** their own, provided their `unitNumber` has not already upvoted the same complaint (`facingFlats` deduplication).
- The "Facing Same Issue" count surfaces complaints impacting multiple flats, helping the committee triage by impact.
- Only the **original complainant** may confirm resolution or reopen. This prevents committee self-certification of disputed resolutions.
- Reopen window: 7 days post-`resolvedAt`. After that, the complaint auto-closes.

---

### 6.8 Notice Board

> **Status: Planned Module** — No backend model or controller exists yet. This section defines the full target specification.

#### 6.8.1 Data Model (Planned: `Notice` Collection)

```
Notice {
  societyId:    ObjectId (ref: Society)   [tenant key]
  createdBy:    ObjectId (ref: User)      [Committee/Owner]
  title:        String (required)
  body:         String (required)
  category:     Enum ['general', 'urgent', 'maintenance', 'event', 'financial']
  isPinned:     Boolean (default: false)  [admin-controlled]
  pinnedAt:     Date
  expiresAt:    Date (optional)           [notice auto-hides after this date]
  attachments:  [String]                  [file URLs, planned]
  bookmarkedBy: [ObjectId]                [Resident _ids who bookmarked]
  createdAt:    Date
  updatedAt:    Date
}
```

#### 6.8.2 Functional Requirements

| Requirement | Access |
|---|---|
| Post a notice | SocietyOwner, Committee (`manageNotices`) |
| Edit a notice | Notice creator or SocietyOwner |
| Delete a notice | SocietyOwner, Committee (`manageNotices`) |
| Pin / unpin a notice | SocietyOwner, Committee (`manageNotices`) |
| View all notices (sorted: pinned first, then chronological) | All authenticated users in society |
| Bookmark a notice (personal) | Resident |
| View bookmarked notices | Resident (own bookmarks only) |

#### 6.8.3 Business Rules

- **Pinned notices** always appear at the top of the notice board, sorted by `pinnedAt DESC`.
- Unpinned notices are sorted by `createdAt DESC`.
- `expiresAt` is optional; expired notices are hidden from the default listing but accessible via an `?includeExpired=true` admin query.
- **Bookmarks** are personal — stored as `bookmarkedBy[]` on the `Notice` document. A resident cannot see other residents' bookmarks.
- Residents **cannot** create or edit notices — they are read-only consumers.

---

## 7. API Surface Reference

### Authentication Routes — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/register-owner` | None | Register society + owner atomically |
| `POST` | `/register-resident` | None | Self-register as resident via societyCode |
| `POST` | `/login` | None | Authenticate; receive JWT |

### Society Routes — `/api/society`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/rates/default` | JWT | Get society default rate items |
| `PATCH` | `/rates/default` | SocietyOwner | Update society default rate items |
| `GET` | `/late-fee-settings` | JWT | Get late fee configuration |
| `PATCH` | `/late-fee-settings` | SocietyOwner | Update late fee configuration |
| `GET` | `/:id` | SocietyOwner, Committee (`manageSociety`) | Get society profile |
| `PATCH` | `/:id` | SocietyOwner, Committee (`manageSociety`) | Update society profile |
| `DELETE` | `/:id` | SocietyOwner | Delete society |

### Committee Routes — `/api/committee`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/` | SocietyOwner | Create committee member |
| `GET` | `/` | SocietyOwner | List all committee members |
| `PATCH` | `/:id` | SocietyOwner | Update label and/or permissions |
| `DELETE` | `/:id` | SocietyOwner | Remove committee member |

### User Routes — `/api/users`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | `manageResidents` | List all society users |
| `GET` | `/:id` | `manageResidents` | Get user by ID |
| `PATCH` | `/:id` | `manageResidents` | Update user name/unitNumber |
| `DELETE` | `/:id` | `manageResidents` | Remove user |
| `PATCH` | `/:id/rate` | `manageResidents` | Set or reset custom rate for resident |
| `GET` | `/:id/rate` | `manageResidents` or self | Get resident's effective rate |

### Payment Routes — `/api/payments`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/create-order` | Resident | Create Razorpay order |
| `POST` | `/verify` | Resident | Verify payment HMAC signature |
| `POST` | `/generate-bill` | SocietyOwner, `manageBills` | Generate maintenance bill |
| `GET` | `/` | All roles (scoped) | Get payment history |

---

## 8. Non-Functional Requirements

### 8.1 Multi-Tenant Data Isolation

- Every MongoDB query includes `societyId: req.user.societyId`. The `societyId` is **always** extracted from the verified JWT, never from query parameters or request body.
- Cross-society access is explicitly checked at the controller level with additional `societyId` comparison guards (`String(user.societyId) !== String(req.user.societyId)` → 403).
- Collections (`users`, `societies`, `payments`) are not sharded by tenant. Isolation is logical (query-based), not physical. At scale, Atlas Data Partitioning or collection-per-tenant may be required.

### 8.2 Security

| Requirement | Implementation |
|---|---|
| Password hashing | `bcryptjs` with `genSalt(10)` |
| Token security | `jsonwebtoken` with `JWT_SECRET` env var, 7-day expiry |
| Payment signature | HMAC-SHA256 over `orderId|paymentId` using `RAZORPAY_KEY_SECRET` |
| No password leakage | All user queries use `.select('-passwordHash')` |
| CORS | `cors()` middleware (should be locked to frontend origin in production) |
| Env secrets | `dotenv` — `MONGO_URI`, `JWT_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` stored in `.env`, gitignored |

### 8.3 Currency & Financial Integrity

- **All amounts in the `Payment` model are stored in Paise** (smallest INR unit, integer). This prevents floating-point errors in financial calculations.
- Conversion: INR input → Paise via `Math.round(amount * 100)` in controllers.
- The `currency` field on `Payment` is always `'INR'`.
- GST amounts (when `gstApplicable: true`) are not automatically computed yet — a display concern for the planned invoice PDF module.

### 8.4 API Reliability & Validation

- All required fields validated at the controller level before any DB operations.
- Mongoose schema types enforce structural integrity (`enum` constraints on `status`, `role`).
- HTTP status codes follow REST conventions: 200 (success), 201 (created), 400 (client error), 401 (unauthenticated), 403 (forbidden), 404 (not found), 500 (server error).

### 8.5 Scalability

- MongoDB Atlas with Mongoose — horizontal scaling via Atlas auto-scaling.
- Express.js v5 with async/await; no callback-style error handling.
- Node.js DNS resolver patched to IPv4-first (`dns.setDefaultResultOrder('ipv4first')`) for Atlas connectivity stability.
- Stateless API — no in-process state; horizontally scalable behind a load balancer.

### 8.6 Frontend Performance

- Vite 8 with React 19 — optimised dev server with HMR.
- Tailwind CSS v4 with `@tailwindcss/vite` plugin for JIT compilation.
- Axios for HTTP; `AuthContext` for global auth state with `localStorage` persistence.

### 8.7 Responsiveness

- The frontend must be functional on screens >= 375px width (mobile-first).
- Tailwind CSS breakpoints handle responsive layout.
- Committee and payment tables must be horizontally scrollable on mobile.

---

## 9. Data Models

### 9.1 `Society`

```js
{
  name:               String (required),
  address:            String (required),
  city:               String (required),
  registrationNumber: String (optional),
  societyCode:        String (required, unique) — format: [A-Z]{3}[0-9]{4},
  ownerId:            ObjectId → User (required),
  defaultRateItems:   [{ name: String, amount: Number (INR), gstApplicable: Boolean }],
  lateFeeSettings: {
    ratePercentPerYear: Number (default: 21),
    gracePeriodDays:    Number (default: 5),
    dueDateDay:         Number (default: 10),
  },
  createdAt: Date,
}
```

### 9.2 `User`

```js
{
  name:            String (required),
  email:           String (required, unique, lowercase),
  passwordHash:    String (required),
  role:            Enum ['SocietyOwner', 'Committee', 'Resident'] (required),
  societyId:       ObjectId → Society (required),
  customLabel:     String (Committee — e.g. "Secretary"),
  permissions:     [String] (Committee — e.g. ['manageBills', 'manageResidents']),
  unitNumber:      String (Resident — flat/unit identifier),
  customRateItems: [{ name: String, amount: Number, gstApplicable: Boolean }],
  usingCustomRate: Boolean (default: false),
  createdAt:       Date,
}
```

### 9.3 `Payment`

```js
{
  societyId:         ObjectId → Society (required),
  residentId:        ObjectId → User (required),
  amount:            Number (required) — STORED IN PAISE,
  currency:          String (default: 'INR'),
  razorpayOrderId:   String,
  razorpayPaymentId: String,
  status:            Enum ['created', 'authorized', 'captured', 'failed'] (default: 'created'),
  unitNumber:        String (required),
  month:             String (required — e.g. "September 2026"),
  dueDate:           Date (required),
  createdAt:         Date,
  updatedAt:         Date,
}
```

### 9.4 Planned: `Complaint`

See §6.7.1 for the full schema specification.

### 9.5 Planned: `Notice`

See §6.8.1 for the full schema specification.

---

## 10. Frontend Pages & Navigation

### Current Pages

| Route | Page Component | Access | Description |
|---|---|---|---|
| `/login` | `Login.jsx` | Public | Email + password login |
| `/register` | `Register.jsx` | Public | Owner registration OR resident self-registration (tab switcher) |
| `/` | `Dashboard.jsx` | All roles | Role-contextual summary: bills, society info, quick links |
| `/societies` | `SocietyManagement.jsx` | SocietyOwner, Committee | View/edit society profile, default rates, late fee settings |
| `/committee` | `CommitteeManagement.jsx` | SocietyOwner | Create/manage committee members and permissions |
| `/residents` | `ResidentManagement.jsx` | SocietyOwner* | View residents, set custom rates |
| `/payments` | `Payments.jsx` | All roles (scoped) | View bills, initiate payments (Resident); view all payments, generate bills (Admin) |

*Note: The `/residents` route is currently guarded by `allowedRoles={['SocietyAdmin']}` which is a non-existent role. This makes `ResidentManagement.jsx` inaccessible to all users. **Fix required:** change `'SocietyAdmin'` → `'SocietyOwner'` in `App.jsx` line 63.

### Shared Components

| Component | Purpose |
|---|---|
| `Layout.jsx` | Sidebar navigation, header, responsive shell |
| `ProtectedRoute.jsx` | Redirects unauthenticated users to `/login`; enforces `allowedRoles` prop |

### Planned Pages

| Route | Page | Description |
|---|---|---|
| `/complaints` | `Complaints.jsx` | Resident: file/track grievances. Committee: manage and resolve |
| `/notices` | `Notices.jsx` | Community notice board; resident bookmark panel |
| `/profile` | `Profile.jsx` | User profile, password change |
| `/invoices/:id` | `InvoiceDetail.jsx` | Printable/PDF invoice for a specific bill |

---

## 11. Planned Enhancements & Roadmap

### Short-Term (Next Sprint)

| Feature | Priority | Notes |
|---|---|---|
| Fix `/residents` ProtectedRoute guard | High | Change `SocietyAdmin` to `SocietyOwner` in `App.jsx` |
| Resident gatekeeper approval | High | Add `status: 'pending'|'active'|'rejected'` to `User`; notify owner |
| JWT refresh tokens | High | Short-lived access tokens (15min) + long-lived refresh tokens (30d) |
| Complaint module backend | Medium | `Complaint` model, CRUD routes, status lifecycle |
| Notice board backend | Medium | `Notice` model, CRUD routes, pinning |

### Medium-Term

| Feature | Priority | Notes |
|---|---|---|
| Complaint frontend | Medium | `Complaints.jsx`, upvote UI, resolution confirmation |
| Notice board frontend | Medium | `Notices.jsx` with pinned section, bookmark toggle |
| Invoice PDF generation | Medium | Per-bill PDF with rate breakdown, GST line items, society letterhead |
| Late fee auto-application | Medium | Integrate `calculateLateFee` into bill display and generation |
| Committee scoped dashboard | Medium | Dashboard shows only permission-gated sections per role |
| Email notifications | Low | Nodemailer/SendGrid for: new bill, payment receipt, complaint update |

### Long-Term

| Feature | Priority | Notes |
|---|---|---|
| Visitor management | Low | Pre-register guests; guard-facing check-in UI |
| Amenity booking | Low | Club house, gym, pool slot reservations |
| Society analytics | Low | Collection rate, dues heat-map by flat, complaint resolution time |
| Ownership transfer | Low | Transfer `SocietyOwner` role to another verified user |
| Multi-society owner | Low | One account owning multiple societies (currently 1:1) |
| Razorpay webhook endpoint | Low | Server-side event-driven capture (currently client-driven verify) |

---

## 12. Glossary

| Term | Definition |
|---|---|
| **Society** | A single registered housing complex; the top-level tenant unit in SocietyPro |
| **SocietyCode** | A 7-character alphanumeric code (`[A-Z]{3}[0-9]{4}`) uniquely identifying a society; used by residents to self-register |
| **Tenant** | A `Society` document and all `User` documents sharing its `societyId`; data across tenants is never mixed |
| **Paise** | The base monetary unit for all stored amounts (1 INR = 100 Paise); prevents floating-point rounding errors |
| **Rate Item** | A named billing line item with an amount and GST flag (e.g., `{ name: "Security", amount: 35000, gstApplicable: true }`) — amounts in Paise in DB |
| **Custom Rate** | A per-resident rate schedule that overrides the society default; toggled via `usingCustomRate` |
| **Late Fee** | A daily-accruing penalty calculated as simple interest on overdue principal, starting after the grace period |
| **Gatekeeper Approval** | A planned workflow where a resident's registration request must be approved by the owner/committee before activation |
| **customLabel** | A free-text role title assigned to a Committee member (e.g., "Treasurer"); has no system-level effect |
| **permissions** | An explicit `String[]` on a Committee `User` document defining which admin actions they can perform |
| **tenantMiddleware** | Express middleware that verifies the JWT and binds `req.user` with `{ id, role, societyId, permissions }` |
| **requirePermission** | Middleware factory that passes `SocietyOwner` unconditionally and checks `Committee.permissions` for a named permission string |
| **HMAC-SHA256** | Hash-based Message Authentication Code used to verify Razorpay payment signature integrity |
| **JWT** | JSON Web Token — stateless bearer token carrying identity and permissions, valid for 7 days |
