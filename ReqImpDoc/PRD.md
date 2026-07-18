# SocietyPro — Product Requirements Document (PRD)

**Version:** 1.0  
**Last Updated:** 18 July 2026  
**Status:** Active Development

---

## 1. Product Overview

**SocietyPro** is a multi-tenant web application for managing Indian housing societies (co-operative housing societies). It replaces paper-based workflows and fragmented WhatsApp/Excel-based management with a centralized digital platform.

The product was originally prototyped as a Flutter + Firebase mobile app and is now being rebuilt as a full-stack MERN web application for broader accessibility and easier deployment.

### Target Deployment
- **Primary client:** Asmita Mogra Co-Op Housing Society Ltd., Mumbai
- **Planned demo:** Annual General Meeting (AGM) presentation
- **Geography:** India (primarily Maharashtra)

---

## 2. Target Users

| User Type | Description | Tech Comfort Level |
|---|---|---|
| **Society Committee Members** | Chairman, Secretary, Treasurer — manage society operations | Low to Medium |
| **Society Admin** | Appointed digital admin for a society — manages residents, payments, notices | Medium |
| **Residents / Flat Owners** | View bills, make payments, raise complaints, read notices | Low — many are elderly or non-tech-savvy |
| **Platform Super Admin** | Manages the overall platform — creates societies, onboards admins | High |

### Key Insight
The UI must be **simple, clear, and forgiving**. Many end-users are not comfortable with technology. Complex forms, confusing navigation, or small text will cause adoption failure.

---

## 3. Core Features

### 3.1 Authentication & Authorization
- Email + password based registration and login
- JWT-based session management (7-day token expiry)
- Password hashing with bcryptjs (never stored in plaintext)
- Three role tiers: **SuperAdmin**, **SocietyAdmin**, **Resident**
- Role-based access control (RBAC) on all protected routes

### 3.2 Multi-Tenant Society Management
- SuperAdmin can create and manage multiple societies
- Each society is an isolated tenant — data never leaks across societies
- Tenant isolation enforced at middleware level via `societyId` in JWT
- Shared MongoDB collections with `societyId` field on every business record

### 3.3 Resident Management
- SocietyAdmin can add, view, edit, and remove residents within their society
- Each resident has a unit/flat number, contact details, and role assignment
- Residents can view their own profile and society details

### 3.4 Payment Collection (Razorpay)
- SocietyAdmin creates payment requests (maintenance bills) for residents
- Residents pay online via Razorpay (test mode initially, live for production)
- Payment status lifecycle: `created → authorized → captured → failed`
- Payment history viewable by both admin and resident
- Currency: INR (Indian Rupees)

### 3.5 Notices & Announcements
- SocietyAdmin can post notices visible to all residents in their society
- Notices support title, body, date, and optional priority/category
- Residents see a chronological notice board on their dashboard

### 3.6 Complaints & Requests
- Residents can raise complaints (plumbing, electrical, parking, etc.)
- SocietyAdmin can view, respond to, and update complaint status
- Status lifecycle: `open → in-progress → resolved → closed`

### 3.7 Role-Based Dashboards
- **SuperAdmin Dashboard:** Overview of all societies, total users, platform health
- **SocietyAdmin Dashboard:** Society-specific metrics — residents, pending payments, open complaints, recent notices
- **Resident Dashboard:** Personal payment history, active notices, complaint status

---

## 4. Non-Functional Requirements

| Requirement | Target |
|---|---|
| **Response Time** | API responses < 500ms for standard CRUD |
| **Security** | JWT auth, bcrypt hashing, tenant isolation, no plaintext secrets |
| **Scalability** | Multi-tenant design supports adding new societies without code changes |
| **Browser Support** | Chrome, Edge, Firefox (latest 2 versions) |
| **Mobile Responsive** | UI must work on phones and tablets (many residents use mobile) |
| **Language** | English (Hindi localization is a future consideration) |

---

## 5. Out of Scope (v1)

- Mobile app (Flutter rebuild deferred)
- SMS/WhatsApp notifications
- Document/file uploads (meeting minutes, receipts)
- Multi-language support
- Accounting/ledger integration
- Visitor management
- Parking slot management

---

## 6. Success Criteria

1. SuperAdmin can onboard a new society and assign a SocietyAdmin in under 5 minutes
2. SocietyAdmin can add all residents and send first payment request within 30 minutes
3. A non-tech-savvy resident can login, view a notice, and make a payment without assistance
4. Successful demo at Asmita Mogra AGM with live data
