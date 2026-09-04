# XOWIQ CRM — Comprehensive Features, Roles & Modules Specification

> **Project Name:** XOWIQ CRM  
> **Workspace:** `c:\Desktop\CRM`  
> **Documentation Type:** Role-Based Access Control (RBAC), Modules Catalog & Feature Matrix  

---

## 1. User Roles & Permission Hierarchy

XOWIQ CRM utilizes a multi-tiered **Role-Based Access Control (RBAC)** architecture configured per organization/tenant.

```
+-------------------------------------------------------------------------------+
|                             ROLE HIERARCHY                                    |
+-------------------------------------------------------------------------------+
|                                                                               |
|   +-----------------------------------------------------------------------+   |
|   | 1. SUPER ADMIN / TENANT OWNER                                         |   |
|   |    - Full system governance & organization billing                    |   |
|   |    - Company profile, tax, currency, and multi-mode switching         |   |
|   |    - User provisioning, role assignments & team record oversight      |   |
|   |    - Global KPI dashboard & sales analytics                           |   |
|   +-----------------------------------------------------------------------+   |
|                                       │                                       |
|                                       ▼                                       |
|   +-----------------------------------------------------------------------+   |
|   | 2. MANAGER                                                            |   |
|   |    - Departmental oversight across leads, deals, tickets & invoices   |   |
|   |    - Team task assignment & stage tracking                            |   |
|   |    - Custom report building & PDF exports                             |   |
|   |    - Standard operational access across CRM modules                   |   |
|   +-----------------------------------------------------------------------+   |
|                                       │                                       |
|                                       ▼                                       |
|   +-----------------------------------------------------------------------+   |
|   | 3. STAFF / STANDARD USER                                              |   |
|   |    - Personal CRM workspace with assigned leads & customers           |   |
|   |    - Direct customer communication via WhatsApp Click-to-Chat         |   |
|   |    - Opportunity progress updates & quote generation                  |   |
|   |    - Task completion and support ticket resolution                    |   |
|   +-----------------------------------------------------------------------+   |
|                                                                               |
+-------------------------------------------------------------------------------+
```

---

### 1.1 Detailed Role Definitions

| Role | Target Audience | Primary Responsibilities & Scope |
| :--- | :--- | :--- |
| **Admin (`admin`)** | Business Owners, CXOs, System Administrators | • Complete access to all CRM modules and configuration panels.<br>• Access to **KPI Performance Dashboard** with per-user metrics.<br>• Access to **User Management** (create staff accounts, assign roles, delete accounts).<br>• Access to **Team Records Panel** to inspect all data created across all staff members.<br>• Configure company info, tax rates, base currency, pipeline stages, and security settings.<br>• Manage universal Custom Field definitions. |
| **Manager (`manager`)** | Sales Leads, Support Leads, Operations Managers | • Comprehensive read/write access across all functional CRM modules.<br>• Oversee deal pipelines, customer service progress, and ticket resolution.<br>• Generate and export customized business intelligence PDF reports.<br>• Assign tasks and follow-ups to staff members. |
| **Standard User (`user`)** | Sales Reps, Support Executives, Field Agents | • Manage assigned leads, contacts, customer profiles, and opportunities.<br>• Send 1-click WhatsApp messages to clients.<br>• Create and update support tickets, quotes, and task reminders.<br>• Update service milestones and stage transitions. |

---

### 1.2 Role Permissions Matrix

| Feature / Action | Admin | Manager | Standard User |
| :--- | :---: | :---: | :---: |
| **Executive KPI Dashboard (`/dashboard`)** | ✅ Full Access | ❌ No Access | ❌ No Access |
| **User Management (`/dashboard/users`)** | ✅ Create / Delete | ❌ No Access | ❌ No Access |
| **Team Records Overview (`/dashboard/team_records`)** | ✅ View All Team Data | ❌ No Access | ❌ No Access |
| **Company & Currency Settings** | ✅ Full Edit | ❌ Read Only | ❌ Read Only |
| **Pipeline Stage Customization** | ✅ Full Edit | ⚠️ Read Only | ❌ No Access |
| **Universal Custom Field Builder** | ✅ Create / Edit / Archive | ✅ Use Fields | ✅ Use Fields |
| **Lead Management & Conversion** | ✅ Full Access | ✅ Full Access | ✅ Assigned Records |
| **Contact & Account Directory** | ✅ Full Access | ✅ Full Access | ✅ Full Access |
| **Opportunities & Kanban Board** | ✅ Full Access | ✅ Full Access | ✅ Assigned Records |
| **Quotes & Invoices Generation** | ✅ Full Access | ✅ Full Access | ✅ Full Access |
| **Customer Service Stage Tracking** | ✅ Stage Builder + Edit | ✅ Manage Stages | ✅ Update Progress |
| **Tasks & Activity Logging** | ✅ All Tasks | ✅ Team Tasks | ✅ Personal Tasks |
| **Support Tickets Management** | ✅ All Tickets | ✅ All Tickets | ✅ Assigned Tickets |
| **Custom BI Report Building & PDF Export** | ✅ Full Access | ✅ Full Access | ✅ Personal Reports |
| **WhatsApp Click-to-Chat Dispatch** | ✅ Active | ✅ Active | ✅ Active |

---

## 2. Business Operating Modes

XOWIQ CRM supports two distinct operating modes configured per tenant:

```
                                  +-------------------+
                                  |    XOWIQ CRM      |
                                  +---------+---------+
                                            |
                    +-----------------------+-----------------------+
                    |                                               |
                    ▼                                               ▼
         +---------------------+                         +---------------------+
         |      B2B MODE       |                         |      B2C MODE       |
         | (Business-to-Business)                       | (Business-to-Consumer)
         +----------+----------+                         +----------+----------+
                    |                                               |
                    ├─► Leads Management                            ├─► Leads Management
                    ├─► Contacts Directory                          ├─► Customer Profiles
                    ├─► Company Accounts                            ├─► Services Catalog
                    ├─► Deals & Pipeline Stages                     ├─► Stage Progress Tracker
                    ├─► Quotes & Proposals                          ├─► Milestone Completion
                    ├─► B2B Invoices                                ├─► Consumer Invoices
                    ├─► Tasks & Reminders                           ├─► Tasks & Reminders
                    ├─► Support Tickets                             ├─► Support Tickets
                    └─► Custom Reports                              └─► Custom Reports
```

---

## 3. Complete Modules Inventory

### Core Modules Breakdown

| # | Module Name | Primary Component | Mode | Primary Capabilities |
| :-: | :--- | :--- | :-: | :--- |
| **01** | **Authentication & Onboarding** | `Login.jsx`, `SignUp.jsx`, `LandingPage.jsx` | All | User registration, tenant creation, mode selection (B2B/B2C), and secure JWT sessions. |
| **02** | **Executive KPI Oversight** | `Dashboard.jsx` (`KPIPanel`) | Admin | Aggregated sales metrics, team breakdown, live activity monitoring, and polling fallback. |
| **03** | **User & Team Management** | `Dashboard.jsx` (`UserManagementPanel`) | Admin | Team member provisioning, credential generation, role assignment, and account deletion. |
| **04** | **Team Records Central View** | `Dashboard.jsx` (`TeamRecordsPanel`) | Admin | Unified repository of all records created by all team members across all modules. |
| **05** | **Smart Analytics Dashboard** | `DashboardHome.jsx` | All | Revenue targets, sales funnel charts, live event stream, priority tasks, and PDF export. |
| **06** | **Lead Management** | `Leads.jsx` | All | Lead capture, lifecycle tracking, custom fields, WhatsApp chat, and 1-click conversion. |
| **07** | **Contact Management** | `Contacts.jsx` | B2B | Business contact profiles, account links, activity history, and communication triggers. |
| **08** | **Account / Customer Profiles** | `Accounts.jsx` | Both | **B2B:** Corporate accounts & hierarchies.<br>**B2C:** Individual profiles, service progress, payments, and storage files. |
| **09** | **Services & Stage Progress** | `Services.jsx` | B2C | Instant vs Multi-Stage services, dynamic stage builder, currency converter, and milestone tracking. |
| **10** | **Opportunities & Deals** | `Opportunities.jsx` | B2B | Visual Kanban pipeline, custom sales stages, deal financials, line items, and probability. |
| **11** | **Quotes & Proposals** | `Quotes.jsx` | B2B | Itemized proposals, expiry dates, terms editor, quote-to-invoice conversion, and PDF export. |
| **12** | **Invoicing & Billing** | `Invoices.jsx` | Both | Status tracking (`Paid`, `Unpaid`, `Overdue`), customized PDF invoices, and WhatsApp share. |
| **13** | **Tasks & Activity Tracking** | `Tasks.jsx` | Both | 9 Task types, cross-module entity relationships, overdue alerts, and history archive. |
| **14** | **Support Helpdesk Tickets** | `Tickets.jsx` | Both | Auto-ticket numbers, priority classification, SLA status tracking, and account linking. |
| **15** | **Custom BI Reports** | `Reports.jsx` | Both | Multi-entity query engine, customizable filters, folders, table views, and PDF export. |
| **16** | **Universal Custom Field Builder** | `FieldBuilderModal.jsx` | Both | 9 Data types, drag-and-drop ordering, required validation, and table visibility toggles. |
| **17** | **WhatsApp Click-to-Chat** | `WhatsAppButton.jsx`, `whatsapp.js` | Both | Phone sanitizer, international formatting (+91), contextual pre-filled messages (`wa.me`). |
| **18** | **System Settings & Governance** | `Settings.jsx` | Admin | Business metadata, currency symbols, tax rates, pipeline customization, and data backup. |
| **19** | **Multi-Language (i18n)** | `i18n.js`, `locales/` | All | English (`en`), Hindi (`hi`), Tamil (`ta`) dynamic translation and locale switcher. |
| **20** | **Omnibar & Local Search** | `GlobalSearch.jsx`, `LocalSearch.jsx` | All | Global search across entire CRM and instant real-time table filtering. |

---

## 4. Exhaustive Feature Matrix by Module

```
LEGEND:
[ADM] = Admin | [MGR] = Manager | [USR] = Standard User
[B2B] = B2B Mode | [B2C] = B2C Mode | [ALL] = Available in Both Modes
```

---

### Module 1: Authentication & Onboarding
| # | Feature Name | Description | Roles | Mode |
| :-: | :--- | :--- | :-: | :-: |
| 1.1 | **Marketing Landing Page** | Public showcase of platform value proposition, feature tiles, and dynamic language selector. | Public | ALL |
| 1.2 | **Video Tour Demo Modal** | High-impact modal popup with product walkthrough video. | Public | ALL |
| 1.3 | **Tiered Pricing Display** | Transparent pricing cards (Starter, Pro, Enterprise) with feature checklist and CTA buttons. | Public | ALL |
| 1.4 | **Secure Registration** | Account creation storing company metadata, initial admin credentials, and business mode. | Public | ALL |
| 1.5 | **Secure User Login** | JWT-based authentication via Supabase with automatic role and profile resolution. | Public | ALL |
| 1.6 | **Unified Route Guard** | Automated redirection protecting private dashboard routes from unauthenticated sessions. | ALL | ALL |
| 1.7 | **Session Migration Mechanism** | Forced local migration flag ensuring users run on the unified dashboard architecture. | ALL | ALL |

---

### Module 2: Executive KPI Dashboard (Admin Only)
| # | Feature Name | Description | Roles | Mode |
| :-: | :--- | :--- | :-: | :-: |
| 2.1 | **Aggregate Revenue & Metrics** | Real-time totals for Leads, Customers, Deals Won, Deals Value, Tasks Done, and Tickets Resolved. | [ADM] | ALL |
| 2.2 | **Per-User Performance Matrix** | Granular team table displaying each agent's individual output, deal counts, and activity volume. | [ADM] | ALL |
| 2.3 | **Last Active Timestamping** | Real-time tracking of when team members last performed an activity or logged in. | [ADM] | ALL |
| 2.4 | **Dual Realtime + Polling Sync** | WebSocket listeners with automatic 30s background poll fallback to ensure 100% data freshness. | [ADM] | ALL |
| 2.5 | **Currency-Aware Value Display** | Formats revenue and deal values using the tenant's chosen currency symbol (₹, $, €, £, ¥). | [ADM] | ALL |

---

### Module 3: User & Team Management (Admin Only)
| # | Feature Name | Description | Roles | Mode |
| :-: | :--- | :--- | :-: | :-: |
| 3.1 | **Tenant Sub-User Provisioning** | Admin form to create new team member credentials (name, email, password, role). | [ADM] | ALL |
| 3.2 | **Tenant-Scoped Duplicate Check** | Collision prevention verifying that new user emails do not conflict with existing team members. | [ADM] | ALL |
| 3.3 | **Password Masking Toggle** | Interactive eye/eye-off button for password verification during account setup. | [ADM] | ALL |
| 3.4 | **Role Assignment (Admin/User)** | Assign either administrative privileges or standard user operational access. | [ADM] | ALL |
| 3.5 | **Team Member Removal** | Remove staff members with automatic database and localStorage sync. | [ADM] | ALL |

---

### Module 4: Centralized Team Records (Admin Only)
| # | Feature Name | Description | Roles | Mode |
| :-: | :--- | :--- | :-: | :-: |
| 4.1 | **Multi-Tab Records View** | Unified oversight tabs for Leads, Contacts, Deals, Tasks, and Support Tickets. | [ADM] | ALL |
| 4.2 | **Creator Attribution** | Displays the author/owner email who generated each specific record. | [ADM] | ALL |
| 4.3 | **Direct Record Navigation** | "Open Details" button immediately jumping to the record in its parent module. | [ADM] | ALL |
| 4.4 | **Live Team Search** | Instant filter search bar across record titles, subjects, company names, and creator emails. | [ADM] | ALL |

---

### Module 5: Smart Analytics Dashboard
| # | Feature Name | Description | Roles | Mode |
| :-: | :--- | :--- | :-: | :-: |
| 5.1 | **Executive Stat Cards** | Metric cards displaying Revenue, Open Leads, Opportunities, Tickets, Customers, and Invoices. | [ALL] | ALL |
| 5.2 | **Date Range Filtering** | Dynamically filter dashboard stats by 7 Days, 30 Days, 90 Days, This Month, Last Month, or Year. | [ALL] | ALL |
| 5.3 | **Revenue Goal Progress Bar** | Target progress indicator calculating percentage completion towards monthly revenue goals. | [ALL] | ALL |
| 5.4 | **Interactive Sales Funnel** | Recharts visual funnel breaking down deals across prospecting, negotiation, and closing stages. | [ALL] | [B2B] |
| 5.5 | **Priority Action Items Queue** | Highlights urgent upcoming tasks and calls with direct completion triggers. | [ALL] | ALL |
| 5.6 | **Live Activity Stream** | Real-time log of customer interactions, stage updates, and record creations. | [ALL] | ALL |
| 5.7 | **Dashboard PDF Snapshot Export** | Captures the entire visual dashboard as a downloadable PDF file via `html2canvas` and `jsPDF`. | [ALL] | ALL |

---

### Module 6: Lead Management
| # | Feature Name | Description | Roles | Mode |
| :-: | :--- | :--- | :-: | :-: |
| 6.1 | **Structured Lead Directory** | Serial-numbered lead records with lead name, company, email, phone, and owner assignment. | [ALL] | ALL |
| 6.2 | **Lifecycle Status Management** | Track lead qualification through `New`, `Contacted`, `Qualified`, `Lost`, and `Converted`. | [ALL] | ALL |
| 6.3 | **1-Click Lead Conversion** | Automatically converts a qualified lead into a Contact, Company Account, and Deal Opportunity. | [ALL] | [B2B] |
| 6.4 | **Attached Lead Tasks** | Schedule follow-ups, calls, and demos specifically mapped to the lead. | [ALL] | ALL |
| 6.5 | **Lead Interaction Log** | Record chronological call notes, email logs, and meeting outcomes. | [ALL] | ALL |
| 6.6 | **WhatsApp Lead Engagement** | 1-click WhatsApp button opening a chat with: *"Hi {Name}, thanks for your interest in {Company}."* | [ALL] | ALL |
| 6.7 | **Dynamic Custom Lead Fields** | Add custom properties (e.g. Lead Source, Budget, Industry) via the Field Builder. | [ALL] | ALL |

---

### Module 7: Contact Management (B2B)
| # | Feature Name | Description | Roles | Mode |
| :-: | :--- | :--- | :-: | :-: |
| 7.1 | **B2B Contact Directory** | Store contact names, emails, phone numbers, job titles, and ownership details. | [ALL] | [B2B] |
| 7.2 | **Parent Account Linkage** | Associates individual contacts with corporate company accounts. | [ALL] | [B2B] |
| 7.3 | **Direct WhatsApp Action** | Direct WhatsApp chat with phone number sanitization and country-code auto-formatting. | [ALL] | [B2B] |
| 7.4 | **Contact-Specific Tasks** | Create and complete follow-up tasks linked to the specific contact. | [ALL] | [B2B] |
| 7.5 | **Activity Timeline** | View historical log of calls, meetings, and note updates for each contact. | [ALL] | [B2B] |

---

### Module 8: Accounts & Customer Profiles
| # | Feature Name | Description | Roles | Mode |
| :-: | :--- | :--- | :-: | :-: |
| 8.1 | **B2B Corporate Accounts** | Manage corporate clients, industry classifications, annual revenues, and phone contacts. | [ALL] | [B2B] |
| 8.2 | **Account Relationship Hub** | Centralized view of all Contacts, Deals, Invoices, and Tasks linked to the account. | [ALL] | [B2B] |
| 8.3 | **B2C Customer Profiles** | Customer personal records: Mobile, Email, Full Address, Gender, and Operational Notes. | [ALL] | [B2C] |
| 8.4 | **Multi-Service Attachment** | Assign multiple services from the catalog to a single customer profile. | [ALL] | [B2C] |
| 8.5 | **Milestone Stage Tracking** | Track delivery progress across custom stages for multi-stage services. | [ALL] | [B2C] |
| 8.6 | **Payment & Billing Tracker** | Track Payment Status (`Paid`, `Partial`, `Pending`), Payment Mode, Amount Paid, and Balance. | [ALL] | [B2C] |
| 8.7 | **Document Cloud Uploads** | Direct file uploader saving customer identity and contracts in Supabase Storage (`customer-docs`). | [ALL] | [B2C] |
| 8.8 | **Customer Statement PDF** | Export comprehensive customer profile summary, services, and billing as a formal PDF. | [ALL] | [B2C] |

---

### Module 9: Services Catalog & Stage Progress (B2C)
| # | Feature Name | Description | Roles | Mode |
| :-: | :--- | :--- | :-: | :-: |
| 9.1 | **Service Catalog Management** | Create and edit services with Name, Price, Description, and Renewal Reminder Days. | [ALL] | [B2C] |
| 9.2 | **Service Delivery Classification** | Distinguish between **Instant Services** (single-step) and **Multi-Stage Services** (workflows). | [ALL] | [B2C] |
| 9.3 | **Dynamic Stage Builder** | Admins can create, color-code, and reorder stages for multi-step service delivery pipelines. | [ADM] | [B2C] |
| 9.4 | **Stage Movement History** | Chronological audit trail recording each time a customer moves between service stages. | [ALL] | [B2C] |
| 9.5 | **Multi-Currency Converter Engine** | Automatic price conversion from INR base to USD ($), EUR (€), GBP (£), or JPY (¥). | [ALL] | [B2C] |

---

### Module 10: Opportunities & Sales Pipeline (B2B)
| # | Feature Name | Description | Roles | Mode |
| :-: | :--- | :--- | :-: | :-: |
| 10.1 | **Dual View (Kanban & Table)** | Toggle between interactive drag-and-drop Kanban pipeline board and structured table view. | [ALL] | [B2B] |
| 10.2 | **Customizable Sales Stages** | Standard stages (`Prospecting`, `Scoping`, `Negotiation`, `Legal`, `Contract`, `Closed`) + custom stages. | [ALL] | [B2B] |
| 10.3 | **Deal Financials & Probability** | Track deal valuation, expected close dates, win probabilities, and assigned sales owner. | [ALL] | [B2B] |
| 10.4 | **Product Line Item Builder** | Add multiple line items/products with quantities and unit prices inside each deal. | [ALL] | [B2B] |
| 10.5 | **Deal Relationships Hub** | Inspect linked Quotes, Invoices, Tasks, and Activity logs for the selected deal. | [ALL] | [B2B] |
| 10.6 | **WhatsApp Follow-up Action** | 1-click WhatsApp follow-up with pre-filled message: *"Hi {Name}, following up on {Deal}."* | [ALL] | [B2B] |

---

### Module 11: Quotes & Proposals (B2B)
| # | Feature Name | Description | Roles | Mode |
| :-: | :--- | :--- | :-: | :-: |
| 11.1 | **Itemized Proposal Builder** | Add multiple line items with descriptions, quantities, and prices with auto-calculated total. | [ALL] | [B2B] |
| 11.2 | **Expiry Date & Terms Editor** | Set proposal validity expiration dates and customized commercial terms & conditions. | [ALL] | [B2B] |
| 11.3 | **Proposal Lifecycle Tracking** | Monitor quote statuses: `Draft` -> `Sent` -> `Accepted` -> `Rejected`. | [ALL] | [B2B] |
| 11.4 | **Quote-to-Invoice Conversion** | Automatically generate a payable invoice from an accepted proposal. | [ALL] | [B2B] |
| 11.5 | **Branded PDF Proposal Export** | Instant client-ready quotation PDF generation using `jspdf-autotable`. | [ALL] | [B2B] |

---

### Module 12: Invoicing & Billing
| # | Feature Name | Description | Roles | Mode |
| :-: | :--- | :--- | :-: | :-: |
| 12.1 | **Invoice Ledger Management** | Issue and track invoices with billing amounts, due dates, customer links, and status. | [ALL] | ALL |
| 12.2 | **Status Lifecycle & Overdue Detection** | Track `Paid`, `Unpaid`, and `Overdue` statuses with color-coded badges. | [ALL] | ALL |
| 12.3 | **Status Filter Tabs** | Quick tabs to isolate unpaid or overdue invoices requiring follow-up. | [ALL] | ALL |
| 12.4 | **PDF Tax Invoice Generator** | Generates formal, branded PDF invoices with tax breakdown and payment terms. | [ALL] | ALL |
| 12.5 | **WhatsApp Invoice Dispatch** | Send payment reminders and billing notifications directly to customer WhatsApp numbers. | [ALL] | ALL |

---

### Module 13: Task & Activity Management
| # | Feature Name | Description | Roles | Mode |
| :-: | :--- | :--- | :-: | :-: |
| 13.1 | **9 Standardized Task Types** | `Follow-up`, `Demo`, `Onboarding`, `Renewal`, `Support`, `Email`, `Message`, `Call`, `Events`. | [ALL] | ALL |
| 13.2 | **Cross-Module Association** | Link tasks to Leads, Contacts, Accounts, Opportunities, Quotes, Invoices, or Tickets. | [ALL] | ALL |
| 13.3 | **Status Progression** | Progress tasks through `Pending`, `In Progress`, `Completed`, and auto-flagged `Overdue`. | [ALL] | ALL |
| 13.4 | **Dual Task Views** | Separate **Active Tasks** view from **Task History** archive for completed tasks. | [ALL] | ALL |
| 13.5 | **Due Date Automation** | Real-time date comparison highlighting overdue items in bold alert badges. | [ALL] | ALL |

---

### Module 14: Support Helpdesk & Ticketing
| # | Feature Name | Description | Roles | Mode |
| :-: | :--- | :--- | :-: | :-: |
| 14.1 | **Automated Ticket Numbering** | Generates unique sequential ticket identification numbers (e.g. `TICK-1001`). | [ALL] | ALL |
| 14.2 | **Priority Classification** | Triage support queries with `Low`, `Medium`, and `High` priority levels. | [ALL] | ALL |
| 14.3 | **SLA Status Lifecycle** | Track tickets through `Open`, `Pending`, and `Closed / Resolved` states. | [ALL] | ALL |
| 14.4 | **Account & Contact Association** | Direct foreign key mapping linking tickets to parent customer accounts and contacts. | [ALL] | ALL |
| 14.5 | **Ticket Resolution Log** | Capture incident descriptions, root causes, and resolution notes. | [ALL] | ALL |

---

### Module 15: Custom Reports & Business Intelligence
| # | Feature Name | Description | Roles | Mode |
| :-: | :--- | :--- | :-: | :-: |
| 15.1 | **Multi-Entity Query Builder** | Build reports across Leads, Contacts, Accounts, Opportunities, Tickets, Tasks, or Invoices. | [ALL] | ALL |
| 15.2 | **Multi-Criteria Filtering** | Filter report datasets by Owner, Status, Priority, and Custom Date Ranges (From / To). | [ALL] | ALL |
| 15.3 | **Folder Categorization** | Organize saved reports into custom folders (`Sales`, `Support`, `Finance`, `General`). | [ALL] | ALL |
| 15.4 | **Interactive Report Table** | Live table display with clickable rows that navigate directly into the record details. | [ALL] | ALL |
| 15.5 | **Tabular PDF Report Export** | Export formatted reporting data as presentation-ready PDF tables via `jspdf-autotable`. | [ALL] | ALL |

---

### Module 16: Universal Dynamic Custom Field Builder
| # | Feature Name | Description | Roles | Mode |
| :-: | :--- | :--- | :-: | :-: |
| 16.1 | **9 Supported Data Types** | `text`, `long_text`, `number`, `date`, `checkbox`, `dropdown`, `multi_select`, `url`, `file_upload`. | [ALL] | ALL |
| 16.2 | **Cross-Module Availability** | Inject custom fields into Leads, Accounts, Opportunities, Invoices, Tasks, and Tickets. | [ALL] | ALL |
| 16.3 | **Drag-and-Drop Reordering** | Custom display order controls (Up / Down) for customized form layouts. | [ALL] | ALL |
| 16.4 | **Validation Constraints** | Set `is_required` constraints dynamically per custom field. | [ALL] | ALL |
| 16.5 | **Table List Visibility** | Control whether custom attributes appear as columns in module data tables. | [ALL] | ALL |
| 16.6 | **Field Archiving** | Soft-archive custom fields without losing historical JSONB data. | [ALL] | ALL |

---

### Module 17: Direct WhatsApp Communication
| # | Feature Name | Description | Roles | Mode |
| :-: | :--- | :--- | :-: | :-: |
| 17.1 | **Phone Number Sanitization** | Automatically strips symbols, spaces, leading zeroes, and prepends `+91` country code. | [ALL] | ALL |
| 17.2 | **Contextual Message Templates** | Generates module-specific greetings (Lead introduction, Deal follow-up, Payment reminder). | [ALL] | ALL |
| 17.3 | **Click-to-Chat Dispatch** | Direct `https://wa.me` URL dispatch opening WhatsApp Web or desktop without third-party fees. | [ALL] | ALL |

---

### Module 18: System Settings & Governance
| # | Feature Name | Description | Roles | Mode |
| :-: | :--- | :--- | :-: | :-: |
| 18.1 | **Business Identity** | Manage company name, tagline, address, GST / Tax ID, phone, email, and brand logo. | [ADM] | ALL |
| 18.2 | **Financial & Currency Settings** | Configure workspace base currency (`₹`, `$`, `€`, `£`, `¥`), tax rate (%), and payment due days. | [ADM] | ALL |
| 18.3 | **Monthly Revenue Goal** | Set tenant-wide monthly revenue targets displayed on the main dashboard progress bar. | [ADM] | ALL |
| 18.4 | **Language & Date Format** | Select default display language and date formatting (`DD/MM/YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD`). | [ALL] | ALL |
| 18.5 | **Sales Pipeline Configuration** | Add, rename, color-code, and reorder sales deal pipeline stages. | [ADM] | [B2B] |
| 18.6 | **Notification Preferences** | Configure triggers for WhatsApp, SMS, and Email alerts (Leads, Deals, Overdue Invoices). | [ADM] | ALL |
| 18.7 | **Data Backup & Export** | Full JSON / CSV export of CRM records for external backups and audits. | [ADM] | ALL |

---

### Module 19: Multi-Language & Internationalization (i18n)
| # | Feature Name | Description | Roles | Mode |
| :-: | :--- | :--- | :-: | :-: |
| 19.1 | **English Locale (`en`)** | Comprehensive English translations for all UI labels, tooltips, validation alerts, and toasts. | [ALL] | ALL |
| 19.2 | **Hindi Locale (`hi`)** | Complete Hindi localized interface for Indian regional business operations. | [ALL] | ALL |
| 19.3 | **Tamil Locale (`ta`)** | Complete Tamil localized interface for regional South Indian business operations. | [ALL] | ALL |
| 19.4 | **Language Switcher Widget** | 1-click dropdown accessible on both the public landing page and inside the dashboard. | [ALL] | ALL |

---

### Module 20: Omnibar & Local Search Subsystems
| # | Feature Name | Description | Roles | Mode |
| :-: | :--- | :--- | :-: | :-: |
| 20.1 | **Global Omnibar Search** | Multi-entity global search searching across Leads, Contacts, Accounts, and Deals. | [ALL] | ALL |
| 20.2 | **In-Module Local Search** | Real-time keystroke table filtering within each individual module screen. | [ALL] | ALL |

---

## 5. Summary Matrix: Roles vs. Modules

```
+------------------------------------+---------------+---------------+---------------+
| Module Name                        | Super Admin   | Manager       | Standard User |
+------------------------------------+---------------+---------------+---------------+
| 01. Authentication & Onboarding    | Full Access   | Full Access   | Full Access   |
| 02. Executive KPI Dashboard        | Full Access   | No Access     | No Access     |
| 03. User & Team Management         | Full Access   | No Access     | No Access     |
| 04. Centralized Team Records       | Full Access   | No Access     | No Access     |
| 05. Smart Analytics Dashboard      | Full Access   | Full Access   | Full Access   |
| 06. Lead Management                | Full Access   | Full Access   | Assigned Only |
| 07. Contact Directory (B2B)        | Full Access   | Full Access   | Full Access   |
| 08. Accounts & Customer Profiles   | Full Access   | Full Access   | Full Access   |
| 09. Services Catalog & Stages (B2C)| Full Access   | Full Access   | View/Update   |
| 10. Opportunities Pipeline (B2B)   | Full Access   | Full Access   | Assigned Only |
| 11. Quotes & Proposals (B2B)       | Full Access   | Full Access   | Full Access   |
| 12. Invoicing & Billing            | Full Access   | Full Access   | Full Access   |
| 13. Tasks & Reminders              | Full Access   | Team Tasks    | Personal Only |
| 14. Support Helpdesk Tickets       | Full Access   | Full Access   | Assigned Only |
| 15. Custom BI Reports              | Full Access   | Full Access   | Personal Only |
| 16. Custom Field Builder           | Create/Config | Use Fields    | Use Fields    |
| 17. WhatsApp Click-to-Chat         | Full Access   | Full Access   | Full Access   |
| 18. Settings & Governance          | Full Access   | Read Only     | Read Only     |
| 19. Multi-Language Switcher (i18n) | Full Access   | Full Access   | Full Access   |
| 20. Omnibar & Local Search         | Full Access   | Full Access   | Full Access   |
+------------------------------------+---------------+---------------+---------------+
```
