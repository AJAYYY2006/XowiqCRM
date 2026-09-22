import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import {
  Plus, Edit2, Trash2, Package, DollarSign, Clock, Save,
  Settings2, Zap, Layers, UploadCloud, Search, X,
  LayoutGrid, List, Activity, Users, ArrowRight
} from 'lucide-react'
import BulkUploadModal from '../ui/BulkUploadModal'
import { useTheme } from '../../contexts/ThemeContext'

// ── Currency conversion ────────────────────────────────────────────────────
// All prices are stored in the DB in INR (the app's default base currency).
// These rates convert 1 INR → target currency.
const INR_RATES = {
  '₹': 1,           // Indian Rupee  (base — no conversion)
  '$': 0.012,        // US Dollar     (1 INR ≈ 0.012 USD)
  '€': 0.011,        // Euro          (1 INR ≈ 0.011 EUR)
  '£': 0.0095,       // British Pound (1 INR ≈ 0.0095 GBP)
  '¥': 1.77,         // JPY/CNY       (1 INR ≈ 1.77 JPY)
}

/**
 * Convert a price stored in INR to the user's selected display currency.
 * Returns a locale-formatted string, e.g. "1,234.56"
 */
function convertPrice(amountInINR, currencySymbol) {
  const rate = INR_RATES[currencySymbol] ?? 1
  const converted = Number(amountInINR) * rate
  const decimals = ['¥'].includes(currencySymbol) ? 0 : 2
  return converted.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export default function Services({ session, profile }) {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  const userIds = profile?.teamUserIds || [session.user.id]

  // Data state
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [isImportOpen, setIsImportOpen] = useState(false)

  // Navigation & View Mode
  const [activeTab, setActiveTab] = useState('catalog') // 'catalog' | 'pipelines'
  const [viewMode, setViewMode] = useState('grid')       // 'grid' | 'table'
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')   // 'all' | 'Instant' | 'Multi-Stage'

  // Service form data
  const [formData, setFormData] = useState({
    service_name: '',
    price: 0,
    reminder_days: 30,
    description: '',
    status: 'active',
    service_type: 'Instant'
  })

  // Stage Builder State
  const [stages, setStages] = useState([])
  const [isStageModalOpen, setIsStageModalOpen] = useState(false)
  const [editingStage, setEditingStage] = useState(null)
  const [stageFormData, setStageFormData] = useState({ name: '', color: '#ff5900' })
  const [accounts, setAccounts] = useState([])
  const [animatingCards, setAnimatingCards] = useState({})
  const [stageHistory, setStageHistory] = useState([])

  const isAdmin = ['admin', 'administrator'].includes((session?.user?.user_metadata?.role || profile?.role || '').toLowerCase())

  useEffect(() => {
    fetchServices()
    fetchStages()
    fetchAccounts()
    fetchStageHistory()
  }, [session, profile])

  const fetchStages = async () => {
    try {
      const { data, error } = await supabase.from('b2c_stages').select('*').order('order_index', { ascending: true })
      if (error) throw error
      setStages(data || [])
    } catch (e) {
      console.error('Failed to load stages:', e)
    }
  }

  const fetchAccounts = async () => {
    try {
      const { data: accsData, error: accErr } = await supabase
        .from('accounts')
        .select('*')
        .in('user_id', userIds)

      if (accErr) throw accErr

      const accountIds = (accsData || []).map(a => a.id)
      if (accountIds.length === 0) {
        setAccounts([])
        return
      }

      const { data: csData } = await supabase
        .from('customer_services')
        .select('*, services(service_name)')
        .in('account_id', accountIds)

      const mappedAccounts = (accsData || []).map(acc => {
        const myServices = (csData || []).filter(
          cs => String(cs.account_id) === String(acc.id)
        )
        return { ...acc, customer_services: myServices }
      })

      setAccounts(mappedAccounts)
    } catch (e) {
      console.error('Failed to load accounts for stage builder', e)
    }
  }

  const fetchStageHistory = async () => {
    try {
      const { data } = await supabase
        .from('b2c_customer_stages')
        .select('id, moved_at, customer_id, b2c_stages:stage_id(name, color), services:service_id(service_name)')
        .order('moved_at', { ascending: false })
        .limit(20)
      
      if (data && data.length > 0) {
        const customerIds = [...new Set(data.map(d => d.customer_id).filter(Boolean))]
        const { data: accs } = await supabase.from('accounts').select('id, account_name').in('id', customerIds)
        const accMap = {}
        ;(accs || []).forEach(a => { accMap[String(a.id)] = a.account_name })
        const enriched = data.map(d => ({
          ...d,
          customer_name: accMap[String(d.customer_id)] || `Customer #${d.customer_id}`
        }))
        setStageHistory(enriched)
      } else {
        setStageHistory([])
      }
    } catch (e) {
      console.error('Failed to fetch stage history', e)
    }
  }

  const fetchServices = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setServices(data || [])
    } catch (error) {
      console.error('Failed to load services:', error)
      toast.error('Failed to load services catalog')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (service = null) => {
    if (service) {
      setEditingService(service)
      setFormData({
        service_name: service.service_name,
        price: service.price || 0,
        reminder_days: service.reminder_days || 30,
        description: service.description || '',
        status: service.status || 'active',
        service_type: service.service_type || 'Multi-Stage'
      })
    } else {
      setEditingService(null)
      setFormData({
        service_name: '',
        price: 0,
        reminder_days: 30,
        description: '',
        status: 'active',
        service_type: 'Instant'
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingService ? 'Updating service...' : 'Adding service...')
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        reminder_days: Number(formData.reminder_days),
        user_id: session.user.id
      }

      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update(payload)
          .eq('id', editingService.id)
        if (error) throw error
        toast.success('Service updated', { id: toastId })
        
        // Sync reminders if name or reminder days changed
        if (editingService.service_name !== payload.service_name || editingService.reminder_days !== payload.reminder_days) {
          try {
            const { data: linkedServices } = await supabase
              .from('customer_services')
              .select('*, accounts(account_name)')
              .eq('service_id', editingService.id)
              .not('task_id', 'is', null)
            
            if (linkedServices && linkedServices.length > 0) {
              for (const entry of linkedServices) {
                const sDate = new Date(entry.assigned_date)
                const newReminderDate = new Date(sDate)
                newReminderDate.setDate(newReminderDate.getDate() + Number(payload.reminder_days))
                
                await supabase.from('tasks').update({
                  title: `Service Reminder: ${payload.service_name} for ${entry.accounts?.account_name || 'Customer'}`,
                  due_date: newReminderDate.toISOString()
                }).eq('id', entry.task_id)
              }
              toast.success(`Synced ${linkedServices.length} linked reminder(s)`)
            }
          } catch (e) {
            console.error('Failed to sync linked reminders', e)
          }
        }
      } else {
        const { error } = await supabase
          .from('services')
          .insert([payload])
        if (error) throw error
        toast.success('Service added to catalog', { id: toastId })
      }
      
      setIsModalOpen(false)
      fetchServices()
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleDelete = async (service) => {
    if (!confirm(`Delete service "${service.service_name}"? This might affect existing customer history.`)) return
    const toastId = toast.loading('Deleting...')
    try {
      const { error } = await supabase.from('services').delete().eq('id', service.id)
      if (error) throw error
      toast.success('Service deleted', { id: toastId })
      fetchServices()
    } catch (error) {
      toast.error('Failed to delete service', { id: toastId })
    }
  }

  // --- STAGE LOGIC ---
  const handleOpenStageModal = (stage = null) => {
    if (stage) {
      setEditingStage(stage)
      setStageFormData({
        name: stage.name,
        color: stage.color || '#ff5900'
      })
    } else {
      setEditingStage(null)
      setStageFormData({
        name: '',
        color: '#ff5900'
      })
    }
    setIsStageModalOpen(true)
  }

  const handleStageSubmit = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingStage ? 'Updating stage...' : 'Adding stage...')
    try {
      const payload = {
        name: stageFormData.name,
        color: stageFormData.color
      }

      if (editingStage) {
        const { error } = await supabase.from('b2c_stages').update(payload).eq('id', editingStage.id)
        if (error) throw error
        toast.success('Stage updated', { id: toastId })
      } else {
        payload.order_index = stages.length
        payload.user_id = session.user.id
        const { error } = await supabase.from('b2c_stages').insert([payload])
        if (error) throw error
        toast.success('Stage added', { id: toastId })
      }
      
      setIsStageModalOpen(false)
      fetchStages()
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleDeleteStage = async (stage) => {
    if (!confirm(`Delete stage "${stage.name}"? Customers in this stage will lose their specific tracking stage.`)) return
    const toastId = toast.loading('Deleting...')
    try {
      const { error } = await supabase.from('b2c_stages').delete().eq('id', stage.id)
      if (error) throw error
      toast.success('Stage deleted', { id: toastId })
      fetchStages()
    } catch (error) {
      toast.error('Failed to delete stage', { id: toastId })
    }
  }

  const handleDragStartCustomer = (e, accountId, sourceStageId) => {
    e.dataTransfer.setData('accountId', accountId)
    e.dataTransfer.setData('sourceStageId', sourceStageId)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDropCustomer = async (e, destStageId) => {
    e.preventDefault()
    const accountId = e.dataTransfer.getData('accountId')
    const sourceStageId = e.dataTransfer.getData('sourceStageId')
    if (!accountId || sourceStageId === destStageId) return

    const destStage = stages.find(s => s.id === destStageId)
    const sourceStage = stages.find(s => s.id === sourceStageId)
    
    const isForward = (destStage?.order_index || 0) > (sourceStage?.order_index || 0)
    const animationClass = isForward ? 'flyUp' : 'flyBack'

    setAnimatingCards(prev => ({ ...prev, [accountId]: animationClass }))

    setTimeout(async () => {
      const updatedAccounts = accounts.map(a => 
        a.id === accountId ? { ...a, b2c_stage_id: destStageId } : a
      )
      setAccounts(updatedAccounts)
      
      setAnimatingCards(prev => ({ ...prev, [accountId]: 'flyIn' }))
      
      setTimeout(() => {
        setAnimatingCards(prev => {
          const newState = { ...prev }
          delete newState[accountId]
          return newState
        })
      }, 500)

      try {
        await supabase.from('accounts').update({ b2c_stage_id: destStageId }).eq('id', accountId)

        const customer = accounts.find(a => a.id === accountId)
        const serviceId = customer?.customer_services?.[0]?.service_id || null

        await supabase.from('b2c_customer_stages').insert({
          customer_id: String(accountId),
          stage_id: destStageId,
          service_id: serviceId,
          moved_at: new Date().toISOString()
        })
        
        fetchStageHistory()
      } catch (err) {
        toast.error('Failed to update stage')
        fetchAccounts()
      }
    }, 480)
  }

  if (loading) return <div className="loading-container"><div className="spinner" /></div>

  const instantCount = services.filter(s => (s.service_type || 'Multi-Stage') === 'Instant').length
  const multiCount = services.filter(s => (s.service_type || 'Multi-Stage') === 'Multi-Stage').length
  const totalEnrolled = accounts.filter(a => (a.customer_services || []).length > 0).length

  const filteredServices = services.filter(svc => {
    const query = searchQuery.trim().toLowerCase()
    const matchesSearch = !query ||
      (svc.service_name || '').toLowerCase().includes(query) ||
      (svc.description || '').toLowerCase().includes(query)
    const type = svc.service_type || 'Multi-Stage'
    const matchesType = filterType === 'all' || type === filterType
    return matchesSearch && matchesType
  })

  const getEnrolledCount = (serviceId) => {
    return accounts.filter(a =>
      (a.customer_services || []).some(cs => String(cs.service_id) === String(serviceId))
    ).length
  }

  return (
    <div className="services-page" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      {/* ── Page Header ── */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <Package size={26} style={{ color: '#ff5900' }} />
            <span>{t('modules.services.title', 'Services & Pipelines')}</span>
          </h1>
          <p className="page-subtitle" style={{ margin: '4px 0 0', color: isDark ? '#94a3b8' : '#64748b' }}>
            {t('modules.services.subtitle', 'Manage service catalog, pricing, reminder cycles, and customer stage pipelines')}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setIsImportOpen(true)}
            style={{
              background: isDark ? '#1e293b' : '#ffffff',
              border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
              color: isDark ? '#f8fafc' : '#334155',
              padding: '8px 16px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <UploadCloud size={16} style={{ color: '#ff5900' }} />
            <span>{t('bulkImport.button', 'Import CSV')}</span>
          </button>

          {activeTab === 'pipelines' ? (
            <button
              className="btn btn-primary"
              onClick={() => handleOpenStageModal()}
              style={{
                padding: '8px 18px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, #ff5900 0%, #ff7324 100%)',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 4px 14px rgba(255, 89, 0, 0.3)'
              }}
            >
              <Plus size={16} />
              <span>Add New Stage</span>
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => handleOpenModal()}
              style={{
                padding: '8px 18px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, #ff5900 0%, #ff7324 100%)',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 4px 14px rgba(255, 89, 0, 0.3)'
              }}
            >
              <Plus size={16} />
              <span>{t('modules.services.addNewService', 'Add Service')}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Summary Stats Cards (Clickable Quick Filters) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 14,
        marginBottom: 20
      }}>
        {/* Total Services */}
        <div
          onClick={() => { setActiveTab('catalog'); setFilterType('all') }}
          style={{
            background: isDark ? '#1e293b' : '#ffffff',
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            cursor: 'pointer',
            boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 6px rgba(0,0,0,0.03)',
            transition: 'transform 0.15s ease, border-color 0.15s ease'
          }}
          className="metric-stat-card"
        >
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #ff5900, #ff8237)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0
          }}>
            <Package size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Services
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
              {services.length}
            </div>
          </div>
        </div>

        {/* Multi-Stage (Pipeline) */}
        <div
          onClick={() => { setActiveTab('catalog'); setFilterType('Multi-Stage') }}
          style={{
            background: isDark ? '#1e293b' : '#ffffff',
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            cursor: 'pointer',
            boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 6px rgba(0,0,0,0.03)',
            transition: 'transform 0.15s ease, border-color 0.15s ease'
          }}
          className="metric-stat-card"
        >
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0
          }}>
            <Layers size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Multi-Stage
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
              {multiCount}
            </div>
          </div>
        </div>

        {/* Instant Delivery */}
        <div
          onClick={() => { setActiveTab('catalog'); setFilterType('Instant') }}
          style={{
            background: isDark ? '#1e293b' : '#ffffff',
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            cursor: 'pointer',
            boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 6px rgba(0,0,0,0.03)',
            transition: 'transform 0.15s ease, border-color 0.15s ease'
          }}
          className="metric-stat-card"
        >
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0
          }}>
            <Zap size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Instant Delivery
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
              {instantCount}
            </div>
          </div>
        </div>

        {/* Customer Stages (Kanban Switcher) */}
        <div
          onClick={() => setActiveTab('pipelines')}
          style={{
            background: isDark ? '#1e293b' : '#ffffff',
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            borderRadius: 14,
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            cursor: 'pointer',
            boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.2)' : '0 2px 6px rgba(0,0,0,0.03)',
            transition: 'transform 0.15s ease, border-color 0.15s ease'
          }}
          className="metric-stat-card"
        >
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0
          }}>
            <Settings2 size={20} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Workflow Stages
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
              {stages.length}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Switcher Bar (Separates Services Catalog & Kanban Pipelines) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: isDark ? '2px solid #334155' : '2px solid #e2e8f0',
        marginBottom: 20,
        gap: 16,
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setActiveTab('catalog')}
            style={{
              padding: '12px 18px',
              fontSize: 14,
              fontWeight: 700,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'catalog' ? '3px solid #ff5900' : '3px solid transparent',
              color: activeTab === 'catalog' ? '#ff5900' : (isDark ? '#94a3b8' : '#64748b'),
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
              marginBottom: -2
            }}
          >
            <Package size={17} />
            <span>Services Catalog</span>
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 12,
              background: activeTab === 'catalog'
                ? (isDark ? 'rgba(255, 89, 0, 0.2)' : '#ffedd5')
                : (isDark ? '#334155' : '#f1f5f9'),
              color: activeTab === 'catalog' ? '#ff5900' : (isDark ? '#cbd5e1' : '#64748b')
            }}>
              {services.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pipelines')}
            style={{
              padding: '12px 18px',
              fontSize: 14,
              fontWeight: 700,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'pipelines' ? '3px solid #ff5900' : '3px solid transparent',
              color: activeTab === 'pipelines' ? '#ff5900' : (isDark ? '#94a3b8' : '#64748b'),
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
              marginBottom: -2
            }}
          >
            <Settings2 size={17} />
            <span>Customer Stage Pipelines</span>
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 12,
              background: activeTab === 'pipelines'
                ? (isDark ? 'rgba(255, 89, 0, 0.2)' : '#ffedd5')
                : (isDark ? '#334155' : '#f1f5f9'),
              color: activeTab === 'pipelines' ? '#ff5900' : (isDark ? '#cbd5e1' : '#64748b')
            }}>
              {stages.length} Stages
            </span>
          </button>
        </div>

        {/* Dynamic Context Helpers on the right of Tab bar */}
        {activeTab === 'catalog' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 6 }}>
            {/* View Mode Toggle: Grid vs Table */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: isDark ? '#1e293b' : '#ffffff',
              border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
              borderRadius: 8,
              padding: 2
            }}>
              <button
                onClick={() => setViewMode('grid')}
                title="Grid Cards View"
                style={{
                  background: viewMode === 'grid' ? (isDark ? '#334155' : '#f1f5f9') : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  padding: '5px 8px',
                  color: viewMode === 'grid' ? '#ff5900' : (isDark ? '#94a3b8' : '#64748b'),
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                <LayoutGrid size={14} />
                <span>Grid</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                title="Table List View"
                style={{
                  background: viewMode === 'table' ? (isDark ? '#334155' : '#f1f5f9') : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  padding: '5px 8px',
                  color: viewMode === 'table' ? '#ff5900' : (isDark ? '#94a3b8' : '#64748b'),
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                <List size={14} />
                <span>Table</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: SERVICES CATALOG                                     ── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'catalog' && (
        <div>
          {/* Filter & Search Toolbar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 20,
            padding: '12px 16px',
            background: isDark ? '#1e293b' : '#ffffff',
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            borderRadius: 12,
            boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            {/* Search Input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: isDark ? '#0f172a' : '#f8fafc',
              border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
              borderRadius: 8,
              padding: '7px 12px',
              width: '100%',
              maxWidth: 360
            }}>
              <Search size={16} style={{ color: isDark ? '#64748b' : '#94a3b8', flexShrink: 0 }} />
              <input
                type="text"
                placeholder={t('modules.services.searchPlaceholder', 'Search services by name or description...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 13,
                  color: isDark ? '#f8fafc' : '#0f172a',
                  width: '100%'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: isDark ? '#94a3b8' : '#64748b',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: `All (${services.length})` },
                { key: 'Multi-Stage', label: `Multi-Stage (${multiCount})`, icon: <Layers size={13} /> },
                { key: 'Instant', label: `Instant (${instantCount})`, icon: <Zap size={13} /> }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilterType(tab.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: filterType === tab.key ? 700 : 500,
                    cursor: 'pointer',
                    border: filterType === tab.key
                      ? '1px solid #ff5900'
                      : (isDark ? '1px solid #334155' : '1px solid #e2e8f0'),
                    background: filterType === tab.key
                      ? (isDark ? 'rgba(255, 89, 0, 0.15)' : '#fff7ed')
                      : (isDark ? 'transparent' : '#f8fafc'),
                    color: filterType === tab.key
                      ? '#ff5900'
                      : (isDark ? '#94a3b8' : '#64748b'),
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Empty Search / Catalog State */}
          {filteredServices.length === 0 ? (
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              background: isDark ? '#1e293b' : '#ffffff',
              border: isDark ? '1px dashed #334155' : '1px dashed #cbd5e1',
              borderRadius: 16,
              marginBottom: 30
            }}>
              <Package size={48} style={{ color: isDark ? '#475569' : '#cbd5e1', marginBottom: 14 }} />
              <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>
                {searchQuery ? 'No matching services found' : 'No services in catalog'}
              </h3>
              <p style={{ margin: '0 0 18px', fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', maxWidth: 450, marginLeft: 'auto', marginRight: 'auto' }}>
                {searchQuery
                  ? 'Try clearing your search query or switching to another filter.'
                  : 'Add your first service offering to set up standardized pricing, reminder notifications, and workflow tracking.'}
              </p>
              {!searchQuery && (
                <button
                  className="btn btn-primary"
                  onClick={() => handleOpenModal()}
                  style={{
                    background: 'linear-gradient(135deg, #ff5900 0%, #ff7324 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 18px',
                    fontWeight: 600,
                    fontSize: 13
                  }}
                >
                  Create First Service
                </button>
              )}
            </div>
          ) : viewMode === 'table' ? (
            /* ── Table View ── */
            <div className="table-container" style={{
              background: isDark ? '#1e293b' : '#ffffff',
              border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
              borderRadius: 14,
              overflow: 'hidden',
              marginBottom: 30
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: isDark ? '#0f172a' : '#f8fafc', borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0' }}>
                    <th style={{ padding: '14px 18px', fontSize: 11, fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Service Name & Description
                    </th>
                    <th style={{ padding: '14px 18px', fontSize: 11, fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Type
                    </th>
                    <th style={{ padding: '14px 18px', fontSize: 11, fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Standard Price
                    </th>
                    <th style={{ padding: '14px 18px', fontSize: 11, fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Reminder Cycle
                    </th>
                    <th style={{ padding: '14px 18px', fontSize: 11, fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Enrolled Customers
                    </th>
                    <th style={{ padding: '14px 18px', fontSize: 11, fontWeight: 700, color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map((svc, idx) => {
                    const isInstant = (svc.service_type || 'Multi-Stage') === 'Instant'
                    const enrolled = getEnrolledCount(svc.id)

                    return (
                      <tr
                        key={svc.id}
                        style={{
                          borderBottom: idx === filteredServices.length - 1 ? 'none' : (isDark ? '1px solid #334155' : '1px solid #f1f5f9'),
                          transition: 'background 0.15s ease'
                        }}
                        className="service-table-row"
                      >
                        {/* Name & Description */}
                        <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: isInstant ? (isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff') : (isDark ? 'rgba(255, 89, 0, 0.15)' : '#fff7ed'),
                              color: isInstant ? '#3b82f6' : '#ff5900',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <Package size={18} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: isDark ? '#f8fafc' : '#0f172a' }}>
                                {svc.service_name}
                              </div>
                              <div style={{
                                fontSize: 12,
                                color: isDark ? '#94a3b8' : '#64748b',
                                maxWidth: 360,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                marginTop: 2
                              }}>
                                {svc.description || 'Standard service catalog offering.'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Type Badge */}
                        <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '4px 10px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 700,
                            background: isInstant ? (isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff') : (isDark ? 'rgba(255, 89, 0, 0.15)' : '#fff7ed'),
                            color: isInstant ? (isDark ? '#93c5fd' : '#2563eb') : (isDark ? '#fb923c' : '#ea580c'),
                            border: isInstant ? (isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid #bfdbfe') : (isDark ? '1px solid rgba(255, 89, 0, 0.3)' : '1px solid #fed7aa')
                          }}>
                            {isInstant ? <Zap size={12} /> : <Layers size={12} />}
                            <span>{svc.service_type || 'Multi-Stage'}</span>
                          </span>
                        </td>

                        {/* Standard Price */}
                        <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                            {profile?.currency || '₹'}{convertPrice(svc.price, profile?.currency || '₹')}
                          </div>
                        </td>

                        {/* Reminder Cycle */}
                        <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 13,
                            fontWeight: 700,
                            color: '#ff5900',
                            background: isDark ? 'rgba(255, 89, 0, 0.1)' : '#fff7ed',
                            padding: '4px 10px',
                            borderRadius: 8
                          }}>
                            <Clock size={13} />
                            <span>{svc.reminder_days} Days</span>
                          </div>
                        </td>

                        {/* Enrolled Customers */}
                        <td style={{ padding: '16px 18px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              fontWeight: 700,
                              fontSize: 13,
                              color: enrolled > 0 ? (isDark ? '#f8fafc' : '#0f172a') : (isDark ? '#64748b' : '#94a3b8')
                            }}>
                              {enrolled} {enrolled === 1 ? 'customer' : 'customers'}
                            </span>
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td style={{ padding: '16px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                            <button
                              onClick={() => handleOpenModal(svc)}
                              title="Edit Service"
                              style={{
                                background: isDark ? '#0f172a' : '#f1f5f9',
                                border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                                borderRadius: 8,
                                padding: '6px 8px',
                                color: isDark ? '#cbd5e1' : '#475569',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 12,
                                fontWeight: 500
                              }}
                            >
                              <Edit2 size={13} />
                              <span>Edit</span>
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDelete(svc)}
                                title="Delete Service"
                                style={{
                                  background: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
                                  border: isDark ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid #fecaca',
                                  borderRadius: 8,
                                  padding: '6px 8px',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: 12,
                                  fontWeight: 500
                                }}
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* ── Grid View ── */
            <div className="services-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 18,
              marginBottom: 30
            }}>
              {filteredServices.map(svc => {
                const isInstant = (svc.service_type || 'Multi-Stage') === 'Instant'
                const enrolled = getEnrolledCount(svc.id)

                return (
                  <div
                    key={svc.id}
                    className="service-card"
                    style={{
                      background: isDark ? '#1e293b' : '#ffffff',
                      border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                      borderTop: isInstant ? '4px solid #3b82f6' : '4px solid #ff5900',
                      borderRadius: 14,
                      padding: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div>
                      {/* Card Header: Title + Type Badge + Actions */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{
                            margin: '0 0 6px',
                            fontSize: 16,
                            fontWeight: 700,
                            color: isDark ? '#f8fafc' : '#0f172a',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }} title={svc.service_name}>
                            {svc.service_name}
                          </h3>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 10px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 700,
                            background: isInstant ? (isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff') : (isDark ? 'rgba(255, 89, 0, 0.15)' : '#fff7ed'),
                            color: isInstant ? (isDark ? '#93c5fd' : '#2563eb') : (isDark ? '#fb923c' : '#ea580c'),
                            border: isInstant ? (isDark ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid #bfdbfe') : (isDark ? '1px solid rgba(255, 89, 0, 0.3)' : '1px solid #fed7aa')
                          }}>
                            {isInstant ? <Zap size={11} /> : <Layers size={11} />}
                            <span>{svc.service_type || 'Multi-Stage'}</span>
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            onClick={() => handleOpenModal(svc)}
                            title="Edit Service"
                            style={{
                              background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                              border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                              borderRadius: 8,
                              padding: 6,
                              color: isDark ? '#cbd5e1' : '#475569',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Edit2 size={13} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(svc)}
                              title="Delete Service"
                              style={{
                                background: isDark ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
                                border: isDark ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid #fecaca',
                                borderRadius: 8,
                                padding: 6,
                                color: '#ef4444',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <p style={{
                        fontSize: 13,
                        color: isDark ? '#94a3b8' : '#64748b',
                        margin: '0 0 16px',
                        lineHeight: 1.5,
                        minHeight: 38,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {svc.description || 'Standard service offering catalog item.'}
                      </p>
                    </div>

                    {/* Card Bottom Meta */}
                    <div>
                      <div style={{
                        borderTop: isDark ? '1px solid #334155' : '1px solid #f1f5f9',
                        paddingTop: 14,
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-between'
                      }}>
                        <div>
                          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: isDark ? '#64748b' : '#94a3b8', marginBottom: 2, fontWeight: 700 }}>
                            Standard Price
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>
                            {profile?.currency || '₹'}{convertPrice(svc.price, profile?.currency || '₹')}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: isDark ? '#64748b' : '#94a3b8', marginBottom: 2, fontWeight: 700 }}>
                            Reminder Cycle
                          </div>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 13,
                            fontWeight: 700,
                            color: '#ff5900'
                          }}>
                            <Clock size={13} />
                            <span>{svc.reminder_days} Days</span>
                          </div>
                        </div>
                      </div>

                      {/* Enrolled customers badge */}
                      {enrolled > 0 && (
                        <div style={{
                          marginTop: 10,
                          paddingTop: 8,
                          borderTop: isDark ? '1px dashed #334155' : '1px dashed #e2e8f0',
                          fontSize: 11,
                          color: isDark ? '#94a3b8' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <span>Enrolled Customers:</span>
                          <span style={{ fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>{enrolled}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: CUSTOMER STAGE PIPELINES (KANBAN)                     ── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'pipelines' && (
        <div style={{
          background: isDark ? '#1e293b' : '#ffffff',
          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
          borderRadius: 16,
          padding: '22px 24px',
          boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.04)',
          borderTop: '4px solid #ff5900',
          overflow: 'hidden'
        }}>
          {/* Stage Builder Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 20
          }}>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 800,
                color: isDark ? '#f8fafc' : '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <Settings2 size={20} style={{ color: '#ff5900' }} />
                <span>Customer Stage Pipelines</span>
              </h2>
              <p style={{ margin: '4px 0 0', color: isDark ? '#94a3b8' : '#64748b', fontSize: 13 }}>
                Visual Kanban workflow board for Multi-Stage services. Drag and drop customers between columns to track stage progress.
              </p>
            </div>

            <button
              className="btn btn-secondary"
              onClick={() => handleOpenStageModal()}
              style={{
                background: isDark ? '#0f172a' : '#f8fafc',
                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                color: isDark ? '#f8fafc' : '#0f172a',
                padding: '7px 14px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}
            >
              <Plus size={14} style={{ color: '#ff5900' }} />
              <span>Add New Stage</span>
            </button>
          </div>

          {/* Kanban Board Columns */}
          {stages.length === 0 ? (
            <div style={{
              padding: 40,
              textAlign: 'center',
              background: isDark ? '#0f172a' : '#f8fafc',
              border: isDark ? '1px dashed #334155' : '1px dashed #cbd5e1',
              borderRadius: 14
            }}>
              <Settings2 size={36} style={{ color: isDark ? '#475569' : '#cbd5e1', marginBottom: 10 }} />
              <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>
                No custom workflow stages defined yet
              </h3>
              <p style={{ color: isDark ? '#94a3b8' : '#64748b', margin: '0 0 16px', fontSize: 13 }}>
                Create your first pipeline stage (e.g. Intake, Processing, Quality Check, Delivered) to organize multi-stage service workflows.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => handleOpenStageModal()}
                style={{
                  background: 'linear-gradient(135deg, #ff5900 0%, #ff7324 100%)',
                  color: '#fff',
                  borderRadius: 8,
                  border: 'none',
                  padding: '8px 18px',
                  fontWeight: 600,
                  fontSize: 13
                }}
              >
                Create First Stage
              </button>
            </div>
          ) : (
            <>
              <div className="kanban-scroll-container" style={{
                display: 'flex',
                gap: 16,
                overflowX: 'auto',
                paddingBottom: 16,
                width: '100%',
                minWidth: 0,
                alignItems: 'flex-start'
              }}>
                {stages.map((stg) => {
                  const stageAccounts = accounts.filter(a => a.b2c_stage_id === stg.id)

                  return (
                    <div
                      key={stg.id}
                      style={{
                        flex: '0 0 260px',
                        background: isDark ? '#0f172a' : '#f8fafc',
                        borderRadius: 14,
                        padding: 14,
                        border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 380
                      }}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDropCustomer(e, stg.id)}
                    >
                      {/* Stage Column Header */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 14,
                        paddingBottom: 10,
                        borderBottom: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: stg.color || '#ff5900', flexShrink: 0 }} />
                          <h4 style={{
                            margin: 0,
                            fontSize: 14,
                            fontWeight: 700,
                            color: isDark ? '#f8fafc' : '#0f172a',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }} title={stg.name}>
                            {stg.name}
                          </h4>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: isDark ? '#94a3b8' : '#64748b',
                            background: isDark ? '#1e293b' : '#e2e8f0',
                            padding: '2px 8px',
                            borderRadius: 12
                          }}>
                            {stageAccounts.length}
                          </span>
                          <button
                            onClick={() => handleOpenStageModal(stg)}
                            title="Edit Stage"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: isDark ? '#94a3b8' : '#64748b',
                              cursor: 'pointer',
                              padding: 2,
                              display: 'flex'
                            }}
                          >
                            <Edit2 size={13} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteStage(stg)}
                              title="Delete Stage"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: 2,
                                display: 'flex'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Draggable Customer Cards */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 120, flex: 1 }}>
                        {stageAccounts.map(acc => {
                          const serviceNames = (acc.customer_services || [])
                            .map(cs => cs.services?.service_name)
                            .filter(Boolean)
                          const serviceName = serviceNames.length > 0 ? serviceNames.join(', ') : 'Multi-Stage Service'
                          const animation = animatingCards[acc.id] || ''

                          return (
                            <div
                              key={acc.id}
                              draggable
                              onDragStart={(e) => handleDragStartCustomer(e, acc.id, stg.id)}
                              style={{
                                background: isDark ? '#1e293b' : '#ffffff',
                                border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                                borderLeft: `4px solid ${stg.color || '#ff5900'}`,
                                borderRadius: 10,
                                padding: '12px 14px',
                                cursor: 'grab',
                                boxShadow: isDark ? '0 2px 6px rgba(0,0,0,0.25)' : '0 1px 3px rgba(0,0,0,0.04)',
                                animation: animation ? `${animation} 0.5s forwards` : 'none',
                                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                              }}
                              className="customer-kanban-card"
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                <div style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  background: `linear-gradient(135deg, ${stg.color || '#ff5900'}, #94a3b8)`,
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: 10,
                                  fontWeight: 800,
                                  flexShrink: 0
                                }}>
                                  {acc.account_name?.[0]?.toUpperCase() || 'C'}
                                </div>
                                <span style={{
                                  fontWeight: 700,
                                  fontSize: 13,
                                  color: isDark ? '#f8fafc' : '#0f172a',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {acc.account_name}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <Package size={11} style={{ flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{serviceName}</span>
                              </div>
                            </div>
                          )
                        })}

                        {stageAccounts.length === 0 && (
                          <div style={{
                            textAlign: 'center',
                            padding: '30px 10px',
                            color: isDark ? '#475569' : '#94a3b8',
                            fontSize: 12,
                            fontStyle: 'italic',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: isDark ? '1px dashed #334155' : '1px dashed #e2e8f0',
                            borderRadius: 8,
                            height: '100%'
                          }}>
                            Drag & drop customer here
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Live Stage Movement Timeline Feed */}
              <div style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: isDark ? '1px solid #334155' : '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Activity size={17} style={{ color: '#ff5900' }} />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                    Live Stage Movement Timeline
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stageHistory.length === 0 ? (
                    <p style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 12, fontStyle: 'italic', margin: 0 }}>
                      No stage movements recorded yet. Drag customer cards between stage columns to log real-time transitions.
                    </p>
                  ) : (
                    stageHistory.slice(0, 10).map(hist => (
                      <div key={hist.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: 12,
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: isDark ? '#0f172a' : '#f8fafc',
                        border: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9'
                      }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: hist.b2c_stages?.color || '#ff5900', flexShrink: 0 }} />
                        <span style={{ color: isDark ? '#64748b' : '#94a3b8', whiteSpace: 'nowrap', fontSize: 11, fontWeight: 600 }}>
                          {new Date(hist.moved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span style={{ fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a' }}>
                          {hist.customer_name}
                        </span>
                        <span style={{ color: isDark ? '#64748b' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>advanced to</span>
                          <ArrowRight size={12} />
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: (hist.b2c_stages?.color || '#ff5900') + '22',
                          color: hist.b2c_stages?.color || '#ff5900',
                          fontWeight: 700,
                          fontSize: 11
                        }}>
                          {hist.b2c_stages?.name}
                        </span>
                        {hist.services?.service_name && (
                          <span style={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 11 }}>
                            ({hist.services.service_name})
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Modal: Create / Edit Service ── */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{
            maxWidth: 520,
            background: isDark ? '#1e293b' : '#ffffff',
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            color: isDark ? '#f8fafc' : '#0f172a',
            borderRadius: 16,
            padding: 24
          }}>
            <div className="modal-header" style={{ marginBottom: 20 }}>
              <h2 className="modal-title" style={{ fontSize: 18, fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                {editingService ? 'Edit Service Offering' : 'Define New Service Offering'}
              </h2>
              <button
                className="modal-close"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: isDark ? '#0f172a' : '#f1f5f9',
                  border: 'none',
                  color: isDark ? '#94a3b8' : '#64748b',
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155', marginBottom: 6 }}>
                  Service Name *
                </label>
                <input
                  required
                  className="form-input"
                  value={formData.service_name}
                  onChange={e => setFormData({ ...formData, service_name: e.target.value })}
                  placeholder="e.g. Full Detailing, Annual Maintenance, Premium Consultation"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                    background: isDark ? '#0f172a' : '#ffffff',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155', marginBottom: 6 }}>
                    Standard Price ({profile?.currency || '₹'}) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: isDark ? '#64748b' : '#94a3b8' }} />
                    <input
                      type="number"
                      required
                      className="form-input"
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 30px',
                        borderRadius: 8,
                        border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                        background: isDark ? '#0f172a' : '#ffffff',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        fontSize: 13,
                        boxSizing: 'border-box'
                      }}
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155', marginBottom: 6 }}>
                    Reminder Cycle (Days) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Clock size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: isDark ? '#64748b' : '#94a3b8' }} />
                    <input
                      type="number"
                      required
                      className="form-input"
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 30px',
                        borderRadius: 8,
                        border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                        background: isDark ? '#0f172a' : '#ffffff',
                        color: isDark ? '#f8fafc' : '#0f172a',
                        fontSize: 13,
                        boxSizing: 'border-box'
                      }}
                      value={formData.reminder_days}
                      onChange={e => setFormData({ ...formData, reminder_days: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155', marginBottom: 6 }}>
                  Service Type *
                </label>
                <select
                  required
                  className="form-input"
                  value={formData.service_type}
                  onChange={e => setFormData({ ...formData, service_type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                    background: isDark ? '#0f172a' : '#ffffff',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="Instant">⚡ Instant — Completed immediately, no Kanban card</option>
                  <option value="Multi-Stage">🔄 Multi-Stage — Tracked through custom stages</option>
                </select>
                <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', marginTop: 4 }}>
                  {formData.service_type === 'Instant'
                    ? 'Delivered immediately without advancing through intermediate stages.'
                    : 'Creates interactive customer Kanban cards that move through your pipeline stages.'}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155', marginBottom: 6 }}>
                  Service Description
                </label>
                <textarea
                  className="form-input"
                  style={{
                    width: '100%',
                    minHeight: 80,
                    padding: 10,
                    borderRadius: 8,
                    border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                    background: isDark ? '#0f172a' : '#ffffff',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Briefly describe what is included in this service..."
                />
              </div>

              <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    background: isDark ? '#0f172a' : '#f1f5f9',
                    border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                    color: isDark ? '#f8fafc' : '#334155'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 18px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #ff5900 0%, #ff7324 100%)',
                    color: '#ffffff',
                    border: 'none'
                  }}
                >
                  <Save size={15} />
                  <span>{editingService ? 'Save Changes' : 'Create Service'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Create / Edit Stage ── */}
      {isStageModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{
            maxWidth: 420,
            background: isDark ? '#1e293b' : '#ffffff',
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
            color: isDark ? '#f8fafc' : '#0f172a',
            borderRadius: 16,
            padding: 24
          }}>
            <div className="modal-header" style={{ marginBottom: 18 }}>
              <h2 className="modal-title" style={{ fontSize: 17, fontWeight: 700, color: isDark ? '#f8fafc' : '#0f172a', margin: 0 }}>
                {editingStage ? 'Edit Workflow Stage' : 'Define New Workflow Stage'}
              </h2>
              <button
                className="modal-close"
                onClick={() => setIsStageModalOpen(false)}
                style={{
                  background: isDark ? '#0f172a' : '#f1f5f9',
                  border: 'none',
                  color: isDark ? '#94a3b8' : '#64748b',
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleStageSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155', marginBottom: 6 }}>
                  Stage Name *
                </label>
                <input
                  required
                  className="form-input"
                  value={stageFormData.name}
                  onChange={e => setStageFormData({ ...stageFormData, name: e.target.value })}
                  placeholder="e.g. Intake, Processing, Quality Check, Delivered"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                    background: isDark ? '#0f172a' : '#ffffff',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    fontSize: 13,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: isDark ? '#cbd5e1' : '#334155', marginBottom: 6 }}>
                  Stage Color Badge *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="color"
                    required
                    style={{
                      width: 44,
                      height: 38,
                      padding: 2,
                      cursor: 'pointer',
                      border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                      borderRadius: 8,
                      background: 'transparent'
                    }}
                    value={stageFormData.color}
                    onChange={e => setStageFormData({ ...stageFormData, color: e.target.value })}
                  />
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 12px',
                    borderRadius: 16,
                    background: stageFormData.color + '22',
                    color: stageFormData.color,
                    fontSize: 12,
                    fontWeight: 700
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: stageFormData.color }} />
                    <span>{stageFormData.name || 'Preview'}</span>
                  </div>
                </div>
              </div>

              <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsStageModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    background: isDark ? '#0f172a' : '#f1f5f9',
                    border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
                    color: isDark ? '#f8fafc' : '#334155'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 18px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #ff5900 0%, #ff7324 100%)',
                    color: '#ffffff',
                    border: 'none'
                  }}
                >
                  <Save size={15} />
                  <span>{editingStage ? 'Save Stage' : 'Create Stage'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Animation & scrollbar styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes flyUp {
          0%   { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
          30%  { transform: translateY(-18px) scale(1.04) rotate(-1.5deg); opacity: 1; }
          70%  { transform: translateY(-80px) scale(0.92) rotate(2deg); opacity: 0.6; }
          100% { transform: translateY(-160px) scale(0.7) rotate(-3deg); opacity: 0; }
        }
        @keyframes flyIn {
          0%   { transform: translateY(-60px) scale(0.85); opacity: 0; }
          60%  { transform: translateY(6px) scale(1.02); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes flyBack {
          0%   { transform: translateY(0) scale(1); opacity: 1; }
          40%  { transform: translateY(30px) scale(0.95); opacity: 0.5; }
          100% { transform: translateY(80px) scale(0.8); opacity: 0; }
        }

        .metric-stat-card:hover {
          transform: translateY(-2px);
          border-color: #ff5900 !important;
        }

        .service-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 24px -6px rgba(0, 0, 0, 0.15) !important;
        }

        .service-table-row:hover {
          background: ${isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc'} !important;
        }

        .customer-kanban-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12) !important;
        }

        .kanban-scroll-container::-webkit-scrollbar { height: 7px; }
        .kanban-scroll-container::-webkit-scrollbar-track { background: ${isDark ? '#0f172a' : '#f1f5f9'}; border-radius: 10px; }
        .kanban-scroll-container::-webkit-scrollbar-thumb { background: ${isDark ? '#334155' : '#cbd5e1'}; border-radius: 10px; }
        .kanban-scroll-container::-webkit-scrollbar-thumb:hover { background: ${isDark ? '#475569' : '#94a3b8'}; }
      `}} />

      <BulkUploadModal
        module="services"
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        session={session}
        profile={profile}
        onImported={fetchServices}
      />
    </div>
  )
}
