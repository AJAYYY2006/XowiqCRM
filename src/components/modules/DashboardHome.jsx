import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import toast from 'react-hot-toast'
import { AlertCircle, Bell, CheckCircle, Clock, Calendar, Mail, MessageSquare, RotateCw, Download } from 'lucide-react'

export default function DashboardHome({ session, profile }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    revenue: 0,
    leadsCount: 0,
    opportunitiesCount: 0,
    ticketsCount: 0,
    customersCount: 0,
    pendingInvoicesCount: 0
  })
  const [tasks, setTasks] = useState([])
  const [priorityTasks, setPriorityTasks] = useState([])
  const [activities, setActivities] = useState([])
  const [pipelineData, setPipelineData] = useState([])
  const [revenueData, setRevenueData] = useState([])
  const [b2cStages, setB2cStages] = useState([])
  const [b2cAccounts, setB2cAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  const [dateFilter, setDateFilter] = useState('this_month')
  const [revenueGoal, setRevenueGoal] = useState(10000)
  const [funnelData, setFunnelData] = useState([])

  const dashboardRef = useRef(null)

  const companyType = session.user.user_metadata?.companyType || 'B2B'
  const isB2C = companyType === 'B2C'
  const isStageTrackingEnabled = session.user.user_metadata?.b2cStageTrackingEnabled === true

  const lsGet = (key, fallback) => {
    try {
      const v = localStorage.getItem(key)
      return v !== null ? JSON.parse(v) : fallback
    } catch {
      return fallback
    }
  }

  const getDateRangeBounds = (filter) => {
    const now = new Date()
    let startDate
    let endDate = now.toISOString()

    switch (filter) {
      case 'last_7_days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'last_30_days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'last_90_days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      case 'last_month': {
        const y = now.getFullYear()
        const m = now.getMonth()
        startDate = new Date(y, m - 1, 1)
        endDate = new Date(y, m, 0, 23, 59, 59, 999).toISOString()
        break
      }
      case 'this_month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
    }
    return { startDate: startDate.toISOString(), endDate }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [session, profile, dateFilter])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const userIds = profile?.teamUserIds || [session.user.id]
      const now = new Date()
      const { startDate, endDate } = getDateRangeBounds(dateFilter)

      // Fetch target goal
      const savedGoal = profile?.revenue_goal ?? lsGet('revenue_goal', 10000)
      setRevenueGoal(Number(savedGoal) || 10000)

      // 1. Stats fetches
      const fetchMonthData = async () => {
        let [leadsRes, oppsRes, ticketsRes, tasksRes, activitiesRes, accountsRes, quotesRes] = await Promise.all([
          supabase.from('leads').select('id, status, created_at').in('user_id', userIds).gte('created_at', startDate).lte('created_at', endDate),
          supabase.from('opportunities').select('*').in('user_id', userIds),
          supabase.from('tickets').select('*', { count: 'exact', head: true }).in('user_id', userIds).in('status', ['open', 'pending']),
          supabase.from('tasks').select('*').in('user_id', userIds).neq('status', 'Completed').order('due_date', { ascending: true }),
          supabase.from('activities').select('*').in('user_id', userIds).order('created_at', { ascending: false }).limit(8),
          supabase.from('accounts').select('*', { count: 'exact' }).in('user_id', userIds),
          supabase.from('quotes').select('id, total_price, status, created_at').in('user_id', userIds)
        ])

        const opps = oppsRes.data || []
        const quotes = quotesRes.data || []
        const leads = leadsRes.data || []
        
        // REVENUE CALCULATION
        let totalRevenue = 0
        if (isB2C) {
          // B2C: Sum of all PAID invoices created in the current range
          const paidQuotes = quotes.filter(q => 
            q.status === 'Paid' && 
            q.created_at >= startDate && 
            q.created_at <= endDate
          )
          totalRevenue = paidQuotes.reduce((sum, q) => sum + Number(q.total_price || 0), 0)
        } else {
          // B2B: Use Opportunity Won status in current range
          const wonOpps = opps.filter(o => 
            o.stage === 'closed' && 
            o.created_at >= startDate && 
            o.created_at <= endDate
          )
          totalRevenue = wonOpps.reduce((sum, o) => sum + Number(o.amount || 0), 0)
        }

        const pTasks = (tasksRes.data || []).filter(t => {
          const dueDate = t.due_date ? new Date(t.due_date) : null
          if (isB2C && t.task_type === 'Renewal' && t.status !== 'Completed') return true
          const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000)
          return (dueDate && dueDate <= fortyEightHoursFromNow) || t.status === 'Overdue'
        })

        // Filter opportunities in current range for counts
        const rangeOpps = opps.filter(o => o.created_at >= startDate && o.created_at <= endDate)

        setStats({
          revenue: totalRevenue,
          leadsCount: leads.length,
          opportunitiesCount: rangeOpps.length,
          ticketsCount: ticketsRes.count || 0,
          customersCount: accountsRes.count || 0,
          pendingInvoicesCount: quotes.filter(q => q.status !== 'Paid').length
        })

        setTasks((tasksRes.data || []).slice(0, 5))
        setPriorityTasks(pTasks)
        setActivities(activitiesRes.data || [])
        
        // REAL HISTORIC TREND DATA (last 6 months)
        const monthNames = [t('months.Jan', 'Jan'), t('months.Feb', 'Feb'), t('months.Mar', 'Mar'), t('months.Apr', 'Apr'), t('months.May', 'May'), t('months.Jun', 'Jun'), t('months.Jul', 'Jul'), t('months.Aug', 'Aug'), t('months.Sep', 'Sep'), t('months.Oct', 'Oct'), t('months.Nov', 'Nov'), t('months.Dec', 'Dec')]
        const trendData = []
        
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const year = d.getFullYear()
          const monthIdx = d.getMonth()
          const name = `${monthNames[monthIdx]} ${year.toString().slice(-2)}`
          
          let revenueInMonth = 0
          if (isB2C) {
            const paidMonthQuotes = quotes.filter(q => {
              const qDate = new Date(q.created_at)
              return q.status === 'Paid' && qDate.getFullYear() === year && qDate.getMonth() === monthIdx
            })
            revenueInMonth = paidMonthQuotes.reduce((sum, q) => sum + Number(q.total_price || 0), 0)
          } else {
            const wonMonthOpps = opps.filter(o => {
              const oDate = new Date(o.created_at)
              return o.stage === 'closed' && oDate.getFullYear() === year && oDate.getMonth() === monthIdx
            })
            revenueInMonth = wonMonthOpps.reduce((sum, o) => sum + Number(o.amount || 0), 0)
          }
          trendData.push({ name, total: revenueInMonth })
        }
        setRevenueData(trendData)

        // Lead Conversion Funnel Calculations
        const totalLeads = leads.length
        const contactedLeads = leads.filter(l => l.status !== 'new').length
        const qualifiedLeads = leads.filter(l => ['qualified', 'converted'].includes(l.status)).length
        const convertedLeads = leads.filter(l => l.status === 'converted').length

        setFunnelData([
          { stage: t('dashHome.funnel.all', 'All Leads'), value: totalLeads, pct: 100 },
          { stage: t('dashHome.funnel.contacted', 'Contacted'), value: contactedLeads, pct: totalLeads > 0 ? Math.round((contactedLeads / totalLeads) * 100) : 0 },
          { stage: t('dashHome.funnel.qualified', 'Qualified'), value: qualifiedLeads, pct: totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0 },
          { stage: t('dashHome.funnel.converted', 'Converted'), value: convertedLeads, pct: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0 },
        ])
        
        // Stage Tracking Fetch
        if (isB2C && isStageTrackingEnabled) {
          const { data: stagesRes } = await supabase.from('b2c_stages').select('*').order('order_index', { ascending: true })
          setB2cStages(stagesRes || [])
          setB2cAccounts(accountsRes.data || [])
        }
      }
      
      await fetchMonthData()
    } catch (error) {
      console.error(error)
      toast.error(t('dashHome.failedLoad'))
    } finally {
      setLoading(false)
    }
  }

  const handleTaskAction = async (task, action) => {
    try {
      if (action === 'done') {
        await supabase.from('tasks').update({ status: 'Completed' }).eq('id', task.id)
        toast.success(t('dashHome.reminderCleared'))
      } else if (action === 'snooze') {
        const nextDate = new Date()
        nextDate.setDate(nextDate.getDate() + 1)
        await supabase.from('tasks').update({ due_date: nextDate.toISOString(), status: 'Pending' }).eq('id', task.id)
        toast.success(t('dashHome.snoozedTomorrow'))
      }
      fetchDashboardData() // Reload everything to update badge & lists instantly
    } catch { toast.error(t('dashHome.actionFailed')) }
  }

  const handleDragStart = (e, accountId) => {
    e.dataTransfer.setData('accountId', accountId)
  }

  const handleDropStage = async (e, stageId) => {
    e.preventDefault()
    const accountId = e.dataTransfer.getData('accountId')
    if (!accountId) return
    
    // Optimistic update
    setB2cAccounts(prev => prev.map(a => a.id === accountId ? { ...a, b2c_stage_id: stageId } : a))
    
    try {
      await supabase.from('accounts').update({ b2c_stage_id: stageId }).eq('id', accountId)
      // Log stage movement history
      await supabase.from('b2c_customer_stages').insert({
        customer_id: String(accountId),
        stage_id: stageId,
        moved_at: new Date().toISOString()
      })
    } catch (err) {
      toast.error(t('dashHome.actionFailed'))
      fetchDashboardData() // revert
    }
  }

  const handleMarkComplete = async (task) => {
    const toastId = toast.loading(t('dashHome.updatingTask'))
    try {
      await supabase.from('tasks').update({ status: 'Completed', updated_at: new Date().toISOString() }).eq('id', task.id)
      
      // Log activity
      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Task Completed',
        description: `Directly from dashboard: ${task.title}`
      }])

      toast.success(t('dashHome.taskCompleted'), { id: toastId })
      fetchDashboardData()
    } catch (error) {
      toast.error(t('dashHome.taskUpdateFailed'), { id: toastId })
    }
  }

  const exportPDF = async () => {
    const toastId = toast.loading(t('dashHome.generatingPDF'))
    try {
      const canvas = await html2canvas(dashboardRef.current, { scale: 2, backgroundColor: '#0a0f1e', logging: false })
      const imgData = canvas.toDataURL('image/jpeg', 1.0)
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Antigravity_Report_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success(t('dashHome.reportDownloaded'), { id: toastId })
    } catch (error) {
      toast.error(t('dashHome.pdfFailed'))
    }
  }

  if (loading) return <div className="loading-container"><div className="spinner" /><span>{t('dashHome.loadingDashboard')}</span></div>

  return (
    <div ref={dashboardRef} style={{ padding: '0 0 40px', maxWidth: '100%', overflowX: 'hidden' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">{t('dashHome.welcomeBack')}, {profile?.name?.split(' ')[0] || 'User'}! 👋</h1>
          <p className="page-subtitle">{isB2C ? t('dashHome.subtitleB2C') : t('dashHome.subtitleB2B')}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Date Range Selector */}
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)} 
            className="form-input" 
            style={{ 
              width: 'auto', 
              minWidth: 140, 
              padding: '8px 12px', 
              fontSize: 13, 
              borderRadius: 8, 
              border: '1.5px solid rgba(255, 89, 0, 0.2)',
              cursor: 'pointer',
              background: '#ffffff',
              height: 38
            }}
          >
            <option value="this_month">📅 {t('dashHome.ranges.thisMonth', 'This Month')}</option>
            <option value="last_month">📅 {t('dashHome.ranges.lastMonth', 'Last Month')}</option>
            <option value="last_7_days">📅 {t('dashHome.ranges.last7Days', 'Last 7 Days')}</option>
            <option value="last_30_days">📅 {t('dashHome.ranges.last30Days', 'Last 30 Days')}</option>
            <option value="last_90_days">📅 {t('dashHome.ranges.last90Days', 'Last 90 Days')}</option>
            <option value="this_year">📅 {t('dashHome.ranges.thisYear', 'This Year')}</option>
          </select>

          {/* Refresh Button */}
          <button 
            onClick={fetchDashboardData} 
            className="btn btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', fontSize: 13, height: 38, borderRadius: 8 }}
            title="Refresh dashboard data"
          >
            <RotateCw size={14} className={loading ? 'anim-spin' : ''} />
            <span>{t('dashHome.refresh', 'Refresh')}</span>
          </button>

          {/* Export PDF Button */}
          <button 
            onClick={exportPDF} 
            className="btn btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', fontSize: 13, height: 38, borderRadius: 8 }}
            title="Download PDF Report"
          >
            <Download size={14} />
            <span>{t('dashHome.exportPDF', 'Export PDF')}</span>
          </button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="dashboard-grid">
        {isB2C ? (
          <>
            <div className="stat-card">
              <div className="stat-label"><strong style={{ fontWeight: 900, color: '#0f172a' }}>{t('dashHome.totalB2CCustomers')}</strong></div>
              <div className="stat-value">{stats.customersCount}</div>
              <div className="stat-change up">{t('dashHome.growingActively')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label"><strong style={{ fontWeight: 900, color: '#0f172a' }}>{t('dashHome.monthlyRevenue')}</strong></div>
              <div className="stat-value">{profile?.currency || '$'}{stats.revenue.toLocaleString()}</div>
              <div className="stat-change up">{t('dashHome.fromLastMonth12')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label"><strong style={{ fontWeight: 900, color: '#0f172a' }}>{t('dashHome.activeTickets')}</strong></div>
              <div className="stat-value">{stats.ticketsCount}</div>
              <div className="stat-change up"><strong style={{ fontWeight: 900, color: '#0f172a' }}>{t('dashHome.responseNeeded')}</strong></div>
            </div>
            <div className="stat-card">
              <div className="stat-label"><strong style={{ fontWeight: 900, color: '#0f172a' }}>{t('dashHome.pendingReminders')}</strong></div>
              <div className="stat-value">{priorityTasks.length}</div>
              <div className="stat-change up" style={{ color: '#e11d48' }}>{t('dashHome.actionUrgently')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label"><strong style={{ fontWeight: 900, color: '#0f172a' }}>{t('dashHome.unpaidInvoices')}</strong></div>
              <div className="stat-value">{stats.pendingInvoicesCount}</div>
              <div className="stat-change down">{t('dashHome.collectPayments')}</div>
            </div>
            {/* Monthly Goal Progress Indicator Card */}
            <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div className="stat-label"><strong style={{ fontWeight: 900, color: '#0f172a' }}>🎯 {t('dashHome.revenueGoal', 'Monthly Goal')}</strong></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '8px 0' }}>
                <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
                  <svg width="44" height="44" viewBox="0 0 50 50">
                    <circle cx="25" cy="25" r="20" fill="transparent" stroke="#e2e8f0" strokeWidth="5" />
                    <circle 
                      cx="25" 
                      cy="25" 
                      r="20" 
                      fill="transparent" 
                      stroke="#ff5900" 
                      strokeWidth="5" 
                      strokeDasharray={`${2 * Math.PI * 20}`} 
                      strokeDashoffset={`${2 * Math.PI * 20 * (1 - Math.min(stats.revenue / revenueGoal, 1))}`} 
                      strokeLinecap="round" 
                      style={{ transition: 'stroke-dashoffset 0.8s ease' }} 
                      transform="rotate(-90 25 25)"
                    />
                  </svg>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#111827' }}>
                    {Math.round(Math.min((stats.revenue / revenueGoal) * 100, 999))}%
                  </div>
                </div>
                <div>
                  <div className="stat-value" style={{ fontSize: 16 }}>{profile?.currency || '$'}{revenueGoal.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{t('dashHome.goalTarget', 'Target Goal')}</div>
                </div>
              </div>
              <div className="stat-change up" style={{ color: stats.revenue >= revenueGoal ? '#10b981' : '#64748b', fontSize: 11 }}>
                {stats.revenue >= revenueGoal ? t('dashHome.goalAchieved', 'Goal Achieved! 🎉') : `${profile?.currency || '$'}{Math.max(0, revenueGoal - stats.revenue).toLocaleString()} remaining`}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="stat-card">
              <div className="stat-label">{t('dashHome.pipelineValue')}</div>
              <div className="stat-value">{profile?.currency || '$'}{stats.revenue.toLocaleString()}</div>
              <div className="stat-change up">{t('dashHome.fromLastMonth8')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t('dashHome.leadsCreated')}</div>
              <div className="stat-value">{stats.leadsCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t('dashHome.activeDeals')}</div>
              <div className="stat-value">{stats.opportunitiesCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t('dashHome.systemAlerts')}</div>
              <div className="stat-value">{priorityTasks.length}</div>
            </div>
            {/* Monthly Goal Progress Indicator Card */}
            <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div className="stat-label"><strong style={{ fontWeight: 900, color: '#0f172a' }}>🎯 {t('dashHome.revenueGoal', 'Monthly Goal')}</strong></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '8px 0' }}>
                <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
                  <svg width="44" height="44" viewBox="0 0 50 50">
                    <circle cx="25" cy="25" r="20" fill="transparent" stroke="#e2e8f0" strokeWidth="5" />
                    <circle 
                      cx="25" 
                      cy="25" 
                      r="20" 
                      fill="transparent" 
                      stroke="#ff5900" 
                      strokeWidth="5" 
                      strokeDasharray={`${2 * Math.PI * 20}`} 
                      strokeDashoffset={`${2 * Math.PI * 20 * (1 - Math.min(stats.revenue / revenueGoal, 1))}`} 
                      strokeLinecap="round" 
                      style={{ transition: 'stroke-dashoffset 0.8s ease' }} 
                      transform="rotate(-90 25 25)"
                    />
                  </svg>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#111827' }}>
                    {Math.round(Math.min((stats.revenue / revenueGoal) * 100, 999))}%
                  </div>
                </div>
                <div>
                  <div className="stat-value" style={{ fontSize: 16 }}>{profile?.currency || '$'}{revenueGoal.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{t('dashHome.goalTarget', 'Target Goal')}</div>
                </div>
              </div>
              <div className="stat-change up" style={{ color: stats.revenue >= revenueGoal ? '#10b981' : '#64748b', fontSize: 11 }}>
                {stats.revenue >= revenueGoal ? t('dashHome.goalAchieved', 'Goal Achieved! 🎉') : `${profile?.currency || '$'}{Math.max(0, revenueGoal - stats.revenue).toLocaleString()} remaining`}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="dashboard-grid-3">
        {/* Left Column containing Engagement chart & Lead conversion funnel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Revenue Chart */}
          <div className="card">
            <h3 style={{ marginBottom: 20 }}>{t('dashHome.engagementAnalysis')}</h3>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.03)' }} 
                    contentStyle={{ borderRadius: 8 }} 
                    formatter={(value) => [`${profile?.currency || '$'}${Number(value).toLocaleString()}`, t('dashHome.revenue')]}
                  />
                  <Bar dataKey="total" fill="#f37a23" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lead Funnel Chart */}
          <div className="card">
            <h3 style={{ marginBottom: 20 }}>{t('dashHome.funnel.title', 'Lead Conversion Funnel')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '10px 0' }}>
              {funnelData.map((stage, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#374151' }}>
                    <span>{stage.stage}</span>
                    <span style={{ color: '#6b7280' }}>{stage.value} leads ({stage.pct}%)</span>
                  </div>
                  <div style={{ height: 12, width: '100%', background: '#f3f4f6', borderRadius: 6, overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${stage.pct}%`, 
                        background: 'linear-gradient(90deg, #ff5900, #ff8237)', 
                        borderRadius: 6, 
                        transition: 'width 0.8s ease',
                        opacity: 1 - idx * 0.15
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column containing Tasks & Interactions feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>{t('dashHome.autoTrackedTasks')}</h3>
              <Bell size={16} color="#f37a23" />
            </div>
            {tasks.length > 0 ? (
              <div className="task-list">
                {tasks.map(t => (
                  <div key={t.id} className="task-item" style={{ borderLeft: `4px solid ${t.status === 'Overdue' ? '#dc2626' : '#f37a23'}` }}>
                    <div style={{ flex: 1 }}>
                      <div className="task-text" style={{ fontWeight: 700 }}>{t.title}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{t.task_type} • {t('dashHome.due')} {new Date(t.due_date).toLocaleDateString()}</div>
                    </div>
                    <button onClick={() => handleMarkComplete(t)} className="btn-icon text-success"><CheckCircle size={16} /></button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state"><p>{t('dashHome.zeroTasksPending')}</p></div>
            )}
          </div>

          <div className="card" style={{ flex: 1 }}>
            <h3 style={{ marginBottom: 20 }}>{t('dashHome.interactionHistory')}</h3>
            <div className="activity-list">
              {activities.map(a => (
                <div key={a.id} className="activity-item">
                  <div className="activity-dot" />
                  <div className="activity-content">
                    <div className="activity-text"><strong>{a.type}</strong>: {a.description}</div>
                    <div className="activity-time">{new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .activity-time { color: var(--text-muted); font-size: 11px; }
        .kanban-scroll-container::-webkit-scrollbar { height: 8px; }
        .kanban-scroll-container::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .kanban-scroll-container::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .kanban-scroll-container::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  )
}
