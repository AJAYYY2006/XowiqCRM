import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { requireRole } from '../middleware/roleGuard.js'

import { checkHealth } from '../controllers/healthController.js'
import { getDashboardMetrics } from '../controllers/analyticsController.js'
import { listLeads, createLead } from '../controllers/leadsController.js'
import { listDeals } from '../controllers/dealsController.js'
import { exportCsv } from '../controllers/exportController.js'
import { handleIncomingWebhook } from '../controllers/webhooksController.js'

const apiRouter = Router()

// 1. Public Health & Status
apiRouter.get('/health', checkHealth)

// 2. Webhooks (Public / Authenticated by Secret)
apiRouter.post('/webhooks', handleIncomingWebhook)

// 3. Authenticated Routes Group
apiRouter.use(authMiddleware)

// Analytics & Dashboard Metrics
apiRouter.get('/analytics/dashboard', getDashboardMetrics)

// Leads Management
apiRouter.get('/leads', requireRole(['admin', 'manager', 'sales_rep', 'user', 'viewer']), listLeads)
apiRouter.post('/leads', requireRole(['admin', 'manager', 'sales_rep']), createLead)

// Deals & Opportunities
apiRouter.get('/deals', requireRole(['admin', 'manager', 'sales_rep', 'user', 'viewer']), listDeals)

// Data Exports (Protected)
apiRouter.get('/export/:module', requireRole(['admin', 'manager', 'sales_rep', 'b2c']), exportCsv)

export default apiRouter
