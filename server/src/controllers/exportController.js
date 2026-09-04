import { supabaseServer } from '../config/supabase.js'

export async function exportCsv(req, res, next) {
  try {
    const userId = req.userId
    const { module = 'leads' } = req.params

    const validModules = ['leads', 'accounts', 'contacts', 'opportunities', 'invoices', 'tasks', 'tickets']
    if (!validModules.includes(module)) {
      return res.status(400).json({ success: false, error: 'Invalid module specified for CSV export' })
    }

    const { data, error } = await supabaseServer
      .from(module)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    if (!data || data.length === 0) {
      return res.status(200).send('No records found')
    }

    // Convert JSON array to CSV format
    const headers = Object.keys(data[0]).filter(k => k !== 'custom_data')
    const csvRows = [
      headers.join(','),
      ...data.map(row => {
        return headers.map(header => {
          const val = row[header]
          if (val === null || val === undefined) return '""'
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
