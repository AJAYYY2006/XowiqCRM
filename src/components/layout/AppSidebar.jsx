import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutGrid, Users, LogOut, UserSquare2, BarChart3,
  TrendingUp, Ticket, Briefcase, Quote, Settings,
  ClipboardList, Package, Building2, Search,
  ChevronLeft, ChevronRight, MoreVertical, Shield,
  CheckSquare, FileText, Receipt, Layers, Check,
  Sun, Moon
} from 'lucide-react'
import { ROLE_DEFINITIONS } from '../../config/roles'
import { useTheme } from '../../contexts/ThemeContext'

export default function AppSidebar({
  session,
  profile,
  role,
  roleInfo,
  switchRole,
  canSwitchRole,
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
  const [tooltipTop, setTooltipTop] = useState(null)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef(null)

  const companyType = session?.user?.user_metadata?.companyType || profile?.company_type || (role === 'b2c' ? 'B2C' : 'B2B')
  const isB2C = companyType === 'B2C' || role === 'b2c'
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
    if (isAdmin) {
      return [
        {
          title: 'DASHBOARD',
          items: [
            { id: 'kpis', path: 'kpi', label: t('dashboard.kpiDashboard', 'Analytics'), icon: <BarChart3 size={18} strokeWidth={1.75} />, section: 'kpi', badge: null },
          ]
        },
        {
          title: 'OPERATIONS',
          items: [
            { id: 'leads', path: 'leads', label: t('sidebar.marketing', 'Leads'), icon: <UserSquare2 size={18} strokeWidth={1.75} />, badge: null },
            { id: 'accounts', path: 'accounts', label: t('sidebar.customers', 'Accounts'), icon: <Building2 size={18} strokeWidth={1.75} />, badge: null },
            { id: 'contacts', path: 'contacts', label: t('sidebar.contacts', 'Contacts'), icon: <Users size={18} strokeWidth={1.75} />, badge: null },
            { id: 'deals', path: 'opportunities', label: t('sidebar.opportunities', 'Opportunities'), icon: <Briefcase size={18} strokeWidth={1.75} />, badge: null },
            { id: 'tasks', path: 'tasks', label: t('sidebar.tasks', 'Tasks'), icon: <CheckSquare size={18} strokeWidth={1.75} />, badge: null },
            { id: 'services', path: 'services', label: t('sidebar.services', 'Services'), icon: <Package size={18} strokeWidth={1.75} />, badge: null },
            { id: 'tickets', path: 'tickets', label: t('sidebar.inbox', 'Tickets'), icon: <Ticket size={18} strokeWidth={1.75} />, badge: null },
            { id: 'quotes', path: 'quotes', label: t('sidebar.quotes', 'Quotes'), icon: <FileText size={18} strokeWidth={1.75} />, badge: null },
            { id: 'invoices', path: 'invoices', label: t('sidebar.invoices', 'Invoices'), icon: <Receipt size={18} strokeWidth={1.75} />, badge: null },
            { id: 'team_records', path: 'team_records', label: t('dashboard.teamRecords', 'Team Stream'), icon: <ClipboardList size={18} strokeWidth={1.75} />, section: 'team_records', badge: null },
            { id: 'users', path: 'users', label: t('dashboard.userManagement', 'Team Users'), icon: <Users size={18} strokeWidth={1.75} />, section: 'users', badge: null },
          ]
        }
      ]
    }

    if (role === 'manager' || role === 'sales_rep') {
      return [
        {
          title: 'DASHBOARD',
          items: [
            { id: 'kpis', path: '', label: t('dashboard.kpiDashboard', 'KPI Dashboard'), icon: <TrendingUp size={18} strokeWidth={1.75} />, badge: null },
            { id: 'reports', path: 'reports', label: t('sidebar.analytics', 'Analytics'), icon: <BarChart3 size={18} strokeWidth={1.75} />, badge: null },
          ].filter(item => hasAccess(item.id))
        },
        {
          title: 'SALES & PIPELINE',
          items: [
            { id: 'accounts', path: 'accounts', label: t('sidebar.customers', 'Accounts'), icon: <Building2 size={18} strokeWidth={1.75} />, badge: null },
            { id: 'leads', path: 'leads', label: t('sidebar.marketing', 'Leads'), icon: <UserSquare2 size={18} strokeWidth={1.75} />, badge: null },
            { id: 'deals', path: 'opportunities', label: t('sidebar.opportunities', 'Opportunities'), icon: <Briefcase size={18} strokeWidth={1.75} />, badge: null },
            { id: 'tasks', path: 'tasks', label: t('sidebar.tasks', 'Tasks'), icon: <CheckSquare size={18} strokeWidth={1.75} />, badge: null },
            { id: 'services', path: 'services', label: t('sidebar.services', 'Services'), icon: <Package size={18} strokeWidth={1.75} />, badge: null },
            { id: 'contacts', path: 'contacts', label: t('sidebar.contacts', 'Contacts'), icon: <Users size={18} strokeWidth={1.75} />, badge: null },
            { id: 'quotes', path: 'quotes', label: t('sidebar.quotes', 'Quotes'), icon: <FileText size={18} strokeWidth={1.75} />, badge: null },
            { id: 'invoices', path: 'invoices', label: t('sidebar.invoices', 'Invoices'), icon: <Receipt size={18} strokeWidth={1.75} />, badge: null },
          ].filter(item => hasAccess(item.id))
        }
      ]
    }

    if (role === 'b2c') {
      return [
        {
          title: 'DASHBOARD',
          items: [
            { id: 'kpis', path: '', label: t('dashboard.analyticsDashboard', 'Analytics Dashboard'), icon: <BarChart3 size={18} strokeWidth={1.75} />, badge: null },
            { id: 'reports', path: 'reports', label: t('sidebar.reports', 'Reports'), icon: <TrendingUp size={18} strokeWidth={1.75} />, badge: null },
          ].filter(item => hasAccess(item.id))
        },
        {
          title: 'STORE & OPS',
          items: [
            { id: 'accounts', path: 'accounts', label: t('sidebar.customers', 'Accounts'), icon: <Building2 size={18} strokeWidth={1.75} />, badge: null },
            { id: 'contacts', path: 'contacts', label: t('sidebar.contacts', 'Contacts'), icon: <Users size={18} strokeWidth={1.75} />, badge: null },
            { id: 'leads', path: 'leads', label: t('sidebar.marketing', 'Leads'), icon: <UserSquare2 size={18} strokeWidth={1.75} />, badge: null },
            { id: 'tasks', path: 'tasks', label: t('sidebar.tasks', 'Tasks'), icon: <CheckSquare size={18} strokeWidth={1.75} />, badge: null },
            { id: 'services', path: 'services', label: t('sidebar.services', 'Services'), icon: <Package size={18} strokeWidth={1.75} />, badge: null },
            { id: 'invoices', path: 'invoices', label: t('sidebar.invoices', 'Invoices'), icon: <Receipt size={18} strokeWidth={1.75} />, badge: null },
            { id: 'tickets', path: 'tickets', label: t('sidebar.inbox', 'Tickets'), icon: <Ticket size={18} strokeWidth={1.75} />, badge: null },
          ].filter(item => hasAccess(item.id))
        }
      ]
    }

    if (role === 'agent' || role === 'support_agent') {
      return [
        {
          title: 'DASHBOARD',
          items: [
            { id: 'contacts', path: 'contacts', label: t('sidebar.contacts', 'Contacts'), icon: <Users size={18} strokeWidth={1.75} />, badge: null },
          ].filter(item => hasAccess(item.id))
        },
        {
          title: 'SUPPORT DESK',
          items: [
            { id: 'accounts', path: 'accounts', label: t('sidebar.customers', 'Accounts'), icon: <Building2 size={18} strokeWidth={1.75} />, badge: null },
            { id: 'tickets', path: 'tickets', label: t('sidebar.inbox', 'Tickets'), icon: <Ticket size={18} strokeWidth={1.75} />, badge: null },
            { id: 'tasks', path: 'tasks', label: t('sidebar.tasks', 'Tasks'), icon: <CheckSquare size={18} strokeWidth={1.75} />, badge: null },
            { id: 'services', path: 'services', label: t('sidebar.services', 'Services'), icon: <Package size={18} strokeWidth={1.75} />, badge: null },
          ].filter(item => hasAccess(item.id))
        }
      ]
    }

    // Default Fallback
    return [
      {
        title: 'DASHBOARD',
        items: [
          { id: 'kpis', path: '', label: t('dashboard.analyticsDashboard', 'Analytics Dashboard'), icon: <BarChart3 size={18} strokeWidth={1.75} />, badge: null },
          { id: 'reports', path: 'reports', label: t('sidebar.reports', 'Reports'), icon: <TrendingUp size={18} strokeWidth={1.75} />, badge: null },
        ].filter(item => hasAccess(item.id))
      },
      {
        title: 'WORKSPACE',
        items: [
          { id: 'contacts', path: 'contacts', label: t('sidebar.contacts', 'Contacts'), icon: <Users size={18} strokeWidth={1.75} />, badge: null },
          { id: 'deals', path: 'opportunities', label: t('sidebar.opportunities', 'Opportunities'), icon: <Briefcase size={18} strokeWidth={1.75} />, badge: null },
          { id: 'tasks', path: 'tasks', label: t('sidebar.tasks', 'Tasks'), icon: <CheckSquare size={18} strokeWidth={1.75} />, badge: null },
        ].filter(item => hasAccess(item.id))
      }
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
    return (!currentPath && item.path === '') || (currentPath === item.path) || (item.id === 'kpis' && (currentPath === 'kpi' || !currentPath))
  }

  const userName = profile?.name || session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'Alex Rivera'
  const userInitial = userName.charAt(0).toUpperCase()

  const { theme, toggleTheme, isDark } = useTheme()

  return (
    <aside
      className={`fixed top-0 left-0 h-screen z-50 flex flex-col transition-all duration-300 select-none ${
        isCollapsed ? 'w-[76px]' : 'w-[260px]'
      }`}
      style={{
        backgroundColor: isDark ? '#1e1e22' : '#ffffff',
        color: isDark ? '#e4e4e7' : '#18181b',
        borderRight: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e4e4e7'
      }}
    >
      {/* ── Header: Logo & Brand + Theme Toggle & Collapse/Expand Button ── */}
      <div className="flex items-center justify-between px-3.5 pt-4 pb-2">
        <div
          className="flex items-center gap-2.5 min-w-0 cursor-pointer"
          onClick={() => {
            setActiveSection(isAdmin ? 'kpi' : 'crm')
            navigate('/dashboard')
          }}
        >
          {/* Logo Image */}
          {isCollapsed ? (
            <img
              src="/images/xowiq-icon.png"
              alt="XOWIQ"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'block',
                objectFit: 'contain',
              }}
              title="XOWIQ CRM"
            />
          ) : (
            <img
              src={isDark ? "/images/xowiq-logo-dark.png" : "/images/xowiq-logo.png"}
              alt="XOWIQ CRM"
              style={{
                height: '32px',
                width: 'auto',
                display: 'block',
                objectFit: 'contain',
                transition: 'all 0.2s ease',
              }}
            />
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Theme Toggle Button */}
          {!isCollapsed && (
            <button
              onClick={toggleTheme}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                isDark
                  ? 'text-zinc-400 hover:text-amber-300 hover:bg-white/10'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          )}

          {/* Expand / Collapse Button */}
          <button
            id={isCollapsed ? "expand-sidebar-btn" : "collapse-sidebar-btn"}
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
              isDark
                ? 'text-zinc-400 hover:text-white hover:bg-white/10'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="px-3 my-2">
        {isCollapsed ? (
          <button
            onClick={() => setIsCollapsed(false)}
            className={`w-10 h-10 mx-auto rounded-full border flex items-center justify-center transition-all cursor-pointer ${
              isDark
                ? 'bg-[#27272c] hover:bg-[#323238] border-white/5 text-zinc-400 hover:text-white'
                : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-500 hover:text-zinc-900'
            }`}
            title="Search Navigation"
          >
            <Search size={15} strokeWidth={1.75} />
          </button>
        ) : (
          <div
            className={`relative flex items-center border rounded-full px-3 py-1.5 transition-all ${
              isDark
                ? 'bg-[#27272c] hover:bg-[#2e2e34] border-white/5'
                : 'bg-zinc-100 hover:bg-zinc-100/80 border-zinc-200/80'
            }`}
          >
            <Search
              size={14}
              strokeWidth={1.75}
              className={`mr-2 flex-shrink-0 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search"
              className={`w-full bg-transparent text-xs focus:outline-none font-normal ${
                isDark
                  ? 'text-zinc-100 placeholder-zinc-500'
                  : 'text-zinc-900 placeholder-zinc-400'
              }`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className={`text-xs px-1 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
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
                <div className={`px-3 py-1 text-[10px] font-medium tracking-wider uppercase ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {section.title}
                </div>
              ) : (
                sIdx > 0 && <div className={`w-8 mx-auto my-2.5 h-px ${isDark ? 'bg-white/5' : 'bg-zinc-200'}`} />
              )}

              {visibleItems.map((item) => {
                const active = isItemActive(item)

                return (
                  <div
                    key={item.id}
                    className="relative group"
                    onMouseEnter={(e) => {
                      setHoveredId(item.id)
                      const rect = e.currentTarget.getBoundingClientRect()
                      setTooltipTop(rect.top + rect.height / 2)
                    }}
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
                          ? isDark
                            ? 'bg-white text-zinc-950 font-medium shadow-md'
                            : 'bg-[#18181b] text-white font-medium shadow-sm'
                          : isDark
                            ? 'text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                            : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
                      }`}
                    >
                      <span
                        className={`flex-shrink-0 ${
                          active
                            ? isDark
                              ? 'text-zinc-950'
                              : 'text-white'
                            : isDark
                              ? 'text-zinc-400 group-hover:text-white'
                              : 'text-zinc-500 group-hover:text-zinc-900'
                        }`}
                      >
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
                              ? isDark
                                ? 'bg-zinc-200 text-zinc-900'
                                : 'bg-zinc-800 text-zinc-200'
                              : isDark
                                ? 'bg-[#2b2b30] text-zinc-300'
                                : 'bg-zinc-200 text-zinc-700'
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
                    {isCollapsed && hoveredId === item.id && tooltipTop !== null && (
                      <div
                        className={`fixed left-[84px] z-[9999] px-3 py-1.5 border text-xs font-normal rounded-lg shadow-2xl whitespace-nowrap pointer-events-none flex items-center gap-2 animate-in fade-in zoom-in-95 duration-100 ${
                          isDark
                            ? 'bg-[#2b2b30] border-white/10 text-white'
                            : 'bg-[#18181b] border-zinc-700 text-white'
                        }`}
                        style={{ top: `${tooltipTop}px`, transform: 'translateY(-50%)' }}
                      >
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isDark ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-800 text-zinc-200'}`}>
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
      <div
        className={`p-2.5 border-t space-y-1 relative ${
          isDark ? 'border-white/10' : 'border-zinc-200'
        }`}
        ref={profileMenuRef}
      >
        {/* Collapsed Theme Toggle Button */}
        {isCollapsed && (
          <div className="flex justify-center mb-1">
            <button
              onClick={toggleTheme}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                isDark
                  ? 'text-zinc-400 hover:text-amber-300 hover:bg-white/10'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        )}

        {/* Settings Item */}
        <div
          className="relative group"
          onMouseEnter={(e) => {
            setHoveredId('settings')
            const rect = e.currentTarget.getBoundingClientRect()
            setTooltipTop(rect.top + rect.height / 2)
          }}
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
                ? isDark
                  ? 'bg-white text-zinc-950 font-medium shadow-md'
                  : 'bg-[#18181b] text-white font-medium shadow-sm'
                : isDark
                  ? 'text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                  : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
            }`}
          >
            <Settings
              size={18}
              strokeWidth={1.75}
              className={
                currentPath === 'settings'
                  ? isDark
                    ? 'text-zinc-950'
                    : 'text-white'
                  : isDark
                    ? 'text-zinc-400 group-hover:text-white'
                    : 'text-zinc-500 group-hover:text-zinc-900'
              }
            />
            {!isCollapsed && <span className="flex-1 text-left truncate">{t('sidebar.settings', 'Settings')}</span>}
          </button>

          {isCollapsed && hoveredId === 'settings' && tooltipTop !== null && (
            <div
              className={`fixed left-[84px] z-[9999] px-3 py-1.5 border text-xs font-normal rounded-lg shadow-2xl whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-100 ${
                isDark
                  ? 'bg-[#2b2b30] border-white/10 text-white'
                  : 'bg-[#18181b] border-zinc-700 text-white'
              }`}
              style={{ top: `${tooltipTop}px`, transform: 'translateY(-50%)' }}
            >
              {t('sidebar.settings', 'Settings')}
            </div>
          )}
        </div>

        {/* User Profile Card */}
        <div className="pt-1">
          <div
            id="user-profile-btn"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className={`flex items-center transition-colors rounded-xl p-1.5 cursor-pointer ${
              isDark ? 'hover:bg-white/[0.08]' : 'hover:bg-zinc-100'
            } ${
              isCollapsed ? 'justify-center' : 'justify-between'
            }`}
            title={isCollapsed ? userName : undefined}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Circular Avatar */}
              <div
                className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                  isDark
                    ? 'bg-zinc-700 border-white/20 text-white'
                    : 'bg-zinc-200 border-zinc-300 text-zinc-800'
                }`}
              >
                {userInitial}
              </div>

              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    {userName}
                  </span>
                  <span className={`text-[11px] font-normal truncate ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    {roleInfo?.label || 'Super Admin'}
                  </span>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                type="button"
                className={`p-1 rounded-md transition-colors ${
                  isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <MoreVertical size={16} />
              </button>
            )}
          </div>

          {/* Profile & Role Switcher Popover */}
          {isProfileMenuOpen && (
            <div
              className={`absolute bottom-full mb-2 border rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 ${
                isDark
                  ? 'bg-[#222226] border-white/10 text-white'
                  : 'bg-white border-zinc-200 text-zinc-900'
              } ${
                isCollapsed ? 'left-16 w-60' : 'left-2 right-2'
              }`}
            >
              <div className={`px-3 py-2 border-b mb-1 ${isDark ? 'border-white/10' : 'border-zinc-100'}`}>
                <div className={`text-xs font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>{userName}</div>
                <div className={`text-[11px] truncate ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{session?.user?.email || 'admin@xowiq.com'}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: roleInfo?.color || '#6366f1' }} />
                  <span className="text-[11px] font-medium" style={{ color: roleInfo?.color || '#6366f1' }}>
                    {roleInfo?.label}
                  </span>
                  <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>({companyType})</span>
                </div>
              </div>

              {/* Theme Toggle option inside menu */}
              <div className={`py-1 border-b mb-1 ${isDark ? 'border-white/10' : 'border-zinc-100'}`}>
                <button
                  onClick={toggleTheme}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                    isDark
                      ? 'text-zinc-300 hover:bg-white/5'
                      : 'text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {isDark ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-indigo-600" />}
                    <span>{isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}</span>
                  </span>
                  <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${isDark ? 'bg-white/10' : 'bg-zinc-100'}`}>
                    {theme}
                  </span>
                </button>
              </div>

              {/* Role Switcher (Super Admin only) */}
              {canSwitchRole && (
              <div className="py-1">
                <div className={`px-3 py-1 text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Switch Active Role:
                </div>
                {[
                  { key: 'admin', label: 'Super Admin', icon: '👑' },
                  { key: 'manager', label: 'Sales Manager', icon: '💼' },
                  { key: 'agent', label: 'Support Agent', icon: '🎧' },
                  { key: 'b2c', label: 'B2C Store Owner', icon: '🛍️' }
                ].map((r) => (
                  <button
                    key={r.key}
                    onClick={() => {
                      switchRole(r.key)
                      setIsProfileMenuOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                      role === r.key
                        ? isDark
                          ? 'bg-white/15 text-white font-medium'
                          : 'bg-zinc-900 text-white font-medium'
                        : isDark
                          ? 'text-zinc-400 hover:text-white hover:bg-white/5 font-normal'
                          : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 font-normal'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{r.icon}</span>
                      <span>{r.label}</span>
                    </span>
                    {role === r.key && <Check size={14} className={isDark ? 'text-white' : 'text-white'} />}
                  </button>
                ))}
              </div>
              )}

              {/* Logout Option */}
              <div className={`pt-1 border-t mt-1 ${isDark ? 'border-white/10' : 'border-zinc-100'}`}>
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false)
                    onLogout()
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer font-normal"
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
