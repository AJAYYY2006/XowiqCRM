import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Download, Edit2, Trash2 } from 'lucide-react'
import LocalSearch from '../ui/LocalSearch'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

export default function Invoices({ session, profile }) {
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')
  
  const [formData, setFormData] = useState({
    title: '', account_id: '', amount: 0, due_date: '', status: 'Unpaid'
  })
  const [editingInvoice, setEditingInvoice] = useState(null)

  useEffect(() => {
    fetchData()
  }, [session])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [invRes, accRes] = await Promise.all([
        supabase
          .from('quotes')
          .select('*, accounts(account_name, contacts(phone, email)), opportunities(id, name, account_id, accounts(account_name, contacts(phone, email)))')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('accounts')
          .select('id, account_name')
          .eq('user_id', session.user.id)
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
        title: inv.quote_name || '',
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
        [inv.quote_name, `${profile?.currency || '$'}${amount}`]
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
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Simple invoice generator and tracker.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <span style={{ fontSize: 18 }}>+</span> Create Invoice
        </button>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">All Invoices ({invoices.length})</h2>
          <LocalSearch data={invoices} searchKeys={['quote_name']} />
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
                <th>Item / Description</th>
                <th>Customer Name</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state">
                      <div className="empty-state-icon"></div>
                      <h3>No invoices yet</h3>
                      <p>Create your first invoice to get paid.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map(inv => (
                  <tr key={inv.id}>
                    <td>
                      <div className="fw-bold">{inv.quote_name}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{inv.invoice_number || 'No ID'}</div>
                    </td>
                    <td>{inv.accounts?.account_name || inv.opportunities?.accounts?.account_name || '-'}</td>
                    <td className="fw-bold">{profile?.currency || '$'}{Number(inv.total_price).toLocaleString()}</td>
                    <td>{inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : '-'}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                        backgroundColor: inv.status === 'Paid' ? '#dcfce3' : inv.status === 'Overdue' ? '#fee2e2' : '#fef9c3',
                        color: inv.status === 'Paid' ? '#166534' : inv.status === 'Overdue' ? '#991b1b' : '#854d0e'
                      }}>
                        {inv.status || 'Unpaid'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn-icon text-primary" onClick={() => downloadPDF(inv)} title="Download PDF">
                          <Download size={16} />
                        </button>
                        <button className="btn-icon text-primary" onClick={() => handleOpenModal(inv)} title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button className="btn-icon text-danger" onClick={() => handleDelete(inv)} title="Delete">
                          <Trash2 size={16} />
                        </button>
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
    </div>
  )
}
