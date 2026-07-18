# SocietyPro — Rules for AI Coding Assistants

**Version:** 1.0  
**Last Updated:** 18 July 2026

---

## Purpose

This document sets clear boundaries and conventions for any AI coding assistant (Copilot, Gemini, Claude, etc.) working on the SocietyPro codebase. Follow these rules strictly.

---

## 1. Approved Dependencies

### Backend (Node.js + Express)

Only these packages are approved. Do NOT install new packages without explicit developer permission.

| Package | Version | Purpose |
|---|---|---|
| `express` | ^5.2.1 | Web framework |
| `mongoose` | ^9.7.4 | MongoDB ODM |
| `bcryptjs` | ^3.0.3 | Password hashing |
| `jsonwebtoken` | ^9.0.3 | JWT signing & verification |
| `dotenv` | ^17.4.2 | Environment variable loading |
| `cors` | ^2.8.6 | Cross-origin resource sharing |
| `nodemon` | ^3.1.14 | Dev-only auto-restart (devDependency) |

### Frontend (React + Vite)

| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.2.7 | UI framework |
| `react-dom` | ^19.2.7 | React DOM renderer |
| `react-router-dom` | ^7.18.1 | Client-side routing |
| `axios` | ^1.18.1 | HTTP client for API calls |
| `tailwindcss` | ^4.3.2 | Utility-first CSS framework |
| `@tailwindcss/vite` | ^4.3.2 | Tailwind Vite plugin |
| `vite` | ^8.1.1 | Build tool (devDependency) |
| `@vitejs/plugin-react` | ^6.0.3 | React plugin for Vite (devDependency) |
| `eslint` | ^10.6.0 | Linting (devDependency) |

**Rule:** If you believe a new package is needed, suggest it with a justification. Never install it silently.

---

## 2. Code Architecture Rules

### Backend Structure

```
controller handles business logic  →  NEVER put business logic in routes
route only defines HTTP method + path + middleware chain + controller function
model only defines Mongoose schema  →  NEVER put queries in models
middleware handles cross-cutting concerns (auth, RBAC, validation)
```

- **One controller file per resource** (e.g., `authController.js`, `societyController.js`)
- **One route file per resource** (e.g., `authRoutes.js`, `societyRoutes.js`)
- **Every protected route** must use `tenantMiddleware` before `requireRole`
- **Route middleware order:** `tenantMiddleware → requireRole(...) → controllerFunction`

### Frontend Structure (Planned)

```
src/
├── components/     # Reusable UI components
├── pages/          # Route-level page components
├── context/        # React context providers (auth, etc.)
├── services/       # API call functions (axios wrappers)
├── hooks/          # Custom React hooks
├── utils/          # Helper functions
└── assets/         # Images, icons
```

---

## 3. Security Rules — NEVER Violate These

| Rule | Reason |
|---|---|
| **NEVER store passwords in plaintext** | Always use `bcryptjs` with salt rounds ≥ 10 |
| **NEVER hardcode secrets in source code** | Use `.env` file — JWT_SECRET, MONGO_URI, API keys |
| **NEVER commit `.env` to git** | `.gitignore` must include it |
| **NEVER bypass tenant middleware** | Every protected route MUST go through `tenantMiddleware` |
| **NEVER return passwordHash in API responses** | Exclude it from all user-facing responses |
| **NEVER trust client-side role claims** | Role is verified from JWT on the server, not from request body |
| **NEVER use `*` CORS in production** | Restrict to specific frontend origin |
| **NEVER expose stack traces in production** | Use generic error messages for 500 errors |

---

## 4. Error Response Format

All API error responses MUST follow this consistent JSON format:

```json
{
  "message": "Human-readable error description"
}
```

### HTTP Status Code Usage

| Code | When to Use |
|---|---|
| `200` | Successful GET, successful login |
| `201` | Successful resource creation (POST) |
| `400` | Validation error, missing fields, duplicate data |
| `401` | Missing or invalid authentication token |
| `403` | Authenticated but insufficient role/permissions |
| `404` | Resource not found |
| `500` | Unexpected server error (log the actual error, return generic message) |

### Error Handling Pattern

```javascript
// ✅ CORRECT — try/catch with consistent format
const handler = async (req, res) => {
  try {
    // ... business logic
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error while doing X' });
  }
};

// ❌ WRONG — inconsistent, exposes internals
res.status(500).send(err.message);
res.status(500).json({ error: err.stack });
```

---

## 5. Coding Conventions

### General
- Use `const` and `let` — never `var`
- Use `async/await` — never raw `.then()` chains in controllers
- Use template literals for string interpolation
- Use destructuring for req.body, req.params, req.query
- All controller functions must be `async`

### Naming
- Files: `camelCase.js` (e.g., `authController.js`, `tenantMiddleware.js`)
- Variables/functions: `camelCase`
- Models: `PascalCase` (e.g., `Society`, `User`, `Payment`)
- Routes: lowercase with hyphens if multi-word (e.g., `/api/auth`, `/api/society`)
- Environment variables: `SCREAMING_SNAKE_CASE`

### MongoDB / Mongoose
- Use `mongoose.Schema.Types.ObjectId` for references, always with `ref`
- Use `required: true` on all mandatory fields
- Use `enum` for fields with fixed allowed values
- Use `default` for optional fields with sensible defaults
- Timestamps: use `createdAt` with `default: Date.now`

### Frontend (When Building)
- Functional components only — no class components
- Use React hooks (useState, useEffect, useContext)
- API calls go in `services/` directory, not inside components
- JWT token stored in context/localStorage — passed via axios interceptor
- Use react-router-dom for navigation — no manual `window.location` changes

---

## 6. Git Conventions

- Commit messages in imperative mood: "Add auth routes" not "Added auth routes"
- One logical change per commit
- Never commit `node_modules/`, `.env`, or build output
- Push to `main` branch (current workflow)

---

## 7. Things AI Assistants Must NOT Do

1. ❌ Introduce new npm packages without asking
2. ❌ Change the multi-tenancy model or bypass societyId filtering
3. ❌ Modify `.env` without confirming with the developer
4. ❌ Create files outside the established folder structure
5. ❌ Use TypeScript (project is JavaScript-only)
6. ❌ Add ORMs other than Mongoose
7. ❌ Refactor working code without being asked
8. ❌ Remove existing comments or documentation
9. ❌ Use deprecated Express patterns (e.g., `app.param()`)
10. ❌ Skip input validation in controllers
