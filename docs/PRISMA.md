# XOWIQ CRM — Prisma Schema & Database Architecture

This document describes the Prisma schema configuration, data models, connection architecture, and workflows for **XOWIQ CRM**.

---

## 🗄️ Database Architecture & Connection Settings

Prisma is configured to work directly with **Supabase PostgreSQL** via dual connection URLs:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

- **`DATABASE_URL`**: Connects through Supabase's transaction pooler (PgBouncer, port `6543`) with `?pgbouncer=true`. Used for high-throughput runtime queries and API traffic without exhausting server connections.
- **`DIRECT_URL`**: Connects directly to PostgreSQL (port `5432`). Used for schema migrations (`prisma db push`, `prisma migrate`) and schema introspection (`prisma db pull`).

---

## 📊 Complete Model Directory (25 Models)

| Model | Table Name | Purpose / Description |
|---|---|---|
| `Account` | `accounts` | Company and client directory (B2B & B2C modes with custom fields) |
| `Contact` | `contacts` | Individual point-of-contact records linked to accounts & leads |
| `Lead` | `leads` | Inbound leads, serial numbers, scoring, and source tracking |
| `Opportunity` | `opportunities` | Sales deal pipeline stages, win probabilities, and expected revenue |
| `Product` | `products` | Line-item catalog products attached to opportunities |
| `Quote` | `quotes` | Price quotes, discounts, tax rates, expiration dates, and line items |
| `Invoice` | `invoices` | Billing invoices, status (Paid/Unpaid/Overdue), and PDF attachments |
| `Service` | `services` | Master catalog of customer services and subscription offerings |
| `CustomerService` | `customer_services` | Active customer subscriptions and client-specific service records |
| `Task` | `tasks` | Team tasks, due dates, priorities, and assignments |
| `Ticket` | `tickets` | Customer support helpdesk tickets and resolutions |
| `Report` | `reports` | Saved custom BI reporting configurations and filters |
| `Activity` | `activities` | Activity feed and audit logs of user interactions |
| `Profile` | `profiles` | Multi-tenant user profile details (business name, GST, currency, tax) |
| `Notification` | `notifications` | In-app user notifications and alerts |
| `AuditLog` | `audit_logs` | Compliance audit trails, entity modifications, and IP records |
| `DocumentAttachment`| `documents_attachments` | File and document storage attachments across all CRM entities |
| `TeamMember` | `team_members` | Organization team hierarchy, roles (Admin/Manager/Agent), and permissions |
| `Tag` | `tags` | Custom categorization tags with hex colors |
| `EntityTag` | `entity_tags` | Relational many-to-many bridge linking tags to any CRM entity |
| `WebhookIntegration`| `webhook_integrations` | Outbound webhooks for event-driven automation |
| `B2cStage` | `b2c_stages` | Customizable stage pipelines for B2C customer lifecycles |
| `B2cCustomerStage` | `b2c_customer_stages` | Historical stage transitions for B2C customers |
| `CustomFieldConfig`| `custom_field_configs` | Dynamic field definitions and types per module |
| `Migration` | `_migrations` | Migration execution history log |

---

## 🛠️ Prisma NPM Scripts

| Command | Action |
|---|---|
| `npm run prisma:generate` | Generates the `@prisma/client` library based on `prisma/schema.prisma` |
| `npm run prisma:validate` | Validates syntax, constraints, and relationships in the Prisma schema |
| `npm run prisma:studio` | Launches Prisma Studio GUI at `http://localhost:5555` to browse data |
| `npm run prisma:pull` | Re-introspects the Supabase database to sync schema with live Postgres |
| `npm run prisma:verify` | Runs the test verification script to check live record counts |

---

## 💻 Usage in Code

### Server-Side (Express Backend)

```javascript
import prisma from './config/prisma.js'

// Example: Fetch top won deals
const deals = await prisma.opportunity.findMany({
  where: { stage: 'closed_won' },
  include: {
    account: true,
    products: true
  },
  orderBy: { amount: 'desc' },
  take: 10
})
```

### Shared / Client Utility

```javascript
import prisma from '@/lib/prisma'

// Example: Count active accounts
const count = await prisma.account.count({
  where: { status: 'active' }
})
```
