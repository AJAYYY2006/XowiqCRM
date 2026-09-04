import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Trash2, Edit2, Download, Plus, Minus, Send, CheckCircle, XCircle } from 'lucide-react'
import LocalSearch from '../ui/LocalSearch'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

export default function Quotes({ session, profile }) {
  const { t } = useTranslation()
  const userIds = profile?.teamUserIds || [session.user.id]
  const [quotes, setQuotes] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    quote_name: '', opportunity_id: '', expires_at: '', total_price: 0,
    status: 'Draft', terms: '', items: [{ desc: '', qty: 1, price: 0 }]
  })
  const [editingQuote, setEditingQuote] = useState(null)

  useEffect(() => {
    fetchData()
  }, [session, profile])

  const parseQuoteData = (str) => {
    try {
      const p = JSON.parse(str)
      return p.name ? p : { name: str, status: 'Draft', terms: '', items: [] }
    } catch {
      return { name: str, status: 'Draft', terms: '', items: [] }
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [quotesRes, oppsRes] = await Promise.all([
        supabase
          .from('quotes')
          .select('*, opportunities(id, name, account_id, accounts(account_name))')
          .in('user_id', userIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('opportunities')
          .select('id, name')
          .in('user_id', userIds)
          .order('name')
      ])
      
      setQuotes(quotesRes.data || [])
      setOpportunities(oppsRes.data || [])
    } catch (error) {
      toast.error('Failed to load quotes')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (quote = null) => {
    if (quote) {
      setEditingQuote(quote)
      const meta = parseQuoteData(quote.quote_name)
      setFormData({
        quote_name: meta.name,
        opportunity_id: quote.opportunity_id || '',
        expires_at: quote.expires_at || '',
        total_price: quote.total_price || 0,
        status: meta.status || 'Draft',
        terms: meta.terms || '',
        items: meta.items?.length ? meta.items : [{ desc: '', qty: 1, price: 0 }]
      })
    } else {
      setEditingQuote(null)
      setFormData({
        quote_name: '', opportunity_id: '', expires_at: '', total_price: 0,
        status: 'Draft', terms: '', items: [{ desc: '', qty: 1, price: 0 }]
      })
    }
    setIsModalOpen(true)
  }

  const addItem = () => setFormData({ ...formData, items: [...formData.items, { desc: '', qty: 1, price: 0 }] })
  const removeItem = (index) => setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) })
  const updateItem = (index, field, value) => {
    const newItems = [...formData.items]
    newItems[index][field] = value
    const total = newItems.reduce((acc, item) => acc + (Number(item.qty) * Number(item.price)), 0)
    setFormData({ ...formData, items: newItems, total_price: total })
  }

  const handleSelectQuote = (quote) => {
    const el = document.getElementById(`quote-row-${quote.id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.style.transition = 'background-color 0.5s'
      el.style.backgroundColor = 'var(--bg-card-hover)'
      setTimeout(() => { el.style.backgroundColor = '' }, 2000)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingQuote ? 'Updating proposal...' : 'Generating proposal...')
    
    try {
      const payloadString = JSON.stringify({
        name: formData.quote_name,
        status: formData.status,
        terms: formData.terms,
        items: formData.items
      })

      if (editingQuote) {
        const { error } = await supabase
          .from('quotes')
          .update({ 
            quote_name: payloadString,
            opportunity_id: formData.opportunity_id || null,
            expires_at: formData.expires_at || null,
            total_price: formData.total_price
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
            expires_at: formData.expires_at || null,
            total_price: formData.total_price,
            user_id: session.user.id 
          }])
          
        if (error) throw error

        const opp = formData.opportunity_id ? (opportunities?.find(o => o.id === formData.opportunity_id) || null) : null
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
  const handleDeleteQuote = async (quote) => {
    if (!confirm(`Are you sure you want to delete the quote "${quote.quote_name}"?`)) return
    
    const toastId = toast.loading('Deleting quote...')
    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quote.id)

      if (error) throw error

      const m = parseQuoteData(quote.quote_name)
      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Proposal Deleted',
        description: `${session.user.email} deleted proposal: ${m.name}`
      }])

      toast.success('Proposal deleted', { id: toastId })
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
      toast.success(`Proposal ${newStatus}`, { id: toastId })
      fetchData()
    } catch (error) {
      toast.error('Failed to update workflow', { id: toastId })
    }
  }

  const downloadPDF = (quote) => {
    const m = parseQuoteData(quote.quote_name)
    const doc = new jsPDF()
    const companyName = session.user.user_metadata?.companyName || 'My Enterprise'
    const oppName = quote.opportunities?.name || ''
    const accName = quote.opportunities?.accounts?.account_name || 'Client'
    
    // Header Letterhead
    doc.setFontSize(26)
    doc.setTextColor(243, 122, 35) // XOWIQ Orange
    doc.text(companyName.toUpperCase(), 14, 25)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text('ENTERPRISE PROPOSAL', 14, 32)
    
    // Details
    doc.setTextColor(0)
    doc.setFontSize(12)
    doc.text(`Proposal Name: ${m.name}`, 14, 50)
    doc.text(`Client: ${accName}`, 14, 57)
    if (oppName) doc.text(`Opportunity: ${oppName}`, 14, 64)
    doc.text(`Date Prepared: ${new Date(quote.created_at).toLocaleDateString()}`, 14, 71)
    if (quote.expires_at) doc.text(`Valid Until: ${new Date(quote.expires_at).toLocaleDateString()}`, 14, 78)
    
    // Line Items
    const tableData = (m.items || []).map(item => [
      item.desc, 
      item.qty.toString(), 
      `$${Number(item.price).toLocaleString()}`, 
      `$${(item.qty * item.price).toLocaleString()}`
    ])
    
    doc.autoTable({
      startY: 90,
      head: [['Description', 'Qty', 'Unit Price', 'Line Total']],
      body: tableData,
      foot: [['', '', 'Total Due', `$${Number(quote.total_price).toLocaleString()}`]],
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    })
    
    // Terms
    if (m.terms) {
      const finalY = doc.lastAutoTable.finalY + 20
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
  
  const isAdmin = ['admin', 'administrator'].includes((session?.user?.user_metadata?.role || profile?.role || '').toLowerCase())

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('modules.quotes.title')}</h1>
          <p className="page-subtitle">{t('modules.quotes.subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <span style={{ fontSize: 18 }}>+</span> {t('modules.quotes.createQuote')}
        </button>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">{t('modules.quotes.allQuotes')} ({quotes.length})</h2>
          <LocalSearch 
             data={quotes} 
             searchKeys={['quote_name']} 
             onSelect={(item) => handleSelectQuote(item)} 
             placeholder={t('modules.quotes.searchPlaceholder')} 
             renderItem={(item) => (
               <>
                 <div className="fw-bold" style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.quote_name}</div>
                 <div className="text-muted" style={{ fontSize: '11px' }}>${Number(item.total_price).toLocaleString()}</div>
               </>
             )}
          />
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Quote Name</th>
                <th>Opportunity</th>
                <th>Account</th>
                <th>Expires Date</th>
                <th style={{ textAlign: 'right' }}>Total Price</th>
                <th>Created</th>
                <th style={{ width: 70 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state">
                      <div className="empty-state-icon"></div>
                      <h3>No quotes yet</h3>
                      <p>Create a quote to send pricing details to your prospects.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                quotes.map(quote => (
                  <tr key={quote.id} id={`quote-row-${quote.id}`}>
                    <td className="fw-bold">{quote.quote_name}</td>
                    <td>
                      {quote.opportunities?.id ? (
                        <span 
                          style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate('/dashboard/opportunities', { state: { openId: quote.opportunities.id } })
                          }}
                          title="Click to view opportunity"
                        >
                          {quote.opportunities.name}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      {quote.opportunities?.account_id && quote.opportunities?.accounts?.account_name ? (
                        <span 
                          style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate('/dashboard/accounts', { state: { openId: quote.opportunities.account_id } })
                          }}
                          title="Click to view account"
                        >
                          {quote.opportunities.accounts.account_name}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>{quote.expires_at ? new Date(quote.expires_at).toLocaleDateString() : 'No expiration'}</td>
                    <td className="fw-bold" style={{ textAlign: 'right' }}>${Number(quote.total_price).toLocaleString()}</td>
                    <td className="text-muted">{new Date(quote.created_at).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
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
                ))
              )}

            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: 700, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingQuote ? 'Edit Proposal' : 'Draft Enterprise Proposal'}</h2>
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
                  <select className="form-input" value={formData.opportunity_id} onChange={e => setFormData({...formData, opportunity_id: e.target.value})}>
                    <option value="">-- No Opportunity --</option>
                    {opportunities.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
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
                <div className="form-group full-width">
                  <label className="form-label">Validity Date</label>
                  <input type="date" className="form-input" value={formData.expires_at} onChange={e => setFormData({...formData, expires_at: e.target.value})} />
                </div>
              </div>

              {/* Line Items Builder */}
              <div style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 14 }}>Line Items</h3>
                  <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={addItem}>
                    <Plus size={14} /> Add Item
                  </button>
                </div>
                
                {formData.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
                    <input className="form-input" style={{ flex: 2 }} placeholder="Description" value={item.desc} onChange={e => updateItem(idx, 'desc', e.target.value)} required />
                    <input type="number" min="1" className="form-input" style={{ flex: 1 }} placeholder="Qty" value={item.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} required />
                    <input type="number" min="0" step="0.01" className="form-input" style={{ flex: 1 }} placeholder="Price" value={item.price} onChange={e => updateItem(idx, 'price', e.target.value)} required />
                    <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} disabled={formData.items.length === 1}>
                      <Minus size={18} />
                    </button>
                  </div>
                ))}
                
                <div style={{ textAlign: 'right', fontWeight: 'bold', marginTop: 16, fontSize: 16 }}>
                  Total Proposal Value: ${formData.total_price.toLocaleString()}
                </div>
              </div>

              <div className="form-group full-width" style={{ marginTop: 24 }}>
                <label className="form-label">Terms & Conditions</label>
                <textarea className="form-input" style={{ minHeight: 100 }} value={formData.terms} onChange={e => setFormData({...formData, terms: e.target.value})} placeholder="Net 30. Validity is subject to final scoping." />
              </div>
              
              <div className="form-actions" style={{ marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setIsModalOpen(false); setEditingQuote(null) }}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingQuote ? 'Save Proposal' : 'Save Draft'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
