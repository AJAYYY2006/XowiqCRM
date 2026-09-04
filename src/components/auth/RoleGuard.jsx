import React from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useRole } from '../../contexts/RoleContext'
import { ShieldAlert, ArrowLeft, Lock, Sparkles } from 'lucide-react'
import { SpotlightCard, ShinyButton } from '../reactbits'

export default function RoleGuard({ moduleId, allowedRoles, children, fallbackRedirect }) {
  const { role, roleInfo, hasAccess, switchRole } = useRole()
  const navigate = useNavigate()

  // 1. If explicit allowedRoles array is provided
  if (allowedRoles && allowedRoles.length > 0) {
    const normRole = String(role).toLowerCase()
    const isAllowed = allowedRoles.includes('*') || 
                      allowedRoles.includes(normRole) || 
                      ['admin', 'administrator'].includes(normRole)

    if (!isAllowed) {
      if (fallbackRedirect) {
        return <Navigate to={fallbackRedirect} replace />
      }
      return <AccessDeniedView moduleId={moduleId} currentRole={roleInfo} onSwitchRole={switchRole} onGoBack={() => navigate('/dashboard')} />
    }
  }

  // 2. If moduleId is provided, check against centralized matrix
  if (moduleId && !hasAccess(moduleId)) {
    if (fallbackRedirect) {
      return <Navigate to={fallbackRedirect} replace />
    }
    return <AccessDeniedView moduleId={moduleId} currentRole={roleInfo} onSwitchRole={switchRole} onGoBack={() => navigate('/dashboard')} />
  }

  return children
}

function AccessDeniedView({ moduleId, currentRole, onSwitchRole, onGoBack }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '30px 20px'
      }}
    >
      <SpotlightCard
        spotlightColor="rgba(239, 68, 68, 0.2)"
        borderColor="rgba(239, 68, 68, 0.3)"
        style={{
          maxWidth: 540,
          width: '100%',
          padding: 40,
          textAlign: 'center',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          borderRadius: 24,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.3))',
            border: '2px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: '#f87171',
            boxShadow: '0 0 30px rgba(239, 68, 68, 0.25)'
          }}
        >
          <Lock size={32} />
        </div>

        <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 999, background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
          403 Restricted Access
        </div>

        <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f8fafc', marginBottom: 10 }}>
          Permission Required
        </h2>

        <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: 24 }}>
          Your current active role <strong style={{ color: currentRole.color }}>({currentRole.label})</strong> does not have permission to access the <strong>{moduleId ? moduleId.replace('_', ' ').toUpperCase() : 'requested'}</strong> module.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onGoBack}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 10 }}
          >
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </button>

          <ShinyButton
            variant="primary"
            onClick={() => onSwitchRole('admin')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 10 }}
          >
            <Sparkles size={16} />
            <span>Switch to Admin Mode</span>
          </ShinyButton>
        </div>
      </SpotlightCard>
    </div>
  )
}
