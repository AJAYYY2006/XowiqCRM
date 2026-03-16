import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Trash2, Edit2 } from 'lucide-react'
import LocalSearch from '../ui/LocalSearch'

export default function Quotes({ session }) {
  const [quotes, setQuotes] = useState([])
  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    quote_name: '', opportunity_id: '', expires_at: '', total_price: 0
  })
  const [editingQuote, setEditingQuote] = useState(null)

  useEffect(() => {
    fetchData()
  }, [session])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [quotesRes, oppsRes] = await Promise.all([
        supabase
          .from('quotes')
          .select('*, opportunities(name, account_id, accounts(account_name))')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('opportunities')
          .select('id, name')
          .eq('user_id', session.user.id)
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
      setFormData({
        quote_name: quote.quote_name,
        opportunity_id: quote.opportunity_id || '',
        expires_at: quote.expires_at || '',
        total_price: quote.total_price || 0
      })
    } else {
      setEditingQuote(null)
      setFormData({
        quote_name: '', opportunity_id: '', expires_at: '', total_price: 0
      })
    }
    setIsModalOpen(true)
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
    const toastId = toast.loading(editingQuote ? 'Updating quote...' : 'Creating quote...')
    
    try {
      if (editingQuote) {
        const { error } = await supabase
          .from('quotes')
          .update({ 
            quote_name: formData.quote_name,
            opportunity_id: formData.opportunity_id || null,
            expires_at: formData.expires_at || null,
            total_price: formData.total_price
          })
          .eq('id', editingQuote.id)
          
        if (error) throw error

        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'Quote Updated',
          description: `${session.user.email} updated quote: ${formData.quote_name}`
        }])
        
        toast.success('Quote updated', { id: toastId })
      } else {
        const { error } = await supabase
          .from('quotes')
          .insert([{ 
            ...formData, 
            opportunity_id: formData.opportunity_id || null,
            expires_at: formData.expires_at || null,
            user_id: session.user.id 
          }])
          
        if (error) throw error

        const opp = formData.opportunity_id ? (opportunities?.find(o => o.id === formData.opportunity_id) || null) : null
        const oppStr = opp ? ` for opportunity ${opp.name}` : ''
        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'New Quote',
          description: `${session.user.email} created quote: ${formData.quote_name}${oppStr}`
        }])
        
        toast.success('Quote created', { id: toastId })
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

      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Quote Deleted',
        description: `${session.user.email} deleted quote: ${quote.quote_name}`
      }])

      toast.success('Quote deleted', { id: toastId })
      fetchData()
    } catch (error) {
      toast.error('Failed to delete quote: ' + error.message, { id: toastId })
    }
  }

  if (loading) return <div className="loading-container"><div className="spinner"/></div>
  
  const isAdmin = ['admin', 'administrator'].includes(profile?.role?.toLowerCase())

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Quotes</h1>
          <p className="page-subtitle">Generate pricing estimates for your deals.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <span style={{ fontSize: 18 }}>+</span> Create Quote
        </button>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">All Quotes ({quotes.length})</h2>
          <LocalSearch 
             data={quotes} 
             searchKeys={['quote_name']} 
             onSelect={(item) => handleSelectQuote(item)} 
             placeholder="Search quotes..." 
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
                    <td>{quote.opportunities?.name || '-'}</td>
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
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editingQuote ? 'Edit Quote' : 'Create New Quote'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Quote Name *</label>
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
                  <label className="form-label">Total Price ($)</label>
                  <input type="number" min="0" step="0.01" className="form-input" value={formData.total_price} onChange={e => setFormData({...formData, total_price: e.target.value})} />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Expires At</label>
                  <input type="date" className="form-input" value={formData.expires_at} onChange={e => setFormData({...formData, expires_at: e.target.value})} />
                </div>
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setIsModalOpen(false); setEditingQuote(null) }}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingQuote ? 'Save Changes' : 'Create Quote'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
