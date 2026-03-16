import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Trash2, Edit2 } from 'lucide-react'
import LocalSearch from '../ui/LocalSearch'

export default function Tickets({ session, profile }) {
  const [tickets, setTickets] = useState([])
  const [contacts, setContacts] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [accSearch, setAccSearch] = useState('')
  const [showAccResults, setShowAccResults] = useState(false)
  const accRef = useRef(null)
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    subject: '', priority: 'medium', status: 'open', owner: '', contact_id: '', account_id: '', description: ''
  })
  const [editingTicket, setEditingTicket] = useState(null)

  useEffect(() => {
    fetchData()
  }, [session])

  useEffect(() => {
    function handleClickOutside(event) {
      if (accRef.current && !accRef.current.contains(event.target)) {
        setShowAccResults(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [accRef])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [ticketsRes, contactsRes, accountsRes] = await Promise.all([
        supabase
          .from('tickets')
          .select('*, contacts(name, account_id, accounts(account_name))')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('contacts')
          .select('id, name, account_id')
          .eq('user_id', session.user.id)
          .order('name'),
        supabase
          .from('accounts')
          .select('id, account_name')
          .eq('user_id', session.user.id)
          .order('account_name')
      ])
      
      setTickets(ticketsRes.data || [])
      setContacts(contactsRes.data || [])
      setAccounts(accountsRes.data || [])
    } catch (error) {
      toast.error('Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (ticket = null) => {
    if (ticket) {
      setEditingTicket(ticket)
      setFormData({
        subject: ticket.subject,
        priority: ticket.priority,
        status: ticket.status,
        owner: ticket.owner || '',
        contact_id: ticket.contact_id || '',
        account_id: ticket.account_id || '',
        description: ''
      })
      setAccSearch('')
    } else {
      setEditingTicket(null)
      setFormData({
        subject: '', priority: 'medium', status: 'open',
        owner: profile?.name || session.user.email, contact_id: '', account_id: '',
        description: ''
      })
      setAccSearch('')
    }
    setIsModalOpen(true)
  }

  const handleSelectTicket = (ticket) => {
    const el = document.getElementById(`ticket-row-${ticket.id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.style.transition = 'background-color 0.5s'
      el.style.backgroundColor = 'var(--bg-card-hover)'
      setTimeout(() => { el.style.backgroundColor = '' }, 2000)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingTicket ? 'Updating ticket...' : 'Creating ticket...')
    
    try {
      if (editingTicket) {
        const { error } = await supabase
          .from('tickets')
          .update({ 
            subject: formData.subject,
            priority: formData.priority,
            status: formData.status,
            owner: formData.owner,
            contact_id: formData.contact_id || null,
            account_id: formData.account_id || null,
            description: formData.description
          })
          .eq('id', editingTicket.id)
          
        if (error) throw error

        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'Ticket Updated',
          description: `${profile?.name || session.user.email} updated ticket: ${formData.subject}`
        }])
        
        toast.success('Ticket updated', { id: toastId })
      } else {
        const { error } = await supabase
          .from('tickets')
          .insert([{ 
            ...formData, 
            contact_id: formData.contact_id || null,
            account_id: formData.account_id || null,
            user_id: session.user.id 
          }])
          
        if (error) throw error

        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'Ticket Created',
          description: `${profile?.name || session.user.email} opened issue: ${formData.subject}`
        }])
        
        toast.success('Ticket created', { id: toastId })
      }
      
      setIsModalOpen(false)
      setEditingTicket(null)
      fetchData()
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', id)
        
      if (error) throw error
      toast.success(`Ticket marked as ${newStatus}`)
      
      const ticket = tickets.find(t => t.id === id)
      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Ticket Status Updated',
        description: `${profile?.name || session.user.email} changed status of ticket "${ticket ? ticket.subject : id}" to ${newStatus}`
      }])
      
      fetchData()
    } catch (error) {
      toast.error('Failed to update ticket')
    }
  }

  const handlePriorityChange = async (id, newPriority) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ priority: newPriority })
        .eq('id', id)
        
      const ticket = tickets.find(t => t.id === id)
      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Ticket Priority Updated',
        description: `${profile?.name || session.user.email} changed priority of ticket "${ticket ? ticket.subject : id}" to ${newPriority}`
      }])
      
      toast.success('Priority updated')
      fetchData()
    } catch (error) {
      toast.error('Failed to update ticket')
    }
  }

  const handleDeleteTicket = async (id, subject) => {
    if (!window.confirm(`Are you sure you want to delete ticket "${subject}"?`)) return
    const toastId = toast.loading('Deleting ticket...')
    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Ticket Deleted',
        description: `${profile?.name || session.user.email} deleted ticket: ${subject}`
      }])
      
      toast.success('Ticket deleted', { id: toastId })
      fetchData()
    } catch (error) {
      toast.error(`Error deleting ticket: ${error.message}`, { id: toastId })
    }
  }

  if (loading) return <div className="loading-container"><div className="spinner"/></div>
  
  const isAdmin = ['admin', 'administrator'].includes(profile?.role?.toLowerCase())

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Support Tickets</h1>
          <p className="page-subtitle">Track and resolve customer issues.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <span style={{ fontSize: 18 }}>+</span> Create Ticket
        </button>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">All Tickets ({tickets.length})</h2>
          <LocalSearch 
             data={tickets} 
             searchKeys={['subject', 'ticket_no']} 
             onSelect={(item) => handleSelectTicket(item)} 
             placeholder="Search tickets..." 
             renderItem={(item) => (
               <>
                 <div className="fw-bold" style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.subject}</div>
                 <div className="text-muted" style={{ fontSize: '11px' }}>{item.ticket_no}</div>
               </>
             )}
          />
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Ticket No.</th>
                <th>Subject</th>
                <th>Description</th>
                <th>Contact</th>
                <th>Account</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Date/Time</th>
                <th style={{ width: 70 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan="9">
                    <div className="empty-state">
                      <div className="empty-state-icon"></div>
                      <h3>No support tickets</h3>
                      <p>All clear! Create a ticket to log customer inquiries.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tickets.map(ticket => (
                  <tr key={ticket.id} id={`ticket-row-${ticket.id}`}>
                    <td className="font-mono text-muted">{ticket.ticket_no}</td>
                    <td className="fw-bold">{ticket.subject}</td>
                    <td className="text-muted" style={{ fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ticket.description}>
                      {ticket.description || '-'}
                    </td>
                    <td>{ticket.contacts?.name || '-'}</td>
                    <td>
                      {ticket.contacts?.account_id && ticket.contacts?.accounts?.account_name ? (
                        <span 
                          style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate('/dashboard/accounts', { state: { openId: ticket.contacts.account_id } })
                          }}
                          title="Click to view account"
                        >
                          {ticket.contacts.accounts.account_name}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <select 
                        value={ticket.priority} 
                        onChange={(e) => handlePriorityChange(ticket.id, e.target.value)}
                        className={`badge badge-${ticket.priority}`}
                        style={{ border: 'none', fontWeight: 600, appearance: 'none', paddingRight: 16 }}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </td>
                    <td>
                      <select 
                        value={ticket.status} 
                        onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                        className={`badge badge-${ticket.status}`}
                        style={{ border: 'none', fontWeight: 600, appearance: 'none', paddingRight: 16 }}
                      >
                        <option value="open">Open</option>
                        <option value="pending">Pending</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                    <td>{ticket.owner}</td>
                    <td className="text-muted">
                      {new Date(ticket.created_at).toLocaleDateString()} {new Date(ticket.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '6px' }}
                          onClick={() => handleOpenModal(ticket)}
                          title="Edit Ticket"
                        >
                          <Edit2 size={14} />
                        </button>
                        {isAdmin && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '6px', color: 'var(--danger)' }}
                            onClick={() => handleDeleteTicket(ticket.id, ticket.subject)}
                            title="Delete Ticket"
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
              <h2 className="modal-title">{editingTicket ? 'Edit Ticket' : 'Create Support Ticket'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Subject *</label>
                  <input required className="form-input" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} placeholder="Cannot access billing page" />
                </div>
                <div className="form-group" style={{ position: 'relative' }} ref={accRef}>
                  <label className="form-label">Related Account</label>
                  <input 
                    className="form-input"
                    placeholder="Search accounts..."
                    value={accSearch || (formData.account_id ? accounts.find(a => a.id === formData.account_id)?.account_name : '') || ''}
                    onChange={(e) => {
                      setAccSearch(e.target.value)
                      setShowAccResults(true)
                      if (!e.target.value) {
                        setFormData(prev => ({ ...prev, account_id: '', contact_id: '' }))
                      }
                    }}
                    onFocus={() => setShowAccResults(true)}
                  />
                  {showAccResults && (
                    <div className="search-dropdown dropdown-animation" style={{ top: '100%', left: 0, right: 0, minWidth: '100%', maxHeight: '200px' }}>
                      <div className="search-results-list">
                        <div 
                          className="search-result-item clickable-row" 
                          onClick={() => {
                            setFormData(prev => ({ ...prev, account_id: '', contact_id: '' }))
                            setAccSearch('')
                            setShowAccResults(false)
                          }}
                          style={{ padding: '8px 12px', color: 'var(--text-muted)' }}
                        >
                          -- No Account --
                        </div>
                        {accounts
                          .filter(acc => !accSearch || acc.account_name.toLowerCase().includes(accSearch.toLowerCase()))
                          .map(acc => (
                            <div 
                              key={acc.id} 
                              className="search-result-item clickable-row" 
                              onClick={() => {
                                setFormData(prev => ({ 
                                  ...prev, 
                                  account_id: acc.id,
                                  contact_id: contacts.find(c => c.id === prev.contact_id)?.account_id !== acc.id ? '' : prev.contact_id
                                }))
                                setAccSearch(acc.account_name)
                                setShowAccResults(false)
                              }}
                              style={{ padding: '8px 12px' }}
                            >
                              {acc.account_name}
                            </div>
                          ))
                        }
                        {accSearch && accounts.filter(acc => acc.account_name.toLowerCase().includes(accSearch.toLowerCase())).length === 0 && (
                          <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>No accounts found.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Related Contact</label>
                  <select className="form-input" value={formData.contact_id} onChange={e => setFormData({...formData, contact_id: e.target.value})}>
                    <option value="">-- No Contact --</option>
                    {contacts
                      .filter(c => !formData.account_id || c.account_id === formData.account_id)
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))
                    }
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Owner</label>
                  <input className="form-input" value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-input" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Initial Status</label>
                  <select className="form-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Description</label>
                  <textarea 
                    className="form-input" 
                    rows="3" 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    placeholder="Provide more details about the issue..."
                    style={{ resize: 'vertical' }}
                  ></textarea>
                </div>
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setIsModalOpen(false); setEditingTicket(null) }}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingTicket ? 'Save Changes' : 'Create Ticket'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
