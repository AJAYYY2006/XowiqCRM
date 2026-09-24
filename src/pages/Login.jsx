import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { FlowaLogo } from '../components/flowa/FlowaNavbar'
import DevQuickLoginModal, { DEV_ACCOUNTS } from '../components/ui/DevQuickLoginModal'
import { Sparkles, KeyRound, Zap, ArrowLeft, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { validateEmail } from '../lib/validation'

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
    const emailCheck = validateEmail(userEmail, { required: true, label: 'Email Address' })
    if (!emailCheck.valid) {
      setError(emailCheck.error)
      toast.error(emailCheck.error)
      return
    }
    if (!userPassword) {
      setError('Password is required')
      toast.error('Password is required')
      return
    }

    setLoading(true)

    const toastId = toast.loading('Authenticating XOWIQ workspace...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail.trim().toLowerCase(),
      password: userPassword
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      toast.error(signInError.message, { id: toastId })
      return
    }

    const userId = signInData.user.id

    // Fetch role and company type from profiles table (source of truth)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, company_name, company_type')
      .eq('id', userId)
      .maybeSingle()

    const rawCompanyType = profileData?.company_type || signInData.user.user_metadata?.companyType || 'B2B'
    const isB2CUser = String(rawCompanyType).toUpperCase() === 'B2C' || String(profileData?.role).toLowerCase() === 'b2c'
    const role = isB2CUser ? 'b2c' : (profileData?.role || signInData.user.user_metadata?.role || 'admin')

    // Sync role and companyType back to user_metadata
    await supabase.auth.updateUser({ data: { role, companyType: rawCompanyType } })

    try {
      const meta = signInData.user.user_metadata || {}
      await supabase.from('profiles').upsert({
        id: userId,
        name: meta.name || profileData?.name || 'Unknown User',
        email: signInData.user.email,
        role: role,
        company_name: meta.companyName || profileData?.company_name || null,
        company_type: rawCompanyType,
        created_by: meta.created_by || profileData?.created_by || null,
        created_by_admin_id: meta.created_by_admin_id || profileData?.created_by_admin_id || null
      })
    } catch (err) {
      console.warn('Profile sync notice:', err)
    }

    toast.success(`Welcome back, ${profileData?.name || 'User'}!`, { id: toastId })
    setLoading(false)
    navigate('/dashboard')
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
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#ffeedd] via-[#e2e8f0] to-[#f8fafc] p-4 sm:p-6 font-['Poppins',sans-serif]">
      {/* Top Bar with back link */}
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between pt-2">
        <FlowaLogo />
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 bg-white/80 hover:bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm transition-all no-underline"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Main Login Center Card */}
      <div className="max-w-md w-full mx-auto my-8 space-y-4">
        {/* Quick Role Auto-Fill Bar */}
        <div
          onClick={() => setIsDevModalOpen(true)}
          className="bg-white/90 hover:bg-white backdrop-blur-xl border border-orange-200/80 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer shadow-lg shadow-orange-950/10 transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#ff5900] text-white flex items-center justify-center shadow-md shadow-orange-500/30">
              <Zap size={16} />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-900 flex items-center gap-2">
                <span>Demo Accounts Auto-Fill</span>
                <span className="text-[10px] font-medium bg-orange-100 text-[#ff5900] px-2 py-0.5 rounded-full">5 ROLES</span>
              </div>
              <div className="text-[11px] text-slate-500 font-light">1-click login or role credentials</div>
            </div>
          </div>
          <span className="text-xs font-medium text-[#ff5900] flex items-center gap-1">
            <span>Open</span>
            <Zap size={13} className="text-[#ff5900]" />
          </span>
        </div>

        {/* Login Form Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 border border-white/80 shadow-2xl shadow-orange-950/10">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-medium text-slate-950">Welcome Back</h1>
            <p className="text-xs text-slate-500 font-light mt-1">Sign in to your XOWIQ CRM workspace</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 text-xs font-medium flex items-center gap-1.5">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Work Email</label>
              <input
                type="email"
                required
                placeholder="alex@xowiq.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#ff5900] shadow-sm font-light"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#ff5900] shadow-sm font-light"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-[#ff5900] hover:bg-[#e04f00] text-white font-medium text-sm shadow-lg shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 border-none"
            >
              <span>{loading ? 'Signing In...' : 'Sign In to Workspace'}</span>
              <ArrowRight size={15} />
            </button>
          </form>

          {/* Quick Role Fill Pills */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              Quick Role Switch:
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {DEV_ACCOUNTS.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => handleSelectAccount(acc.email, acc.password)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-50 text-slate-700 hover:text-[#ff5900] text-[11px] font-medium transition-colors cursor-pointer border border-slate-200"
                >
                  {acc.badge}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="text-center text-xs text-slate-400 font-light pb-2">
        © {new Date().getFullYear()} XOWIQ CRM Technologies Inc. All rights reserved.
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
