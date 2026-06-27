import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import {
  X, User, Mail, Phone, Shield, Lock, Eye, EyeOff,
  Save, Edit3, ChevronRight, KeyRound, CheckCircle2, Briefcase
} from 'lucide-react'

export default function ProfileModal({ session, profile, onClose, onProfileUpdate }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile?.name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [saving, setSaving] = useState(false)
  const [visible, setVisible] = useState(false)

  const [changingPwd, setChangingPwd] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [savingPwd, setSavingPwd] = useState(false)

  const role = profile?.role || 'user'
  const email = session?.user?.email || ''
  const initials = (profile?.name || email)?.[0]?.toUpperCase() || '?'
  const isAdmin = role === 'admin'
  const isB2C = session.user.user_metadata?.companyType === 'B2C'

  // Slide-in animation on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const handleSaveProfile = async () => {
    if (!name.trim()) return toast.error('Name cannot be empty')
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim(), phone: phone.trim() })
      .eq('id', session.user.id)
    setSaving(false)
    if (error) {
      toast.error('Failed to update profile')
    } else {
      toast.success('Profile updated!')
      setEditing(false)
      onProfileUpdate && onProfileUpdate({ ...profile, name: name.trim(), phone: phone.trim() })
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword) return toast.error('Please enter a new password')
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters')
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match')
    setSavingPwd(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPwd(false)
    if (error) {
      toast.error(error.message || 'Failed to change password')
    } else {
      toast.success('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setChangingPwd(false)
    }
  }

  const cancelEdit = () => {
    setEditing(false)
    setName(profile?.name || '')
    setPhone(profile?.phone || '')
  }

  const cancelPwdChange = () => {
    setChangingPwd(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 900,
          background: visible ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)',
          backdropFilter: visible ? 'blur(3px)' : 'none',
          transition: 'background 0.3s ease, backdrop-filter 0.3s ease',
        }}
      />

      {/* Slide-in Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0, bottom: 0, left: 0,
          width: 360,
          zIndex: 1000,
          background: '#ffffff',
          boxShadow: '8px 0 40px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          transform: visible ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRadius: '0 20px 20px 0',
          overflow: 'hidden',
        }}
      >
        {/* ─── Header ─────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(145deg, #ff5900 0%, #ff8c42 60%, #ffb347 100%)',
          padding: '36px 24px 28px',
          position: 'relative',
          flexShrink: 0,
        }}>
          {/* Close button */}
          <button
            onClick={handleClose}
            style={{
              position: 'absolute', top: 14, right: 14,
              background: 'rgba(255,255,255,0.2)',
              border: 'none', borderRadius: '50%',
              width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff', transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          >
            <X size={17} />
          </button>

          {/* Avatar */}
          <div style={{
            width: 76, height: 76, borderRadius: '50%',
            background: 'rgba(255,255,255,0.22)',
            border: '3px solid rgba(255,255,255,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, fontWeight: 800, color: '#fff',
            marginBottom: 14,
            boxShadow: '0 4px 18px rgba(0,0,0,0.15)',
          }}>
            {initials}
          </div>

          <div style={{ color: '#fff' }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 2, letterSpacing: '-0.3px' }}>
              {profile?.name || 'User'}
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 10, letterSpacing: '0.01em' }}>
              {email}
            </div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: isAdmin ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.55)',
              borderRadius: 100,
              padding: '3px 12px',
              fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: '#fff',
            }}>
              <Shield size={11} />
              {isAdmin ? 'Administrator' : 'User'}
            </span>
          </div>
        </div>

        {/* ─── Body ────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

          {/* ── Company Mode (read-only) ── */}
          <FieldLabel icon={<Briefcase size={13} color="#ff5900" />} label="Company Mode" />
          <div style={readonlyFieldStyle}>
            <span style={{ flex: 1, color: '#444', fontWeight: 600 }}>
              {isB2C ? '🛍️ B2C Enterprise Mode' : '🏢 B2B Enterprise Mode'}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
              background: '#fef3ec', color: '#ff5900', borderRadius: 6,
              padding: '2px 8px', border: '1px solid #ffe0cc', flexShrink: 0,
            }}>
              STATIC
            </span>
          </div>

          {/* ── Email (read-only) ── */}
          <FieldLabel icon={<Mail size={13} color="#ff5900" />} label="Email Address" />
          <div style={readonlyFieldStyle}>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#444' }}>
              {email}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
              background: '#fef3ec', color: '#ff5900', borderRadius: 6,
              padding: '2px 8px', border: '1px solid #ffe0cc', flexShrink: 0,
            }}>
              READ ONLY
            </span>
          </div>

          {/* ── Full Name ── */}
          <FieldLabel icon={<User size={13} color="#ff5900" />} label="Full Name" />
          {editing ? (
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              style={editInputStyle}
              placeholder="Your full name"
              autoFocus
            />
          ) : (
            <div style={readonlyFieldStyle}>
              <span style={{ color: profile?.name ? '#333' : '#bbb' }}>{profile?.name || '—'}</span>
            </div>
          )}

          {/* ── Phone ── */}
          <FieldLabel icon={<Phone size={13} color="#ff5900" />} label="Phone / Contact" />
          {editing ? (
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              style={editInputStyle}
              placeholder="+91 00000 00000"
            />
          ) : (
            <div style={readonlyFieldStyle}>
              <span style={{ color: profile?.phone ? '#333' : '#bbb' }}>{profile?.phone || '—'}</span>
            </div>
          )}

          {/* ─── Edit Profile Buttons ─── */}
          {!changingPwd && (
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              {editing ? (
                <>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    style={primaryBtnStyle(saving)}
                  >
                    <Save size={14} />
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button onClick={cancelEdit} style={ghostBtnStyle}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditing(true)} style={outlineBtnStyle}>
                    <Edit3 size={14} /> Edit Profile
                  </button>
                  <button onClick={() => setChangingPwd(true)} style={ghostBtnStyle}>
                    <KeyRound size={14} /> Change Password
                  </button>
                </>
              )}
            </div>
          )}

          {/* ─── Change Password ─── */}
          {changingPwd && (
            <div style={{
              marginTop: 20,
              background: '#fff8f5',
              borderRadius: 14,
              padding: '18px',
              border: '1.5px solid #ffd8c4',
            }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: '#ff5900',
                marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <KeyRound size={15} /> Change Password
              </div>

              <FieldLabel label="New Password" />
              <div style={pwdInputWrapStyle}>
                <Lock size={13} color="#ff5900" />
                <input
                  type={showNewPwd ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  style={pwdInputStyle}
                />
                <button
                  onClick={() => setShowNewPwd(!showNewPwd)}
                  style={eyeBtnStyle}
                >
                  {showNewPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              <FieldLabel label="Confirm Password" />
              <div style={pwdInputWrapStyle}>
                <Lock size={13} color="#ff5900" />
                <input
                  type={showConfirmPwd ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  style={pwdInputStyle}
                />
                <button
                  onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                  style={eyeBtnStyle}
                >
                  {showConfirmPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {/* Strength hint */}
              {newPassword && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: -4, marginBottom: 14 }}>
                  {[...Array(4)].map((_, i) => {
                    const strength = Math.min(4, Math.floor(newPassword.length / 3))
                    return (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 3,
                        background: i < strength
                          ? strength >= 3 ? '#22c55e' : strength >= 2 ? '#f59e0b' : '#ef4444'
                          : '#e5e7eb',
                        transition: 'background 0.2s',
                      }} />
                    )
                  })}
                  <span style={{ fontSize: 10, color: '#888', flexShrink: 0 }}>
                    {newPassword.length < 6 ? 'Too short' : newPassword.length < 9 ? 'Fair' : newPassword.length < 12 ? 'Good' : 'Strong'}
                  </span>
                </div>
              )}

              {/* Match indicator */}
              {confirmPassword && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 12, marginBottom: 14,
                  color: confirmPassword === newPassword ? '#16a34a' : '#dc2626'
                }}>
                  <CheckCircle2 size={13} />
                  {confirmPassword === newPassword ? 'Passwords match' : 'Passwords do not match'}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleChangePassword}
                  disabled={savingPwd}
                  style={primaryBtnStyle(savingPwd)}
                >
                  {savingPwd ? 'Updating…' : 'Update Password'}
                </button>
                <button onClick={cancelPwdChange} style={ghostBtnStyle}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ─── Account Info ─── */}
          <div style={{
            marginTop: 28, paddingTop: 20,
            borderTop: '1px solid #f0f0f0',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
              Account Info
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <InfoRow label="Account Role" value={isAdmin ? 'Administrator' : 'Standard User'} accent={isAdmin} />
              <InfoRow label="Member Since" value={
                session?.user?.created_at
                  ? new Date(session.user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '—'
              } />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ─── Helper Components ─── */
function FieldLabel({ icon, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 600, color: '#888',
      textTransform: 'uppercase', letterSpacing: '0.07em',
      marginBottom: 6, marginTop: 16,
    }}>
      {icon}{label}
    </div>
  )
}

function InfoRow({ label, value, accent }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 12px', background: '#f9fafb', borderRadius: 10,
    }}>
      <span style={{ fontSize: 12, color: '#888' }}>{label}</span>
      <span style={{
        fontSize: 12, fontWeight: 600,
        color: accent ? '#ff5900' : '#333',
      }}>{value}</span>
    </div>
  )
}

/* ─── Shared Styles ─── */
const readonlyFieldStyle = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '10px 14px',
  background: '#f8f9fa',
  borderRadius: 10,
  border: '1px solid #eeeeee',
  fontSize: 13,
  marginBottom: 2,
}

const editInputStyle = {
  width: '100%',
  padding: '10px 14px',
  background: '#fff',
  borderRadius: 10,
  border: '2px solid #ff5900',
  fontSize: 13, color: '#333',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
  marginBottom: 2,
}

const pwdInputWrapStyle = {
  display: 'flex', alignItems: 'center', gap: 8,
  background: '#fff', borderRadius: 10,
  border: '1.5px solid #f0c4a8', padding: '9px 12px',
  marginBottom: 12,
}

const pwdInputStyle = {
  flex: 1, border: 'none', outline: 'none',
  fontSize: 13, background: 'transparent', color: '#333',
}

const eyeBtnStyle = {
  border: 'none', background: 'none',
  cursor: 'pointer', color: '#aaa', padding: 0,
  display: 'flex', alignItems: 'center',
}

const primaryBtnStyle = (disabled) => ({
  flex: 1, padding: '10px 0',
  background: disabled ? '#ffb380' : 'linear-gradient(135deg, #ff5900, #ff8237)',
  color: '#fff', border: 'none', borderRadius: 10,
  fontWeight: 600, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  transition: 'opacity 0.2s',
})

const outlineBtnStyle = {
  flex: 1, padding: '10px 0',
  background: '#fff5f0',
  color: '#ff5900', border: '1.5px solid #ff5900', borderRadius: 10,
  fontWeight: 600, fontSize: 13, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
}

const ghostBtnStyle = {
  flex: 1, padding: '10px 0',
  background: '#f4f4f5',
  color: '#555', border: '1.5px solid #e5e7eb', borderRadius: 10,
  fontWeight: 600, fontSize: 13, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
}
