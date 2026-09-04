# XOWIQ CRM

> **Enterprise-Grade Customer Relationship Management Platform** built with React, Vite, Supabase, and Tailwind-inspired clean CSS architecture.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture & Folder Structure](#-architecture--folder-structure)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Environment Configuration](#-environment-configuration)
- [Database & Migrations](#-database--migrations)
- [Available Scripts](#-available-scripts)
- [Modules & Capabilities](#-modules--capabilities)
- [Documentation](#-documentation)

---

## 🚀 Overview

XOWIQ CRM is a multi-tenant, role-based CRM application designed to manage the complete customer lifecycle from Lead generation, Account management, Opportunities, Quotes, Invoices, Services, Support Tickets, and Tasks to comprehensive Analytics & Reports.

---

## 📁 Architecture & Folder Structure

The project follows a clean, modular, and scalable directory structure:

```
CRM/
├── database/                   # Database migrations & documentation
│   ├── migrations/             # Numbered SQL migration files (001 - 015)
│   └── README.md               # Database schema & setup instructions
├── docs/                       # Technical & feature documentation
│   ├── FEATURES_ROLES_AND_MODULES.md
│   └── TECH_STACK_AND_FEATURES.md
├── public/                     # Static public assets
├── scripts/                    # Maintenance & utility scripts
├── src/                        # Main frontend application source code
│   ├── assets/                 # Static media files
│   │   ├── icons/              # SVG icons
│   │   └── images/             # UI images & previews
│   ├── components/             # Reusable UI & business components
│   │   ├── modules/            # Business modules (Leads, Accounts, Invoices, etc.)
│   │   └── ui/                 # Shared UI components (Search, Modals, Language, etc.)
│   ├── lib/                    # Library configurations (Supabase client)
│   ├── locales/                # i18n translation bundles (en, es, etc.)
│   ├── pages/                  # Top-level view routes (Dashboard, Login, SignUp, Landing)
│   ├── styles/                 # Global styles & design system CSS
│   ├── App.jsx                 # Main application router
│   ├── i18n.js                 # Localization configuration
│   └── main.jsx                # React application entrypoint
├── .env                        # Local environment variables (git-ignored)
├── .env.example                # Template environment variables
├── .gitignore                  # Git ignore rules
├── eslint.config.js            # ESLint code quality configuration
├── index.html                  # HTML template
├── package.json                # Project dependencies & npm scripts
├── vercel.json                 # Deployment routing configuration
└── vite.config.js              # Vite bundler configuration
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 + Vite 8 |
| **Routing** | React Router DOM v7 |
| **Backend / Database** | Supabase (PostgreSQL + Auth + RLS + Storage) |
| **State & Localization** | i18next + react-i18next |
| **Icons & UI** | Lucide React |
| **Charts & Analytics** | Recharts |
| **Drag & Drop** | @dnd-kit (Core, Sortable, Utilities) |
| **Export & Reporting** | jsPDF + jsPDF-AutoTable + html2canvas |
| **Notifications** | react-hot-toast |

---

## ⚡ Getting Started

### Prerequisites

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0

### Installation

1. Clone the repository and navigate into the folder:
   ```bash
   cd CRM
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Update .env with your Supabase URL and Anon Key
   ```

4. Run development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

---

## 🔐 Environment Configuration

Create a `.env` file in the root directory:

```ini
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Database Direct URLs (for migrations/CLI)
DATABASE_URL="postgresql://postgres:password@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:password@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
```

> **Note**: Variables prefixed with `VITE_` are exposed to the frontend bundle via `import.meta.env`.

---

## 🗄️ Database & Migrations

All SQL schema migrations are located in [`database/migrations/`](./database/migrations/) and numbered sequentially:

- `001_add_contact_number_column.sql`
- `002_add_currency_column.sql`
- `003_add_custom_data_to_customer_services.sql`
- `004_add_custom_data_to_tasks.sql`
- `005_add_custom_data_to_tickets.sql`
- `006_add_service_type.sql`
- `007_add_settings_profile_columns.sql`
- `008_b2c_profile_columns.sql`
- `009_create_b2c_stages.sql`
- `010_create_custom_fields_table.sql`
- `011_create_services_tables.sql`
- `012_fix_corrupted_users.sql`
- `013_fix_opportunities_stage_constraint.sql`
- `014_fix_signup_error.sql`
- `015_setup_admin_and_confirm.sql`

For instructions on executing migrations, refer to [`database/README.md`](./database/README.md).

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Vite local development server with HMR |
| `npm run build` | Bundles the application for production in `dist/` |
| `npm run preview` | Previews the production build locally |
| `npm run lint` | Runs ESLint to check for code quality issues |

---

## 🧩 Modules & Capabilities

- **Leads & Opportunities**: Pipeline visualization, stage tracking, drag-and-drop status changes.
- **Accounts & Contacts**: 360-degree view of clients, B2B & B2C custom fields.
- **Quotes & Invoices**: Generate, track, and export invoices as PDF.
- **Customer Services & Tickets**: Track active client subscriptions, support ticket lifecycles.
- **Tasks & Collaboration**: Assignable tasks with priority badges and deadline management.
- **Reports & BI Dashboard**: Revenue summaries, conversion funnels, and real-time metric charts.
- **Role-Based Settings & Custom Fields**: Dynamic schema extensions and profile management.
- **Multi-language Support**: Seamless switching between languages.

---

## 📚 Documentation

For in-depth documentation, see the [`docs/`](./docs/) directory:
- [Features, Roles & Modules](./docs/FEATURES_ROLES_AND_MODULES.md)
- [Tech Stack & Architecture](./docs/TECH_STACK_AND_FEATURES.md)
