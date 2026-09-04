import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Users, LogOut, UserPlus, BarChart3,
  TrendingUp, CheckCircle, Ticket, Target, Activity,
  Shield, ChevronRight, Search, RefreshCw, Eye, EyeOff,
  Package, UserSquare2, Building2, Briefcase, Quote, Settings, Trash2, ClipboardList
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
import { useRole } from '../contexts/RoleContext'
import RoleGuard from '../components/auth/RoleGuard'
import { ROLE_DEFINITIONS } from '../config/roles'

// ─── KPI Panel ───────────────────────────────────────────────────────────────
function KPIPanel({ session, profile }) {
  const { t } = useTranslation()
  const [users, setUsers] = useState([])
  const [kpiData, setKpiData] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const companyName = profile?.company_name || session.user.user_metadata?.companyName || ''
  const companyType = profile?.company_type || session.user.user_metadata?.companyType || 'B2B'

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

      const kpiMap = {}
      await Promise.all(teamUsers.map(async (u) => {
        const [leadsRes, customersRes, dealsRes, tasksRes, ticketsRes, activitiesRes, activityCountRes] = await Promise.all([
          supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', u.id),
          supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', u.id).eq('status', 'converted'),
          supabase.from('opportunities').select('amount').eq('user_id', u.id).eq('stage', 'closed'),
          supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', u.id).eq('status', 'Completed'),
          supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('user_id', u.id).eq('status', 'resolved'),
          supabase.from('activities').select('created_at').eq('user_id', u.id).order('created_at', { ascending: false }).limit(1),
          supabase.from('activities').select('id', { count: 'exact', head: true }).eq('user_id', u.id),
        ])

        const deals = dealsRes.data || []
        const dealsCount = deals.length
        const dealsValue = deals.reduce((sum, d) => sum + Number(d.amount || 0), 0)

        kpiMap[u.id] = {
          leads: leadsRes.count || 0,
          customers: customersRes.count || 0,
          dealsCount: dealsCount,
          dealsValue: dealsValue,
          tasks: tasksRes.count || 0,
          tickets: ticketsRes.count || 0,
          lastActive: activitiesRes.data?.[0]?.created_at || null,
          activityFrequency: activityCountRes.count || 0,
        }
      }))
      setKpiData(kpiMap)
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
    const tables = ['leads', 'opportunities', 'tasks', 'tickets', 'activities']
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
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart3 size={26} style={{ color: '#f37a23' }} /> {t('kpi.title')}
          </h1>
          <p className="page-subtitle">{t('kpi.subtitle')}</p>
        </div>
        <button
          onClick={fetchKPIs}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
        >
          <RefreshCw size={14} /> {t('kpi.refresh')}
        </button>
      </div>

      {/* Aggregate Stats */}
      <div className="dashboard-grid" style={{ marginBottom: 28 }}>
        {[
          { label: t('kpi.totalLeads'), value: totals.leads, icon: <UserSquare2 size={20} />, color: '#3b82f6' },
          { label: t('kpi.customers'), value: totals.customers, icon: <Users size={20} />, color: '#ec4899' },
          { label: t('kpi.dealsWonCount'), value: totals.dealsCount, icon: <Target size={20} />, color: '#10b981' },
          { label: t('kpi.dealsWonValue'), value: `${profile?.currency || '$'}${totals.dealsValue.toLocaleString()}`, icon: <Briefcase size={20} />, color: '#84cc16' },
          { label: t('kpi.tasksCompleted'), value: totals.tasks, icon: <CheckCircle size={20} />, color: '#8b5cf6' },
          { label: t('kpi.ticketsResolved'), value: totals.tickets, icon: <Ticket size={20} />, color: '#f59e0b' },
          { label: t('kpi.activeMembers'), value: users.length, icon: <Shield size={20} />, color: '#f37a23' },
        ].map((s, i) => (
          <div key={i} className="stat-card" style={{ border: `2px solid ${s.color}18` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ color: s.color }}>{s.icon}</div>
              <div className="stat-label" style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>{s.label}</div>
            </div>
            <div className="stat-value" style={{ color: s.color, fontSize: 28 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Per-user table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            <Activity size={16} style={{ display: 'inline', marginRight: 6, color: '#f37a23' }} />
            {t('kpi.userBreakdown')}
          </h3>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder={t('kpi.searchUsers')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', width: 200 }}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <Users size={36} style={{ color: '#cbd5e1', marginBottom: 12 }} />
            <p>{t('kpi.noUsers')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {[
                    t('kpi.colUser'),
                    t('kpi.colRole'),
                    t('kpi.colLeads'),
                    t('kpi.colCustomers'),
                    t('kpi.colDealsWon'),
                    t('kpi.colDealsValue'),
                    t('kpi.colTasksDone'),
                    t('kpi.colTickets'),
                    t('kpi.colLastActive')
                  ].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => {
                  const kpi = kpiData[u.id] || {}
                  const lastActive = kpi.lastActive
                    ? new Date(kpi.lastActive).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : t('kpi.noActivity')
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#f37a23,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                            {u.name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{u.name || t('kpi.unknown')}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                          {u.role || 'user'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#3b82f6', fontSize: 15 }}>{kpi.leads ?? '—'}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#ec4899', fontSize: 15 }}>{kpi.customers ?? '—'}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#10b981', fontSize: 15 }}>{kpi.dealsCount ?? '—'}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#84cc16', fontSize: 15 }}>{profile?.currency || '$'}{(kpi.dealsValue || 0).toLocaleString()}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#8b5cf6', fontSize: 15 }}>{kpi.tasks ?? '—'}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#f59e0b', fontSize: 15 }}>{kpi.tickets ?? '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748b' }}>{lastActive}</td>
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

// ─── User Management Panel ────────────────────────────────────────────────────
function UserManagementPanel({ session, profile, onUserCreated }) {
  const { t } = useTranslation()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [inlineError, setInlineError] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', password: '', companyType: profile?.company_type || session.user.user_metadata?.companyType || 'B2B', role: 'user'
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
    const inputEmail = form.email.trim().toLowerCase()

    if (!form.name.trim() || !inputEmail || !form.password.trim()) {
      toast.error(t('userMgmt.nameEmailPasswordRequired'))
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
            role: form.role,
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
          role: form.role,
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

      setForm({ name: '', email: '', password: '', companyType: form.companyType, role: 'user' })
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
                <option value="user">{t('userMgmt.roleUser')}</option>
                <option value="admin">{t('userMgmt.roleAdmin')}</option>
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
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              {t('userMgmt.teamMembers')}
              <span style={{ marginLeft: 8, background: '#f37a23', color: '#fff', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 12 }}>{users.length}</span>
            </h3>
            <button onClick={fetchUsers} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
              <RefreshCw size={15} />
            </button>
          </div>
          {loading ? (
            <div className="loading-container" style={{ minHeight: 200 }}><div className="spinner" /></div>
          ) : users.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <Users size={32} style={{ color: '#cbd5e1', marginBottom: 10 }} />
              <p>{t('userMgmt.noUsers')}</p>
            </div>
          ) : (
            <div>
              {users.map(u => (
                <div key={u.id} style={{ padding: '14px 24px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#f37a23,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                    {u.name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name || 'Unknown'}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{
                      background: u.role === 'admin' ? '#fff7ed' : '#f0fdf4',
                      color: u.role === 'admin' ? '#ea580c' : '#16a34a',
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700
                    }}>
                      {u.role === 'admin' ? t('userMgmt.roleAdmin').split(' ')[0] : t('userMgmt.roleUser').split(' ')[0]}
                    </span>
                    <span style={{ fontSize: 11, color: '#cbd5e1' }}>
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
    navigate(`/admin/crm/${path}`, { state: { openId: recordId } })
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
    background: active ? 'linear-gradient(135deg,#f37a23,#ef4444)' : '#f8fafc',
    color: active ? '#fff' : '#64748b',
    border: 'none',
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
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder={t('teamRecords.searchRecords')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36, paddingRight: 16, paddingTop: 9, paddingBottom: 9, border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', width: 240 }}
          />
        </div>
      </div>

      {/* Records Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-container" style={{ minHeight: 250 }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 60 }}>
            <ClipboardList size={40} style={{ color: '#cbd5e1', marginBottom: 12 }} />
            <p style={{ color: '#64748b' }}>{t('teamRecords.noRecords')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{t('teamRecords.colRecord')}</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{t('teamRecords.colCreatedBy')}</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{t('teamRecords.colDate')}</th>
                  <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{t('teamRecords.colAction')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const title = r.name || r.title || r.subject || t('teamRecords.unnamed')
                  const subtitle = r.company || r.email || r.task_type || r.priority || ''
                  const createdDate = new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  const creatorEmail = r.owner || t('teamRecords.unassigned')

                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{title}</div>
                        {subtitle && <div style={{ fontSize: 11, color: '#94a3b8' }}>{subtitle}</div>}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: '#475569', fontWeight: 500 }}>
                        {creatorEmail}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 12, color: '#64748b' }}>
                        {createdDate}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleOpenRecord(r.id)}
                          style={{
                            background: 'linear-gradient(135deg,#fff7ed,#fed7aa)',
                            border: '1px solid #fed7aa',
                            borderRadius: '6px',
                            color: '#ea580c',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '6px 12px',
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
  const { role, roleInfo, isAdmin, isManager, isSupport, isB2C, hasAccess, switchRole } = useRole()
  
  // default active section depends on role
  const [activeSection, setActiveSection] = useState(isAdmin ? 'kpi' : 'crm')
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false)

  const companyType = session.user.user_metadata?.companyType || profile?.company_type || 'B2B'

  const fetchProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (data) {
      let ids = [session.user.id]

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

  // Master CRM Navigation definition
  const rawNavItems = isB2C ? [
    { id: 'dashboard', path: '', label: t('sidebar.dashboard'), icon: <LayoutDashboard size={16} /> },
    { id: 'accounts', path: 'accounts', label: t('sidebar.customerProfiles'), icon: <Users size={16} /> },
    { id: 'services', path: 'services', label: t('sidebar.services'), icon: <Package size={16} /> },
    { id: 'leads', path: 'leads', label: t('sidebar.leads'), icon: <UserSquare2 size={16} /> },
    { id: 'deals', path: 'opportunities', label: t('sidebar.opportunities'), icon: <Briefcase size={16} /> },
    { id: 'invoices', path: 'invoices', label: t('sidebar.invoices'), icon: <Quote size={16} /> },
    { id: 'tasks', path: 'tasks', label: t('sidebar.tasks'), icon: <Search size={16} /> },
    { id: 'tickets', path: 'tickets', label: t('sidebar.tickets'), icon: <Ticket size={16} /> },
    { id: 'reports', path: 'reports', label: t('sidebar.reports'), icon: <BarChart3 size={16} /> },
    { id: 'settings', path: 'settings', label: t('sidebar.settings'), icon: <Settings size={16} /> },
  ] : [
    { id: 'dashboard', path: '', label: t('sidebar.dashboard'), icon: <LayoutDashboard size={16} /> },
    { id: 'leads', path: 'leads', label: t('sidebar.leads'), icon: <UserSquare2 size={16} /> },
    { id: 'contacts', path: 'contacts', label: t('sidebar.contacts'), icon: <Users size={16} /> },
    { id: 'accounts', path: 'accounts', label: t('sidebar.accounts'), icon: <Building2 size={16} /> },
    { id: 'deals', path: 'opportunities', label: t('sidebar.opportunities'), icon: <Briefcase size={16} /> },
    { id: 'quotes', path: 'quotes', label: t('sidebar.quotesAndProposals'), icon: <Quote size={16} /> },
    { id: 'invoices', path: 'invoices', label: t('sidebar.invoices', 'Invoices'), icon: <Quote size={16} /> },
    { id: 'services', path: 'services', label: t('sidebar.services', 'Services'), icon: <Package size={16} /> },
    { id: 'reports', path: 'reports', label: t('sidebar.reports'), icon: <BarChart3 size={16} /> },
    { id: 'tickets', path: 'tickets', label: t('sidebar.tickets'), icon: <Ticket size={16} /> },
    { id: 'tasks', path: 'tasks', label: t('sidebar.tasks'), icon: <Search size={16} /> },
    { id: 'settings', path: 'settings', label: t('sidebar.settings'), icon: <Settings size={16} /> },
  ]

  // Filter navigation items by active user role permissions
  const crmNavItems = rawNavItems.filter(item => hasAccess(item.id))
  const currentCrmPath = location.pathname.replace('/dashboard', '').replace(/^\//, '')

  return (
    <div className="app-layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar" style={{ overflowY: 'auto' }}>
        {/* Logo */}
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: 0, fontWeight: 900, fontFamily: '"Fredoka", sans-serif', fontSize: '22px', letterSpacing: '-0.5px' }}>
          <div style={{ backgroundColor: '#f37a23', color: '#ffffff', padding: '3px 5px', lineHeight: 1, borderRadius: '4px 0 0 4px' }}>XOWIQ</div>
          <div style={{ color: '#ffffff', backgroundColor: '#1e293b', padding: '3px 5px', lineHeight: 1, borderRadius: '0 4px 4px 0' }}>CRM</div>
        </div>
        
        {/* Role & Mode Badge */}
        <div style={{ margin: '6px 0 16px', padding: '8px 12px', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={14} style={{ color: roleInfo.color }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: roleInfo.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {roleInfo.label}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8' }}>{companyType} Mode</div>
            </div>
          </div>
          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 6, background: 'rgba(255, 255, 255, 0.08)', color: '#cbd5e1', fontWeight: 700 }}>
            {role.toUpperCase()}
          </span>
        </div>

        {/* Admin-only sections */}
        {isAdmin && (
          <>
            <div className="sidebar-section-label">{t('dashboard.adminTools')}</div>
            <nav className="sidebar-nav">
              <button
                className={`nav-item ${activeSection === 'kpi' && !location.pathname.includes('/dashboard/') ? 'active' : ''}`}
                onClick={() => { setActiveSection('kpi'); navigate('/dashboard') }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}
              >
                <span className="nav-icon"><BarChart3 size={18} /></span> {t('dashboard.kpiDashboard')}
              </button>
              <button
                className={`nav-item ${activeSection === 'users' ? 'active' : ''}`}
                onClick={() => { setActiveSection('users'); navigate('/dashboard/users') }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}
              >
                <span className="nav-icon"><Users size={18} /></span> {t('dashboard.userManagement')}
              </button>
              <button
                className={`nav-item ${activeSection === 'team_records' ? 'active' : ''}`}
                onClick={() => { setActiveSection('team_records'); navigate('/dashboard/team_records') }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}
              >
                <span className="nav-icon"><ClipboardList size={18} /></span> {t('dashboard.teamRecords')}
              </button>
            </nav>
          </>
        )}

        {/* CRM Section */}
        <div className="sidebar-section-label" style={{ marginTop: 12 }}>
          {isAdmin ? t('dashboard.myCrm') : t('sidebar.mainMenu')}
          {isAdmin && <ChevronRight size={12} style={{ display: 'inline', marginLeft: 4 }} />}
        </div>
        <nav className="sidebar-nav">
          {crmNavItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${(!isAdmin || location.pathname.match(/\/dashboard\/.+/)) && currentCrmPath === item.path ? 'active' : ''}`}
              onClick={() => {
                setActiveSection('crm')
                navigate(`/dashboard${item.path ? '/' + item.path : ''}`)
              }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', fontSize: 13 }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div style={{ padding: '12px', background: 'var(--bg-card)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-md)', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: '#fff', flexShrink: 0 }}>
                {profile?.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.name || 'User'}
                </div>
                <div style={{ fontSize: 10, color: roleInfo.color, fontWeight: 700 }}>● {roleInfo.label}</div>
              </div>
            </div>
          </div>
          <button className="nav-item" onClick={handleLogout} style={{ color: 'var(--danger)', width: '100%', gap: 10 }}>
            <LogOut size={18} /> {t('dashboard.signOut')}
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="main-content">
        {/* Top bar */}
        <header className="dashboard-top-nav" style={{
          height: '76px', borderBottom: '1px solid var(--border-subtle)', display: 'flex',
          alignItems: 'center', background: '#FFFBDC', position: 'sticky', top: 0, zIndex: 40, padding: '0 32px',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {profile?.company_name || session.user.user_metadata?.companyName || 'XOWIQ CRM'}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Active Role Selector / Indicator */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
                style={{
                  padding: '6px 14px',
                  background: 'rgba(255, 255, 255, 0.85)',
                  border: '1.5px solid #fed7aa',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#f37a23',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer'
                }}
              >
                <span>{roleInfo.badge}</span>
                <span style={{ fontSize: 10, color: '#64748b' }}>▼</span>
              </button>

              {isRoleMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 8,
                    background: '#0f172a',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 12,
                    padding: 8,
                    width: 220,
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.7)',
                    zIndex: 100
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', padding: '6px 10px' }}>
                    Switch Active Role:
                  </div>
                  {[
                    { key: 'admin', label: '👑 Super Admin' },
                    { key: 'manager', label: '💼 Sales Manager' },
                    { key: 'agent', label: '🎧 Support Agent' },
                    { key: 'b2c', label: '🛍️ B2C Store Owner' },
                    { key: 'user', label: '👁️ Staff / Viewer' }
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
                        background: role === r.key ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                        color: role === r.key ? '#818cf8' : '#cbd5e1',
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

            <div style={{ padding: '4px 12px', background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 20, fontSize: 12, fontWeight: 700, color: '#f37a23' }}>
              {companyType} Mode
            </div>
          </div>
        </header>

        <div style={{ padding: '32px' }}>
          {/* Protected Sub-routes via RoleGuard */}
          <Routes>
            <Route index element={
              isAdmin 
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
