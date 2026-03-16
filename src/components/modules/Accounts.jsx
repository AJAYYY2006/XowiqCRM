import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Trash2, Edit2 } from 'lucide-react'
import LocalSearch from '../ui/LocalSearch'

export default function Accounts({ session, profile }) {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [editingAccount, setEditingAccount] = useState(null)
  const [activeTab, setActiveTab] = useState('contacts')
  const location = useLocation()
  
  // Account Detail Data
  const [accContacts, setAccContacts] = useState([])
  const [accOpps, setAccOpps] = useState([])
  const [accActs, setAccActs] = useState([])
  const [accTickets, setAccTickets] = useState([])
  const [accTasks, setAccTasks] = useState([])

  // Form State
  const [formData, setFormData] = useState({
    account_name: '', domain: '', account_owner: '', status: 'active'
  })

  // Nested Creation States
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [contactFormData, setContactFormData] = useState({ name: '', email: '', phone: '' })
  const [editingContactId, setEditingContactId] = useState(null)

  const [isOppModalOpen, setIsOppModalOpen] = useState(false)
  const [oppFormData, setOppFormData] = useState({ name: '', stage: 'prospecting', amount: 0, closed_date: '' })
  const [editingOppId, setEditingOppId] = useState(null)

  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false)
  const [ticketFormData, setTicketFormData] = useState({ subject: '', priority: 'medium', status: 'open' })
  const [editingTicketId, setEditingTicketId] = useState(null)

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [taskFormData, setTaskFormData] = useState({ title: '', task_type: 'Call', status: 'Open', due_date: '', owner: '' })
  const [editingTaskId, setEditingTaskId] = useState(null)

  useEffect(() => {
    fetchAccounts()
  }, [session])

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
  }, [selectedAccount])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setAccounts(data || [])
    } catch (error) {
      toast.error('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  const fetchAccountDetails = async (id, accName) => {
    const { data: cData } = await supabase.from('contacts').select('*').eq('account_id', id)
    const { data: oData } = await supabase.from('opportunities').select('*').eq('account_id', id)
    const { data: tskData } = await supabase.from('tasks').select('*').eq('related_to', 'accounts').eq('related_id', id)
    
    let tData = []
    if (cData && cData.length > 0) {
      const cIds = cData.map(c => c.id)
      const { data } = await supabase.from('tickets').select('*').in('contact_id', cIds)
      tData = data || []
    }
    
    const { data: aData } = await supabase.from('activities').select('*').eq('user_id', session.user.id)
    
    const nameLower = (accName || '').toLowerCase()
    const filteredActs = (aData || []).filter(a => {
      if (!a.description) return false
      const d = a.description.toLowerCase()
      if (nameLower && d.includes(nameLower)) return true
      if (cData?.some(c => c.name && d.includes(c.name.toLowerCase()))) return true
      if (oData?.some(o => o.name && d.includes(o.name.toLowerCase()))) return true
      if (tData?.some(t => t.subject && d.includes(t.subject.toLowerCase()))) return true
      return false
    })

    setAccContacts(cData || [])
    setAccOpps(oData || [])
    setAccTickets(tData || [])
    setAccTasks(tskData || [])
    setAccActs(filteredActs.sort((x, y) => new Date(y.created_at) - new Date(x.created_at)))
  }

  const handleOpenModal = (account = null) => {
    if (account) {
      setEditingAccount(account)
      setFormData({
        account_name: account.account_name, 
        domain: account.domain || '', 
        account_owner: account.account_owner || '', 
        status: account.status
      })
    } else {
      setEditingAccount(null)
      setFormData({
        account_name: '', domain: '', 
        account_owner: profile?.name || session.user.email, status: 'active'
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingAccount ? 'Updating account...' : 'Adding account...')
    
    try {
      if (editingAccount) {
        const { error } = await supabase
          .from('accounts')
          .update(formData)
          .eq('id', editingAccount.id)
        if (error) throw error
        toast.success('Account updated', { id: toastId })
      } else {
        const { error } = await supabase
          .from('accounts')
          .insert([{ ...formData, user_id: session.user.id }])
        if (error) throw error

        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'New Account',
          description: `Created account: ${formData.account_name}`
        }])
        toast.success('Account added', { id: toastId })
      }
      
      setIsModalOpen(false)
      fetchAccounts()
      if (selectedAccount && editingAccount && selectedAccount.id === editingAccount.id) {
        const updated = { ...selectedAccount, ...formData }
        setSelectedAccount(updated)
        fetchAccountDetails(updated.id, updated.account_name)
      }
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleDeleteAccount = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete account "${name}"? This will NOT delete associated records (RLS permitting).`)) return
    const toastId = toast.loading('Deleting account...')
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Account Deleted',
        description: `Deleted account: ${name}`
      }])
      
      toast.success('Account deleted', { id: toastId })
      fetchAccounts()
    } catch (error) {
      toast.error(`Error deleting account: ${error.message}`, { id: toastId })
    }
  }

  const handleSaveContact = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingContactId ? 'Updating contact...' : 'Creating contact...')
    try {
      if (editingContactId) {
        const { error } = await supabase.from('contacts').update({
          name: contactFormData.name,
          email: contactFormData.email,
          phone: contactFormData.phone
        }).eq('id', editingContactId)
        if (error) throw error
        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'Contact Updated',
          description: `${profile?.name || session.user.email} updated contact ${contactFormData.name} for ${selectedAccount.account_name}`
        }])
        toast.success('Contact updated', { id: toastId })
      } else {
        const { error } = await supabase.from('contacts').insert([{
          ...contactFormData,
          unique_id: `CON-${Math.floor(Math.random() * 10000)}`,
          account_id: selectedAccount.id,
          contact_owner: profile?.name || session.user.email,
          user_id: session.user.id
        }])
        if (error) throw error
        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'Contact Added',
          description: `${profile?.name || session.user.email} added contact ${contactFormData.name} to ${selectedAccount.account_name}`
        }])
        toast.success('Contact created', { id: toastId })
      }
      setIsContactModalOpen(false)
      setContactFormData({ name: '', email: '', phone: '' })
      setEditingContactId(null)
      fetchAccountDetails(selectedAccount.id, selectedAccount.account_name)
    } catch (err) {
      toast.error(err.message, { id: toastId })
    }
  }

  const handleSaveOpp = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingOppId ? 'Updating opportunity...' : 'Creating opportunity...')
    try {
      if (editingOppId) {
        const { error } = await supabase.from('opportunities').update({
          name: oppFormData.name,
          amount: oppFormData.amount,
          stage: oppFormData.stage,
          closed_date: oppFormData.closed_date
        }).eq('id', editingOppId)
        if (error) throw error
        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'Opportunity Updated',
          description: `${profile?.name || session.user.email} updated opportunity ${oppFormData.name} for ${selectedAccount.account_name}`
        }])
        toast.success('Opportunity updated', { id: toastId })
      } else {
        const { error } = await supabase.from('opportunities').insert([{
          ...oppFormData,
          account_id: selectedAccount.id,
          owner: profile?.name || session.user.email,
          user_id: session.user.id
        }])
        if (error) throw error
        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'Opportunity Created',
          description: `${profile?.name || session.user.email} created opportunity ${oppFormData.name} for ${selectedAccount.account_name}`
        }])
        toast.success('Opportunity created', { id: toastId })
      }
      setIsOppModalOpen(false)
      setOppFormData({ name: '', stage: 'prospecting', amount: 0, closed_date: '' })
      setEditingOppId(null)
      fetchAccountDetails(selectedAccount.id, selectedAccount.account_name)
    } catch (err) {
      toast.error(err.message, { id: toastId })
    }
  }

  const handleSaveTicket = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingTicketId ? 'Updating ticket...' : 'Creating ticket...')
    try {
      if (editingTicketId) {
        const { error } = await supabase.from('tickets').update({
          subject: ticketFormData.subject,
          priority: ticketFormData.priority,
          status: ticketFormData.status
        }).eq('id', editingTicketId)
        if (error) throw error
        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'Ticket Updated',
          description: `${profile?.name || session.user.email} updated ticket ${ticketFormData.subject} for ${selectedAccount.account_name}`
        }])
        toast.success('Ticket updated', { id: toastId })
      } else {
        const ticket_no = `TKT-${Math.floor(Math.random() * 10000)}`
        const fallbackContact = accContacts.length > 0 ? accContacts[0].id : null
        const { error } = await supabase.from('tickets').insert([{
          ...ticketFormData,
          ticket_no,
          contact_id: fallbackContact,
          owner: profile?.name || session.user.email,
          user_id: session.user.id
        }])
        if (error) throw error
        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'Ticket Created',
          description: `${profile?.name || session.user.email} created ticket ${ticketFormData.subject} for ${selectedAccount.account_name}`
        }])
        toast.success('Ticket created', { id: toastId })
      }
      setIsTicketModalOpen(false)
      setTicketFormData({ subject: '', priority: 'medium', status: 'open' })
      setEditingTicketId(null)
      fetchAccountDetails(selectedAccount.id, selectedAccount.account_name)
    } catch (err) {
      toast.error(err.message, { id: toastId })
    }
  }

  const handleSaveTask = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingTaskId ? 'Updating task...' : 'Creating task...')
    try {
      const taskData = {
        ...taskFormData,
        related_to: 'accounts',
        related_id: selectedAccount.id,
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
      fetchAccountDetails(selectedAccount.id, selectedAccount.account_name)
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
      fetchAccountDetails(selectedAccount.id, selectedAccount.account_name)
      toast.success('Task deleted', { id: toastId })
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  if (loading) return <div className="loading-container"><div className="spinner"/></div>
  
  const isAdmin = ['admin', 'administrator'].includes(profile?.role?.toLowerCase())

  if (selectedAccount) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button className="back-btn" onClick={() => setSelectedAccount(null)} style={{ margin: 0 }}>
            ← Back to Accounts
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => handleOpenModal(selectedAccount)}>
            Edit Account Details
          </button>
        </div>
        
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="detail-header">
            <div className="detail-avatar" style={{ background: '#3b82f6', color: 'white' }}>
              {selectedAccount.account_name.charAt(0).toUpperCase()}
            </div>
            <div className="detail-info">
              <h1 className="detail-name">{selectedAccount.account_name}</h1>
              <div className="detail-meta">{selectedAccount.domain || 'No domain'}</div>
              <div className={`badge badge-${selectedAccount.status} mt-2`}>{selectedAccount.status}</div>
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-field">
              <label>Account Owner</label>
              <span>{selectedAccount.account_owner}</span>
            </div>
            <div className="detail-field">
              <label>Created Date</label>
              <span>{new Date(selectedAccount.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${activeTab === 'contacts' ? 'active' : ''}`} onClick={() => setActiveTab('contacts')}>
            Contacts ({accContacts.length})
          </button>
          <button className={`tab ${activeTab === 'opportunities' ? 'active' : ''}`} onClick={() => setActiveTab('opportunities')}>
            Opportunities ({accOpps.length})
          </button>
          <button className={`tab ${activeTab === 'tickets' ? 'active' : ''}`} onClick={() => setActiveTab('tickets')}>
            Tickets
          </button>
          <button className={`tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
            Tasks ({accTasks.length})
          </button>
          <button className={`tab ${activeTab === 'activities' ? 'active' : ''}`} onClick={() => setActiveTab('activities')}>
            Activities
          </button>
        </div>

        {/* Tab Content */}
        <div className="card" style={{ padding: 0 }}>
          {activeTab === 'contacts' && (
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '15px' }}>Contacts List</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setIsContactModalOpen(true)}>+ New Contact</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Phone</th><th></th></tr>
                  </thead>
                <tbody>
                  {accContacts.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign:'center', color:'var(--text-muted)' }}>No contacts found</td></tr>
                  ) : (
                    accContacts.map(c => (
                      <tr key={c.id}>
                        <td className="fw-bold">{c.name}</td>
                        <td>{c.email || '-'}</td>
                        <td>{c.phone || '-'}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <button className="btn btn-secondary btn-sm" onClick={() => {
                            setEditingContactId(c.id)
                            setContactFormData({ name: c.name, email: c.email || '', phone: c.phone || '' })
                            setIsContactModalOpen(true)
                          }}>Edit</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {isContactModalOpen && (
              <div className="modal-overlay">
                <div className="modal">
                  <div className="modal-header">
                    <h2 className="modal-title">{editingContactId ? 'Edit Contact' : `Add Contact to ${selectedAccount.account_name}`}</h2>
                    <button className="modal-close" onClick={() => setIsContactModalOpen(false)}>✕</button>
                  </div>
                  <form onSubmit={handleSaveContact}>
                    <div className="form-grid">
                      <div className="form-group full-width">
                        <label className="form-label">Contact Name *</label>
                        <input required className="form-input" value={contactFormData.name} onChange={e => setContactFormData({...contactFormData, name: e.target.value})} placeholder="John Doe" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email</label>
                        <input type="email" className="form-input" value={contactFormData.email} onChange={e => setContactFormData({...contactFormData, email: e.target.value})} placeholder="john@example.com" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Phone</label>
                        <input className="form-input" value={contactFormData.phone} onChange={e => setContactFormData({...contactFormData, phone: e.target.value})} placeholder="555-1234" />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => setIsContactModalOpen(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary">{editingContactId ? 'Save Contact' : 'Create Contact'}</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            </div>
          )}

          {activeTab === 'opportunities' && (
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '15px' }}>Opportunities List</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setIsOppModalOpen(true)}>+ New Opportunity</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr><th>Name</th><th>Stage</th><th>Amount</th><th>Close Date</th><th></th></tr>
                  </thead>
                <tbody>
                  {accOpps.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign:'center', color:'var(--text-muted)' }}>No opportunities found</td></tr>
                  ) : (
                    accOpps.map(o => (
                      <tr key={o.id}>
                        <td className="fw-bold">{o.name}</td>
                        <td><span className={`badge badge-${o.stage}`}>{o.stage}</span></td>
                        <td>${Number(o.amount).toLocaleString()}</td>
                        <td>{new Date(o.closed_date).toLocaleDateString() || '-'}</td>
                        <td onClick={e => e.stopPropagation()}>
                          <button className="btn btn-secondary btn-sm" onClick={() => {
                            setEditingOppId(o.id)
                            setOppFormData({ name: o.name, amount: o.amount, stage: o.stage, closed_date: o.closed_date || '' })
                            setIsOppModalOpen(true)
                          }}>Edit</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {isOppModalOpen && (
              <div className="modal-overlay">
                <div className="modal">
                  <div className="modal-header">
                    <h2 className="modal-title">{editingOppId ? 'Edit Opportunity' : `Add Opportunity for ${selectedAccount.account_name}`}</h2>
                    <button className="modal-close" onClick={() => setIsOppModalOpen(false)}>✕</button>
                  </div>
                  <form onSubmit={handleSaveOpp}>
                    <div className="form-grid">
                      <div className="form-group full-width">
                        <label className="form-label">Opportunity Name *</label>
                        <input required className="form-input" value={oppFormData.name} onChange={e => setOppFormData({...oppFormData, name: e.target.value})} placeholder="Q3 Upsell" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Amount ($)</label>
                        <input type="number" className="form-input" value={oppFormData.amount} onChange={e => setOppFormData({...oppFormData, amount: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Stage</label>
                        <select className="form-input" value={oppFormData.stage} onChange={e => setOppFormData({...oppFormData, stage: e.target.value})}>
                          <option value="prospecting">Prospecting</option>
                          <option value="scoping">Scoping</option>
                          <option value="negotiation">Negotiation</option>
                          <option value="legal">Legal</option>
                          <option value="contract">Contract</option>
                          <option value="closed">Closed (Won)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Close Date</label>
                        <input type="date" required className="form-input" value={oppFormData.closed_date} onChange={e => setOppFormData({...oppFormData, closed_date: e.target.value})} />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => setIsOppModalOpen(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary">{editingOppId ? 'Save Opportunity' : 'Create Opportunity'}</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            </div>
          )}

          {activeTab === 'tickets' && (
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '15px' }}>Support Tickets</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setIsTicketModalOpen(true)}>+ New Ticket</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr><th>Ticket #</th><th>Subject</th><th>Status</th><th>Priority</th><th></th></tr>
                  </thead>
                <tbody>
                  {accTickets.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign:'center', color:'var(--text-muted)' }}>No tickets found</td></tr>
                  ) : (
                    accTickets.map(t => (
                      <tr key={t.id}>
                        <td className="font-mono">{t.ticket_no}</td>
                        <td className="fw-bold">{t.subject}</td>
                        <td><span className={`badge badge-${t.status}`}>{t.status}</span></td>
                        <td><span className={`badge badge-${t.priority}`}>{t.priority}</span></td>
                        <td onClick={e => e.stopPropagation()}>
                          <button className="btn btn-secondary btn-sm" onClick={() => {
                            setEditingTicketId(t.id)
                            setTicketFormData({ subject: t.subject, priority: t.priority, status: t.status })
                            setIsTicketModalOpen(true)
                          }}>Edit</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {isTicketModalOpen && (
              <div className="modal-overlay">
                <div className="modal">
                  <div className="modal-header">
                    <h2 className="modal-title">{editingTicketId ? 'Edit Support Ticket' : 'Add Support Ticket'}</h2>
                    <button className="modal-close" onClick={() => setIsTicketModalOpen(false)}>✕</button>
                  </div>
                  <form onSubmit={handleSaveTicket}>
                    <div className="form-grid">
                      <div className="form-group full-width">
                        <label className="form-label">Subject *</label>
                        <input required className="form-input" value={ticketFormData.subject} onChange={e => setTicketFormData({...ticketFormData, subject: e.target.value})} placeholder="Login issue" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Priority</label>
                        <select className="form-input" value={ticketFormData.priority} onChange={e => setTicketFormData({...ticketFormData, priority: e.target.value})}>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Status</label>
                        <select className="form-input" value={ticketFormData.status} onChange={e => setTicketFormData({...ticketFormData, status: e.target.value})}>
                          <option value="open">Open</option>
                          <option value="pending">Pending</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>
                    {accContacts.length === 0 && !editingTicketId && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: 12 }}>
                        Warning: This account has no contacts. Ticket cannot be easily linked back to this account later unless a contact exists. Add a contact first if possible.
                      </div>
                    )}
                    <div className="form-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => setIsTicketModalOpen(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary">{editingTicketId ? 'Save Ticket' : 'Create Ticket'}</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            </div>
          )}

          {activeTab === 'tasks' && (
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '15px' }}>Tasks List</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  setEditingTaskId(null)
                  setTaskFormData({ title: '', task_type: 'Call', status: 'Open', due_date: '', owner: profile?.name || session.user.email })
                  setIsTaskModalOpen(true)
                }}>+ New Task</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr><th>Title</th><th>Type</th><th>Status</th><th>Due Date</th><th>Owner</th><th></th></tr>
                  </thead>
                  <tbody>
                    {accTasks.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign:'center', color:'var(--text-muted)' }}>No tasks found</td></tr>
                    ) : (
                      accTasks.map(t => (
                        <tr key={t.id}>
                          <td className="fw-bold">{t.title}</td>
                          <td><span className="badge badge-normal">{t.task_type}</span></td>
                          <td><span className="fw-bold" style={{ fontSize: '13px' }}>{t.status}</span></td>
                          <td>{t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No deadline'}</td>
                          <td>{t.owner}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                              <button className="btn-icon text-primary" onClick={() => {
                                setEditingTaskId(t.id)
                                setTaskFormData({ title: t.title, task_type: t.task_type, status: t.status, due_date: t.due_date || '', owner: t.owner })
                                setIsTaskModalOpen(true)
                              }}><Edit2 size={14}/></button>
                              {isAdmin && (
                                <button className="btn-icon text-danger" onClick={() => handleDeleteTask(t.id, t.title)}>
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

          {activeTab === 'activities' && (
            <div style={{ padding: 24 }}>
              {accActs.length === 0 ? (
                <div style={{ textAlign:'center', color:'var(--text-muted)', fontStyle: 'italic' }}>No activities found relating to {selectedAccount.account_name}</div>
              ) : (
                <div className="activity-list">
                  {accActs.map(a => (
                    <div key={a.id} className="activity-item">
                      <div className="activity-dot" />
                      <div className="activity-content">
                        <div className="activity-text"><strong>{a.type}</strong>: {a.description}</div>
                        <div className="activity-time">{new Date(a.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

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

        {isModalOpen && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2 className="modal-title">{editingAccount ? 'Edit Account' : 'Add New Account'}</h2>
                <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label className="form-label">Account Name *</label>
                    <input required className="form-input" value={formData.account_name} onChange={e => setFormData({...formData, account_name: e.target.value})} placeholder="Acme Corp" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Domain Name</label>
                    <input className="form-input" value={formData.domain} onChange={e => setFormData({...formData, domain: e.target.value})} placeholder="acme.com" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="prospect">Prospect</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account Owner</label>
                    <input className="form-input" value={formData.account_owner} onChange={e => setFormData({...formData, account_owner: e.target.value})} />
                  </div>
                </div>
                
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingAccount ? 'Save Changes' : 'Create Account'}</button>
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
          <h1 className="page-title">Accounts</h1>
          <p className="page-subtitle">Manage companies and organizations.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <span style={{ fontSize: 18 }}>+</span> Add New Account
        </button>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">All Accounts ({accounts.length})</h2>
          <LocalSearch 
             data={accounts} 
             searchKeys={['account_name', 'domain']} 
             onSelect={(item) => setSelectedAccount(item)} 
             placeholder="Search accounts..." 
             renderItem={(item) => (
               <>
                 <div className="fw-bold" style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.account_name}</div>
                 <div className="text-muted" style={{ fontSize: '11px' }}>{item.domain}</div>
               </>
             )}
          />
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Account Name</th>
                <th>Domain</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="empty-state">
                      <div className="empty-state-icon"></div>
                      <h3>No accounts yet</h3>
                      <p>Add a company or convert a lead to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                accounts.map(acc => (
                  <tr 
                    key={acc.id} 
                    className="clickable-row"
                    onClick={() => setSelectedAccount(acc)}
                  >
                    <td className="fw-bold">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 6, background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {acc.account_name.charAt(0).toUpperCase()}
                        </div>
                        {acc.account_name}
                      </div>
                    </td>
                    <td><a href={`https://${acc.domain}`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}>{acc.domain || '-'}</a></td>
                    <td>{acc.account_owner}</td>
                    <td>
                      <span className={`badge badge-${acc.status}`}>{acc.status}</span>
                    </td>
                    <td className="text-muted">{new Date(acc.created_at).toLocaleDateString()}</td>
                    <td onClick={e => e.stopPropagation()} style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: '6px' }}
                          onClick={() => handleOpenModal(acc)}
                          title="Edit Account"
                        >
                          <Edit2 size={14} />
                        </button>
                        {isAdmin && (
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ padding: '6px', color: 'var(--danger)' }}
                            onClick={() => handleDeleteAccount(acc.id, acc.account_name)}
                            title="Delete Account"
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
              <h2 className="modal-title">{editingAccount ? 'Edit Account' : 'Add New Account'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Account Name *</label>
                  <input required className="form-input" value={formData.account_name} onChange={e => setFormData({...formData, account_name: e.target.value})} placeholder="Acme Corp" />
                </div>
                <div className="form-group">
                  <label className="form-label">Domain Name</label>
                  <input className="form-input" value={formData.domain} onChange={e => setFormData({...formData, domain: e.target.value})} placeholder="acme.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="prospect">Prospect</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Account Owner</label>
                  <input className="form-input" value={formData.account_owner} onChange={e => setFormData({...formData, account_owner: e.target.value})} />
                </div>
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingAccount ? 'Save Changes' : 'Create Account'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
