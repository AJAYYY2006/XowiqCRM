# XOWIQ CRM — Database Schema & Architecture

This directory contains the database schema migrations, architectural overview, and instructions for managing the Supabase PostgreSQL database.

---

## 🗄️ Public Tables Overview (25 Tables)

### Core CRM Entities
1. `accounts`: Customer and company directory (supports both B2B and B2C modes with custom fields and stages).
2. `contacts`: Individual person records linked to accounts and leads.
3. `leads`: Inbound inquiries, lead scoring, status tracking, and source channels.
4. `opportunities`: Deal pipeline stages, deal values, win probabilities, and expected revenues.
5. `quotes`: Proposals, custom line items, expiration dates, discount & tax calculations.
6. `invoices`: Billing records, status tracking (Paid/Unpaid/Overdue), PDF URLs.
7. `products`: Catalog items and line-item products attached to deals.
8. `services`: Master catalog of customer services and recurring subscription packages.
9. `customer_services`: Client-specific service instances, stages, and custom tracking.
10. `tasks`: Actionable tasks, deadlines, priorities, assignment to team members.
11. `tickets`: Customer support tickets, priority levels, resolution notes.
12. `reports`: Custom BI reporting templates and filters.
13. `activities`: Audit log of user interactions and milestone completions.
14. `profiles`: Extended user profile metadata (business details, GST, tax rates, currency).

### Enterprise Scaling & Collaboration
15. `notifications`: In-app notifications and alerts.
16. `audit_logs`: Detailed compliance audit trails and change tracking.
17. `team_members`: Organization hierarchy, roles (Admin, Manager, Agent), and permissions.
18. `documents_attachments`: Multi-tenant file/document storage attachments for all CRM entities.
19. `tags`: Reusable categorization tags with custom hex colors.
20. `entity_tags`: Relational mapping connecting tags to leads, deals, accounts, and tickets.
21. `webhook_integrations`: Outbound webhooks for event-driven automation.
22. `b2c_stages`: Customizable stage pipelines for B2C customer lifecycles.
23. `b2c_customer_stages`: Stage movement history log.
24. `custom_field_configs`: Schema configuration for dynamic custom fields.
25. `_migrations`: Migration execution tracking table.

---

## 🚀 Migrations Directory (`database/migrations/`)

| # | Migration File | Scope |
|---|---|---|
| `001` | `001_add_contact_number_column.sql` | Adds contact number to `leads` |
| `002` | `002_add_currency_column.sql` | Adds currency column support |
| `003` | `003_add_custom_data_to_customer_services.sql` | Adds JSONB custom data to customer services |
| `004` | `004_add_custom_data_to_tasks.sql` | Adds JSONB custom data to tasks |
| `005` | `005_add_custom_data_to_tickets.sql` | Adds JSONB custom data to tickets |
| `006` | `006_add_service_type.sql` | Service type categorization |
| `007` | `007_add_settings_profile_columns.sql` | Business info, GST, tax rates & branding |
| `008` | `008_b2c_profile_columns.sql` | B2C profiles (DOB, gender, address, custom fields) |
| `009` | `009_create_b2c_stages.sql` | B2C customer stage tracking tables & RLS policies |
| `010` | `010_create_custom_fields_table.sql` | Dynamic custom field configuration schema |
| `011` | `011_create_services_tables.sql` | Service catalog & subscriptions schema |
| `012` | `012_fix_corrupted_users.sql` | Repaired user profile reference integrity |
| `013` | `013_fix_opportunities_stage_constraint.sql` | Updated opportunities stage constraints |
| `014` | `014_fix_signup_error.sql` | Safe auth triggers & default profile initialization |
| `015` | `015_setup_admin_and_confirm.sql` | Auto-confirmation triggers & profile handler |
| `016` | `016_enterprise_scale_architecture.sql` | **Enterprise Scale Extension**: Notifications, Audit Logs, Attachments, Team Hierarchy, Webhooks, Tags, GIN Indexes & Triggers |

---

## ⚡ Running Migrations

Execute the migration pipeline:

```bash
npm run migrate
```
