import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Trash2, Edit2 } from 'lucide-react'
import LocalSearch from '../ui/LocalSearch'

const STAGES = ['prospecting', 'scoping', 'negotiation', 'legal', 'contract', 'closed']

export default function Opportunities({ session, profile }) {
  const [opportunities, setOpportunities] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedOpp, setSelectedOpp] = useState(null)
  const [activeTab, setActiveTab] = useState('products')
  const location = useLocation()
  const navigate = useNavigate()
  
  // Opp Detail Data
  const [oppProducts, setOppProducts] = useState([])
  const [oppQuotes, setOppQuotes] = useState([])
  const [oppInvoices, setOppInvoices] = useState([])
  const [oppTasks, setOppTasks] = useState([])
  const [oppActs, setOppActs] = useState([])

  // Form State
  const [formData, setFormData] = useState({
    name: '', account_id: '', stage: 'prospecting', amount: 0, owner: '', closed_date: ''
  })
  
  // Product Form State (in-line in detail view)
  const [prodForm, setProdForm] = useState({ name: '', quantity: 1, unit_price: 0 })
  const [editingProductId, setEditingProductId] = useState(null)
  const [editingProductOriginalTotal, setEditingProductOriginalTotal] = useState(0)

  // Quotes and Invoices Modals
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false)
  const [quoteFormData, setQuoteFormData] = useState({ quote_name: '', expires_at: '', total_price: 0 })
  const [editingQuoteId, setEditingQuoteId] = useState(null)

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [invoiceFormData, setInvoiceFormData] = useState({ invoice_name: '', status: 'draft', due_date: '', amount: 0 })
  const [editingInvoiceId, setEditingInvoiceId] = useState(null)

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [taskFormData, setTaskFormData] = useState({ title: '', task_type: 'Call', status: 'Open', due_date: '', owner: '' })
  const [editingTaskId, setEditingTaskId] = useState(null)

  const [editingOpp, setEditingOpp] = useState(null)

  useEffect(() => {
    fetchData()
  }, [session])

  useEffect(() => {
    if (opportunities.length > 0 && location.state?.openId) {
      const opp = opportunities.find(o => o.id === location.state.openId)
      if (opp) {
        setSelectedOpp(opp)
        window.history.replaceState({}, document.title)
      }
    }
  }, [opportunities, location.state])

  useEffect(() => {
    if (selectedOpp) fetchOppDetails(selectedOpp.id, selectedOpp.name)
  }, [selectedOpp])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [oppsRes, accsRes] = await Promise.all([
        supabase
          .from('opportunities')
          .select('*, accounts(account_name)')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('accounts')
          .select('id, account_name')
          .eq('user_id', session.user.id)
          .order('account_name')
      ])
      
      setOpportunities(oppsRes.data || [])
      setAccounts(accsRes.data || [])
    } catch (error) {
      toast.error('Failed to load opportunities')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteOpportunity = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete opportunity "${name}"?`)) return
    const toastId = toast.loading('Deleting opportunity...')
    try {
      const { error } = await supabase
        .from('opportunities')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Opportunity Deleted',
        description: `Deleted opportunity: ${name}`
      }])
      
      toast.success('Opportunity deleted', { id: toastId })
      fetchData()
    } catch (error) {
      toast.error(`Error deleting opportunity: ${error.message}`, { id: toastId })
    }
  }

  const fetchOppDetails = async (id, oppName) => {
    const [pRes, qRes, iRes, tRes, aRes] = await Promise.all([
      supabase.from('products').select('*').eq('opportunity_id', id),
      supabase.from('quotes').select('*').eq('opportunity_id', id),
      supabase.from('invoices').select('*').eq('opportunity_id', id),
      supabase.from('tasks').select('*').eq('related_to', 'opportunities').eq('related_id', id),
      supabase.from('activities').select('*').eq('user_id', session.user.id)
    ])
    setOppProducts(pRes.data || [])
    setOppQuotes(qRes.data || [])
    setOppInvoices(iRes.data || [])
    setOppTasks(tRes.data || [])
    
    // Filter activities
    const nameLower = (oppName || '').toLowerCase()
    const filteredActs = (aRes.data || []).filter(a => {
      if (!a.description) return false
      const d = a.description.toLowerCase()
      if (nameLower && d.includes(nameLower)) return true
      return false
    })
    
    setOppActs(filteredActs.sort((x, y) => new Date(y.created_at) - new Date(x.created_at)))
  }

  const handleOpenModal = (opp = null) => {
    if (opp) {
      setEditingOpp(opp)
      setFormData({
        name: opp.name, account_id: opp.account_id || '', stage: opp.stage, amount: opp.amount || 0,
        owner: opp.owner || '', closed_date: opp.closed_date || ''
      })
    } else {
      setEditingOpp(null)
      setFormData({
        name: '', account_id: '', stage: 'prospecting', amount: 0,
        owner: profile?.name || session.user.email, closed_date: ''
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingOpp ? 'Updating opportunity...' : 'Adding opportunity...')
    
    try {
      if (editingOpp) {
        const { error } = await supabase
          .from('opportunities')
          .update({ 
            ...formData, 
            account_id: formData.account_id || null,
            closed_date: formData.closed_date || null
          })
          .eq('id', editingOpp.id)
          
        if (error) throw error
  
        const acc = accounts?.find(a => a.id === formData.account_id)
        const accStr = acc ? ` for ${acc.account_name}` : ''
        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'Opportunity Updated',
          description: `${profile?.name || session.user.email} updated deal: ${formData.name}${accStr}`
        }])
        
        toast.success('Opportunity updated', { id: toastId })
        if (selectedOpp && selectedOpp.id === editingOpp.id) {
          setSelectedOpp({ ...selectedOpp, ...formData, account_id: formData.account_id || null, closed_date: formData.closed_date })
          fetchOppDetails(selectedOpp.id, formData.name)
        }
      } else {
        const { error } = await supabase
          .from('opportunities')
          .insert([{ 
            ...formData, 
            account_id: formData.account_id || null,
            closed_date: formData.closed_date || null,
            user_id: session.user.id 
          }])
          
        if (error) throw error
  
        const acc = accounts?.find(a => a.id === formData.account_id)
        const accStr = acc ? ` for ${acc.account_name}` : ''
        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'New Opportunity',
          description: `${profile?.name || session.user.email} created deal: ${formData.name}${accStr}`
        }])
        
        toast.success('Opportunity added', { id: toastId })
      }
      setIsModalOpen(false)
      fetchData()
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const updateStage = async (newStage) => {
    if (!selectedOpp) return
    const toastId = toast.loading('Updating pipeline stage...')
    try {
      const { error } = await supabase
        .from('opportunities')
        .update({ stage: newStage })
        .eq('id', selectedOpp.id)

      if (error) throw error
      
      // Update local state instantly
      setSelectedOpp({ ...selectedOpp, stage: newStage })
      
      // Update main list without reloading whole view
      setOpportunities(prev => prev.map(o => o.id === selectedOpp.id ? { ...o, stage: newStage } : o))
      
      const accStr = selectedOpp.accounts?.account_name ? ` for ${selectedOpp.accounts.account_name}` : ''
      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Pipeline Moved',
        description: `${profile?.name || session.user.email} moved ${selectedOpp.name} to ${newStage}${accStr}`
      }])

      toast.success(`Moved to ${newStage}`, { id: toastId })
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleAddProduct = async (e) => {
    e.preventDefault()
    if (!prodForm.name) return
    const toastId = toast.loading(editingProductId ? 'Updating product...' : 'Adding product...')
    
    try {
      if (editingProductId) {
        const { error } = await supabase
          .from('products')
          .update({ 
            name: prodForm.name,
            quantity: prodForm.quantity,
            unit_price: prodForm.unit_price
          })
          .eq('id', editingProductId)
          
        if (error) throw error
        
        const diffTotal = (Number(prodForm.quantity) * Number(prodForm.unit_price)) - (editingProductOriginalTotal)
        const newTotal = Number(selectedOpp.amount) + diffTotal
        
        await supabase.from('opportunities').update({ amount: newTotal }).eq('id', selectedOpp.id)
        
        setSelectedOpp({ ...selectedOpp, amount: newTotal })
        setOpportunities(prev => prev.map(o => o.id === selectedOpp.id ? { ...o, amount: newTotal } : o))
        
        toast.success('Product updated', { id: toastId })
      } else {
        const { error } = await supabase
          .from('products')
          .insert([{ 
            ...prodForm, 
            opportunity_id: selectedOpp.id,
            user_id: session.user.id 
          }])
          
        if (error) throw error
        
        const newTotal = Number(selectedOpp.amount) + (Number(prodForm.quantity) * Number(prodForm.unit_price))
        await supabase.from('opportunities').update({ amount: newTotal }).eq('id', selectedOpp.id)
        
        setSelectedOpp({ ...selectedOpp, amount: newTotal })
        setOpportunities(prev => prev.map(o => o.id === selectedOpp.id ? { ...o, amount: newTotal } : o))
        
        toast.success('Product added', { id: toastId })
      }
      
      setProdForm({ name: '', quantity: 1, unit_price: 0 })
      setEditingProductId(null)
      setEditingProductOriginalTotal(0)
      
      fetchOppDetails(selectedOpp.id, selectedOpp.name)
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleSaveQuote = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingQuoteId ? 'Updating quote...' : 'Creating quote...')
    try {
      if (editingQuoteId) {
        const { error } = await supabase.from('quotes').update({
          quote_name: quoteFormData.quote_name,
          expires_at: quoteFormData.expires_at || null,
          total_price: quoteFormData.total_price
        }).eq('id', editingQuoteId)
        if (error) throw error
        
        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'Quote Updated',
          description: `${profile?.name || session.user.email} updated quote ${quoteFormData.quote_name} for opportunity ${selectedOpp.name}`
        }])
        
        toast.success('Quote updated', { id: toastId })
      } else {
        const { error } = await supabase.from('quotes').insert([{
          quote_name: quoteFormData.quote_name,
          expires_at: quoteFormData.expires_at || null,
          total_price: quoteFormData.total_price,
          opportunity_id: selectedOpp.id,
          user_id: session.user.id
        }])
        if (error) throw error
        
        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'New Quote',
          description: `${profile?.name || session.user.email} created quote ${quoteFormData.quote_name} for opportunity ${selectedOpp.name}`
        }])
        
        toast.success('Quote created', { id: toastId })
      }
      
      setIsQuoteModalOpen(false)
      setEditingQuoteId(null)
      setQuoteFormData({ quote_name: '', expires_at: '', total_price: 0 })
      fetchOppDetails(selectedOpp.id, selectedOpp.name)
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleSaveInvoice = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingInvoiceId ? 'Updating invoice...' : 'Creating invoice...')
    try {
      if (editingInvoiceId) {
        const { error } = await supabase.from('invoices').update({
          invoice_name: invoiceFormData.invoice_name,
          status: invoiceFormData.status,
          due_date: invoiceFormData.due_date || null,
          amount: invoiceFormData.amount
        }).eq('id', editingInvoiceId)
        if (error) throw error
        
        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'Invoice Updated',
          description: `${profile?.name || session.user.email} updated invoice ${invoiceFormData.invoice_name} for opportunity ${selectedOpp.name}`
        }])
        
        toast.success('Invoice updated', { id: toastId })
      } else {
        const { error } = await supabase.from('invoices').insert([{
          invoice_name: invoiceFormData.invoice_name,
          status: invoiceFormData.status,
          due_date: invoiceFormData.due_date || null,
          amount: invoiceFormData.amount,
          opportunity_id: selectedOpp.id,
          user_id: session.user.id
        }])
        if (error) throw error
        
        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'New Invoice',
          description: `${profile?.name || session.user.email} created invoice ${invoiceFormData.invoice_name} for opportunity ${selectedOpp.name}`
        }])
        
        toast.success('Invoice created', { id: toastId })
      }
      
      setIsInvoiceModalOpen(false)
      setEditingInvoiceId(null)
      setInvoiceFormData({ invoice_name: '', status: 'draft', due_date: '', amount: 0 })
      fetchOppDetails(selectedOpp.id, selectedOpp.name)
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleDeleteProduct = async (id, total) => {
    if (!window.confirm('Delete this product?')) return
    const toastId = toast.loading('Deleting product...')
    try {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
      
      const newTotal = Number(selectedOpp.amount) - Number(total)
      await supabase.from('opportunities').update({ amount: newTotal }).eq('id', selectedOpp.id)
      
      setSelectedOpp({ ...selectedOpp, amount: newTotal })
      setOpportunities(prev => prev.map(o => o.id === selectedOpp.id ? { ...o, amount: newTotal } : o))
      
      fetchOppDetails(selectedOpp.id, selectedOpp.name)
      toast.success('Product removed', { id: toastId })
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleDeleteQuote = async (id, name) => {
    if (!window.confirm(`Delete quote "${name}"?`)) return
    const toastId = toast.loading('Deleting quote...')
    try {
      const { error } = await supabase.from('quotes').delete().eq('id', id)
      if (error) throw error
      
      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Quote Deleted',
        description: `${profile?.name || session.user.email} deleted quote ${name} from opportunity ${selectedOpp.name}`
      }])
      
      fetchOppDetails(selectedOpp.id, selectedOpp.name)
      toast.success('Quote deleted', { id: toastId })
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleDeleteInvoice = async (id, name) => {
    if (!window.confirm(`Delete invoice "${name}"?`)) return
    const toastId = toast.loading('Deleting invoice...')
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', id)
      if (error) throw error
      
      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Invoice Deleted',
        description: `${profile?.name || session.user.email} deleted invoice ${name} from opportunity ${selectedOpp.name}`
      }])
      
      fetchOppDetails(selectedOpp.id, selectedOpp.name)
      toast.success('Invoice deleted', { id: toastId })
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleSaveTask = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingTaskId ? 'Updating task...' : 'Creating task...')
    try {
      const taskData = {
        ...taskFormData,
        related_to: 'opportunities',
        related_id: selectedOpp.id,
        user_id: session.user.id
      }

      if (editingTaskId) {
        const { error } = await supabase.from('tasks').update(taskData).eq('id', editingTaskId)
        if (error) throw error
        toast.success('Task updated', { id: toastId })
      } else {
        const { error } = await supabase.from('tasks').insert([taskData])
        if (error) throw error
        toast.success('Task created', { id: toastId })
      }
      
      setIsTaskModalOpen(false)
      fetchOppDetails(selectedOpp.id, selectedOpp.name)
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleDeleteTask = async (id, title) => {
    if (!window.confirm(`Delete task "${title}"?`)) return
    const toastId = toast.loading('Deleting task...')
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
      fetchOppDetails(selectedOpp.id, selectedOpp.name)
      toast.success('Task deleted', { id: toastId })
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  if (loading) return <div className="loading-container"><div className="spinner"/></div>
  
  const isAdmin = ['admin', 'administrator'].includes(profile?.role?.toLowerCase())

  if (selectedOpp) {
    const currentIndex = STAGES.indexOf(selectedOpp.stage)
    
    return (
      <div>
        <button className="back-btn" onClick={() => setSelectedOpp(null)}>
          ← Back to Pipeline
        </button>
        
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div className="detail-avatar" style={{ background: 'var(--accent)', color: 'white' }}>
                
              </div>
              <div className="detail-info">
                <h1 className="detail-name">{selectedOpp.name}</h1>
                <div className="detail-meta">
                  {selectedOpp.account_id && selectedOpp.accounts?.account_name ? (
                    <span 
                      style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
                      onClick={() => navigate('/dashboard/accounts', { state: { openId: selectedOpp.account_id } })}
                      title="Click to view account"
                    >
                      {selectedOpp.accounts.account_name}
                    </span>
                  ) : (
                    <span>No Account</span>
                  )}
                  {` • $${Number(selectedOpp.amount).toLocaleString()}`}
                </div>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => handleOpenModal(selectedOpp)}>
              Edit Opportunity Details
            </button>
          </div>

          <div className="detail-grid">
            <div className="detail-field">
              <label>Current Stage</label>
              <span className={`badge badge-${selectedOpp.stage}`} style={{ display: 'inline-block', marginTop: 4 }}>
                {selectedOpp.stage}
              </span>
            </div>
            <div className="detail-field">
              <label>Owner</label>
              <span>{selectedOpp.owner}</span>
            </div>
            <div className="detail-field">
              <label>Expected Close</label>
              <span>{selectedOpp.closed_date ? new Date(selectedOpp.closed_date).toLocaleDateString() : 'Not Set'}</span>
            </div>
            <div className="detail-field">
              <label>Created</label>
              <span>{new Date(selectedOpp.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Interactive Pipeline Flowchart */}
          <div style={{ marginTop: 32, borderTop: '1px solid var(--border-subtle)', paddingTop: 24 }}>
            <h3 style={{ marginBottom: 16, fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pipeline Stage</h3>
            <div className="pipeline-flow">
              {STAGES.map((stage, idx) => {
                const isCompleted = idx < currentIndex
                const isActive = idx === currentIndex
                return (
                  <div key={stage} className="pipeline-stage">
                    <div 
                      className={`pipeline-stage-inner ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                      onClick={() => updateStage(stage)}
                    >
                      {stage.charAt(0).toUpperCase() + stage.slice(1)}
                    </div>
                    {idx < STAGES.length - 1 && <span className="pipeline-arrow">→</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
            Products ({oppProducts.length})
          </button>
          <button className={`tab ${activeTab === 'quotes' ? 'active' : ''}`} onClick={() => setActiveTab('quotes')}>
            Quotes ({oppQuotes.length})
          </button>
          <button className={`tab ${activeTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveTab('invoices')}>
            Invoices ({oppInvoices.length})
          </button>
          <button className={`tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
            Tasks ({oppTasks.length})
          </button>
          <button className={`tab ${activeTab === 'activities' ? 'active' : ''}`} onClick={() => setActiveTab('activities')}>
            Activities
          </button>
        </div>

        {/* Tab Content */}
        <div className="card" style={{ padding: 0 }}>
          {activeTab === 'products' && (
            <div>
              {/* Add Product Inline Form */}
              <div style={{ padding: 20, borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
                <form onSubmit={handleAddProduct} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: 2, minWidth: 200 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>Product Name</label>
                    <input className="form-input" style={{ padding: 8, fontSize: 13 }} required value={prodForm.name} onChange={e => setProdForm({...prodForm, name: e.target.value})} placeholder="e.g. Enterprise License" />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 80 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>Qty</label>
                    <input type="number" min="1" className="form-input" style={{ padding: 8, fontSize: 13 }} required value={prodForm.quantity} onChange={e => setProdForm({...prodForm, quantity: e.target.value})} />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: 100 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>Unit Price ($)</label>
                    <input type="number" min="0" step="0.01" className="form-input" style={{ padding: 8, fontSize: 13 }} required value={prodForm.unit_price} onChange={e => setProdForm({...prodForm, unit_price: e.target.value})} />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ height: 36 }}>{editingProductId ? 'Save' : '+ Add'}</button>
                  {editingProductId && <button type="button" className="btn btn-secondary btn-sm" style={{ height: 36 }} onClick={() => { setEditingProductId(null); setProdForm({ name: '', quantity: 1, unit_price: 0 }) }}>Cancel</button>}
                </form>
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr><th>Product Name</th><th>Quantity</th><th>Unit Price</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ width: 60 }}></th></tr>
                  </thead>
                  <tbody>
                    {oppProducts.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign:'center', color:'var(--text-muted)' }}>No products added</td></tr>
                    ) : (
                      oppProducts.map(p => (
                        <tr key={p.id}>
                          <td className="fw-bold">{p.name}</td>
                          <td>{p.quantity}</td>
                          <td>${Number(p.unit_price).toLocaleString()}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>${Number(p.total).toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                              <button className="btn-icon text-primary" onClick={() => {
                                setEditingProductId(p.id)
                                setEditingProductOriginalTotal(Number(p.total))
                                setProdForm({ name: p.name, quantity: p.quantity, unit_price: p.unit_price })
                              }}><Edit2 size={14}/></button>
                              {isAdmin && (
                                <button className="btn-icon text-danger" onClick={() => handleDeleteProduct(p.id, p.total)}>
                                  <Trash2 size={14}/>
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
          )}

          {activeTab === 'quotes' && (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted" style={{ fontSize: 13 }}>Quotes linked to this opportunity</span>
                <button className="btn btn-primary btn-sm" onClick={() => {
                  setEditingQuoteId(null)
                  setQuoteFormData({ quote_name: '', expires_at: '', total_price: 0 })
                  setIsQuoteModalOpen(true)
                }}><span style={{ fontSize: 16 }}>+</span> Add Quote</button>
              </div>
              <table>
                <thead>
                  <tr><th>Quote Name</th><th>Expires</th><th style={{ textAlign: 'right' }}>Total Price</th><th style={{ width: 60 }}></th></tr>
                </thead>
                <tbody>
                  {oppQuotes.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign:'center', color:'var(--text-muted)' }}>No quotes found</td></tr>
                  ) : (
                    oppQuotes.map(q => (
                      <tr key={q.id}>
                        <td className="fw-bold">{q.quote_name}</td>
                        <td>{q.expires_at ? new Date(q.expires_at).toLocaleDateString() : '-'}</td>
                        <td style={{ textAlign: 'right' }}>${Number(q.total_price).toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                            <button className="btn-icon text-primary" onClick={() => {
                              setEditingQuoteId(q.id)
                              setQuoteFormData({ quote_name: q.quote_name, expires_at: q.expires_at || '', total_price: q.total_price })
                              setIsQuoteModalOpen(true)
                            }}><Edit2 size={14}/></button>
                            {isAdmin && (
                              <button className="btn-icon text-danger" onClick={() => handleDeleteQuote(q.id, q.quote_name)}>
                                <Trash2 size={14}/>
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
          )}

          {activeTab === 'invoices' && (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted" style={{ fontSize: 13 }}>Invoices linked to this opportunity</span>
                <button className="btn btn-primary btn-sm" onClick={() => {
                  setEditingInvoiceId(null)
                  setInvoiceFormData({ invoice_name: '', status: 'draft', due_date: '', amount: 0 })
                  setIsInvoiceModalOpen(true)
                }}><span style={{ fontSize: 16 }}>+</span> Add Invoice</button>
              </div>
              <table>
                <thead>
                  <tr><th>Invoice Name</th><th>Status</th><th>Due Date</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ width: 60 }}></th></tr>
                </thead>
                <tbody>
                  {oppInvoices.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign:'center', color:'var(--text-muted)' }}>No invoices found</td></tr>
                  ) : (
                    oppInvoices.map(inv => (
                      <tr key={inv.id}>
                        <td className="fw-bold">{inv.invoice_name}</td>
                        <td><span className={`badge badge-${inv.status}`}>{inv.status}</span></td>
                        <td>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '-'}</td>
                        <td style={{ textAlign: 'right' }}>${Number(inv.amount).toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                            <button className="btn-icon text-primary" onClick={() => {
                              setEditingInvoiceId(inv.id)
                              setInvoiceFormData({ invoice_name: inv.invoice_name, status: inv.status, due_date: inv.due_date || '', amount: inv.amount })
                              setIsInvoiceModalOpen(true)
                            }}><Edit2 size={14}/></button>
                            {isAdmin && (
                              <button className="btn-icon text-danger" onClick={() => handleDeleteInvoice(inv.id, inv.invoice_name)}>
                                <Trash2 size={14}/>
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
          )}

          {activeTab === 'tasks' && (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted" style={{ fontSize: 13 }}>Tasks related to this opportunity</span>
                <button className="btn btn-primary btn-sm" onClick={() => {
                  setEditingTaskId(null)
                  setTaskFormData({ title: '', task_type: 'Call', status: 'Open', due_date: '', owner: profile?.name || session.user.email })
                  setIsTaskModalOpen(true)
                }}><span style={{ fontSize: 16 }}>+</span> Add Task</button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Task Title</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>Owner</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {oppTasks.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign:'center', color:'var(--text-muted)' }}>No tasks found</td></tr>
                  ) : (
                    oppTasks.map(task => (
                      <tr key={task.id}>
                        <td className="fw-bold">{task.title}</td>
                        <td><span className="badge badge-normal">{task.task_type}</span></td>
                        <td><span className="fw-bold" style={{ fontSize: '13px' }}>{task.status}</span></td>
                        <td>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No deadline'}</td>
                        <td>{task.owner}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                            <button className="btn-icon text-primary" onClick={() => {
                              setEditingTaskId(task.id)
                              setTaskFormData({ title: task.title, task_type: task.task_type, status: task.status, due_date: task.due_date || '', owner: task.owner })
                              setIsTaskModalOpen(true)
                            }}><Edit2 size={14}/></button>
                            {isAdmin && (
                              <button className="btn-icon text-danger" onClick={() => handleDeleteTask(task.id, task.title)}>
                                <Trash2 size={14}/>
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
          )}

          {activeTab === 'activities' && (
            <div style={{ padding: 24 }}>
              <div className="activity-list">
                {oppActs.map(a => (
                  <div key={a.id} className="activity-item">
                    <div className="activity-dot" />
                    <div className="activity-content">
                      <div className="activity-text"><strong>{a.type}</strong>: {a.description}</div>
                      <div className="activity-time">{new Date(a.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {isQuoteModalOpen && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 500 }}>
              <div className="modal-header">
                <h2 className="modal-title">{editingQuoteId ? 'Edit Quote' : 'Add New Quote'}</h2>
                <button className="modal-close" onClick={() => setIsQuoteModalOpen(false)}>✕</button>
              </div>
              <form onSubmit={handleSaveQuote}>
                <div className="form-group">
                  <label className="form-label">Quote Name</label>
                  <input required className="form-input" value={quoteFormData.quote_name} onChange={e => setQuoteFormData({...quoteFormData, quote_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Expires</label>
                  <input type="date" className="form-input" value={quoteFormData.expires_at} onChange={e => setQuoteFormData({...quoteFormData, expires_at: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Price</label>
                  <input type="number" min="0" step="0.01" className="form-input" value={quoteFormData.total_price} onChange={e => setQuoteFormData({...quoteFormData, total_price: e.target.value})} />
                </div>
                <div className="form-actions" style={{ marginTop: 24 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsQuoteModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingQuoteId ? 'Save Changes' : 'Create Quote'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isInvoiceModalOpen && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 500 }}>
              <div className="modal-header">
                <h2 className="modal-title">{editingInvoiceId ? 'Edit Invoice' : 'Add New Invoice'}</h2>
                <button className="modal-close" onClick={() => setIsInvoiceModalOpen(false)}>✕</button>
              </div>
              <form onSubmit={handleSaveInvoice}>
                <div className="form-group">
                  <label className="form-label">Invoice Name</label>
                  <input required className="form-input" value={invoiceFormData.invoice_name} onChange={e => setInvoiceFormData({...invoiceFormData, invoice_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={invoiceFormData.status} onChange={e => setInvoiceFormData({...invoiceFormData, status: e.target.value})}>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input type="date" className="form-input" value={invoiceFormData.due_date} onChange={e => setInvoiceFormData({...invoiceFormData, due_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input type="number" min="0" step="0.01" className="form-input" value={invoiceFormData.amount} onChange={e => setInvoiceFormData({...invoiceFormData, amount: e.target.value})} />
                </div>
                <div className="form-actions" style={{ marginTop: 24 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsInvoiceModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2 className="modal-title">{editingOpp ? 'Edit Opportunity' : 'New Opportunity'}</h2>
                <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label className="form-label">Deal Name *</label>
                    <input required className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Project Phoenix" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account Name</label>
                    <select className="form-input" value={formData.account_id} onChange={e => setFormData({...formData, account_id: e.target.value})}>
                      <option value="">-- No Account --</option>
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.account_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount ($)</label>
                    <input type="number" min="0" step="0.01" className="form-input" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stage</label>
                    <select className="form-input" value={formData.stage} onChange={e => setFormData({...formData, stage: e.target.value})}>
                      {STAGES.map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expected Close Date</label>
                    <input type="date" className="form-input" value={formData.closed_date} onChange={e => setFormData({...formData, closed_date: e.target.value})} />
                  </div>
                  <div className="form-group full-width">
                    <label className="form-label">Deal Owner</label>
                    <input className="form-input" value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} />
                  </div>
                </div>
                
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingOpp ? 'Save Changes' : 'Create Deal'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {isTaskModalOpen && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 500 }}>
              <div className="modal-header">
                <h2 className="modal-title">{editingTaskId ? 'Edit Task' : 'Add New Task'}</h2>
                <button className="modal-close" onClick={() => setIsTaskModalOpen(false)}>✕</button>
              </div>
              <form onSubmit={handleSaveTask}>
                <div className="form-group">
                  <label className="form-label">Task Title *</label>
                  <input required className="form-input" value={taskFormData.title} onChange={e => setTaskFormData({...taskFormData, title: e.target.value})} placeholder="e.g. Schedule follow up call" />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-input" value={taskFormData.task_type} onChange={e => setTaskFormData({...taskFormData, task_type: e.target.value})}>
                      {['Email', 'Message', 'Call', 'Demo Meeting', 'Events', 'Inperson Meeting'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-input" value={taskFormData.status} onChange={e => setTaskFormData({...taskFormData, status: e.target.value})}>
                      {['Open', 'Working', 'Pending', 'Completed'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input type="date" className="form-input" value={taskFormData.due_date} onChange={e => setTaskFormData({...taskFormData, due_date: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Owner</label>
                    <input className="form-input" value={taskFormData.owner} onChange={e => setTaskFormData({...taskFormData, owner: e.target.value})} />
                  </div>
                </div>
                <div className="form-actions" style={{ marginTop: 24 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsTaskModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingTaskId ? 'Save Changes' : 'Create Task'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }


  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Opportunities</h1>
          <p className="page-subtitle">Track, manage, and close your deals.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <span style={{ fontSize: 18 }}>+</span> Add New Deal
        </button>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">Pipeline ({opportunities.length})</h2>
          <LocalSearch 
             data={opportunities} 
             searchKeys={['name', 'stage']} 
             onSelect={(item) => setSelectedOpp(item)} 
             placeholder="Search opportunities..." 
             renderItem={(item) => (
               <>
                 <div className="fw-bold" style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.name}</div>
                 <div className="text-muted" style={{ fontSize: '11px' }}>{item.stage}</div>
               </>
             )}
          />
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Deal Name</th>
                <th>Account</th>
                <th>Amount</th>
                <th>Stage</th>
                <th>Owner</th>
                <th>Close Date</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state">
                      <div className="empty-state-icon"></div>
                      <h3>No opportunities</h3>
                      <p>Add a new deal to your pipeline to start forecasting revenue.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                opportunities.map(opp => (
                  <tr 
                    key={opp.id} 
                    className="clickable-row"
                    onClick={() => setSelectedOpp(opp)}
                  >
                    <td className="fw-bold">{opp.name}</td>
                    <td>
                      {opp.account_id && opp.accounts?.account_name ? (
                        <span 
                          style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate('/dashboard/accounts', { state: { openId: opp.account_id } })
                          }}
                          title="Click to view account"
                        >
                          {opp.accounts.account_name}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="fw-bold text-success">${Number(opp.amount).toLocaleString()}</td>
                    <td>
                      <span className={`badge badge-${opp.stage}`}>{opp.stage}</span>
                    </td>
                    <td>{opp.owner}</td>
                    <td className="text-muted">{opp.closed_date ? new Date(opp.closed_date).toLocaleDateString() : 'N/A'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: '6px' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingOpp(opp)
                            setFormData({
                              name: opp.name,
                              account_id: opp.account_id || '',
                              stage: opp.stage,
                              amount: opp.amount,
                              owner: opp.owner || '',
                              closed_date: opp.closed_date || ''
                            })
                            setIsModalOpen(true)
                          }}
                          title="Edit Opportunity"
                        >
                          <Edit2 size={14} />
                        </button>
                        {isAdmin && (
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ padding: '6px', color: 'var(--danger)' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteOpportunity(opp.id, opp.name)
                            }}
                            title="Delete Opportunity"
                          >
                            <Trash2 size={14} />
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
              <h2 className="modal-title">{editingOpp ? 'Edit Opportunity' : 'New Opportunity'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Deal Name *</label>
                  <input required className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Project Phoenix" />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Name</label>
                  <select className="form-input" value={formData.account_id} onChange={e => setFormData({...formData, account_id: e.target.value})}>
                    <option value="">-- No Account --</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.account_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount ($)</label>
                  <input type="number" min="0" step="0.01" className="form-input" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Stage</label>
                  <select className="form-input" value={formData.stage} onChange={e => setFormData({...formData, stage: e.target.value})}>
                    {STAGES.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Expected Close Date</label>
                  <input type="date" className="form-input" value={formData.closed_date} onChange={e => setFormData({...formData, closed_date: e.target.value})} />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Deal Owner</label>
                  <input className="form-input" value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} />
                </div>
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingOpp ? 'Save Changes' : 'Create Deal'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
