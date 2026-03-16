import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import toast from 'react-hot-toast'

export default function DashboardHome({ session, profile }) {
  const [stats, setStats] = useState({
    revenue: 0,
    leadsCount: 0,
    opportunitiesCount: 0,
    ticketsCount: 0
  })
  const [tasks, setTasks] = useState([])
  const [activities, setActivities] = useState([])
  const [pipelineData, setPipelineData] = useState([])
  const [revenueData, setRevenueData] = useState([])
  const [loading, setLoading] = useState(true)

  const dashboardRef = useRef(null)

  useEffect(() => {
    fetchDashboardData()
  }, [session])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const userId = session.user.id
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      // 1. Leads this month
      const { count: leadsCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', startOfMonth)

      // 2. Opportunities this month & Revenue
      const { data: opps } = await supabase
        .from('opportunities')
        .select('*')
        .eq('user_id', userId)
      
      const oppsThisMonth = opps.filter(o => new Date(o.created_at) >= new Date(startOfMonth))
      const wonOpps = opps.filter(o => o.stage === 'closed')
      const totalRevenue = wonOpps.reduce((sum, o) => sum + Number(o.amount || 0), 0)

      // Pipeline Data
      const stages = ['prospecting', 'scoping', 'negotiation', 'legal', 'contract', 'closed']
      const pData = stages.map(s => ({
        name: s.charAt(0).toUpperCase() + s.slice(1),
        amount: opps.filter(o => o.stage === s).reduce((sum, o) => sum + Number(o.amount || 0), 0)
      }))

      // Revenue by month (Mock for visual, real would group by closed_date)
      const rData = [
        { name: 'Oct', total: totalRevenue * 0.4 },
        { name: 'Nov', total: totalRevenue * 0.7 },
        { name: 'Dec', total: totalRevenue * 0.9 },
        { name: 'Jan', total: totalRevenue * 0.5 },
        { name: 'Feb', total: totalRevenue * 0.8 },
        { name: 'Mar', total: totalRevenue },
      ]

      // 3. Pending Tickets
      const { count: ticketsCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['open', 'pending'])

      // 4. Pending Tasks
      const { data: pendingTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('due_date', { ascending: true })
        .limit(5)

      // 5. Recent Activities
      const { data: recentActivities } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(8)

      setStats({
        revenue: totalRevenue,
        leadsCount: leadsCount || 0,
        opportunitiesCount: oppsThisMonth.length,
        ticketsCount: ticketsCount || 0
      })
      
      setPipelineData(pData)
      setRevenueData(rData)
      setTasks(pendingTasks || [])
      setActivities(recentActivities || [])
    } catch (error) {
      console.error(error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const exportPDF = async () => {
    const toastId = toast.loading('Generating PDF report...')
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        backgroundColor: '#0a0f1e', // Match bg-primary
        logging: false
      })
      const imgData = canvas.toDataURL('image/jpeg', 1.0)
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`NexusCRM_Report_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('Report downloaded', { id: toastId })
      
      // Log activity
      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Report Downloaded',
        description: 'Dashboard PDF report was generated'
      }])
    } catch (error) {
      console.error(error)
      toast.error('Failed to generate PDF', { id: toastId })
    }
  }

  if (loading) return (
    <div className="loading-container">
      <div className="spinner" />
      <span>Loading your dashboard...</span>
    </div>
  )

  return (
    <div ref={dashboardRef} style={{ padding: '0 0 40px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {profile?.name?.split(' ')[0] || 'User'}! 👋</h1>
          <p className="page-subtitle">Here is what's happening with your business today.</p>
        </div>
        <button className="btn btn-primary" onClick={exportPDF}>
          <span></span> Generate PDF Report
        </button>
      </div>

      {/* Top Stats */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-label">Monthly Revenue</div>
          <div className="stat-value">${stats.revenue.toLocaleString()}</div>
          <div className="stat-change up">↑ 12% from last month</div>
          <div style={{ position:'absolute', top:24, right:24, opacity:0.1, fontSize:36 }}>💳</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Leads Created (This Month)</div>
          <div className="stat-value">{stats.leadsCount}</div>
          <div className="stat-change up">↑ 4% from last month</div>
          <div style={{ position:'absolute', top:24, right:24, opacity:0.1, fontSize:36 }}></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Opportunities Created</div>
          <div className="stat-value">{stats.opportunitiesCount}</div>
          <div className="stat-change down">↓ 2% from last month</div>
          <div style={{ position:'absolute', top:24, right:24, opacity:0.1, fontSize:36 }}></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Tickets</div>
          <div className="stat-value">{stats.ticketsCount}</div>
          <div className="stat-change up">Action required</div>
          <div style={{ position:'absolute', top:24, right:24, opacity:0.1, fontSize:36 }}></div>
        </div>
      </div>

      <div className="dashboard-grid-3">
        {/* Left Col - Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <h3 style={{ marginBottom: 20 }}>Revenue Growth</h3>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#1a2235', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 8, color: '#f1f5f9' }}
                  />
                  <Bar dataKey="total" fill="url(#colorTotal)" radius={[4, 4, 0, 0]} />
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 20 }}>Opportunity Pipeline ($)</h3>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData} layout="vertical" margin={{ left: 30 }}>
                  <XAxis type="number" stroke="#000000" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#000000" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#1a2235', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: 8, color: '#f1f5f9' }}
                    formatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {pipelineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={[
                        '#818cf8', '#60a5fa', '#fbbf24', '#c084fc', '#22d3ee', '#34d399'
                      ][index % 6]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Col - Lists */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ flex: 1 }}>
            <h3 style={{ marginBottom: 20 }}>Today's Tasks</h3>
            {tasks.length > 0 ? (
              <div className="task-list">
                {tasks.map(t => (
                  <div key={t.id} className="task-item">
                    <div className="task-checkbox" />
                    <div className="task-text">{t.title}</div>
                    {t.due_date && <div className="task-due">{new Date(t.due_date).toLocaleDateString()}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <div style={{ fontSize: 32, opacity: 0.5 }}></div>
                <p>All caught up for today!</p>
              </div>
            )}
          </div>

          <div className="card" style={{ flex: 1 }}>
            <h3 style={{ marginBottom: 20 }}>Recent Activities</h3>
            {activities.length > 0 ? (
              <div className="activity-list">
                {activities.map(a => (
                  <div key={a.id} className="activity-item">
                    <div className="activity-dot" />
                    <div className="activity-content">
                      <div className="activity-text">
                        <strong>{a.type}</strong>: {a.description}
                      </div>
                      <div className="activity-time">
                        {new Date(a.created_at).toLocaleDateString()} {new Date(a.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <div style={{ fontSize: 32, opacity: 0.5 }}></div>
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
