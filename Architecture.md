# SocietyPro — Architecture Document

**Version:** 1.0  
**Date:** September 2026  
**Stack:** MERN (MongoDB Atlas · Express.js v5 · React 19 · Node.js)  
**Companion document:** [PRD.md](./PRD.md)

---

## Table of Contents

1. [High-Level System Architecture](#1-high-level-system-architecture)
2. [Request Lifecycle — End to End](#2-request-lifecycle--end-to-end)
3. [Multi-Tenancy Implementation](#3-multi-tenancy-implementation)
4. [Backend — Middleware Stack Detail](#4-backend--middleware-stack-detail)
5. [Complete Folder & File Structure](#5-complete-folder--file-structure)
6. [Data Flow & Database Schemas](#6-data-flow--database-schemas)
7. [External Service Integration — Razorpay](#7-external-service-integration--razorpay)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Design System & CSS Architecture](#9-design-system--css-architecture)
10. [Environment & Configuration](#10-environment--configuration)
11. [Known Architectural Issues & Gaps](#11-known-architectural-issues--gaps)
12. [Target Architecture (Post-Roadmap)](#12-target-architecture-post-roadmap)

---

## 1. High-Level System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT TIER                                  │
│                                                                      │
│   Browser  ──►  Vite Dev Server (port 5173)                          │
│                  React 19 SPA                                        │
│                  React Router v7  (client-side routing)              │
│                  Tailwind CSS v4  (JIT via @tailwindcss/vite)        │
│                  Axios (axiosInstance)  ──►  Bearer JWT interceptor  │
│                  AuthContext  (localStorage persistence)             │
└─────────────────────────────────┬────────────────────────────────────┘
                                  │  HTTP/JSON  (port 5000 in dev)
                                  │  Authorization: Bearer <JWT>
┌─────────────────────────────────▼────────────────────────────────────┐
│                         API TIER                                     │
│                                                                      │
│   Express.js v5  (Node.js 20+)                                       │
│   ┌─────────────────────────────────────────────────────────────┐    │
│   │  Global Middleware Chain                                    │    │
│   │  cors()  →  express.json()                                  │    │
│   │  (per-route)  tenantMiddleware  →  requireRole/Permission   │    │
│   └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│   Route Modules                                                      │
│   /api/auth       authRoutes.js       (public + check-status endpoint)│
│   /api/society    societyRoutes.js    (JWT + role/permission guard)  │
│   /api/users      userRoutes.js       (JWT + requirePermission)      │
│   /api/payments   paymentRoutes.js    (JWT + dynamic billing + webhook)
│   /api/committee  committeeRoutes.js  (JWT + requireRole Owner)      │
│   /api/complaints complaintRoutes.js  (JWT + active user + verdict)  │
│   /api/notices    noticeRoutes.js     (JWT + active user + pin)      │
│   /api/finances   financeRoutes.js    (JWT + active user + ledger)   │
└──────────────────────┬────────────────────────┬──────────────────────┘
                       │  Mongoose ODM           │  Razorpay SDK
┌──────────────────────▼───────────────┐  ┌─────▼──────────────────────┐
│        DATA TIER                     │  │   PAYMENT GATEWAY          │
│                                      │  │                            │
│   MongoDB Atlas                      │  │   Razorpay API & Webhooks  │
│   Cluster: SocietyPro-Cluster        │  │   rzp_test_...             │
│   3-node replica set                 │  │   Order creation & verify  │
│   SSL/TLS enforced                   │  │   HMAC-SHA256 Webhook      │
│                                      │  │   Automatic Ledger Credit  │
│   Collections                        │  └────────────────────────────┘
│   ├── users                          │
│   ├── societies                      │
│   ├── payments                       │
│   ├── complaints                     │
│   ├── notices                        │
│   └── ledgers                        │
└──────────────────────────────────────┘
```

---

## 2. Request Lifecycle — End to End

### 2.1 Authenticated API Request

```
① User action in React component
        │
        ▼
② axiosInstance.request(config)
   Request interceptor fires:
     token = localStorage.getItem('token')
     config.headers.Authorization = 'Bearer ' + token
        │
        │  HTTP POST/GET/PATCH/DELETE
        │  to http://localhost:5000/api/<resource>
        ▼
③ Express router matches route
        │
        ▼
④ cors()  →  express.json()    [global middleware]
        │
        ▼
⑤ tenantMiddleware              [per-route]
     jwt.verify(token, JWT_SECRET)
     → decodes { id, role, societyId, permissions }
     → binds req.user
     → next() or 401
        │
        ▼
⑥ requireRole('SocietyOwner')  [optional, per-route]
   OR requirePermission('manageBills')
     → checks req.user.role / req.user.permissions[]
     → next() or 403
        │
        ▼
⑦ Route Handler (controller function)
     → validates input
     → queries MongoDB via Mongoose (always scoped to req.user.societyId)
     → returns JSON response
        │
        ▼
⑧ React component receives response
     → updates local state / re-renders
```

### 2.2 Public Auth Request (No Middleware)

```
POST /api/auth/register-owner
POST /api/auth/register-resident
POST /api/auth/login
        │
        ▼
cors() → express.json() → authController
  (no tenantMiddleware — no JWT required)
        │
        ▼
On success: JWT signed with { id, role, societyId, permissions }
            returned to client
        │
        ▼
AuthContext.login(token, user):
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
  React state updated → UI re-renders
```

---

## 3. Multi-Tenancy Implementation

### 3.1 Strategy: Shared Database, Logical Isolation

SocietyPro uses the **shared database, shared collections** multi-tenancy model — all tenants' data lives in the same MongoDB collections, isolated by a `societyId` field on every document.

```
┌─── MongoDB ─────────────────────────────────────────────┐
│  Collection: users                                      │
│  ┌──────────────────────────┐  ┌──────────────────────┐ │
│  │  societyId: ObjectId(A)  │  │  societyId: ObjectId(B)│ │
│  │  (Sunrise Heights data)  │  │  (Park View data)    │ │
│  └──────────────────────────┘  └──────────────────────┘ │
│                                                         │
│  Collection: payments                                   │
│  ┌──────────────────────────┐  ┌──────────────────────┐ │
│  │  societyId: ObjectId(A)  │  │  societyId: ObjectId(B)│ │
│  └──────────────────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Isolation Enforcement: Three Layers

**Layer 1 — JWT Binding (tenantMiddleware)**

```js
// backend/middleware/tenantMiddleware.js
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = {
  id:          decoded.id,
  role:        decoded.role,
  societyId:   decoded.societyId,   // ← TENANT KEY
  permissions: decoded.permissions || [],
};
```

The `societyId` in `req.user` is **cryptographically authoritative** — it can only be set at JWT sign-time by the server. Client cannot spoof or override it.

**Layer 2 — Query Scoping (controllers)**

Every query that fetches multiple documents includes the tenant key:

```js
// All society users
User.find({ societyId: req.user.societyId })

// All payment records
Payment.find({ societyId: req.user.societyId })

// All committee members
User.find({ societyId: req.user.societyId, role: 'Committee' })
```

**Layer 3 — Document-Level Cross-Check (controllers)**

When accessing a single document by ID, the controller verifies the document's `societyId` matches the requester's:

```js
// Example from userController.js
if (String(user.societyId) !== String(req.user.societyId)) {
  return res.status(403).json({ message: 'Access denied to this user' });
}
```

```js
// Example from committeeController.js
if (user.societyId.toString() !== req.user.societyId.toString()) {
  return res.status(403).json({
    message: 'Access denied: Cannot modify committee member from another society'
  });
}
```

This ensures even if a malicious client crafts a request with a known ObjectId from another society, the server returns 403.

### 3.3 Society Registration — Atomic Tenant Provisioning

```js
// authController.js — registerOwner
const newUserId = new mongoose.Types.ObjectId(); // pre-allocate

const society = await Society.create({
  name: societyName,
  societyCode,          // format: [A-Z]{3}[0-9]{4}
  ownerId: newUserId,   // forward-reference before User exists
});

const user = await User.create({
  _id: newUserId,       // matches society.ownerId
  role: 'SocietyOwner',
  societyId: society._id,
});
```

Both documents are created in sequence. If `User.create` fails after `Society.create` succeeds, a partial tenant is created. **Planned fix:** Mongoose transaction (`session.withTransaction`) to make this atomic.

### 3.4 Society Code Generation

```js
// backend/utils/generateSocietyCode.js
const generateSocietyCode = () => {
  const letters = Array.from({ length: 3 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join('');                       // e.g. "KXP"
  const digits = Math.floor(1000 + Math.random() * 9000); // e.g. "7391"
  return `${letters}${digits}`;     // e.g. "KXP7391"
};

// Collision-safe loop
const generateUniqueSocietyCode = async () => {
  let code, isUnique = false;
  while (!isUnique) {
    code = generateSocietyCode();
    const existing = await Society.findOne({ societyCode: code });
    isUnique = !existing;
  }
  return code;
};
```

Code space: 26³ × 9000 = **158,184,000** unique codes — sufficient for the foreseeable tenant count.

### 3.5 Resident Self-Registration via Society Code

```
Resident submits { societyCode: "KXP7391", ... }
           │
           ▼
Society.findOne({ societyCode: "KXP7391" })
           │
     ┌─────┴──────┐
  Not found      Found
   HTTP 400     User.create({ societyId: society._id, role: 'Resident' })
                JWT issued with societyId bound to this tenant
```

The `societyCode` is the **only** public tenant identifier. It is never stored in the JWT — the `societyId` (ObjectId) is what gets embedded and enforced.

---

## 4. Backend — Middleware Stack Detail

### 4.1 Middleware Execution Order

```
Incoming HTTP Request
        │
        ▼
┌─── app.use() global ────────────────────────────────────────────────┐
│  1. cors()                                                          │
│     • Allows all origins in dev (should be restricted in prod)      │
│     • Sets CORS response headers                                    │
│                                                                     │
│  2. express.json()                                                  │
│     • Parses JSON request bodies                                    │
│     • Sets req.body                                                 │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─── Route-level middleware (per-route) ──────────────────────────────┐
│                                                                     │
│  3. tenantMiddleware                                                │
│     • Reads Authorization: Bearer <token>                           │
│     • jwt.verify(token, JWT_SECRET) → 401 if invalid/expired       │
│     • Sets req.user = { id, role, societyId, permissions }          │
│     • Calls next()                                                  │
│                                                                     │
│  4a. requireRole('SocietyOwner')          [committee routes]        │
│      • Checks req.user.role === 'SocietyOwner'                      │
│      • 403 if mismatch                                              │
│                                                                     │
│  4b. requirePermission('manageResidents') [user routes]             │
│      • SocietyOwner → always next()                                 │
│      • Committee → checks permissions[] includes the key            │
│      • Resident → always 403                                        │
│                                                                     │
│  4c. Inline role+permission combo        [payment/generate-bill]    │
│      • if SocietyOwner → next()                                     │
│      • if Committee && permissions.includes('manageBills') → next() │
│      • else → 403                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─── Route Handler (Controller) ──────────────────────────────────────┐
│  5. Input validation (manual guard clauses)                         │
│  6. DB operations (Mongoose, always scoped to societyId)            │
│  7. External API call (Razorpay SDK, if applicable)                 │
│  8. JSON response                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 `tenantMiddleware` — Full Source Analysis

```
File: backend/middleware/tenantMiddleware.js

Input:  req.headers.authorization
Output: req.user = { id, role, societyId, permissions }

Error cases:
  • Missing/malformed header  → HTTP 401 "No token provided"
  • jwt.verify throws         → HTTP 401 "Invalid or expired token"
  • Valid token               → next()

JWT payload shape (as signed at auth time):
  {
    id:          String (User ObjectId),
    role:        'SocietyOwner' | 'Committee' | 'Resident',
    societyId:   String (Society ObjectId),
    permissions: String[]
  }
```

### 4.3 `requirePermission` — Full Logic

```
File: backend/middleware/requirePermission.js

requirePermission(permissionName) → middleware function

Decision tree:
  req.user.role === 'SocietyOwner'
    → next()  [implicit full access, no permission check]

  req.user.role === 'Committee'
    → req.user.permissions.includes(permissionName)
        true  → next()
        false → HTTP 403 "Missing required permission: <name>"

  any other role (Resident, unknown)
    → HTTP 403 "Insufficient permissions"
```

### 4.4 `requireRole` — Full Logic

```
File: backend/middleware/roleMiddleware.js

requireRole(...allowedRoles) → middleware function

  !req.user || !req.user.role
    → HTTP 401

  allowedRoles.includes(req.user.role)
    → next()
    else → HTTP 403
```

### 4.5 Middleware Matrix

| Route | tenantMiddleware | requireActiveUser | requireRole | requirePermission / Guard |
|---|:---:|:---:|:---:|---|
| `POST /api/auth/register-owner` | ✗ | ✗ | — | Public |
| `POST /api/auth/register-resident` | ✗ | ✗ | — | Public |
| `POST /api/auth/login` | ✗ | ✗ | — | Public |
| `GET /api/auth/check-status` | ✓ | ✗ | — | Self / JWT verification (refreshes token on active) |
| `POST /api/committee/` | ✓ | ✗ | `SocietyOwner` | — |
| `GET /api/committee/` | ✓ | ✗ | `SocietyOwner` | — |
| `PATCH /api/committee/:id` | ✓ | ✗ | `SocietyOwner` | — |
| `DELETE /api/committee/:id` | ✓ | ✗ | `SocietyOwner` | — |
| `GET /api/society/rates/default` | ✓ | ✗ | — | — |
| `PATCH /api/society/rates/default` | ✓ | ✗ | `SocietyOwner` | — |
| `GET /api/society/late-fee-settings` | ✓ | ✗ | — | — |
| `PATCH /api/society/late-fee-settings` | ✓ | ✗ | `SocietyOwner` | — |
| `GET /api/society/:id` | ✓ | ✗ | — | `manageSociety` |
| `PATCH /api/society/:id` | ✓ | ✗ | — | `manageSociety` |
| `DELETE /api/society/:id` | ✓ | ✗ | `SocietyOwner` | — |
| `GET /api/users/` | ✓ | ✗ | — | `manageResidents` |
| `GET /api/users/residents/pending` | ✓ | ✗ | — | `manageResidents` |
| `PATCH /api/users/residents/:id/approve` | ✓ | ✗ | — | `manageResidents` |
| `PATCH /api/users/residents/:id/reject` | ✓ | ✗ | — | `manageResidents` |
| `GET /api/users/:id` | ✓ | ✗ | — | `manageResidents` |
| `PATCH /api/users/:id` | ✓ | ✗ | — | `manageResidents` |
| `DELETE /api/users/:id` | ✓ | ✗ | — | `manageResidents` |
| `PATCH /api/users/:id/rate` | ✓ | ✗ | — | `manageResidents` |
| `GET /api/users/:id/rate` | ✓ | ✗ | — | *(self or manageResidents)* |
| `POST /api/payments/create-order` | ✓ | ✓ | `Resident` | Scoped to resident's pending bill |
| `POST /api/payments/verify` | ✓ | ✓ | `Resident` | Cryptographic HMAC-SHA256 signature check |
| `POST /api/payments/generate-bill` | ✓ | ✗ | — | *(inline: SocietyOwner or manageBills)* |
| `POST /api/payments/generate-bulk-bills` | ✓ | ✗ | — | *(inline: SocietyOwner or manageBills)* |
| `GET /api/payments/` | ✓ | ✓ | — | *(role-scoped in controller)* |
| `POST /api/payments/webhook` | ✗ | ✗ | — | Razorpay HMAC-SHA256 header validation |
| `POST /api/complaints` | ✓ | ✓ | — | Scoped to active resident / society |
| `GET /api/complaints` | ✓ | ✓ | — | Filterable by `?status=` |
| `PATCH /api/complaints/:id/upvote` | ✓ | ✓ | — | Idempotent toggle per resident |
| `PATCH /api/complaints/:id/status` | ✓ | ✗ | — | `resolveComplaints` or `SocietyOwner` |
| `PATCH /api/complaints/:id/verdict` | ✓ | ✓ | — | Ticket creator only (`createdBy`) |
| `GET /api/notices` | ✓ | ✓ | — | Tri-level sort (Priority -> Pinned -> Recent) |
| `POST /api/notices` | ✓ | ✗ | — | `manageNotices` or `SocietyOwner` |
| `PATCH /api/notices/:id/pin` | ✓ | ✓ | — | Toggles user ID in `pinnedBy` |
| `DELETE /api/notices/:id` | ✓ | ✗ | — | `manageNotices` or `SocietyOwner` |
| `POST /api/finances/expenses` | ✓ | ✗ | — | `manageBills` or `SocietyOwner` |
| `GET /api/finances/metrics` | ✓ | ✓ | — | High-performance MongoDB facet aggregation |
| `GET /api/test/protected` | ✓ | ✗ | — | Dev diagnostic |

---

## 5. Complete Folder & File Structure

### 5.1 Current State (Certified & Synchronized)

```
SocietyPro_MERN/
├── PRD.md                          ← Product Requirements Document
├── Architecture.md                 ← System Architecture Blueprint (this document)
├── Design.md                       ← Design System & UI/UX Specifications
├── Memory.md                       ← Persistent Engineering Memory & Sprint Log
├── Phases.md                       ← Development Phases & Feature Completion Matrix
├── Rules.md                        ← Non-negotiable Engineering Standards & Invariants
├── .gitignore
│
├── backend/
│   ├── server.js                   ← Entry point; Express app, MongoDB connect, route mounts
│   ├── .env                        ← Secrets (gitignored): PORT, MONGO_URI, JWT_SECRET, RAZORPAY_*
│   ├── .gitignore
│   ├── package.json                ← bcryptjs, cors, dotenv, express, jsonwebtoken, mongoose, razorpay
│   ├── requests.http               ← Manual API test file (REST Client)
│   ├── test_backend_suite.js       ← Comprehensive integration test suite (58 passing tests)
│   ├── test_sprint_features.js     ← Sprint feature certification suite (26 passing tests)
│   ├── test_resident_rates.js      ← Rate calculation test script
│   │
│   ├── config/
│   │   └── razorpay.js             ← Razorpay SDK instance initialised from env vars
│   │
│   ├── models/
│   │   ├── Society.js              ← Society schema: name, address, code, rates, lateFee
│   │   ├── User.js                 ← User schema: role, societyId, permissions, rate engine fields, status
│   │   ├── Payment.js              ← Payment schema: amount(Paise), status, razorpay IDs, residentId
│   │   ├── Complaint.js            ← Grievance schema: affectedFlats, upvotedBy, upvoteCount, verdict
│   │   ├── Notice.js               ← Notice board schema: isPriority, pinnedBy, societyId
│   │   └── Ledger.js               ← Treasury ledger schema: amountInPaise, amountInRupees, referenceBillId
│   │
│   ├── controllers/
│   │   ├── authController.js       ← registerOwner, registerResident, loginUser, checkStatus (token refresh)
│   │   ├── societyController.js    ← getSocietyById, updateSociety, deleteSociety, rates, late-fee
│   │   ├── committeeController.js  ← createCommittee, getCommitteeMembers, updatePermissions, delete
│   │   ├── userController.js       ← getSocietyUsers, getUserById, updateUser, deleteUser,
│   │   │                              setResidentCustomRate, getResidentRate, approve/reject resident
│   │   ├── paymentController.js    ← createOrder, verifyPayment, computeResidentRate, generateBill,
│   │   │                              generateBulkBills, getBills, handleRazorpayWebhook
│   │   ├── complaintController.js  ← createComplaint, getComplaints, toggleUpvoteComplaint, updateStatus, setVerdict
│   │   ├── noticeController.js     ← getNotices (tri-level sort), createNotice, togglePinNotice, deleteNotice
│   │   └── financeController.js    ← recordExpense, getFinancialMetrics (MongoDB $facet aggregation)
│   │
│   ├── middleware/
│   │   ├── tenantMiddleware.js     ← JWT decode → req.user (id, role, societyId, status, permissions)
│   │   ├── requireActiveUser.js    ← Blocks pending/rejected accounts from operational routes (HTTP 403)
│   │   ├── roleMiddleware.js       ← requireRole(...allowedRoles) factory
│   │   └── requirePermission.js    ← requirePermission(permissionName) factory
│   │
│   ├── routes/
│   │   ├── authRoutes.js           ← /register-owner, /register-resident, /login, /check-status
│   │   ├── societyRoutes.js        ← /:id + default rates + late-fee-settings
│   │   ├── committeeRoutes.js      ← CRUD committee members & granular permissions
│   │   ├── userRoutes.js           ← CRUD users + /:id/rate + /residents/pending + approve/reject
│   │   ├── paymentRoutes.js        ← /create-order, /verify, /generate-bill, /generate-bulk-bills, /webhook, GET /
│   │   ├── complaintRoutes.js      ← CRUD complaints + /:id/upvote + /:id/status + /:id/verdict
│   │   ├── noticeRoutes.js         ← GET / (tri-level sorted), POST /, PATCH /:id/pin, DELETE /:id
│   │   ├── financeRoutes.js        ← POST /expenses, GET /metrics
│   │   └── testRoutes.js           ← GET /protected (dev diagnostic)
│   │
│   └── utils/
│       ├── generateSocietyCode.js  ← generateSocietyCode() + generateUniqueSocietyCode()
│       └── calculateLateFee.js     ← (principal, ratePercentPerYear, daysOverdue, grace) → fee
│
└── frontend/
    ├── index.html                  ← Vite HTML entry; mounts <div id="root">
    ├── vite.config.js              ← plugins: [react(), tailwindcss()]
    ├── package.json                ← react, react-dom, react-router-dom, axios, tailwindcss, lucide-react, jspdf
    ├── eslint.config.js
    ├── .gitignore
    │
    ├── public/                     ← Static assets
    │
    └── src/
        ├── main.jsx                ← ReactDOM.createRoot('#root').render(<App />)
        ├── App.jsx                 ← BrowserRouter + Routes + ProtectedRoute wrappers (including /dashboard)
        ├── index.css               ← @import "tailwindcss" + @theme design tokens
        ├── App.css
        │
        ├── api/
        │   └── axiosInstance.js    ← axios.create(baseURL: dynamic VITE_API_BASE_URL) + Bearer token injection
        │
        ├── context/
        │   └── AuthContext.jsx     ← Auth state machine (token, user, status, role booleans, localStorage)
        │
        ├── components/
        │   ├── Layout.jsx          ← Topbar + Sidebar (desktop fixed, mobile drawer, role-gated navigation)
        │   └── ProtectedRoute.jsx  ← Redirects to /login or /pending-approval based on auth and user status
        │
        └── pages/
            ├── Login.jsx           ← Email/password authentication
            ├── Register.jsx        ← Dual-tab onboarding (Owner creates society; Resident joins via code)
            ├── PendingApproval.jsx ← Gatekeeper screen with 4-second reactive polling & auto-redirect
            ├── Dashboard.jsx       ← Role-contextual overview with operational metric cards
            ├── SocietyManagement.jsx ← Society profile, default rates, late fee settings
            ├── CommitteeManagement.jsx ← Appoint members and delegate granular permissions
            ├── ResidentManagement.jsx  ← Resident roster, custom rate config, pending approvals queue
            ├── Payments.jsx        ← Bills table, dynamic single & bulk bill generator, Razorpay checkout, PDF receipt download
            ├── Complaints.jsx      ← Grievance board with photo proof preview, idempotent upvoting, and ticket creator verdict
            └── Notices.jsx         ← Notice board with priority pins and optimistic toggle feedback
```

### 5.2 Target Architecture Roadmap Status

All planned operational modules from the initial roadmap (Complaints, Notices, Treasury Ledger, Gatekeeper Approval, Bulk Billing Engine, and Branded Invoicing) have transitioned from **[PLANNED]** to **[COMPLETED & CERTIFIED]**.

Future evolutions under consideration for Enterprise Scale:
- Serverless PDF generation microservice (for scheduled batch archiving)
- Automated email/SMS dispatch via Nodemailer & Twilio
- WebSocket / SSE push layer to complement HTTP polling for live notice board broadcasts

---

## 6. Data Flow & Database Schemas

### 6.1 Entity Relationship Overview

```
                     ┌──────────────────┐
                     │     Society      │
                     └────────┬─────────┘
                              │ 1
        ┌─────────────────────┼─────────────────────┬─────────────────────┐
        │ *                   │ *                   │ *                   │ *
┌───────▼────────┐    ┌───────▼────────┐    ┌───────▼────────┐    ┌───────▼────────┐
│      User      │    │    Payment     │    │   Complaint    │    │     Notice     │
│ (Rate Config & │    │  (Stored in    │    │ (Upvotes &     │    │ (Priority &    │
│  Status Gate)  │    │   Paise)       │    │  User Verdict) │    │  Personal Pins)│
└───────┬────────┘    └───────┬────────┘    └────────────────┘    └────────────────┘
        │ 1                   │ 1 (optional ref)
        │                     │
        │                     ▼
        │             ┌────────────────┐
        └────────────►│     Ledger     │
          (createdBy) │ (Double-Entry  │
                      │  Audit Trail)  │
                      └────────────────┘
```

### 6.2 `Society` Schema

```
Collection: societies

Field                              Type          Constraint / Default
─────────────────────────────────────────────────────────────────────
_id                                ObjectId      auto-generated
name                               String        required
address                            String        required
city                               String        required
registrationNumber                 String        optional
societyCode                        String        required, unique
                                                 format: [A-Z]{3}[0-9]{4}
ownerId                            ObjectId      ref: User, required
defaultRateItems[]
  .name                            String        required
  .amount                          Number        required, > 0 (INR)
  .gstApplicable                   Boolean       default: false
lateFeeSettings
  .ratePercentPerYear              Number        default: 21
  .gracePeriodDays                 Number        default: 5
  .dueDateDay                      Number        default: 10, range: [1,28]
createdAt                          Date          default: Date.now
```

**Index:** `societyCode` has a unique index (Mongoose `unique: true`).

### 6.3 `User` Schema (Rate Engine & Gatekeeper Enabled)

```
Collection: users

Field                              Type          Constraint / Default
─────────────────────────────────────────────────────────────────────
_id                                ObjectId      auto-generated
name                               String        required
email                              String        required, unique, lowercase
passwordHash                       String        required (bcryptjs, never returned)
role                               String        enum: ['SocietyOwner','Committee','Resident']
                                                 required
societyId                          ObjectId      ref: Society, required
                                                 ← PRIMARY TENANT KEY
status                             String        enum: ['pending','active','rejected']
                                                 default: 'active' (Owners/Committee)
                                                 Residents default to 'pending'
customLabel                        String        optional (Committee label, e.g. "Treasurer")
permissions                        String[]      default: []
                                                 values: 'manageResidents' | 'manageBills'
                                                         | 'manageNotices' | 'resolveComplaints'
                                                         | 'manageSociety'
unitNumber                         String        optional (Resident's flat, e.g. "A-101")

/* Automated Maintenance Rate Engine Configuration */
sqftArea                           Number        default: 850 (Square feet)
billingType                        String        enum: ['flat_rate', 'sqft_based']
                                                 default: 'flat_rate'
fixedRate                          Number        default: 2000 (Base INR for flat_rate)
ratePerSqft                        Number        default: 2.5 (INR/sqft for sqft_based)
parkingCharges                     Number        default: 300 (INR surcharge)
waterCharges                       Number        default: 200 (INR surcharge)

/* Legacy rate override support */
customRateItems[]
  .name                            String        required
  .amount                          Number        required (INR)
  .gstApplicable                   Boolean       default: false
usingCustomRate                    Boolean       default: false

createdAt                          Date          default: Date.now
```

**Indexes:** `email` unique index, `societyId` compound indexes, `status` index.

### 6.4 Automated Maintenance Rate Engine Calculation

The backend computes the exact resident maintenance rate dynamically inside `computeResidentRate(user)`:

$$\text{Base Amount} = \begin{cases} \text{sqftArea} \times \text{ratePerSqft} & \text{if } \text{billingType} = \text{'sqft\_based'} \\ \text{fixedRate} & \text{if } \text{billingType} = \text{'flat\_rate'} \end{cases}$$

$$\text{Total Amount (INR)} = \text{Base Amount} + \text{parkingCharges} + \text{waterCharges}$$

$$\text{Amount In Paise} = \text{Math.round}(\text{Total Amount} \times 100)$$

**Batch Invariant:** When `generateBulkBills` is invoked, the engine fetches all active residents (`status: 'active'`), executes `computeResidentRate` individually for each resident according to their specific unit dimensions and rate configs, and bulk-inserts all invoices with zero floating-point imprecision.

### 6.5 `Payment` Schema

```
Collection: payments

Field                              Type          Constraint / Default
─────────────────────────────────────────────────────────────────────
_id                                ObjectId      auto-generated
societyId                          ObjectId      ref: Society, required
residentId                         ObjectId      ref: User, required
amount                             Number        required *** STORED IN PAISE ***
                                                 1 INR = 100 Paise; always integer
currency                           String        default: 'INR'
razorpayOrderId                    String        optional (set when order created)
razorpayPaymentId                  String        optional (set after capture)
status                             String        enum: ['created','authorized',
                                                        'captured','failed']
                                                 default: 'created'
unitNumber                         String        required (denormalized for display)
month                              String        required (e.g. "September 2026")
dueDate                            Date          required
createdAt                          Date          default: Date.now
updatedAt                          Date          default: Date.now
```

### 6.6 `Complaint` Schema (Grievance Redressal V2)

```
Collection: complaints

Field                              Type          Constraint / Default
─────────────────────────────────────────────────────────────────────
_id                                ObjectId      auto-generated
societyId                          ObjectId      ref: Society, required
createdBy                          ObjectId      ref: User, required
flatNo                             String        required (e.g. "B-404")
title                              String        required
description                        String        required
imageUrl                           String        optional (photo proof URL)
affectedFlats                      String[]      default: [] (flat numbers of upvoters)
upvotedBy                          ObjectId[]    default: [] (User IDs of upvoters)
upvoteCount                        Number        default: 0 (synchronised with upvotedBy.length)
status                             String        enum: ['open','in_progress','resolved','closed']
                                                 default: 'open'
verdict                            String        enum: ['confirmed','reopened', null]
                                                 default: null (ticket creator only)
createdAt                          Date          default: Date.now
updatedAt                          Date          default: Date.now
```

**Verdict Lifecycle:**
- When committee sets status to `'resolved'`, the ticket creator reviews the resolution.
- Setting `verdict = 'confirmed'` automatically marks `status = 'closed'`.
- Setting `verdict = 'reopened'` automatically resets `status = 'open'` for re-investigation.

### 6.7 `Notice` Schema (Priority & Personal Bookmarking)

```
Collection: notices

Field                              Type          Constraint / Default
─────────────────────────────────────────────────────────────────────
_id                                ObjectId      auto-generated
societyId                          ObjectId      ref: Society, required
title                              String        required
body                               String        required
isPriority                         Boolean       default: false
pinnedBy                           ObjectId[]    default: [] (User IDs who pinned)
createdBy                          ObjectId      ref: User, required
createdAt                          Date          default: Date.now
```

**Tri-Level Sort Specification:**
Notices query executes a tri-level sort:
1. **Priority Announcements** (`isPriority: true` first)
2. **Personally Pinned Notices** (`pinnedBy` includes `req.user.id`)
3. **Chronological Recency** (`createdAt: -1`)

### 6.8 `Ledger` Schema (Double-Entry Treasury)

```
Collection: ledgers

Field                              Type          Constraint / Default
─────────────────────────────────────────────────────────────────────
_id                                ObjectId      auto-generated
societyId                          ObjectId      ref: Society, required
type                               String        enum: ['income','expense'], required
category                           String        required (e.g. "Maintenance", "Security")
amountInPaise                      Number        required, integer (stored in Paise)
paymentMethod                      String        default: 'Razorpay'
referenceBillId                    ObjectId      ref: Payment, optional
description                        String        optional
createdAt                          Date          default: Date.now
```

**Virtual Getter:** `amountInRupees` returns `amountInPaise / 100`.  
**Concurrency Guard:** Compound unique sparse index `{ referenceBillId: 1, type: 1 }` prevents double-crediting if webhooks and client verification race.

### 6.9 Reactive Gatekeeper Polling Architecture

```
[Resident Browser: PendingApproval.jsx]
         │
         │  Timer: setInterval(pollStatus, 4000)
         ▼
GET /api/auth/check-status
Authorization: Bearer <existing_pending_jwt>
         │
         ▼
[Backend: authController.checkStatus]
  1. tenantMiddleware verifies JWT → req.user.id
  2. Queries User.findById(req.user.id).select('status role name email societyId permissions')
         │
    ┌────┴───────────────────────────┐
    │ status === 'pending'           │ status === 'active'
    ▼                                ▼
HTTP 200                         HTTP 200
{ status: 'pending',             { status: 'active',
  message: 'Under review' }        message: 'Account approved',
                                   token: <FRESH_ACTIVE_JWT>,
                                   user: { ...freshUser } }
                                     │
                                     ▼
                     [Client: AuthContext.updateTokenAndUser]
                       1. Stores fresh JWT in localStorage
                       2. Updates in-memory AuthContext user
                       3. Clears 4-second polling timer
                       4. window.location.href = '/dashboard'
```

---

## 7. External Service Integration — Razorpay

### 7.1 SDK Initialisation

```js
// backend/config/razorpay.js
const Razorpay = require('razorpay');

const razorpayInstance = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,     // rzp_test_...
  key_secret: process.env.RAZORPAY_KEY_SECRET, // used for HMAC signing
});

module.exports = razorpayInstance;
```

Singleton instance — shared across all controllers.

### 7.2 Order Creation Flow

```
① Resident calls POST /api/payments/create-order  { amount: 2500 }
          │
          ▼
② paymentController.createOrder
     amount (INR) → amountInPaise = Math.round(2500 * 100) = 250000
          │
          ▼
③ razorpayInstance.orders.create({
     amount:   250000,      // Paise
     currency: 'INR',
     receipt:  'receipt_<timestamp>'
   })
          │
          ▼
④ Razorpay API response → { id: 'order_XYZ', amount: 250000, ... }
          │
          ▼
⑤ Payment.create({
     societyId:       req.user.societyId,
     residentId:      req.user.id,
     amount:          250000,                  // Paise
     razorpayOrderId: 'order_XYZ',
     status:          'created',
     ...
   })
          │
          ▼
⑥ Response to client:
   {
     orderId:         'order_XYZ',
     amount:          250000,     // client uses this for Razorpay widget
     currency:        'INR',
     key:             RAZORPAY_KEY_ID,
     paymentRecordId: payment._id
   }
          │
          ▼
⑦ Frontend opens Razorpay Checkout widget with orderId + amount
   User completes payment via Razorpay UI
```

### 7.3 Payment Verification Flow (HMAC-SHA256)

```
① Razorpay Checkout success callback fires
   client receives:
   {
     razorpay_order_id:   'order_XYZ',
     razorpay_payment_id: 'pay_ABC',
     razorpay_signature:  '<hex-string>'
   }
          │
          ▼
② Client calls POST /api/payments/verify  { ...above fields }
          │
          ▼
③ paymentController.verifyPayment
     generatedSignature = HMAC-SHA256(
       key:     RAZORPAY_KEY_SECRET,
       message: "order_XYZ|pay_ABC"
     ).digest('hex')
          │
          ▼
④ Compare signatures (constant-time string compare is PLANNED — currently ===)

   Match  → Payment.findOneAndUpdate({ razorpayOrderId }, {
               razorpayPaymentId: 'pay_ABC',
               status: 'captured',
               updatedAt: Date.now()
             })
             HTTP 200 { message: 'Payment verified successfully', payment }

   No match → Payment.findOneAndUpdate({ razorpayOrderId }, {
                 status: 'failed',
                 updatedAt: Date.now()
               })
               HTTP 400 { message: 'Payment verification failed' }
```

### 7.4 Webhook Gap

Currently, payment capture is **client-driven** — the resident's browser posts the verification request after checkout. This has a key weakness:

- If the browser tab closes or network drops after Razorpay processes payment but before `verify` is called, the `Payment` record stays `'created'` even though money was taken.

**Planned fix:** Implement a server-side Razorpay webhook endpoint (`POST /api/webhooks/razorpay`) that receives `payment.captured` events directly from Razorpay and updates payment status without requiring client participation.

```
[PLANNED] Webhook Flow:
Razorpay → POST /api/webhooks/razorpay
  { event: 'payment.captured', payload: { payment: { entity: {...} } } }
  │
  ▼
Verify X-Razorpay-Signature header (HMAC-SHA256 of raw body)
  │
  ▼
Payment.findOneAndUpdate({ razorpayOrderId }, { status: 'captured' })
```

---

## 8. Frontend Architecture

### 8.1 Application Bootstrap

```
index.html  →  main.jsx
                 │
                 ▼
              ReactDOM.createRoot(document.getElementById('root'))
                 │
                 ▼
              <App />
               │
               ├── <AuthProvider>          [AuthContext — global auth state]
               │     │
               │     └── <BrowserRouter>   [React Router v7]
               │           │
               │           └── <Routes>
               │                 ├── /login          → <Login />
               │                 ├── /register       → <Register />
               │                 ├── /               → <ProtectedRoute> <Layout> <Dashboard />
               │                 ├── /societies      → <ProtectedRoute allowedRoles=[Owner,Committee]>
               │                 ├── /committee      → <ProtectedRoute allowedRoles=[Owner]>
               │                 ├── /residents      → <ProtectedRoute allowedRoles=[SocietyAdmin]> ⚠️
               │                 ├── /payments       → <ProtectedRoute>
               │                 └── *               → <Navigate to="/" />
```

⚠️ `/residents` is guarded by non-existent role `'SocietyAdmin'` — effectively locked out for all users.

### 8.2 Authentication State Machine

```
App Start
    │
    ▼
AuthContext hydrates from localStorage:
  token = localStorage.getItem('token') || null
  user  = JSON.parse(localStorage.getItem('user')) || null
    │
    ├── token exists → isAuthenticated = true
    │     → Render protected routes
    │
    └── token null  → isAuthenticated = false
          → <ProtectedRoute> redirects to /login

Login success:
  AuthContext.login(token, user):
    setToken(token)
    setUser(user)
    localStorage.setItem('token', ...)
    localStorage.setItem('user', ...)

Logout:
  AuthContext.logout():
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
```

**Note:** Token expiry (7-day JWT) is not proactively handled on the frontend. If an expired token is used, the API returns 401, but the client does not automatically log out or refresh. **Planned:** Axios response interceptor to detect 401 and call `logout()`.

### 8.3 Axios Instance & Token Injection

```js
// frontend/src/api/axiosInstance.js
const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');   // reads directly from storage
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**Note:** The interceptor reads from `localStorage` directly rather than from `AuthContext`. This is safe because `AuthContext` also writes to `localStorage`, so they stay in sync. However, if two tabs are open and one logs out, the other tab's interceptor will still send the now-invalid token until it gets a 401.

### 8.4 Layout & Navigation

```
<Layout>
  ├── <header>  Topbar
  │     ├── Hamburger (mobile only)
  │     ├── "SocietyPro Portal" wordmark
  │     └── User avatar + role badge + Sign Out button
  │
  ├── <aside>  Sidebar (desktop: fixed; mobile: slide-in drawer + backdrop)
  │     └── navItems[] (role-gated visibility)
  │           Dashboard        visible: always
  │           My Society       visible: SocietyOwner || Committee
  │           Committee        visible: SocietyOwner
  │           Residents        visible: role === 'SocietyAdmin'  ⚠️ bug
  │           Payments         visible: always
  │           Notices          visible: always, disabled: true, badge: "Coming Soon"
  │
  └── <main>  Content area (lg:pl-64 to clear sidebar)
        └── {children}  ← page component
```

### 8.5 Role-Gated Context Values (AuthContext)

| Property | Value |
|---|---|
| `isAuthenticated` | `!!token` |
| `isSocietyOwner` | `user?.role === 'SocietyOwner'` |
| `isCommittee` | `user?.role === 'Committee'` |
| `isResident` | `user?.role === 'Resident'` |
| `isSuperAdmin` | `user?.role === 'SuperAdmin'` *(unused role)* |

These computed booleans are consumed in pages/components for conditional rendering.

---

## 9. Design System & CSS Architecture

### 9.1 Tailwind v4 Setup

```
vite.config.js:
  plugins: [react(), tailwindcss()]   ← @tailwindcss/vite plugin
                                         (replaces postcss config)

index.css:
  @import "tailwindcss";              ← imports Tailwind base + utilities
  @theme { ... }                      ← custom design tokens
```

### 9.2 Design Token Definitions

```css
/* frontend/src/index.css */
@theme {
  /* Brand colours */
  --color-primary:        #0F766E;   /* Teal 700 — primary actions, active nav */
  --color-primary-light:  #14B8A6;   /* Teal 500 — hover states */
  --color-primary-subtle: #CCFBF1;   /* Teal 100 — backgrounds, badges */

  /* Neutral palette */
  --color-charcoal:       #1E293B;   /* Slate 800 — body text */
  --color-slate:          #475569;   /* Slate 600 — secondary text */
  --color-surface:        #F1F5F9;   /* Slate 100 — page background */
  --color-border:         #E2E8F0;   /* Slate 200 — dividers, card borders */

  /* Semantic colours */
  --color-success:        #16A34A;   /* Green 600 — payment captured */
  --color-warning:        #D97706;   /* Amber 600 — pending states */
  --color-error:          #DC2626;   /* Red 600 — failed, access denied */
  --color-info:           #2563EB;   /* Blue 600 — informational */

  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
}
```

### 9.3 Role Badge Colour Map (Layout.jsx)

| Role | Background | Text | Border |
|---|---|---|---|
| `SocietyOwner` | amber-50 | `#bca030` | amber-200 |
| `Committee` | purple-50 | purple-700 | purple-200 |
| `Resident` | blue-50 | `--color-info` | info/20 |
| `SuperAdmin` | red-50 | `--color-error` | error/20 |
| `SocietyAdmin` | emerald-50 | `--color-success` | success/20 |

---

## 10. Environment & Configuration

### 10.1 Backend Environment Variables

```
File: backend/.env  (gitignored)

PORT=5000
MONGO_URI=mongodb://<user>:<pass>@<shard-hosts>/?ssl=true
          &replicaSet=atlas-cvd60t-shard-0
          &authSource=admin
          &appName=SocietyPro-Cluster
JWT_SECRET=<secret-string>
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=<secret>
```

| Variable | Purpose | Required |
|---|---|---|
| `PORT` | Express listen port | No (default: 5000) |
| `MONGO_URI` | MongoDB Atlas 3-node replica set URI with SSL | Yes |
| `JWT_SECRET` | HMAC key for JWT signing/verification | Yes |
| `RAZORPAY_KEY_ID` | Public Razorpay key (returned to client for checkout widget) | Yes |
| `RAZORPAY_KEY_SECRET` | Private key for HMAC payment signature verification | Yes |

### 10.2 MongoDB Atlas Connection

```js
// server.js
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');  // prevents IPv6 resolution issues with Atlas

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));
```

The `dns.setDefaultResultOrder('ipv4first')` patch is required because some Windows/Node configurations resolve Atlas hostnames to IPv6 first, causing connection failures.

### 10.3 Dev Server Configuration

| Service | Port | Command |
|---|---|---|
| Express API | 5000 | `cd backend && npm run dev` (nodemon) |
| Vite React | 5173 | `cd frontend && npm run dev` |

Axios `baseURL` is hardcoded to `http://localhost:5000/api`. **Planned:** environment variable (`VITE_API_BASE_URL`) to support staging/production URLs.

---

## 11. Architectural Audit & Hardening Status

### 11.1 Resolved Issues & Remediations (Sprint Certified)

| Issue | Original Location | Resolution Status | Evidence |
|---|---|:---:|---|
| `/residents` route role misconfiguration | `App.jsx`, `Layout.jsx` | ✅ Resolved | Updated allowed roles to `['SocietyOwner', 'Committee']`. Accessible to all admins. |
| Timing attack on payment signature verification | `paymentController.js` | ✅ Resolved | Replaced `===` with `crypto.timingSafeEqual` comparing UTF-8 buffers. |
| Razorpay server-side webhook missing | `paymentController.js`, `paymentRoutes.js` | ✅ Resolved | Added `POST /api/payments/webhook` with HMAC-SHA256 verification and automatic Ledger credit. |
| Double credit race condition on payment verification | `paymentController.js`, `Ledger.js` | ✅ Resolved | Added atomic query `{ razorpayOrderId, status: { $ne: 'captured' } }` and compound unique sparse index on `Ledger`. |
| Gatekeeper resident access leak | Operational route chains | ✅ Resolved | Implemented `requireActiveUser.js` blocking unverified residents with HTTP 403 `ACCOUNT_INACTIVE`. |
| Unreactive gatekeeper UX | `PendingApproval.jsx`, `authController.js` | ✅ Resolved | Added `GET /api/auth/check-status` with token refresh and 4s reactive frontend polling with auto-redirect. |
| Manual individual billing bottleneck | `paymentController.js`, `Payments.jsx` | ✅ Resolved | Implemented `POST /api/payments/generate-bulk-bills` and dynamic maintenance rate engine with auto-compute. |
| Grievance lack of community validation & closure | `Complaint.js`, `complaintController.js` | ✅ Resolved | Added idempotent upvoting (`upvotedBy`/`upvoteCount`) and ticket creator two-phase settlement verdict. |
| Notice board noise & lack of bookmarking | `Notice.js`, `noticeController.js` | ✅ Resolved | Implemented personal pin toggling (`pinnedBy`) and tri-level sorting (Priority -> Pinned -> Recent). |
| Lack of formal invoice receipts | `Payments.jsx` | ✅ Resolved | Integrated `jsPDF` vector generator with itemized charge breakdown and official PAID watermark. |

### 11.2 Standing Architectural Invariants

1. **Paise Integer Currency Rule**: All database monetary fields (`Payment.amount`, `Ledger.amountInPaise`) store integer Paise (`Math.round(amount * 100)`). Conversions to INR happen only at the presentation layer.
2. **Tenant Scoping Mandatory**: All database operations touching tenant-scoped entities must include `{ societyId: req.user.societyId }` sourced strictly from verified JWT claims.
3. **Ticket Creator Verdict Exclusivity**: Only the original resident (`createdBy`) who opened a grievance ticket may execute the `PATCH /api/complaints/:id/verdict` settlement action.
4. **Idempotent Webhook Processing**: Replayed Razorpay webhooks return HTTP 200 without mutating ledger records or bill status.

---

## 12. Enterprise Production Roadmap (Next Milestones)

```
SocietyPro_MERN/
│
├── Scheduled Workers & Cron:
│   ├── Automated Monthly Billing Cron (node-cron / BullMQ)
│   └── Late Fee Penalty Accrual Daemon
│
├── Notification Channels:
│   ├── Email Dispatch Service (Nodemailer / SendGrid)
│   └── SMS / WhatsApp Gateways (Twilio)
│
└── Infrastructure & Reliability:
    ├── Redis Cache for Notice Board & Rate Configs
    └── Distributed Rate Limiting (express-rate-limit + Redis Store)
```
