import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import toast from 'react-hot-toast'
import ExecutiveSuperAdminDashboard from '../dashboard/ExecutiveSuperAdminDashboard'

export default function DashboardHome({ session, profile }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [kpiData, setKpiData] = useState({})
  const [loading, setLoading] = useState(true)
  const dashboardRef = useRef(null)

  // Aggregate states for dashboard charts
  const [monthlyRevenue, setMonthlyRevenue] = useState([])
  const [activityHeatmap, setActivityHeatmap] = useState([])
  const [invoiceStats, setInvoiceStats] = useState({ totalRevenue: 0, paidCount: 0, unpaidCount: 0, overdueCount: 0 })
  const [contactsCount, setContactsCount] = useState(0)
  const [accountsCount, setAccountsCount] = useState(0)
  const [quotesAccepted, setQuotesAccepted] = useState(0)

  const companyName = profile?.company_name || session?.user?.user_metadata?.companyName || ''

  // Helper: build monthly revenue array from deals and paid invoices
  const buildMonthlyRevenue = (deals = [], invoices = []) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const now = new Date()
    const currentYear = now.getFullYear()
    const monthMap = {}
    months.forEach((m, i) => { monthMap[i] = { month: m, revenue: 0, deals: 0 } })

    // 1. Closed deals revenue
    deals.forEach(d => {
      const date = new Date(d.closed_date || d.created_at)
      if (date.getFullYear() === currentYear) {
        const mi = date.getMonth()
        monthMap[mi].revenue += Number(d.amount || 0)
        monthMap[mi].deals += 1
      }
    })

    // 2. Paid invoices revenue (crucial for B2C and service billing)
    invoices.forEach(inv => {
      if (inv.status === 'Paid') {
        const date = new Date(inv.created_at)
        if (date.getFullYear() === currentYear) {
          const mi = date.getMonth()
          monthMap[mi].revenue += Number(inv.total_price || 0)
          monthMap[mi].deals += 1
        }
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
    const slots = [
      { timeSlot: '12 AM - 8 AM', range: [0, 8] },
      { timeSlot: '8 AM - 4 PM', range: [8, 16] },
      { timeSlot: '4 PM - 12 AM', range: [16, 24] }
    ]
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const counts = {}
    slots.forEach(s => {
      counts[s.timeSlot] = {}
      dayNames.forEach(d => { counts[s.timeSlot][d] = 0 })
    })

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

    const allCounts = Object.values(counts).flatMap(slot => Object.values(slot))
    const maxCount = Math.max(...allCounts, 1)

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

  useEffect(() => {
    // Initial load with spinner
    fetchTeamAndKPIs(true)

    // Real-time subscriptions — fire silent refresh when team data changes
    const tables = ['leads', 'opportunities', 'tasks', 'tickets', 'activities', 'contacts', 'accounts', 'quotes', 'services', 'customer_services']
    const channels = tables.map(table =>
      supabase
        .channel(`dashboard-home-${table}-watch`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          fetchTeamAndKPIs(false) // silent — no spinner, no flicker
        })
        .subscribe()
    )

    // Polling fallback every 15s — guarantees updates even if Realtime isn't enabled
    const pollInterval = setInterval(() => fetchTeamAndKPIs(false), 15000)

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch))
      clearInterval(pollInterval)
    }
  }, [session, profile])

  const fetchTeamAndKPIs = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true)
      if (!session?.user?.id) return

      // Fetch team users
      let { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, name, email, role, created_at, company_name, company_type, created_by_admin_id')
        .eq('created_by_admin_id', session.user.id)

      if (!allProfiles || allProfiles.length === 0) {
        const legacyRes = await supabase
          .from('profiles')
          .select('id, name, email, role, created_at, company_name, company_type, created_by_admin_id')
          .eq('created_by', session.user.id)
        allProfiles = legacyRes.data || []
      }

      if (!allProfiles || allProfiles.length === 0) {
        const fallback = await supabase
          .from('profiles')
          .select('id, name, email, role, created_at, company_name, company_type')
          .ilike('company_name', companyName ? `%${companyName}%` : '%')
          .neq('id', session.user.id)
        allProfiles = fallback.data || []
      }

      const teamUsers = (allProfiles || []).filter(p =>
        ['manager', 'admin', 'b2c', 'agent', 'support_agent', 'sales_rep'].includes((p.role || '').toLowerCase())
      )

      setUsers(teamUsers)

      // Collect all user IDs including current user for aggregate queries
      const allUserIds = [session.user.id, ...teamUsers.map(u => u.id)]

      // Fetch KPIs for all users: current session user + team members
      const allUsersForKpi = [
        { id: session.user.id, name: profile?.name || session.user.email, email: session.user.email },
        ...teamUsers
      ]

      // Fetch KPIs for team
      const kpiMap = {}
      await Promise.all(allUsersForKpi.map(async (u) => {
        const [leadsRes, customersRes, dealsRes, tasksRes, ticketsRes, activitiesRes,
               contactsRes, accountsRes, invoicesPaidRes, quotesAccRes] = await Promise.all([
          supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', u.id),
          supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', u.id).in('status', ['converted', 'Converted']),
          supabase.from('opportunities').select('amount').eq('user_id', u.id).in('stage', ['Closed Won', 'closed won', 'Closed', 'closed', 'closed_won', 'won']),
          supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', u.id).in('status', ['Completed', 'completed', 'Done']),
          supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('user_id', u.id).in('status', ['resolved', 'Resolved', 'closed', 'Closed']),
          supabase.from('activities').select('created_at').eq('user_id', u.id).order('created_at', { ascending: false }).limit(1),
          supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('user_id', u.id),
          supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('user_id', u.id),
          supabase.from('quotes').select('total_price').eq('user_id', u.id).eq('status', 'Paid'),
          supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('user_id', u.id).in('status', ['Accepted', 'Approved']),
        ])

        const deals = dealsRes.data || []
        const dealsCount = deals.length
        const dealsValue = deals.reduce((sum, d) => sum + Number(d.amount || 0), 0)
        const paidInvoices = invoicesPaidRes.data || []
        const invoiceRevenue = paidInvoices.reduce((sum, inv) => sum + Number(inv.total_price || 0), 0)

        kpiMap[u.id] = {
          leads: leadsRes.count || 0,
          customers: customersRes.count || 0,
          dealsCount: dealsCount > 0 ? dealsCount : paidInvoices.length,
          dealsValue: dealsValue > 0 ? dealsValue : invoiceRevenue,
          tasks: tasksRes.count || 0,
          tickets: ticketsRes.count || 0,
          lastActive: activitiesRes.data?.[0]?.created_at || null,
          contacts: contactsRes.count || 0,
          accounts: accountsRes.count || 0,
          invoiceRevenue,
          invoicesPaid: paidInvoices.length,
          quotesAccepted: quotesAccRes.count || 0,
        }
      }))

      setKpiData(kpiMap)

      // ── Aggregate queries for dashboard charts ──

      // 1. Monthly revenue & Invoices query
      const [dealsRes, invsRes] = await Promise.all([
        supabase
          .from('opportunities')
          .select('amount, closed_date, created_at')
          .in('user_id', allUserIds)
          .in('stage', ['Closed Won', 'closed won', 'Closed', 'closed', 'closed_won', 'won']),
        supabase
          .from('quotes')
          .select('total_price, status, expires_at, created_at')
          .in('user_id', allUserIds)
      ])

      const allDeals = dealsRes.data || []
      const allInvoices = invsRes.data || []

      setMonthlyRevenue(buildMonthlyRevenue(allDeals, allInvoices))

      // 2. Activity heatmap
      const { data: allActivities } = await supabase
        .from('activities')
        .select('created_at')
        .in('user_id', allUserIds)
      setActivityHeatmap(buildActivityHeatmap((allActivities || []).map(a => a.created_at)))
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

      // 4. Total contacts
      const { count: totalContacts } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .in('user_id', allUserIds)
      setContactsCount(totalContacts || 0)

      // 5. Total accounts
      const { count: totalAccounts } = await supabase
        .from('accounts')
        .select('id', { count: 'exact', head: true })
        .in('user_id', allUserIds)
      setAccountsCount(totalAccounts || 0)

      // 6. Total accepted quotes
      const { count: totalQuotesAccepted } = await supabase
        .from('quotes')
        .select('id', { count: 'exact', head: true })
        .in('user_id', allUserIds)
        .eq('status', 'Accepted')
      setQuotesAccepted(totalQuotesAccepted || 0)

    } catch (err) {
      console.warn('Dashboard data fetch notice:', err)
    } finally {
      setLoading(false)
    }
  }

  const exportPDF = async () => {
    const toastId = toast.loading('Generating Executive PDF Report...')
    try {
      if (!dashboardRef.current) return
      const canvas = await html2canvas(dashboardRef.current, { scale: 2, backgroundColor: '#f8fafc', logging: false })
      const imgData = canvas.toDataURL('image/jpeg', 1.0)
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`XOWIQ_Executive_Report_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('Report downloaded successfully!', { id: toastId })
    } catch (error) {
      toast.error('PDF export failed.', { id: toastId })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-400 font-light text-sm">
        <div className="w-6 h-6 border-2 border-[#ff5900] border-t-transparent rounded-full animate-spin mr-3" />
        <span>Loading Executive Overview...</span>
      </div>
    )
  }

  return (
    <div ref={dashboardRef} className="font-['Poppins',sans-serif] pb-10 max-w-full overflow-x-hidden">
      <ExecutiveSuperAdminDashboard
        session={session}
        profile={profile}
        users={users}
        kpiData={kpiData}
        onExportPDF={exportPDF}
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
