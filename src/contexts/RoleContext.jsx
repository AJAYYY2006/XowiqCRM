import React, { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { ROLE_DEFINITIONS, hasModuleAccess, canPerformAction } from '../config/roles'
import toast from 'react-hot-toast'

const RoleContext = createContext(null)

export function RoleProvider({ children, session, profile }) {
  // Current active role (defaults to profile.role or user_metadata.role or 'admin')
  const baseRole = profile?.role || session?.user?.user_metadata?.role || 'admin'
  const [activeRole, setActiveRole] = useState(baseRole)

  // Only a Super Admin (as stored in the profile / auth metadata) may change roles.
  // Everyone else keeps the role assigned to them at creation.
  const canSwitchRole = ['admin', 'administrator'].includes(String(baseRole).toLowerCase())

  // Sync activeRole whenever session/profile changes
  useEffect(() => {
    if (baseRole) {
      setActiveRole(baseRole)
    }
  }, [baseRole])

  const roleInfo = useMemo(() => {
    const norm = String(activeRole).toLowerCase()
    return ROLE_DEFINITIONS[norm] || ROLE_DEFINITIONS.admin
  }, [activeRole])

  const checkModuleAccess = (moduleId) => {
    return hasModuleAccess(activeRole, moduleId)
  }

  const checkActionPermission = (action) => {
    return canPerformAction(activeRole, action)
  }

  // Super Admin only: preview the CRM as another role for this session.
  // The stored role is never changed, so the Super Admin can always switch back.
  const switchRole = async (newRole) => {
    if (!canSwitchRole) {
      toast.error('Only a Super Admin can change roles')
      return
    }
    const normRole = String(newRole).toLowerCase()
    setActiveRole(normRole)
    toast.success(`Role switched to: ${ROLE_DEFINITIONS[normRole]?.label || normRole}`)
  }

  const value = {
    role: activeRole,
    roleInfo,
    isAdmin: ['admin', 'administrator'].includes(String(activeRole).toLowerCase()),
    isManager: ['admin', 'administrator', 'manager'].includes(String(activeRole).toLowerCase()),
    isSupport: ['admin', 'administrator', 'agent', 'support_agent'].includes(String(activeRole).toLowerCase()),
    isB2C: session?.user?.user_metadata?.companyType === 'B2C' || String(activeRole).toLowerCase() === 'b2c',
    hasAccess: checkModuleAccess,
    can: checkActionPermission,
    canSwitchRole,
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
