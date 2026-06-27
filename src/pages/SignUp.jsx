import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

export default function SignUp() {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState('user')
  const [companyName, setCompanyName] = useState('')
  const [companyType, setCompanyType] = useState('B2B')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError(t('auth.passwordsNoMatch')); return }
    if (password.length < 6) { setError(t('auth.passwordMinLength')); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role, companyName, companyType } }
    })
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
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

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}></div>
            <h2 style={{ marginBottom: 12 }}>{t('auth.checkInbox')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>
              {t('auth.verificationSent')} <strong style={{ color: 'var(--accent)' }}>{email}</strong>.
              {' '}{t('auth.clickToVerify')}
            </p>
            <Link to="/login" className="auth-btn" style={{
              display: 'inline-block',
              textDecoration: 'none',
              padding: '12px 28px',
              borderRadius: 8,
              fontWeight: 700,
              background: 'var(--accent-gradient)',
              color: 'white',
            }}>
              {t('auth.goToLogin')}
            </Link>
          </div>
        ) : (
          <>
            <h1 className="auth-title">{t('auth.createAccount')}</h1>
            <p className="auth-subtitle">{t('auth.signUpSubtitle')}</p>

            <form className="auth-form" onSubmit={handleSignUp}>
              {error && <div className="auth-error"> {error}</div>}

              <div className="auth-input-group">
                <label className="auth-label">{t('auth.fullName')}</label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder={t('auth.namePlaceholder')}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

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
                  placeholder={t('auth.minChars')}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-label">{t('auth.confirmPassword')}</label>
                <input
                  type="password"
                  className="auth-input"
                  placeholder={t('auth.confirmPlaceholder')}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-label">{t('auth.registerAs')}</label>
                <select
                  className="auth-input"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  style={{ cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23333%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '10px' }}
                >
                  <option value="user">{t('auth.user')}</option>
                  <option value="admin">{t('auth.admin')}</option>
                </select>
              </div>

              <div className="auth-input-group">
                <label className="auth-label">{t('auth.companyName')}</label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder={t('auth.companyPlaceholder')}
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  required
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-label">{t('auth.companyType')}</label>
                <select
                  className="auth-input"
                  value={companyType}
                  onChange={e => setCompanyType(e.target.value)}
                  style={{ cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23333%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '10px' }}
                  required
                >
                  <option value="B2B">{t('auth.b2b')}</option>
                  <option value="B2C">{t('auth.b2c')}</option>
                </select>
              </div>

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? t('auth.creatingAccount') : t('auth.createAccountBtn')}
              </button>
            </form>

            <div className="auth-footer">
              {t('auth.alreadyHaveAccount')}{' '}
              <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                {t('auth.signInLink')}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
