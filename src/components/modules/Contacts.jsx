import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Trash2, Edit2, Settings, Plus } from 'lucide-react'
import LocalSearch from '../ui/LocalSearch'
import toast from 'react-hot-toast'
import WhatsAppButton from '../ui/WhatsAppButton'
import { getWhatsAppMessage, formatPhoneDisplay, cleanPhoneNumber } from '../../lib/whatsapp'
import FieldBuilderModal from '../ui/FieldBuilderModal'

export default function Contacts({ session, profile }) {
  const [contacts, setContacts] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState(null)
  const [editingContact, setEditingContact] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', account_id: '', contact_owner: ''
  })
  const [isFieldBuilderOpen, setIsFieldBuilderOpen] = useState(false)

  // Contact Detail State
  const [conTasks, setConTasks] = useState([])
  const [conActs, setConActs] = useState([])
  const [activeTab, setActiveTab] = useState('tasks')

  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [taskFormData, setTaskFormData] = useState({ title: '', task_type: 'Call', status: 'Open', due_date: '', owner: '' })
  const [editingTaskId, setEditingTaskId] = useState(null)

  useEffect(() => {
    fetchData()
  }, [session])

  useEffect(() => {
    if (contacts.length > 0 && location.state?.openId) {
      const contact = contacts.find(c => c.id === location.state.openId)
      if (contact) {
        setSelectedContact(contact)
        // Clear state so it doesn't auto-reopen on subsequent renders
        window.history.replaceState({}, document.title)
      }
    }
  }, [contacts, location.state])

  useEffect(() => {
    if (selectedContact) fetchContactDetails(selectedContact.id, selectedContact.name)
  }, [selectedContact])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [constactsRes, accountsRes] = await Promise.all([
        supabase
          .from('contacts')
          .select('*, accounts(account_name)')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('accounts')
          .select('id, account_name')
          .eq('user_id', session.user.id)
          .order('account_name')
      ])
      
      setContacts(constactsRes.data || [])
      setAccounts(accountsRes.data || [])
    } catch (error) {
      toast.error('Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteContact = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete contact "${name}"?`)) return
    const toastId = toast.loading('Deleting contact...')
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Contact Deleted',
        description: `Deleted contact: ${name}`
      }])
      
      toast.success('Contact deleted', { id: toastId })
      fetchData()
    } catch (error) {
      toast.error(`Error deleting contact: ${error.message}`, { id: toastId })
    }
  }

  const fetchContactDetails = async (id, name) => {
    const { data: tskData } = await supabase.from('tasks').select('*').eq('related_to', 'contacts').eq('related_id', id)
    const { data: aData } = await supabase.from('activities').select('*').eq('user_id', session.user.id)
    
    const nameLower = (name || '').toLowerCase()
    const filteredActs = (aData || []).filter(a => {
      if (!a.description) return false
      return a.description.toLowerCase().includes(nameLower)
    })

    setConTasks(tskData || [])
    setConActs(filteredActs.sort((x, y) => new Date(y.created_at) - new Date(x.created_at)))
  }

  const handleSaveTask = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingTaskId ? 'Updating task...' : 'Creating task...')
    try {
      const taskData = {
        ...taskFormData,
        related_to: 'contacts',
        related_id: selectedContact.id,
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
      fetchContactDetails(selectedContact.id, selectedContact.name)
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
      fetchContactDetails(selectedContact.id, selectedContact.name)
      toast.success('Task deleted', { id: toastId })
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleOpenModal = (contact = null) => {
    if (contact) {
      setEditingContact(contact)
      setFormData({
        name: contact.name, 
        email: contact.email || '', 
        phone: contact.phone || '', 
        account_id: contact.account_id || '',
        contact_owner: contact.contact_owner || ''
      })
    } else {
      setEditingContact(null)
      setFormData({
        name: '', email: '', phone: '', account_id: '',
        contact_owner: profile?.name || session.user.email
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingContact ? 'Updating contact...' : 'Adding contact...')
    
    try {
      if (editingContact) {
        const { error } = await supabase
          .from('contacts')
          .update({ 
            ...formData, 
            account_id: formData.account_id || null
          })
          .eq('id', editingContact.id)
          
        if (error) throw error

        const acc = accounts?.find(a => a.id === formData.account_id)
        const accStr = acc ? ` for ${acc.account_name}` : ''
        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'Contact Updated',
          description: `${profile?.name || session.user.email} updated contact ${formData.name}${accStr}`
        }])
      } else {
        const { error } = await supabase
          .from('contacts')
          .insert([{ 
            ...formData, 
            account_id: formData.account_id || null, // Handle empty string
            user_id: session.user.id 
          }])
          
        if (error) throw error

        const acc = accounts?.find(a => a.id === formData.account_id)
        const accStr = acc ? ` for ${acc.account_name}` : ''
        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'New Contact',
          description: `${profile?.name || session.user.email} added contact ${formData.name}${accStr}`
        }])
      }
      
      toast.success(editingContact ? 'Contact updated' : 'Contact added', { id: toastId })
      setIsModalOpen(false)
      fetchData()
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  if (loading) return <div className="loading-container"><div className="spinner"/></div>
  
  const isAdmin = ['admin', 'administrator'].includes((session?.user?.user_metadata?.role || profile?.role || '').toLowerCase())

  return (
    <div>
      {selectedContact ? (
        <div>
          <button className="back-btn" onClick={() => setSelectedContact(null)} title="Back to Contacts">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </button>
          
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="detail-header">
              <div className="detail-avatar">
                {selectedContact.name.charAt(0).toUpperCase()}
              </div>
              <div className="detail-info">
                <h1 className="detail-name">{selectedContact.name}</h1>
                <div className="detail-meta">{selectedContact.email}</div>

                <div className="badge badge-active mt-2">Active Contact</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => handleOpenModal(selectedContact)}>
                  <Edit2 size={14} style={{ marginRight: 6 }} /> Edit
                </button>
                {isAdmin && (
                  <button className="btn btn-secondary text-danger" onClick={() => {
                    handleDeleteContact(selectedContact.id, selectedContact.name);
                    setSelectedContact(null);
                  }}>
                    <Trash2 size={14} style={{ marginRight: 6 }} /> Delete
                  </button>
                )}
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-field">
                <label>Contact ID</label>
                <span className="font-mono">{selectedContact.unique_id}</span>
              </div>
              <div className="detail-field">
                <label>Account</label>
                {selectedContact.account_id && selectedContact.accounts?.account_name ? (
                  <span
                    style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
                    onClick={() => navigate('/dashboard/accounts', { state: { openId: selectedContact.account_id } })}
                    title="Click to view account"
                  >
                    {selectedContact.accounts.account_name}
                  </span>
                ) : (
                  <span>No Account</span>
                )}
              </div>
              <div className="detail-field">
                <label>Phone</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{(() => { const raw = selectedContact.phone; const cleaned = cleanPhoneNumber(raw); return cleaned ? formatPhoneDisplay(cleaned) : (raw || 'No phone'); })()}</span>
                  <WhatsAppButton
                    phone={selectedContact.phone}
                    messageText={getWhatsAppMessage('customer', {
                      firstName: (selectedContact.name || '').split(' ')[0],
                      agentName: profile?.name || session.user.email,
                      businessName: profile?.company_name || 'our company'
                    })}
                    session={session}
                    recordName={selectedContact.name}
                    style={{ width: 26, height: 26 }}
                  />
                </div>
              </div>
              <div className="detail-field">
                <label>Contact Owner</label>
                <span>{selectedContact.contact_owner}</span>
              </div>
              <div className="detail-field">
                <label>Created Date</label>
                <span>{new Date(selectedContact.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="tabs">
              <button className={`tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
                Tasks ({conTasks.length})
              </button>
              <button className={`tab ${activeTab === 'activities' ? 'active' : ''}`} onClick={() => setActiveTab('activities')}>
                Activities ({conActs.length})
              </button>
            </div>

            {activeTab === 'tasks' && (
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '15px' }}>Task List</h3>
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
                      {conTasks.length === 0 ? (
                        <tr><td colSpan="6" style={{ textAlign:'center', color:'var(--text-muted)' }}>No tasks found</td></tr>
                      ) : (
                        conTasks.map(t => (
                          <tr key={t.id}>
                            <td className="fw-bold">{t.title}</td>
                            <td><span className="badge badge-normal">{t.task_type}</span></td>
                            <td><span className="fw-bold">{t.status}</span></td>
                            <td>{t.due_date ? new Date(t.due_date).toLocaleDateString() : '-'}</td>
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
                {conActs.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No recent activities</div>
                ) : (
                  <div className="activity-list">
                    {conActs.map(a => (
                      <div key={a.id} className="activity-item">
                        <div className="activity-dot"></div>
                        <div className="activity-content">
                          <div className="activity-type">{a.type}</div>
                          <div className="activity-desc">{a.description}</div>
                          <div className="activity-time">{new Date(a.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="page-header">
            <div>
              <h1 className="page-title">Contacts</h1>
              <p className="page-subtitle">Manage people and relationships.</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => setIsFieldBuilderOpen(true)}>
                <Settings size={18} style={{ marginRight: 6 }} /> Edit fields
              </button>
              <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                <Plus size={18} style={{ marginRight: 6 }} /> Add New Contact
              </button>
            </div>
          </div>

          <div className="table-container">
            <div className="table-header">
              <h2 className="table-title">All Contacts ({contacts.length})</h2>
              <LocalSearch 
                 data={contacts} 
                 searchKeys={['name', 'email', 'unique_id', 'phone']} 
                 onSelect={(item) => setSelectedContact(item)} 
                 placeholder="Search contacts..." 
                 renderItem={(item) => (
                   <>
                     <div className="fw-bold" style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.name}</div>
                     <div className="text-muted" style={{ fontSize: '11px' }}>{item.email}</div>
                   </>
                 )}
              />
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Account</th>
                    <th>Unique ID</th>
                    <th>Phone</th>
                    <th>Owner</th>
                    <th>Created</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.length === 0 ? (
                    <tr>
                      <td colSpan="9">
                        <div className="empty-state">
                          <div className="empty-state-icon"></div>
                          <h3>No contacts yet</h3>
                          <p>Add a contact manually or convert a lead.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    contacts.map((contact, idx) => (
                      <tr 
                        key={contact.id} 
                        className="clickable-row"
                        onClick={() => setSelectedContact(contact)}
                      >
                        <td className="font-mono text-muted">{idx + 1}</td>
                        <td className="fw-bold">{contact.name}</td>
                        <td>{contact.email}</td>
                        <td>
                          {contact.account_id && contact.accounts?.account_name ? (
                            <span 
                              style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate('/dashboard/accounts', { state: { openId: contact.account_id } })
                              }}
                              title="Click to view account"
                            >
                              {contact.accounts.account_name}
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="font-mono">{contact.unique_id}</td>
                        <td>{contact.phone || '-'}</td>
                        <td>{contact.contact_owner}</td>
                        <td className="text-muted">{new Date(contact.created_at).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              style={{ padding: '6px' }}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenModal(contact)
                              }}
                              title="Edit Contact"
                            >
                              <Edit2 size={14} />
                            </button>
                            {isAdmin && (
                              <button 
                                className="btn btn-secondary btn-sm" 
                                style={{ padding: '6px', color: 'var(--danger)' }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteContact(contact.id, contact.name)
                                }}
                                title="Delete Contact"
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

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editingContact ? 'Edit Contact' : 'Add New Contact'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Full Name *</label>
                  <input required className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Jane Doe" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="jane@example.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="tel" className="form-input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+1 (555) 000-0000" />
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
                  <label className="form-label">Contact Owner</label>
                  <input className="form-input" value={formData.contact_owner} onChange={e => setFormData({...formData, contact_owner: e.target.value})} />
                </div>
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingContact ? 'Save Changes' : 'Create Contact'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <FieldBuilderModal 
        module="contact"
        businessId={session.user.id}
        isOpen={isFieldBuilderOpen}
        onClose={() => setIsFieldBuilderOpen(false)}
      />
    </div>
  )
}
