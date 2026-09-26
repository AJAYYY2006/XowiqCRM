import React, { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { ROLE_DEFINITIONS, hasModuleAccess, canPerformAction } from '../config/roles'
import toast from 'react-hot-toast'

const RoleContext = createContext(null)

export function RoleProvider({ children, session, profile }) {
  // Check if the current account/profile is B2C
  const rawCompanyType = profile?.company_type || session?.user?.user_metadata?.companyType || ''
  const isB2CAccount = String(rawCompanyType).toUpperCase() === 'B2C' || 
                       String(profile?.role || '').toLowerCase() === 'b2c' ||
                       String(session?.user?.user_metadata?.role || '').toLowerCase() === 'b2c'

  // If the user's company is B2C or role is b2c, they are strictly locked to 'b2c' role:
  // they cannot be super admin or switch to B2B or any other role!
  const baseRole = isB2CAccount ? 'b2c' : (profile?.role || session?.user?.user_metadata?.role || 'admin')
  const [activeRole, setActiveRole] = useState(baseRole)

  // Only B2B Super Admins may switch roles. B2C users are strictly restricted.
  const canSwitchRole = !isB2CAccount && ['admin', 'administrator'].includes(String(baseRole).toLowerCase())

  // Dynamic B2C check: true if account is B2C OR currently previewing/active as B2C
  const isB2C = isB2CAccount || String(activeRole).toLowerCase() === 'b2c'

  // Sync activeRole whenever session/profile changes
  useEffect(() => {
    if (isB2CAccount) {
      setActiveRole('b2c')
    } else if (baseRole) {
      setActiveRole(baseRole)
    }
  }, [baseRole, isB2CAccount])

  const roleInfo = useMemo(() => {
    if (isB2C) return ROLE_DEFINITIONS.b2c
    const norm = String(activeRole).toLowerCase()
    return ROLE_DEFINITIONS[norm] || ROLE_DEFINITIONS.admin
  }, [activeRole, isB2C])

  const checkModuleAccess = (moduleId) => {
    if (isB2C) {
      // Strict B2C whitelist: B2C cannot access B2B deals/opportunities, quotes, users, team_records, or executive super admin kpi
      const B2C_ALLOWED_MODULES = [
        'dashboard', 'kpis', 'analytics', 'analytical', 'accounts', 'contacts', 'leads',
        'services', 'invoices', 'tickets', 'tasks', 'reports', 'settings'
      ]
      return B2C_ALLOWED_MODULES.includes(moduleId)
    }
    return hasModuleAccess(activeRole, moduleId)
  }

  const checkActionPermission = (action) => {
    // Record deletion is strictly and exclusively restricted to the Super Admin ('admin') role
    if (action === 'delete_records') {
      return !isB2C && String(activeRole).toLowerCase() === 'admin'
    }
    if (isB2C) {
      if (['manage_users', 'edit_security'].includes(action)) return false
    }
    return canPerformAction(activeRole, action)
  }

  // Super Admin only: preview the CRM as another role for this session.
  const switchRole = async (newRole) => {
    if (isB2CAccount || !canSwitchRole) {
      toast.error('B2C accounts cannot switch to B2B or administrative roles')
      return
    }
    const normRole = String(newRole).toLowerCase()
    setActiveRole(normRole)
    toast.success(`Role switched to: ${ROLE_DEFINITIONS[normRole]?.label || normRole}`)
  }

  const value = {
    role: isB2CAccount ? 'b2c' : activeRole,
    roleInfo,
    isAdmin: !isB2C && String(activeRole).toLowerCase() === 'admin',
    isSuperAdmin: !isB2C && String(activeRole).toLowerCase() === 'admin',
    isManager: !isB2C && ['admin', 'administrator', 'manager'].includes(String(activeRole).toLowerCase()),
    isSupport: !isB2C && ['admin', 'administrator', 'agent', 'support_agent'].includes(String(activeRole).toLowerCase()),
    isB2C,
    hasAccess: checkModuleAccess,
    can: checkActionPermission,
    canSwitchRole: !isB2CAccount && canSwitchRole,
    switchRole
  }

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  const context = useContext(RoleContext)
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}
