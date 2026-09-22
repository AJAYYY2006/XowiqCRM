import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Download, Edit2, Trash2, Settings } from 'lucide-react'
import LocalSearch from '../ui/LocalSearch'
import FieldBuilderModal from '../ui/FieldBuilderModal'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

// Invoices share the `quotes` table with Quotes module.
// Quotes stores JSON in quote_name; Invoices stores plain text.
function parseInvoiceName(raw) {
  if (!raw) return ''
  try {
    const p = JSON.parse(raw)
    return p.name || raw
  } catch {
    return raw
  }
}

export default function Invoices({ session, profile }) {
  const { t } = useTranslation()
  const userIds = profile?.teamUserIds || [session.user.id]
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')
  const isAdmin = ['admin', 'administrator'].includes((session?.user?.user_metadata?.role || profile?.role || '').toLowerCase())
  
  const [formData, setFormData] = useState({
    title: '', account_id: '', amount: 0, due_date: '', status: 'Unpaid'
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
        { label: 'Item / Description', field_key: 'quote_name', field_type: 'text', is_core: true, order: 0 },
        { label: 'Customer Name', field_key: 'customer_name', field_type: 'text', is_core: true, order: 1 },
        { label: 'Amount', field_key: 'total_price', field_type: 'number', is_core: true, order: 2 },
        { label: 'Due Date', field_key: 'expires_at', field_type: 'date', is_core: true, order: 3 },
        { label: 'Status', field_key: 'status', field_type: 'dropdown', options: ['Paid', 'Unpaid', 'Overdue'], is_core: true, order: 4 }
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
      const [invRes, accRes] = await Promise.all([
        supabase
          .from('quotes')
          .select('*, accounts(account_name, contacts(phone, email)), opportunities(id, name, account_id, accounts(account_name, contacts(phone, email)))')
          .in('user_id', userIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('accounts')
          .select('id, account_name')
          .in('user_id', userIds)
          .order('account_name')
      ])
      
      setInvoices(invRes.data || [])
      setCustomers(accRes.data || [])
    } catch (error) {
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  const filteredInvoices = statusFilter === 'All' 
    ? invoices 
    : invoices.filter(inv => (inv.status || 'Unpaid') === statusFilter)

  const handleOpenModal = (inv = null) => {
    if (inv) {
      setEditingInvoice(inv)
      setFormData({
        title: parseInvoiceName(inv.quote_name) || '',
        account_id: inv.account_id || inv.opportunities?.account_id || '',
        amount: inv.total_price || 0,
        due_date: inv.expires_at || '',
        status: inv.status || 'Unpaid'
      })
    } else {
      setEditingInvoice(null)
      setFormData({
        title: '', account_id: '', amount: 0, due_date: '', status: 'Unpaid'
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.account_id) return toast.error('Please select a customer')

    const toastId = toast.loading(editingInvoice ? 'Updating invoice...' : 'Generating invoice...')
    try {
      let oppId = editingInvoice?.opportunity_id

      if (!editingInvoice) {
        // Create an underlying Opportunity (Purchase) to map the quote cleanly
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
      } else {
        // Update existing opportunity
        await supabase.from('opportunities').update({
          name: `Purchase: ${formData.title}`,
          amount: formData.amount,
          stage: formData.status === 'Paid' ? 'closed' : 'negotiation',
          account_id: formData.account_id
        }).eq('id', oppId)
      }

      const quotePayload = {
        quote_name: formData.title,
        total_price: formData.amount,
        expires_at: formData.due_date || null,
        status: formData.status,
        opportunity_id: oppId,
        account_id: formData.account_id
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
          description: `Generated ${formData.status} invoice for ${formData.title}`
        }])
        toast.success('Invoice generated', { id: toastId })
      }
      
      setIsModalOpen(false)
      fetchData()
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleDelete = async (inv) => {
    if (!confirm('Delete this invoice?')) return
    const toastId = toast.loading('Deleting...')
    try {
      await supabase.from('quotes').delete().eq('id', inv.id)
      if (inv.opportunity_id) {
        await supabase.from('opportunities').delete().eq('id', inv.opportunity_id)
      }
      toast.success('Deleted', { id: toastId })
      fetchData()
    } catch (error) {
      toast.error('Failed to delete', { id: toastId })
    }
  }

  const downloadPDF = (inv) => {
    const doc = new jsPDF()
    const customerName = inv.opportunities?.accounts?.account_name || 'Customer'
    const contact = inv.opportunities?.accounts?.contacts?.[0]
    const amount = Number(inv.total_price).toLocaleString()
    
    doc.setFontSize(22)
    doc.text('INVOICE', 14, 20)
    
    doc.setFontSize(10)
    doc.text(`Date: ${new Date(inv.created_at).toLocaleDateString()}`, 14, 30)
    doc.text(`Due Date: ${inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : 'Upon receipt'}`, 14, 35)
    doc.text(`Status: ${inv.status || 'Unpaid'}`, 14, 40)
    
    doc.setFontSize(12)
    doc.text('Billed To:', 14, 55)
    doc.setFontSize(10)
    doc.text(customerName, 14, 62)
    if (contact?.phone) doc.text(contact.phone, 14, 67)
    if (contact?.email) doc.text(contact.email, 14, 72)
    
    doc.autoTable({
      startY: 85,
      head: [['Description', 'Amount']],
      body: [
        [parseInvoiceName(inv.quote_name), `${profile?.currency || '$'}${amount}`]
      ],
      foot: [['Total Due', `${profile?.currency || '$'}${amount}`]],
      theme: 'grid',
      headStyles: { fillColor: [243, 122, 35] }
    })
    
    doc.save(`Invoice_${customerName.replace(/\s+/g, '_')}.pdf`)
  }

  if (loading) return <div className="loading-container"><div className="spinner"/></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('modules.invoices.title')}</h1>
          <p className="page-subtitle">{t('modules.invoices.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setIsFieldBuilderOpen(true)}>
            <Settings size={14} /> {t('modules.invoices.editFields')}
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <span style={{ fontSize: 18 }}>+</span> {t('modules.invoices.createInvoice')}
          </button>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">{t('modules.invoices.allInvoices')} ({invoices.length})</h2>
          <LocalSearch 
             data={invoices} 
             searchKeys={['quote_name', 'invoice_number']} 
             onSelect={(item) => handleOpenModal(item)}
             placeholder={t('modules.invoices.searchPlaceholder')}
             renderItem={(item) => (
               <>
                 <div className="fw-bold" style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{parseInvoiceName(item.quote_name)}</div>
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
                border: statusFilter === f ? '1.5px solid #f37a23' : '1.5px solid #e5e7eb',
                background: statusFilter === f ? '#fff5f0' : '#fff',
                color: statusFilter === f ? '#f37a23' : '#666',
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
                {invoiceConfigs.filter(c => c.show_in_list).map(config => (
                  <th key={config.id}>{config.label}</th>
                ))}
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={invoiceConfigs.filter(c => c.show_in_list).length + 1}>
                    <div className="empty-state">
                      <div className="empty-state-icon"></div>
                      <h3>No invoices yet</h3>
                      <p>Create your first invoice to get paid.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => (
                  <tr key={inv.id}>
                    {invoiceConfigs.filter(c => c.show_in_list).map(config => {
                      if (config.field_key === 'quote_name') {
                        return (
                          <td key={config.id}>
                            <div className="fw-bold">{parseInvoiceName(inv.quote_name)}</div>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>{inv.invoice_number || 'No ID'}</div>
                          </td>
                        )
                      }
                      if (config.field_key === 'customer_name') {
                        return <td key={config.id}>{inv.accounts?.account_name || inv.opportunities?.accounts?.account_name || '-'}</td>
                      }
                      if (config.field_key === 'total_price') {
                        return <td key={config.id} className="fw-bold">{profile?.currency || '$'}{Number(inv.total_price).toLocaleString()}</td>
                      }
                      if (config.field_key === 'expires_at') {
                        return <td key={config.id}>{inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : '-'}</td>
                      }
                      if (config.field_key === 'status') {
                        return (
                          <td key={config.id}>
                            <span style={{
                              padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                              backgroundColor: inv.status === 'Paid' ? '#dcfce3' : inv.status === 'Overdue' ? '#fee2e2' : '#fef9c3',
                              color: inv.status === 'Paid' ? '#166534' : inv.status === 'Overdue' ? '#991b1b' : '#854d0e'
                            }}>
                              {inv.status || 'Unpaid'}
                            </span>
                          </td>
                        )
                      }
                      return <td key={config.id}>{inv[config.field_key] || '—'}</td>
                    })}
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn-icon text-primary" onClick={() => downloadPDF(inv)} title="Download PDF">
                          <Download size={16} />
                        </button>
                        <button className="btn-icon text-primary" onClick={() => handleOpenModal(inv)} title="Edit">
                          <Edit2 size={16} />
                        </button>
                        {isAdmin && (
                          <button className="btn-icon text-danger" onClick={() => handleDelete(inv)} title="Delete">
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
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editingInvoice ? 'Edit Invoice' : 'Generate Invoice'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Item / Service Description *</label>
                  <input required className="form-input" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Website Design Services" />
                </div>
                <div className="form-group">
                  <label className="form-label">Customer *</label>
                  <select required className="form-input" value={formData.account_id} onChange={e => setFormData({...formData, account_id: e.target.value})}>
                    <option value="">-- Select Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.account_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount ({profile?.currency || '$'}) *</label>
                  <input type="number" required min="0" step="0.01" className="form-input" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-input" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>
              
              <div className="form-actions">
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
