import { supabaseServer } from '../config/supabase.js'

export async function listDeals(req, res, next) {
  try {
    const userId = req.userId
    const { stage } = req.query

    let query = supabaseServer
      .from('opportunities')
      .select('*, accounts(account_name, email)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (stage) {
      query = query.eq('stage', stage)
    }

    const { data, error } = await query
    if (error) throw error

    res.json({
      success: true,
      data: data || []
    })
  } catch (err) {
    next(err)
  }
}
