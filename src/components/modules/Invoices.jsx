import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { 
  Download, Edit2, Trash2, Settings, Eye, TrendingUp, FileText, 
  ExternalLink, Receipt, CheckCircle, CheckCircle2, Clock, AlertTriangle, X
} from 'lucide-react'
import LocalSearch from '../ui/LocalSearch'
import FieldBuilderModal from '../ui/FieldBuilderModal'
import { useRole } from '../../contexts/RoleContext'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

// Invoices share the `quotes` table with Quotes module.
// Helper to parse invoice metadata or plain text
function parseInvoiceMeta(raw) {
  if (!raw) return { name: '', quote_id: null, is_invoice: true }
  try {
    const p = JSON.parse(raw)
    return {
      name: p.name || raw,
      quote_id: p.quote_id || null,
      quote_name: p.quote_name || '',
      is_invoice: true,
      items: p.items || []
    }
  } catch {
    return { name: raw, quote_id: null, is_invoice: true, items: [] }
  }
}

function parseInvoiceName(raw) {
  return parseInvoiceMeta(raw).name
}

function isInvoiceRecord(row) {
  if (row.invoice_number) return true
  try {
    const p = JSON.parse(row.quote_name)
    if (p.is_invoice) return true
    if (p.items && p.items.length) return false
    return false
  } catch {
    return true
  }
}

function isQuoteRecord(row) {
  if (row.invoice_number) return false
  try {
    const p = JSON.parse(row.quote_name)
    return !p.is_invoice
  } catch {
    return false
  }
}

export default function Invoices({ session, profile }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const userIds = profile?.teamUserIds || [session.user.id]

  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [quotesList, setQuotesList] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewingInvoice, setViewingInvoice] = useState(null)
  const [statusFilter, setStatusFilter] = useState('All')
  const roleContext = useRole?.()
  const isAdmin = roleContext ? roleContext.isAdmin : (session?.user?.user_metadata?.role || profile?.role || '').toLowerCase() === 'admin'
  
  const [formData, setFormData] = useState({
    title: '', account_id: '', opportunity_id: '', quote_id: '', amount: 0, due_date: '', status: 'Unpaid'
  })
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [invoiceConfigs, setInvoiceConfigs] = useState([])
  const [isFieldBuilderOpen, setIsFieldBuilderOpen] = useState(false)

  const fetchInvoiceConfigs = async () => {
    try {
      const { data: existing, error } = await supabase
        .from('custom_field_configs')
        .select('*')
        .eq('business_id', session.user.id)
        .eq('module', 'invoice')
        .order('display_order', { ascending: true })
      
      if (error) throw error

      const coreFieldsTarget = [
        { label: 'Invoice & Details', field_key: 'quote_name', field_type: 'text', is_core: true, order: 0 },
        { label: 'Customer Name', field_key: 'customer_name', field_type: 'text', is_core: true, order: 1 },
        { label: 'Linked Deal & Quote', field_key: 'links', field_type: 'text', is_core: true, order: 2 },
        { label: 'Amount', field_key: 'total_price', field_type: 'number', is_core: true, order: 3 },
        { label: 'Due Date', field_key: 'expires_at', field_type: 'date', is_core: true, order: 4 },
        { label: 'Status', field_key: 'status', field_type: 'dropdown', options: ['Paid', 'Unpaid', 'Overdue'], is_core: true, order: 5 }
      ]

      let finalData = existing || []
      const missingCore = coreFieldsTarget.filter(t => !finalData.find(f => f.field_key === t.field_key))

      if (missingCore.length > 0) {
        const toInsert = missingCore.map(c => ({
          business_id: session.user.id,
          module: 'invoice',
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

      setInvoiceConfigs(finalData.filter(f => !f.is_archived))
    } catch (err) {
      console.error('Error loading invoice custom fields:', err)
    }
  }

  useEffect(() => {
    fetchData()
    fetchInvoiceConfigs()
  }, [session, profile])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [invRes, accRes, oppsRes] = await Promise.all([
        supabase
          .from('quotes')
          .select('*, accounts(id, account_name, contacts(phone, email)), opportunities(id, name, account_id, accounts(id, account_name, contacts(phone, email)))')
          .in('user_id', userIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('accounts')
          .select('id, account_name')
          .in('user_id', userIds)
          .order('account_name'),
        supabase
          .from('opportunities')
          .select('id, name, account_id, accounts(id, account_name)')
          .in('user_id', userIds)
          .order('name')
      ])
      
      const allRows = invRes.data || []
      const invList = allRows.filter(isInvoiceRecord)
      const qList = allRows.filter(isQuoteRecord)

      setInvoices(invList)
      setQuotesList(qList)
      setCustomers(accRes.data || [])
      setOpportunities(oppsRes.data || [])
    } catch (error) {
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  // Handle deep-link openId from navigation
  useEffect(() => {
    if (!location.state?.openId) return
    const targetId = location.state.openId
    const target = invoices.find(i => i.id === targetId)
    if (target) {
      setViewingInvoice(target)
      window.history.replaceState({}, document.title)
    } else {
      supabase
        .from('quotes')
        .select('*, accounts(id, account_name, contacts(phone, email)), opportunities(id, name, account_id, accounts(id, account_name, contacts(phone, email)))')
        .eq('id', targetId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setViewingInvoice(data)
            window.history.replaceState({}, document.title)
          }
        })
    }
  }, [invoices, location.state])

  const filteredInvoices = statusFilter === 'All' 
    ? invoices 
    : invoices.filter(inv => (inv.status || 'Unpaid') === statusFilter)

  const handleOpenModal = (inv = null, defaultQuote = null, defaultOpp = null) => {
    if (inv) {
      setEditingInvoice(inv)
      const meta = parseInvoiceMeta(inv.quote_name)
      setFormData({
        title: meta.name || '',
        account_id: inv.account_id || inv.opportunities?.account_id || '',
        opportunity_id: inv.opportunity_id || '',
        quote_id: meta.quote_id || '',
        amount: inv.total_price || 0,
        due_date: inv.expires_at ? inv.expires_at.slice(0, 10) : '',
        status: inv.status || 'Unpaid'
      })
    } else if (defaultQuote) {
      setEditingInvoice(null)
      let qMeta = {}
      try { qMeta = JSON.parse(defaultQuote.quote_name) } catch { qMeta = { name: defaultQuote.quote_name } }
      setFormData({
        title: qMeta.name || defaultQuote.quote_name,
        account_id: defaultQuote.account_id || defaultQuote.opportunities?.account_id || '',
        opportunity_id: defaultQuote.opportunity_id || '',
        quote_id: defaultQuote.id,
        amount: defaultQuote.total_price || 0,
        due_date: defaultQuote.expires_at ? defaultQuote.expires_at.slice(0, 10) : '',
        status: 'Unpaid'
      })
    } else {
      setEditingInvoice(null)
      setFormData({
        title: defaultOpp ? `Invoice: ${defaultOpp.name}` : '',
        account_id: defaultOpp?.account_id || '',
        opportunity_id: defaultOpp?.id || '',
        quote_id: '',
        amount: defaultOpp?.amount || 0,
        due_date: '',
        status: 'Unpaid'
      })
    }
    setIsModalOpen(true)
  }

  // Auto-fill when quote is selected
  const handleQuoteSelect = (quoteId) => {
    if (!quoteId) {
      setFormData(prev => ({ ...prev, quote_id: '' }))
      return
    }
    const q = quotesList.find(item => item.id === quoteId)
    if (q) {
      let qMeta = {}
      try { qMeta = JSON.parse(q.quote_name) } catch { qMeta = { name: q.quote_name } }
      setFormData(prev => ({
        ...prev,
        quote_id: quoteId,
        title: prev.title || qMeta.name || 'Services Invoice',
        amount: prev.amount || q.total_price || 0,
        due_date: prev.due_date || (q.expires_at ? q.expires_at.slice(0, 10) : ''),
        opportunity_id: prev.opportunity_id || q.opportunity_id || '',
        account_id: prev.account_id || q.account_id || q.opportunities?.account_id || ''
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.account_id) return toast.error('Please select a customer')

    const toastId = toast.loading(editingInvoice ? 'Updating invoice...' : 'Generating invoice...')
    try {
      let oppId = formData.opportunity_id || editingInvoice?.opportunity_id

      if (!oppId && formData.account_id) {
        // Create an underlying Opportunity if none selected
        const { data: newOpp, error: oppErr } = await supabase
          .from('opportunities')
          .insert([{
            name: `Purchase: ${formData.title}`,
            account_id: formData.account_id,
            amount: formData.amount,
            stage: formData.status === 'Paid' ? 'closed' : 'negotiation',
            user_id: session.user.id
          }])
          .select()
          .single()
        
        if (oppErr) throw oppErr
        oppId = newOpp.id
      } else if (oppId && editingInvoice) {
        // Sync stage if paid
        await supabase.from('opportunities').update({
          amount: formData.amount,
          stage: formData.status === 'Paid' ? 'closed' : undefined,
          account_id: formData.account_id
        }).eq('id', oppId)
      }

      const invNo = editingInvoice?.invoice_number || `INV-${Date.now().toString().slice(-6)}`
      
      const payloadString = JSON.stringify({
        name: formData.title,
        quote_id: formData.quote_id || null,
        is_invoice: true
      })

      const quotePayload = {
        quote_name: payloadString,
        total_price: formData.amount,
        expires_at: formData.due_date || null,
        status: formData.status,
        opportunity_id: oppId || null,
        account_id: formData.account_id,
        invoice_number: invNo
      }

      if (editingInvoice) {
        const { error } = await supabase.from('quotes').update(quotePayload).eq('id', editingInvoice.id)
        if (error) throw error
        toast.success('Invoice updated', { id: toastId })
      } else {
        const { error } = await supabase.from('quotes').insert([{
          ...quotePayload,
          user_id: session.user.id
        }])
        if (error) throw error
        
        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'Invoice Generated',
          description: `Generated ${formData.status} invoice #${invNo} for ${formData.title}`
        }])
        toast.success(`Invoice #${invNo} generated`, { id: toastId })
      }
      
      setIsModalOpen(false)
      fetchData()
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleQuickStatusToggle = async (inv) => {
    const nextStatus = inv.status === 'Paid' ? 'Unpaid' : 'Paid'
    const toastId = toast.loading(`Marking invoice as ${nextStatus}...`)
    try {
      const { error } = await supabase.from('quotes').update({ status: nextStatus }).eq('id', inv.id)
      if (error) throw error
      toast.success(`Invoice marked as ${nextStatus}`, { id: toastId })
      if (viewingInvoice && viewingInvoice.id === inv.id) {
        setViewingInvoice({ ...viewingInvoice, status: nextStatus })
      }
      fetchData()
    } catch (err) {
      toast.error('Failed to update status', { id: toastId })
    }
  }

  const handleDelete = async (inv) => {
    if (!isAdmin) {
      toast.error('Only Super Admin can delete invoices')
      return
    }
    if (!confirm(`Delete invoice ${inv.invoice_number || parseInvoiceName(inv.quote_name)}?`)) return
    const toastId = toast.loading('Deleting...')
    try {
      await supabase.from('quotes').delete().eq('id', inv.id)
      toast.success('Invoice deleted', { id: toastId })
      if (viewingInvoice?.id === inv.id) setViewingInvoice(null)
      fetchData()
    } catch (error) {
      toast.error('Failed to delete', { id: toastId })
    }
  }

  const downloadPDF = (inv) => {
    const doc = new jsPDF()
    const customerName = inv.accounts?.account_name || inv.opportunities?.accounts?.account_name || 'Customer'
    const contact = inv.accounts?.contacts?.[0] || inv.opportunities?.accounts?.contacts?.[0]
    const amount = Number(inv.total_price).toLocaleString()
    const invNumber = inv.invoice_number || inv.unique_id
    
    doc.setFontSize(22)
    doc.setTextColor(243, 122, 35) // XOWIQ Orange
    doc.text('INVOICE', 14, 20)
    
    doc.setFontSize(11)
    doc.setTextColor(50)
    doc.text(`Invoice #: ${invNumber}`, 14, 28)
    doc.text(`Date: ${new Date(inv.created_at).toLocaleDateString()}`, 14, 34)
    doc.text(`Due Date: ${inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : 'Upon receipt'}`, 14, 40)
    doc.text(`Status: ${inv.status || 'Unpaid'}`, 14, 46)
    
    doc.setFontSize(12)
    doc.text('Billed To:', 14, 60)
    doc.setFontSize(10)
    doc.text(customerName, 14, 67)
    if (contact?.phone) doc.text(`Phone: ${contact.phone}`, 14, 73)
    if (contact?.email) doc.text(`Email: ${contact.email}`, 14, 79)
    
    if (inv.opportunities?.name) {
      doc.text(`Opportunity: ${inv.opportunities.name}`, 14, 87)
    }

    doc.autoTable({
      startY: 95,
      head: [['Description', 'Amount']],
      body: [
        [parseInvoiceName(inv.quote_name), `${profile?.currency || '$'}${amount}`]
      ],
      foot: [['Total Due', `${profile?.currency || '$'}${amount}`]],
      theme: 'grid',
      headStyles: { fillColor: [243, 122, 35] }
    })
    
    doc.save(`Invoice_${invNumber}_${customerName.replace(/\s+/g, '_')}.pdf`)
  }

  // Filter available quotes and opportunities based on form selection
  const filteredOppsForForm = formData.account_id
    ? opportunities.filter(o => o.account_id === formData.account_id)
    : opportunities

  const filteredQuotesForForm = formData.opportunity_id
    ? quotesList.filter(q => q.opportunity_id === formData.opportunity_id)
    : formData.account_id
      ? quotesList.filter(q => q.account_id === formData.account_id || q.opportunities?.account_id === formData.account_id)
      : quotesList

  if (loading) return <div className="loading-container"><div className="spinner"/></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('modules.invoices.title', 'Invoices')}</h1>
          <p className="page-subtitle">{t('modules.invoices.subtitle', 'Manage billing, track paid invoices, and generate PDFs')}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setIsFieldBuilderOpen(true)}>
            <Settings size={14} /> {t('modules.invoices.editFields', 'Edit Fields')}
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <span style={{ fontSize: 18 }}>+</span> {t('modules.invoices.createInvoice', 'Generate Invoice')}
          </button>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">{t('modules.invoices.allInvoices', 'All Invoices')} ({invoices.length})</h2>
          <LocalSearch 
             data={invoices} 
             searchKeys={['quote_name', 'invoice_number']} 
             onSelect={(item) => setViewingInvoice(item)}
             placeholder={t('modules.invoices.searchPlaceholder', 'Search invoices by name or number...')}
             renderItem={(item) => (
               <>
                 <div className="fw-bold" style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                   {item.invoice_number ? `${item.invoice_number} • ` : ''}{parseInvoiceName(item.quote_name)}
                 </div>
                 <div className="text-muted" style={{ fontSize: '11px' }}>
                   {item.accounts?.account_name || item.opportunities?.accounts?.account_name || ''}
                 </div>
               </>
             )}
          />
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
          {['All', 'Paid', 'Unpaid', 'Overdue'].map(f => (
            <button 
              key={f} 
              onClick={() => setStatusFilter(f)}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: statusFilter === f ? '1.5px solid var(--accent)' : '1px solid var(--border-subtle)',
                background: statusFilter === f ? 'var(--accent-light)' : 'var(--bg-secondary)',
                color: statusFilter === f ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {f} {f !== 'All' && `(${invoices.filter(i => (i.status || 'Unpaid') === f).length})`}
            </button>
          ))}
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Invoice # & Description</th>
                <th>Customer</th>
                <th>Linked Deal & Quote</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <div className="empty-state-icon"></div>
                      <h3>No invoices yet</h3>
                      <p>Create an invoice or convert an existing quote to get paid.</p>
                      <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => handleOpenModal()}>
                        + Generate Invoice
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => {
                  const meta = parseInvoiceMeta(inv.quote_name)
                  const invNo = inv.invoice_number || inv.unique_id
                  const linkedOpp = inv.opportunities || opportunities.find(o => o.id === inv.opportunity_id)
                  const linkedQuote = quotesList.find(q => q.id === meta.quote_id || (inv.opportunity_id && q.opportunity_id === inv.opportunity_id))
                  let qParsedName = ''
                  if (linkedQuote) {
                    try { qParsedName = JSON.parse(linkedQuote.quote_name)?.name || linkedQuote.quote_name } catch { qParsedName = linkedQuote.quote_name }
                  }

                  return (
                    <tr 
                      key={inv.id}
                      style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => setViewingInvoice(inv)}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ 
                            fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6, 
                            background: 'rgba(255, 89, 0, 0.12)', color: 'var(--accent)', 
                            border: '1px solid rgba(255, 89, 0, 0.25)', fontFamily: 'monospace' 
                          }}>
                            {invNo}
                          </span>
                          <span className="fw-bold" style={{ color: 'var(--text-primary)' }}>{meta.name || 'Invoice'}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                          Created: {new Date(inv.created_at).toLocaleDateString()}
                        </div>
                      </td>

                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {inv.accounts?.account_name || inv.opportunities?.accounts?.account_name || '—'}
                        </span>
                      </td>

                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {linkedOpp ? (
                            <span 
                              onClick={() => navigate('/dashboard/opportunities', { state: { openId: linkedOpp.id } })}
                              style={{ 
                                display: 'inline-flex', alignItems: 'center', gap: 4, 
                                fontSize: 11, color: 'var(--accent)', fontWeight: 700, 
                                cursor: 'pointer', textDecoration: 'none'
                              }}
                              title="Click to open Opportunity"
                              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                            >
                              <TrendingUp size={12} /> {linkedOpp.name}
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No linked deal</span>
                          )}

                          {linkedQuote ? (
                            <span 
                              onClick={() => navigate('/dashboard/quotes', { state: { openId: linkedQuote.id } })}
                              style={{ 
                                display: 'inline-flex', alignItems: 'center', gap: 4, 
                                fontSize: 11, color: '#60a5fa', fontWeight: 600, 
                                cursor: 'pointer'
                              }}
                              title="Click to open Quote"
                              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                            >
                              <FileText size={12} /> {qParsedName || 'Linked Quote'}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="fw-bold" style={{ color: 'var(--text-primary)' }}>
                        {profile?.currency || '$'}{Number(inv.total_price).toLocaleString()}
                      </td>

                      <td style={{ color: 'var(--text-secondary)' }}>
                        {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : '—'}
                      </td>

                      <td>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleQuickStatusToggle(inv) }}
                          className={`badge badge-${(inv.status || 'unpaid').toLowerCase()}`}
                          style={{ border: 'none', cursor: 'pointer' }}
                          title="Click to toggle status"
                        >
                          {inv.status || 'Unpaid'}
                        </button>
                      </td>

                      <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
                          <button 
                            className="btn-icon" 
                            style={{ color: '#60a5fa' }} 
                            onClick={() => setViewingInvoice(inv)} 
                            title="Open Invoice Preview"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            className="btn-icon text-primary" 
                            onClick={() => downloadPDF(inv)} 
                            title="Download PDF"
                          >
                            <Download size={16} />
                          </button>
                          <button 
                            className="btn-icon text-primary" 
                            onClick={() => handleOpenModal(inv)} 
                            title="Edit Invoice"
                          >
                            <Edit2 size={16} />
                          </button>
                          {isAdmin && (
                            <button 
                              className="btn-icon text-danger" 
                              onClick={() => handleDelete(inv)} 
                              title="Delete Invoice"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- INVOICE PREVIEW / DETAIL MODAL --- */}
      {viewingInvoice && (
        <div className="modal-overlay" onClick={() => setViewingInvoice(null)}>
          <div 
            className="modal" 
            style={{ width: 680, maxWidth: '95vw', padding: 0, overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ 
              background: 'linear-gradient(135deg, #ff5900 0%, #ea580c 100%)', 
              color: '#fff', padding: '24px 28px', display: 'flex', 
              justifyContent: 'space-between', alignItems: 'flex-start' 
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ 
                    background: 'rgba(255,255,255,0.2)', padding: '6px 10px', 
                    borderRadius: 8, fontFamily: 'monospace', fontWeight: 800, fontSize: 14 
                  }}>
                    {viewingInvoice.invoice_number || viewingInvoice.unique_id}
                  </div>
                  <span className={`badge badge-${(viewingInvoice.status || 'unpaid').toLowerCase()}`} style={{
                    padding: '4px 12px', fontSize: 12, fontWeight: 800,
                    background: viewingInvoice.status === 'Paid' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.25)',
                    color: '#fff'
                  }}>
                    {viewingInvoice.status || 'Unpaid'}
                  </span>
                </div>
                <h2 style={{ margin: '12px 0 4px', fontSize: 20, fontWeight: 800, color: '#fff' }}>
                  {parseInvoiceName(viewingInvoice.quote_name)}
                </h2>
                <div style={{ fontSize: 12, opacity: 0.9 }}>
                  Issued: {new Date(viewingInvoice.created_at).toLocaleDateString()} • Due: {viewingInvoice.expires_at ? new Date(viewingInvoice.expires_at).toLocaleDateString() : 'Upon receipt'}
                </div>
              </div>
              <button 
                onClick={() => setViewingInvoice(null)} 
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.8 }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: 24, display: 'grid', gap: 20 }}>
              {/* Linked Records Strip */}
              <div style={{ 
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                gap: 12, background: 'var(--bg-secondary)', padding: 16, borderRadius: 12, border: '1px solid var(--border-subtle)' 
              }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Billed Customer</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
                    {viewingInvoice.accounts?.account_name || viewingInvoice.opportunities?.accounts?.account_name || '—'}
                  </div>
                  {viewingInvoice.accounts?.id && (
                    <span 
                      onClick={() => navigate('/dashboard/accounts', { state: { openId: viewingInvoice.accounts.id } })}
                      style={{ fontSize: 11, color: 'var(--accent)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontWeight: 600 }}
                    >
                      View Account <ExternalLink size={11} />
                    </span>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Linked Deal / Opportunity</div>
                  {viewingInvoice.opportunities ? (
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>
                        {viewingInvoice.opportunities.name}
                      </div>
                      <span 
                        onClick={() => navigate('/dashboard/opportunities', { state: { openId: viewingInvoice.opportunities.id } })}
                        style={{ fontSize: 11, color: 'var(--accent)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontWeight: 600 }}
                      >
                        Open Deal <ExternalLink size={11} />
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No Deal Linked</span>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Linked Proposal / Quote</div>
                  {(() => {
                    const meta = parseInvoiceMeta(viewingInvoice.quote_name)
                    const q = quotesList.find(item => item.id === meta.quote_id || (viewingInvoice.opportunity_id && item.opportunity_id === viewingInvoice.opportunity_id))
                    if (q) {
                      let qName = ''
                      try { qName = JSON.parse(q.quote_name)?.name || q.quote_name } catch { qName = q.quote_name }
                      return (
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>
                            {qName || 'Linked Proposal'}
                          </div>
                          <span 
                            onClick={() => navigate('/dashboard/quotes', { state: { openId: q.id } })}
                            style={{ fontSize: 11, color: '#60a5fa', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontWeight: 600 }}
                          >
                            Open Quote <ExternalLink size={11} />
                          </span>
                        </div>
                      )
                    }
                    return <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No Quote Linked</span>
                  })()}
                </div>
              </div>

              {/* Amount Breakdown Card */}
              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)' }}>Description</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {parseInvoiceName(viewingInvoice.quote_name)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {profile?.currency || '$'}{Number(viewingInvoice.total_price).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--bg-secondary)', borderTop: '2px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Total Due:</td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 900, fontSize: 18, color: 'var(--accent)' }}>
                        {profile?.currency || '$'}{Number(viewingInvoice.total_price).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ 
              padding: '16px 24px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
            }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => handleQuickStatusToggle(viewingInvoice)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <CheckCircle2 size={16} /> 
                {viewingInvoice.status === 'Paid' ? 'Mark as Unpaid' : 'Mark as Paid'}
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => downloadPDF(viewingInvoice)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Download size={16} /> Download PDF
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    const target = viewingInvoice
                    setViewingInvoice(null)
                    handleOpenModal(target)
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Edit2 size={15} /> Edit Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CREATE / EDIT INVOICE MODAL --- */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: 650 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingInvoice ? 'Edit Invoice' : 'Generate Invoice'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: 24 }}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Item / Service Description *</label>
                  <input 
                    required 
                    className="form-input" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    placeholder="e.g. Enterprise Cloud Implementation" 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Customer (Account) *</label>
                  <select 
                    required 
                    className="form-input" 
                    value={formData.account_id} 
                    onChange={e => {
                      const newAccId = e.target.value
                      setFormData({
                        ...formData, 
                        account_id: newAccId,
                        opportunity_id: '',
                        quote_id: ''
                      })
                    }}
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.account_name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Link to Opportunity (Deal)</label>
                  <select 
                    className="form-input" 
                    value={formData.opportunity_id} 
                    onChange={e => setFormData({...formData, opportunity_id: e.target.value})}
                  >
                    <option value="">-- Optional: Select Deal --</option>
                    {filteredOppsForForm.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group full-width">
                  <label className="form-label">
                    Link to Quote (Auto-fills pricing & details)
                  </label>
                  <select 
                    className="form-input" 
                    value={formData.quote_id} 
                    onChange={e => handleQuoteSelect(e.target.value)}
                  >
                    <option value="">-- Optional: Select Quote to populate --</option>
                    {filteredQuotesForForm.map(q => {
                      let qName = ''
                      try { qName = JSON.parse(q.quote_name)?.name || q.quote_name } catch { qName = q.quote_name }
                      return (
                        <option key={q.id} value={q.id}>
                          {qName} — {profile?.currency || '$'}{Number(q.total_price || 0).toLocaleString()}
                        </option>
                      )
                    })}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Amount ({profile?.currency || '$'}) *</label>
                  <input 
                    type="number" 
                    required 
                    min="0" 
                    step="0.01" 
                    className="form-input" 
                    value={formData.amount} 
                    onChange={e => setFormData({...formData, amount: e.target.value})} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={formData.due_date} 
                    onChange={e => setFormData({...formData, due_date: e.target.value})} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select 
                    className="form-input" 
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>
              
              <div className="form-actions" style={{ marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingInvoice ? 'Update Invoice' : 'Generate Invoice'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <FieldBuilderModal 
        module="invoice"
        businessId={session.user.id}
        isOpen={isFieldBuilderOpen}
        onClose={() => {
          setIsFieldBuilderOpen(false)
          fetchInvoiceConfigs()
        }}
      />
    </div>
  )
}
