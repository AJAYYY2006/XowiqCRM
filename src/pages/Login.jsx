import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

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

    // Sync profiles table with metadata (companyName, companyType, created_by, created_by_admin_id)
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
    <div className="auth-page">
      <div className="auth-bg-blur" />
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', gap: 0, fontWeight: 900, fontFamily: '"Fredoka", sans-serif', fontSize: '26px', letterSpacing: '-0.5px', marginBottom: '24px', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#f37a23', color: '#ffffff', padding: '4px 6px', lineHeight: 1 }}>
            XOWIQ
          </div>
          <div style={{ color: '#000000', padding: '4px 6px', lineHeight: 1 }}>
            CRM
          </div>
        </div>

        <h1 className="auth-title">{t('auth.welcomeBack')}</h1>
        <p className="auth-subtitle">{t('auth.signInSubtitle')}</p>

        <form className="auth-form" onSubmit={handleLogin}>
          {error && <div className="auth-error"> {error}</div>}

          <div className="auth-input-group">
            <label className="auth-label">{t('auth.emailLabel')}</label>
            <input
              type="email"
              className="auth-input"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-label">{t('auth.passwordLabel')}</label>
            <input
              type="password"
              className="auth-input"
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? t('auth.signingIn') : t('auth.signInBtn')}
          </button>
        </form>

        <div className="auth-footer">
          Need an Admin Account?{' '}
          <Link to="/signup" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  )
}
