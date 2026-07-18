# SocietyPro — Development Phases

**Version:** 1.0  
**Last Updated:** 18 July 2026

---

## Phase Overview

| Phase | Focus | Status |
|---|---|---|
| Phase 1 | Project Setup + Auth + Tenant Middleware + RBAC + Society CRUD | ✅ COMPLETE |
| Phase 2 | User/Resident Management + Society Update/Delete | 🔲 Up Next |
| Phase 3 | Payment System (Razorpay Integration) | 🔲 Planned |
| Phase 4 | Notices & Complaints | 🔲 Planned |
| Phase 5 | Frontend — Auth Pages + Routing + Layout | 🔲 Planned |
| Phase 6 | Frontend — Dashboards + Feature Pages | 🔲 Planned |
| Phase 7 | Polish, Testing & Deployment | 🔲 Planned |

---

## Phase 1 — Foundation ✅ COMPLETE

### What Was Built
- [x] Project scaffolding (monorepo: backend + frontend folders)
- [x] Backend Express server with Mongoose + MongoDB Atlas connection
- [x] Environment configuration (.env with PORT, MONGO_URI, JWT_SECRET)
- [x] DNS fix for IPv4-first resolution
- [x] CORS and JSON body parsing middleware

### Models
- [x] `Society.js` — name, address, city, registrationNumber, createdAt
- [x] `User.js` — name, email, passwordHash, role (enum), societyId (conditional), unitNumber
- [x] `Payment.js` — societyId, residentId, amount, currency, razorpay fields, status lifecycle

### Authentication
- [x] `authController.js` — registerUser (bcrypt + JWT), loginUser (bcrypt compare + JWT)
- [x] `authRoutes.js` — POST /api/auth/register, POST /api/auth/login
- [x] JWT tokens with 7-day expiry, signed with { id, role, societyId }

### Middleware
- [x] `tenantMiddleware.js` — JWT verification, req.user injection { id, role, societyId }
- [x] `roleMiddleware.js` — requireRole(...allowedRoles) higher-order middleware

### Society CRUD
- [x] `societyController.js` — createSociety, getAllSocieties, getSocietyById
- [x] `societyRoutes.js` — RBAC-protected routes (SuperAdmin + SocietyAdmin)

### Testing
- [x] `testRoutes.js` — Protected route for middleware verification
- [x] `requests.http` — REST Client test file with all current endpoints
- [x] All endpoints manually tested and verified working

### Git History
```
305250b  Initial project scaffold - backend + frontend
ff57c64  Add Mongoose schemas for Society, User, Payment
4157a7b  Add tenant middleware for JWT verification
f7dc2ef  Add authentication system - register and login APIs
d4a36d1  Test and verify auth APIs - register and login working
30c1922  Add and verify protected test route with tenant middleware
72420e7  Add Society CRUD routes with RBAC protection
```

---

## Phase 2 — User/Resident Management + Society Update/Delete 🔲

### Backend Tasks
- [ ] `societyController.js` — Add updateSociety and deleteSociety handlers
- [ ] Update `societyRoutes.js` — PUT /:id and DELETE /:id (SuperAdmin only)
- [ ] Create `userController.js` — CRUD for residents within a society
  - [ ] Create user (SocietyAdmin creates residents for their society)
  - [ ] Get all users in a society (SocietyAdmin — scoped by societyId)
  - [ ] Get single user by ID
  - [ ] Update user profile
  - [ ] Delete/deactivate user
- [ ] Create `userRoutes.js` — All routes protected with tenantMiddleware + requireRole
- [ ] Mount user routes in `server.js` at `/api/users`
- [ ] Add test requests to `requests.http`

### Key Rules
- SocietyAdmin can ONLY manage residents within their own society
- SuperAdmin can manage users across all societies
- Resident can only view/edit their own profile

---

## Phase 3 — Payment System (Razorpay) 🔲

### Backend Tasks
- [ ] Create `config/razorpay.js` — Razorpay instance with key_id and key_secret from .env
- [ ] Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to .env
- [ ] Create `paymentController.js`:
  - [ ] Create Razorpay order (SocietyAdmin creates for a resident)
  - [ ] Verify Razorpay payment signature (webhook/callback)
  - [ ] Get payment history (scoped by societyId)
  - [ ] Get single payment details
- [ ] Create `paymentRoutes.js` — Protected routes
- [ ] Mount at `/api/payments` in `server.js`
- [ ] Install `razorpay` npm package (approval needed)

### Key Rules
- All payments scoped by societyId
- Test mode first — switch to live only for production
- Verify payment signature server-side before marking as captured

---

## Phase 4 — Notices & Complaints 🔲

### Backend Tasks — Notices
- [ ] Create `Notice.js` model — title, body, societyId, postedBy, priority, createdAt
- [ ] Create `noticeController.js` — CRUD for notices
- [ ] Create `noticeRoutes.js` — SocietyAdmin can create/edit/delete; Residents can view
- [ ] Mount at `/api/notices`

### Backend Tasks — Complaints
- [ ] Create `Complaint.js` model — title, description, societyId, residentId, status, response, createdAt
- [ ] Create `complaintController.js` — Create (Resident), Update status (SocietyAdmin), View
- [ ] Create `complaintRoutes.js` — Role-appropriate access
- [ ] Mount at `/api/complaints`

---

## Phase 5 — Frontend: Auth + Layout + Routing 🔲

### Tasks
- [ ] Set up react-router-dom with route structure
- [ ] Create auth context (AuthProvider) for JWT storage and user state
- [ ] Create axios instance with base URL and auth interceptor
- [ ] Build Login page
- [ ] Build Register page
- [ ] Create app shell/layout (sidebar + topbar + content area)
- [ ] Implement protected route wrapper component
- [ ] Role-based route guards (redirect based on role)

---

## Phase 6 — Frontend: Dashboards + Feature Pages 🔲

### SuperAdmin Pages
- [ ] Dashboard (all societies overview)
- [ ] Society management page (list, create, edit, delete)

### SocietyAdmin Pages
- [ ] Dashboard (society-specific metrics)
- [ ] Resident management page
- [ ] Payment management page (create bills, view history)
- [ ] Notice management page (create, edit, delete notices)
- [ ] Complaint management page (view, respond, update status)

### Resident Pages
- [ ] Dashboard (personal overview)
- [ ] Payment page (view bills, pay via Razorpay)
- [ ] Notices page (view society notices)
- [ ] Complaints page (raise, track complaints)
- [ ] Profile page (view/edit own details)

---

## Phase 7 — Polish, Testing & Deployment 🔲

### Tasks
- [ ] Error boundary components in React
- [ ] Loading states and skeleton screens
- [ ] Form validation (frontend + backend alignment)
- [ ] Responsive design testing (mobile, tablet, desktop)
- [ ] Security audit (CORS config, rate limiting, input sanitization)
- [ ] Environment-based configuration (dev vs production)
- [ ] Deployment setup (Vercel/Netlify for frontend, Render/Railway for backend)
- [ ] Production CORS configuration
- [ ] Final testing with Asmita Mogra society data
- [ ] AGM demo preparation
