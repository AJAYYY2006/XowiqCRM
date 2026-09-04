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

  // Health check
  async checkHealth() {
    return this.request('/health')
  }

  // Analytics
  async getDashboardAnalytics(range = 'this_month') {
    return this.request(`/analytics/dashboard?range=${range}`)
  }

  // Leads
  async getLeads(params = {}) {
    const query = new URLSearchParams(params).toString()
    return this.request(`/leads?${query}`)
  }

  async createLead(leadData) {
    return this.request('/leads', {
      method: 'POST',
      body: JSON.stringify(leadData)
    })
  }

  // Deals
  async getDeals(stage) {
    const query = stage ? `?stage=${stage}` : ''
    return this.request(`/deals${query}`)
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
