# SocietyPro — Project Memory & Context State
**Persistent Development Knowledge Base across AI Sessions & Sprints**  
**Version:** 1.0 • September 2026  
**Companion Documents:** [PRD.md](./PRD.md) • [Architecture.md](./Architecture.md) • [Rules.md](./Rules.md) • [Phases.md](./Phases.md) • [Design.md](./Design.md)

---

## 1. Project Snapshot

| Parameter | Specification | Notes |
| :--- | :--- | :--- |
| **Project Name** | **SocietyPro** | Multi-tenant SaaS for housing society administration & billing |
| **Heritage** | Migrated from Flutter/Firebase | Rebuilt from scratch onto modern production MERN stack |
| **Backend Lead** | **Pushkar** | Express 5, Mongoose 9, Node.js 22, JWT, Razorpay SDK, RBAC |
| **Frontend Lead** | **Astha** | React 19, Vite, TailwindCSS v4, React Router DOM v7, Axios |
| **Database** | MongoDB Atlas (Shared Cluster) | Strict tenant-isolated shared database architecture |
| **Payment Gateway** | Razorpay Test API | Paired with cryptographic webhook verification pipeline |

### Tech Stack Versions
- **Backend**:
  - Node.js: `v22.x`
  - Express: `v5.1.0`
  - Mongoose: `v9.2.1`
  - JSONWebToken (`jsonwebtoken`): `v9.0.3`
  - Password Hashing (`bcryptjs`): `v3.0.3`
  - Razorpay Node SDK: `v2.9.6`
  - CORS: `v2.8.6`, Dotenv: `v17.3.1`
- **Frontend**:
  - React: `v19.2.7`, React-DOM: `v19.2.7`
  - Build Tool: Vite `v8.1.1` (`@vitejs/plugin-react: ^6.0.3`)
  - CSS Engine: TailwindCSS `v4.3.2` (`@tailwindcss/vite: ^4.3.2` with native `@theme` directives)
  - Routing: React Router DOM `v7.18.1`
  - HTTP Client: Axios `v1.18.1`
  - Iconography: Lucide React `v1.28.0`

---

## 2. Architecture State

### 2.1 Active Role & Permission Model
The legacy role naming (`SocietyAdmin`) has been phased out in favor of 3 primary tenant roles and 1 platform role:

```
                  ┌──────────────────────┐
                  │      SuperAdmin      │ (Platform Operator / Multi-Society)
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   ┌──────────────────┐             ┌───────────────────┐
   │   SocietyOwner   │             │     Committee     │
   │ (Master Tenant)  │             │ (Granular RBAC)   │
   └────────┬─────────┘             └─────────┬─────────┘
            │                                 │
            │   manageResidents, manageBills  │
            │   manageSociety, manageNotices  │
            │   resolveComplaints             │
            │                                 │
            └────────────────┬────────────────┘
                             ▼
                    ┌──────────────────┐
                    │     Resident     │ (status: pending | active | rejected)
                    └──────────────────┘
```

1. **`SuperAdmin`**: Platform-wide management, society registration, global auditing.
2. **`SocietyOwner`**: Master administrator for a specific housing society tenant. Possesses implicit override permissions across all modules.
3. **`Committee`**: Role labels like Secretary, Treasurer, or Joint Secretary. Access is governed by boolean permission flags on the user document:
   - `permissions.manageResidents`
   - `permissions.manageBills`
   - `permissions.manageSociety`
   - `permissions.manageNotices`
   - `permissions.resolveComplaints`
4. **`Resident`**: Flat/Unit occupant. Begins in `pending` state upon registration using a `societyCode` until approved by a committee member with `manageResidents` or `SocietyOwner`.

---

### 2.2 Multi-Tenant Isolation Mechanism
- **Shared DB Architecture**: All societies share a single MongoDB cluster and database, with complete isolation enforced at the application layer.
- **Tenant Key (`societyCode`)**: 6-character alphanumeric code (e.g. `ABC123`) generated on society creation. Used by residents to identify their society during self-registration.
- **`tenantMiddleware` Injection**: Decodes JWT and attaches `req.societyId = req.user.societyId`.
- **Golden Rule**: **Every database query mutating or fetching tenant data MUST include `{ societyId: req.societyId }`**.
- **Gatekeeper Middleware (`requireActiveUser`)**: Enforces `req.user.status === 'active'`. Blocks unverified residents (`pending` or `rejected`) with HTTP 403 and specialized error codes.

---

### 2.3 MongoDB Atlas Connection & DNS Resolution
- **Direct Shard URI vs `mongodb+srv://`**: Standard SRV connection strings frequently cause `querySrv ENOTFOUND` or DNS timeouts on Windows development environments due to local ISP DNS resolvers.
- **Production Setting**: The project utilizes the explicit direct shard connection string:
  ```env
  MONGO_URI=mongodb://<user>:<password>@ac-yi0viep-shard-00-00.cz4oab9.mongodb.net:27017,ac-yi0viep-shard-00-01.cz4oab9.mongodb.net:27017,ac-yi0viep-shard-00-02.cz4oab9.mongodb.net:27017/?ssl=true&replicaSet=atlas-cvd60t-shard-0&authSource=admin&appName=SocietyPro-Cluster
  ```
- **IPv4 Priority Enforcement**: To prevent Node.js 22 IPv6 resolution delays, `dns.setDefaultResultOrder('ipv4first')` is executed at the top of `backend/server.js`.

---

## 3. Current Implementation Status

### 3.1 Actively Working & Fully Tested
- [x] **Atlas Database Connection**: Verified with IPv4 DNS ordering.
- [x] **Owner & Society Registration** (`POST /api/auth/register-owner`): Automatically creates `Society` document, assigns 6-char `societyCode`, generates `SocietyOwner` user with `status: 'active'`.
- [x] **Resident Registration** (`POST /api/auth/register-resident`): Validates `societyCode`, checks unit number, initializes resident with `status: 'pending'`.
- [x] **Gatekeeper Lifecycle & Moderation**:
  - Middleware `requireActiveUser`: Bypasses Owner/Committee, performs live DB check on Residents, returns `403` with `{ code: 'ACCOUNT_INACTIVE', message: 'Account awaiting committee approval' }` if not `'active'`.
  - `GET /api/users/residents/pending`: Fetches pending residents for tenant.
  - `PATCH /api/users/residents/:id/approve`: Approves resident (`status: 'active'`).
  - `PATCH /api/users/residents/:id/reject`: Rejects resident (`status: 'rejected'`).
  - Guarded by `requirePermission('manageResidents')` or `SocietyOwner`.
- [x] **Grievance Redressal Engine (Complaints)**:
  - `Complaint` schema with `societyId`, `createdBy`, `flatNo`, `title`, `description`, `imageUrl`, `affectedFlats`, `status`, `verdict`.
  - `POST /api/complaints`: Creates ticket, records creator flat in `affectedFlats`.
  - `GET /api/complaints`: Scoped to `societyId`, supports `?status=` filtering.
  - `PATCH /api/complaints/:id/upvote`: Atomic `$addToSet` flatNo into `affectedFlats`.
  - `PATCH /api/complaints/:id/status`: Updates ticket status (`open`, `in_progress`, `resolved`, `closed`), guarded by `requirePermission('resolveComplaints')` or `SocietyOwner`.
  - `PATCH /api/complaints/:id/verdict`: Ticket creator only; sets `verdict` to `'confirmed'` (closing ticket) or `'reopened'` (reopening ticket).
- [x] **Notice Board Engine**:
  - `Notice` schema with `societyId`, `title`, `body`, `isPriority`, `pinnedBy`, `createdBy`.
  - `GET /api/notices`: Returns notices sorted by `isPriority: -1, createdAt: -1`.
  - `POST /api/notices`: Creates notice, guarded by `requirePermission('manageNotices')` or `SocietyOwner`.
  - `PATCH /api/notices/:id/pin`: Toggles user `_id` in `pinnedBy` array.
  - `DELETE /api/notices/:id`: Deletes notice with tenant scoping and permission checks.
- [x] **Treasury Ledger & Razorpay Webhooks**:
  - `Ledger` schema storing financial values in integer `amountInPaise` with `amountInRupees` virtual getter, `type` (`income` | `expense`), `category`, `paymentMethod`, `referenceBillId`.
  - `POST /api/finances/expenses`: Records manual expense in Paise, guarded by `requirePermission('manageBills')` or `SocietyOwner`.
  - `GET /api/finances/metrics`: Aggregates `totalIncome`, `totalExpense`, `netBalance` (in Rupees) via MongoDB aggregation pipeline and lists ledger transactions.
  - `POST /api/payments/webhook`: Validates Razorpay HMAC-SHA256 signature using `RAZORPAY_WEBHOOK_SECRET` over raw request buffer, marks bill `captured`, and automatically writes an `income` entry in `Ledger`.
- [x] **Bill Generation & Payment Engine**:
  - `POST /api/payments/generate-bill`: Generates bill records in Paise.
  - `POST /api/payments/create-order`: Validates bill ownership and generates Razorpay order.
  - `POST /api/payments/verify`: Verifies payment signature, updates bill status, and creates automated Ledger income.
- [x] **Committee Provisioning**: `POST /api/committee` allows SocietyOwner to appoint committee members and delegate granular permissions.
- [x] **Frontend UI Pages**:
  - `Login.jsx` & `Register.jsx`: Multi-step auth flows with role toggles.
  - `Dashboard.jsx`: Role-specific view with quick metrics and links.
  - `SocietyManagement.jsx`: View society info, default rates, and society code.
  - `CommitteeManagement.jsx`: Roster of committee members and permission editors.
  - `ResidentManagement.jsx`: Resident directory with search, filtering, and modal editing.
  - `Payments.jsx`: Resident bill view with integrated Razorpay modal checkout and payment status tabs.

---

### 3.2 Recent Bug Fixes & Refactors
1. **Elimination of Legacy `SocietyAdmin`**:
   - Updated role checks and route guards to standard `SocietyOwner` or `Committee` with `permissions.manageResidents`.
2. **Dashboard Role Dispatching Fix**:
   - Fixed `Dashboard.jsx` role dispatch to separate Owner/Committee from Resident views.
3. **Cross-Tenant ID Probing & Information Leak Elimination**:
   - Replaced `findById(id)` + 403 checks with atomic compound scoping `findOne({ _id: id, societyId: req.user.societyId })`, immediately returning 404 `'Resource not found'` on miss.
4. **Unified API Base URL & Environment Config**:
   - Dynamic axios baseURL and environment templates `.env.example`.
5. **Monetary Unit Unification into Paise**:
   - All internal calculations and database storage unified to integer Paise (`INR * 100`).
6. **Mongoose 9 Deprecation Removal**:
   - Replaced `{ new: true }` with `{ returnDocument: 'after' }` in `userController.js`, `complaintController.js`, and `paymentController.js`.

---

### 3.3 Autonomous Verification Suite Results (`backend/test_backend_suite.js`)
Real HTTP integration test script executing against live Express 5 backend and MongoDB Atlas:
- **Scenario A: Owner & Society Registration** -> Creates society and owner (`status: 'active'`).
- **Scenario B: Resident Registration** -> Registers resident with `societyCode` (`status: 'pending'`).
- **Scenario C: Gatekeeper Verification** -> Accessing `/api/complaints` as pending resident -> **HTTP 403 Forbidden** (`code: 'ACCOUNT_INACTIVE'`).
- **Scenario D: Resident Approval Lifecycle** -> Pending list contains resident -> Owner approves -> complaints route now returns **HTTP 200 OK**.
- **Scenario E: Grievance Redressal Engine** -> Complaint filed (`affectedFlats: ['B-404']`) -> Second resident upvotes (`affectedFlats` length increases to 2) -> Committee updates status to `in_progress` -> Creator confirms verdict (`verdict: 'confirmed'`, status auto-closed).
- **Scenario F: Notice Board Engine** -> Notice posted with `isPriority: true` -> Resident pins notice (`pinnedBy` array contains user ID) -> Resident unpins notice.
- **Scenario G: Treasury Ledger & Financial Metrics** -> Manual expense recorded (₹2,500 = 250,000 paise) -> Metrics fetched -> `totalIncome: 0`, `totalExpense: 2500`, `netBalance: -2500`.
- **Scenario H: Cross-Tenant Isolation Enforcement** -> Tenant B attempts to fetch Tenant A's complaint -> **HTTP 404 Resource not found**. Tenant B attempts to upvote Tenant A's complaint -> **HTTP 404 Resource not found**.
- **Scenario I: Razorpay Webhook Simulation** -> HMAC-SHA256 signature calculated over raw body -> `/api/payments/webhook` processes `payment.captured` -> bill marked `captured` and `income` entry logged to `Ledger` -> financial metrics update accurately (`totalIncome: 1500`, `netBalance: -1000`).

**Test Execution Summary:**
```
============================================================
TOTAL TESTS RUN: 43
PASSED: 43
FAILED: 0
SUCCESS RATE: 100.0%
============================================================
```

---

### 3.4 Finalized API Contract Table (New Endpoints)

| Endpoint | Method | Guard / Auth | Request Body | Success Response |
| :--- | :---: | :--- | :--- | :--- |
| `/api/users/residents/pending` | `GET` | `tenantMiddleware`, `requirePermission('manageResidents')` | None | `200 { pendingResidents: [...] }` |
| `/api/users/residents/:id/approve` | `PATCH` | `tenantMiddleware`, `requirePermission('manageResidents')` | None | `200 { message: 'Resident approved successfully', resident }` |
| `/api/users/residents/:id/reject` | `PATCH` | `tenantMiddleware`, `requirePermission('manageResidents')` | None | `200 { message: 'Resident rejected successfully', resident }` |
| `/api/complaints` | `POST` | `tenantMiddleware`, `requireActiveUser` | `{ title, description, imageUrl? }` | `201 { message: 'Complaint filed successfully', complaint }` |
| `/api/complaints` | `GET` | `tenantMiddleware`, `requireActiveUser` | Query: `?status=` | `200 { complaints: [...] }` |
| `/api/complaints/:id/upvote` | `PATCH` | `tenantMiddleware`, `requireActiveUser` | None | `200 { message: 'Complaint upvoted successfully', complaint }` |
| `/api/complaints/:id/status` | `PATCH` | `tenantMiddleware`, `requirePermission('resolveComplaints')` | `{ status: 'open'\|'in_progress'\|'resolved'\|'closed' }` | `200 { message: 'Complaint status updated successfully', complaint }` |
| `/api/complaints/:id/verdict` | `PATCH` | `tenantMiddleware`, `requireActiveUser` (Creator Only) | `{ verdict: 'confirmed'\|'reopened' }` | `200 { message: 'Complaint verdict set to...', complaint }` |
| `/api/notices` | `GET` | `tenantMiddleware`, `requireActiveUser` | None | `200 { notices: [...] }` |
| `/api/notices` | `POST` | `tenantMiddleware`, `requirePermission('manageNotices')` | `{ title, body, isPriority? }` | `201 { message: 'Notice published successfully', notice }` |
| `/api/notices/:id/pin` | `PATCH` | `tenantMiddleware`, `requireActiveUser` | None | `200 { message: 'Notice pinned'\|'unpinned', isPinned, notice }` |
| `/api/notices/:id` | `DELETE` | `tenantMiddleware`, `requirePermission('manageNotices')` | None | `200 { message: 'Notice deleted successfully' }` |
| `/api/finances/expenses` | `POST` | `tenantMiddleware`, `requirePermission('manageBills')` | `{ category, amount, paymentMethod, description }` | `201 { message: 'Expense recorded successfully', ledgerEntry }` |
| `/api/finances/metrics` | `GET` | `tenantMiddleware`, `requireActiveUser` | None | `200 { metrics: { totalIncome, totalExpense, netBalance, totalTransactions }, entries: [...] }` |
| `/api/payments/webhook` | `POST` | Razorpay HMAC Header `x-razorpay-signature` | Razorpay Webhook Event Payload | `200 { received: true, message: 'Webhook processed successfully' }` |

---

## 4. Immediate Next Steps (Phase 7: Frontend Consumption)

Now that the backend is 100% complete and certified with zero test failures, Astha can safely proceed with Phase 7 frontend UI wiring:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PHASE 7 FRONTEND EXECUTION ROADMAP                   │
├───────────────────┬────────────────────────────────────────────────────┤
│ 1. Gatekeeper UI  │ Add "Pending Approvals" tab in                     │
│                   │ ResidentManagement.jsx for approve / reject        │
├───────────────────┼────────────────────────────────────────────────────┤
│ 2. Waiting Screen │ Render "Waiting for Committee Approval" view if    │
│                   │ user.status === 'pending' on login                 │
├───────────────────┼────────────────────────────────────────────────────┤
│ 3. Complaints UI  │ Build Complaints view (list, file, upvote, status, │
│                   │ and resident confirmation verdict)                 │
├───────────────────┼────────────────────────────────────────────────────┤
│ 4. Notices UI     │ Build Notice Board view with pin & priority badges │
├───────────────────┼────────────────────────────────────────────────────┤
│ 5. Treasury UI    │ Build Financials & Treasury ledger dashboard       │
│                   │ displaying netBalance metrics & expense modal      │
└───────────────────┴────────────────────────────────────────────────────┘
```

---

## 5. Known Edge Cases & Defensive Patterns

### 5.1 Unverified Resident Gatekeeper Access
- **Scenario**: A resident self-registers and receives a JWT, but is in `status: 'pending'`.
- **Defense**: Any route serving protected financial data, notice creation, or resident rosters chains `requireActiveUser` after `tenantMiddleware`.
- **Client Behavior**: If the client receives HTTP 403 with `ACCOUNT_INACTIVE`, it renders an "Under Review" splash page.

### 5.2 Razorpay Webhook Body Parsing
- **Scenario**: Razorpay webhook verification fails if `express.json()` has already parsed and modified the payload body buffer.
- **Defense**: Server captures raw buffer in `req.rawBody` via `express.json({ verify: ... })` and computes HMAC-SHA256 signature using `process.env.RAZORPAY_WEBHOOK_SECRET`.

### 5.3 DNS SRV Lookups on Windows Dev Environments
- **Scenario**: Sudden `MongooseServerSelectionError: connection timed out` due to SRV record resolution failures.
- **Defense**: Standard explicit shard hostnames in `.env` and `dns.setDefaultResultOrder('ipv4first')` in `server.js`.

### 5.4 Cross-Tenant Data Injection
- **Scenario**: A malicious resident from Society A sends a PATCH or GET request with the `_id` of a resident or bill in Society B.
- **Defense**: Every database query by ID compounds with `societyId`:
  ```javascript
  const resource = await Model.findOne({ _id: req.params.id, societyId: req.user.societyId });
  if (!resource) return res.status(404).json({ message: 'Resource not found' });
  ```

---

## 6. AI Agent Guidelines for Future Sessions

When interacting with this codebase:
1. **Always Read Before Writing**: Check `Rules.md` for architecture and dependency constraints. Never install new packages without confirmation.
2. **Preserve Tenant Isolation**: Never query by `_id` alone. Always inject `societyId: req.user.societyId`.
3. **Integer Currency Rule**: Never store rupees or floating-point numbers in the database. Always use Paise integers (`Rupees * 100`).
4. **Tailwind v4 Native**: Do not create a `tailwind.config.js`. Use CSS tokens and utilities in `index.css` via `@theme`.
5. **Update Memory.md**: When a milestone or bug fix is completed, update this document to maintain seamless continuity.

