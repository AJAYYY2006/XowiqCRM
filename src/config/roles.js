/**
 * XOWIQ CRM — Centralized Role-Based Access Control (RBAC) Architecture
 * Defines role hierarchies, module access permissions, and action capabilities.
 */

export const ROLES = {
  SUPER_ADMIN: 'admin',
  ADMIN: 'administrator',
  SALES_MANAGER: 'manager',
  SALES_REP: 'sales_rep',
  SUPPORT_AGENT: 'agent',
  SUPPORT_MANAGER: 'support_agent',
  B2C_OWNER: 'b2c'
}

/**
 * Roles a Super Admin can assign when creating or editing a user.
 * Mirrors the four roles shown in the "Switch Active Role" menu.
 */
export const ASSIGNABLE_ROLES = [
  { value: 'admin', label: '👑 Super Admin' },
  { value: 'manager', label: '💼 Sales Manager' },
  { value: 'agent', label: '🎧 Support Agent' },
  { value: 'b2c', label: '🛍️ B2C Store Owner' }
]

export const ROLE_DEFINITIONS = {
  admin: {
    label: 'Super Admin',
    badge: '👑 Super Admin',
    color: '#6366f1',
    description: 'Full administrative access across all CRM modules, user management, and security.',
    level: 100,
  },
  administrator: {
    label: 'Administrator',
    badge: '👑 Admin',
    color: '#6366f1',
    description: 'Full administrative control of CRM features and users.',
    level: 100,
  },
  manager: {
    label: 'Sales Manager',
    badge: '💼 Sales Lead',
    color: '#ff5900',
    description: 'Lead conversion, deal runways, quotes, invoices, and sales team analytics.',
    level: 70,
  },
  sales_rep: {
    label: 'Sales Representative',
    badge: '💼 Sales Rep',
    color: '#ff5900',
    description: 'Opportunity pipelines, customer contact management, and task workflows.',
    level: 50,
  },
  agent: {
    label: 'Support Lead',
    badge: '🎧 Support Agent',
    color: '#06b6d4',
    description: 'Support tickets, customer SLA resolution, and customer service subscriptions.',
    level: 50,
  },
  support_agent: {
    label: 'Support Agent',
    badge: '🎧 Support',
    color: '#06b6d4',
    description: 'Ticket management, customer assistance, and resolution tracking.',
    level: 40,
  },
  b2c: {
    label: 'B2C Business Owner',
    badge: '🛍️ B2C Store',
    color: '#ec4899',
    description: 'B2C customer lifecycle, stage tracking pipelines, and instant service billing.',
    level: 60,
  }
}

/**
 * Module Access Matrix
 * Maps each module ID to allowed roles.
 */
export const MODULE_PERMISSIONS = {
  dashboard: {
    name: 'Dashboard Overview',
    allowedRoles: ['*'], // All authenticated roles
    minLevel: 10
  },
  kpis: {
    name: 'Analytics Dashboard',
    allowedRoles: ['admin', 'administrator', 'manager', 'b2c'],
    minLevel: 60
  },
  analytics: {
    name: 'Analytics Dashboard',
    allowedRoles: ['admin', 'administrator', 'manager', 'b2c'],
    minLevel: 60
  },
  analytical: {
    name: 'Analytics Dashboard',
    allowedRoles: ['admin', 'administrator', 'manager', 'b2c'],
    minLevel: 60
  },
  kpi: {
    name: 'Executive KPI Dashboard',
    allowedRoles: ['admin', 'administrator'],
    minLevel: 100
  },
  leads: {
    name: 'Leads Management',
    allowedRoles: ['admin', 'administrator', 'manager', 'sales_rep', 'b2c'],
    minLevel: 20
  },
  contacts: {
    name: 'Contacts Directory',
    allowedRoles: ['*'],
    minLevel: 10
  },
  accounts: {
    name: 'Accounts (B2B & B2C)',
    allowedRoles: ['*'],
    minLevel: 10
  },
  deals: {
    name: 'Deals & Opportunities',
    allowedRoles: ['admin', 'administrator', 'manager', 'sales_rep'],
    minLevel: 20
  },
  quotes: {
    name: 'Quotes & Proposals',
    allowedRoles: ['admin', 'administrator', 'manager', 'sales_rep'],
    minLevel: 50
  },
  invoices: {
    name: 'Billing & Invoices',
    allowedRoles: ['admin', 'administrator', 'manager', 'b2c', 'sales_rep'],
    minLevel: 50
  },
  services: {
    name: 'Master Services Catalog',
    allowedRoles: ['admin', 'administrator', 'manager', 'sales_rep', 'agent', 'support_agent', 'b2c'],
    minLevel: 20
  },
  tickets: {
    name: 'Customer Support Tickets',
    allowedRoles: ['admin', 'administrator', 'agent', 'support_agent', 'manager', 'b2c'],
    minLevel: 20
  },
  tasks: {
    name: 'Tasks & Deadlines',
    allowedRoles: ['*'],
    minLevel: 10
  },
  reports: {
    name: 'Reports & Business Intelligence',
    allowedRoles: ['admin', 'administrator', 'manager', 'b2c'],
    minLevel: 20
  },
  users: {
    name: 'User & Team Administration',
    allowedRoles: ['admin', 'administrator'],
    minLevel: 90
  },
  team_records: {
    name: 'Team-Wide Records',
    allowedRoles: ['admin', 'administrator', 'manager'],
    minLevel: 70
  },
  settings: {
    name: 'System Settings',
    allowedRoles: ['*'], // Settings adapts tabs based on role
    minLevel: 10
  }
}

/**
 * Check if a role has access to a specific module
 */
export function hasModuleAccess(role, moduleId) {
  if (!role) return false
  const normRole = String(role).toLowerCase().trim()
  
  // Super Admin always has full access
  if (normRole === 'admin' || normRole === 'administrator') return true

  const moduleConfig = MODULE_PERMISSIONS[moduleId]
  if (!moduleConfig) return true // Default allow if unrestricted

  if (moduleConfig.allowedRoles.includes('*')) return true
  if (moduleConfig.allowedRoles.includes(normRole)) return true

  // Fallback to level check
  const userLevel = ROLE_DEFINITIONS[normRole]?.level || 10
  return userLevel >= moduleConfig.minLevel
}

/**
 * Check if a role can perform specific sensitive actions (create/edit/delete/export)
 */
export function canPerformAction(role, action) {
  const normRole = String(role || 'manager').toLowerCase().trim()
  
  // Deletion is strictly restricted to Super Admin ('admin') ONLY
  if (action === 'delete_records') {
    return normRole === 'admin'
  }

  if (normRole === 'admin' || normRole === 'administrator') return true

  switch (action) {
    case 'manage_users':
    case 'edit_security':
      return ['admin', 'administrator'].includes(normRole)

    case 'delete_records':
      return normRole === 'admin'
    
    case 'export_data':
    case 'generate_quotes':
    case 'manage_invoices':
      return ['admin', 'administrator', 'manager', 'sales_rep', 'b2c'].includes(normRole)
      
    case 'close_tickets':
      return ['admin', 'administrator', 'agent', 'support_agent', 'manager', 'b2c'].includes(normRole)

    case 'create_records':
    case 'edit_records':
      return true

    default:
      return true
  }
}
