import { supabaseServer } from '../config/supabase.js'

export async function handleIncomingWebhook(req, res, next) {
  try {
    const { source = 'external', event, payload } = req.body
    console.log(`📥 [Webhook Received] Event: ${event} from ${source}`)

    // Record in audit logs
    if (event) {
      await supabaseServer.from('activities').insert([{
        user_id: req.userId || '00000000-0000-0000-0000-000000000000',
        type: `Webhook: ${event}`,
        description: `Webhook received from ${source}: ${JSON.stringify(payload).slice(0, 200)}`
      }]).catch(() => {})
    }

    res.json({
      success: true,
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    next(err)
  }
}
