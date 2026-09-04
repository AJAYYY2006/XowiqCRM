# XOWIQ CRM — Enterprise Architecture & Platform

> **Enterprise-Grade Customer Relationship Management Platform** featuring a dual **Client & Server** architecture, full **Role-Based Access Control (RBAC)**, **Tailwind CSS** modern UI design, and an ultra-fast **Express API Server** integrated with **Supabase PostgreSQL**.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Client & Server Architecture](#-client--server-architecture)
- [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Environment Configuration](#-environment-configuration)
- [Fast API Endpoints](#-fast-api-endpoints)
- [Database & Migrations](#-database--migrations)
- [Available Scripts](#-available-scripts)
- [Modules & Capabilities](#-modules--capabilities)
- [Documentation](#-documentation)

---

## 🚀 Overview

XOWIQ CRM is a modern, high-performance customer lifecycle management system supporting complete lead funnels, opportunity kanbans, accounts, contacts, quotes, PDF invoices, customer services, support tickets, assignable tasks, and real-time executive reports.

---

## 📁 Client & Server Architecture

The repository is cleanly structured into decoupled client and server layers:

```
CRM/
├── database/                   # Database migrations (001 - 017) & documentation
│   ├── migrations/             # Numbered SQL migration files
│   └── README.md               # Database setup guide
├── docs/                       # Architectural & feature specifications
├── public/                     # Static public assets
├── scripts/                    # Database migrations & seeding utilities
│   ├── migrate.js              # Automatic pg migration runner
│   └── seed_dev_users.js       # Pre-populates 5 role demo accounts
├── server/                     # Fast Express REST API Server
│   └── src/
│       ├── config/             # Server env & Supabase service client
│       ├── controllers/        # Analytics, Leads, Deals, Export, Webhook, Health
│       ├── middleware/         # JWT Auth, Role Guard, Error Handler
│       ├── routes/             # Master /api/v1 router
│       └── index.js            # Express server entrypoint (Port 5000)
├── src/                        # React 19 Frontend Application
│   ├── assets/                 # Icons & images
│   ├── components/             # Reusable UI & business components
│   │   ├── auth/               # RoleGuard & DevLoginModal
│   │   ├── modules/            # Leads, Deals, Accounts, Contacts, Invoices, etc.
│   │   ├── reactbits/          # Animated UI components (SpotlightCard, ShinyButton, etc.)
│   │   └── ui/                 # Modals, Table, MetricCards, etc.
│   ├── config/                 # Centralized RBAC matrix (roles.js)
│   ├── contexts/               # RoleContext & AuthContext
│   ├── lib/                    # Supabase client & apiClient (Fast API SDK)
│   ├── locales/                # Multi-language translation bundles
│   ├── pages/                  # Landing, Login, SignUp, Dashboard
│   ├── styles/                 # Tailwind CSS & Global design system (index.css)
│   ├── App.jsx                 # Main application router with RoleGuard
│   ├── i18n.js                 # Localization configuration
│   └── main.jsx                # React entrypoint
├── .env                        # Local environment variables
├── .env.example                # Template environment variables
├── package.json                # Project dependencies & npm scripts
├── vite.config.js              # Vite 8 bundler with Tailwind CSS plugin
└── vercel.json                 # Single-page routing configuration
```

---

## 🛡️ Role-Based Access Control (RBAC)

The application supports 5 fine-grained business roles with client & server enforcement:

| Role | Key | Access Scope |
|---|---|---|
| **Super Admin** | `admin` | Full unrestricted access to all 13 modules, settings, and user management |
| **Sales Manager** | `manager` | Overview, Leads, Deals, Accounts, Contacts, Quotes, Invoices, Tasks, Reports |
| **Support Lead** | `support` | Overview, Accounts, Contacts, Services, Tickets, Tasks, Reports |
| **B2C Retail Owner** | `b2c` | Overview, Leads, Deals, Accounts, Contacts, Quotes, Invoices, Tasks, Reports |
| **Staff / Viewer** | `viewer` | Read-only access to Overview, Leads, Deals, Accounts, Contacts, Reports |

### Seeded Dev Accounts (Password for all: `Password@123`):
1. **Super Admin**: `admin@xowiq.com`
2. **Sales Manager**: `sales@xowiq.com`
3. **Support Lead**: `support@xowiq.com`
4. **B2C Owner**: `b2c.demo@xowiq.com`
5. **Staff Viewer**: `viewer@xowiq.com`

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Styling & Design** | **Tailwind CSS v4** + Modern Glassmorphism + React Bits |
| **Frontend Framework** | React 19 + Vite 8 |
| **Frontend Routing** | React Router DOM v7 with `RoleGuard` & `RoleContext` |
| **Backend Fast API** | Express 5 + Helmet + CORS + Compression + Morgan |
| **Database & Auth** | Supabase (PostgreSQL 15 + RLS + JWT + Service Role) |
| **State & Localization** | i18next + react-i18next |
| **Icons & Visuals** | Lucide React |
| **Charts & Analytics** | Recharts |
| **Drag & Drop** | @dnd-kit (Core, Sortable, Utilities) |
| **Document Generation** | jsPDF + jsPDF-AutoTable + html2canvas |

---

## ⚡ Getting Started

### Prerequisites

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0

### Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run both Frontend and Fast API Server concurrently:
   ```bash
   npm run dev:all
   ```

   - **Frontend App**: `http://localhost:5173`
   - **Backend API**: `http://localhost:5000/api/v1`

3. (Optional) Run services individually:
   ```bash
   # Start Vite client only
   npm run dev

   # Start Fast API server only
   npm run server
   ```

---

## 🌐 Fast API Endpoints

The Express backend (`server/src/index.js`) exposes the following endpoints under `/api/v1`:

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/health` | System uptime and PostgreSQL connection latency | ❌ Public |
| `GET` | `/api/v1/analytics/dashboard` | Aggregated revenue, conversion rates, counts | ✅ JWT (Role-checked) |
| `GET` | `/api/v1/leads` | Filterable lead pipeline | ✅ JWT |
| `POST` | `/api/v1/leads` | Create lead record with validation | ✅ JWT (Writer role) |
| `GET` | `/api/v1/deals` | Opportunities list & stage tracking | ✅ JWT |
| `GET` | `/api/v1/export/csv` | Secure CSV export for leads/deals/invoices | ✅ Admin / Manager |
| `POST` | `/api/v1/webhooks/incoming` | Inbound CRM webhooks for third-party integrations | 🔒 API Signature |

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev:all` | Runs frontend client & backend API concurrently with colored prefixes |
| `npm run dev` | Starts the Vite development server with HMR |
| `npm run server` | Starts the Express Fast API server on port 5000 |
| `npm run build` | Builds the client for production in `dist/` |
| `npm run seed` | Seeds the 5 demo role accounts and demo records |
| `npm run migrate` | Applies all SQL migrations against the Supabase database |
| `npm run lint` | Runs ESLint |

---

## 📚 Documentation

For in-depth guides, explore the [`docs/`](./docs/) directory:
- [Features, Roles & Modules](./docs/FEATURES_ROLES_AND_MODULES.md)
- [Tech Stack & Architecture](./docs/TECH_STACK_AND_FEATURES.md)
