import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { SpotlightCard, ShinyButton, BlurText, ParticlesBackground, ShinyText } from '../components/reactbits'
import DevQuickLoginModal, { DEV_ACCOUNTS } from '../components/ui/DevQuickLoginModal'
import { Sparkles, KeyRound, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDevModalOpen, setIsDevModalOpen] = useState(false)

  const executeLogin = async (userEmail, userPassword) => {
    setError('')
    setLoading(true)

    const toastId = toast.loading('Authenticating workspace...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: userPassword
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      toast.error(signInError.message, { id: toastId })
      return
    }

    const userId = signInData.user.id

    // Fetch role from profiles table (source of truth)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, company_name, company_type')
      .eq('id', userId)
      .maybeSingle()

    const role = profileData?.role || signInData.user.user_metadata?.role || 'user'
    const isAdmin = ['admin', 'administrator'].includes(role.toLowerCase())

    // Sync role back to user_metadata
    await supabase.auth.updateUser({ data: { role } })

    try {
      const meta = signInData.user.user_metadata || {}
      await supabase.from('profiles').upsert({
        id: userId,
        name: meta.name || profileData?.name || 'Unknown User',
        email: signInData.user.email,
        role: role,
        company_name: meta.companyName || profileData?.company_name || null,
        company_type: meta.companyType || profileData?.company_type || null,
        created_by: meta.created_by || profileData?.created_by || null,
        created_by_admin_id: meta.created_by_admin_id || profileData?.created_by_admin_id || null
      })
    } catch (err) {
      console.warn('Profile sync notice:', err)
    }

    toast.success(`Welcome back, ${profileData?.name || 'User'}!`, { id: toastId })
    setLoading(false)

    if (isAdmin) {
      navigate('/dashboard')
    } else {
      navigate('/dashboard')
    }
  }

  const handleLogin = (e) => {
    e.preventDefault()
    executeLogin(email, password)
  }

  const handleSelectAccount = (accEmail, accPassword) => {
    setEmail(accEmail)
    setPassword(accPassword)
    setIsDevModalOpen(false)
    toast.success(`Auto-filled: ${accEmail}`)
  }

  const handleInstantLogin = (accEmail, accPassword) => {
    setEmail(accEmail)
    setPassword(accPassword)
    setIsDevModalOpen(false)
    executeLogin(accEmail, accPassword)
  }

  return (
    <div className="auth-page" style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at top, #0f172a, #070a13)', padding: '40px 16px' }}>
      <ParticlesBackground quantity={35} color="#6366f1" />
      <div className="auth-bg-blur" />
      
      <div style={{ width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 16, position: 'relative', zIndex: 2 }}>
        
        {/* Quick Role Auto-Fill Bar */}
        <div
          onClick={() => setIsDevModalOpen(true)}
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(255, 89, 0, 0.15) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            borderRadius: 14,
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.25s',
            boxShadow: '0 8px 25px -5px rgba(99, 102, 241, 0.2)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255, 89, 0, 0.6)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.35)'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #ff5900, #f37a23)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Zap size={16} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Demo Accounts Auto-Fill</span>
                <span style={{ fontSize: 10, background: '#ff5900', color: 'white', padding: '1px 6px', borderRadius: 999 }}>5 ROLES</span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>Click to switch or instant login</div>
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#818cf8', display: 'flex', alignItems: 'center', gap: 4 }}>
            Open ⚡
          </span>
        </div>

        {/* Main Auth Card */}
        <SpotlightCard
          className="auth-card"
          spotlightColor="rgba(255, 89, 0, 0.2)"
          borderColor="rgba(255, 255, 255, 0.12)"
          style={{
            width: '100%',
            padding: '36px 32px',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(16px)',
            borderRadius: 20,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
          }}
        >
          {/* Logo */}
          <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', gap: 0, fontWeight: 900, fontFamily: '"Fredoka", sans-serif', fontSize: '26px', letterSpacing: '-0.5px', marginBottom: '20px', justifyContent: 'center' }}>
            <div style={{ backgroundColor: '#f37a23', color: '#ffffff', padding: '4px 6px', lineHeight: 1, borderRadius: '6px 0 0 6px' }}>
              XOWIQ
            </div>
            <div style={{ color: '#ffffff', backgroundColor: '#1e293b', padding: '4px 6px', lineHeight: 1, borderRadius: '0 6px 6px 0' }}>
              CRM
            </div>
          </div>

          <h1 className="auth-title" style={{ textAlign: 'center', fontSize: '1.65rem', fontWeight: 800, marginBottom: 6, color: '#f8fafc' }}>
            <BlurText text={t('auth.welcomeBack')} delay={40} />
          </h1>
          <p className="auth-subtitle" style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', marginBottom: 24 }}>
            {t('auth.signInSubtitle')}
          </p>

          <form className="auth-form" onSubmit={handleLogin}>
            {error && <div className="auth-error" style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: 18, fontSize: 13 }}>⚠️ {error}</div>}

            <div className="auth-input-group" style={{ marginBottom: 16 }}>
              <label className="auth-label" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>{t('auth.emailLabel')}</label>
              <input
                type="email"
                className="auth-input"
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '12px 16px', borderRadius: 10, background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff', fontSize: 14 }}
              />
            </div>

            <div className="auth-input-group" style={{ marginBottom: 20 }}>
              <label className="auth-label" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>{t('auth.passwordLabel')}</label>
              <input
                type="password"
                className="auth-input"
                placeholder={t('auth.passwordPlaceholder')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '12px 16px', borderRadius: 10, background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff', fontSize: 14 }}
              />
            </div>

            <ShinyButton
              type="submit"
              variant="primary"
              disabled={loading}
              style={{ width: '100%', padding: '13px', borderRadius: 10, fontSize: '1rem', fontWeight: 700 }}
            >
              {loading ? t('auth.signingIn') : t('auth.signInBtn')}
            </ShinyButton>
          </form>

          {/* Quick Role Fill Pills */}
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, textAlign: 'center' }}>
              Quick Fill by Role:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {DEV_ACCOUNTS.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => handleSelectAccount(acc.email, acc.password)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 8,
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#cbd5e1',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#ff5900'
                    e.currentTarget.style.color = '#ffffff'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                    e.currentTarget.style.color = '#cbd5e1'
                  }}
                >
                  <span>{acc.badge}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="auth-footer" style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#94a3b8' }}>
            Need an Admin Account?{' '}
            <Link to="/signup" style={{ color: '#ff5900', fontWeight: 600, textDecoration: 'none' }}>
              Sign Up
            </Link>
          </div>
        </SpotlightCard>
      </div>

      {/* Dev Quick Login Modal */}
      <DevQuickLoginModal
        isOpen={isDevModalOpen}
        onClose={() => setIsDevModalOpen(false)}
        onSelectAccount={handleSelectAccount}
        onInstantLogin={handleInstantLogin}
      />
    </div>
  )
}
