import { supabaseServer } from '../config/supabase.js'

export async function checkHealth(req, res) {
  const startTime = Date.now()
  let dbStatus = 'healthy'
  let dbLatencyMs = 0

  try {
    const dbStart = Date.now()
    const { error } = await supabaseServer.from('_migrations').select('count', { count: 'exact', head: true })
    dbLatencyMs = Date.now() - dbStart
    if (error) dbStatus = 'degraded: ' + error.message
  } catch (err) {
    dbStatus = 'unreachable: ' + err.message
  }

  res.json({
    status: 'online',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    responseTimeMs: Date.now() - startTime,
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs
    },
    version: '1.0.0-enterprise'
  })
}
