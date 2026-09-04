import React, { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { ROLE_DEFINITIONS, hasModuleAccess, canPerformAction } from '../config/roles'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const RoleContext = createContext(null)

export function RoleProvider({ children, session, profile }) {
  // Current active role (defaults to profile.role or user_metadata.role or 'user')
  const baseRole = profile?.role || session?.user?.user_metadata?.role || 'user'
  const [activeRole, setActiveRole] = useState(baseRole)

  // Sync activeRole whenever session/profile changes
  useEffect(() => {
    if (baseRole) {
      setActiveRole(baseRole)
    }
  }, [baseRole])

  const roleInfo = useMemo(() => {
    const norm = String(activeRole).toLowerCase()
    return ROLE_DEFINITIONS[norm] || ROLE_DEFINITIONS.user
  }, [activeRole])

  const checkModuleAccess = (moduleId) => {
    return hasModuleAccess(activeRole, moduleId)
  }

  const checkActionPermission = (action) => {
    return canPerformAction(activeRole, action)
  }

  // Allow switching roles dynamically (especially useful for testing various workflows)
  const switchRole = async (newRole) => {
    const normRole = String(newRole).toLowerCase()
    setActiveRole(normRole)
    
    // Update Supabase user metadata and profiles if authenticated
    if (session?.user?.id) {
      try {
        await supabase.auth.updateUser({ data: { role: normRole } })
        await supabase.from('profiles').update({ role: normRole }).eq('id', session.user.id)
        toast.success(`Role switched to: ${ROLE_DEFINITIONS[normRole]?.label || normRole}`)
      } catch (err) {
        console.warn('Role switch persistence notice:', err)
      }
    }
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
