import { supabaseServer } from '../config/supabase.js'

export async function getDashboardMetrics(req, res, next) {
  try {
    const userId = req.userId
    const { range = 'this_month' } = req.query

    // Calculate dates
    const now = new Date()
    let startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    if (range === 'last_30_days') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    } else if (range === 'this_year') {
      startDate = new Date(now.getFullYear(), 0, 1).toISOString()
    }

    const [leadsRes, dealsRes, ticketsRes, tasksRes, invoicesRes] = await Promise.all([
      supabaseServer.from('leads').select('id, status', { count: 'exact' }).eq('user_id', userId),
      supabaseServer.from('opportunities').select('id, stage, amount, probability').eq('user_id', userId),
      supabaseServer.from('tickets').select('id, status, priority', { count: 'exact' }).eq('user_id', userId).in('status', ['open', 'pending']),
      supabaseServer.from('tasks').select('id, status, priority', { count: 'exact' }).eq('user_id', userId).neq('status', 'Completed'),
      supabaseServer.from('invoices').select('id, amount, status, created_at').eq('user_id', userId)
    ])

    const deals = dealsRes.data || []
    const invoices = invoicesRes.data || []

    const totalPipeline = deals.reduce((sum, d) => sum + (Number(d.amount) || 0), 0)
    const paidRevenue = invoices
      .filter(inv => (inv.status || '').toLowerCase() === 'paid')
      .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0)

    const pendingRevenue = invoices
      .filter(inv => (inv.status || '').toLowerCase() !== 'paid')
      .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0)

    res.json({
      success: true,
      data: {
        summary: {
          totalLeads: leadsRes.count || 0,
          totalDeals: deals.length,
          totalPipelineValue: totalPipeline,
          paidRevenue,
          pendingRevenue,
          openTickets: ticketsRes.count || 0,
          pendingTasks: tasksRes.count || 0
        },
        dealsByStage: deals.reduce((acc, d) => {
          const st = d.stage || 'prospecting'
          acc[st] = (acc[st] || 0) + 1
          return acc
        }, {}),
        timestamp: new Date().toISOString()
      }
    })
  } catch (err) {
    next(err)
  }
}
