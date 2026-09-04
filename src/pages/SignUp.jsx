import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { SpotlightCard, ShinyButton, BlurText, ParticlesBackground } from '../components/reactbits'

export default function SignUp() {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
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
      options: { data: { name, role: 'admin', companyName, companyType } }
    })
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  return (
    <div className="auth-page" style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at top, #0f172a, #070a13)', padding: '40px 16px' }}>
      <ParticlesBackground quantity={30} color="#6366f1" />
      <div className="auth-bg-blur" />
      
      <SpotlightCard
        className="auth-card"
        spotlightColor="rgba(255, 89, 0, 0.2)"
        borderColor="rgba(255, 255, 255, 0.12)"
        style={{
          width: '100%',
          maxWidth: 480,
          padding: 40,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          borderRadius: 20,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', gap: 0, fontWeight: 900, fontFamily: '"Fredoka", sans-serif', fontSize: '26px', letterSpacing: '-0.5px', marginBottom: '24px', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#f37a23', color: '#ffffff', padding: '4px 6px', lineHeight: 1, borderRadius: '6px 0 0 6px' }}>
            XOWIQ
          </div>
          <div style={{ color: '#ffffff', backgroundColor: '#1e293b', padding: '4px 6px', lineHeight: 1, borderRadius: '0 6px 6px 0' }}>
            CRM
          </div>
        </div>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h2 style={{ marginBottom: 12, color: '#f8fafc', fontSize: '1.6rem' }}>{t('auth.checkInbox')}</h2>
            <p style={{ color: '#94a3b8', marginBottom: 28, lineHeight: 1.6 }}>
              {t('auth.verificationSent')} <strong style={{ color: '#ff5900' }}>{email}</strong>.
              {' '}{t('auth.clickToVerify')}
            </p>
            <ShinyButton
              variant="primary"
              style={{ width: '100%' }}
              onClick={() => window.location.href = '/login'}
            >
              {t('auth.goToLogin')}
            </ShinyButton>
          </div>
        ) : (
          <>
            <h1 className="auth-title" style={{ textAlign: 'center', fontSize: '1.75rem', fontWeight: 800, marginBottom: 8, color: '#f8fafc' }}>
              <BlurText text={t('auth.createAccount')} delay={50} />
            </h1>
            <p className="auth-subtitle" style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.95rem', marginBottom: 28 }}>
              {t('auth.signUpSubtitle')}
            </p>

            <form className="auth-form" onSubmit={handleSignUp}>
              {error && <div className="auth-error" style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: 20, fontSize: 13 }}>⚠️ {error}</div>}

              <div className="auth-input-group" style={{ marginBottom: 16 }}>
                <label className="auth-label" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>{t('auth.fullName')}</label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder={t('auth.namePlaceholder')}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff', fontSize: 14 }}
                />
              </div>

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

              <div className="auth-input-group" style={{ marginBottom: 16 }}>
                <label className="auth-label" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>{t('auth.passwordLabel')}</label>
                <input
                  type="password"
                  className="auth-input"
                  placeholder={t('auth.minChars')}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff', fontSize: 14 }}
                />
              </div>

              <div className="auth-input-group" style={{ marginBottom: 16 }}>
                <label className="auth-label" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>{t('auth.confirmPassword')}</label>
                <input
                  type="password"
                  className="auth-input"
                  placeholder={t('auth.confirmPlaceholder')}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff', fontSize: 14 }}
                />
              </div>

              <div className="auth-input-group" style={{ marginBottom: 16 }}>
                <label className="auth-label" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>{t('auth.companyName')}</label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder={t('auth.companyPlaceholder')}
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff', fontSize: 14 }}
                />
              </div>

              <div className="auth-input-group" style={{ marginBottom: 24 }}>
                <label className="auth-label" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>{t('auth.companyType')}</label>
                <select
                  className="auth-input"
                  value={companyType}
                  onChange={e => setCompanyType(e.target.value)}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.12)', color: '#ffffff', fontSize: 14, cursor: 'pointer' }}
                  required
                >
                  <option value="B2B">{t('auth.b2b')}</option>
                  <option value="B2C">{t('auth.b2c')}</option>
                </select>
              </div>

              <ShinyButton
                type="submit"
                variant="primary"
                disabled={loading}
                style={{ width: '100%', padding: '14px', borderRadius: 10, fontSize: '1rem', fontWeight: 700 }}
              >
                {loading ? t('auth.creatingAccount') : t('auth.createAccountBtn')}
              </ShinyButton>
            </form>

            <div className="auth-footer" style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#94a3b8' }}>
              {t('auth.alreadyHaveAccount')}{' '}
              <Link to="/login" style={{ color: '#ff5900', fontWeight: 600, textDecoration: 'none' }}>
                {t('auth.signInLink')}
              </Link>
            </div>
          </>
        )}
      </SpotlightCard>
    </div>
  )
}
