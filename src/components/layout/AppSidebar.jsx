import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutGrid, Users, LogOut, UserSquare2, BarChart3,
  TrendingUp, Ticket, Briefcase, Quote, Settings,
  ClipboardList, Package, Building2, Search,
  ChevronLeft, ChevronRight, MoreVertical, Shield,
  CheckSquare, FileText, Receipt, Layers, Check
} from 'lucide-react'
import { ROLE_DEFINITIONS } from '../../config/roles'

export default function AppSidebar({
  session,
  profile,
  role,
  roleInfo,
  switchRole,
  hasAccess,
  isAdmin,
  isCollapsed,
  setIsCollapsed,
  activeSection,
  setActiveSection,
  onLogout
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const [searchTerm, setSearchTerm] = useState('')
  const [hoveredId, setHoveredId] = useState(null)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef(null)

  const isB2C = role === 'b2c'
  const companyType = session?.user?.user_metadata?.companyType || profile?.company_type || (isB2C ? 'B2C' : 'B2B')
  const currentPath = location.pathname.replace('/dashboard', '').replace(/^\//, '')

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Navigation Items Configured by Role & Section
  const getSections = () => {
    // Top Dashboard Section
    const dashboardItems = []

    if (isAdmin) {
      dashboardItems.push({
        id: 'overview',
        path: '',
        label: t('sidebar.overview', 'Overview'),
        icon: <LayoutGrid size={18} strokeWidth={1.75} />,
        section: 'kpi',
        badge: null
      })
      dashboardItems.push({
        id: 'kpis',
        path: 'kpi',
        label: t('dashboard.kpiDashboard', 'Analytics'),
        icon: <BarChart3 size={18} strokeWidth={1.75} />,
        section: 'kpi',
        badge: null
      })
      dashboardItems.push({
        id: 'users',
        path: 'users',
        label: t('dashboard.userManagement', 'Team Users'),
        icon: <Users size={18} strokeWidth={1.75} />,
        section: 'users',
        badge: null
      })
      dashboardItems.push({
        id: 'team_records',
        path: 'team_records',
        label: t('dashboard.teamRecords', 'Team Stream'),
        icon: <ClipboardList size={18} strokeWidth={1.75} />,
        section: 'team_records',
        badge: null
      })
    } else {
      dashboardItems.push({
        id: 'dashboard',
        path: '',
        label: t('sidebar.overview', 'Overview'),
        icon: <LayoutGrid size={18} strokeWidth={1.75} />,
        section: 'crm',
        badge: null
      })
      if (hasAccess('reports')) {
        dashboardItems.push({
          id: 'reports',
          path: 'reports',
          label: t('sidebar.analytics', 'Analytics'),
          icon: <BarChart3 size={18} strokeWidth={1.75} />,
          section: 'crm',
          badge: null
        })
      }
    }

    // CRM / Editor Section Items
    const crmItems = isB2C ? [
      { id: 'accounts', path: 'accounts', label: t('sidebar.customers', 'Customers'), icon: <Users size={18} strokeWidth={1.75} />, badge: null },
      { id: 'deals', path: 'opportunities', label: t('sidebar.orders', 'Orders'), icon: <Briefcase size={18} strokeWidth={1.75} />, badge: '42' },
      { id: 'leads', path: 'leads', label: t('sidebar.marketing', 'Marketing'), icon: <UserSquare2 size={18} strokeWidth={1.75} />, badge: null },
      { id: 'services', path: 'services', label: t('sidebar.services', 'Services'), icon: <Package size={18} strokeWidth={1.75} />, badge: null },
      { id: 'invoices', path: 'invoices', label: t('sidebar.invoices', 'Invoices'), icon: <Receipt size={18} strokeWidth={1.75} />, badge: null },
      { id: 'tickets', path: 'tickets', label: t('sidebar.inbox', 'Inbox'), icon: <Ticket size={18} strokeWidth={1.75} />, badge: '2' },
      { id: 'tasks', path: 'tasks', label: t('sidebar.tasks', 'Tasks'), icon: <CheckSquare size={18} strokeWidth={1.75} />, badge: null },
    ] : [
      { id: 'leads', path: 'leads', label: t('sidebar.leads', 'Leads'), icon: <UserSquare2 size={18} strokeWidth={1.75} />, badge: null },
      { id: 'contacts', path: 'contacts', label: t('sidebar.contacts', 'Contacts'), icon: <Users size={18} strokeWidth={1.75} />, badge: null },
      { id: 'accounts', path: 'accounts', label: t('sidebar.customers', 'Customers'), icon: <Building2 size={18} strokeWidth={1.75} />, badge: null },
      { id: 'deals', path: 'opportunities', label: t('sidebar.deals', 'Orders & Deals'), icon: <Briefcase size={18} strokeWidth={1.75} />, badge: '42' },
      { id: 'quotes', path: 'quotes', label: t('sidebar.quotes', 'Quotes'), icon: <FileText size={18} strokeWidth={1.75} />, badge: null },
      { id: 'invoices', path: 'invoices', label: t('sidebar.invoices', 'Invoices'), icon: <Receipt size={18} strokeWidth={1.75} />, badge: null },
      { id: 'services', path: 'services', label: t('sidebar.services', 'Services'), icon: <Package size={18} strokeWidth={1.75} />, badge: null },
      { id: 'tickets', path: 'tickets', label: t('sidebar.inbox', 'Inbox'), icon: <Ticket size={18} strokeWidth={1.75} />, badge: '2' },
      { id: 'tasks', path: 'tasks', label: t('sidebar.tasks', 'Tasks'), icon: <CheckSquare size={18} strokeWidth={1.75} />, badge: null },
    ]

    // Filter by user role permissions
    const filteredCrmItems = crmItems.filter(item => hasAccess(item.id))

    return [
      { title: 'DASHBOARD', items: dashboardItems },
      { title: isB2C ? 'STORE & CRM' : 'CRM & OPERATIONS', items: filteredCrmItems }
    ]
  }

  const sections = getSections()

  // Filter items if user is typing in search
  const isItemVisible = (item) => {
    if (!searchTerm) return true
    return item.label.toLowerCase().includes(searchTerm.toLowerCase())
  }

  const handleNavigate = (item) => {
    if (item.section) {
      setActiveSection(item.section)
    } else {
      setActiveSection('crm')
    }

    if (item.path === '') {
      navigate('/dashboard')
    } else {
      navigate(`/dashboard/${item.path}`)
    }
  }

  const isItemActive = (item) => {
    if (isAdmin) {
      if (item.id === 'overview' && !currentPath && activeSection === 'kpi') return true
      if (item.id === 'kpis' && currentPath === 'kpi') return true
      if (item.id === 'users' && currentPath === 'users') return true
      if (item.id === 'team_records' && currentPath === 'team_records') return true
      return currentPath === item.path
    }
    return (!currentPath && item.path === '') || (currentPath === item.path)
  }

  const userName = profile?.name || session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'Alex Rivera'
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-50 flex flex-col transition-all duration-300 select-none ${
        isCollapsed ? 'w-[76px]' : 'w-[260px]'
      }`}
      style={{
        backgroundColor: '#1e1e22',
        color: '#e4e4e7',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)'
      }}
    >
      {/* ── Top Traffic Dots (Mac style) ── */}
      <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] inline-block opacity-90 hover:opacity-100 transition-opacity" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] inline-block opacity-90 hover:opacity-100 transition-opacity" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] inline-block opacity-90 hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* ── Header: Logo & Brand + Collapse/Expand Button ── */}
      <div className="flex items-center justify-between px-3.5 py-2">
        <div
          className="flex items-center gap-2.5 min-w-0 cursor-pointer"
          onClick={() => {
            setActiveSection(isAdmin ? 'kpi' : 'crm')
            navigate('/dashboard')
          }}
        >
          {/* Flame Icon Logo Mark */}
          <div className="w-8 h-8 rounded-xl bg-[#2b2b30] border border-white/10 flex items-center justify-center flex-shrink-0 relative overflow-hidden shadow-sm">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <path
                d="M12 4C12 4 19 8 19 16C19 21 15 25 10 27C5 29 2 24 2 18C2 9 12 4 12 4Z"
                fill="#f37a23"
              />
              <path
                d="M20 9C20 9 27 13 27 20C27 24 24 28 19 29C15 30 13 27 13 23C13 15 20 9 20 9Z"
                fill="#ef4444"
              />
            </svg>
          </div>

          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[15px] font-medium tracking-tight text-white truncate">
                XOWIQ CRM
              </span>
            </div>
          )}
        </div>

        {/* Expand / Collapse Button */}
        <button
          id={isCollapsed ? "expand-sidebar-btn" : "collapse-sidebar-btn"}
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex-shrink-0"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* ── Search Bar ── */}
      <div className="px-3 my-2">
        {isCollapsed ? (
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-10 h-10 mx-auto rounded-full bg-[#27272c] hover:bg-[#323238] border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Search Navigation"
          >
            <Search size={15} strokeWidth={1.75} />
          </button>
        ) : (
          <div className="relative flex items-center bg-[#27272c] hover:bg-[#2e2e34] border border-white/5 rounded-full px-3 py-1.5 transition-all">
            <Search size={14} strokeWidth={1.75} className="text-zinc-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none font-normal"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-zinc-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Navigation Links ── */}
      <div className="flex-1 overflow-y-auto px-2.5 py-1 space-y-4 custom-scrollbar">
        {sections.map((section, sIdx) => {
          const visibleItems = section.items.filter(isItemVisible)
          if (visibleItems.length === 0) return null

          return (
            <div key={sIdx} className="space-y-1">
              {!isCollapsed ? (
                <div className="px-3 py-1 text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
                  {section.title}
                </div>
              ) : (
                sIdx > 0 && <div className="w-8 mx-auto my-2.5 h-px bg-white/5" />
              )}

              {visibleItems.map((item) => {
                const active = isItemActive(item)

                return (
                  <div
                    key={item.id}
                    className="relative group"
                    onMouseEnter={() => setHoveredId(item.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <button
                      onClick={() => handleNavigate(item)}
                      className={`w-full flex items-center transition-all duration-150 rounded-xl cursor-pointer ${
                        isCollapsed
                          ? 'justify-center h-10 w-10 mx-auto'
                          : 'gap-3 px-3 py-2 text-xs font-normal'
                      } ${
                        active
                          ? 'bg-white text-zinc-950 font-medium shadow-md'
                          : 'text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                      }`}
                    >
                      <span className={`flex-shrink-0 ${active ? 'text-zinc-950' : 'text-zinc-400 group-hover:text-white'}`}>
                        {item.icon}
                      </span>

                      {!isCollapsed && (
                        <span className="flex-1 text-left truncate">
                          {item.label}
                        </span>
                      )}

                      {!isCollapsed && item.badge && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-normal ${
                            active
                              ? 'bg-zinc-200 text-zinc-900'
                              : 'bg-[#2b2b30] text-zinc-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {isCollapsed && item.badge && !active && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-zinc-900" />
                      )}
                    </button>

                    {/* Collapsed Hover Tooltip */}
                    {isCollapsed && hoveredId === item.id && (
                      <div className="absolute left-[68px] top-1/2 -translate-y-1/2 z-[100] px-3 py-1.5 bg-[#2b2b30] border border-white/10 text-white text-xs font-normal rounded-lg shadow-2xl whitespace-nowrap pointer-events-none flex items-center gap-2 animate-in fade-in zoom-in-95 duration-100">
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.2 rounded-full bg-zinc-700 text-[10px] text-zinc-200">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* ── Bottom Section: Settings & User Profile ── */}
      <div className="p-2.5 border-t border-white/10 space-y-1 relative" ref={profileMenuRef}>
        {/* Settings Item */}
        <div
          className="relative group"
          onMouseEnter={() => setHoveredId('settings')}
          onMouseLeave={() => setHoveredId(null)}
        >
          <button
            onClick={() => {
              setActiveSection('crm')
              navigate('/dashboard/settings')
            }}
            className={`w-full flex items-center transition-all duration-150 rounded-xl cursor-pointer ${
              isCollapsed
                ? 'justify-center h-10 w-10 mx-auto'
                : 'gap-3 px-3 py-2 text-xs font-normal'
            } ${
              currentPath === 'settings'
                ? 'bg-white text-zinc-950 font-medium shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <Settings size={18} strokeWidth={1.75} className={currentPath === 'settings' ? 'text-zinc-950' : 'text-zinc-400 group-hover:text-white'} />
            {!isCollapsed && <span className="flex-1 text-left truncate">{t('sidebar.settings', 'Settings')}</span>}
          </button>

          {isCollapsed && hoveredId === 'settings' && (
            <div className="absolute left-[68px] top-1/2 -translate-y-1/2 z-[100] px-3 py-1.5 bg-[#2b2b30] border border-white/10 text-white text-xs font-normal rounded-lg shadow-2xl whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-100">
              {t('sidebar.settings', 'Settings')}
            </div>
          )}
        </div>

        {/* User Profile Card */}
        <div className="pt-1">
          <div
            id="user-profile-btn"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className={`flex items-center transition-colors rounded-xl p-1.5 cursor-pointer hover:bg-white/[0.08] ${
              isCollapsed ? 'justify-center' : 'justify-between'
            }`}
            title={isCollapsed ? userName : undefined}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Circular Avatar */}
              <div className="w-8 h-8 rounded-full bg-zinc-700 border border-white/20 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                {userInitial}
              </div>

              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-white truncate">
                    {userName}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-normal truncate">
                    {roleInfo?.label || 'Super Admin'}
                  </span>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                type="button"
                className="text-zinc-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <MoreVertical size={16} />
              </button>
            )}
          </div>

          {/* Profile & Role Switcher Popover */}
          {isProfileMenuOpen && (
            <div
              className={`absolute bottom-full mb-2 bg-[#222226] border border-white/10 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 ${
                isCollapsed ? 'left-16 w-60' : 'left-2 right-2'
              }`}
            >
              <div className="px-3 py-2 border-b border-white/10 mb-1">
                <div className="text-xs font-medium text-white">{userName}</div>
                <div className="text-[11px] text-zinc-400 truncate">{session?.user?.email || 'admin@xowiq.com'}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: roleInfo?.color || '#6366f1' }} />
                  <span className="text-[11px] font-medium" style={{ color: roleInfo?.color || '#6366f1' }}>
                    {roleInfo?.label}
                  </span>
                  <span className="text-[10px] text-zinc-500">({companyType})</span>
                </div>
              </div>

              {/* Role Switcher */}
              <div className="py-1">
                <div className="px-3 py-1 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                  Switch Active Role:
                </div>
                {[
                  { key: 'admin', label: 'Super Admin', icon: '👑' },
                  { key: 'manager', label: 'Sales Manager', icon: '💼' },
                  { key: 'agent', label: 'Support Agent', icon: '🎧' },
                  { key: 'b2c', label: 'B2C Store Owner', icon: '🛍️' },
                  { key: 'user', label: 'Staff / Viewer', icon: '👁️' }
                ].map((r) => (
                  <button
                    key={r.key}
                    onClick={() => {
                      switchRole(r.key)
                      setIsProfileMenuOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                      role === r.key
                        ? 'bg-white/15 text-white font-medium'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5 font-normal'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{r.icon}</span>
                      <span>{r.label}</span>
                    </span>
                    {role === r.key && <Check size={14} className="text-white" />}
                  </button>
                ))}
              </div>

              {/* Logout Option */}
              <div className="pt-1 border-t border-white/10 mt-1">
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false)
                    onLogout()
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer font-normal"
                >
                  <LogOut size={14} />
                  <span>{t('dashboard.signOut', 'Sign Out')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
