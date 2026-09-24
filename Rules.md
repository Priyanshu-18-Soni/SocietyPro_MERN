# SocietyPro — Project Rules & Contribution Standards

**Document:** Rules.md  
**Version:** 1.0  
**Effective Date:** September 2026  
**Target Audience:** All Software Engineers, Technical Contributors, Code Reviewers, and AI Coding Assistants  
**Scope:** Entire SocietyPro monorepo (`/backend`, `/frontend`, root configurations)  
**Companion Documents:** [PRD.md](./PRD.md) · [Architecture.md](./Architecture.md)

---

## 1. Executive Summary & Purpose

SocietyPro is a multi-tenant housing society management SaaS platform engineered with the MERN stack (MongoDB Atlas, Express.js 5, React 19, Node.js). Because the platform manages real-world financial transactions, confidential resident data, and mission-critical society operations across hundreds of independent housing societies, engineering discipline is paramount.

This document establishes the **mandatory, non-negotiable coding standards, architectural constraints, security boundaries, and lessons learned** across the SocietyPro codebase. 

> [!IMPORTANT]
> **Zero Tolerance Policy:**
> Every pull request, code review, and automated AI generation MUST strictly comply with every rule in this document. Any pull request introducing disallowed libraries, tenant isolation leaks, floating-point financial calculations, deprecated roles, or non-standard API responses will be **automatically rejected**.

---

## 2. Table of Contents

1. [Executive Summary & Purpose](#1-executive-summary--purpose)
2. [Allowed vs Disallowed Libraries & Dependency Governance](#3-allowed-vs-disallowed-libraries--dependency-governance)
3. [Multi-Tenant Isolation & Data Boundary Rules](#4-multi-tenant-isolation--data-boundary-rules)
4. [Financial Data Integrity & Currency Operations](#5-financial-data-integrity--currency-operations)
5. [Error Handling & Standardized API Response Contracts](#6-error-handling--standardized-api-response-contracts)
6. [Role & Permission Guards (RBAC & PBAC)](#7-role--permission-guards-rbac--pbac)
7. [Frontend Architecture & UI Guidelines](#8-frontend-architecture--ui-guidelines)
8. [Security Hygiene & Secrets Management](#9-security-hygiene--secrets-management)
9. [Developer & AI Pre-Commit Checklist](#10-developer--ai-pre-commit-checklist)

---

## 3. Allowed vs Disallowed Libraries & Dependency Governance

Dependency bloat, conflicting packages, and unapproved frameworks compromise system security, inflate bundle sizes, and create maintenance debt. The following rules govern all backend and frontend dependencies.

### 3.1 Backend Dependency Matrix

| Category | Approved & Required Package | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Runtime Framework** | `express` | `^5.2.1` | HTTP routing, REST API controllers, middleware execution |
| **Database ODM** | `mongoose` | `^9.7.4` | MongoDB schemas, validation, transactions, indexing |
| **Authentication** | `jsonwebtoken` | `^9.0.3` | Stateless JWT token issuance and cryptographic verification |
| **Cryptography** | `bcryptjs` | `^3.0.3` | Salted password hashing (min. 10 salt rounds) |
| **Core Utilities** | `crypto` | Built-in | Native Node crypto for HMAC-SHA256 Razorpay webhook signatures |
| **Configuration** | `dotenv` | `^17.4.2` | Loading environment variables from `.env` files |
| **Security / CORS** | `cors` | `^2.8.6` | Cross-Origin Resource Sharing control with frontend origin whitelisting |
| **Payment Gateway** | `razorpay` | `^2.9.8` | Razorpay Orders API, Payment verification, refund processing |
| **Dev Tooling** | `nodemon` | `^3.1.14` | Local hot-reloading development server (devDependency only) |

#### Strictly Disallowed Backend Libraries

* ❌ **NO Firebase / Firestore (`firebase`, `firebase-admin`, `@firebase/*`):**  
  SocietyPro was completely migrated away from a legacy Flutter/Firebase mobile setup to a standalone MERN stack. Under no circumstances should any Firebase package, SDK, or configuration be introduced into the repository.
* ❌ **NO Session-Based Authentication (`express-session`, `cookie-session`, `passport`, `connect-mongo`):**  
  SocietyPro is an explicitly stateless API designed for cloud auto-scaling. All user sessions are governed by short-lived JWT Bearer tokens.
* ❌ **NO Alternative ORMs or ODMs (`prisma`, `sequelize`, `typeorm`, `drizzle-orm`):**  
  Mongoose 9 is the sole approved database abstraction layer. Do not add redundant or conflicting ORMs.
* ❌ **NO Alternative Server Frameworks (`nestjs`, `fastify`, `koa`, `hapi`):**  
  Express 5 is the standardized core framework.
* ❌ **NO Heavy / Deprecated Utilities (`moment`, `lodash`, `underscore`):**  
  Use native modern JavaScript (`Intl.DateTimeFormat`, `Intl.NumberFormat`, modern ES2022+ array/object methods) or lightweight utilities.

### 3.2 Frontend Dependency Matrix

| Category | Approved & Required Package | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Core UI Framework** | `react` & `react-dom` | `^19.2.7` | UI component tree, state management, hooks |
| **Build Tool & Server** | `vite` | `^8.1.1` | High-speed ESM build system, HMR, bundling |
| **CSS Engine** | `tailwindcss` & `@tailwindcss/vite` | `^4.3.2` | Utility-first CSS v4 via `@theme` tokens and zero runtime overhead |
| **Client-Side Routing** | `react-router-dom` | `^7.18.1` | Client routing, route protection, layout nesting |
| **HTTP Client** | `axios` | `^1.18.1` | REST API calls, request/response interceptors for JWT injection |
| **Iconography** | `lucide-react` | `^1.28.0` | Consistent, accessible, tree-shakable SVG icon suite |
| **PDF Generation** | `jspdf` | `^4.0.0` | Client-side vector generation of branded invoice receipts |

#### Strictly Disallowed Frontend Libraries

* ❌ **NO Heavy UI Component Suites (`@mui/material`, `antd`, `chakra-ui`, `semantic-ui`, `primereact`):**  
  Do not install bloated component suites that clash with the custom TailwindCSS v4 design system, bloat bundle size, or introduce competing styling paradigms.
* ❌ **NO Tailwind v3 Legacy Configs (`tailwind.config.js`, PostCSS plugins):**  
  SocietyPro uses TailwindCSS v4 natively configured via `@tailwindcss/vite` and CSS `@import "tailwindcss";`. Do not create legacy v3 configuration files.
* ❌ **NO Unapproved Global State Stores (`redux`, `redux-toolkit`, `mobx`, `recoil`):**  
  Standard application state is cleanly managed via React Context (`AuthContext`) and local component state. If complex caching is needed, propose it through an architectural review.
* ❌ **NO Direct DOM Manipulation or jQuery:**  
  All DOM updates must happen through declarative React state and refs.

---

## 4. Multi-Tenant Isolation & Data Boundary Rules

Multi-tenancy in SocietyPro uses a **shared database, shared schema, discriminator-isolated architecture**. The boundary separating Society A from Society B is purely logical, enforced via database queries. Therefore, a single missing tenant filter can cause catastrophic data leaks.

### 4.1 Rule 1: Authoritative `societyId` Source

```
           ┌────────────────────────────────────────────────────────┐
           │                      Client HTTP Request               │
           └───────────────────────────┬────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Bearer JWT Token: { userId, societyId: "6501...", role: "Resident", ... }       │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │
                                       ▼
                     [tenantMiddleware / authMiddleware]
                                       │
                      Verified & Decoded Cryptographically
                                       │
                                       ▼
                         req.societyId = decoded.societyId
                         req.user.societyId = decoded.societyId
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
     ✅ ALWAYS SOURCE FROM:                ❌ NEVER SOURCE FROM:
     req.societyId / req.user.societyId    req.body.societyId
                                           req.params.societyId
                                           req.query.societyId
```

1. The tenant identifier **MUST ALWAYS** be extracted from the cryptographically verified JWT (`req.societyId` or `req.user.societyId`).
2. **NEVER** trust `req.body.societyId`, `req.query.societyId`, or `req.params.societyId` for access control, query filtering, or database updates.
3. If an endpoint accepts a `societyId` in the body (e.g., during registration before a JWT exists), it must be explicitly validated against system records.

### 4.2 Rule 2: Mandatory Scoping on Every Single Query

Every database query—without exception—targeting a tenant-scoped collection (`User`, `Payment`, `Ledger`, `Complaint`, `Notice`, `RateItem`) MUST include `societyId: req.societyId`.

#### ❌ Dangerous Anti-Pattern (DO NOT DO THIS)
```javascript
// BAD: Vulnerable to cross-tenant data exposure!
exports.getNoticeById = async (req, res) => {
  const { id } = req.params;
  // Flaw: A resident of Society B can fetch a confidential notice from Society A
  const notice = await Notice.findById(id); 
  if (!notice) return res.status(404).json({ success: false, message: 'Notice not found' });
  res.json({ success: true, data: notice });
};
```

#### ✅ Compliant Pattern (MANDATORY STANDARD)
```javascript
// GOOD: Tenant isolation strictly enforced at the database query level
exports.getNoticeById = async (req, res) => {
  const { id } = req.params;
  const notice = await Notice.findOne({ 
    _id: id, 
    societyId: req.societyId // or req.user.societyId
  });
  
  if (!notice) {
    return res.status(404).json({ 
      success: false, 
      message: 'Notice not found or access denied' 
    });
  }
  
  res.status(200).json({ success: true, message: 'Notice fetched successfully', data: notice });
};
```

### 4.3 Rule 3: Single Document Mutation Verification

When updating or deleting documents by ID, you must either include `societyId` in the query condition or verify tenant ownership before mutating:

```javascript
// PREFERRED: Atomic scoped mutation
const updatedResident = await User.findOneAndUpdate(
  { _id: req.params.id, societyId: req.societyId },
  { $set: updateData },
  { new: true, runValidators: true }
);

if (!updatedResident) {
  return res.status(404).json({ 
    success: false, 
    message: 'Resident not found in this society' 
  });
}
```

If a document must be retrieved first for business logic checks:
```javascript
const complaint = await Complaint.findById(req.params.id);
if (!complaint || String(complaint.societyId) !== String(req.societyId)) {
  return res.status(404).json({ 
    success: false, 
    message: 'Complaint not found or access denied' 
  });
}
```

### 4.4 Rule 4: Aggregation Pipeline Tenant Isolation

In Mongoose aggregation pipelines, the `$match` stage for `societyId` **MUST BE THE ABSOLUTE FIRST STAGE** in the pipeline array. Placing it after `$lookup` or `$unwind` causes severe performance degradation and risks cross-tenant data leakage.

```javascript
// MANDATORY Aggregation Pattern
const societyStats = await Payment.aggregate([
  // STAGE 1: MUST ALWAYS BE THE TENANT MATCH
  { 
    $match: { 
      societyId: new mongoose.Types.ObjectId(req.societyId),
      status: 'Paid'
    } 
  },
  // Subsequent stages are safely bounded to this tenant
  {
    $group: {
      _id: '$paymentType',
      totalCollected: { $sum: '$amount' }
    }
  }
]);
```

### 4.5 Rule 5: Zero Raw ID & Sensitive Data Leakage

1. **No External Tenant References:** Never return objects containing `societyId`, `razorpayKeySecret`, or other tenants' data in client-facing responses unless the user is a `SocietyOwner` viewing their own society's public metadata.
2. **Password & Token Exclusion:** Queries returning user objects must explicitly exclude sensitive fields:
   ```javascript
   const residents = await User.find({ societyId: req.societyId })
     .select('-password -__v');
   ```
3. **Cross-Tenant Society Code Guessing:** Society codes (`societyCode`, e.g., `"GOKUL-402"`) are public onboarding keys, but must never reveal member rosters or internal financial ledgers without authentication and approval.

---

## 5. Financial Data Integrity & Currency Operations

Financial calculation errors, currency discrepancies, and rounding bugs destroy user trust and cause regulatory non-compliance. In SocietyPro, financial operations are governed by strict mathematical laws.

### 5.1 The Absolute Integer Paise Rule

> [!CAUTION]
> **Floating-Point Storage is Strictly Forbidden:**  
> Never store monetary balances, invoice totals, payment amounts, or penalty fees as floating-point numbers (`1250.50`).  
> All monetary values in the database and in Razorpay API interactions **MUST BE INTEGERS IN PAISE** (1 INR = 100 Paise).

* ₹500.00 is stored as integer `50000`.
* ₹1,250.75 is stored as integer `125075`.
* ₹0.50 is stored as integer `50`.

### 5.2 Floating-Point Arithmetic Traps & Prevention

JavaScript uses IEEE 754 double-precision floats:
```javascript
// The JavaScript Float Trap:
0.1 + 0.2 === 0.30000000000000004 // TRUE!
(199.99 * 100) === 19998.999999999996 // TRUE!
```
To prevent rounding drift across thousands of transactions:
1. **Never accumulate balances in floating-point rupees.**
2. When converting user input in Rupees to Paise, **ALWAYS use `Math.round()`**:
   ```javascript
   // Mandatory conversion pattern:
   const amountInPaise = Math.round(Number(amountInRupees) * 100);
   ```
3. Never use `toFixed(2)` for financial calculations; `toFixed` returns a string and introduces rounding truncation. Only use it at the final UI presentation layer.

### 5.3 Currency Helper Utility Standards

All currency conversions must route through centralized utility functions located in `utils/currency.js` (backend) and `src/utils/currency.js` (frontend):

```javascript
// backend/utils/currency.js or frontend/src/utils/currency.js

/**
 * Converts Rupee input (string or number) to integer Paise.
 * @param {number|string} rupees 
 * @returns {number} Integer paise
 */
export const toPaise = (rupees) => {
  const parsed = Number(rupees);
  if (isNaN(parsed) || parsed < 0) {
    throw new Error('Invalid monetary amount provided');
  }
  return Math.round(parsed * 100);
};

/**
 * Converts integer Paise to Rupees for calculations or API output.
 * @param {number} paise 
 * @returns {number} Rupee float
 */
export const toRupees = (paise) => {
  return Number(paise) / 100;
};

/**
 * Formats integer Paise into a localized Indian Rupee currency string.
 * Example: 125075 paise -> "₹1,250.75"
 * @param {number} paise 
 * @returns {string} Formatted INR string
 */
export const formatINR = (paise) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(toRupees(paise));
};
```

### 5.4 Razorpay Integration Standards

1. **Order Creation:** The `amount` parameter sent to Razorpay's Orders API (`razorpay.orders.create({ amount, currency: 'INR', ... })`) **MUST be an integer in Paise**.
2. **Cryptographic Webhook Verification:**
   Every incoming Razorpay webhook MUST verify the `x-razorpay-signature` header against the raw body using `crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)`:
   ```javascript
   const crypto = require('crypto');
   
   const expectedSignature = crypto
     .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
     .update(req.rawBody || JSON.stringify(req.body))
     .digest('hex');

   if (expectedSignature !== req.headers['x-razorpay-signature']) {
     return res.status(400).json({ success: false, message: 'Invalid signature' });
   }
   ```
3. **Payment Idempotency:** Webhook handlers must verify if the payment order has already been processed (`status: 'Paid'`) before crediting the resident's ledger to prevent double-crediting on webhook retries.

### 5.5 Rate Items Inconsistency Rule

> [!NOTE]
> **Known Codebase Debt & Migration Rule:**  
> In early iterations, `Society.defaultRateItems[].amount` and `User.customRateItems[].amount` were stored as Rupee floats.  
> Whenever writing new billing logic, ledger calculations, or invoice generators:
> * Treat all bill outputs as **Paise**.
> * Explicitly convert legacy rate amounts to Paise via `toPaise(rate.amount)` before performing billing calculations.
> * Never introduce new models or fields storing Rupee floats.

### 5.6 Automated Rate Engine & Batch Billing Invariant

1. **Non-Negative Values**: All unit configurations (`sqftArea`, `ratePerSqft`, `fixedRate`, `parkingCharges`, `waterCharges`) must be non-negative numbers.
2. **Formula Integrity**: The base maintenance calculation must strictly evaluate:
   $$\text{Base} = (\text{billingType} === \text{'sqft\_based'}) \,?\, (\text{sqftArea} \times \text{ratePerSqft}) : \text{fixedRate}$$
   $$\text{Total} = \text{Base} + \text{parkingCharges} + \text{waterCharges}$$
3. **Paise Boundary Enforcement**: The final total must immediately be converted into Paise via integer rounding (`Math.round(total * 100)`) before saving to `Payment.amount` or generating payment gateway orders.
4. **Batch Operation Tenancy**: In `generateBulkBills`, the batch invoice query must filter strictly by `{ societyId: req.user.societyId, role: 'Resident', status: 'active' }`. No inactive, pending, or cross-tenant accounts may receive bills.

---

## 6. Error Handling & Standardized API Response Contracts

Consistency in API responses ensures frontend stability, clean error boundary handling, and predictable debugging logs.

### 6.1 Standard JSON Response Contract

Every single controller, middleware rejection, and error handler in SocietyPro MUST return responses conforming to this exact TypeScript-like structure:

```typescript
interface ApiResponse<T = any> {
  success: boolean;       // MANDATORY: true for 2xx, false for 4xx/5xx
  message: string;        // MANDATORY: Human-readable feedback for user toast/alert
  data?: T;               // OPTIONAL: Payload object or array (present on success)
  error?: string | any;   // OPTIONAL: Machine error code or detailed failure info
}
```

#### Success Examples
```javascript
// 200 OK — Data Retrieval
res.status(200).json({
  success: true,
  message: 'Residents fetched successfully',
  data: residents
});

// 201 Created — Resource Creation
res.status(201).json({
  success: true,
  message: 'Notice published successfully',
  data: newNotice
});
```

#### Failure Examples
```javascript
// 400 Bad Request — Validation Failure
res.status(400).json({
  success: false,
  message: 'Invalid input: Flat number and wing are required',
  error: 'VALIDATION_FAILED'
});

// 403 Forbidden — Permission Failure
res.status(403).json({
  success: false,
  message: 'Access denied: You lack the manageBills permission',
  error: 'INSUFFICIENT_PERMISSIONS'
});

// 404 Not Found — Resource Absence
res.status(404).json({
  success: false,
  message: 'Complaint not found or does not belong to your society',
  error: 'RESOURCE_NOT_FOUND'
});
```

### 6.2 HTTP Status Code Semantics

Developers must use the semantically correct HTTP status code:

| Status Code | Label | Usage in SocietyPro |
| :--- | :--- | :--- |
| **`200`** | OK | Successful `GET`, `PUT`, `PATCH`, or idempotent state update |
| **`201`** | Created | Successful `POST` resulting in new document creation (`Notice`, `Payment`) |
| **`400`** | Bad Request | Missing required fields, malformed payload, invalid format |
| **`401`** | Unauthorized | Missing JWT, expired JWT, cryptographic token verification failure |
| **`403`** | Forbidden | Valid JWT, but user lacks role/permission, or user status is `Pending` |
| **`404`** | Not Found | Target document does not exist within the caller's tenant boundary |
| **`409`** | Conflict | Duplicate entry (e.g., email already registered, flat already occupied) |
| **`422`** | Unprocessable Entity | Semantically valid payload that violates business logic (e.g., negative payment) |
| **`500`** | Internal Server Error | Unhandled server exception, database connectivity failure |

### 6.3 Process Stability & Global Error Middleware

1. **Never Crash the Node Process:**  
   Unhandled promise rejections and synchronous exceptions must never kill the server process. Express 5 automatically forwards unhandled rejected promises from route handlers to the error middleware.
2. **Global Error Handling Middleware:**  
   The global error handler in `server.js` must be registered after all route definitions and must conform to:
   ```javascript
   // server.js - Global Error Middleware (Registered last)
   app.use((err, req, res, next) => {
     console.error(`[Unhandled Error] ${req.method} ${req.url}:`, err);

     const statusCode = err.statusCode || 500;
     const response = {
       success: false,
       message: statusCode === 500 
         ? 'An internal server error occurred. Please try again later.' 
         : err.message,
       error: process.env.NODE_ENV === 'production' 
         ? 'INTERNAL_SERVER_ERROR' 
         : err.stack || err.message
     };

     res.status(statusCode).json(response);
   });
   ```
3. **No Plain Text Responses:** Never use `res.send("Error message")` or `res.end()`. Always use `res.status(code).json(...)`.

---

## 7. Role & Permission Guards (RBAC & PBAC)

SocietyPro employs a hybrid model: **Role-Based Access Control (RBAC)** combined with **Permission-Based Access Control (PBAC)** for managing committee delegation.

### 7.1 The Three Permitted Roles

The database `User` schema enum strictly recognizes exactly three roles:

```
                          ┌──────────────────────────┐
                          │   Valid System Roles     │
                          └─────────────┬────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
   'SocietyOwner'                  'Committee'                  'Resident'
   Master creator of society       Delegated administrative     Flat owner / tenant
   Unrestricted tenant access      Gated by granular flags      Personal self-service only
```

> [!WARNING]
> ### 🚨 The Banned 'SocietyAdmin' Role — A Critical Lesson Learned
> 
> * **DO NOT EVER USE `'SocietyAdmin'` ANYWHERE IN THE CODEBASE.**
> * **Historical Incident:** In an earlier iteration, `App.jsx` (line 63) and `Layout.jsx` (line 55) checked for `user.role === 'SocietyAdmin'`. Because the database schema and authentication tokens only issue `'SocietyOwner'` and `'Committee'`, this typographical error locked residents and owners out of legitimate navigation routes and broke the `/residents` directory page.
> * **Rule:** Any reference to `'SocietyAdmin'` in frontend routes, backend controllers, seed scripts, or documentation is considered a critical defect and will fail CI/CD validation.

### 7.2 The Granular Permission Matrix for Committee Members

`SocietyOwner` possesses implicit administrative authority over all society features. However, users with role `'Committee'` MUST be verified against the granular permissions array (`user.permissions`):

| Permission Key | Permitted Actions |
| :--- | :--- |
| **`manageResidents`** | Approve/reject pending resident signups, assign flat numbers, update resident roles, deboard residents |
| **`manageBills`** | Create bills, update maintenance fee structures, record offline cash payments, trigger dues reminders |
| **`manageNotices`** | Create, publish, pin, edit, and archive society announcements |
| **`resolveComplaints`**| View all resident grievances, change status (`In Progress`, `Resolved`), assign tickets |
| **`manageSociety`** | Edit society profile, bank details, wings/blocks layout, amenity definitions |

### 7.3 Middleware Implementation Standards

Controllers must never check role strings or permissions inline if a standard route middleware can enforce it upfront.

#### Route Middleware Chaining Pattern
```javascript
// routes/billingRoutes.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireActiveUser } = require('../middleware/requireActiveUser');
const { requirePermission } = require('../middleware/requirePermission');
const billingController = require('../controllers/billingController');

// All billing routes require authentication and an active, approved account
router.use(authMiddleware);
router.use(requireActiveUser);

// Residents and Committee with manageBills can view bills
router.get('/my-bills', billingController.getMyBills);

// ONLY SocietyOwner or Committee members with 'manageBills' can generate new invoices
router.post(
  '/generate',
  requirePermission('manageBills'),
  billingController.generateMonthlyBills
);

module.exports = router;
```

#### `requirePermission` Implementation Standard
```javascript
// middleware/requirePermission.js
exports.requirePermission = (permissionKey) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // SocietyOwner has master authority across all features
    if (req.user.role === 'SocietyOwner') {
      return next();
    }

    // Committee members must have the specific permission flag
    if (
      req.user.role === 'Committee' && 
      Array.isArray(req.user.permissions) && 
      req.user.permissions.includes(permissionKey)
    ) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied: Requires '${permissionKey}' permission`,
      error: 'INSUFFICIENT_PERMISSIONS'
    });
  };
};
```

### 7.4 The Resident Gatekeeper Rule (`requireActiveUser`)

1. Residents onboarding via `societyCode` start in `status: 'Pending'`.
2. Until a `SocietyOwner` or a Committee member with `manageResidents` approves them, their status remains `'Pending'`.
3. The `requireActiveUser` middleware **MUST intercept all operational routes**. If a user's status is `'Pending'` or `'Suspended'`, the middleware must return HTTP 403:
   ```javascript
   if (req.user.status !== 'Active') {
     return res.status(403).json({
       success: false,
       message: 'Your account is pending society committee approval.',
       error: 'ACCOUNT_INACTIVE'
     });
   }
   ```

### 7.5 Ticket Creator Settlement Verdict Invariant

1. **Exclusivity**: Only the original resident who raised a grievance ticket (`String(complaint.createdBy) === String(req.user.id)`) possesses authority to submit a resolution verdict (`PATCH /api/complaints/:id/verdict`).
2. **Deterministic Auto-Transitions**:
   - Setting `verdict = 'confirmed'` triggers automatic status closure (`status = 'closed'`).
   - Setting `verdict = 'reopened'` triggers automatic status reopening (`status = 'open'`).
3. **Immutability of Closed Verdicts**: Once a ticket is marked `'confirmed'`, it cannot be altered by committee members or unauthorized third parties.

### 7.6 Gatekeeper Polling & Token Refresh Lifecycle

1. **Stateless Status Check**: The endpoint `GET /api/auth/check-status` must be protected by `tenantMiddleware` and query live database status.
2. **Fresh JWT Issuance**: Upon transitioning to `status: 'active'`, the server MUST issue a freshly minted JWT containing updated active claims and return it alongside the updated user object.
3. **Client Silent Refresh**: The frontend polling hook (`PendingApproval.jsx`) must update `localStorage` and `AuthContext` state immediately with the new token before clearing the polling timer and routing to `/dashboard`.

### 7.7 Notice Pinning & Tri-Level Sort Invariant

1. **Personal Scoping**: Pinned notice state is per-resident. Toggling pins modifies the `pinnedBy: [User ObjectId]` array using atomic `$addToSet` or `$pull`.
2. **Tri-Level Sort Hierarchy**: All notice list queries must sort records strictly in this order:
   1. `isPriority: true` (Society-wide emergency announcements)
   2. Personally Pinned (`pinnedBy` includes current user ID)
   3. `createdAt: -1` (Recency)

### 7.8 Continuous Documentation Parity Invariant

Every sprint, feature addition, or schema refactoring MUST update all 6 core documentation blueprint files concurrently:
1. `PRD.md`: Requirements, features, user personas, and data models.
2. `Architecture.md`: System diagrams, middleware matrix, schemas, and API lifecycles.
3. `Design.md`: UI components, design tokens, modals, and interaction states.
4. `Memory.md`: Sprint logs, API contracts, edge case defenses, and test results.
5. `Phases.md` / `Phase.md`: Milestone progress tracking and task completion matrices.
6. `Rules.md`: Non-negotiable architectural rules, dependency governance, and invariants.

No code changes may be submitted with unresolved documentation drift.

---

## 8. Frontend Architecture & UI Guidelines

### 8.1 API Communication via Axios

All HTTP communication with the backend must use the pre-configured Axios instance (`src/api/axios.js`):

1. **Automatic Token Injection:** The request interceptor must automatically attach `Authorization: Bearer <token>` from `localStorage`.
2. **Global 401 Interceptor:** If the API returns HTTP 401, the response interceptor must purge stored authentication data and redirect to `/login`.
3. **Environment-Based Base URL:** Never hardcode `http://localhost:5000`. Use `import.meta.env.VITE_API_BASE_URL || '/api'`.

```javascript
// src/api/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('societypro_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('societypro_token');
      localStorage.removeItem('societypro_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 8.2 Client-Side Route Protection

All private routes in `App.jsx` must be wrapped in `ProtectedRoute`:
* Verify authentication status.
* Direct pending users to the Waiting for Approval screen.
* Verify user roles and permissions before rendering privileged layouts.

### 8.3 TailwindCSS v4 Styling Rules

1. **Utility-First Styling:** Use Tailwind utility classes for all styling. Do not write custom CSS rules or ad-hoc style tags unless defining global CSS variables or complex animations.
2. **Responsive Design:** Every page must be fully responsive (mobile-first approach: `sm:`, `md:`, `lg:`, `xl:`).
3. **Design Tokens:** Use established color tokens (`slate-*`, `emerald-*`, `indigo-*`, `amber-*`, `rose-*`).
4. **Icons:** Use icons exclusively from `lucide-react`. Maintain consistent sizing (`w-4 h-4`, `w-5 h-5`).

---

## 9. Security Hygiene & Secrets Management

1. **Never Commit Secrets:**  
   Never commit `.env`, `.env.local`, API keys, database connection strings, or JWT secrets to Git. Maintain a clean `.env.example` in both `/backend` and `/frontend`.
2. **Bcrypt Salt Rounds:**  
   Password hashing must always use `bcryptjs.hash(password, 10)`. Never store plain-text passwords.
3. **JWT Secret Entropy:**  
   Production JWT secrets must be at least 32 characters of random alphanumeric entropy.
4. **NoSQL Injection Prevention:**  
   Mongoose models enforce strict schema types. Avoid passing raw, unsanitized user objects directly into queries (e.g., `Model.find(req.body)` is strictly prohibited). Always extract and validate individual fields.
5. **CORS Whitelisting:**  
   Production backend must only allow requests from verified frontend origins configured via `CLIENT_URL`.

---

## 10. Developer & AI Pre-Commit Checklist

Before submitting code, creating a pull request, or finalizing an automated code generation task, run through this checklist:

| # | Check Item | Status |
| :---: | :--- | :---: |
| 1 | **Dependencies:** Only approved libraries are installed (Express 5, Mongoose 9, React 19, Tailwind v4, Lucide). No Firebase, no session auth, no heavy UI suites. | [ ] |
| 2 | **Tenant Isolation:** Every Mongoose query filters by `societyId: req.societyId` or `req.user.societyId`. No tenant IDs accepted from `req.body` or `req.query`. | [ ] |
| 3 | **Document Ownership:** Single-document mutations (`findByIdAndUpdate`, `deleteOne`) verify that the document belongs to `req.societyId`. | [ ] |
| 4 | **Aggregation Pipeline:** The `$match: { societyId: ... }` stage is the FIRST stage in all aggregation pipelines. | [ ] |
| 5 | **Paise Standard:** All monetary values in the database, models, and Razorpay orders are integers in Paise. No floats. | [ ] |
| 6 | **Financial Math:** All Rupee-to-Paise conversions use `Math.round(amount * 100)`. No floating-point addition for balances. | [ ] |
| 7 | **Response Shape:** All controllers return `{ success: boolean, message: string, data?: any, error?: string }`. | [ ] |
| 8 | **Error Handling:** Global Express error middleware handles failures without crashing the Node.js process. | [ ] |
| 9 | **Role Enums:** Only `'SocietyOwner'`, `'Committee'`, and `'Resident'` are used. **ZERO** references to `'SocietyAdmin'`. | [ ] |
| 10| **Committee PBAC:** Privileged committee endpoints enforce granular permissions (`requirePermission('...')`). | [ ] |
| 11| **Active Gatekeeper:** Protected routes are guarded by `requireActiveUser` to block unapproved pending residents. | [ ] |
| 12| **Secrets & Env:** No hardcoded API keys, secrets, or connection URIs committed to repository files. | [ ] |

---

*This document is maintained by the SocietyPro Core Architecture Team. For questions or proposed amendments, submit an RFC to the repository maintainers.*
