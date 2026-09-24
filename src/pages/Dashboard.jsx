import { useState, useEffect, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Users, LogOut, UserPlus, BarChart3,
  TrendingUp, CheckCircle, Ticket, Target, Activity,
  Shield, ChevronRight, Search, RefreshCw, Eye, EyeOff,
  Package, UserSquare2, Building2, Briefcase, Quote, Settings, Trash2, ClipboardList,
  Sun, Moon
} from 'lucide-react'

// Import all existing CRM modules so admin can use them too
import DashboardHome from '../components/modules/DashboardHome'
import Leads from '../components/modules/Leads'
import Contacts from '../components/modules/Contacts'
import Accounts from '../components/modules/Accounts'
import Opportunities from '../components/modules/Opportunities'
import Quotes from '../components/modules/Quotes'
import Invoices from '../components/modules/Invoices'
import Reports from '../components/modules/Reports'
import Tickets from '../components/modules/Tickets'
import Tasks from '../components/modules/Tasks'
import SettingsPage from '../components/modules/Settings'
import Services from '../components/modules/Services'
import ExecutiveSuperAdminDashboard from '../components/dashboard/ExecutiveSuperAdminDashboard'
import AppSidebar from '../components/layout/AppSidebar'
import { useRole } from '../contexts/RoleContext'
import { useTheme } from '../contexts/ThemeContext'
import RoleGuard from '../components/auth/RoleGuard'
import { ROLE_DEFINITIONS, ASSIGNABLE_ROLES } from '../config/roles'
import { validateEmail, validateRequired } from '../lib/validation'

// ─── KPI Panel ───────────────────────────────────────────────────────────────
function KPIPanel({ session, profile }) {
  const { t } = useTranslation()
  const [users, setUsers] = useState([])
  const [kpiData, setKpiData] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // New aggregate states for dashboard sections
  const [monthlyRevenue, setMonthlyRevenue] = useState([])
  const [activityHeatmap, setActivityHeatmap] = useState([])
  const [invoiceStats, setInvoiceStats] = useState({ totalRevenue: 0, paidCount: 0, unpaidCount: 0, overdueCount: 0 })
  const [contactsCount, setContactsCount] = useState(0)
  const [accountsCount, setAccountsCount] = useState(0)
  const [quotesAccepted, setQuotesAccepted] = useState(0)

  const companyName = profile?.company_name || session.user.user_metadata?.companyName || ''
  const companyType = profile?.company_type || session.user.user_metadata?.companyType || 'B2B'

  // Helper: build monthly revenue array from deals with closed_date
  const buildMonthlyRevenue = (deals) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const now = new Date()
    const currentYear = now.getFullYear()
    const monthMap = {}
    months.forEach((m, i) => { monthMap[i] = { month: m, revenue: 0, deals: 0 } })

    deals.forEach(d => {
      const date = new Date(d.closed_date || d.created_at)
      if (date.getFullYear() === currentYear) {
        const mi = date.getMonth()
        monthMap[mi].revenue += Number(d.amount || 0)
        monthMap[mi].deals += 1
      }
    })

    const arr = Object.values(monthMap)
    const maxRev = Math.max(...arr.map(m => m.revenue), 1)
    return arr.map(m => ({
      ...m,
      convRate: m.deals > 0 ? `${((m.deals / Math.max(m.deals, 1)) * 100).toFixed(1)}%` : '0.0%',
      height: Math.round((m.revenue / maxRev) * 100)
    }))
  }

  // Helper: build heatmap from activity timestamps
  const buildActivityHeatmap = (timestamps) => {
    // Buckets: 3 time slots × 7 days
    const slots = [
      { timeSlot: '12 AM - 8 AM', range: [0, 8] },
      { timeSlot: '8 AM - 4 PM', range: [8, 16] },
      { timeSlot: '4 PM - 12 AM', range: [16, 24] }
    ]
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    // Initialize counts
    const counts = {}
    slots.forEach(s => {
      counts[s.timeSlot] = {}
      dayNames.forEach(d => { counts[s.timeSlot][d] = 0 })
    })

    // Bucket each timestamp
    timestamps.forEach(ts => {
      const date = new Date(ts)
      const hour = date.getHours()
      const dayName = dayNames[date.getDay()]
      for (const s of slots) {
        if (hour >= s.range[0] && hour < s.range[1]) {
          counts[s.timeSlot][dayName] += 1
          break
        }
      }
    })

    // Find max for level scaling
    const allCounts = Object.values(counts).flatMap(slot => Object.values(slot))
    const maxCount = Math.max(...allCounts, 1)

    // Build heatmap data structure
    return slots.map(s => ({
      timeSlot: s.timeSlot,
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => {
        const c = counts[s.timeSlot][d]
        let level = 0
        if (c > 0) level = 1
        if (c >= maxCount * 0.33) level = 2
        if (c >= maxCount * 0.66) level = 3
        return { day: d, level, count: `${c} activities` }
      })
    }))
  }

  // Separate initial load (shows spinner) from silent background refresh (no flicker)
  const refreshKPIs = async (showSpinner = false) => {
    if (showSpinner) setLoading(true)
    try {
      // Primary: find users directly created by this admin using created_by_admin_id
      let { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, name, email, role, created_at, company_name, company_type, created_by_admin_id')
        .eq('created_by_admin_id', session.user.id)

      // Fallback 1: if created_by_admin_id returned nothing, check legacy created_by
      if (!allProfiles || allProfiles.length === 0) {
        const legacyRes = await supabase
          .from('profiles')
          .select('id, name, email, role, created_at, company_name, company_type, created_by_admin_id')
          .eq('created_by', session.user.id)
        allProfiles = legacyRes.data || []
      }

      // Fallback 2: if created_by returned nothing, match by company_name
      if (!allProfiles || allProfiles.length === 0) {
        const fallback = await supabase
          .from('profiles')
          .select('id, name, email, role, created_at, company_name, company_type')
          .ilike('company_name', companyName ? `%${companyName}%` : '%')
          .neq('id', session.user.id)
        allProfiles = fallback.data || []
      }

      const teamUsers = (allProfiles || []).filter(p =>
        ['user', 'manager'].includes((p.role || '').toLowerCase())
      )
      setUsers(teamUsers)

      // Collect all team user IDs (including admin) for aggregate queries
      const allUserIds = [session.user.id, ...teamUsers.map(u => u.id)]

      // ── Per-user KPIs ──
      const kpiMap = {}
      await Promise.all(teamUsers.map(async (u) => {
        const [leadsRes, customersRes, dealsRes, tasksRes, ticketsRes, activitiesRes, activityCountRes,
               contactsRes, accountsRes, invoicesPaidRes, quotesAccRes] = await Promise.all([
          supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', u.id),
          supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', u.id).eq('status', 'converted'),
          supabase.from('opportunities').select('amount').eq('user_id', u.id).eq('stage', 'closed'),
          supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', u.id).eq('status', 'Completed'),
          supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('user_id', u.id).eq('status', 'resolved'),
          supabase.from('activities').select('created_at').eq('user_id', u.id).order('created_at', { ascending: false }).limit(1),
          supabase.from('activities').select('id', { count: 'exact', head: true }).eq('user_id', u.id),
          // New: contacts & accounts count per user
          supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('user_id', u.id),
          supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('user_id', u.id),
          // New: paid invoices per user (invoices stored in quotes table with status = 'Paid')
          supabase.from('quotes').select('total_price').eq('user_id', u.id).eq('status', 'Paid'),
          // New: accepted quotes count per user
          supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('user_id', u.id).eq('status', 'Accepted'),
        ])

        const deals = dealsRes.data || []
        const dealsCount = deals.length
        const dealsValue = deals.reduce((sum, d) => sum + Number(d.amount || 0), 0)
        const paidInvoices = invoicesPaidRes.data || []
        const invoiceRevenue = paidInvoices.reduce((sum, inv) => sum + Number(inv.total_price || 0), 0)

        kpiMap[u.id] = {
          leads: leadsRes.count || 0,
          customers: customersRes.count || 0,
          dealsCount,
          dealsValue,
          tasks: tasksRes.count || 0,
          tickets: ticketsRes.count || 0,
          lastActive: activitiesRes.data?.[0]?.created_at || null,
          activityFrequency: activityCountRes.count || 0,
          // New per-user metrics
          contacts: contactsRes.count || 0,
          accounts: accountsRes.count || 0,
          invoiceRevenue,
          invoicesPaid: paidInvoices.length,
          quotesAccepted: quotesAccRes.count || 0,
        }
      }))
      setKpiData(kpiMap)

      // ── Aggregate queries for dashboard charts ──

      // 1. Monthly revenue: all closed opportunities across team
      const { data: allDeals } = await supabase
        .from('opportunities')
        .select('amount, closed_date, created_at')
        .in('user_id', allUserIds)
        .eq('stage', 'closed')
      setMonthlyRevenue(buildMonthlyRevenue(allDeals || []))

      // 2. Activity heatmap: all activity timestamps across team
      const { data: allActivities } = await supabase
        .from('activities')
        .select('created_at')
        .in('user_id', allUserIds)
      setActivityHeatmap(buildActivityHeatmap((allActivities || []).map(a => a.created_at)))

      // 3. Invoice stats: all invoices (quotes table) across team
      const { data: allInvoices } = await supabase
        .from('quotes')
        .select('total_price, status, expires_at')
        .in('user_id', allUserIds)
      const invs = allInvoices || []
      const paid = invs.filter(i => i.status === 'Paid')
      const unpaid = invs.filter(i => i.status === 'Unpaid')
      const overdue = invs.filter(i => {
        if (i.status === 'Paid') return false
        if (!i.expires_at) return false
        return new Date(i.expires_at) < new Date()
      })
      setInvoiceStats({
        totalRevenue: paid.reduce((s, i) => s + Number(i.total_price || 0), 0),
        paidCount: paid.length,
        unpaidCount: unpaid.length,
        overdueCount: overdue.length
      })

      // 4. Total contacts across team
      const { count: totalContacts } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .in('user_id', allUserIds)
      setContactsCount(totalContacts || 0)

      // 5. Total accounts across team
      const { count: totalAccounts } = await supabase
        .from('accounts')
        .select('id', { count: 'exact', head: true })
        .in('user_id', allUserIds)
      setAccountsCount(totalAccounts || 0)

      // 6. Total accepted quotes across team
      const { count: totalQuotesAccepted } = await supabase
        .from('quotes')
        .select('id', { count: 'exact', head: true })
        .in('user_id', allUserIds)
        .eq('status', 'Accepted')
      setQuotesAccepted(totalQuotesAccepted || 0)

    } catch (err) {
      // Silent on background refresh failures
      if (showSpinner) toast.error(t('kpi.failedLoad'))
    } finally {
      if (showSpinner) setLoading(false)
    }
  }

  const fetchKPIs = () => refreshKPIs(true)

  useEffect(() => {
    // Initial load with spinner
    refreshKPIs(true)

    // Real-time subscriptions — fire silent refresh when user data changes
    const tables = ['leads', 'opportunities', 'tasks', 'tickets', 'activities', 'contacts', 'accounts', 'quotes']
    const channels = tables.map(table =>
      supabase
        .channel(`kpi-${table}-watch`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          refreshKPIs(false) // silent — no spinner, no flicker
        })
        .subscribe()
    )

    // Polling fallback every 30s — guarantees updates even if Realtime isn't enabled
    const pollInterval = setInterval(() => refreshKPIs(false), 30000)

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch))
      clearInterval(pollInterval)
    }
  }, [profile])

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  // Aggregate totals
  const totals = Object.values(kpiData).reduce((acc, k) => ({
    leads: acc.leads + k.leads,
    customers: acc.customers + k.customers,
    dealsCount: acc.dealsCount + k.dealsCount,
    dealsValue: acc.dealsValue + k.dealsValue,
    tasks: acc.tasks + k.tasks,
    tickets: acc.tickets + k.tickets,
    activityFrequency: acc.activityFrequency + k.activityFrequency,
  }), { leads: 0, customers: 0, dealsCount: 0, dealsValue: 0, tasks: 0, tickets: 0, activityFrequency: 0 })

  if (loading) return (
    <div className="loading-container" style={{ minHeight: 300 }}>
      <div className="spinner" /><span>{t('kpi.loading')}</span>
    </div>
  )

  return (
    <div style={{ padding: '0 0 40px' }}>
      <ExecutiveSuperAdminDashboard
        session={session}
        profile={profile}
        users={users}
        kpiData={kpiData}
        currency={profile?.currency || '$'}
        monthlyRevenue={monthlyRevenue}
        activityHeatmap={activityHeatmap}
        invoiceStats={invoiceStats}
        contactsCount={contactsCount}
        accountsCount={accountsCount}
        quotesAccepted={quotesAccepted}
      />
    </div>
  )
}

// ─── User Management Panel ────────────────────────────────────────────────────
function UserManagementPanel({ session, profile, onUserCreated }) {
  const { t } = useTranslation()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [inlineError, setInlineError] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', password: '', companyType: profile?.company_type || session.user.user_metadata?.companyType || 'B2B', role: 'manager'
  })

  const companyName = profile?.company_name || session.user.user_metadata?.companyName || 'My Company'
  useEffect(() => {
    fetchUsers()

    // Real-time: instantly reflect new users added to profiles table
    const channel = supabase.channel('admin-profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchUsers()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile])

  const fetchUsers = async () => {
    setLoading(true)
    // Primary: by created_by_admin_id
    let { data } = await supabase
      .from('profiles')
      .select('id, name, email, role, created_at, company_type, created_by_admin_id')
      .eq('created_by_admin_id', session.user.id)
      .order('created_at', { ascending: false })

    // Fallback 1: legacy created_by
    if (!data || data.length === 0) {
      const legacyRes = await supabase
        .from('profiles')
        .select('id, name, email, role, created_at, company_type, created_by_admin_id')
        .eq('created_by', session.user.id)
        .order('created_at', { ascending: false })
      data = legacyRes.data || []
    }

    // Fallback 2: by company_name (covers pre-existing users or RLS-blocked upserts)
    if (!data || data.length === 0) {
      const fallback = await supabase
        .from('profiles')
        .select('id, name, email, role, created_at, company_type')
        .ilike('company_name', companyName ? `%${companyName}%` : '%')
        .neq('id', session.user.id)
        .order('created_at', { ascending: false })
      data = fallback.data || []
    }

    // Merge with locally stored users created by this admin to prevent disappearing on refresh
    const localKey = `xowiq_created_users_${session.user.id}`
    const localUsers = JSON.parse(localStorage.getItem(localKey) || '[]')
    
    // De-duplicate by email, prioritizing DB records if they have matching data
    const merged = [...data]
    localUsers.forEach(lu => {
      if (!merged.some(u => u.email?.toLowerCase() === lu.email?.toLowerCase())) {
        merged.push(lu)
      }
    })

    setUsers(merged)
    setLoading(false)
  }

  const handleDeleteUser = async (userId, userEmail) => {
    if (!window.confirm(`${t('userMgmt.confirmRemove')} ${userEmail || 'this user'}?`)) return
    
    const toastId = toast.loading(t('userMgmt.removingUser'))
    try {
      // 1. Delete from profiles table
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) {
        console.warn('Profile delete in DB failed (likely RLS), proceeding to local updates:', error.message)
      }

      // 2. Remove from localStorage
      const localKey = `xowiq_created_users_${session.user.id}`
      const localUsers = JSON.parse(localStorage.getItem(localKey) || '[]')
      const updatedLocal = localUsers.filter(u => u.id !== userId && u.email?.toLowerCase() !== userEmail?.toLowerCase())
      localStorage.setItem(localKey, JSON.stringify(updatedLocal))

      // 3. Update state
      setUsers(prev => prev.filter(u => u.id !== userId))
      toast.success(t('userMgmt.removedSuccess'), { id: toastId })
    } catch (err) {
      toast.error(t('userMgmt.removeFailed'), { id: toastId })
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setInlineError('')

    const nameCheck = validateRequired(form.name, 'Full Name')
    if (!nameCheck.valid) { toast.error(nameCheck.error); return }

    const inputEmail = form.email.trim().toLowerCase()
    const emailCheck = validateEmail(inputEmail, { required: true, label: 'Email Address' })
    if (!emailCheck.valid) {
      setInlineError(emailCheck.error)
      toast.error(emailCheck.error)
      return
    }

    if (!form.password.trim()) {
      toast.error('Password is required')
      return
    }
    if (form.password.length < 6) { toast.error(t('userMgmt.passwordShort')); return }

    // 1. Check against admin's own email/username
    const adminEmail = (session.user.email || '').toLowerCase().trim()
    const adminProfileEmail = (profile?.email || '').toLowerCase().trim()
    if (inputEmail === adminEmail || inputEmail === adminProfileEmail) {
      setInlineError(t('userMgmt.usernameInUse'))
      return
    }

    // 2. Check against loaded team list (same organization/tenant)
    const existsInTeam = users.some(u => (u.email || '').toLowerCase().trim() === inputEmail)
    if (existsInTeam) {
      setInlineError(t('userMgmt.usernameInUse'))
      return
    }

    // 3. Query profiles directly from DB (same organization/tenant fallback check)
    try {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('email, company_name')
        .eq('email', form.email.trim())
        .maybeSingle()

      if (existingUser) {
        const isSameOrg = (existingUser.company_name || '').toLowerCase().trim() === companyName.toLowerCase().trim()
        if (isSameOrg) {
          setInlineError(t('userMgmt.usernameInUse'))
          return
        }
      }
    } catch (err) {
      console.warn('DB check for duplicate email failed, proceeding:', err)
    }

    setCreating(true)
    const toastId = toast.loading(t('userMgmt.creating'))
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const tempClient = createClient(
        'https://bmsnbwgwdxqhccqesgkt.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtc25id2d3ZHhxaGNjcWVzZ2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTExNjksImV4cCI6MjA4OTA4NzE2OX0.IhByvcKXFOL6XwW3UhTig6XMzNrNvpYFhaehq2_DUBU',
        { auth: { persistSession: false } }
      )
      const { data, error } = await tempClient.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            name: form.name,
            role: form.companyType === 'B2C' ? 'b2c' : form.role,
            companyName,
            companyType: form.companyType,
            created_by: session.user.id,
            created_by_admin_id: session.user.id,
          }
        }
      })
      if (error) throw error

      toast.success(t('userMgmt.removedSuccess') + ` "${form.name}"`, { id: toastId })

      const realUserId = data.user?.id

      // Create new user object — use real ID if available
      const newUser = {
        id: realUserId || `pending-${Date.now()}`,
        name: form.name,
        email: form.email,
        role: form.role,
        created_at: new Date().toISOString(),
        company_type: form.companyType,
      }

      // Save to localStorage so they persist on refresh
      const localKey = `xowiq_created_users_${session.user.id}`
      const localUsers = JSON.parse(localStorage.getItem(localKey) || '[]')
      localStorage.setItem(localKey, JSON.stringify([newUser, ...localUsers.filter(u => u.email?.toLowerCase() !== form.email.toLowerCase())]))

      // Optimistic update of current state
      setUsers(prev => [newUser, ...prev.filter(u => u.email !== form.email)])

      // Persist to profiles in database (with created_by)
      if (realUserId) {
        const { error: upsertError } = await supabase.from('profiles').upsert({
          id: realUserId,
          name: form.name,
          email: form.email,
          role: form.companyType === 'B2C' ? 'b2c' : form.role,
          company_name: companyName,
          company_type: form.companyType,
          created_by: session.user.id,
          created_by_admin_id: session.user.id,
        })
        if (upsertError) {
          console.warn('Profile upsert blocked (RLS):', upsertError.message)
        }

        // After a short delay, re-fetch the user's real profile to get the actual DB row
        // and resolve any pending IDs in localStorage, then refresh parent's teamUserIds
        setTimeout(async () => {
          try {
            const { data: newProfile } = await supabase
              .from('profiles')
              .select('id, name, email, role, company_name, company_type, created_by_admin_id')
              .eq('id', realUserId)
              .maybeSingle()

            // Update localStorage with confirmed real data
            const stored = JSON.parse(localStorage.getItem(localKey) || '[]')
            const updated = stored.map(u =>
              u.email?.toLowerCase() === form.email.toLowerCase()
                ? { ...u, id: realUserId, ...(newProfile || {}) }
                : u
            )
            localStorage.setItem(localKey, JSON.stringify(updated))

            // Notify parent to re-fetch teamUserIds
            if (onUserCreated) onUserCreated()
          } catch (e) {
            // still notify parent even if re-fetch fails
            if (onUserCreated) onUserCreated()
          }
        }, 2000)
      } else {
        // No real ID yet — still notify parent to trigger a refresh
        if (onUserCreated) onUserCreated()
      }

      setForm({ name: '', email: '', password: '', companyType: form.companyType, role: 'manager' })
    } catch (err) {
      toast.error(err.message || t('userMgmt.createFailed'), { id: toastId })
    }
    setCreating(false)
  }

  const selectStyle = {
    cursor: 'pointer', appearance: 'none',
    backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23333%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '10px'
  }

  return (
    <div style={{ padding: '0 0 40px' }}>
      <div className="page-header" style={{ marginBottom: 28 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserPlus size={26} style={{ color: '#f37a23' }} /> {t('userMgmt.title')}
          </h1>
          <p className="page-subtitle">{t('userMgmt.subtitle')} <strong>{companyName}</strong>.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24, alignItems: 'start' }}>
        {/* Create User Form */}
        <div className="card" style={{ padding: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={18} style={{ color: '#f37a23' }} /> {t('userMgmt.createNewUser')}
          </h3>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label className="form-label">{t('userMgmt.fullName')}</label>
              <input type="text" className="form-input" placeholder="e.g. Kaviya Shree"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('userMgmt.emailLoginId')}</label>
              <input type="email" className="form-input" placeholder="user@company.com"
                value={form.email} onChange={e => {
                  setForm(p => ({ ...p, email: e.target.value }))
                  setInlineError('')
                }} required />
              {inlineError && (
                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: '500' }}>
                  {inlineError}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">{t('userMgmt.password')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder={t('userMgmt.passwordMin')}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required
                  style={{ paddingRight: 40 }}
                />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{t('userMgmt.companyType')}</label>
              <select className="form-input" value={form.companyType} onChange={e => setForm(p => ({ ...p, companyType: e.target.value }))} style={selectStyle}>
                <option value="B2B">B2B (Business to Business)</option>
                <option value="B2C">B2C (Business to Consumer)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('userMgmt.role')}</label>
              <select className="form-input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={selectStyle}>
                {ASSIGNABLE_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <button
              type="submit"
              disabled={creating}
              style={{ background: 'linear-gradient(135deg,#f37a23,#ef4444)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', opacity: creating ? 0.7 : 1, marginTop: 4, transition: 'opacity 0.2s' }}
            >
              {creating ? t('userMgmt.creating') : t('userMgmt.createAccount')}
            </button>
          </form>
        </div>

        {/* User List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              {t('userMgmt.teamMembers')}
              <span style={{ marginLeft: 8, background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 12 }}>{users.length}</span>
            </h3>
            <button onClick={fetchUsers} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
              <RefreshCw size={15} />
            </button>
          </div>
          {loading ? (
            <div className="loading-container" style={{ minHeight: 200 }}><div className="spinner" /></div>
          ) : users.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <Users size={32} style={{ color: 'var(--text-muted)', marginBottom: 10 }} />
              <p style={{ color: 'var(--text-muted)' }}>{t('userMgmt.noUsers')}</p>
            </div>
          ) : (
            <div>
              {users.map(u => (
                <div key={u.id} style={{ padding: '14px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#f37a23,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                    {u.name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name || 'Unknown'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{
                      background: u.role === 'admin' ? 'rgba(255, 89, 0, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: u.role === 'admin' ? 'var(--accent)' : '#34d399',
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700
                    }}>
                      {u.role === 'admin' ? t('userMgmt.roleAdmin').split(' ')[0] : t('userMgmt.roleUser').split(' ')[0]}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {u.company_type || 'B2B'}
                    </span>
                    <button
                      onClick={() => handleDeleteUser(u.id, u.email)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: '8px',
                        transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                      title={t('userMgmt.removeUser')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Team Records Panel ───────────────────────────────────────────────────────
function TeamRecordsPanel({ session, profile }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('leads') // 'leads' | 'deals' | 'tasks' | 'tickets' | 'contacts'
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  // Resolve the full list of team user IDs independently (same strategy as KPIPanel)
  const resolveTeamUserIds = async () => {
    // Start with the admin's own ID plus any already known from profile
    let ids = [...new Set([session.user.id, ...(profile?.teamUserIds || [])])]

    const companyName = profile?.company_name || session.user.user_metadata?.companyName || ''

    // Strategy 1: created_by_admin_id
    const { data: byAdminId } = await supabase
      .from('profiles').select('id').eq('created_by_admin_id', session.user.id)
    if (byAdminId && byAdminId.length > 0)
      byAdminId.forEach(t => { if (!ids.includes(t.id)) ids.push(t.id) })

    // Strategy 2: legacy created_by column
    const { data: byCreatedBy } = await supabase
      .from('profiles').select('id').eq('created_by', session.user.id)
    if (byCreatedBy && byCreatedBy.length > 0)
      byCreatedBy.forEach(t => { if (!ids.includes(t.id)) ids.push(t.id) })

    // Strategy 3: company_name match (catches users where trigger didn't set created_by fields)
    if (companyName) {
      const { data: byCompany } = await supabase
        .from('profiles').select('id')
        .ilike('company_name', `%${companyName}%`)
        .neq('id', session.user.id)
      if (byCompany && byCompany.length > 0)
        byCompany.forEach(t => { if (!ids.includes(t.id)) ids.push(t.id) })
    }

    // Strategy 4: localStorage users with real UUIDs
    const localKey = `xowiq_created_users_${session.user.id}`
    const localUsers = JSON.parse(localStorage.getItem(localKey) || '[]')
    localUsers.forEach(lu => {
      if (lu.id && !String(lu.id).startsWith('pending-') && !ids.includes(lu.id))
        ids.push(lu.id)
    })

    return ids
  }

  useEffect(() => {
    fetchRecords()
  }, [activeTab, profile])

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const userIds = await resolveTeamUserIds()
      let res;
      if (activeTab === 'leads') {
        res = await supabase.from('leads').select('*').in('user_id', userIds).order('created_at', { ascending: false })
      } else if (activeTab === 'contacts') {
        res = await supabase.from('contacts').select('*').in('user_id', userIds).order('created_at', { ascending: false })
      } else if (activeTab === 'deals') {
        res = await supabase.from('opportunities').select('*, accounts(account_name)').in('user_id', userIds).order('created_at', { ascending: false })
      } else if (activeTab === 'tasks') {
        res = await supabase.from('tasks').select('*').in('user_id', userIds).order('created_at', { ascending: false })
      } else if (activeTab === 'tickets') {
        res = await supabase.from('tickets').select('*').in('user_id', userIds).order('created_at', { ascending: false })
      }
      setRecords(res?.data || [])
    } catch (err) {
      toast.error(t('teamRecords.failedLoad'))
    } finally {
      setLoading(false)
    }
  }

  const handleOpenRecord = (recordId) => {
    let path = ''
    if (activeTab === 'leads') path = 'leads'
    else if (activeTab === 'contacts') path = 'contacts'
    else if (activeTab === 'deals') path = 'opportunities'
    else if (activeTab === 'tasks') path = 'tasks'
    else if (activeTab === 'tickets') path = 'tickets'
    navigate(`/dashboard/${path}`, { state: { openId: recordId } })
  }

  const filtered = records.filter(r => {
    const text = (r.name || r.title || r.subject || r.email || '').toLowerCase()
    return text.includes(search.toLowerCase())
  })

  const tabStyle = (active) => ({
    padding: '10px 20px',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    background: active ? 'linear-gradient(135deg, #f37a23, #ef4444)' : 'var(--bg-secondary)',
    color: active ? '#fff' : 'var(--text-secondary)',
    border: active ? 'none' : '1px solid var(--border-subtle)',
    transition: 'all 0.2s',
  })

  return (
    <div style={{ padding: '0 0 40px' }}>
      <div className="page-header" style={{ marginBottom: 28 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ClipboardList size={26} style={{ color: '#f37a23' }} /> {t('teamRecords.title')}
          </h1>
          <p className="page-subtitle">{t('teamRecords.subtitle')}</p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'leads', label: t('teamRecords.tabLeads') },
            { id: 'contacts', label: t('teamRecords.tabContacts') },
            { id: 'deals', label: t('teamRecords.tabDeals') },
            { id: 'tasks', label: t('teamRecords.tabTasks') },
            { id: 'tickets', label: t('teamRecords.tabTickets') }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearch('') }}
              style={tabStyle(activeTab === tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder={t('teamRecords.searchRecords')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36, paddingRight: 16, paddingTop: 9, paddingBottom: 9, width: 240, fontSize: 13 }}
          />
        </div>
      </div>

      {/* Records Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-container" style={{ minHeight: 250 }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 60 }}>
            <ClipboardList size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
            <p style={{ color: 'var(--text-muted)' }}>{t('teamRecords.noRecords')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)' }}>{t('teamRecords.colRecord')}</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)' }}>{t('teamRecords.colCreatedBy')}</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)' }}>{t('teamRecords.colDate')}</th>
                  <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)' }}>{t('teamRecords.colAction')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const title = r.name || r.title || r.subject || t('teamRecords.unnamed')
                  const subtitle = r.company || r.email || r.task_type || r.priority || ''
                  const createdDate = new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  const creatorEmail = r.owner || t('teamRecords.unassigned')

                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{title}</div>
                        {subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {creatorEmail}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 12, color: 'var(--text-muted)' }}>
                        {createdDate}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleOpenRecord(r.id)}
                          style={{
                            background: 'var(--accent-light)',
                            border: '1px solid rgba(255, 89, 0, 0.25)',
                            borderRadius: '6px',
                            color: 'var(--accent)',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '6px 14px',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)' }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                        >
                          {t('teamRecords.openDetails')}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Unified Dashboard Shell ───────────────────────────────────────────────────
export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const [profile, setProfile] = useState(null)
  
  // RBAC hook
  const { role, roleInfo, isAdmin, isManager, isSupport, isB2C, hasAccess, switchRole, canSwitchRole } = useRole()
  
  // default active section depends on role
  const [activeSection, setActiveSection] = useState(isAdmin ? 'kpi' : 'crm')
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false)
  const roleMenuRef = useRef(null)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('xowiq_sidebar_collapsed') === 'true'
  })

  const handleSetIsCollapsed = (val) => {
    setIsCollapsed(val)
    localStorage.setItem('xowiq_sidebar_collapsed', String(val))
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target)) {
        setIsRoleMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const { theme, toggleTheme, isDark } = useTheme()
  const companyType = session.user.user_metadata?.companyType || profile?.company_type || 'B2B'

  const fetchProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (data) {
      let ids = [session.user.id]

      // Strategy 0: a user created under an admin shares that admin's company.
      // Their team is the admin plus everyone else the admin created.
      const adminId = data.created_by_admin_id || data.created_by || session.user.user_metadata?.created_by_admin_id || null
      if (adminId && adminId !== session.user.id) {
        ids.push(adminId)
        const { data: teamOfAdmin } = await supabase
          .from('profiles')
          .select('id')
          .or(`created_by_admin_id.eq.${adminId},created_by.eq.${adminId}`)
        ;(teamOfAdmin || []).forEach(t => { if (!ids.includes(t.id)) ids.push(t.id) })
      }

      // Strategy 1: Query by created_by_admin_id
      const { data: teamByAdminId } = await supabase
        .from('profiles')
        .select('id')
        .eq('created_by_admin_id', session.user.id)

      if (teamByAdminId && teamByAdminId.length > 0) {
        teamByAdminId.forEach(t => { if (!ids.includes(t.id)) ids.push(t.id) })
      }

      // Strategy 2: Query by created_by (legacy column)
      const { data: teamByCreatedBy } = await supabase
        .from('profiles')
        .select('id')
        .eq('created_by', session.user.id)

      if (teamByCreatedBy && teamByCreatedBy.length > 0) {
        teamByCreatedBy.forEach(t => { if (!ids.includes(t.id)) ids.push(t.id) })
      }

      // Strategy 3: Fallback by company_name match
      const companyName = data.company_name || session.user.user_metadata?.companyName || ''
      if (companyName) {
        const { data: teamFallback } = await supabase
          .from('profiles')
          .select('id')
          .ilike('company_name', `%${companyName}%`)
          .neq('id', session.user.id)
        if (teamFallback && teamFallback.length > 0) {
          teamFallback.forEach(t => { if (!ids.includes(t.id)) ids.push(t.id) })
        }
      }

      // Strategy 4: Merge localStorage users
      const localKey = `xowiq_created_users_${session.user.id}`
      const localUsers = JSON.parse(localStorage.getItem(localKey) || '[]')
      localUsers.forEach(lu => {
        if (lu.id && !String(lu.id).startsWith('pending-') && !ids.includes(lu.id)) {
          ids.push(lu.id)
        }
      })

      setProfile({ ...data, teamUserIds: ids })
    }
  }

  useEffect(() => {
    fetchProfile()

    const channel = supabase.channel('admin-team-profile-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchProfile()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out. See you soon!')
    navigate('/')
  }

  return (
    <div className="app-layout">
      {/* ── Modern App Sidebar (All Roles & Collapsible) ── */}
      <AppSidebar
        session={session}
        profile={profile}
        role={role}
        roleInfo={roleInfo}
        switchRole={switchRole}
        hasAccess={hasAccess}
        isAdmin={isAdmin}
        canSwitchRole={canSwitchRole}
        isCollapsed={isCollapsed}
        setIsCollapsed={handleSetIsCollapsed}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        onLogout={handleLogout}
      />

      {/* ── Main Content Area ── */}
      <main
        className="main-content"
        style={{
          marginLeft: isCollapsed ? '76px' : '260px',
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          minHeight: '100vh',
          backgroundColor: isDark ? '#0f172a' : '#f8fafc',
          color: isDark ? '#f8fafc' : '#0f172a'
        }}
      >
        {/* Top bar */}
        <header className="dashboard-top-nav" style={{
          height: '70px',
          borderBottom: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          background: isDark ? '#111827' : '#ffffff',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          padding: '0 32px',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: isDark ? '#f8fafc' : '#0f172a' }}>
              {profile?.company_name || session.user.user_metadata?.companyName || 'XOWIQ CRM'}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Active Role Selector / Indicator */}
            <div style={{ position: 'relative' }} ref={roleMenuRef}>
              <button
                onClick={() => canSwitchRole && setIsRoleMenuOpen(!isRoleMenuOpen)}
                style={{
                  padding: '6px 14px',
                  background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#fff7ed',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1.5px solid #fed7aa',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  color: isDark ? '#f8fafc' : '#f37a23',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: canSwitchRole ? 'pointer' : 'default'
                }}
              >
                <span>{roleInfo?.badge || '👑 Super Admin'}</span>
                {canSwitchRole && <span style={{ fontSize: 10, color: isDark ? '#94a3b8' : '#64748b' }}>▼</span>}
              </button>

              {isRoleMenuOpen && canSwitchRole && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 8,
                    background: isDark ? '#1e293b' : '#ffffff',
                    border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid #e2e8f0',
                    borderRadius: 12,
                    padding: 8,
                    width: 220,
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
                    zIndex: 100
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 800, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', padding: '6px 10px' }}>
                    Switch Active Role:
                  </div>
                  {[
                    { key: 'admin', label: '👑 Super Admin' },
                    { key: 'manager', label: '💼 Sales Manager' },
                    { key: 'agent', label: '🎧 Support Agent' },
                    { key: 'b2c', label: '🛍️ B2C Store Owner' }
                  ].map(r => (
                    <button
                      key={r.key}
                      onClick={() => {
                        switchRole(r.key)
                        setIsRoleMenuOpen(false)
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        textAlign: 'left',
                        background: role === r.key ? (isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.1)') : 'transparent',
                        color: role === r.key ? '#818cf8' : (isDark ? '#cbd5e1' : '#334155'),
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: role === r.key ? 700 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      {r.label} {role === r.key && '✓'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        <div style={{ padding: '32px', minWidth: 0 }}>
          {/* Protected Sub-routes via RoleGuard */}
          <Routes>
            <Route index element={
              isAdmin && !isB2C 
                ? <KPIPanel session={session} profile={profile} />
                : <DashboardHome session={session} profile={profile} />
            } />

            {/* Admin-only paths */}
            <Route path="users" element={
              <RoleGuard moduleId="users">
                <UserManagementPanel session={session} profile={profile} onUserCreated={fetchProfile} />
              </RoleGuard>
            } />

            <Route path="team_records" element={
              <RoleGuard moduleId="team_records">
                <TeamRecordsPanel session={session} profile={profile} />
              </RoleGuard>
            } />

            {/* KPI Dashboard — explicit path for sidebar link (Super Admin only) */}
            <Route path="kpi" element={
              <RoleGuard moduleId="kpi">
                <KPIPanel session={session} profile={profile} />
              </RoleGuard>
            } />

            {/* Common & Protected CRM modules */}
            <Route path="crm" element={<DashboardHome session={session} profile={profile} />} />

            <Route path="leads" element={
              <RoleGuard moduleId="leads">
                <Leads session={session} profile={profile} />
              </RoleGuard>
            } />

            <Route path="contacts" element={
              <RoleGuard moduleId="contacts">
                <Contacts session={session} profile={profile} />
              </RoleGuard>
            } />

            <Route path="accounts" element={
              <RoleGuard moduleId="accounts">
                <Accounts session={session} profile={profile} />
              </RoleGuard>
            } />

            <Route path="services" element={
              <RoleGuard moduleId="services">
                <Services session={session} profile={profile} />
              </RoleGuard>
            } />

            <Route path="opportunities/*" element={
              <RoleGuard moduleId="deals">
                <Opportunities session={session} profile={profile} />
              </RoleGuard>
            } />

            <Route path="quotes" element={
              <RoleGuard moduleId="quotes">
                <Quotes session={session} profile={profile} />
              </RoleGuard>
            } />

            <Route path="invoices" element={
              <RoleGuard moduleId="invoices">
                <Invoices session={session} profile={profile} />
              </RoleGuard>
            } />

            <Route path="reports" element={
              <RoleGuard moduleId="reports">
                <Reports session={session} profile={profile} />
              </RoleGuard>
            } />

            <Route path="tickets" element={
              <RoleGuard moduleId="tickets">
                <Tickets session={session} profile={profile} />
              </RoleGuard>
            } />

            <Route path="tasks" element={
              <RoleGuard moduleId="tasks">
                <Tasks session={session} profile={profile} />
              </RoleGuard>
            } />

            <Route path="settings" element={
              <RoleGuard moduleId="settings">
                <SettingsPage session={session} profile={profile} />
              </RoleGuard>
            } />
          </Routes>
        </div>
      </main>
    </div>
  )
}
