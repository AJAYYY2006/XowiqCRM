import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import DashboardHome from '../components/modules/DashboardHome'
import Leads from '../components/modules/Leads'
import Contacts from '../components/modules/Contacts'
import Accounts from '../components/modules/Accounts'
import Opportunities from '../components/modules/Opportunities'
import Quotes from '../components/modules/Quotes'
import Invoices from '../components/modules/Invoices' // Added for B2C Invoices
import Reports from '../components/modules/Reports'
import Tickets from '../components/modules/Tickets'
import Tasks from '../components/modules/Tasks'
import SettingsPage from '../components/modules/Settings'
import Services from '../components/modules/Services'
import { 
  LayoutDashboard, 
  Users, 
  UserSquare2, 
  Building2, 
  Briefcase, 
  Quote, 
  BarChart3, 
  Ticket,
  LogOut,
  Search,
  ArrowLeft,
  Package,
  Settings
} from 'lucide-react'
import GlobalSearch from '../components/ui/GlobalSearch'
import ProfileModal from '../components/ui/ProfileModal'
import LanguageSwitcher from '../components/ui/LanguageSwitcher'

export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const [profile, setProfile] = useState(null)
  const [showProfile, setShowProfile] = useState(false)
  const [taskCount, setTaskCount] = useState(0)

  const companyType = session.user.user_metadata?.companyType || 'B2B'
  const isB2C = companyType === 'B2C'

  const b2cNavItems = [
    { path: '', label: t('sidebar.dashboard'), icon: <LayoutDashboard size={18} /> },
    { path: 'accounts', label: t('sidebar.customerProfiles'), icon: <Users size={18} /> },
    { path: 'services', label: 'Services', icon: <Package size={18} /> },
    { path: 'leads', label: t('sidebar.leads'), icon: <UserSquare2 size={18} /> },
    { path: 'opportunities', label: 'Opportunities', icon: <Briefcase size={18} /> },
    { path: 'invoices', label: 'Invoices', icon: <Quote size={18} /> },
    { path: 'tasks', label: 'Tasks', icon: <Search size={18} /> },
    { path: 'tickets', label: t('sidebar.tickets'), icon: <Ticket size={18} /> },
    { path: 'reports', label: t('sidebar.reports'), icon: <BarChart3 size={18} /> },
    { path: 'settings', label: 'Settings', icon: <Settings size={18} /> }
  ]

  const b2bNavItems = [
    { path: '', label: t('sidebar.dashboard'), icon: <LayoutDashboard size={18} /> },
    { path: 'leads', label: t('sidebar.leads'), icon: <UserSquare2 size={18} /> },
    { path: 'contacts', label: t('sidebar.contacts'), icon: <Users size={18} /> },
    { path: 'accounts', label: t('sidebar.accounts'), icon: <Building2 size={18} /> },
    { path: 'opportunities', label: t('sidebar.opportunities'), icon: <Briefcase size={18} /> },
    { path: 'quotes', label: 'Quotes & Proposals', icon: <Quote size={18} /> },
    { path: 'reports', label: t('sidebar.reports'), icon: <BarChart3 size={18} /> },
    { path: 'tickets', label: t('sidebar.tickets'), icon: <Ticket size={18} /> },
    { path: 'tasks', label: t('sidebar.tasks'), icon: <Search size={18} /> },
    { path: 'settings', label: 'Settings', icon: <Settings size={18} /> }
  ]

  const navItems = isB2C ? b2cNavItems : b2bNavItems

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      if (data) setProfile(data)
    }
    if (session) {
      fetchProfile()
      fetchTaskCount()
      // Real-time task count update
      const channel = supabase.channel('tasks-count-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
          fetchTaskCount()
        })
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
  }, [session])

  const fetchTaskCount = async () => {
    const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'Completed').eq('user_id', session.user.id)
    setTaskCount(count || 0)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success(t('sidebar.seeYouSoon'))
    navigate('/')
  }

  const currentPath = location.pathname.replace('/dashboard', '').replace(/^\//, '')

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: 0, fontWeight: 900, fontFamily: '"Fredoka", sans-serif', fontSize: '22px', letterSpacing: '-0.5px' }}>
          <div style={{ backgroundColor: '#f37a23', color: '#ffffff', padding: '3px 5px', lineHeight: 1 }}>
            XOWIQ
          </div>
          <div style={{ color: '#000000', padding: '3px 5px', lineHeight: 1 }}>
            CRM
          </div>
        </div>

        <div className="sidebar-section-label">{t('sidebar.mainMenu')}</div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.path}
              className={`nav-item ${currentPath === item.path ? 'active' : ''}`}
              onClick={() => navigate(`/dashboard${item.path ? '/' + item.path : ''}`)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </div>
              {item.path === 'tasks' && taskCount > 0 && (
                <span style={{ background: '#f37a23', color: '#fff', fontSize: '10px', fontWeight: 900, padding: '2px 6px', borderRadius: '10px', minWidth: '18px', textAlign: 'center' }}>
                  {taskCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            onClick={() => setShowProfile(true)}
            style={{
              width: '100%', padding: '12px',
              background: 'var(--bg-card)', border: '1.5px solid transparent',
              borderRadius: 'var(--radius-md)', marginBottom: 8,
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = '#fff5f0' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'var(--bg-card)' }}
            title="Click to view profile"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--accent-gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 15, flexShrink: 0, color: '#fff'
              }}>
                {profile?.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.name || 'User'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {session.user.email}
                </div>
              </div>
            </div>
          </button>
          <button className="nav-item" onClick={handleLogout} style={{ color: 'var(--danger)', width: '100%', gap: 10 }}>
            <LogOut size={18} />
            {t('sidebar.signOut')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="dashboard-top-nav" style={{ 
          height: '76px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FFFBDC',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          padding: '0 24px',
        }}>
          <button 
            className="back-btn-global" 
            onClick={() => navigate(-1)}
            title="Go Back"
            style={{
              position: 'absolute',
              left: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: '1px solid var(--border-subtle)',
              background: '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s',
              color: 'var(--text-secondary)'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <ArrowLeft size={18} />
          </button>
          
          <div style={{ position: 'absolute', left: 80, display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {session.user.user_metadata?.companyName || 'My Company'}
            </h2>
            <span style={{ 
              fontSize: 11, fontWeight: 700, padding: '3px 8px', 
              borderRadius: 12, background: isB2C ? '#3b82f6' : '#f37a23', color: '#fff',
              letterSpacing: '0.5px'
            }}>
              {isB2C ? 'B2C MODE' : 'B2B MODE'}
            </span>
          </div>

          <div style={{ maxWidth: '400px', width: '100%', marginLeft: '180px' }}>
            <GlobalSearch session={session} />
          </div>
          <div style={{ position: 'absolute', right: 24 }}>
            <LanguageSwitcher />
          </div>
        </header>
        
        <div style={{ padding: '32px' }}>
          <Routes>
          <Route index element={<DashboardHome session={session} profile={profile} />} />
          <Route path="leads" element={<Leads session={session} profile={profile} />} />
          <Route path="contacts" element={<Contacts session={session} profile={profile} />} />
          <Route path="accounts" element={<Accounts session={session} profile={profile} />} />
          <Route path="services" element={<Services session={session} profile={profile} />} />
          <Route path="opportunities/*" element={<Opportunities session={session} profile={profile} />} />
          <Route path="quotes" element={<Quotes session={session} profile={profile} />} />
          <Route path="invoices" element={<Invoices session={session} profile={profile} />} />
          <Route path="reports" element={<Reports session={session} profile={profile} />} />
          <Route path="tickets" element={<Tickets session={session} profile={profile} />} />
          <Route path="tasks" element={<Tasks session={session} profile={profile} />} />
          <Route path="settings" element={<SettingsPage session={session} profile={profile} />} />
          </Routes>
        </div>
      </main>

      {showProfile && (
        <ProfileModal
          session={session}
          profile={profile}
          onClose={() => setShowProfile(false)}
          onProfileUpdate={(updated) => setProfile(updated)}
        />
      )}
    </div>
  )
}
