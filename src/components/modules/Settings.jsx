import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Trash2, Edit2, Plus, Settings as SettingsIcon, Package } from 'lucide-react'

export default function SettingsPage({ session, profile }) {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [activeTab, setActiveTab] = useState('catalog')

  const [formData, setFormData] = useState({
    service_name: '', price: 0, description: '', status: 'active'
  })

  // Automation config
  const [autoConfig, setAutoConfig] = useState({
    welcome_days: 1,
    checkin_days: 7,
    renewal_days: 30,
    enable_welcome: true,
    enable_checkin: true,
    enable_renewal: true,
    enable_payment_followup: true,
    auto_invoice: true
  })

  useEffect(() => {
    fetchServices()
    loadAutoConfig()
  }, [session])

  const fetchServices = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.warn('Services table query failed:', error.message)
        setServices([])
      } else {
        setServices(data || [])
      }
    } catch (error) {
      console.warn('Failed to load services')
    } finally {
      setLoading(false)
    }
  }

  const loadAutoConfig = () => {
    try {
      const saved = localStorage.getItem(`autoConfig_${session.user.id}`)
      if (saved) setAutoConfig(JSON.parse(saved))
    } catch {}
  }

  const saveAutoConfig = () => {
    localStorage.setItem(`autoConfig_${session.user.id}`, JSON.stringify(autoConfig))
    toast.success('Automation settings saved!')
  }

  const handleOpenModal = (service = null) => {
    if (service) {
      setEditingService(service)
      setFormData({
        service_name: service.service_name,
        price: service.price || 0,
        description: service.description || '',
        status: service.status || 'active'
      })
    } else {
      setEditingService(null)
      setFormData({ service_name: '', price: 0, description: '', status: 'active' })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingService ? 'Updating service...' : 'Adding service...')
    try {
      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update({
            ...formData,
            price: Number(formData.price) || 0
          })
          .eq('id', editingService.id)
        if (error) throw error
        toast.success('Service updated', { id: toastId })
      } else {
        const { error } = await supabase
          .from('services')
          .insert([{
            ...formData,
            price: Number(formData.price) || 0,
            user_id: session.user.id
          }])
        if (error) throw error
        toast.success('Service added', { id: toastId })
      }
      setIsModalOpen(false)
      fetchServices()
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleDelete = async (service) => {
    if (!confirm(`Delete service "${service.service_name}"?`)) return
    const toastId = toast.loading('Deleting...')
    try {
      await supabase.from('services').delete().eq('id', service.id)
      toast.success('Service deleted', { id: toastId })
      fetchServices()
    } catch (error) {
      toast.error('Failed to delete', { id: toastId })
    }
  }

  if (loading) return <div className="loading-container"><div className="spinner"/></div>

  return (
    <div className="settings-page anim-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title"><SettingsIcon size={24} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />Settings</h1>
          <p className="page-subtitle">Configure your catalog, automations, and system defaults.</p>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 24, borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 4 }}>
        <button className={`tab ${activeTab === 'catalog' ? 'active' : ''}`} onClick={() => setActiveTab('catalog')}>
          <Package size={18} /> Services Catalog
        </button>
        <button className={`tab ${activeTab === 'automation' ? 'active' : ''}`} onClick={() => setActiveTab('automation')}>
          ⚡ Automations
        </button>
        <button className={`tab ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>
          ⚙️ General
        </button>
      </div>

      <div className="tab-pane">
        {activeTab === 'catalog' && (
          <div className="table-container">
            <div className="table-header">
              <h2 className="table-title">Services Catalog ({services.length})</h2>
              <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                <Plus size={16} /> Add Service
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Service Name</th>
                  <th>Price</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No services found.</td>
                  </tr>
                ) : (
                  services.map(s => (
                    <tr key={s.id}>
                      <td className="fw-bold">{s.service_name}</td>
                      <td className="fw-bold">{profile?.currency || '$'}{Number(s.price).toLocaleString()}</td>
                      <td>{s.description || '-'}</td>
                      <td>
                        <span className={`badge ${s.status === 'active' ? 'badge-paid' : 'badge-overdue'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn-icon" onClick={() => handleOpenModal(s)}><Edit2 size={16} /></button>
                        <button className="btn-icon text-danger" onClick={() => handleDelete(s)}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'automation' && (
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>⚡ Automation Rules</h2>
            <div style={{ display: 'grid', gap: 20 }}>
              <ToggleRow label="Enable Welcome Follow-up" checked={autoConfig.enable_welcome} onChange={v => setAutoConfig({...autoConfig, enable_welcome: v})} />
              <div suppressHydrationWarning>
                <label className="form-label">Days delay:</label>
                <input type="number" className="form-input" style={{ width: 100 }} value={autoConfig.welcome_days} onChange={e => setAutoConfig({...autoConfig, welcome_days: e.target.value})} />
              </div>
              <hr style={{ border: '0.5px solid #f1f5f9' }} />
              <ToggleRow label="Enable Renewal Notifications" checked={autoConfig.enable_renewal} onChange={v => setAutoConfig({...autoConfig, enable_renewal: v})} />
              <button className="btn btn-primary mt-4" onClick={saveAutoConfig}>Save Rules</button>
            </div>
          </div>
        )}

        {activeTab === 'general' && (
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>⚙️ System Settings</h2>
            <div className="form-group" style={{ maxWidth: 400 }}>
              <label className="form-label">Global Currency Symbol</label>
              <select 
                className="form-input" 
                value={profile?.currency || '$'} 
                onChange={async (e) => {
                  const val = e.target.value
                  const tid = toast.loading('Updating...')
                  const { error } = await supabase.from('profiles').update({ currency: val }).eq('id', session.user.id)
                  if (error) toast.error('Failed', { id: tid })
                  else {
                    toast.success('Currency Updated!', { id: tid })
                    window.location.reload()
                  }
                }}
              >
                <option value="$">$ (USD/Global)</option>
                <option value="₹">₹ (INR)</option>
                <option value="€">€ (EUR)</option>
                <option value="£">£ (GBP)</option>
                <option value="¥">¥ (JPY/CNY)</option>
              </select>
              <p className="text-muted mt-2" style={{ fontSize: 12 }}>This affects all dashboard tiles, quotes, and PDF invoices.</p>
            </div>
          </div>
        )}
      </div>

      {/* Service Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingService ? 'Edit Service' : 'Add New Service'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Service Name *</label>
                  <input required className="form-input" value={formData.service_name} onChange={e => setFormData({...formData, service_name: e.target.value})} placeholder="e.g. Haircut, Consultation, Training" />
                </div>
                <div className="form-group">
                  <label className="form-label">Price ({profile?.currency || '$'})</label>
                  <input type="number" min="0" step="0.01" className="form-input" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Brief description of this service..." rows={3} />
                </div>
              </div>
              <div className="form-actions" style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingService ? 'Save Changes' : 'Add Service'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22 }}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
        <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: checked ? '#f37a23' : '#ccc', borderRadius: 22, transition: '0.3s' }}>
          <span style={{ position: 'absolute', height: 16, width: 16, left: checked ? 20 : 3, bottom: 3, backgroundColor: '#fff', borderRadius: '50%', transition: '0.3s' }} />
        </span>
      </label>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
    </div>
  )
}
