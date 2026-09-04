import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { SpotlightCard, ShinyButton, BlurText, ParticlesBackground } from '../components/reactbits'

export default function Login() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    const userId = signInData.user.id

    // Fetch role from profiles table (source of truth)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, company_name, company_type')
      .eq('id', userId)
      .maybeSingle()

    // Fall back to user_metadata if profile row doesn't exist yet
    const role = profileData?.role || signInData.user.user_metadata?.role || 'user'
    const isAdmin = ['admin', 'administrator'].includes(role.toLowerCase())

    // Sync role back to user_metadata so Dashboard can read it
    await supabase.auth.updateUser({ data: { role } })

    // Sync profiles table with metadata
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
      console.warn('Profile sync failed during login:', err)
    }

    setLoading(false)

    if (isAdmin) {
      navigate('/admin')
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="auth-page" style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at top, #0f172a, #070a13)' }}>
      <ParticlesBackground quantity={30} color="#6366f1" />
      <div className="auth-bg-blur" />
      
      <SpotlightCard
        className="auth-card"
        spotlightColor="rgba(255, 89, 0, 0.2)"
        borderColor="rgba(255, 255, 255, 0.12)"
        style={{
          width: '100%',
          maxWidth: 440,
          padding: 40,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          borderRadius: 20,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Logo */}
        <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', gap: 0, fontWeight: 900, fontFamily: '"Fredoka", sans-serif', fontSize: '26px', letterSpacing: '-0.5px', marginBottom: '24px', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#f37a23', color: '#ffffff', padding: '4px 6px', lineHeight: 1, borderRadius: '6px 0 0 6px' }}>
            XOWIQ
          </div>
          <div style={{ color: '#ffffff', backgroundColor: '#1e293b', padding: '4px 6px', lineHeight: 1, borderRadius: '0 6px 6px 0' }}>
            CRM
          </div>
        </div>

        <h1 className="auth-title" style={{ textAlign: 'center', fontSize: '1.75rem', fontWeight: 800, marginBottom: 8, color: '#f8fafc' }}>
          <BlurText text={t('auth.welcomeBack')} delay={50} />
        </h1>
        <p className="auth-subtitle" style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.95rem', marginBottom: 28 }}>
          {t('auth.signInSubtitle')}
        </p>

        <form className="auth-form" onSubmit={handleLogin}>
          {error && <div className="auth-error" style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: 20, fontSize: 13 }}>⚠️ {error}</div>}

          <div className="auth-input-group" style={{ marginBottom: 18 }}>
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

          <div className="auth-input-group" style={{ marginBottom: 24 }}>
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
            style={{ width: '100%', padding: '14px', borderRadius: 10, fontSize: '1rem', fontWeight: 700 }}
          >
            {loading ? t('auth.signingIn') : t('auth.signInBtn')}
          </ShinyButton>
        </form>

        <div className="auth-footer" style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#94a3b8' }}>
          Need an Admin Account?{' '}
          <Link to="/signup" style={{ color: '#ff5900', fontWeight: 600, textDecoration: 'none' }}>
            Sign Up
          </Link>
        </div>
      </SpotlightCard>
    </div>
  )
}
