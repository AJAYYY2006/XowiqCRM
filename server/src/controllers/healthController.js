import prisma from '../config/prisma.js'

export async function checkHealth(req, res) {
  const startTime = Date.now()
  let dbStatus = 'healthy'
  let dbLatencyMs = 0

  try {
    const dbStart = Date.now()
    // Test database connection through Prisma Client
    await prisma.$queryRaw`SELECT 1`
    dbLatencyMs = Date.now() - dbStart
  } catch (err) {
    dbStatus = 'unreachable: ' + err.message
  }

  res.json({
    status: 'online',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    responseTimeMs: Date.now() - startTime,
    orm: 'Prisma v6',
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs
    },
    version: '1.0.0-enterprise'
  })
}
