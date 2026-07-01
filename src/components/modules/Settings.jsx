import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Settings as SettingsIcon, Globe, Users } from 'lucide-react'

export default function SettingsPage({ session, profile }) {
  const { i18n } = useTranslation()
  const [selectedLang, setSelectedLang] = useState(
    () => localStorage.getItem('i18nextLng') || i18n.language || 'en'
  )

  // States for creating user/admin accounts
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserCompany, setNewUserCompany] = useState('')
  const [newUserCompanyType, setNewUserCompanyType] = useState('B2B')
  const [newUserRole, setNewUserRole] = useState('user')
  const [creatingUser, setCreatingUser] = useState(false)

  const isAdmin = ['admin', 'administrator'].includes(
    (session?.user?.user_metadata?.role || profile?.role || '').toLowerCase()
  )

  const languages = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
    { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  ]

  const handleLanguageChange = (code) => {
    setSelectedLang(code)
    i18n.changeLanguage(code)
    localStorage.setItem('i18nextLng', code)
    toast.success('Language updated!')
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      toast.error('Please fill in Name, Email, and Password')
      return
    }
    if (newUserPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setCreatingUser(true)
    const toastId = toast.loading('Creating user account...')

    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = 'https://bmsnbwgwdxqhccqesgkt.supabase.co'
      const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtc25id2d3ZHhxaGNjcWVzZ2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTExNjksImV4cCI6MjA4OTA4NzE2OX0.IhByvcKXFOL6XwW3UhTig6XMzNrNvpYFhaehq2_DUBU'
      
      // Secondary client with session persistence disabled
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }
      })

      const { data, error } = await tempClient.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
        options: {
          data: {
            name: newUserName,
            role: newUserRole,
            companyName: newUserCompany || profile?.company_name || 'My Company',
            companyType: newUserCompanyType
          }
        }
      })

      if (error) throw error

      toast.success(`Account for ${newUserEmail} created successfully!`, { id: toastId })
      
      // Reset form
      setNewUserName('')
      setNewUserEmail('')
      setNewUserPassword('')
      setNewUserCompany('')
      setNewUserCompanyType('B2B')
      setNewUserRole('user')
    } catch (err) {
      toast.error(err.message || 'Failed to create user', { id: toastId })
    } finally {
      setCreatingUser(false)
    }
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
    <div className="settings-page anim-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <SettingsIcon size={24} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
            Settings
          </h1>
          <p className="page-subtitle">Configure your system defaults.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 28, maxWidth: 600 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>⚙️ System Settings</h2>

        {/* Currency */}
        <div className="form-group" style={{ marginBottom: 32 }}>
          <label className="form-label">Global Currency Symbol</label>
          <select
            className="form-input"
            style={{ maxWidth: 320 }}
            value={profile?.currency || '$'}
            onChange={async (e) => {
              const val = e.target.value
              const tid = toast.loading('Updating...')
              const { error } = await supabase
                .from('profiles')
                .update({ currency: val })
                .eq('id', session.user.id)
              if (error) toast.error('Failed', { id: tid })
              else {
                toast.success('Currency Updated!', { id: tid })
                window.location.reload()
              }
            }}
          >
            <option value="$">$ (USD/Global)</option>
            <option value="₹">₹ (INR)</option>
            <option value="€">€ (EUR)</option>
            <option value="£">£ (GBP)</option>
            <option value="¥">¥ (JPY/CNY)</option>
          </select>
          <p className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>
            This affects all dashboard tiles, quotes, and PDF invoices.
          </p>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #f1f5f9', marginBottom: 28 }} />

        {/* Language */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <Globe size={15} /> Display Language
          </label>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {languages.map(lang => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  borderRadius: 10,
                  border: selectedLang === lang.code
                    ? '2px solid var(--accent, #f37a23)'
                    : '1.5px solid #e2e8f0',
                  background: selectedLang === lang.code
                    ? 'rgba(243,122,35,0.08)'
                    : '#fff',
                  cursor: 'pointer',
                  fontWeight: selectedLang === lang.code ? 700 : 500,
                  fontSize: 13,
                  color: selectedLang === lang.code
                    ? 'var(--accent, #f37a23)'
                    : 'var(--text-primary, #1e293b)',
                  transition: 'all 0.18s',
                  boxShadow: selectedLang === lang.code
                    ? '0 2px 8px rgba(243,122,35,0.13)'
                    : '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <span style={{ fontSize: 18 }}>{lang.flag}</span>
                <span>{lang.label}</span>
                {selectedLang === lang.code && (
                  <span style={{ marginLeft: 4, fontSize: 13, color: 'var(--accent, #f37a23)' }}>✓</span>
                )}
              </button>
            ))}
          </div>
          <p className="text-muted" style={{ fontSize: 12, marginTop: 10 }}>
            Changes apply immediately across the entire CRM.
          </p>
        </div>
      </div>

      {isAdmin && (
        <div className="card" style={{ padding: 28, maxWidth: 600, marginTop: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={20} style={{ color: 'var(--accent, #f37a23)' }} /> Create New Account
          </h2>
          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter Full Name"
                value={newUserName}
                onChange={e => setNewUserName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address (Login ID)</label>
              <input
                type="email"
                className="form-input"
                placeholder="Enter Email Address"
                value={newUserEmail}
                onChange={e => setNewUserEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter Password (min 6 chars)"
                value={newUserPassword}
                onChange={e => setNewUserPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input
                type="text"
                className="form-input"
                placeholder={profile?.company_name || "Company Name"}
                value={newUserCompany}
                onChange={e => setNewUserCompany(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Company Type</label>
              <select
                className="form-input"
                value={newUserCompanyType}
                onChange={e => setNewUserCompanyType(e.target.value)}
                style={selectStyle}
                required
              >
                <option value="B2B">B2B (Business to Business)</option>
                <option value="B2C">B2C (Business to Consumer)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-input"
                value={newUserRole}
                onChange={e => setNewUserRole(e.target.value)}
                style={selectStyle}
                required
              >
                <option value="user">User (Regular Access)</option>
                <option value="admin">Admin (Full Access & Account Creation)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={creatingUser}
              style={{
                background: 'var(--accent-gradient, linear-gradient(135deg, #f37a23, #ef4444))',
                color: '#fff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 8,
                fontWeight: 700,
                cursor: 'pointer',
                width: '100%',
                transition: 'opacity 0.2s',
                marginTop: 8,
                opacity: creatingUser ? 0.7 : 1
              }}
            >
              {creatingUser ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
