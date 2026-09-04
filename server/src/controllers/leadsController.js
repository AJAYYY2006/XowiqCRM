import { supabaseServer } from '../config/supabase.js'

export async function listLeads(req, res, next) {
  try {
    const userId = req.userId
    const { status, limit = 50, offset = 0, search } = req.query

    let query = supabaseServer
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1)

    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, count, error } = await query
    if (error) throw error

    res.json({
      success: true,
      data: data || [],
      pagination: {
        total: count || 0,
        limit: Number(limit),
        offset: Number(offset)
      }
    })
  } catch (err) {
    next(err)
  }
}

export async function createLead(req, res, next) {
  try {
    const userId = req.userId
    const { name, company, email, contact_number, status = 'new', source = 'API', custom_data = {} } = req.body

    if (!name) {
      return res.status(400).json({ success: false, error: 'Lead name is required' })
    }

    const { data, error } = await supabaseServer
      .from('leads')
      .insert([{
        user_id: userId,
        name,
        company,
        email,
        contact_number,
        status,
        source,
        custom_data
      }])
      .select()
      .single()

    if (error) throw error

    res.status(201).json({
      success: true,
      data
    })
  } catch (err) {
    next(err)
  }
}
