import prisma from '../config/prisma.js'

export async function getDashboardMetrics(req, res, next) {
  try {
    const userId = req.userId
    const { range = 'this_month' } = req.query

    // Calculate dates
    const now = new Date()
    let startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    if (range === 'last_30_days') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    } else if (range === 'this_year') {
      startDate = new Date(now.getFullYear(), 0, 1)
    }

    const [
      totalLeads,
      deals,
      openTickets,
      pendingTasks,
      invoices
    ] = await Promise.all([
      prisma.lead.count({ where: { userId } }),
      prisma.opportunity.findMany({
        where: { userId },
        select: { id: true, stage: true, amount: true, probability: true }
      }),
      prisma.ticket.count({
        where: {
          userId,
          status: { in: ['open', 'pending'] }
        }
      }),
      prisma.task.count({
        where: {
          userId,
          status: { not: 'Completed' }
        }
      }),
      prisma.invoice.findMany({
        where: { userId },
        select: { id: true, amount: true, status: true, createdAt: true }
      })
    ])

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
          totalLeads,
          totalDeals: deals.length,
          totalPipelineValue: totalPipeline,
          paidRevenue,
          pendingRevenue,
          openTickets,
          pendingTasks
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
