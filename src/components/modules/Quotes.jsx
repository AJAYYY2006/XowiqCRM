import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { 
  Trash2, Edit2, Download, Plus, Minus, Send, CheckCircle, XCircle, 
  Eye, Receipt, ExternalLink, TrendingUp, Building2, X, ArrowRight, Settings
} from 'lucide-react'
import LocalSearch from '../ui/LocalSearch'
import FieldBuilderModal from '../ui/FieldBuilderModal'
import { useRole } from '../../contexts/RoleContext'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

export default function Quotes({ session, profile }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const userIds = profile?.teamUserIds || [session.user.id]

  const [quotes, setQuotes] = useState([])
  const [invoices, setInvoices] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewingQuote, setViewingQuote] = useState(null)

  const [formData, setFormData] = useState({
    quote_name: '', opportunity_id: '', account_id: '', expires_at: '', total_price: 0,
    tax_rate: 18, discount: 0,
    status: 'Draft', terms: '', items: [{ desc: '', qty: 1, price: 0 }],
    custom_data: {}
  })
  const [editingQuote, setEditingQuote] = useState(null)
  const [isFieldBuilderOpen, setIsFieldBuilderOpen] = useState(false)
  const [quoteConfigs, setQuoteConfigs] = useState([])

  const parseQuoteData = (str) => {
    try {
      const p = JSON.parse(str)
      return p.name ? p : { name: str, status: 'Draft', terms: '', items: [] }
    } catch {
      return { name: str, status: 'Draft', terms: '', items: [] }
    }
  }

  useEffect(() => {
    fetchData()
    fetchQuoteConfigs()
  }, [session, profile])

  const fetchQuoteConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_field_configs')
        .select('*')
        .eq('business_id', session.user.id)
        .eq('module', 'quote')
        .order('display_order', { ascending: true })
      if (!error && data) {
        setQuoteConfigs(data.filter(f => !f.is_archived))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [quotesRes, oppsRes, accountsRes] = await Promise.all([
        supabase
          .from('quotes')
          .select('*, opportunities(id, name, account_id, accounts(id, account_name))')
          .in('user_id', userIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('opportunities')
          .select('id, name, account_id, accounts(id, account_name)')
          .in('user_id', userIds)
          .order('name'),
        supabase
          .from('accounts')
          .select('id, account_name')
          .in('user_id', userIds)
          .order('account_name')
      ])
      
      const allRows = quotesRes.data || []
      // Quotes: rows without invoice_number and where quote_name is not marked as invoice
      const qRows = allRows.filter(row => {
        if (row.invoice_number) return false
        try {
          const p = JSON.parse(row.quote_name)
          return !p.is_invoice
        } catch {
          return false
        }
      })
      const invRows = allRows.filter(row => {
        if (row.invoice_number) return true
        try {
          const p = JSON.parse(row.quote_name)
          return !!p.is_invoice
        } catch {
          return true
        }
      })

      setQuotes(qRows)
      setInvoices(invRows)
      setOpportunities(oppsRes.data || [])
      setAccounts(accountsRes.data || [])
    } catch (error) {
      toast.error('Failed to load quotes')
    } finally {
      setLoading(false)
    }
  }

  // Handle deep-link openId from navigation
  useEffect(() => {
    if (quotes.length > 0 && location.state?.openId) {
      const target = quotes.find(q => q.id === location.state.openId)
      if (target) {
        setViewingQuote(target)
        window.history.replaceState({}, document.title)
      }
    } else if (location.state?.createForOpp) {
      handleOpenModal(null, location.state.createForOpp)
      window.history.replaceState({}, document.title)
    }
  }, [quotes, location.state])

  const calcTotal = (items, discount, taxRate) => {
    const subtotal = items.reduce((acc, item) => acc + (Number(item.qty) * Number(item.price)), 0)
    const afterDiscount = Math.max(subtotal - Number(discount || 0), 0)
    return afterDiscount * (1 + Number(taxRate || 0) / 100)
  }

  const handleOpenModal = (quote = null, defaultOppId = '') => {
    if (quote) {
      setEditingQuote(quote)
      const meta = parseQuoteData(quote.quote_name)
      setFormData({
        quote_name: meta.name,
        opportunity_id: quote.opportunity_id || '',
        account_id: quote.account_id || '',
        expires_at: quote.expires_at ? quote.expires_at.slice(0, 10) : '',
        total_price: quote.total_price || 0,
        tax_rate: quote.tax_rate ?? 18,
        discount: quote.discount ?? 0,
        status: meta.status || 'Draft',
        terms: meta.terms || '',
        items: meta.items?.length ? meta.items : [{ desc: '', qty: 1, price: 0 }],
        custom_data: quote.custom_data || {}
      })
    } else {
      const defaultOpp = opportunities.find(o => o.id === defaultOppId)
      setEditingQuote(null)
      setFormData({
        quote_name: '',
        opportunity_id: defaultOppId || '',
        account_id: defaultOpp?.account_id || '',
        expires_at: '',
        total_price: 0,
        tax_rate: 18,
        discount: 0,
        status: 'Draft',
        terms: 'Net 30. Validity is subject to final scoping.',
        items: [{ desc: '', qty: 1, price: 0 }],
        custom_data: {}
      })
    }
    setIsModalOpen(true)
  }

  const handleOpportunityChange = (opportunityId) => {
    const opp = opportunities.find(o => o.id === opportunityId)
    setFormData(prev => ({ ...prev, opportunity_id: opportunityId, account_id: opp?.account_id || prev.account_id }))
  }

  const addItem = () => {
    const newItems = [...formData.items, { desc: '', qty: 1, price: 0 }]
    setFormData({ ...formData, items: newItems, total_price: calcTotal(newItems, formData.discount, formData.tax_rate) })
  }
  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData({ ...formData, items: newItems, total_price: calcTotal(newItems, formData.discount, formData.tax_rate) })
  }
  const updateItem = (index, field, value) => {
    const newItems = [...formData.items]
    newItems[index][field] = value
    setFormData({ ...formData, items: newItems, total_price: calcTotal(newItems, formData.discount, formData.tax_rate) })
  }
  const updateTaxOrDiscount = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value }
      return { ...next, total_price: calcTotal(next.items, next.discount, next.tax_rate) }
    })
  }

  const handleSelectQuote = (quote) => {
    setViewingQuote(quote)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingQuote ? 'Updating proposal...' : 'Generating proposal...')
    
    try {
      const payloadString = JSON.stringify({
        name: formData.quote_name,
        status: formData.status,
        terms: formData.terms,
        items: formData.items,
        is_invoice: false
      })

      const opp = opportunities.find(o => o.id === formData.opportunity_id)
      const accId = formData.account_id || opp?.account_id || null

      if (editingQuote) {
        const { error } = await supabase
          .from('quotes')
          .update({
            quote_name: payloadString,
            opportunity_id: formData.opportunity_id || null,
            account_id: accId,
            expires_at: formData.expires_at || null,
            total_price: formData.total_price,
            tax_rate: formData.tax_rate,
            discount: formData.discount,
            line_items: formData.items,
            custom_data: formData.custom_data || {}
          })
          .eq('id', editingQuote.id)
          
        if (error) throw error

        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'Proposal Updated',
          description: `${session.user.email} updated proposal: ${formData.quote_name} (${formData.status})`
        }])
        
        toast.success('Proposal updated', { id: toastId })
      } else {
        const { error } = await supabase
          .from('quotes')
          .insert([{
            quote_name: payloadString,
            opportunity_id: formData.opportunity_id || null,
            account_id: accId,
            expires_at: formData.expires_at || null,
            total_price: formData.total_price,
            tax_rate: formData.tax_rate,
            discount: formData.discount,
            line_items: formData.items,
            custom_data: formData.custom_data || {},
            user_id: session.user.id
          }])
          
        if (error) throw error

        const oppStr = opp ? ` for opportunity ${opp.name}` : ''
        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'New Proposal',
          description: `${session.user.email} drafted proposal: ${formData.quote_name}${oppStr}`
        }])
        
        toast.success('Proposal drafted', { id: toastId })
      }
      
      setIsModalOpen(false)
      setEditingQuote(null)
      fetchData()
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  // Convert Quote directly to Invoice
  const handleConvertToInvoice = async (quote) => {
    const meta = parseQuoteData(quote.quote_name)
    const invNo = `INV-${Date.now().toString().slice(-6)}`
    const toastId = toast.loading('Generating invoice from quote...')

    try {
      const opp = quote.opportunities || opportunities.find(o => o.id === quote.opportunity_id)
      const accId = opp?.account_id || quote.account_id

      const payloadString = JSON.stringify({
        name: meta.name || 'Invoice from Proposal',
        quote_id: quote.id,
        quote_name: meta.name,
        is_invoice: true,
        items: meta.items || []
      })

      const { data: newInv, error } = await supabase
        .from('quotes')
        .insert([{
          quote_name: payloadString,
          total_price: quote.total_price || 0,
          expires_at: quote.expires_at || null,
          status: 'Unpaid',
          opportunity_id: quote.opportunity_id || null,
          account_id: accId || null,
          invoice_number: invNo,
          user_id: session.user.id
        }])
        .select()
        .single()

      if (error) throw error

      // Also mark quote as Approved if in Draft
      if (meta.status === 'Draft' || meta.status === 'Sent') {
        meta.status = 'Approved'
        await supabase.from('quotes').update({ quote_name: JSON.stringify(meta) }).eq('id', quote.id)
      }

      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Invoice Generated',
        description: `Generated Invoice #${invNo} from quote "${meta.name}"`
      }])

      toast.success(`Invoice #${invNo} created! Opening invoice...`, { id: toastId })
      navigate('/dashboard/invoices', { state: { openId: newInv.id } })
    } catch (err) {
      console.error(err)
      toast.error('Failed to convert quote: ' + err.message, { id: toastId })
    }
  }

  const handleDeleteQuote = async (quote) => {
    if (!isAdmin) {
      toast.error('Only Super Admin can delete quotes')
      return
    }
    const meta = parseQuoteData(quote.quote_name)
    if (!confirm(`Are you sure you want to delete the quote "${meta.name}"?`)) return
    
    const toastId = toast.loading('Deleting quote...')
    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quote.id)

      if (error) throw error

      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Proposal Deleted',
        description: `${session.user.email} deleted proposal: ${meta.name}`
      }])

      toast.success('Proposal deleted', { id: toastId })
      if (viewingQuote?.id === quote.id) setViewingQuote(null)
      fetchData()
    } catch (error) {
      toast.error('Failed to delete proposal: ' + error.message, { id: toastId })
    }
  }

  const updateQuoteStatus = async (quote, newStatus) => {
    const m = parseQuoteData(quote.quote_name)
    m.status = newStatus
    const payloadString = JSON.stringify(m)
    
    const toastId = toast.loading(`Marking as ${newStatus}...`)
    try {
      await supabase.from('quotes').update({ quote_name: payloadString }).eq('id', quote.id)
      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Proposal Workflow',
        description: `Proposal "${m.name}" marked as ${newStatus}`
      }])
      toast.success(`Proposal marked as ${newStatus}`, { id: toastId })
      if (viewingQuote && viewingQuote.id === quote.id) {
        setViewingQuote({ ...viewingQuote, quote_name: payloadString })
      }
      fetchData()
    } catch (error) {
      toast.error('Failed to update workflow', { id: toastId })
    }
  }

  const downloadPDF = (quote) => {
    const m = parseQuoteData(quote.quote_name)
    const doc = new jsPDF()
    const companyName = session.user.user_metadata?.companyName || 'My Enterprise'
    const curr = profile?.currency || '₹'
    const oppName = quote.opportunities?.name || ''
    const accName = quote.opportunities?.accounts?.account_name || 'Client'
    
    // Header Letterhead
    doc.setFontSize(24)
    doc.setTextColor(243, 122, 35) // XOWIQ Orange
    doc.text(companyName.toUpperCase(), 14, 25)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text('ENTERPRISE PROPOSAL', 14, 32)
    
    // Details
    doc.setTextColor(0)
    doc.setFontSize(12)
    doc.text(`Proposal: ${m.name}`, 14, 48)
    doc.text(`Client: ${accName}`, 14, 55)
    if (oppName) doc.text(`Opportunity: ${oppName}`, 14, 62)
    doc.text(`Date Prepared: ${new Date(quote.created_at).toLocaleDateString()}`, 14, 69)
    if (quote.expires_at) doc.text(`Valid Until: ${new Date(quote.expires_at).toLocaleDateString()}`, 14, 76)
    
    // Line Items
    const tableData = (m.items || []).map(item => [
      item.desc,
      item.qty.toString(),
      `${curr}${Number(item.price).toLocaleString()}`,
      `${curr}${(item.qty * item.price).toLocaleString()}`
    ])

    doc.autoTable({
      startY: 85,
      head: [['Description', 'Quantity', `Unit Price (${curr})`, 'Line Total']],
      body: tableData,
      foot: [['', '', 'Total Due', `${curr}${Number(quote.total_price).toLocaleString()}`]],
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    })
    
    // Terms
    if (m.terms) {
      const finalY = doc.lastAutoTable.finalY + 16
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Terms & Conditions:', 14, finalY)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const splitTerms = doc.splitTextToSize(m.terms, 180)
      doc.text(splitTerms, 14, finalY + 6)
    }
    
    doc.save(`Proposal_${m.name.replace(/\s+/g, '_')}.pdf`)
  }

  if (loading) return <div className="loading-container"><div className="spinner"/></div>

  const roleContext = useRole?.()
  const isAdmin = roleContext ? roleContext.isAdmin : (session?.user?.user_metadata?.role || profile?.role || '').toLowerCase() === 'admin'
  const currency = profile?.currency || '₹'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('modules.quotes.title', 'Proposals & Quotes')}</h1>
          <p className="page-subtitle">{t('modules.quotes.subtitle', 'Build and send enterprise pricing proposals to clients')}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => setIsFieldBuilderOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Settings size={16} /> Edit Fields
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <span style={{ fontSize: 18 }}>+</span> {t('modules.quotes.createQuote', 'Create Proposal')}
          </button>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">{t('modules.quotes.allQuotes', 'All Proposals')} ({quotes.length})</h2>
          <LocalSearch 
             data={quotes} 
             searchKeys={['quote_name']} 
             onSelect={(item) => handleSelectQuote(item)} 
             placeholder={t('modules.quotes.searchPlaceholder', 'Search proposals...')} 
             renderItem={(item) => (
               <>
                 <div className="fw-bold" style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                   {parseQuoteData(item.quote_name).name || item.quote_name}
                 </div>
                 <div className="text-muted" style={{ fontSize: '11px' }}>
                   {currency}{Number(item.total_price).toLocaleString()}
                 </div>
               </>
             )}
          />
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Quote Name & Status</th>
                <th>Opportunity</th>
                <th>Account</th>
                <th>Linked Invoice</th>
                <th>Valid Until</th>
                <th style={{ textAlign: 'right' }}>Total Price ({currency})</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="empty-state">
                      <div className="empty-state-icon"></div>
                      <h3>No proposals yet</h3>
                      <p>Create a quote to send pricing details to your prospects.</p>
                      <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => handleOpenModal()}>
                        + Create First Proposal
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                quotes.map(quote => {
                  const meta = parseQuoteData(quote.quote_name)
                  const statusColors = {
                    Draft: { bg: '#f1f5f9', color: '#475569' },
                    Sent: { bg: '#eff6ff', color: '#1d4ed8' },
                    Approved: { bg: '#f0fdf4', color: '#15803d' },
                    Rejected: { bg: '#fef2f2', color: '#b91c1c' }
                  }
                  const sCol = statusColors[meta.status] || statusColors.Draft

                  // Check if an invoice has been generated for this quote
                  const linkedInv = invoices.find(inv => {
                    try {
                      const p = JSON.parse(inv.quote_name)
                      if (p.quote_id === quote.id) return true
                    } catch {}
                    return (quote.opportunity_id && inv.opportunity_id === quote.opportunity_id)
                  })

                  return (
                    <tr 
                      key={quote.id} 
                      id={`quote-row-${quote.id}`}
                      style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => setViewingQuote(quote)}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="fw-bold" style={{ color: 'var(--text-primary)' }}>
                            {meta.name || quote.quote_name}
                          </span>
                          <span className={`badge badge-${(meta.status || 'draft').toLowerCase()}`}>
                            {meta.status || 'Draft'}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                          {quote.unique_id && <span style={{ fontFamily: 'monospace' }}>{quote.unique_id} • </span>}
                          Created: {new Date(quote.created_at).toLocaleDateString()}
                        </div>
                      </td>

                      <td onClick={e => e.stopPropagation()}>
                        {quote.opportunities?.id ? (
                          <span 
                            style={{ color: 'var(--accent)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
                            onClick={() => navigate('/dashboard/opportunities', { state: { openId: quote.opportunities.id } })}
                            title="Click to view deal"
                            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                          >
                            <TrendingUp size={13} /> {quote.opportunities.name}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      <td onClick={e => e.stopPropagation()}>
                        {quote.opportunities?.account_id && quote.opportunities?.accounts?.account_name ? (
                          <span 
                            style={{ color: 'var(--text-primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
                            onClick={() => navigate('/dashboard/accounts', { state: { openId: quote.opportunities.account_id } })}
                            title="Click to view account"
                            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                          >
                            <Building2 size={13} style={{ color: 'var(--text-muted)' }} />
                            {quote.opportunities.accounts.account_name}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      <td onClick={e => e.stopPropagation()}>
                        {linkedInv ? (
                          <span 
                            onClick={() => navigate('/dashboard/invoices', { state: { openId: linkedInv.id } })}
                            className="badge badge-paid"
                            style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer'
                            }}
                            title="Click to open linked invoice"
                          >
                            <Receipt size={12} /> {linkedInv.invoice_number || 'View Invoice'}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Not Invoiced</span>
                        )}
                      </td>

                      <td style={{ color: 'var(--text-secondary)' }}>{quote.expires_at ? new Date(quote.expires_at).toLocaleDateString() : 'No expiration'}</td>

                      <td className="fw-bold" style={{ textAlign: 'right', color: 'var(--text-primary)' }}>
                        {currency}{Number(quote.total_price).toLocaleString()}
                      </td>

                      <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
                          <button 
                            className="btn-icon" 
                            style={{ color: '#60a5fa' }} 
                            onClick={() => setViewingQuote(quote)} 
                            title="Open Proposal Details"
                          >
                            <Eye size={16} />
                          </button>

                          <button 
                            className="btn-icon" 
                            style={{ color: '#34d399' }} 
                            onClick={() => handleConvertToInvoice(quote)} 
                            title="Convert to Invoice"
                          >
                            <Receipt size={16} />
                          </button>

                          <button 
                            className="btn-icon text-primary" 
                            onClick={() => downloadPDF(quote)} 
                            title="Download PDF"
                          >
                            <Download size={16} />
                          </button>

                          <button 
                            className="btn-icon text-primary" 
                            onClick={() => handleOpenModal(quote)} 
                            title="Edit Quote"
                          >
                            <Edit2 size={16} />
                          </button>

                          {isAdmin && (
                            <button 
                              className="btn-icon text-danger" 
                              onClick={() => handleDeleteQuote(quote)} 
                              title="Delete Quote"
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

      {/* --- QUOTE DETAIL / PREVIEW MODAL --- */}
      {viewingQuote && (
        <div className="modal-overlay" onClick={() => setViewingQuote(null)}>
          <div 
            className="modal" 
            style={{ width: 720, maxWidth: '95vw', padding: 0, overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            {(() => {
              const meta = parseQuoteData(viewingQuote.quote_name)
              const opp = viewingQuote.opportunities || opportunities.find(o => o.id === viewingQuote.opportunity_id)
              const accName = opp?.accounts?.account_name || 'Client'

              return (
                <>
                  <div style={{ 
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
                    color: '#fff', padding: '24px 28px', display: 'flex', 
                    justifyContent: 'space-between', alignItems: 'flex-start' 
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className={`badge badge-${(meta.status || 'draft').toLowerCase()}`} style={{ 
                          fontSize: 11, fontWeight: 800, padding: '4px 12px', textTransform: 'uppercase' 
                        }}>
                          {meta.status || 'Draft'}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          Issued: {new Date(viewingQuote.created_at).toLocaleDateString()}
                          {viewingQuote.expires_at ? ` • Valid until ${new Date(viewingQuote.expires_at).toLocaleDateString()}` : ''}
                        </span>
                      </div>
                      <h2 style={{ margin: '10px 0 4px', fontSize: 22, fontWeight: 800, color: '#fff' }}>
                        {meta.name || viewingQuote.quote_name}
                        {viewingQuote.unique_id && <span style={{ fontFamily: 'monospace', fontSize: 13, opacity: 0.7, marginLeft: 10 }}>{viewingQuote.unique_id}</span>}
                      </h2>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        Client: {accName} {opp ? `• Opportunity: ${opp.name}` : ''}
                      </div>
                    </div>
                    <button 
                      onClick={() => setViewingQuote(null)} 
                      style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.8 }}
                    >
                      <X size={22} />
                    </button>
                  </div>

                  {/* Content */}
                  <div style={{ padding: 24, display: 'grid', gap: 20 }}>
                    {/* Navigation tags */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {opp?.id && (
                        <div 
                          onClick={() => navigate('/dashboard/opportunities', { state: { openId: opp.id } })}
                          style={{ 
                            padding: '8px 14px', borderRadius: 8, background: 'var(--accent-light)', border: '1px solid rgba(255, 89, 0, 0.25)',
                            color: 'var(--accent)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 
                          }}
                        >
                          <TrendingUp size={14} /> Open Deal: {opp.name} <ExternalLink size={12} />
                        </div>
                      )}
                      {opp?.account_id && (
                        <div 
                          onClick={() => navigate('/dashboard/accounts', { state: { openId: opp.account_id } })}
                          style={{ 
                            padding: '8px 14px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 
                          }}
                        >
                          <Building2 size={14} style={{ color: 'var(--text-muted)' }} /> Open Account: {accName} <ExternalLink size={12} />
                        </div>
                      )}
                    </div>

                    {/* Line Items */}
                    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                            <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)' }}>Description</th>
                            <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>Qty</th>
                            <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>Unit Price ({currency})</th>
                            <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>Total ({currency})</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(meta.items && meta.items.length > 0) ? (
                            meta.items.map((it, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>{it.desc}</td>
                                <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--text-secondary)' }}>{it.qty}</td>
                                <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text-secondary)' }}>{currency}{Number(it.price).toLocaleString()}</td>
                                <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{currency}{(Number(it.qty) * Number(it.price)).toLocaleString()}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>
                                {meta.name || 'Proposal Item'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: 'var(--bg-secondary)', borderTop: '2px solid var(--border-subtle)' }}>
                            <td colSpan={3} style={{ padding: '12px 14px', fontWeight: 800, textAlign: 'right', color: 'var(--text-primary)' }}>Total Proposal Value:</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 900, fontSize: 17, color: 'var(--accent)' }}>
                              {currency}{Number(viewingQuote.total_price || 0).toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Terms */}
                    {meta.terms && (
                      <div style={{ background: 'var(--bg-secondary)', padding: 14, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Terms & Conditions</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{meta.terms}</div>
                      </div>
                    )}

                    {/* Workflow status toggle buttons */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Set Status:</span>
                      {['Draft', 'Sent', 'Approved', 'Rejected'].map(st => (
                        <button
                          key={st}
                          onClick={() => updateQuoteStatus(viewingQuote, st)}
                          style={{
                            padding: '4px 12px', borderRadius: 14, fontSize: 11, fontWeight: 700,
                            border: meta.status === st ? '1.5px solid var(--accent)' : '1px solid var(--border-subtle)',
                            background: meta.status === st ? 'var(--accent-light)' : 'var(--bg-secondary)',
                            color: meta.status === st ? 'var(--accent)' : 'var(--text-secondary)',
                            cursor: 'pointer', transition: 'all 0.15s ease'
                          }}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div style={{ 
                    padding: '16px 24px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)', 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                  }}>
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleConvertToInvoice(viewingQuote)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#16a34a' }}
                    >
                      <Receipt size={16} /> Convert to Invoice
                    </button>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => downloadPDF(viewingQuote)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Download size={16} /> Download PDF
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => {
                          const target = viewingQuote
                          setViewingQuote(null)
                          handleOpenModal(target)
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <Edit2 size={15} /> Edit Proposal
                      </button>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* --- PROPOSAL EDIT / CREATE MODAL --- */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: 700, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h2 className="modal-title">{editingQuote ? 'Edit Proposal' : 'Draft Enterprise Proposal'}</h2>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }} 
                  onClick={() => setIsFieldBuilderOpen(true)}
                >
                  <Settings size={14} /> Edit Fields
                </button>
              </div>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: 24 }}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Proposal Name *</label>
                  <input required className="form-input" value={formData.quote_name} onChange={e => setFormData({...formData, quote_name: e.target.value})} placeholder="Q4 Enterprise License" />
                </div>
                <div className="form-group">
                  <label className="form-label">Related Opportunity</label>
                  <select className="form-input" value={formData.opportunity_id} onChange={e => handleOpportunityChange(e.target.value)}>
                    <option value="">-- No Opportunity --</option>
                    {opportunities.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Account</label>
                  <select className="form-input" value={formData.account_id} onChange={e => setFormData({...formData, account_id: e.target.value})}>
                    <option value="">-- No Account --</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.account_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Workflow Status</label>
                  <select className="form-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Validity Date</label>
                  <input type="date" className="form-input" value={formData.expires_at} onChange={e => setFormData({...formData, expires_at: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tax Rate (%)</label>
                  <input type="number" min="0" step="0.01" className="form-input" value={formData.tax_rate} onChange={e => updateTaxOrDiscount('tax_rate', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Discount ({currency})</label>
                  <input type="number" min="0" step="0.01" className="form-input" value={formData.discount} onChange={e => updateTaxOrDiscount('discount', e.target.value)} />
                </div>
              </div>

              {/* Line Items Builder */}
              <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 14 }}>Line Items</h3>
                  <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={addItem}>
                    <Plus size={14} /> Add Item
                  </button>
                </div>
                
                <div style={{ display: 'flex', gap: 12, marginBottom: 6, padding: '0 2px' }}>
                  <label style={{ flex: 2, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Description</label>
                  <label style={{ flex: 1, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Quantity</label>
                  <label style={{ flex: 1, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Price ({currency})</label>
                  <span style={{ width: 18 }} />
                </div>

                {formData.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
                    <input className="form-input" style={{ flex: 2 }} placeholder="Description" value={item.desc} onChange={e => updateItem(idx, 'desc', e.target.value)} required />
                    <input type="number" min="1" className="form-input" style={{ flex: 1 }} placeholder="Quantity" title="Quantity" aria-label="Quantity" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} required />
                    <input type="number" min="0" step="0.01" className="form-input" style={{ flex: 1 }} placeholder={`Price (${currency})`} title={`Price (${currency})`} aria-label={`Price in ${currency}`} value={item.price} onChange={e => updateItem(idx, 'price', e.target.value)} required />
                    <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} disabled={formData.items.length === 1}>
                      <Minus size={18} />
                    </button>
                  </div>
                ))}

                <div style={{ textAlign: 'right', fontWeight: 'bold', marginTop: 16, fontSize: 16 }}>
                  Total Proposal Value: {currency}{formData.total_price.toLocaleString()}
                </div>
              </div>

              <div className="form-group full-width" style={{ marginTop: 24 }}>
                <label className="form-label">Terms & Conditions</label>
                <textarea className="form-input" style={{ minHeight: 100 }} value={formData.terms} onChange={e => setFormData({...formData, terms: e.target.value})} placeholder="Net 30. Validity is subject to final scoping." />
              </div>

              {/* Dynamic Custom Fields */}
              {quoteConfigs.filter(f => !f.is_core).length > 0 && (
                <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>Additional Custom Fields</div>
                  <div className="form-grid">
                    {quoteConfigs.filter(f => !f.is_core).map(f => (
                      <div key={f.id} className="form-group" style={{ gridColumn: f.field_type === 'long_text' ? '1 / -1' : 'auto' }}>
                        <label className="form-label">
                          {f.label} {f.is_required && <span style={{ color: '#ef4444' }}>*</span>}
                        </label>
                        {f.field_type === 'dropdown' ? (
                          <select
                            required={f.is_required}
                            className="form-input"
                            value={formData.custom_data?.[f.field_key] || ''}
                            onChange={e => setFormData({
                              ...formData,
                              custom_data: { ...(formData.custom_data || {}), [f.field_key]: e.target.value }
                            })}
                          >
                            <option value="">-- Select {f.label} --</option>
                            {(f.options || []).map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : f.field_type === 'long_text' ? (
                          <textarea
                            required={f.is_required}
                            className="form-input"
                            rows={3}
                            value={formData.custom_data?.[f.field_key] || ''}
                            onChange={e => setFormData({
                              ...formData,
                              custom_data: { ...(formData.custom_data || {}), [f.field_key]: e.target.value }
                            })}
                          />
                        ) : (
                          <input
                            type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'}
                            required={f.is_required}
                            className="form-input"
                            value={formData.custom_data?.[f.field_key] || ''}
                            onChange={e => setFormData({
                              ...formData,
                              custom_data: { ...(formData.custom_data || {}), [f.field_key]: e.target.value }
                            })}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="form-actions" style={{ marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setIsModalOpen(false); setEditingQuote(null) }}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingQuote ? 'Save Proposal' : 'Save Draft'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <FieldBuilderModal 
        module="quote"
        businessId={session.user.id}
        isOpen={isFieldBuilderOpen}
        onClose={() => {
          setIsFieldBuilderOpen(false)
          fetchQuoteConfigs()
        }}
      />
    </div>
  )
}
