import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Trash2, Edit2, Package, Plus, Calendar, CreditCard, Clock, FileText, CheckCircle, Download, Check, X, Phone, Save, Link2, Settings, AlertCircle, ArrowUp, ArrowDown, LayoutGrid, UploadCloud, TrendingUp, ExternalLink, ChevronDown, ChevronRight, Receipt, Eye, Users, Globe, Mail } from 'lucide-react'
import LocalSearch from '../ui/LocalSearch'
import FieldBuilderModal from '../ui/FieldBuilderModal'
import BulkUploadModal from '../ui/BulkUploadModal'
import WhatsAppButton from '../ui/WhatsAppButton'
import { getWhatsAppMessage, formatPhoneDisplay, cleanPhoneNumber } from '../../lib/whatsapp'
import { sanitizePhone, validatePhone, validateEmail, validateWebsite, validateRequired } from '../../lib/validation'
import { useTranslation } from 'react-i18next'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

const labelStyle = { color: 'var(--text-muted)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }
const detailFieldStyle = { fontSize: '14px', color: 'var(--text-primary)' }

async function handleFileUpload(file, businessId) {
  const fileName = `${businessId}/${Date.now()}-${file.name}`
  const { data, error } = await supabase.storage
    .from('customer-docs')
    .upload(fileName, file)
  
  if (error) {
    if (error.message.includes('bucket not found')) {
      toast.error('Storage bucket "customer-docs" not found. Please create it in Supabase.')
    }
    throw error
  }
  
  const { data: { publicUrl } } = supabase.storage.from('customer-docs').getPublicUrl(fileName)
  return publicUrl
}

function renderCustomFieldInput(config, value, onChange, businessId) {
  const commonProps = {
    required: config.is_required,
    className: 'form-input',
    value: value || '',
    onChange: (e) => onChange(e.target.value)
  }

  // Handle phone / contact number fields strictly
  if (config.field_key === 'contact_number' || config.field_type === 'phone' || config.field_type === 'tel') {
    return (
      <input
        type="tel"
        {...commonProps}
        maxLength={10}
        inputMode="numeric"
        placeholder="10-digit mobile number"
        onChange={(e) => onChange(sanitizePhone(e.target.value))}
      />
    )
  }

  // Handle email fields strictly
  if (config.field_key === 'email_id' || config.field_type === 'email') {
    return (
      <input
        type="email"
        {...commonProps}
        placeholder="user@gmail.com"
      />
    )
  }

  // Handle website URL fields strictly
  if (config.field_key === 'website' || config.field_type === 'url') {
    return (
      <input
        type="url"
        {...commonProps}
        placeholder="https://example.com"
      />
    )
  }

  switch (config.field_type) {
    case 'number': return <input type="number" {...commonProps} />
    case 'date': return <input type="date" {...commonProps} />
    case 'checkbox': return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42 }}>
        <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} style={{ width: 18, height: 18 }} />
        <span style={{ fontSize: 13, color: '#64748b' }}>Check if applicable</span>
      </div>
    )
    case 'dropdown': 
      return (
        <select {...commonProps}>
          <option value="">-- Select Option --</option>
          {(config.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )
    case 'multi_select':
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
          {(config.options || []).map(opt => {
            const selected = Array.isArray(value) ? value.includes(opt) : false
            return (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '4px 10px', background: selected ? '#fff5f0' : '#f8fafc', border: `1px solid ${selected ? '#f37a23' : '#e2e8f0'}`, borderRadius: 16, cursor: 'pointer' }}>
                <input type="checkbox" checked={selected} style={{ display: 'none' }} onChange={() => {
                  const newVal = selected ? (value || []).filter(v => v !== opt) : [...(value || []), opt]
                  onChange(newVal)
                }} />
                {opt}
              </label>
            )
          })}
        </div>
      )
    case 'long_text': return <textarea {...commonProps} style={{ minHeight: 80 }} />
    case 'url': return <input type="url" {...commonProps} placeholder="https://" />
    case 'file_upload':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input 
            type="file" 
            className="form-input" 
            onChange={async (e) => {
              const file = e.target.files[0]
              if (!file) return
              const tid = toast.loading('Uploading file...')
              try {
                const url = await handleFileUpload(file, businessId)
                onChange(url)
                toast.success('Upload complete', { id: tid })
              } catch (err) {
                toast.error('Upload failed: ' + err.message, { id: tid })
              }
            }} 
          />
          {value && (
            <a href={value} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#f37a23', fontWeight: 700 }}>
              View uploaded file
            </a>
          )}
        </div>
      )
    default: return <input type="text" {...commonProps} />
  }
}

export default function Accounts({ session, profile }) {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [editingAccount, setEditingAccount] = useState(null)
  
  const companyType = session.user.user_metadata?.companyType || 'B2B'
  const isB2C = companyType === 'B2C'
  const isAdmin = ['admin', 'administrator'].includes((session?.user?.user_metadata?.role || profile?.role || '').toLowerCase())
  // Stage tracking is now per-service (service_type field), always fetch stages
  const hasMultiStageServices = (svcList) => (svcList || []).some(s => s.service_type === 'Multi-Stage')

  const [b2cStages, setB2cStages] = useState([])

  const [accContacts, setAccContacts] = useState([])
  const [accTasks, setAccTasks] = useState([])
  const [accServices, setAccServices] = useState([])
  const [accInvoices, setAccInvoices] = useState([])
  const [availableServices, setAvailableServices] = useState([])
  const [accActs, setAccActs] = useState([])
  const [accOpportunities, setAccOpportunities] = useState([])
  const [expandedOppId, setExpandedOppId] = useState(null)
  
  const [isOppModalOpen, setIsOppModalOpen] = useState(false)
  const [editingOpp, setEditingOpp] = useState(null)
  const [oppFormData, setOppFormData] = useState({
    name: '',
    amount: 0,
    stage: 'Prospecting',
    closed_date: '',
    owner: profile?.name || session?.user?.email || ''
  })
  const OPP_STAGES = (() => {
    try {
      const stored = localStorage.getItem('pipeline_stages')
      if (stored) return JSON.parse(stored)
    } catch (e) {}
    return ['Prospecting', 'Scoping', 'Negotiation', 'Legal', 'Contract', 'Closed']
  })()
  
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)
  const [editingServiceEntry, setEditingServiceEntry] = useState(null)
  const [serviceEntryTab, setServiceEntryTab] = useState('quick')
  const [serviceAssignForm, setServiceAssignForm] = useState({ 
    service_id: '', 
    price: 0, 
    service_date: new Date().toISOString().split('T')[0],
    reminder_days: 7,
    payment_status: 'Unpaid',
    notes: '',
    stage_notes: '',
    next_follow_up_date: ''
  })
  
  const [activeTab, setActiveTab] = useState(isB2C ? 'services' : 'contacts')
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false)
  const [newContactForm, setNewContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    gender: '',
    contact_owner: profile?.name || session?.user?.email || ''
  })
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  const [customFieldConfigs, setCustomFieldConfigs] = useState([])
  const [serviceHistoryConfigs, setServiceHistoryConfigs] = useState([])
  const [isFieldBuilderOpen, setIsFieldBuilderOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isServiceFieldBuilderOpen, setIsServiceFieldBuilderOpen] = useState(false)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [invoiceForm, setInvoiceForm] = useState({ quote_name: '', total_price: 0, status: 'Unpaid', created_at: '' })

  const handleOpenInvoiceModal = (inv) => {
    setEditingInvoice(inv)
    setInvoiceForm({
      quote_name: inv.quote_name || '',
      total_price: inv.total_price || 0,
      status: inv.status || 'Unpaid',
      created_at: inv.created_at ? new Date(inv.created_at).toISOString().split('T')[0] : ''
    })
    setIsInvoiceModalOpen(true)
  }

  const handleUpdateInvoice = async (e) => {
    e.preventDefault()
    const toastId = toast.loading('Updating invoice...')
    try {
      const { error } = await supabase
        .from('quotes')
        .update({
          quote_name: invoiceForm.quote_name,
          total_price: Number(invoiceForm.total_price),
          status: invoiceForm.status,
          created_at: invoiceForm.created_at ? new Date(invoiceForm.created_at).toISOString() : new Date().toISOString()
        })
        .eq('id', editingInvoice.id)

      if (error) throw error

      toast.success('Invoice updated successfully!', { id: toastId })
      setIsInvoiceModalOpen(false)
      fetchAccountDetails(selectedAccount.id, selectedAccount.account_name)
    } catch (err) {
      toast.error(err.message, { id: toastId })
    }
  }

  const [contactPopupData, setContactPopupData] = useState(null)
  const [viewContactsModal, setViewContactsModal] = useState(null) // { account, contacts }
  const [viewContactsLoading, setViewContactsLoading] = useState(false)

  // Open the account's contact directly on the Contacts page (no intermediate popup)
  const handleViewContacts = async (e, acc) => {
    e.stopPropagation()
    const { data } = await supabase
      .from('contacts')
      .select('id')
      .eq('account_id', acc.id)
      .order('created_at', { ascending: true })
      .limit(1)
    const contact = data?.[0]
    if (!contact) {
      toast.error(`No contact found for ${acc.account_name}`)
      navigate('/dashboard/contacts')
      return
    }
    navigate('/dashboard/contacts', { state: { openId: contact.id } })
  }

  // Opportunity handlers
  const handleOpenOppModal = (opp = null) => {
    if (opp) {
      setEditingOpp(opp)
      setOppFormData({
        name: opp.name || '',
        amount: opp.amount || 0,
        stage: opp.stage || 'Prospecting',
        closed_date: opp.closed_date ? new Date(opp.closed_date).toISOString().split('T')[0] : '',
        owner: opp.owner || profile?.name || session.user.email
      })
    } else {
      setEditingOpp(null)
      setOppFormData({
        name: '',
        amount: 0,
        stage: OPP_STAGES[0] || 'Prospecting',
        closed_date: '',
        owner: profile?.name || session.user.email
      })
    }
    setIsOppModalOpen(true)
  }

  const handleSaveOpportunity = async (e) => {
    e.preventDefault()
    if (!oppFormData.name.trim()) {
      toast.error('Opportunity name is required')
      return
    }
    const toastId = toast.loading(editingOpp ? 'Updating opportunity...' : 'Creating opportunity...')
    try {
      const payload = {
        name: oppFormData.name.trim(),
        account_id: selectedAccount.id,
        amount: Number(oppFormData.amount) || 0,
        stage: oppFormData.stage,
        closed_date: oppFormData.closed_date || null,
        owner: oppFormData.owner || profile?.name || session.user.email,
        user_id: session.user.id
      }

      if (editingOpp) {
        const { error } = await supabase
          .from('opportunities')
          .update(payload)
          .eq('id', editingOpp.id)
        if (error) throw error

        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'Opportunity Updated',
          description: `Updated opportunity "${payload.name}" for ${selectedAccount.account_name}`
        }])
        toast.success('Opportunity updated successfully', { id: toastId })
      } else {
        const { error } = await supabase
          .from('opportunities')
          .insert([payload])
        if (error) throw error

        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'Opportunity Created',
          description: `Created opportunity "${payload.name}" for ${selectedAccount.account_name}`
        }])
        toast.success('Opportunity created successfully', { id: toastId })
      }

      setIsOppModalOpen(false)
      fetchAccountDetails(selectedAccount.id, selectedAccount.account_name)
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to save opportunity', { id: toastId })
    }
  }

  const handleDeleteOpportunity = async (oppId, oppName) => {
    if (!window.confirm(`Are you sure you want to delete opportunity "${oppName}"?`)) return
    const toastId = toast.loading('Deleting opportunity...')
    try {
      const { error } = await supabase.from('opportunities').delete().eq('id', oppId)
      if (error) throw error

      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Opportunity Deleted',
        description: `Deleted opportunity "${oppName}" from ${selectedAccount.account_name}`
      }])
      toast.success('Opportunity deleted', { id: toastId })
      fetchAccountDetails(selectedAccount.id, selectedAccount.account_name)
    } catch (err) {
      toast.error(err.message || 'Failed to delete opportunity', { id: toastId })
    }
  }
  
  // Form State
  const [formData, setFormData] = useState({
    account_name: '', 
    domain: '', 
    account_owner: profile?.name || session.user.email, 
    status: 'New', 
    phone: '', 
    email: '', 
    address: '',
    notes: '',
    custom_data: {},
    contact_id: null
  })

  const userIds = profile?.teamUserIds || [session.user.id]

  useEffect(() => { 
    fetchAccounts()
    fetchCustomConfigs()
    fetchServiceHistoryConfigs()
    if (isB2C) {
      fetchB2CStages()
    }
  }, [session, profile])

  const fetchB2CStages = async () => {
    const { data } = await supabase.from('b2c_stages').select('*').order('order_index', { ascending: true })
    setB2cStages(data || [])
  }

  const fetchCustomConfigs = async () => {
    try {
      const { data: existing, error } = await supabase
        .from('custom_field_configs')
        .select('*')
        .eq('business_id', session.user.id)
        .eq('module', 'customer_profile')
        .order('display_order', { ascending: true })
      
      if (error) throw error

      const coreFieldsTarget = isB2C ? [
        { label: 'Customer Name', field_key: 'customer_name', field_type: 'text', is_core: true, order: 0 },
        { label: 'Contact Number', field_key: 'contact_number', field_type: 'text', is_core: true, order: 1 },
        { label: 'Email ID', field_key: 'email_id', field_type: 'text', is_core: true, order: 2 },
        { label: 'Address', field_key: 'address', field_type: 'long_text', is_core: true, order: 3 }
      ] : [
        { label: 'Account Name', field_key: 'customer_name', field_type: 'text', is_core: true, order: 0 },
        { label: 'Contact Number', field_key: 'contact_number', field_type: 'text', is_core: true, order: 1 },
        { label: 'Website Link', field_key: 'website', field_type: 'url', is_core: true, order: 2 },
        { label: 'Address', field_key: 'address', field_type: 'long_text', is_core: true, order: 3 }
      ]

      let finalData = existing || []
      const missingCore = coreFieldsTarget.filter(t => !finalData.find(f => f.field_key === t.field_key))

      if (missingCore.length > 0) {
        const toInsert = missingCore.map(c => ({
          business_id: session.user.id,
          module: 'customer_profile',
          field_key: c.field_key,
          label: c.label,
          field_type: c.field_type,
          options: c.options || null,
          is_core: true,
          display_order: c.order,
          is_required: c.field_key === 'customer_name' || c.field_key === 'contact_number',
          show_in_list: true
        }))
        const { data: inserted } = await supabase.from('custom_field_configs').insert(toInsert).select()
        if (inserted) {
          finalData = [...finalData, ...inserted].sort((a,b) => (a.display_order || 0) - (b.display_order || 0))
        }
      }

      const allowedKeys = isB2C 
        ? ['customer_name', 'contact_number', 'email_id', 'address'] 
        : ['customer_name', 'contact_number', 'website', 'address']
      setCustomFieldConfigs(finalData.filter(f => !f.is_archived && (!f.is_core || allowedKeys.includes(f.field_key))))
    } catch (err) {
      console.error('Error loading custom fields:', err)
    }
  }

  const fetchServiceHistoryConfigs = async () => {
    try {
      const { data: existing, error } = await supabase
        .from('custom_field_configs')
        .select('*')
        .eq('business_id', session.user.id)
        .eq('module', 'service_history')
        .order('display_order', { ascending: true })
      
      if (error) throw error

      const coreFieldsTarget = [
        { label: 'Service Name', field_key: 'service_name', field_type: 'text', is_core: true, order: 0 },
        { label: 'Date', field_key: 'assigned_date', field_type: 'date', is_core: true, order: 1 },
        { label: 'Price', field_key: 'price', field_type: 'number', is_core: true, order: 2 },
        { label: 'Status', field_key: 'status', field_type: 'dropdown', options: ['Active', 'Completed'], is_core: true, order: 3 },
        { label: 'Current Stage', field_key: 'current_stage', field_type: 'text', is_core: true, order: 4 },
        { label: 'Notes', field_key: 'notes', field_type: 'long_text', is_core: true, order: 5 }
      ]

      let finalData = existing || []
      const missingCore = coreFieldsTarget.filter(t => !finalData.find(f => f.field_key === t.field_key))

      if (missingCore.length > 0) {
        const toInsert = missingCore.map(c => ({
          business_id: session.user.id,
          module: 'service_history',
          field_key: c.field_key,
          label: c.label,
          field_type: c.field_type,
          options: c.options || null,
          is_core: true,
          display_order: c.order,
          is_required: false,
          show_in_list: true
        }))
        const { data: inserted } = await supabase.from('custom_field_configs').insert(toInsert).select()
        if (inserted) {
          finalData = [...finalData, ...inserted].sort((a,b) => (a.display_order || 0) - (b.display_order || 0))
        }
      }

      setServiceHistoryConfigs(finalData.filter(f => !f.is_archived))
    } catch (err) {
      console.error('Error loading service custom fields:', err)
    }
  }

  const handleOpenFieldModal = () => setIsFieldBuilderOpen(true)

  useEffect(() => {
    if (accounts.length > 0 && location.state?.openId) {
      const account = accounts.find(a => a.id === location.state.openId)
      if (account) {
        setSelectedAccount(account)
        window.history.replaceState({}, document.title)
      }
    }
  }, [accounts, location.state])

  useEffect(() => {
    if (selectedAccount) fetchAccountDetails(selectedAccount.id, selectedAccount.account_name)
  }, [selectedAccount?.id])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('accounts')
        .select('*, contacts(phone, email, id)')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setAccounts(data || [])
    } catch (error) {
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  const fetchAccountDetails = async (id, accName) => {
    const [accRes, cRes, iRes, tRes, csRes, svcRes, sRes, aRes, stageHistoryRes, allStagesRes, oppRes] = await Promise.all([
      supabase.from('accounts').select('*, contacts(phone, email, id)').eq('id', id).single(),
      supabase.from('contacts').select('*').eq('account_id', id),
      supabase.from('quotes').select('*').eq('account_id', id).order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').eq('account_id', id).order('due_date', { ascending: true }),
      supabase.from('customer_services').select('*').eq('account_id', id).order('assigned_date', { ascending: false }),
      supabase.from('services').select('id, service_name, reminder_days').in('user_id', userIds),
      supabase.from('services').select('*').in('user_id', userIds).eq('status', 'active'),
      supabase.from('activities').select('*').in('user_id', userIds).order('created_at', { ascending: false }),
      supabase.from('b2c_customer_stages').select('id, stage_id, service_id, moved_at').eq('customer_id', String(id)).order('moved_at', { ascending: false }),
      supabase.from('b2c_stages').select('id, name, color').order('order_index', { ascending: true }),
      supabase.from('opportunities').select('*, quotes:quotes!opportunity_id(id, quote_name, total_price, status, expires_at, created_at, invoice_number)').eq('account_id', id).order('created_at', { ascending: false })
    ])
    
    if (csRes.error) {
      console.error('[ServiceHistory] DB Error fetching customer_services:', csRes.error)
    }

    if (accRes.data) {
      setSelectedAccount(accRes.data)
    }

    // Build a stage lookup map: stage_id -> { name, color }
    const stagesMap = {}
    ;(allStagesRes.data || []).forEach(st => { stagesMap[String(st.id)] = st })

    // Enrich stage history rows with stage details
    const stageHistory = (stageHistoryRes.data || []).map(sh => ({
      ...sh,
      stageDetail: stagesMap[String(sh.stage_id)] || null
    }))

    // For each service entry: try matched stage by service_id, fallback to global customer moves (where service_id is null)
    const mySvcs = (csRes.data || []).map(cs => {
      const match = (svcRes.data || []).find(s => String(s.id) === String(cs.service_id))
      const latestByService = stageHistory.find(sh => sh.service_id && String(sh.service_id) === String(cs.service_id))
      const latestGlobal = stageHistory.find(sh => !sh.service_id)
      const latestStage = latestByService || latestGlobal
      return { ...cs, services: match || null, currentStage: latestStage?.stageDetail || null, stageFromServiceId: !!latestByService }
    })

    setAccContacts(cRes.data || [])
    setAccInvoices(iRes.data || [])
    setAccTasks(tRes.data || [])
    setAccServices(mySvcs)
    setAvailableServices(sRes.data || [])
    setAccOpportunities(oppRes.data || [])

    const nameLower = (accName || '').toLowerCase()
    const filteredActs = (aRes.data || []).filter(a => {
      if (!a.description) return false
      const d = a.description.toLowerCase()
      const n = nameLower.toLowerCase()
      return d.includes(n)
    })
    setAccActs(filteredActs)
  }

  const handleOpenModal = (account = null) => {
    const defaultOwner = profile?.name || session?.user?.user_metadata?.name || session?.user?.email || ''
    if (account) {
      setEditingAccount(account)
      setFormData({
        account_name: account.account_name, 
        domain: account.domain || '', 
        account_owner: account.account_owner || account.custom_data?.account_owner || defaultOwner, 
        status: account.status || 'Active',
        phone: account.phone || account.contacts?.[0]?.phone || '', 
        email: account.email || account.contacts?.[0]?.email || '', 
        address: account.address || '',
        b2c_stage_id: account.b2c_stage_id || '',
        notes: account.notes || '',
        custom_data: {
          customer_name: account.account_name || '',
          contact_number: account.phone || account.contacts?.[0]?.phone || '',
          website: account.website || account.domain || account.custom_data?.website || '',
          email_id: account.email || account.contacts?.[0]?.email || '',
          address: account.address || '',
          ...(account.custom_data || {})
        },
        contact_id: account.contacts?.[0]?.id || null
      })
    } else {
      setEditingAccount(null)
      setFormData({ 
        account_name: '', 
        domain: '', 
        account_owner: defaultOwner, 
        status: 'Active', 
        phone: '', 
        email: '', 
        address: '',
        b2c_stage_id: '',
        notes: '',
        custom_data: {
          customer_name: '',
          contact_number: '',
          website: '',
          email_id: '',
          address: ''
        },
        contact_id: null 
      })
    }
    setIsModalOpen(true)
  }

  const handleOpenServiceModal = (entry = null) => {
    if (entry) {
      setEditingServiceEntry(entry)
      setServiceEntryTab(entry.stage_notes || entry.next_follow_up_date || entry.accounts?.b2c_stage_id ? 'stage' : 'quick')
      setServiceAssignForm({
        service_id: entry.service_id,
        price: entry.price || 0,
        service_date: new Date(entry.assigned_date).toISOString().split('T')[0],
        reminder_days: entry.services?.reminder_days || 7,
        payment_status: accInvoices.find(i => i.id === entry.quote_id)?.status || 'Unpaid',
        b2c_stage_id: selectedAccount?.b2c_stage_id || '',
        notes: entry.notes || '',
        stage_notes: entry.stage_notes || '',
        next_follow_up_date: entry.next_follow_up_date ? new Date(entry.next_follow_up_date).toISOString().split('T')[0] : '',
        custom_data: entry.custom_data || {}
      })
    } else {
      setEditingServiceEntry(null)
      setServiceEntryTab('quick')
      setServiceAssignForm({ 
        service_id: '', 
        price: 0, 
        service_date: new Date().toISOString().split('T')[0], 
        reminder_days: 7, 
        payment_status: 'Unpaid',
        b2c_stage_id: selectedAccount?.b2c_stage_id || '',
        notes: '',
        stage_notes: '',
        next_follow_up_date: '',
        custom_data: {}
      })
    }
    setIsServiceModalOpen(true)
  }

  const handleStatusToggle = async (invoice) => {
    const statuses = ['Unpaid', 'Paid', 'Overdue']
    const nextIdx = (statuses.indexOf(invoice.status) + 1) % statuses.length
    const nextStatus = statuses[nextIdx]
    try {
      await supabase.from('quotes').update({ status: nextStatus }).eq('id', invoice.id)
      toast.success(`Invoice marked as ${nextStatus}`)
      fetchAccountDetails(selectedAccount.id, selectedAccount.account_name)
    } catch { toast.error('Failed to update status') }
  }

  const handleAssignService = async (e) => {
    e.preventDefault()
    if (!serviceAssignForm.service_id) return
    const toastId = toast.loading(editingServiceEntry ? 'Updating service & syncing invoice...' : 'Processing service entry & automations...')
    
    try {
      const selectedSvc = availableServices.find(s => s.id === serviceAssignForm.service_id)
      const invNo = editingServiceEntry?.invoice_number || `INV-${Date.now().toString().slice(-6)}`
      let quoteId = editingServiceEntry?.quote_id
      let taskId = editingServiceEntry?.task_id

      // 1. SYNC INVOICE (Quote)
      const quotePayload = {
        user_id: session.user.id,
        account_id: selectedAccount.id,
        quote_name: `Service Invoice: ${selectedSvc.service_name}`,
        total_price: serviceAssignForm.price,
        status: serviceAssignForm.payment_status,
        invoice_number: invNo,
        created_at: serviceAssignForm.service_date
      }

      if (quoteId) {
        await supabase.from('quotes').update(quotePayload).eq('id', quoteId)
      } else {
        const { data: q, error: qErr } = await supabase.from('quotes').insert([quotePayload]).select().single()
        if (qErr) throw qErr
        quoteId = q.id
      }

      // 2. SYNC REMINDER (Task)
      const sDate = new Date(serviceAssignForm.service_date)
      const reminderDate = new Date(sDate)
      reminderDate.setDate(reminderDate.getDate() + Number(serviceAssignForm.reminder_days))
      
      const taskPayload = {
        user_id: session.user.id,
        account_id: selectedAccount.id,
        title: `Service Reminder: ${selectedSvc.service_name} for ${selectedAccount.account_name}`,
        task_type: 'Renewal',
        due_date: reminderDate.toISOString(),
        status: 'Pending'
      }

      if (taskId) {
        await supabase.from('tasks').update(taskPayload).eq('id', taskId)
      } else {
        const { data: t, error: tErr } = await supabase.from('tasks').insert([taskPayload]).select().single()
        if (tErr) throw tErr
        taskId = t.id
      }

      // 3. CREATE/UPDATE SERVICE ENTRY
      const selectedSvcType = selectedSvc?.service_type || 'Instant'
      const csPayload = {
        user_id: session.user.id,
        account_id: String(selectedAccount.id),
        service_id: serviceAssignForm.service_id,
        price: serviceAssignForm.price,
        assigned_date: serviceAssignForm.service_date,
        notes: serviceAssignForm.notes,
        quote_id: quoteId,
        task_id: taskId,  // Link for future syncs
        status: selectedSvcType === 'Instant' ? 'Completed' : 'Active'
      }

      if (editingServiceEntry) {
        const { error } = await supabase.from('customer_services').update(csPayload).eq('id', editingServiceEntry.id)
        if (error) throw error
        toast.success('Service, Invoice & Reminder synced!', { id: toastId })
      } else {
        const { error } = await supabase.from('customer_services').insert([csPayload])
        if (error) throw error
        toast.success('Service entry saved! Invoice and Reminder generated.', { id: toastId })
      }
      
      // Stage assignment: Instant services auto-complete and bypass Kanban, Multi-Stage behaves as today
      if (isB2C) {
        if (selectedSvcType === 'Instant') {
          const completedStage = b2cStages.find(s => s.name === 'Completed')
          if (completedStage) {
            await supabase.from('accounts').update({ b2c_stage_id: completedStage.id }).eq('id', selectedAccount.id)
            await supabase.from('b2c_customer_stages').insert([{
              customer_id: String(selectedAccount.id),
              stage_id: completedStage.id,
              service_id: serviceAssignForm.service_id,
              moved_at: new Date().toISOString()
            }])
          }
        } else if (selectedSvcType === 'Multi-Stage') {
          if (serviceEntryTab === 'stage' && serviceAssignForm.b2c_stage_id) {
            await supabase.from('accounts').update({ b2c_stage_id: serviceAssignForm.b2c_stage_id }).eq('id', selectedAccount.id)
            await supabase.from('b2c_customer_stages').insert([{
              customer_id: String(selectedAccount.id),
              stage_id: serviceAssignForm.b2c_stage_id,
              service_id: serviceAssignForm.service_id,
              moved_at: new Date().toISOString()
            }])
          }
        }
      }

      setIsServiceModalOpen(false)
      fetchAccountDetails(selectedAccount.id, selectedAccount.account_name)
      fetchAccounts()
      
      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: editingServiceEntry ? 'Service Updated' : 'Service Added',
        description: `${editingServiceEntry ? 'Updated' : 'Added'} "${selectedSvc.service_name}" service for ${selectedAccount.account_name} (Invoice Synced)`
      }])
    } catch (err) {
      toast.error(err.message, { id: toastId })
    }
  }

  const handleDeleteServiceEntry = async (entry) => {
    if (!confirm('Delete this service entry and its linked invoice?')) return
    const toastId = toast.loading('Deleting service, invoice, and reminder...')
    try {
      // 1. Delete linked Invoice
      if (entry.quote_id) { await supabase.from('quotes').delete().eq('id', entry.quote_id) }
      // 2. Delete linked Reminder
      if (entry.task_id) { await supabase.from('tasks').delete().eq('id', entry.task_id) }
      // 3. Delete the Entry
      await supabase.from('customer_services').delete().eq('id', entry.id)
      
      toast.success('Service, Invoice, and Reminder removed', { id: toastId })
      fetchAccountDetails(selectedAccount.id, selectedAccount.account_name)
    } catch (err) { toast.error('Failed to remove entry', { id: toastId }) }
  }

  const handleDeleteAccount = async (acc) => {
    if (!confirm(`Are you sure you want to delete "${acc.account_name}"? All service history and invoices will be permanently removed.`)) return
    const toastId = toast.loading('Deleting customer profile...')
    try {
      const { error } = await supabase.from('accounts').delete().eq('id', acc.id)
      if (error) throw error
      toast.success('Profile deleted', { id: toastId })
      fetchAccounts()
    } catch (err) {
      toast.error('Failed to delete profile: ' + err.message, { id: toastId })
    }
  }

  const handleTaskAction = async (task, action) => {
    try {
      if (action === 'done') {
        await supabase.from('tasks').update({ status: 'Completed' }).eq('id', task.id)
        toast.success('Reminder cleared')
      } else if (action === 'snooze') {
        const nextDate = new Date()
        nextDate.setDate(nextDate.getDate() + 1)
        await supabase.from('tasks').update({ due_date: nextDate.toISOString(), status: 'Pending' }).eq('id', task.id)
        toast.success('Snoozed to tomorrow')
      }
      fetchAccountDetails(selectedAccount.id, selectedAccount.account_name)
    } catch { toast.error('Action failed') }
  }

  const downloadInvoicePDF = (inv) => {
    const doc = new jsPDF()
    const invNo = inv.invoice_number || `INV-${inv.id.slice(0,6).toUpperCase()}`
    doc.setFillColor(243, 122, 35)
    doc.rect(0, 0, 210, 40, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('TAX INVOICE', 14, 25)
    doc.setFontSize(10)
    doc.text(`Invoice #: ${invNo}`, 160, 20)
    doc.text(`Date: ${new Date(inv.created_at).toLocaleDateString()}`, 160, 27)
    doc.setTextColor(40, 40, 40)
    doc.setFontSize(12)
    doc.text('BILLED TO:', 14, 55)
    doc.setFontSize(14)
    doc.text(selectedAccount.account_name, 14, 63)
    doc.setFontSize(10)
    doc.setTextColor(100)
    if (accContacts[0]?.email) doc.text(accContacts[0]?.email, 14, 70)
    if (accContacts[0]?.phone) doc.text(accContacts[0]?.phone, 14, 75)
    doc.autoTable({
      startY: 85,
      head: [['Description', 'Service Date', 'Rate', 'Total']],
      body: [[inv.quote_name.replace('Service Invoice: ', ''), new Date(inv.created_at).toLocaleDateString(), `${profile?.currency || '$'}${Number(inv.total_price).toLocaleString()}`, `${profile?.currency || '$'}${Number(inv.total_price).toLocaleString()}`]],
      theme: 'grid',
      headStyles: { fillColor: [243, 122, 35], textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 8 }
    })
    const finalY = doc.lastAutoTable.finalY
    doc.setFontSize(12)
    doc.setTextColor(0)
    doc.text(`GRAND TOTAL: ${profile?.currency || '$'}${Number(inv.total_price).toLocaleString()}`, 145, finalY + 20)
    doc.text(`Status: ${inv.status}`, 145, finalY + 28)
    doc.save(`${invNo}_${selectedAccount.account_name.replace(' ', '_')}.pdf`)
    toast.success('Invoice Downloaded')
  }

  if (loading) return <div className="loading-container"><div className="spinner" /></div>

  if (selectedAccount) {
    const activeTasks = accTasks.filter(t => t.status !== 'Completed')
    return (
      <div className="customer-detail-view">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <button className="back-btn" onClick={() => setSelectedAccount(null)} style={{ margin: 0 }} title="Back to Accounts">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </button>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => {
              setNewContactForm({
                name: '',
                email: '',
                phone: '',
                gender: '',
                contact_owner: profile?.name || session?.user?.email || ''
              })
              setIsAddContactModalOpen(true)
            }}>
              <Plus size={16} /> Add Contact
            </button>
            <button className="btn btn-secondary" onClick={() => { setActiveTab('opportunities'); handleOpenOppModal(); }}>
              <TrendingUp size={16} /> Add Opportunity
            </button>
            {!isB2C && (
              <button className="btn btn-secondary" onClick={() => handleOpenServiceModal()}><Plus size={16} /> Add Service Entry</button>
            )}
            <button className="btn btn-primary" onClick={() => handleOpenModal(selectedAccount)}><Edit2 size={16} /> {isB2C ? 'Edit Profile' : 'Edit Account'}</button>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24, padding: 30, borderLeft: '6px solid #f37a23', position: 'relative' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 300px', gap: 24, alignItems: 'start' }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg, #f37a23 0%, #ff8c42 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 32, fontWeight: 900 }}>
              {selectedAccount?.account_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, color: 'var(--text-primary)' }}>{selectedAccount.account_name}</h1>
                <span className={`badge badge-${(selectedAccount.status || '').toLowerCase()}`}>{selectedAccount.status}</span>
                {isB2C && b2cStages.length > 0 && (() => {
                  const currentStg = b2cStages.find(st => st.id === selectedAccount.b2c_stage_id)
                  return currentStg && (
                    <span className="badge" style={{ fontSize: 12, padding: '4px 12px', background: (currentStg.color || '#f97316') + '20', color: currentStg.color || '#f97316', fontWeight: 800 }}>
                      {currentStg.name}
                    </span>
                  )
                })()}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginTop: 15 }}>
                <div style={detailFieldStyle}><span style={labelStyle}>Owner:</span> <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedAccount.account_owner || selectedAccount.custom_data?.account_owner || (selectedAccount.user_id === session.user.id ? (profile?.name || session.user.email) : null) || 'Unassigned'}</span></div>
                
                {/* Website Link */}
                {(!isB2C || selectedAccount.website || selectedAccount.domain || selectedAccount.custom_data?.website) && (
                  <div style={detailFieldStyle}>
                    <span style={labelStyle}>Website:</span>{' '}
                    {(selectedAccount.website || selectedAccount.domain || selectedAccount.custom_data?.website) ? (
                      <a
                        href={(selectedAccount.website || selectedAccount.domain || selectedAccount.custom_data?.website).startsWith('http') ? (selectedAccount.website || selectedAccount.domain || selectedAccount.custom_data?.website) : `https://${selectedAccount.website || selectedAccount.domain || selectedAccount.custom_data?.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#f37a23', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        {selectedAccount.website || selectedAccount.domain || selectedAccount.custom_data?.website} <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>—</span>
                    )}
                  </div>
                )}

                {/* Email (Shown for B2C or if present) */}
                {(isB2C || selectedAccount.email || selectedAccount.contacts?.[0]?.email) && (
                  <div style={detailFieldStyle}><span style={labelStyle}>Email:</span> <span style={{ color: 'var(--text-primary)' }}>{selectedAccount.email || selectedAccount.contacts?.[0]?.email || '—'}</span></div>
                )}

                <div style={{ ...detailFieldStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={labelStyle}>Phone:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{(() => { const raw = selectedAccount.phone || selectedAccount.contacts?.[0]?.phone; const cleaned = cleanPhoneNumber(raw); return cleaned ? formatPhoneDisplay(cleaned) : (raw || '—'); })()}</span>
                  <WhatsAppButton
                    phone={selectedAccount.phone || selectedAccount.contacts?.[0]?.phone}
                    messageText={getWhatsAppMessage('customer', {
                      firstName: (selectedAccount.account_name || '').split(' ')[0],
                      agentName: profile?.name || session.user.email,
                      businessName: profile?.company_name || 'our company'
                    })}
                    session={session}
                    recordName={selectedAccount.account_name}
                  />
                </div>

                <div style={{ ...detailFieldStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={labelStyle}>Contacts:</span>
                  <button
                    onClick={() => setActiveTab('contacts')}
                    style={{ background: 'none', border: 'none', padding: 0, color: '#f37a23', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {accContacts.length} linked contact{accContacts.length === 1 ? '' : 's'}
                  </button>
                </div>

                <div style={{ ...detailFieldStyle, gridColumn: 'span 2' }}>
                  <span style={labelStyle}>Address:</span>
                  <div style={{ marginTop: 4, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    {selectedAccount.address || 'No address provided'}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right', paddingLeft: 24, borderLeft: '1px solid var(--border-subtle)' }}>
               <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 15 }}>
                 <div style={{ marginBottom: 4 }}><span style={labelStyle}>Owner:</span> <span style={{ color: 'var(--text-primary)' }}>{selectedAccount.account_owner || selectedAccount.custom_data?.account_owner || (selectedAccount.user_id === session.user.id ? (profile?.name || session.user.email) : null) || 'Unassigned'}</span></div>
                 <div><span style={labelStyle}>Joined:</span> <span style={{ color: 'var(--text-primary)' }}>{new Date(selectedAccount.created_at).toLocaleDateString()}</span></div>
                 <div><span style={labelStyle}>Last Update:</span> <span style={{ color: 'var(--text-primary)' }}>{new Date(selectedAccount.updated_at || selectedAccount.created_at).toLocaleString()}</span></div>
               </div>
               
               {/* Custom Fields Summary */}
               {customFieldConfigs.filter(cf => !cf.is_core).length > 0 && (
                 <div style={{ marginTop: 20, textAlign: 'left', borderTop: '1px solid #f1f5f9', paddingTop: 15 }}>
                   <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Additional Details</div>
                   <div style={{ display: 'grid', gap: 6 }}>
                     {customFieldConfigs.filter(cf => !cf.is_core).map(cf => (
                       <div key={cf.id} style={{ fontSize: 12 }}>
                         <span style={labelStyle}>{cf.label}:</span> {selectedAccount.custom_data?.[cf.field_key]?.toString() || '—'}
                       </div>
                     ))}
                   </div>
                 </div>
               )}
            </div>
          </div>
          {selectedAccount.notes && (
            <div style={{ marginTop: 20, paddingTop: 15, borderTop: '1px solid #f1f5f9' }}>
               <span style={labelStyle}>Internal Notes:</span>
               <p style={{ marginTop: 6, fontSize: 13, color: '#475569', fontStyle: 'italic' }}>{selectedAccount.notes}</p>
            </div>
          )}
        </div>

        <div className="tabs" style={{ marginBottom: 24 }}>
          <button className={`tab ${activeTab === 'contacts' ? 'active' : ''}`} onClick={() => setActiveTab('contacts')}>
            <Users size={16} /> Contacts {accContacts.length > 0 && <span className="tab-badge">{accContacts.length}</span>}
          </button>
          {!isB2C && (
            <button className={`tab ${activeTab === 'opportunities' ? 'active' : ''}`} onClick={() => setActiveTab('opportunities')}>
              <TrendingUp size={16} /> Opportunities {accOpportunities.length > 0 && <span className="tab-badge">{accOpportunities.length}</span>}
            </button>
          )}
          <button className={`tab ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')}><Package size={16} /> Service History</button>
          <button className={`tab ${activeTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveTab('invoices')}><CreditCard size={16} /> Invoices</button>
          <button className={`tab ${activeTab === 'reminders' ? 'active' : ''}`} onClick={() => setActiveTab('reminders')}><Calendar size={16} /> Reminders {activeTasks.length > 0 && <span className="tab-badge">{activeTasks.length}</span>}</button>
          <button className={`tab ${activeTab === 'interactions' ? 'active' : ''}`} onClick={() => setActiveTab('interactions')}><FileText size={16} /> Interactions</button>
        </div>

        <div className="tab-content">
          {activeTab === 'contacts' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
                    Contacts ({accContacts.length})
                  </h3>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                    People and stakeholders associated with {selectedAccount.account_name}
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setNewContactForm({
                      name: '',
                      email: '',
                      phone: '',
                      gender: '',
                      contact_owner: profile?.name || session?.user?.email || ''
                    })
                    setIsAddContactModalOpen(true)
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <Plus size={16} /> Add Contact
                </button>
              </div>

              {accContacts.length === 0 ? (
                <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 20, background: '#fff7ed', border: '1px solid #fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#f37a23' }}>
                    <Users size={32} />
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                    No contacts created under this account yet
                  </h4>
                  <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-secondary)', maxWidth: 420, marginInline: 'auto' }}>
                    Add key contacts, managers, and stakeholders to track discussions and communicate with {selectedAccount.account_name}.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setNewContactForm({
                        name: '',
                        email: '',
                        phone: '',
                        gender: '',
                        contact_owner: profile?.name || session?.user?.email || ''
                      })
                      setIsAddContactModalOpen(true)
                    }}
                  >
                    <Plus size={16} /> Add First Contact
                  </button>
                </div>
              ) : (
                <div className="table-container card">
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Contact Name</th>
                          <th>Email Address</th>
                          <th>Phone Number</th>
                          <th>Contact Owner</th>
                          <th>Added On</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accContacts.map(c => (
                          <tr key={c.id}>
                            <td className="fw-bold">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>
                                  {c.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div>
                                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{c.name}</div>
                                  {c.gender && (
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{c.gender}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>
                              {c.email ? (
                                <a href={`mailto:${c.email}`} style={{ color: '#f37a23', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  <Mail size={13} /> {c.email}
                                </a>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>
                            <td>
                              {c.phone ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                                    {formatPhoneDisplay(cleanPhoneNumber(c.phone)) || c.phone}
                                  </span>
                                  <WhatsAppButton
                                    phone={c.phone}
                                    messageText={getWhatsAppMessage('customer', {
                                      firstName: (c.name || '').split(' ')[0],
                                      agentName: profile?.name || session.user.email,
                                      businessName: profile?.company_name || 'our company'
                                    })}
                                    session={session}
                                    recordName={c.name}
                                  />
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>
                            <td>
                              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                                {c.contact_owner || profile?.name || session.user.email || '—'}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '6px 10px', color: '#ef4444', borderColor: '#fecaca', background: '#fff' }}
                                title="Remove contact"
                                onClick={async () => {
                                  if (!window.confirm(`Delete contact "${c.name}" from this account?`)) return
                                  const tId = toast.loading('Deleting contact...')
                                  try {
                                    const { error } = await supabase.from('contacts').delete().eq('id', c.id)
                                    if (error) throw error
                                    setAccContacts(prev => prev.filter(x => x.id !== c.id))
                                    toast.success('Contact deleted', { id: tId })
                                  } catch (err) {
                                    toast.error(err.message || 'Failed to delete contact', { id: tId })
                                  }
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'opportunities' && (
            <div>
              {/* Summary Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div className="card" style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #fff 0%, #fff7ed 100%)', border: '1px solid #fed7aa' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Opportunities</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#c2410c', marginTop: 4 }}>{accOpportunities.length}</div>
                </div>
                <div className="card" style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #fff 0%, #f0fdf4 100%)', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pipeline Value</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#15803d', marginTop: 4 }}>
                    {profile?.currency || '$'}{accOpportunities.reduce((sum, o) => sum + (Number(o.amount) || 0), 0).toLocaleString()}
                  </div>
                </div>
                <div className="card" style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #fff 0%, #eff6ff 100%)', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Won / Closed Value</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#1d4ed8', marginTop: 4 }}>
                    {profile?.currency || '$'}{accOpportunities.filter(o => (o.stage || '').toLowerCase().includes('closed') || (o.stage || '').toLowerCase().includes('won')).reduce((sum, o) => sum + (Number(o.amount) || 0), 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Opportunities List Card */}
              <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: 20, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Account Opportunities</h3>
                  <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => handleOpenOppModal()}>
                    <Plus size={14} /> Add Opportunity
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, width: 30 }}></th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12 }}>Deal Name</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12 }}>Stage</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12 }}>Amount</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12 }}>Quotes / Invoices</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12 }}>Close Date</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accOpportunities.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                            <TrendingUp size={36} style={{ margin: '0 auto 12px', opacity: 0.4, display: 'block' }} />
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 4 }}>No opportunities found for this account</div>
                            <div style={{ fontSize: 13, marginBottom: 16 }}>Create a new deal to track pipeline progress and revenue.</div>
                            <button className="btn btn-primary btn-sm" onClick={() => handleOpenOppModal()}>
                              <Plus size={14} style={{ marginRight: 6 }} /> Add First Opportunity
                            </button>
                          </td>
                        </tr>
                      ) : (
                        accOpportunities.map(opp => {
                          const stageColors = {
                            prospecting: { bg: '#eff6ff', color: '#1d4ed8' },
                            scoping: { bg: '#f5f3ff', color: '#6d28d9' },
                            negotiation: { bg: '#fffbeb', color: '#b45309' },
                            legal: { bg: '#fdf2f8', color: '#be185d' },
                            contract: { bg: '#f0fdfa', color: '#0f766e' },
                            closed: { bg: '#f0fdf4', color: '#15803d' },
                            closed_won: { bg: '#f0fdf4', color: '#15803d' },
                            closed_lost: { bg: '#fef2f2', color: '#b91c1c' }
                          }
                          const stageKey = (opp.stage || '').toLowerCase().replace(' ', '_')
                          const stColor = stageColors[stageKey] || { bg: '#f1f5f9', color: '#475569' }

                          // Parse linked quotes/invoices from the joined data
                          const linkedQuotes = (opp.quotes || []).filter(q => {
                            // Quotes module stores JSON in quote_name
                            try { JSON.parse(q.quote_name); return true } catch { return false }
                          })
                          const linkedInvoices = (opp.quotes || []).filter(q => {
                            // Invoices store plain text in quote_name
                            try { JSON.parse(q.quote_name); return false } catch { return true }
                          })
                          const totalLinked = linkedQuotes.length + linkedInvoices.length
                          const isExpanded = expandedOppId === opp.id

                          const parseQName = (raw) => {
                            if (!raw) return ''
                            try { const p = JSON.parse(raw); return p.name || raw } catch { return raw }
                          }

                          return (
                            <React.Fragment key={opp.id}>
                            <tr style={{ borderTop: '1px solid #f1f5f9', cursor: totalLinked > 0 ? 'pointer' : 'default', background: isExpanded ? '#fffbf5' : 'transparent', transition: 'background 0.2s' }}
                              onClick={() => totalLinked > 0 && setExpandedOppId(isExpanded ? null : opp.id)}
                            >
                              <td style={{ padding: '14px 8px 14px 16px', width: 30 }}>
                                {totalLinked > 0 ? (
                                  isExpanded ? <ChevronDown size={16} style={{ color: '#f37a23' }} /> : <ChevronRight size={16} style={{ color: '#94a3b8' }} />
                                ) : (
                                  <span style={{ display: 'inline-block', width: 16 }} />
                                )}
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <span
                                  style={{ fontWeight: 800, color: '#f37a23', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                  onClick={(e) => { e.stopPropagation(); navigate('/dashboard/opportunities', { state: { openId: opp.id } }) }}
                                  title="View in Opportunities Module"
                                >
                                  {opp.name}
                                  <ExternalLink size={12} style={{ opacity: 0.6 }} />
                                </span>
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 12, background: stColor.bg, color: stColor.color, fontWeight: 800, textTransform: 'capitalize' }}>
                                  {opp.stage || 'Prospecting'}
                                </span>
                              </td>
                              <td style={{ padding: '14px 16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                {profile?.currency || '$'}{Number(opp.amount || 0).toLocaleString()}
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                {totalLinked > 0 ? (
                                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    {linkedQuotes.length > 0 && (
                                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10, background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <FileText size={11} /> {linkedQuotes.length} Quote{linkedQuotes.length > 1 ? 's' : ''}
                                      </span>
                                    )}
                                    {linkedInvoices.length > 0 && (
                                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10, background: '#f0fdf4', color: '#15803d', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        <Receipt size={11} /> {linkedInvoices.length} Invoice{linkedInvoices.length > 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: '14px 16px', fontSize: 13, color: '#64748b' }}>
                                {opp.closed_date ? new Date(opp.closed_date).toLocaleDateString() : '—'}
                              </td>
                              <td style={{ padding: '14px 16px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                                <button
                                  className="btn-icon"
                                  style={{ marginRight: 6 }}
                                  onClick={() => navigate('/dashboard/opportunities', { state: { openId: opp.id } })}
                                  title="Open in Deals module"
                                >
                                  <ExternalLink size={15} />
                                </button>
                                <button
                                  className="btn-icon"
                                  style={{ marginRight: 6 }}
                                  onClick={() => handleOpenOppModal(opp)}
                                  title="Edit Opportunity"
                                >
                                  <Edit2 size={15} />
                                </button>
                                {isAdmin && (
                                  <button
                                    className="btn-icon text-danger"
                                    onClick={() => handleDeleteOpportunity(opp.id, opp.name)}
                                    title="Delete Opportunity"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </td>
                            </tr>

                            {/* Expanded: Linked Quotes & Invoices */}
                            {isExpanded && totalLinked > 0 && (
                              <tr>
                                <td colSpan={7} style={{ padding: 0, background: 'var(--bg-secondary)' }}>
                                  <div style={{ padding: '12px 20px 16px 52px', borderBottom: '2px solid var(--border)' }}>
                                    {/* Linked Quotes */}
                                    {linkedQuotes.length > 0 && (
                                      <div style={{ marginBottom: linkedInvoices.length > 0 ? 16 : 0 }}>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <FileText size={13} /> Linked Quotes
                                        </div>
                                        <div style={{ display: 'grid', gap: 8 }}>
                                          {linkedQuotes.map(q => {
                                            const qMeta = (() => { try { const p = JSON.parse(q.quote_name); return p } catch { return { name: q.quote_name, status: 'Draft' } } })()
                                            return (
                                              <div key={q.id}
                                                onClick={() => navigate('/dashboard/quotes', { state: { openId: q.id } })}
                                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'all 0.15s' }}
                                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-light)' }}
                                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.boxShadow = 'none' }}
                                                title="Open in Quotes module"
                                              >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <FileText size={14} style={{ color: '#60a5fa' }} />
                                                  </div>
                                                  <div>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{qMeta.name || 'Untitled Quote'}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{q.created_at ? new Date(q.created_at).toLocaleDateString() : ''}</div>
                                                  </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                  <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)' }}>{profile?.currency || '$'}{Number(q.total_price || 0).toLocaleString()}</span>
                                                  <span className={`badge badge-${(qMeta.status || 'draft').toLowerCase()}`}>{qMeta.status || 'Draft'}</span>
                                                  <ExternalLink size={13} style={{ color: 'var(--text-muted)' }} />
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Linked Invoices */}
                                    {linkedInvoices.length > 0 && (
                                      <div>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <Receipt size={13} /> Linked Invoices
                                        </div>
                                        <div style={{ display: 'grid', gap: 8 }}>
                                          {linkedInvoices.map(inv => {
                                            const invName = parseQName(inv.quote_name)
                                            const invNo = inv.invoice_number || `INV-${inv.id.slice(0,6).toUpperCase()}`
                                            return (
                                              <div key={inv.id}
                                                onClick={() => navigate('/dashboard/invoices', { state: { openId: inv.id } })}
                                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'all 0.15s' }}
                                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.15)' }}
                                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.boxShadow = 'none' }}
                                                title="Open in Invoices module"
                                              >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Receipt size={14} style={{ color: '#34d399' }} />
                                                  </div>
                                                  <div>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{invName || invNo}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{invNo} • {inv.expires_at ? `Due: ${new Date(inv.expires_at).toLocaleDateString()}` : (inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '')}</div>
                                                  </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                  <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)' }}>{profile?.currency || '$'}{Number(inv.total_price || 0).toLocaleString()}</span>
                                                  <span className={`badge badge-${(inv.status || 'unpaid').toLowerCase()}`}>{inv.status || 'Unpaid'}</span>
                                                  <ExternalLink size={13} style={{ color: 'var(--text-muted)' }} />
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                            </React.Fragment>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: 20, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Past Service Performance</h3>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setIsServiceFieldBuilderOpen(true)}>
                    <Settings size={14} /> Edit fields
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => handleOpenServiceModal()}>Add Entry</button>
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {serviceHistoryConfigs.filter(c => c.show_in_list).map(config => (
                      <th key={config.id} style={{ padding: 15, textAlign: 'left', fontSize: 12 }}>{config.label}</th>
                    ))}
                    <th style={{ padding: 15, textAlign: 'right', fontSize: 12 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accServices.length === 0 ? (
                    <tr><td colSpan={serviceHistoryConfigs.filter(c => c.show_in_list).length + 1} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No service history found.</td></tr>
                  ) : (
                    accServices.map(s => (
                      <tr key={s.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                        {serviceHistoryConfigs.filter(c => c.show_in_list).map(config => {
                          if (config.field_key === 'service_name') {
                            return <td key={config.id} style={{ padding: 15, fontWeight: 700 }}>{s.services?.service_name}</td>
                          }
                          if (config.field_key === 'assigned_date') {
                            return <td key={config.id} style={{ padding: 15 }}>{new Date(s.assigned_date).toLocaleDateString()}</td>
                          }
                          if (config.field_key === 'price') {
                            return <td key={config.id} style={{ padding: 15, fontWeight: 800 }}>{profile?.currency || '$'}{Number(s.price).toLocaleString()}</td>
                          }
                          if (config.field_key === 'status') {
                            return (
                              <td key={config.id} style={{ padding: 15 }}>
                                <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 12, background: s.status === 'Completed' ? '#dcfce3' : '#f1f5f9', color: s.status === 'Completed' ? '#16a34a' : '#64748b', fontWeight: 800 }}>
                                  {s.status || 'Active'}
                                </span>
                              </td>
                            )
                          }
                          if (config.field_key === 'current_stage') {
                            return (
                              <td key={config.id} style={{ padding: 15 }}>
                                {(() => {
                                  const getStage = () => {
                                    if (s.status === 'Completed') {
                                      return s.currentStage || b2cStages.find(st => st.name === 'Completed') || null
                                    } else {
                                      if (s.currentStage) return s.currentStage
                                      const accountStage = selectedAccount.b2c_stage_id
                                        ? b2cStages.find(st => st.id === selectedAccount.b2c_stage_id)
                                        : null
                                      if (accountStage && accountStage.name === 'Completed') {
                                        return b2cStages.find(st => st.name !== 'Completed') || null
                                      }
                                      return accountStage
                                    }
                                  }
                                  const stg = getStage()
                                  return stg ? (
                                    <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 12, background: (stg.color || '#f97316') + '20', color: stg.color || '#f97316', fontWeight: 800 }}>
                                      {stg.name}
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: 11, color: '#94a3b8' }}>—</span>
                                  )
                                })()}
                              </td>
                            )
                          }
                          if (config.field_key === 'notes') {
                            return <td key={config.id} style={{ padding: 15, color: '#64748b' }}>{s.notes || '-'}</td>
                          }
                          return <td key={config.id} style={{ padding: 15 }}>{s[config.field_key] || s.custom_data?.[config.field_key] || '—'}</td>
                        })}
                        <td style={{ padding: 15, textAlign: 'right' }}>
                          <button className="btn-icon" onClick={() => handleOpenServiceModal(s)}><Edit2 size={14}/></button>
                          {isAdmin && (
                            <button className="btn-icon text-danger" onClick={() => handleDeleteServiceEntry(s)}><Trash2 size={14}/></button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="card" style={{ padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: 15, textAlign: 'left', fontSize: 12 }}>Invoice ID</th>
                    <th style={{ padding: 15, textAlign: 'left', fontSize: 12 }}>Service</th>
                    <th style={{ padding: 15, textAlign: 'left', fontSize: 12 }}>Amount</th>
                    <th style={{ padding: 15, textAlign: 'left', fontSize: 12 }}>Status</th>
                    <th style={{ padding: 15, textAlign: 'right', fontSize: 12 }}>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {accInvoices.map(inv => (
                    <tr key={inv.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{inv.invoice_number || `INV-${inv.id.slice(0,6).toUpperCase()}`}</td>
                      <td style={{ padding: 15, color: 'var(--text-primary)' }}>{parseQName(inv.quote_name)}</td>
                      <td style={{ padding: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{profile?.currency || '$'}{Number(inv.total_price).toLocaleString()}</td>
                      <td style={{ padding: 15 }}>
                        <button onClick={() => handleStatusToggle(inv)} className={`badge badge-${(inv.status || 'unpaid').toLowerCase()}`} style={{ border: 'none', cursor: 'pointer' }}>{inv.status || 'Unpaid'}</button>
                      </td>
                      <td style={{ padding: 15, textAlign: 'right' }}>
                        <button className="btn-icon" style={{ marginRight: 8, color: '#2563eb' }} onClick={() => handleOpenInvoiceModal(inv)} title="Open Invoice"><Eye size={16} /></button>
                        <button className="btn-icon" onClick={() => downloadInvoicePDF(inv)} title="Download PDF"><Download size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'reminders' && (
            <div className="reminders-list" style={{ display: 'grid', gap: 16 }}>
              {activeTasks.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No active reminders.</div>
              ) : (
                activeTasks.map(t => {
                  const isOverdue = new Date(t.due_date) < new Date()
                  return (
                    <div key={t.id} className="card reminder-item" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `6px solid ${isOverdue ? '#ef4444' : '#f37a23'}`, backgroundColor: isOverdue ? '#fef2f2' : '#fff' }}>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        <div style={{ background: isOverdue ? 'rgba(239, 68, 68, 0.15)' : 'var(--accent-light)', color: isOverdue ? '#f87171' : 'var(--accent)', padding: 14, borderRadius: 12 }}>
                          {isOverdue ? <AlertCircle size={24} /> : <Calendar size={24} />}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>{selectedAccount.account_name}</span>
                            <span style={{ color: 'var(--text-muted)' }}>•</span>
                            <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{t.title.split(': ')[1]?.split(' for ')[0] || t.title}</span>
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                            <span style={{ color: isOverdue ? '#f87171' : 'var(--accent)', fontWeight: 800 }}>⚡ Action Due: {new Date(t.due_date).toLocaleDateString()}</span>
                            {isOverdue && <span className="badge badge-lost" style={{ marginLeft: 8, fontSize: 10 }}>OVERDUE</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn btn-sm btn-secondary" style={{ color: '#34d399', fontWeight: 700 }} onClick={() => handleTaskAction(t, 'done')}><Check size={14} /> Mark as Done</button>
                        <button className="btn btn-sm btn-secondary" style={{ color: 'var(--accent)', fontWeight: 700 }} onClick={() => handleTaskAction(t, 'snooze')}><Clock size={14} /> Snooze (1d)</button>
                        <button className="btn btn-sm btn-primary" style={{ padding: '0 15px' }} onClick={() => { 
                          setContactPopupData({
                            name: selectedAccount.account_name,
                            phone: accContacts[0]?.phone || selectedAccount.phone || 'No phone',
                            email: accContacts[0]?.email || selectedAccount.email || 'No email'
                          })
                        }}><Phone size={14} /> Contact Customer</button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}

          {activeTab === 'interactions' && (
             <div className="card" style={{ padding: 24 }}>
                <div className="activity-list">
                  {accActs.map(a => (
                    <div key={a.id} className="activity-item" style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
                      <div className="activity-dot" style={{ marginTop: 5 }} />
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{a.type}</div>
                        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{a.description}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{new Date(a.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          )}
        </div>

        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 800 }}>
              <div className="modal-header">
                <h2 className="modal-title">{editingAccount ? (isB2C ? 'Edit Profile' : 'Edit Account') : (isB2C ? 'Add New Customer' : 'Add New Account')}</h2>
                <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
              </div>
              <form onSubmit={async (e) => {
                  e.preventDefault()
                  const nameVal = formData.custom_data?.customer_name || formData.custom_data?.account_name || formData.custom_data?.full_name || formData.account_name
                  const nameCheck = validateRequired(nameVal, isB2C ? 'Customer Name' : 'Account Name')
                  if (!nameCheck.valid) { toast.error(nameCheck.error); return }

                  const phoneVal = formData.custom_data?.contact_number || (!formData.custom_data?.contact_primary?.includes('@') ? formData.custom_data.contact_primary : (formData.phone || ''))
                  const phoneCheck = validatePhone(phoneVal, { label: 'Contact Number', required: isB2C })
                  if (!phoneCheck.valid) { toast.error(phoneCheck.error); return }

                  const emailVal = isB2C 
                    ? (formData.custom_data?.email_id || (formData.custom_data?.contact_primary?.includes('@') ? formData.custom_data.contact_primary : (formData.email || '')))
                    : (formData.email || '')
                  const emailCheck = validateEmail(emailVal, { label: 'Email Address', required: false })
                  if (!emailCheck.valid) { toast.error(emailCheck.error); return }

                  const websiteVal = formData.custom_data?.website || formData.website || formData.domain || ''
                  if (!isB2C && websiteVal) {
                    const webCheck = validateWebsite(websiteVal, { label: 'Website Link', required: false })
                    if (!webCheck.valid) { toast.error(webCheck.error); return }
                  }

                  const toastId = toast.loading('Saving...')
                  try {
                    const cleanWebsite = websiteVal || null
                    const payload = { 
                      account_name: nameVal, 
                      email: emailVal || null,
                      phone: phoneVal ? sanitizePhone(phoneVal) : null,
                      website: cleanWebsite,
                      domain: cleanWebsite,
                      address: formData.custom_data?.address || formData.address || null,
                      notes: formData.notes,
                      status: formData.status,
                      account_owner: formData.account_owner || profile?.name || session.user.email || null,
                      custom_data: formData.custom_data,
                      user_id: session.user.id,
                      updated_at: new Date().toISOString()
                    }

                    if (isB2C && b2cStages.length > 0 && !editingAccount) {
                      payload.b2c_stage_id = b2cStages[0].id
                    }
                    
                    let accountId
                    if (editingAccount) {
                      await supabase.from('accounts').update(payload).eq('id', editingAccount.id)
                      accountId = editingAccount.id
                      if (formData.contact_id) { 
                        await supabase.from('contacts').update({ 
                          phone: payload.phone, 
                          email: payload.email, 
                          name: payload.account_name 
                        }).eq('id', formData.contact_id) 
                      }
                    } else {
                      const { data: n, error: nErr } = await supabase.from('accounts').insert([payload]).select().single()
                      if (nErr) throw nErr
                      accountId = n.id
                      if (isB2C) {
                        await supabase.from('contacts').insert([{ 
                          account_id: n.id, 
                          phone: payload.phone, 
                          email: payload.email, 
                          name: payload.account_name, 
                          user_id: session.user.id 
                        }])
                      }
                    }
                    
                    toast.success(isB2C ? 'Customer profile saved!' : 'Account saved!', { id: toastId })
                    setIsModalOpen(false)
                    fetchAccounts()
                    // Refresh the detail view with updated data
                    if (editingAccount && selectedAccount) {
                      const { data: updated } = await supabase
                        .from('accounts')
                        .select('*, contacts(phone, email, id)')
                        .eq('id', editingAccount.id)
                        .single()
                      if (updated) setSelectedAccount(updated)
                    }
                  } catch (err) { toast.error(err.message, { id: toastId }) }
              }}>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                   <div className="form-group" style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '12px 20px', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label" style={{ margin: 0 }}>{isB2C ? 'Customer Relationship Status' : 'Account Status'}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: formData.status === 'Active' ? '#16a34a' : '#64748b' }}>
                          {formData.status.toUpperCase()}
                        </span>
                        <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                          <input type="checkbox" className="sr-only" checked={formData.status === 'Active'} onChange={(e) => setFormData({...formData, status: e.target.checked ? 'Active' : 'Inactive'})} />
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: formData.status === 'Active' ? '#dcfce3' : '#e2e8f0', borderRadius: 24, transition: '0.4s' }}></div>
                          <div style={{ position: 'absolute', height: 18, width: 18, left: formData.status === 'Active' ? 22 : 3, bottom: 3, backgroundColor: formData.status === 'Active' ? '#16a34a' : '#94a3b8', borderRadius: '50%', transition: '0.4s' }}></div>
                        </label>
                      </div>
                   </div>

                   {customFieldConfigs.map(config => (
                      <div key={config.id} className="form-group" style={{ gridColumn: (config.field_type === 'long_text' || config.field_type === 'file_upload') ? 'span 2' : 'auto' }}>
                        <label className="form-label">{config.label} {config.is_required && <span className="text-danger">*</span>}</label>
                        {renderCustomFieldInput(config, formData.custom_data[config.field_key], (val) => {
                          setFormData({
                            ...formData,
                            custom_data: { ...formData.custom_data, [config.field_key]: val }
                          })
                        }, session.user.id)}
                      </div>
                    ))}

                   <div className="form-group" style={{ gridColumn: 'span 2' }}>
                     <label className="form-label">{t('modules.accounts.colOwner', 'Account Owner')}</label>
                     <input
                       type="text"
                       className="form-input"
                       value={formData.account_owner || ''}
                       onChange={e => setFormData({ ...formData, account_owner: e.target.value })}
                       placeholder="Enter account owner..."
                     />
                   </div>
                 </div>
                 
                 <div className="form-actions" style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #f1f5f9' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">{editingAccount ? (isB2C ? 'Update Profile' : 'Update Account') : (isB2C ? 'Create Customer' : 'Create Account')}</button>
                 </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Contact directly to Account Modal */}
        {isAddContactModalOpen && selectedAccount && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 480 }}>
              <div className="modal-header">
                <h2 className="modal-title">Add Contact to {selectedAccount.account_name}</h2>
                <button className="modal-close" onClick={() => setIsAddContactModalOpen(false)}>✕</button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault()
                const nameCheck = validateRequired(newContactForm.name, 'Full Name')
                if (!nameCheck.valid) { toast.error(nameCheck.error); return }

                const phoneCheck = validatePhone(newContactForm.phone, { label: 'Phone Number', required: false })
                if (!phoneCheck.valid) { toast.error(phoneCheck.error); return }

                const emailCheck = validateEmail(newContactForm.email, { label: 'Email Address', required: false })
                if (!emailCheck.valid) { toast.error(emailCheck.error); return }

                const toastId = toast.loading('Saving contact...')
                try {
                  const { data, error } = await supabase.from('contacts').insert([{
                    account_id: selectedAccount.id,
                    name: newContactForm.name.trim(),
                    email: newContactForm.email ? newContactForm.email.trim() : null,
                    phone: newContactForm.phone ? sanitizePhone(newContactForm.phone) : null,
                    gender: newContactForm.gender || null,
                    contact_owner: newContactForm.contact_owner || profile?.name || session.user.email,
                    user_id: session.user.id
                  }]).select().single()

                  if (error) throw error

                  setAccContacts(prev => [data, ...prev])
                  setIsAddContactModalOpen(false)
                  setNewContactForm({
                    name: '',
                    email: '',
                    phone: '',
                    gender: '',
                    contact_owner: profile?.name || session.user.email
                  })
                  toast.success('Contact added successfully!', { id: toastId })
                } catch (err) {
                  toast.error(err.message || 'Failed to add contact', { id: toastId })
                }
              }}>
                <div style={{ display: 'grid', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      required
                      className="form-input"
                      value={newContactForm.name}
                      onChange={e => setNewContactForm({ ...newContactForm, name: e.target.value })}
                      placeholder="e.g. John Smith"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      value={newContactForm.email}
                      onChange={e => setNewContactForm({ ...newContactForm, email: e.target.value })}
                      placeholder="e.g. john@gmail.com"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number (10 digits)</label>
                    <input
                      type="tel"
                      maxLength={10}
                      inputMode="numeric"
                      className="form-input"
                      value={newContactForm.phone}
                      onChange={e => setNewContactForm({ ...newContactForm, phone: sanitizePhone(e.target.value) })}
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="form-group">
                      <label className="form-label">Gender</label>
                      <select
                        className="form-input"
                        value={newContactForm.gender}
                        onChange={e => setNewContactForm({ ...newContactForm, gender: e.target.value })}
                      >
                        <option value="">-- Select Gender --</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contact Owner</label>
                      <input
                        className="form-input"
                        value={newContactForm.contact_owner}
                        onChange={e => setNewContactForm({ ...newContactForm, contact_owner: e.target.value })}
                        placeholder="Owner..."
                      />
                    </div>
                  </div>
                </div>

                <div className="form-actions" style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid #f1f5f9' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAddContactModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Contact</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isServiceModalOpen && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 450 }}>
              <div className="modal-header">
                <h2 className="modal-title">{editingServiceEntry ? 'Edit Service Entry' : 'New Service Entry'}</h2>
                <button className="modal-close" onClick={() => setIsServiceModalOpen(false)}>✕</button>
              </div>

              {isB2C && b2cStages.length > 0 && (
                <div style={{ display: 'flex', gap: 10, padding: '0 24px', borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
                  <button 
                    className={`nav-tab ${serviceEntryTab === 'quick' ? 'active' : ''}`}
                    onClick={() => setServiceEntryTab('quick')}
                    style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: serviceEntryTab === 'quick' ? '3px solid #f37a23' : '3px solid transparent', color: serviceEntryTab === 'quick' ? '#f37a23' : '#64748b', fontWeight: 800, cursor: 'pointer' }}
                  >
                    ⚡ Quick Entry
                  </button>
                  <button 
                    className={`nav-tab ${serviceEntryTab === 'stage' ? 'active' : ''}`}
                    onClick={() => setServiceEntryTab('stage')}
                    style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: serviceEntryTab === 'stage' ? '3px solid #f37a23' : '3px solid transparent', color: serviceEntryTab === 'stage' ? '#f37a23' : '#64748b', fontWeight: 800, cursor: 'pointer' }}
                  >
                    🔄 Entry with Stages
                  </button>
                </div>
              )}

              <form onSubmit={handleAssignService}>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Select Master Service *</label>
                  <select required className="form-input" value={serviceAssignForm.service_id} 
                    onChange={e => {
                      const svc = availableServices.find(s => s.id === e.target.value)
                      setServiceAssignForm({...serviceAssignForm, service_id: e.target.value, price: svc?.price || 0, reminder_days: svc?.reminder_days || 7})
                    }}>
                    <option value="">-- Choose From Catalog --</option>
                    {availableServices.map(s => <option key={s.id} value={s.id}>{s.service_name}</option>)}
                  </select>
                </div>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                   <div className="form-group">
                      <label className="form-label">Price ({profile?.currency || '₹'})</label>
                      <input type="number" className="form-input" value={serviceAssignForm.price} onChange={e => setServiceAssignForm({...serviceAssignForm, price: e.target.value})} />
                   </div>
                   <div className="form-group">
                      <label className="form-label">Reminder (Days)</label>
                      <input type="number" className="form-input" value={serviceAssignForm.reminder_days} onChange={e => setServiceAssignForm({...serviceAssignForm, reminder_days: e.target.value})} />
                   </div>
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label className="form-label">Payment Status *</label>
                  <select className="form-input" value={serviceAssignForm.payment_status} onChange={e => setServiceAssignForm({...serviceAssignForm, payment_status: e.target.value})}>
                    <option value="Paid">✅ Paid</option>
                    <option value="Unpaid">❌ Unpaid</option>
                  </select>
                </div>

                {isB2C && b2cStages.length > 0 && serviceEntryTab === 'stage' && (
                  <>
                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label className="form-label">Current Stage</label>
                      <select required className="form-input" value={serviceAssignForm.b2c_stage_id} onChange={e => setServiceAssignForm({...serviceAssignForm, b2c_stage_id: e.target.value})}>
                        <option value="">-- Assign Stage --</option>
                        {b2cStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label className="form-label">Stage Notes</label>
                      <textarea className="form-input" style={{ minHeight: 60 }} value={serviceAssignForm.stage_notes} onChange={e => setServiceAssignForm({...serviceAssignForm, stage_notes: e.target.value})} placeholder="Notes specific to this stage..." />
                    </div>
                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label className="form-label">Next Follow Up Date</label>
                      <input type="date" className="form-input" value={serviceAssignForm.next_follow_up_date} onChange={e => setServiceAssignForm({...serviceAssignForm, next_follow_up_date: e.target.value})} />
                    </div>
                  </>
                )}

                {/* Dynamic custom fields for service history */}
                {serviceHistoryConfigs.filter(c => !c.is_core).map(config => (
                  <div key={config.id} className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label">{config.label} {config.is_required && <span className="text-danger">*</span>}</label>
                    {renderCustomFieldInput(config, serviceAssignForm.custom_data?.[config.field_key], (val) => {
                      setServiceAssignForm({
                        ...serviceAssignForm,
                        custom_data: { ...serviceAssignForm.custom_data, [config.field_key]: val }
                      })
                    }, session.user.id)}
                  </div>
                ))}

                <div className="form-group" style={{ marginBottom: 24 }}>
                  <label className="form-label">Notes / Observations</label>
                  <textarea className="form-input" style={{ minHeight: 80 }} value={serviceAssignForm.notes} onChange={e => setServiceAssignForm({...serviceAssignForm, notes: e.target.value})} placeholder="Any specific notes for this visit..." />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsServiceModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Save size={18} /> {editingServiceEntry ? 'Update & Sync' : 'Save & Generate'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isOppModalOpen && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 540 }}>
              <div className="modal-header">
                <h2 className="modal-title">
                  {editingOpp ? 'Edit Opportunity' : 'Add Opportunity'}
                </h2>
                <button className="modal-close" onClick={() => setIsOppModalOpen(false)}>✕</button>
              </div>
              <form onSubmit={handleSaveOpportunity}>
                <div style={{ display: 'grid', gap: 16, padding: '20px 0' }}>
                  <div>
                    <label className="form-label" style={labelStyle}>Account / Customer</label>
                    <input
                      type="text"
                      className="form-input"
                      value={selectedAccount.account_name}
                      disabled
                      style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                    />
                  </div>

                  <div>
                    <label className="form-label" style={labelStyle}>Opportunity Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Enterprise License Expansion"
                      value={oppFormData.name}
                      onChange={e => setOppFormData({ ...oppFormData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label className="form-label" style={labelStyle}>Deal Amount ({profile?.currency || '$'})</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="form-input"
                        placeholder="0"
                        value={oppFormData.amount}
                        onChange={e => setOppFormData({ ...oppFormData, amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={labelStyle}>Stage</label>
                      <select
                        className="form-input"
                        value={oppFormData.stage}
                        onChange={e => setOppFormData({ ...oppFormData, stage: e.target.value })}
                      >
                        {OPP_STAGES.map(stg => (
                          <option key={stg} value={stg}>{stg}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label className="form-label" style={labelStyle}>Expected Close Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={oppFormData.closed_date}
                        onChange={e => setOppFormData({ ...oppFormData, closed_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={labelStyle}>Owner</label>
                      <input
                        type="text"
                        className="form-input"
                        value={oppFormData.owner}
                        onChange={e => setOppFormData({ ...oppFormData, owner: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsOppModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Save size={18} /> {editingOpp ? 'Update Opportunity' : 'Create Opportunity'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      <FieldBuilderModal
        module="service_history"
        businessId={session.user.id}
        isOpen={isServiceFieldBuilderOpen}
        onClose={() => {
          setIsServiceFieldBuilderOpen(false)
          fetchServiceHistoryConfigs()
        }}
      />
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isB2C ? t('modules.accounts.customerProfiles') : t('modules.accounts.accounts')}</h1>
          <p className="page-subtitle">{t('modules.accounts.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => setIsFieldBuilderOpen(true)}>
            <Settings size={16} /> {t('modules.accounts.editFields')}
          </button>
          <button className="btn btn-secondary" onClick={() => setIsImportOpen(true)}>
            <UploadCloud size={16} style={{ marginRight: 6 }} /> {t('bulkImport.button', 'Import Excel/CSV')}
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={16} /> {isB2C ? t('modules.accounts.addNewCustomer') : t('modules.accounts.addNewAccount')}
          </button>
        </div>
      </div>

      <div className="table-container card">
        <div style={{ padding: '0 24px' }}>
          <LocalSearch 
            data={accounts} 
            searchKeys={['account_name', 'phone', 'email', 'address']} 
            placeholder={t('modules.accounts.searchPlaceholder')} 
          />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 180 }}>{t('modules.accounts.colProfile')}</th>
                <th>{t('modules.accounts.colOwner', 'Account Owner')}</th>
                <th>{t('modules.accounts.colStatus')}</th>
                {isB2C && b2cStages.length > 0 && <th>{t('modules.accounts.colStage')}</th>}
                {customFieldConfigs.filter(c => c.show_in_list && !c.is_core).map(config => (
                  <th key={config.id}>{config.label}</th>
                ))}
                <th style={{ textAlign: 'right' }}>{t('modules.accounts.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(acc => (
                <tr key={acc.id} onClick={() => setSelectedAccount(acc)} className="clickable">
                  <td className="fw-bold">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, #f37a23, #ff8c42)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900 }}>
                        {acc.account_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{acc.account_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                          {isB2C 
                            ? (acc.phone || acc.email || 'No contact info') 
                            : (acc.website || acc.domain || acc.custom_data?.website || acc.phone || 'No website')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {acc.account_owner || acc.custom_data?.account_owner || (acc.user_id === session.user.id ? (profile?.name || session.user.email) : null) || '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${(acc.status || '').toLowerCase()}`}>{acc.status}</span>
                  </td>
                  {isB2C && b2cStages.length > 0 && (
                    <td>
                      {acc.b2c_stage_id ? (
                        <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 12, background: b2cStages.find(s => s.id === acc.b2c_stage_id)?.color + '20', color: b2cStages.find(s => s.id === acc.b2c_stage_id)?.color, fontWeight: 800 }}>
                          {b2cStages.find(s => s.id === acc.b2c_stage_id)?.name || 'Untracked'}
                        </span>
                      ) : '-'}
                    </td>
                  )}
                  {customFieldConfigs.filter(c => c.show_in_list && !c.is_core).map(config => {
                    const val = acc.custom_data?.[config.field_key]
                    return (
                      <td key={config.id} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {config.field_type === 'checkbox' ? (val ? '✅' : '❌') : (val?.toString() || '-')}
                      </td>
                    )
                  })}
                  <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                    <button
                      className="btn btn-sm btn-secondary"
                      style={{ marginRight: 8, fontSize: 12, padding: '4px 10px' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedAccount(acc)
                        setActiveTab('opportunities')
                      }}
                      title="View Account Opportunities"
                    >
                      📈 Deals
                    </button>
                    {!isB2C && (
                      <button
                        className="btn btn-sm btn-secondary"
                        style={{ marginRight: 8, fontSize: 12, padding: '4px 10px' }}
                        onClick={(e) => handleViewContacts(e, acc)}
                        title="View Contacts"
                      >
                        👥 Contacts
                      </button>
                    )}
                    <button className="btn-icon" onClick={() => handleOpenModal(acc)} title="Edit"><Edit2 size={16} /></button>
                    {isAdmin && (
                      <button className="btn-icon text-danger" onClick={() => handleDeleteAccount(acc)} title="Delete"><Trash2 size={16} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 800 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingAccount ? (isB2C ? 'Edit Profile' : 'Edit Account') : (isB2C ? 'Add New Customer' : 'Add New Account')}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={async (e) => {
                e.preventDefault()
                const nameVal = formData.custom_data?.customer_name || formData.custom_data?.full_name || formData.account_name
                const nameCheck = validateRequired(nameVal, isB2C ? 'Customer Name' : 'Account Name')
                if (!nameCheck.valid) { toast.error(nameCheck.error); return }

                const phoneVal = formData.custom_data?.contact_number || (!formData.custom_data?.contact_primary?.includes('@') ? formData.custom_data.contact_primary : (formData.phone || ''))
                const phoneCheck = validatePhone(phoneVal, { label: 'Contact Number', required: isB2C })
                if (!phoneCheck.valid) { toast.error(phoneCheck.error); return }

                const emailVal = isB2C 
                  ? (formData.custom_data?.email_id || (formData.custom_data?.contact_primary?.includes('@') ? formData.custom_data.contact_primary : (formData.email || '')))
                  : (formData.email || '')
                const emailCheck = validateEmail(emailVal, { label: 'Email Address', required: false })
                if (!emailCheck.valid) { toast.error(emailCheck.error); return }

                const websiteVal = formData.custom_data?.website || formData.website || formData.domain || ''
                if (!isB2C && websiteVal) {
                  const webCheck = validateWebsite(websiteVal, { label: 'Website Link', required: false })
                  if (!webCheck.valid) { toast.error(webCheck.error); return }
                }

                const toastId = toast.loading(isB2C ? 'Saving profile...' : 'Saving account...')
                try {
                  const cleanWebsite = websiteVal || null
                  const payload = { 
                    account_name: nameVal, 
                    website: cleanWebsite,
                    domain: cleanWebsite,
                    email: emailVal || null,
                    phone: phoneVal ? sanitizePhone(phoneVal) : null,
                    address: formData.custom_data?.address || formData.address || null, // Keep legacy columns for compatibility
                    notes: formData.notes,
                    status: formData.status,
                    account_owner: formData.account_owner || profile?.name || session.user.email || null,
                    custom_data: formData.custom_data,
                    user_id: session.user.id,
                    updated_at: new Date().toISOString()
                  }

                  if (isB2C && b2cStages.length > 0 && !editingAccount) {
                    payload.b2c_stage_id = b2cStages[0].id
                  }
                  
                  let accountId
                  if (editingAccount) {
                    await supabase.from('accounts').update(payload).eq('id', editingAccount.id)
                    accountId = editingAccount.id
                    if (formData.contact_id && isB2C) { 
                      await supabase.from('contacts').update({ 
                        phone: payload.phone, 
                        email: payload.email, 
                        name: payload.account_name 
                      }).eq('id', formData.contact_id) 
                    }
                  } else {
                    const { data: n, error: nErr } = await supabase.from('accounts').insert([payload]).select().single()
                    if (nErr) throw nErr
                    accountId = n.id
                    if (isB2C) {
                      await supabase.from('contacts').insert([{ 
                        account_id: n.id, 
                        phone: payload.phone, 
                        email: payload.email, 
                        name: payload.account_name, 
                        user_id: session.user.id 
                      }])
                    }
                  }
                  
                  toast.success(isB2C ? 'Customer profile saved!' : 'Account saved successfully!', { id: toastId })
                  setIsModalOpen(false)
                  fetchAccounts()
                } catch (e) { toast.error(e.message, { id: toastId }) }
            }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                 {/* Status is a system-fixed field */}
                 <div className="form-group" style={{ gridColumn: 'span 2', background: '#f8fafc', padding: '12px 20px', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ margin: 0 }}>{isB2C ? 'Customer Relationship Status' : 'Account Status'}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: formData.status === 'Active' ? '#16a34a' : '#64748b' }}>
                        {formData.status.toUpperCase()}
                      </span>
                      <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                        <input type="checkbox" className="sr-only" checked={formData.status === 'Active'} onChange={(e) => setFormData({...formData, status: e.target.checked ? 'Active' : 'Inactive'})} />
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: formData.status === 'Active' ? '#dcfce3' : '#e2e8f0', borderRadius: 24, transition: '0.4s' }}></div>
                        <div style={{ position: 'absolute', height: 18, width: 18, left: formData.status === 'Active' ? 22 : 3, bottom: 3, backgroundColor: formData.status === 'Active' ? '#16a34a' : '#94a3b8', borderRadius: '50%', transition: '0.4s' }}></div>
                      </label>
                    </div>
                 </div>

                 {/* Dynamic Fields Loop */}
                 {customFieldConfigs.map(config => (
                    <div key={config.id} className="form-group" style={{ gridColumn: (config.field_type === 'long_text' || config.field_type === 'file_upload') ? 'span 2' : 'auto' }}>
                      <label className="form-label">{config.label} {config.is_required && <span className="text-danger">*</span>}</label>
                      {renderCustomFieldInput(config, formData.custom_data[config.field_key], (val) => {
                        setFormData({
                          ...formData,
                          custom_data: { ...formData.custom_data, [config.field_key]: val }
                        })
                      }, session.user.id)}
                    </div>
                  ))}

                 <div className="form-group" style={{ gridColumn: 'span 2' }}>
                   <label className="form-label">{t('modules.accounts.colOwner', 'Account Owner')}</label>
                   <input
                     type="text"
                     className="form-input"
                     value={formData.account_owner || ''}
                     onChange={e => setFormData({ ...formData, account_owner: e.target.value })}
                     placeholder="Enter account owner..."
                   />
                 </div>
               </div>
               
               <div className="form-actions" style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #f1f5f9' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingAccount ? (isB2C ? 'Update Profile' : 'Update Account') : (isB2C ? 'Create Customer' : 'Create Account')}</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Customer Popup Modal */}
      {contactPopupData && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal" style={{ maxWidth: 350, textAlign: 'center', padding: 30 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #f37a23, #ff8c42)', color: '#fff', fontSize: 24, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              {contactPopupData.name[0]?.toUpperCase()}
            </div>
            <h2 style={{ margin: '0 0 16px 0', fontSize: 20 }}>{contactPopupData.name}</h2>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', padding: 16, borderRadius: 12, marginBottom: 20, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Contact Number</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{contactPopupData.phone}</div>
                <a href={`tel:${contactPopupData.phone}`} className="btn btn-sm" style={{ background: 'var(--accent-light)', color: 'var(--accent)', marginTop: 8, display: 'inline-flex', padding: '4px 12px' }}><Phone size={14} style={{ marginRight: 6 }}/> Call Now</a>
              </div>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Email Address</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{contactPopupData.email}</div>
              </div>
            </div>
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setContactPopupData(null)}>Close</button>
          </div>
        </div>
      )}

      {/* View Contacts Modal (B2B Accounts list) */}
      {viewContactsModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h2 className="modal-title">Contacts — {viewContactsModal.account.account_name}</h2>
              <button className="modal-close" onClick={() => setViewContactsModal(null)}>✕</button>
            </div>
            <div style={{ padding: '0 24px 24px' }}>
              {viewContactsLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  <div className="spinner" style={{ margin: '0 auto 12px' }} />
                  Loading contacts...
                </div>
              ) : viewContactsModal.contacts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-secondary)' }}>No contacts added yet for this account.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {viewContactsModal.contacts.map((c, i) => (
                    <div key={c.id} onClick={() => { setViewContactsModal(null); navigate('/dashboard/contacts', { state: { openId: c.id } }) }} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.borderColor = 'var(--accent)' }} onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)' }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #f37a23, #ff8c42)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, flexShrink: 0 }}>
                        {(c.name || c.email || '#')[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>{c.name || '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          {c.phone && <span>📞 {c.phone}</span>}
                          {c.email && <span>✉️ {c.email}</span>}
                          {c.designation && <span>💼 {c.designation}</span>}
                          {c.role && !c.designation && <span>💼 {c.role}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <button className="btn btn-secondary" onClick={() => setViewContactsModal(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        .tab-badge { background: #f37a23; color: #fff; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-left: 8px; font-weight: 800; }
        .reminder-item { transition: all 0.2s; } .reminder-item:hover { background: #fffafa; border-color: #f37a23; }
        .drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); z-index: 1000; opacity: 0; animation: fadeIn 0.3s forwards; }
        .drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 600px; background: #fff; z-index: 1001; box-shadow: -10px 0 40px rgba(0,0,0,0.1); transform: translateX(100%); animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; display: flex; flexDirection: column; }
        @keyframes fadeIn { to { opacity: 1; } }
        @keyframes slideIn { to { transform: translateX(0); } }
      `}} />

      <BulkUploadModal
        module="accounts"
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        session={session}
        profile={profile}
        onImported={fetchAccounts}
        extraDefaults={{ account_type: isB2C ? 'B2C' : 'B2B', ...(isB2C && b2cStages.length > 0 ? { b2c_stage_id: b2cStages[0].id } : {}) }}
      />

      <FieldBuilderModal 
        module="customer_profile"
        businessId={session.user.id}
        isOpen={isFieldBuilderOpen}
        onClose={() => {
          setIsFieldBuilderOpen(false)
          fetchCustomConfigs() // Refresh current view
        }}
      />

      <FieldBuilderModal 
        module="service_history"
        businessId={session.user.id}
        isOpen={isServiceFieldBuilderOpen}
        onClose={() => {
          setIsServiceFieldBuilderOpen(false)
          fetchServiceHistoryConfigs()
        }}
      />

      {isInvoiceModalOpen && editingInvoice && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Invoice</h2>
              <button className="modal-close" onClick={() => setIsInvoiceModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleUpdateInvoice}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Invoice Name / Service *</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={invoiceForm.quote_name} 
                  onChange={e => setInvoiceForm({ ...invoiceForm, quote_name: e.target.value })} 
                />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Amount ({profile?.currency || '$'}) *</label>
                <input 
                  type="number" 
                  required 
                  className="form-input" 
                  value={invoiceForm.total_price} 
                  onChange={e => setInvoiceForm({ ...invoiceForm, total_price: e.target.value })} 
                />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Payment Status *</label>
                <select 
                  className="form-input" 
                  value={invoiceForm.status} 
                  onChange={e => setInvoiceForm({ ...invoiceForm, status: e.target.value })}
                >
                  <option value="Paid">✅ Paid</option>
                  <option value="Unpaid">❌ Unpaid</option>
                  <option value="Overdue">⚠️ Overdue</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label">Invoice Date *</label>
                <input 
                  type="date" 
                  required 
                  className="form-input" 
                  value={invoiceForm.created_at} 
                  onChange={e => setInvoiceForm({ ...invoiceForm, created_at: e.target.value })} 
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsInvoiceModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Save size={18} /> Update Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
