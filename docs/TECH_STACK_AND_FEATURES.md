# XOWIQ CRM — Comprehensive Tech Stack, Architecture & Features Specification

> **Project Name:** XOWIQ CRM  
> **Repository Location:** `c:\Desktop\CRM`  
> **Document Purpose:** Complete technical stack breakdown, architectural overview, module inventory, and detailed feature specifications.

---

## 1. Executive Overview

**XOWIQ CRM** is a modern, full-featured, multi-tenant, dual-mode (**B2B & B2C**) Customer Relationship Management (CRM) platform. It provides end-to-end management of the sales cycle, customer support, quoting, invoicing, team performance tracking, and customer lifecycle progression.

### Key Architectural Highlights
- **Dual Business Modes:**
  - **B2B (Business-to-Business):** Focuses on Leads, Contacts, Company Accounts, Multi-stage Opportunity Pipelines, Quotes, and B2B Invoicing.
  - **B2C (Business-to-Consumer):** Focuses on Individual Customer Profiles, Service Catalogs (Instant & Multi-Stage Services), Service Delivery Stage Tracking, Milestone Completion, and Consumer Invoicing.
- **Unified Role-Based Workspace:** Single dashboard shell supporting Super Admins, Administrators, Managers, and Standard Users with real-time KPI aggregation and team record oversight.
- **Dynamic Extensibility:** Built-in **Custom Field Builder** supporting 9 field types on any CRM module without changing code.
- **Direct WhatsApp Integration:** 1-click WhatsApp Click-to-Chat (`wa.me`) integration with contextual message templates.
- **Multi-lingual Support (i18n):** Native support for English (`en`), Hindi (`hi`), and Tamil (`ta`).
- **Real-Time Data Sync:** Live PostgreSQL changes pushed directly to UI via Supabase Realtime Channels.

---

## 2. Complete Technology Stack

### 2.1 Core Framework & Runtime
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **React** | `^19.2.4` | Component-based UI library and Virtual DOM engine |
| **React DOM** | `^19.2.4` | React rendering engine for the browser |
| **Vite** | `^8.0.0` | High-performance build tool, dev server, and HMR engine |
| **Node.js / ES Modules** | `type: "module"` | Native JavaScript module system |

### 2.2 Routing & Navigation
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **React Router DOM** | `^7.13.1` | Client-side routing, protected routes, nested dashboard routes, and programmatic navigation |

### 2.3 Backend-as-a-Service (BaaS) & Database
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **Supabase Client (`@supabase/supabase-js`)** | `^2.99.1` | Authentication, PostgreSQL CRUD operations, RPC functions, and Realtime WebSocket subscriptions |
| **PostgreSQL** | Supabase Cloud | Relational database with Foreign Keys, Triggers, JSONB storage, and Custom PostgreSQL Enums |
| **Row Level Security (RLS)** | PostgreSQL Native | Granular data access control isolating business data by user ID and organization |
| **Supabase Storage** | Cloud Storage | Secure cloud storage bucket (`customer-docs`) for file uploads and customer documents |

### 2.4 UI, Styling & Design System
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **Vanilla CSS3** | Custom Tokenized System | Custom CSS design tokens (CSS variables), sleek card layouts, micro-animations, glassmorphism, responsive grids |
| **Lucide React** | `^0.577.0` | Consistent, lightweight vector icon library |
| **Google Fonts** | Inter & Fredoka | Modern typography for sleek UI and brand identity |
| **React Hot Toast** | `^2.6.0` | Reactive, accessible toast notification system for feedback |

### 2.5 Drag-and-Drop & Interactions
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **@dnd-kit/core** | `^6.3.1` | Lightweight drag-and-drop primitives for pipeline boards |
| **@dnd-kit/sortable** | `^10.0.0` | Sortable lists and Kanban stage reordering |
| **@dnd-kit/utilities** | `^3.2.2` | CSS transform helpers for smooth dnd interactions |

### 2.6 Data Visualization & Charting
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **Recharts** | `^3.8.0` | Responsive SVG/Canvas charting library for sales funnels, pipeline distribution, and revenue trends |

### 2.7 Document Generation & Exporting
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **jsPDF** | `^4.2.1` | Client-side PDF generation for Invoices, Quotes, Reports, and Customer Statements |
| **jspdf-autotable** | `^5.0.7` | Tabular data formatting plugin for jsPDF |
| **html2canvas** | `^1.4.1` | Screenshot/canvas capturing for exporting visual dashboard summaries |

### 2.8 Internationalization & Localization (i18n)
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **i18next** | `^25.10.5` | Core internationalization framework |
| **react-i18next** | `^16.6.2` | React bindings and hooks (`useTranslation`) for dynamic multi-language switching |
| **i18next-browser-languagedetector** | `^8.2.1` | Automatic browser language detection and persistence in `localStorage` |

### 2.9 Communication & Integrations
| Technology | Purpose |
| :--- | :--- |
| **WhatsApp Click-to-Chat (`wa.me`)** | Direct phone number sanitizer, international country code formatter (+91 default), and contextual chat generator |

### 2.10 Code Quality & Deployment
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **ESLint** | `^9.39.4` | Code analysis and syntax checking |
| **Vercel** | Configured (`vercel.json`) | Single-page application routing rewrites and cloud hosting |

---

## 3. System Architecture & Dual Operating Modes

```
+-------------------------------------------------------------------------------+
|                                  XOWIQ CRM                                    |
+-------------------------------------------------------------------------------+
|                                                                               |
|  +---------------------------+             +-------------------------------+  |
|  |     B2B Business Mode     |             |       B2C Business Mode       |  |
|  +---------------------------+             +-------------------------------+  |
|  | - Leads                   |             | - Leads                       |  |
|  | - Contacts                |             | - Customer Profiles           |  |
|  | - Company Accounts        |             | - Services Catalog            |  |
|  | - Opportunities (Deals)   |             | - Stage Progress Tracker      |  |
|  | - Quotes & Proposals      |             | - Invoices & Milestone Pay    |  |
|  | - Invoices                |             | - Tasks & Reminders           |  |
|  | - Tasks & Tickets         |             | - Tickets & Support           |  |
|  +---------------------------+             +-------------------------------+  |
|                                                                               |
|  +-------------------------------------------------------------------------+  |
|  |                        Shared Core Subsystems                           |  |
|  |  * Custom Field Builder (9 Field Types)    * Realtime WebSocket Engine  |  |
|  |  * i18n Localization (EN, HI, TA)          * WhatsApp Direct Dispatch   |  |
|  |  * PDF Export & Document Engine            * Multi-Currency Engine      |  |
|  |  * Admin KPI & User Management             * Global & Local Search      |  |
|  +-------------------------------------------------------------------------+  |
+-------------------------------------------------------------------------------+
```

---

## 4. Detailed Module & Feature Breakdown

### 4.1 Authentication & Onboarding
- **Public Landing Page:** Showcases key platform capabilities, interactive video demo modal, tiered pricing plans (Starter, Pro, Enterprise), and instant language selector.
- **Secure Authentication:** Email and password signup and login powered by Supabase Auth.
- **Organization Onboarding:** On registration, users define their Company Name and primary Business Mode (**B2B** or **B2C**).
- **Session Migration & Protected Routes:** Session persistence with route guards redirecting unauthenticated traffic to `/login`.

---

### 4.2 Administrator Control Center
- **Executive KPI Dashboard:**
  - Aggregated metrics: Total Leads, Total Customers, Deals Won, Total Deal Value, Tasks Completed, Tickets Resolved, and Active Team Members.
  - Team breakdown table with per-agent performance indicators and "Last Active" timestamp.
  - 30-second background polling fallback combined with real-time WebSocket updates.
- **User Management & Team Provisioning:**
  - Admin creation of sub-accounts (Staff / Managers / Admins) under the same tenant.
  - Duplicate username/email collision checks against tenant organization and DB.
  - Instant password masking/unmasking toggle.
  - Delete team member with cascading cleanup.
- **Team Records Central View:**
  - Consolidated view of all records created by any team member (Leads, Contacts, Deals, Tasks, Tickets).
  - Quick search and "Open Details" direct jump to the record in its native module.

---

### 4.3 Smart Dashboard (`DashboardHome.jsx`)
- **Key Metrics Overview:** Total Revenue, Open Leads, Active Opportunities, Open Support Tickets, Total Customer Count, and Pending Invoices.
- **Date Range Filtering:** Last 7 Days, Last 30 Days, Last 90 Days, This Month, Last Month, and This Year.
- **Revenue Goal Tracker:** Visual monthly progress bar towards customizable revenue goals.
- **Sales Funnel & Pipeline Chart:** Recharts-powered stage breakdown of opportunities.
- **Recent Activities Feed:** Live activity log (Calls, Emails, Meetings, Notes, Status Updates).
- **Priority Tasks Panel:** Urgent and upcoming tasks with direct action buttons.
- **Visual PDF Snapshot Export:** Uses `html2canvas` and `jsPDF` to generate a downloadable PDF summary of the dashboard.

---

### 4.4 Lead Management Module (`Leads.jsx`)
- **Lead Capture & Table:** Serial numbered lead listings with owner assignments, email, company, and phone.
- **Lifecycle Statuses:** `New` -> `Contacted` -> `Qualified` -> `Lost` -> `Converted`.
- **1-Click Lead Conversion:** Convert qualified leads into Contacts, Company Accounts, and Opportunities in a single action.
- **Sub-Tabs in Lead View:**
  - **Tasks:** Create and manage follow-ups directly attached to the lead.
  - **Activities:** Log calls, emails, notes, and meeting summaries.
- **WhatsApp Integration:** Pre-filled template: *"Hi {Lead Name}, thanks for your interest in {Company Name}."*
- **Custom Fields Support:** Add custom attributes via the Field Builder.
- **Search & Filtering:** Real-time local search across names, companies, and emails.

---

### 4.5 Contact Management Module (`Contacts.jsx`)
- **Rich Contact Profiles:** Full name, phone number, email address, linked company account, and owner.
- **Account Relationship:** Foreign key linkage associating multiple contacts with a parent account.
- **Direct Actions:**
  - Quick dial / WhatsApp chat dispatch.
  - View contact-specific tasks and historical timeline.
- **Activity & Task Linking:** Attach follow-up tasks (Call, Demo, Meeting) directly to contacts.

---

### 4.6 Account & Customer Profile Module (`Accounts.jsx`)
- **B2B Mode (Company Accounts):**
  - Manage corporate clients, industry classifications, annual revenues, phone numbers, and websites.
  - Related tabs: Associated Contacts, Linked Deals, Invoices, and Tasks.
- **B2C Mode (Individual Customer Profiles):**
  - Customer personal info: Mobile, Email, Physical Address, Gender, and Notes.
  - **Attached Services:** Add one or multiple services from the service catalog.
  - **Service Stage Tracking:** Track progress for multi-stage services (e.g., Application -> Review -> Processing -> Completed).
  - **Payment Status Tracking:** Status (`Paid`, `Partial`, `Pending`), Payment Mode (`Cash`, `UPI`, `Card`, `Net Banking`), Amount Paid, Balance Due, and Due Date.
  - **Document Attachments:** File uploader connected to Supabase Storage (`customer-docs`).
  - **Statement PDF Download:** Generate formal PDF customer profile and billing statements with `jspdf-autotable`.

---

### 4.7 Services Catalog & Pipeline Builder (`Services.jsx`)
- **Catalog Management:** Create and edit services with Service Name, Price, Reminder Days, and Description.
- **Service Types:**
  - **Instant Service:** Single-step immediate fulfillment.
  - **Multi-Stage Service:** Multi-step delivery workflow.
- **Dynamic Stage Builder:**
  - Create custom service delivery stages with custom color palettes and reordering.
  - Visual stage history and customer progress updates.
- **Multi-Currency Conversion Engine:**
  - Auto-converts stored base prices (INR ₹) to USD ($), EUR (€), GBP (£), and JPY/CNY (¥) based on workspace settings.

---

### 4.8 Opportunities & Deals Pipeline Module (`Opportunities.jsx`)
- **Dual Views:** Kanban board (drag-and-drop between stages) and structured table view.
- **Default & Custom Stages:** `Prospecting` -> `Scoping` -> `Negotiation` -> `Legal` -> `Contract` -> `Closed Won / Lost`.
- **Deal Financials:** Deal amount, expected close date, probability, and deal owner.
- **Products & Line Items:** Add product line items with quantities, unit prices, and auto-computed totals.
- **Linked Records Tab:** View Quotes, Invoices, Tasks, and Activities related to the opportunity.

---

### 4.9 Quotes & Proposals Module (`Quotes.jsx`)
- **Interactive Proposal Builder:**
  - Add multiple line items with description, quantity, and unit price.
  - Auto-calculated subtotal, tax, and final amount.
  - Expiry date picker and custom Terms & Conditions editor.
- **Status Lifecycle:** `Draft` -> `Sent` -> `Accepted` -> `Rejected`.
- **One-Click Invoice Conversion:** Convert accepted quotes into payable invoices.
- **Professional PDF Export:** Instant generation of branded quotation PDF documents.

---

### 4.10 Invoicing & Billing Module (`Invoices.jsx`)
- **Invoice Management:** Track invoice titles, billed customer/account, due dates, amounts, and payment statuses (`Paid`, `Unpaid`, `Overdue`).
- **Status Filters:** Quick filters to identify overdue and pending payments.
- **PDF Invoice Generation:** Formatted tax invoices with business branding, client details, line items, and payment instructions.
- **WhatsApp Share:** Send payment reminders and invoice links directly to client WhatsApp numbers.

---

### 4.11 Task & Reminder Module (`Tasks.jsx`)
- **Task Types:** `Follow-up`, `Demo`, `Onboarding`, `Renewal`, `Support`, `Email`, `Message`, `Call`, and `Events`.
- **Status Stages:** `Pending`, `In Progress`, `Completed`, and `Overdue`.
- **Cross-Module Relationships:** Link tasks to Leads, Contacts, Accounts, Opportunities, Quotes, Invoices, or Tickets.
- **Due Date Automation:** Automatic overdue badge calculation based on local system time.
- **Task Views:** Active Tasks vs Historical / Completed Tasks.

---

### 4.12 Support & Helpdesk Ticket Module (`Tickets.jsx`)
- **Ticket Tracking:** Unique Ticket Numbers, Subject, Detailed Description, Assignee/Owner, Priority (`Low`, `Medium`, `High`), and Status (`Open`, `Pending`, `Closed`).
- **Customer Association:** Link tickets directly to Accounts and Contacts.
- **Custom Fields Integration:** Custom categorization (e.g., Issue Category, Resolution Notes, SLA Tier).

---

### 4.13 Reports & Business Intelligence Module (`Reports.jsx`)
- **Custom Report Builder:**
  - Build reports across any CRM module (Leads, Contacts, Accounts, Opportunities, Tickets, Tasks, Invoices, Quotes).
  - Multi-criteria filters: Owner, Status, Priority, and Date Ranges (From / To).
  - Folder categorization (`General`, `Sales`, `Support`, `Finance`, `Operations`).
- **Interactive Report Table:** Live table rendering with clickable records that navigate directly to the record details.
- **PDF Report Generation:** Export filtered data reports as structured PDF documents with `jspdf-autotable`.

---

### 4.14 System Settings & Configuration (`Settings.jsx`)
- **Business Info:** Company name, tagline, logo upload, address, contact email/phone, GST / Tax ID, and B2B/B2C Mode toggle.
- **Currency & Finance:** Select default currency (`₹`, `$`, `€`, `£`, `¥`), default tax rate (%), default payment due terms (days), and monthly revenue goals.
- **Language & Formatting:** Select UI language (English, Hindi, Tamil) and preferred date format (`DD/MM/YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD`).
- **Team Management:** Add and manage team members, roles, and access credentials.
- **Notification Preferences:** WhatsApp, SMS, and Email notification toggles for deal wins, lead assignments, and overdue invoices.
- **Pipeline Customization:** Add, edit, reorder, and remove stages for both sales and service pipelines.
- **Security & Backup:** 2FA toggles, session timeout settings, and complete CRM data export (JSON/CSV backup).

---

### 4.15 Dynamic Custom Field Builder (`FieldBuilderModal.jsx`)
- **Universal Availability:** Usable across Leads, Customer Profiles, Accounts, Opportunities, Invoices, Tasks, and Tickets.
- **Supported Field Data Types (9 Types):**
  1. `text` — Single-line text
  2. `long_text` — Multi-line textarea
  3. `number` — Numeric values
  4. `date` — Date picker
  5. `checkbox` — Boolean toggle
  6. `dropdown` — Single-choice select menu
  7. `multi_select` — Multi-tag selectable badges
  8. `url` — Validated hyperlinks
  9. `file_upload` — Direct document/image upload to Supabase storage
- **Field Controls:** Set Required (`is_required`), Show in Table View (`show_in_list`), Reorder fields (Up/Down), and Archive/Unarchive.

---

### 4.16 WhatsApp Click-to-Chat Subsystem (`whatsapp.js`, `WhatsAppButton.jsx`)
- **Smart Phone Number Parser:** Strips invalid formatting, trims leading zeroes, and auto-attaches country code (`+91` default).
- **Contextual Pre-filled Templates:** Generates customized messages based on module context (Lead name, Business name, Opportunity title, Agent name).
- **Zero-API Dependency:** Uses standard `https://wa.me/{number}?text={encoded_message}` protocol requiring no paid third-party API keys.

---

### 4.17 Internationalization Subsystem (`i18n.js`, `locales/`)
- Complete locale translations across English (`en.json`), Hindi (`hi.json`), and Tamil (`ta.json`).
- Covers landing page, sidebar navigation, form labels, buttons, validation alerts, toast messages, and KPI headers.

---

## 5. Database Schema & Entities

```
+-------------------------------------------------------------------------------+
|                             PostgreSQL Database Schema                        |
+-------------------------------------------------------------------------------+
| profiles                - User profiles, company metadata, roles, currency    |
| leads                   - Sales leads with status, owner, custom_data (JSONB) |
| contacts                - Individual business contacts linked to accounts     |
| accounts                - B2B companies / B2C customers, custom_data (JSONB)  |
| opportunities           - Sales pipeline deals, stages, amounts, probabilities|
| quotes                  - Quotes, line items (JSON), expiry, total price      |
| services                - Service catalog items (Instant vs Multi-Stage)      |
| customer_services       - Attached customer services, stage progress, balance |
| b2c_stages              - Custom stages for B2C service delivery pipelines    |
| b2c_customer_stages     - Historical stage movement logs for customer services|
| tasks                   - Tasks linked to accounts, leads, deals, tickets     |
| tickets                 - Helpdesk tickets with status, priority, description |
| activities              - Historical event stream (calls, emails, meetings)   |
| reports                 - Saved custom report configs and filter definitions  |
| custom_field_configs    - Universal custom field definitions per module       |
+-------------------------------------------------------------------------------+
```

---

## 6. Directory Structure Reference

```
c:\Desktop\CRM\
├── docs/                                  # Project documentation
│   ├── FEATURES_ROLES_AND_MODULES.md
│   ├── TECH_STACK_AND_FEATURES.md
│   └── README.md
├── database/                              # Database schema & migrations
│   ├── migrations/
│   │   ├── 001_add_contact_number_column.sql
│   │   ├── 002_add_currency_column.sql
│   │   ├── 003_add_custom_data_to_customer_services.sql
│   │   ├── ... (15 numbered migration files)
│   │   └── 015_setup_admin_and_confirm.sql
│   └── README.md                          # Migration instructions
├── scripts/                               # Utility & debug scripts
│   ├── add_status.mjs
│   ├── check_db.mjs
│   ├── fix_admin2.cjs
│   └── rewrite.cjs
├── public/                                # Static assets served as-is
│   ├── favicon.svg
│   └── icons.svg
├── src/                                   # Application source code
│   ├── assets/                            # Static media
│   │   ├── images/
│   │   │   ├── dashboard_preview.png
│   │   │   ├── hero.png
│   │   │   └── video_thumbnail.png
│   │   └── icons/
│   │       ├── react.svg
│   │       └── vite.svg
│   ├── components/                        # React components
│   │   ├── modules/                       # Feature/domain modules
│   │   │   ├── Accounts.jsx               # B2B Accounts & B2C Customer Profiles
│   │   │   ├── Contacts.jsx               # B2B Contact Directory
│   │   │   ├── DashboardHome.jsx          # Analytics, Goal Tracking & Charts
│   │   │   ├── Invoices.jsx               # Invoicing & PDF Generation
│   │   │   ├── Leads.jsx                  # Lead Management & Conversion
│   │   │   ├── Opportunities.jsx          # Deals Pipeline (Kanban & List)
│   │   │   ├── Quotes.jsx                 # Quotation & Proposal Builder
│   │   │   ├── Reports.jsx                # Custom BI Report Builder
│   │   │   ├── Services.jsx               # B2C Service Catalog & Stage Builder
│   │   │   ├── Settings.jsx               # Business, Finance, Team & Pipeline Settings
│   │   │   ├── Tasks.jsx                  # Cross-Entity Task & Activity Tracker
│   │   │   └── Tickets.jsx                # Support Helpdesk & SLA Tracker
│   │   └── ui/                            # Shared UI components
│   │       ├── FieldBuilderModal.jsx      # Universal Dynamic Custom Field Builder
│   │       ├── GlobalSearch.jsx           # Universal Omnibar Search
│   │       ├── LanguageSwitcher.jsx       # EN / HI / TA Locale Switcher
│   │       ├── LocalSearch.jsx            # In-module Realtime Table Search
│   │       ├── ProfileModal.jsx           # User Profile Edit Modal
│   │       └── WhatsAppButton.jsx         # Click-to-Chat WhatsApp Trigger
│   ├── lib/                               # Utility libraries & helpers
│   │   ├── supabase.js                    # Supabase Client Initialization
│   │   └── whatsapp.js                    # WhatsApp Sanitizer & Template Engine
│   ├── locales/                           # i18n translation files
│   │   ├── en.json                        # English Translations
│   │   ├── hi.json                        # Hindi Translations
│   │   └── ta.json                        # Tamil Translations
│   ├── pages/                             # Route-level page components
│   │   ├── Dashboard.jsx                  # Unified Dashboard Shell & Admin Panels
│   │   ├── LandingPage.jsx                # Public Marketing & Pricing Page
│   │   ├── Login.jsx                      # User Login Screen
│   │   └── SignUp.jsx                     # User Registration Screen
│   ├── styles/                            # All CSS files
│   │   ├── index.css                      # Design Tokens & Core Theme Styles
│   │   └── App.css                        # App-level Styles
│   ├── App.jsx                            # Route Hierarchy & Session Provider
│   ├── main.jsx                           # React DOM Bootstrapper
│   └── i18n.js                            # i18n Configuration
├── .gitignore
├── eslint.config.js                       # ESLint Configuration
├── index.html                             # HTML Entry Point
├── package.json                           # Project Dependencies & Build Scripts
├── vite.config.js                         # Vite Build Configuration
└── vercel.json                            # Vercel Deployment SPA Routing
```
