import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import DashboardHome from '../components/modules/DashboardHome'
import Leads from '../components/modules/Leads'
import Contacts from '../components/modules/Contacts'
import Accounts from '../components/modules/Accounts'
import Opportunities from '../components/modules/Opportunities'
import Quotes from '../components/modules/Quotes'
import Reports from '../components/modules/Reports'
import Tickets from '../components/modules/Tickets'
import Tasks from '../components/modules/Tasks'
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
  Search
} from 'lucide-react'
import GlobalSearch from '../components/ui/GlobalSearch'
import ProfileModal from '../components/ui/ProfileModal'

const navItems = [
  { path: '', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { path: 'leads', label: 'Leads', icon: <UserSquare2 size={18} /> },
  { path: 'contacts', label: 'Contacts', icon: <Users size={18} /> },
  { path: 'accounts', label: 'Accounts', icon: <Building2 size={18} /> },
  { path: 'opportunities', label: 'Opportunities', icon: <Briefcase size={18} /> },
  { path: 'quotes', label: 'Quotes', icon: <Quote size={18} /> },
  { path: 'reports', label: 'Reports', icon: <BarChart3 size={18} /> },
  { path: 'tickets', label: 'Tickets', icon: <Ticket size={18} /> },
  { path: 'tasks', label: 'Tasks', icon: <Search size={18} /> },
]

export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [profile, setProfile] = useState(null)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      if (data) setProfile(data)
    }
    fetchProfile()
  }, [session])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('See you soon!')
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

        <div className="sidebar-section-label">Main Menu</div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.path}
              className={`nav-item ${currentPath === item.path ? 'active' : ''}`}
              onClick={() => navigate(`/dashboard${item.path ? '/' + item.path : ''}`)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
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
            Sign Out
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
          zIndex: 40
        }}>
          <div style={{ maxWidth: '600px', width: '100%' }}>
            <GlobalSearch session={session} />
          </div>
        </header>
        
        <div style={{ padding: '32px' }}>
          <Routes>
          <Route index element={<DashboardHome session={session} profile={profile} />} />
          <Route path="leads" element={<Leads session={session} profile={profile} />} />
          <Route path="contacts" element={<Contacts session={session} profile={profile} />} />
          <Route path="accounts" element={<Accounts session={session} profile={profile} />} />
          <Route path="opportunities/*" element={<Opportunities session={session} profile={profile} />} />
          <Route path="quotes" element={<Quotes session={session} profile={profile} />} />
          <Route path="reports" element={<Reports session={session} profile={profile} />} />
          <Route path="tickets" element={<Tickets session={session} profile={profile} />} />
          <Route path="tasks" element={<Tasks session={session} profile={profile} />} />
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
