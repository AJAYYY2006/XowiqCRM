import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { requireRole } from '../middleware/roleGuard.js'

import { checkHealth } from '../controllers/healthController.js'
import { getDashboardMetrics } from '../controllers/analyticsController.js'
import { listLeads, getLeadById, createLead, updateLead, deleteLead } from '../controllers/leadsController.js'
import { listDeals, getDealById, createDeal, updateDeal, deleteDeal } from '../controllers/dealsController.js'
import { listAccounts, getAccountById, createAccount, updateAccount, deleteAccount } from '../controllers/accountsController.js'
import { listContacts, getContactById, createContact, updateContact, deleteContact } from '../controllers/contactsController.js'
import { listInvoices, getInvoiceById, createInvoice, updateInvoice, deleteInvoice } from '../controllers/invoicesController.js'
import { listQuotes, getQuoteById, createQuote, updateQuote, deleteQuote } from '../controllers/quotesController.js'
import { listTasks, getTaskById, createTask, updateTask, deleteTask } from '../controllers/tasksController.js'
import { listTickets, getTicketById, createTicket, updateTicket, deleteTicket } from '../controllers/ticketsController.js'
import { listServices, createService, listCustomerServices, assignCustomerService } from '../controllers/servicesController.js'
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

// Accounts Management
apiRouter.get('/accounts', requireRole(['admin', 'manager', 'sales_rep', 'user', 'viewer']), listAccounts)
apiRouter.get('/accounts/:id', requireRole(['admin', 'manager', 'sales_rep', 'user', 'viewer']), getAccountById)
apiRouter.post('/accounts', requireRole(['admin', 'manager', 'sales_rep']), createAccount)
apiRouter.put('/accounts/:id', requireRole(['admin', 'manager', 'sales_rep']), updateAccount)
apiRouter.delete('/accounts/:id', requireRole(['admin']), deleteAccount)

// Contacts Management
apiRouter.get('/contacts', requireRole(['admin', 'manager', 'sales_rep', 'user', 'viewer']), listContacts)
apiRouter.get('/contacts/:id', requireRole(['admin', 'manager', 'sales_rep', 'user', 'viewer']), getContactById)
apiRouter.post('/contacts', requireRole(['admin', 'manager', 'sales_rep']), createContact)
apiRouter.put('/contacts/:id', requireRole(['admin', 'manager', 'sales_rep']), updateContact)
apiRouter.delete('/contacts/:id', requireRole(['admin']), deleteContact)

// Leads Management
apiRouter.get('/leads', requireRole(['admin', 'manager', 'sales_rep', 'user', 'viewer']), listLeads)
apiRouter.get('/leads/:id', requireRole(['admin', 'manager', 'sales_rep', 'user', 'viewer']), getLeadById)
apiRouter.post('/leads', requireRole(['admin', 'manager', 'sales_rep']), createLead)
apiRouter.put('/leads/:id', requireRole(['admin', 'manager', 'sales_rep']), updateLead)
apiRouter.delete('/leads/:id', requireRole(['admin']), deleteLead)

// Deals & Opportunities
apiRouter.get('/deals', requireRole(['admin', 'manager', 'sales_rep', 'user', 'viewer']), listDeals)
apiRouter.get('/deals/:id', requireRole(['admin', 'manager', 'sales_rep', 'user', 'viewer']), getDealById)
apiRouter.post('/deals', requireRole(['admin', 'manager', 'sales_rep']), createDeal)
apiRouter.put('/deals/:id', requireRole(['admin', 'manager', 'sales_rep']), updateDeal)
apiRouter.delete('/deals/:id', requireRole(['admin']), deleteDeal)

// Invoices Management
apiRouter.get('/invoices', requireRole(['admin', 'manager', 'sales_rep', 'user', 'viewer']), listInvoices)
apiRouter.get('/invoices/:id', requireRole(['admin', 'manager', 'sales_rep', 'user', 'viewer']), getInvoiceById)
apiRouter.post('/invoices', requireRole(['admin', 'manager', 'sales_rep']), createInvoice)
apiRouter.put('/invoices/:id', requireRole(['admin', 'manager', 'sales_rep']), updateInvoice)
apiRouter.delete('/invoices/:id', requireRole(['admin']), deleteInvoice)

// Quotes Management
apiRouter.get('/quotes', requireRole(['admin', 'manager', 'sales_rep', 'user', 'viewer']), listQuotes)
apiRouter.get('/quotes/:id', requireRole(['admin', 'manager', 'sales_rep', 'user', 'viewer']), getQuoteById)
apiRouter.post('/quotes', requireRole(['admin', 'manager', 'sales_rep']), createQuote)
apiRouter.put('/quotes/:id', requireRole(['admin', 'manager', 'sales_rep']), updateQuote)
apiRouter.delete('/quotes/:id', requireRole(['admin']), deleteQuote)

// Tasks Management
apiRouter.get('/tasks', requireRole(['admin', 'manager', 'sales_rep', 'user', 'viewer']), listTasks)
apiRouter.get('/tasks/:id', requireRole(['admin', 'manager', 'sales_rep', 'user', 'viewer']), getTaskById)
apiRouter.post('/tasks', requireRole(['admin', 'manager', 'sales_rep', 'agent']), createTask)
apiRouter.put('/tasks/:id', requireRole(['admin', 'manager', 'sales_rep', 'agent']), updateTask)
apiRouter.delete('/tasks/:id', requireRole(['admin']), deleteTask)

// Tickets Management
apiRouter.get('/tickets', requireRole(['admin', 'manager', 'sales_rep', 'user', 'viewer']), listTickets)
apiRouter.get('/tickets/:id', requireRole(['admin', 'manager', 'sales_rep', 'user', 'viewer']), getTicketById)
apiRouter.post('/tickets', requireRole(['admin', 'manager', 'sales_rep', 'agent']), createTicket)
apiRouter.put('/tickets/:id', requireRole(['admin', 'manager', 'sales_rep', 'agent']), updateTicket)
apiRouter.delete('/tickets/:id', requireRole(['admin']), deleteTicket)

// Services & Subscriptions
apiRouter.get('/services', requireRole(['admin', 'manager', 'sales_rep', 'user', 'viewer']), listServices)
apiRouter.post('/services', requireRole(['admin']), createService)
apiRouter.get('/services/assigned', requireRole(['admin', 'manager', 'sales_rep', 'user', 'viewer']), listCustomerServices)
apiRouter.post('/services/assigned', requireRole(['admin', 'manager', 'sales_rep']), assignCustomerService)

// Data Exports (Protected)
apiRouter.get('/export/:module', requireRole(['admin', 'manager', 'sales_rep', 'b2c']), exportCsv)

export default apiRouter
