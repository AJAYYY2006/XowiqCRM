import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Zap, LogIn, CheckCircle2, Shield, UserCheck, Headphones, ShoppingBag, Eye } from 'lucide-react'
import { SpotlightCard, ShinyButton, ShinyText } from '../reactbits'

export const DEV_ACCOUNTS = [
  {
    id: 'admin',
    roleName: 'Super Admin / Executive',
    badge: 'Executive View',
    name: 'Alex Rivera',
    email: 'admin@xowiq.com',
    password: 'Password@123',
    icon: <Shield size={20} color="#818cf8" />,
    badgeColor: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    description: 'Complete unrestricted control, multi-user admin management, security settings & revenue analytics.'
  },
  {
    id: 'sales',
    roleName: 'Sales Manager',
    badge: 'Sales Lead',
    name: 'Sarah Connor',
    email: 'sales@xowiq.com',
    password: 'Password@123',
    icon: <UserCheck size={20} color="#fb923c" />,
    badgeColor: 'linear-gradient(135deg, #ff5900, #ea580c)',
    description: 'Deal runways, high-value quotes, converted lead pipelines, and enterprise accounts.'
  },
  {
    id: 'support',
    roleName: 'Support Lead / Agent',
    badge: 'Customer Care',
    name: 'Marcus Vance',
    email: 'support@xowiq.com',
    password: 'Password@123',
    icon: <Headphones size={20} color="#38bdf8" />,
    badgeColor: 'linear-gradient(135deg, #0284c7, #0369a1)',
    description: 'Customer ticket management, SLA deadlines, subscription services, and resolution tasks.'
  },
  {
    id: 'b2c',
    roleName: 'B2C Retail / Business Owner',
    badge: 'B2C Lifecycle',
    name: 'Elena Rostova',
    email: 'b2c.demo@xowiq.com',
    password: 'Password@123',
    icon: <ShoppingBag size={20} color="#f472b6" />,
    badgeColor: 'linear-gradient(135deg, #ec4899, #db2777)',
    description: 'B2C customer lifecycle stages, drag-and-drop progress kanban, and instant service billing.'
  },
  {
    id: 'viewer',
    roleName: 'Team Member / Staff',
    badge: 'Standard Viewer',
    name: 'David Chen',
    email: 'viewer@xowiq.com',
    password: 'Password@123',
    icon: <Eye size={20} color="#34d399" />,
    badgeColor: 'linear-gradient(135deg, #10b981, #059669)',
    description: 'Standard collaborator view for daily task logging, viewing contacts, deals, and reports.'
  }
]

export default function DevQuickLoginModal({ isOpen, onClose, onSelectAccount, onInstantLogin }) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="modal-overlay"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 7, 14, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 680,
            maxHeight: '90vh',
            background: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(99, 102, 241, 0.15)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '24px 28px',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <Zap size={20} className="text-amber-400" />
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 500, color: '#f8fafc' }}>
                  <ShinyText text="Demo & Role Quick Login" speed={4} />
                </h2>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', fontWeight: 300 }}>
                Select any predefined role below to test the CRM with populated live data.
              </p>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                width: 36,
                height: 36,
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
            >
              <X size={18} />
            </button>
          </div>

          {/* List of Accounts */}
          <div
            style={{
              padding: '20px 24px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              maxHeight: 'calc(90vh - 140px)'
            }}
          >
            {DEV_ACCOUNTS.map((acc) => (
              <SpotlightCard
                key={acc.id}
                spotlightColor="rgba(99, 102, 241, 0.16)"
                borderColor="rgba(255, 255, 255, 0.08)"
                style={{
                  padding: 18,
                  borderRadius: 16,
                  background: 'rgba(15, 23, 42, 0.6)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: 'rgba(30, 41, 59, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {acc.icon}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '1.05rem', fontWeight: 500, color: '#f8fafc' }}>
                          {acc.roleName}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 500,
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: acc.badgeColor,
                            color: '#ffffff',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5
                          }}
                        >
                          {acc.badge}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2, fontWeight: 300 }}>
                        {acc.name} &bull; <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{acc.email}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => onSelectAccount(acc.email, acc.password)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        background: 'rgba(30, 41, 59, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#f8fafc',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                    >
                      <span>Fill In</span>
                    </button>

                    <ShinyButton
                      variant="primary"
                      style={{ padding: '8px 16px', fontSize: 12, borderRadius: 8 }}
                      onClick={() => onInstantLogin(acc.email, acc.password)}
                    >
                      <LogIn size={13} />
                      <span>Instant Login</span>
                    </ShinyButton>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, background: 'rgba(0, 0, 0, 0.2)', padding: '8px 12px', borderRadius: 8 }}>
                  {acc.description}
                </div>
              </SpotlightCard>
            ))}
          </div>

          {/* Footer Note */}
          <div
            style={{
              padding: '14px 24px',
              background: 'rgba(10, 15, 30, 0.95)',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              fontSize: 12,
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={14} color="#ff5900" />
              <span>Password for all accounts: <code style={{ color: '#ff5900', background: 'rgba(255, 89, 0, 0.1)', padding: '2px 6px', borderRadius: 4 }}>Password@123</code></span>
            </div>
            <span>Ready for multi-role testing</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
