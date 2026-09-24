import prisma from '../config/prisma.js'

export async function exportCsv(req, res, next) {
  try {
    const userId = req.userId
    const { module = 'leads' } = req.params

    const validModules = {
      leads: 'lead',
      accounts: 'account',
      contacts: 'contact',
      opportunities: 'opportunity',
      deals: 'opportunity',
      invoices: 'invoice',
      quotes: 'quote',
      tasks: 'task',
      tickets: 'ticket',
      services: 'service'
    }

    const prismaModel = validModules[module.toLowerCase()]
    if (!prismaModel) {
      return res.status(400).json({
        success: false,
        error: `Invalid module '${module}'. Valid options: ${Object.keys(validModules).join(', ')}`
      })
    }

    // Query data using Prisma
    const data = await prisma[prismaModel].findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    })

    if (!data || data.length === 0) {
      return res.status(200).send('No records found')
    }

    // Convert objects to clean CSV format
    const headers = Object.keys(data[0]).filter(k => k !== 'customData' && k !== 'lineItems')
    const csvRows = [
      headers.join(','),
      ...data.map(row => {
        return headers.map(header => {
          const val = row[header]
          if (val === null || val === undefined) return '""'
          if (val instanceof Date) return `"${val.toISOString()}"`
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
          return `"${str.replace(/"/g, '""')}"`
        }).join(',')
      })
    ]

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename=xowiq_${module}_${Date.now()}.csv`)
    res.status(200).send(csvRows.join('\n'))
  } catch (err) {
    next(err)
  }
}
