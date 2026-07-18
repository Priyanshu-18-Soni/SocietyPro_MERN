# SocietyPro — Architecture Document

**Version:** 1.0  
**Last Updated:** 18 July 2026

---

## 1. High-Level Architecture

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│                  │  HTTP   │                  │ Mongoose │                  │
│   React (Vite)   │ ◄─────►│  Express Server  │ ◄──────► │  MongoDB Atlas   │
│   Frontend       │  REST   │  Backend (Node)  │          │  (Cloud DB)      │
│   Port: 5173     │  API    │  Port: 5000      │          │                  │
└──────────────────┘         └──────────────────┘         └──────────────────┘
                                     │
                                     │ Razorpay API
                                     ▼
                             ┌──────────────────┐
                             │  Razorpay (Test)  │
                             │  Payment Gateway  │
                             └──────────────────┘
```

- **Frontend** → React SPA built with Vite, styled with Tailwind CSS v4
- **Backend** → Node.js + Express REST API server
- **Database** → MongoDB Atlas (cloud-hosted, shared cluster)
- **Communication** → REST API calls via axios with `Authorization: Bearer <JWT>` header

---

## 2. Backend Folder Structure

```
backend/
├── config/                    # (Reserved) DB config, Razorpay keys, etc.
├── controllers/               # Business logic handlers
│   ├── authController.js      # register, login
│   └── societyController.js   # createSociety, getAllSocieties, getSocietyById
├── middleware/                 # Express middleware
│   ├── tenantMiddleware.js    # JWT verification + req.user injection
│   └── roleMiddleware.js      # RBAC — requireRole(...allowedRoles)
├── models/                    # Mongoose schemas
│   ├── Society.js             # name, address, city, registrationNumber
│   ├── User.js                # name, email, passwordHash, role, societyId, unitNumber
│   └── Payment.js             # societyId, residentId, amount, razorpay fields, status
├── routes/                    # Express route definitions
│   ├── authRoutes.js          # POST /register, POST /login
│   ├── societyRoutes.js       # POST /, GET /, GET /:id (RBAC protected)
│   └── testRoutes.js          # GET /protected (middleware verification)
├── .env                       # PORT, MONGO_URI, JWT_SECRET
├── package.json               # Dependencies and scripts
├── requests.http              # REST Client test requests
└── server.js                  # App entry point — middleware, routes, DB connection
```

---

## 3. Frontend Folder Structure

```
frontend/
├── public/
├── src/
│   ├── assets/                # Static assets (images, icons)
│   ├── App.jsx                # Root component (currently placeholder)
│   ├── App.css                # Global component styles
│   ├── index.css              # Tailwind CSS imports
│   └── main.jsx               # React DOM entry point
├── package.json               # React, Vite, Tailwind, axios, react-router-dom
└── vite.config.js             # Vite configuration
```

**Note:** Frontend is currently scaffolded only — no pages, routing, or API integration built yet.

---

## 4. Multi-Tenancy Strategy

### Model: Shared Collections + societyId

All tenants (societies) share the same MongoDB collections. Tenant isolation is achieved by:

1. **Schema-level:** Every business data model (User, Payment, etc.) has a `societyId` field referencing the Society collection
2. **Middleware-level:** `tenantMiddleware.js` extracts `societyId` from the JWT token and attaches it to `req.user`
3. **Controller-level:** All queries filter by `req.user.societyId` to ensure data belongs to the requesting tenant
4. **Exception:** SuperAdmin has no `societyId` — they operate across all tenants

```
Request Flow:
Client → Authorization: Bearer <JWT>
       → tenantMiddleware extracts { id, role, societyId }
       → roleMiddleware checks if role is in allowedRoles
       → Controller uses req.user.societyId to scope queries
```

### Why This Model?
- Simple to implement and maintain for a small-to-medium scale app
- Single database, single deployment — cost effective
- Sufficient for dozens of societies with hundreds of residents each
- Easy to add new societies without infrastructure changes

---

## 5. Authentication Flow

```
REGISTRATION:
1. Client POST /api/auth/register { name, email, password, role, societyId? }
2. Server validates input → checks duplicate email
3. bcryptjs hashes password (salt rounds: 10)
4. User document created in MongoDB
5. JWT signed with { id, role, societyId } — expires in 7 days
6. Token + user object returned to client

LOGIN:
1. Client POST /api/auth/login { email, password }
2. Server finds user by email
3. bcryptjs compares password with stored hash
4. JWT signed with { id, role, societyId } — expires in 7 days
5. Token + user object returned to client

PROTECTED ROUTES:
1. Client sends Authorization: Bearer <token> header
2. tenantMiddleware verifies JWT → attaches req.user
3. roleMiddleware checks req.user.role against allowed roles
4. Controller executes business logic
```

---

## 6. API Route Map (Current)

| Method | Route | Auth | Roles | Handler |
|---|---|---|---|---|
| POST | `/api/auth/register` | None | Public | `authController.registerUser` |
| POST | `/api/auth/login` | None | Public | `authController.loginUser` |
| GET | `/api/test/protected` | JWT | Any | Inline (returns req.user) |
| POST | `/api/society` | JWT | SuperAdmin | `societyController.createSociety` |
| GET | `/api/society` | JWT | SuperAdmin | `societyController.getAllSocieties` |
| GET | `/api/society/:id` | JWT | SuperAdmin, SocietyAdmin | `societyController.getSocietyById` |

---

## 7. Frontend–Backend Communication

```
Frontend (React)
    │
    │  axios.post('/api/auth/login', { email, password })
    │  axios.get('/api/society', { headers: { Authorization: `Bearer ${token}` } })
    │
    ▼
Backend (Express @ localhost:5000)
    │
    │  CORS enabled (cors middleware)
    │  express.json() parses request bodies
    │
    ▼
MongoDB Atlas (Mongoose connection)
```

- Frontend stores JWT in localStorage or React context after login
- Every authenticated request includes `Authorization: Bearer <token>` header
- CORS is enabled with default settings (all origins allowed in dev)

---

## 8. Database (MongoDB Atlas)

- **Cluster:** SocietyPro-Cluster
- **Database name:** societypro
- **Connection:** Via Mongoose, connection string in `.env` as `MONGO_URI`
- **Collections:** societies, users, payments (auto-created by Mongoose)
- **Indexing:** `email` field on User has `unique: true` index

---

## 9. Environment Variables

| Variable | Purpose |
|---|---|
| `PORT` | Express server port (default: 5000) |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for signing/verifying JWTs |
