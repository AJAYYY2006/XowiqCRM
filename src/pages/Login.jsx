import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      navigate('/dashboard')
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

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your CRM workspace</p>

        <form className="auth-form" onSubmit={handleLogin}>
          {error && <div className="auth-error"> {error}</div>}

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
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Sign up free
          </Link>
        </div>
      </div>
    </div>
  )
}
