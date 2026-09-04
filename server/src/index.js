import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import { config } from './config/env.js'
import apiRouter from './routes/apiRouter.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()

// 1. Security & Core Middleware
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: config.corsOrigin, credentials: true }))
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'))

// 2. API v1 Router
app.use('/api/v1', apiRouter)

// 3. Root Status Endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'XOWIQ CRM — Enterprise Fast API Server',
    status: 'running',
    version: '1.0.0',
    documentation: '/api/v1/health',
    timestamp: new Date().toISOString()
  })
})

// 4. 404 Catch-All
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Not Found: Cannot ${req.method} ${req.originalUrl}`
  })
})

// 5. Global Error Handler
app.use(errorHandler)

// 6. Start Server
const server = app.listen(config.port, () => {
  console.log(`\n⚡ ===================================================`)
  console.log(`🚀 XOWIQ CRM Fast API Server Running on Port ${config.port}`)
  console.log(`🌐 Health Check: http://localhost:${config.port}/api/v1/health`)
  console.log(`🔒 Environment:  ${config.nodeEnv}`)
  console.log(`⚡ ===================================================\n`)
})

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Gracefully shutting down server...')
  server.close(() => console.log('Process terminated.'))
})

export default app
