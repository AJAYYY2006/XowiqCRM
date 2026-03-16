import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function SignUp() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState('user')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role } }
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
            <h2 style={{ marginBottom: 12 }}>Check your inbox!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>
              We've sent a verification link to <strong style={{ color: 'var(--accent)' }}>{email}</strong>.
              Click the link in the email to verify your account, then sign in.
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
              Go to Login →
            </Link>
          </div>
        ) : (
          <>
            <h1 className="auth-title">Create account</h1>
            <p className="auth-subtitle">Start your 14-day free trial today</p>

            <form className="auth-form" onSubmit={handleSignUp}>
              {error && <div className="auth-error"> {error}</div>}

              <div className="auth-input-group">
                <label className="auth-label">Full Name</label>
                <input
                  type="text"
                  className="auth-input"
                  placeholder="John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-label">Email Address</label>
                <input
                  type="email"
                  className="auth-input"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-label">Password</label>
                <input
                  type="password"
                  className="auth-input"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-label">Confirm Password</label>
                <input
                  type="password"
                  className="auth-input"
                  placeholder="Re-enter your password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-label">Register as</label>
                <select
                  className="auth-input"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  style={{ cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23333%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '10px' }}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account →'}
              </button>
            </form>

            <div className="auth-footer">
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
