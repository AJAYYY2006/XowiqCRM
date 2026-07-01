import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyType, setCompanyType] = useState('')
  const [role, setRole] = useState('')
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

    // Get the role from auth metadata first
    const metaRole = signInData.user.user_metadata?.role || 'user'

    // Fetch user's role from the database profiles table
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    const dbRole = profileData?.role || metaRole || role
    const isDbAdmin = ['admin', 'administrator'].includes((dbRole || '').toLowerCase())
    
    // Ensure final role matches database record / metadata record / login selection fallback
    const finalRole = isDbAdmin ? dbRole : 'user'

    const updates = {}
    if (companyName.trim()) updates.companyName = companyName.trim()
    if (companyType) updates.companyType = companyType
    updates.role = finalRole

    // 1. Update auth user_metadata
    await supabase.auth.updateUser({ data: updates })
    
    // 2. Sync profiles table (use upsert to create the row if it's missing)
    try {
      await supabase.from('profiles').upsert({ 
        id: userId, 
        role: finalRole,
        email: signInData.user.email,
        name: signInData.user.user_metadata?.name || 'Unknown User'
      })
    } catch (err) {
      console.warn('Profile sync failed:', err)
    }
    
    // 3. Refresh session so Dashboard loads with updated metadata
    await supabase.auth.refreshSession()

    navigate('/dashboard')
    setLoading(false)
  }

  const selectStyle = {
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23333%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 16px center',
    backgroundSize: '10px'
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-blur" />
      <div className="auth-card">
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

          <div className="auth-input-group">
            <label className="auth-label">{t('auth.companyName')}</label>
            <input
              type="text"
              className="auth-input"
              placeholder="(Optional) Update Company Name"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-label">{t('auth.companyType')}</label>
            <select
              className="auth-input"
              value={companyType}
              onChange={e => setCompanyType(e.target.value)}
              style={selectStyle}
            >
              <option value="">(Keep Current Mode)</option>
              <option value="B2B">{t('auth.b2b')}</option>
              <option value="B2C">{t('auth.b2c')}</option>
            </select>
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Role</label>
            <select
              className="auth-input"
              value={role}
              onChange={e => setRole(e.target.value)}
              style={selectStyle}
            >
              <option value="">(Keep Current Role)</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
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
