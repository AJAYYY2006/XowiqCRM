import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import toast from 'react-hot-toast'
import { AlertCircle, Bell, CheckCircle, Clock, Calendar, Mail, MessageSquare } from 'lucide-react'

export default function DashboardHome({ session, profile }) {
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

  const dashboardRef = useRef(null)

  const companyType = session.user.user_metadata?.companyType || 'B2B'
  const isB2C = companyType === 'B2C'
  const isStageTrackingEnabled = session.user.user_metadata?.b2cStageTrackingEnabled === true

  useEffect(() => {
    fetchDashboardData()
  }, [session])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const userId = session.user.id
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      // 1. Stats fetches
      const fetchMonthData = async () => {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        
        let [leadsRes, oppsRes, ticketsRes, tasksRes, activitiesRes, accountsRes, quotesRes] = await Promise.all([
          supabase.from('leads').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', startOfMonth),
          supabase.from('opportunities').select('*').eq('user_id', userId),
          supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('user_id', userId).in('status', ['open', 'pending']),
          supabase.from('tasks').select('*').eq('user_id', userId).neq('status', 'Completed').order('due_date', { ascending: true }),
          supabase.from('activities').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(8),
          supabase.from('accounts').select('*', { count: 'exact' }).eq('user_id', userId),
          supabase.from('quotes').select('id, total_price, status, created_at').eq('user_id', userId)
        ])

        const opps = oppsRes.data || []
        const quotes = quotesRes.data || []
        
        // REVENUE CALCULATION
        let totalRevenue = 0
        if (isB2C) {
          // B2C: Sum of all PAID invoices created in the current calendar month
          const paidMonthQuotes = quotes.filter(q => 
            q.status === 'Paid' && 
            new Date(q.created_at) >= new Date(startOfMonth)
          )
          totalRevenue = paidMonthQuotes.reduce((sum, q) => sum + Number(q.total_price || 0), 0)
        } else {
          // B2B: Use Opportunity Won status
          totalRevenue = opps.filter(o => o.stage === 'closed').reduce((sum, o) => sum + Number(o.amount || 0), 0)
        }

        const pTasks = (tasksRes.data || []).filter(t => {
          const dueDate = t.due_date ? new Date(t.due_date) : null
          if (isB2C && t.task_type === 'Renewal' && t.status !== 'Completed') return true
          const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000)
          return (dueDate && dueDate <= fortyEightHoursFromNow) || t.status === 'Overdue'
        })

        setStats({
          revenue: totalRevenue,
          leadsCount: leadsRes.count || 0,
          opportunitiesCount: opps.filter(o => new Date(o.created_at) >= new Date(startOfMonth)).length,
          ticketsCount: ticketsRes.count || 0,
          customersCount: accountsRes.count || 0,
          pendingInvoicesCount: quotes.filter(q => q.status !== 'Paid').length
        })

        setTasks((tasksRes.data || []).slice(0, 5))
        setPriorityTasks(pTasks)
        setActivities(activitiesRes.data || [])
        
      // MOCK TREND DATA (scaled to new revenue)
        setRevenueData([
          { name: 'Oct', total: totalRevenue * 0.4 },
          { name: 'Nov', total: totalRevenue * 0.7 },
          { name: 'Dec', total: totalRevenue * 0.9 },
          { name: 'Jan', total: totalRevenue * 0.5 },
          { name: 'Feb', total: totalRevenue * 0.8 },
          { name: 'Apr', total: totalRevenue }, // Current
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
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleTaskAction = async (task, action) => {
    try {
      if (action === 'done') {
        await supabase.from('tasks').update({ status: 'Completed' }).eq('id', task.id)
        toast.success('Reminder cleared')
      } else if (action === 'snooze') {
        const nextDate = new Date()
        nextDate.setDate(nextDate.getDate() + 1)
        await supabase.from('tasks').update({ due_date: nextDate.toISOString(), status: 'Pending' }).eq('id', task.id)
        toast.success('Snoozed to tomorrow')
      }
      fetchDashboardData() // Reload everything to update badge & lists instantly
    } catch { toast.error('Action failed') }
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
      toast.error('Failed to update stage')
      fetchDashboardData() // revert
    }
  }

  const handleMarkComplete = async (task) => {
    const toastId = toast.loading('Updating task...')
    try {
      await supabase.from('tasks').update({ status: 'Completed', updated_at: new Date().toISOString() }).eq('id', task.id)
      
      // Log activity
      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Task Completed',
        description: `Directly from dashboard: ${task.title}`
      }])

      toast.success('Task completed!', { id: toastId })
      fetchDashboardData()
    } catch (error) {
      toast.error('Failed to update task', { id: toastId })
    }
  }

  const exportPDF = async () => {
    const toastId = toast.loading('Generating PDF report...')
    try {
      const canvas = await html2canvas(dashboardRef.current, { scale: 2, backgroundColor: '#0a0f1e', logging: false })
      const imgData = canvas.toDataURL('image/jpeg', 1.0)
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Antigravity_Report_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('Report downloaded', { id: toastId })
    } catch (error) {
      toast.error('Failed to generate PDF')
    }
  }

  if (loading) return <div className="loading-container"><div className="spinner" /><span>Loading Antigravity Dashboard...</span></div>

  return (
    <div ref={dashboardRef} style={{ padding: '0 0 40px', maxWidth: '100%', overflowX: 'hidden' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {profile?.name?.split(' ')[0] || 'User'}! 👋</h1>
          <p className="page-subtitle">Your proactive {isB2C ? 'B2C' : 'B2B'} engagement center is ready.</p>
        </div>
      </div>



      {/* Top Stats */}
      <div className="dashboard-grid">
        {isB2C ? (
          <>
            <div className="stat-card">
              <div className="stat-label"><strong style={{ fontWeight: 900, color: '#0f172a' }}>Total B2C Customers</strong></div>
              <div className="stat-value">{stats.customersCount}</div>
              <div className="stat-change up">Growing actively</div>
            </div>
            <div className="stat-card">
              <div className="stat-label"><strong style={{ fontWeight: 900, color: '#0f172a' }}>Monthly B2C Revenue</strong></div>
              <div className="stat-value">{profile?.currency || '$'}{stats.revenue.toLocaleString()}</div>
              <div className="stat-change up">↑ 12% from last month</div>
            </div>
            <div className="stat-card">
              <div className="stat-label"><strong style={{ fontWeight: 900, color: '#0f172a' }}>Active Tickets</strong></div>
              <div className="stat-value">{stats.ticketsCount}</div>
              <div className="stat-change up"><strong style={{ fontWeight: 900, color: '#0f172a' }}>Response needed</strong></div>
            </div>
            <div className="stat-card">
              <div className="stat-label"><strong style={{ fontWeight: 900, color: '#0f172a' }}>Pending Service Reminders</strong></div>
              <div className="stat-value">{priorityTasks.length}</div>
              <div className="stat-change up" style={{ color: '#e11d48' }}>Action urgently needed</div>
            </div>
            <div className="stat-card">
              <div className="stat-label"><strong style={{ fontWeight: 900, color: '#0f172a' }}>Unpaid B2C Invoices</strong></div>
              <div className="stat-value">{stats.pendingInvoicesCount}</div>
              <div className="stat-change down">Collect payments</div>
            </div>
          </>
        ) : (
          <>
            <div className="stat-card">
              <div className="stat-label">Pipeline Value</div>
              <div className="stat-value">{profile?.currency || '$'}{stats.revenue.toLocaleString()}</div>
              <div className="stat-change up">↑ 8% from last month</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Leads Created</div>
              <div className="stat-value">{stats.leadsCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active Opportunities</div>
              <div className="stat-value">{stats.opportunitiesCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">System Alerts</div>
              <div className="stat-value">{priorityTasks.length}</div>
            </div>
          </>
        )}
      </div>



      <div className="dashboard-grid-3">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <h3 style={{ marginBottom: 20 }}>Engagement Analysis</h3>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
                    contentStyle={{ borderRadius: 8 }} 
                    formatter={(value) => [`${profile?.currency || '$'}${Number(value).toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="total" fill="#f37a23" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Behavior 1: Auto-Tracked Tasks</h3>
              <Bell size={16} color="#f37a23" />
            </div>
            {tasks.length > 0 ? (
              <div className="task-list">
                {tasks.map(t => (
                  <div key={t.id} className="task-item" style={{ borderLeft: `4px solid ${t.status === 'Overdue' ? '#dc2626' : '#f37a23'}` }}>
                    <div style={{ flex: 1 }}>
                      <div className="task-text" style={{ fontWeight: 700 }}>{t.title}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{t.task_type} • Due: {new Date(t.due_date).toLocaleDateString()}</div>
                    </div>
                    <button onClick={() => handleMarkComplete(t)} className="btn-icon text-success"><CheckCircle size={16} /></button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state"><p>Zero tasks pending! Proactive mode engaged.</p></div>
            )}
          </div>

          <div className="card" style={{ flex: 1 }}>
            <h3 style={{ marginBottom: 20 }}>Interaction History</h3>
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
