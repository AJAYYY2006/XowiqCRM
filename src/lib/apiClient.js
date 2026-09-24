import { supabase } from './supabase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl
  }

  async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  }

  async request(endpoint, options = {}) {
    try {
      const headers = await this.getAuthHeaders()
      const url = `${this.baseUrl}${endpoint}`

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {})
        }
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || `HTTP ${response.status}: Request failed`)
      }

      return data
    } catch (err) {
      console.warn(`[API Client Warning: ${endpoint}]:`, err.message)
      throw err
    }
  }

  // 1. Health
  async checkHealth() {
    return this.request('/health')
  }

  // 2. Analytics & Dashboard
  async getDashboardAnalytics(range = 'this_month') {
    return this.request(`/analytics/dashboard?range=${range}`)
  }

  // 3. Accounts
  async getAccounts(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/accounts?${query}`)
  }

  async getAccountById(id) {
    return this.request(`/accounts/${id}`)
  }

  async createAccount(data) {
    return this.request('/accounts', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateAccount(id, data) {
    return this.request(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteAccount(id) {
    return this.request(`/accounts/${id}`, { method: 'DELETE' })
  }

  // 4. Contacts
  async getContacts(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/contacts?${query}`)
  }

  async createContact(data) {
    return this.request('/contacts', { method: 'POST', body: JSON.stringify(data) })
  }

  // 5. Leads
  async getLeads(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/leads?${query}`)
  }

  async getLeadById(id) {
    return this.request(`/leads/${id}`)
  }

  async createLead(leadData) {
    return this.request('/leads', { method: 'POST', body: JSON.stringify(leadData) })
  }

  async updateLead(id, data) {
    return this.request(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteLead(id) {
    return this.request(`/leads/${id}`, { method: 'DELETE' })
  }

  // 6. Deals & Opportunities
  async getDeals(stage) {
    const query = stage ? `?stage=${stage}` : ''
    return this.request(`/deals${query}`)
  }

  async getDealById(id) {
    return this.request(`/deals/${id}`)
  }

  async createDeal(data) {
    return this.request('/deals', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateDeal(id, data) {
    return this.request(`/deals/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteDeal(id) {
    return this.request(`/deals/${id}`, { method: 'DELETE' })
  }

  // 7. Invoices
  async getInvoices(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/invoices?${query}`)
  }

  async createInvoice(data) {
    return this.request('/invoices', { method: 'POST', body: JSON.stringify(data) })
  }

  // 8. Quotes
  async getQuotes(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/quotes?${query}`)
  }

  async createQuote(data) {
    return this.request('/quotes', { method: 'POST', body: JSON.stringify(data) })
  }

  // 9. Tasks
  async getTasks(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/tasks?${query}`)
  }

  async createTask(data) {
    return this.request('/tasks', { method: 'POST', body: JSON.stringify(data) })
  }

  // 10. Tickets
  async getTickets(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/tickets?${query}`)
  }

  async createTicket(data) {
    return this.request('/tickets', { method: 'POST', body: JSON.stringify(data) })
  }

  // 11. Services
  async getServices() {
    return this.request('/services')
  }

  async getAssignedServices() {
    return this.request('/services/assigned')
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
