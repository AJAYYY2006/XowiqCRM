# XOWIQ CRM — Database Migrations

This directory contains all PostgreSQL schema migrations for the XOWIQ CRM platform.

## Migration Files

Migrations are numbered sequentially (`001_`, `002_`, etc.) and should be executed in order against a Supabase PostgreSQL instance.

| # | Migration | Purpose |
|---|-----------|---------|
| 001 | `add_contact_number_column.sql` | Adds contact number column to profiles |
| 002 | `add_currency_column.sql` | Adds currency preference column |
| 003 | `add_custom_data_to_customer_services.sql` | Adds JSONB custom_data to customer services |
| 004 | `add_custom_data_to_tasks.sql` | Adds JSONB custom_data to tasks |
| 005 | `add_custom_data_to_tickets.sql` | Adds JSONB custom_data to tickets |
| 006 | `add_service_type.sql` | Adds service type enum (instant/multi-stage) |
| 007 | `add_settings_profile_columns.sql` | Adds settings and profile metadata columns |
| 008 | `b2c_profile_columns.sql` | Adds B2C-specific profile columns |
| 009 | `create_b2c_stages.sql` | Creates B2C stage tracking tables |
| 010 | `create_custom_fields_table.sql` | Creates custom field configuration table |
| 011 | `create_services_tables.sql` | Creates services catalog tables |
| 012 | `fix_corrupted_users.sql` | Fixes corrupted user records |
| 013 | `fix_opportunities_stage_constraint.sql` | Fixes stage constraint on opportunities |
| 014 | `fix_signup_error.sql` | Fixes signup error edge cases |
| 015 | `setup_admin_and_confirm.sql` | Admin setup and confirmation |

## Running Migrations

Execute each `.sql` file in order against your Supabase PostgreSQL database:

```bash
# Via Supabase SQL Editor or psql
psql -h <SUPABASE_HOST> -U postgres -d postgres -f migrations/001_add_contact_number_column.sql
```

> **Note:** Always back up your database before running migrations in production.
