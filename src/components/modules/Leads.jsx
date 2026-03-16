import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Trash2, Edit2 } from 'lucide-react'
import LocalSearch from '../ui/LocalSearch'
import toast from 'react-hot-toast'

export default function Leads({ session, profile }) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState(null)
  const [selectedLead, setSelectedLead] = useState(null)
  const [activeTab, setActiveTab] = useState('tasks')
  const [leadTasks, setLeadTasks] = useState([])
  const [leadActs, setLeadActs] = useState([])
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [taskFormData, setTaskFormData] = useState({ title: '', task_type: 'Call', status: 'Open', due_date: '', owner: '' })
  const [editingTaskId, setEditingTaskId] = useState(null)
  const location = useLocation()
  
  // Form State
  const [formData, setFormData] = useState({
    name: '', company: '', email: '', lead_owner: '', status: 'new'
  })

  useEffect(() => { fetchLeads() }, [session])

  useEffect(() => {
    if (leads.length > 0 && location.state?.openId) {
      const lead = leads.find(l => l.id === location.state.openId)
      if (lead) {
        setSelectedLead(lead)
        window.history.replaceState({}, document.title)
      }
    }
  }, [leads, location.state])

  useEffect(() => {
    if (selectedLead) fetchLeadDetails(selectedLead.id, selectedLead.name)
  }, [selectedLead])

  const fetchLeads = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', session.user.id)
        .neq('status', 'converted')
        .order('serial_no', { ascending: true })
      
      if (error) throw error
      setLeads(data || [])
    } catch (error) {
      toast.error('Failed to load leads')
    } finally {
      setLoading(false)
    }
  }

  const fetchLeadDetails = async (id, name) => {
    const { data: tskData } = await supabase.from('tasks').select('*').eq('related_to', 'leads').eq('related_id', id)
    const { data: aData } = await supabase.from('activities').select('*').eq('user_id', session.user.id)
    
    const nameLower = (name || '').toLowerCase()
    const filteredActs = (aData || []).filter(a => {
      if (!a.description) return false
      return a.description.toLowerCase().includes(nameLower)
    })

    setLeadTasks(tskData || [])
    setLeadActs(filteredActs.sort((x, y) => new Date(y.created_at) - new Date(x.created_at)))
  }

  const handleSaveTask = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingTaskId ? 'Updating task...' : 'Creating task...')
    try {
      const taskData = {
        ...taskFormData,
        related_to: 'leads',
        related_id: selectedLead.id,
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
      fetchLeadDetails(selectedLead.id, selectedLead.name)
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
      fetchLeadDetails(selectedLead.id, selectedLead.name)
      toast.success('Task deleted', { id: toastId })
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleOpenModal = (lead = null) => {
    if (lead) {
      setEditingLead(lead)
      setFormData({
        name: lead.name,
        company: lead.company || '',
        email: lead.email || '',
        lead_owner: lead.lead_owner || '',
        status: lead.status
      })
    } else {
      setEditingLead(null)
      setFormData({
        name: '', company: '', email: '',
        lead_owner: profile?.name || session.user.email,
        status: 'new'
      })
    }
    setIsModalOpen(true)
  }

  const convertLeadAction = async (leadData) => {
    let accountId = null;
    
    const { data: accData, error: accErr } = await supabase
      .from('accounts')
      .insert([{
        user_id: session.user.id,
        account_name: leadData.company || `${leadData.name}'s Account`,
        account_owner: leadData.lead_owner || null,
        status: 'prospect'
      }]).select()
      
    if (accErr) throw accErr
    if (accData && accData.length > 0) accountId = accData[0].id

    const { error: cErr } = await supabase
      .from('contacts')
      .insert([{
        user_id: session.user.id,
        name: leadData.name,
        email: leadData.email || null,
        contact_owner: leadData.lead_owner || null,
        account_id: accountId,
        lead_id: leadData.id
      }])
      
    if (cErr) throw cErr

    const { error: lErr } = await supabase
      .from('leads')
      .update({ status: 'converted' })
      .eq('id', leadData.id)
      
    if (lErr) throw lErr

    await supabase.from('activities').insert([{
      user_id: session.user.id,
      type: 'Lead Converted',
      description: `Lead ${leadData.name} was converted to a Contact`
    }])
  }

  const handleDeleteLead = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete lead "${name}"?`)) return
    const toastId = toast.loading('Deleting lead...')
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Lead Deleted',
        description: `Deleted lead: ${name}`
      }])
      
      toast.success('Lead deleted', { id: toastId })
      fetchLeads()
    } catch (error) {
      toast.error(`Error deleting lead: ${error.message}`, { id: toastId })
    }
  }

  const handleStatusChange = async (id, newStatus, currentLead) => {
    let currentToastId;
    try {
      if (newStatus === 'converted') {
        const confirmConvert = window.confirm('Converting this lead will move it to Contacts and Accounts. Proceed?')
        if (!confirmConvert) return fetchLeads() // Reset dropdown
        
        currentToastId = toast.loading('Converting lead...')
        await convertLeadAction(currentLead)
        toast.success('Lead converted successfully!', { id: currentToastId })
        fetchLeads()
      } else {
        const { error } = await supabase
          .from('leads')
          .update({ status: newStatus })
          .eq('id', id)
        
        if (error) throw error
        toast.success('Status updated')
        fetchLeads()
      }
    } catch (error) {
      console.error(error)
      if (currentToastId) {
        toast.error(`Error: ${error.message || 'Failed to convert lead'}`, { id: currentToastId })
      } else {
        toast.error(`Error: ${error.message || 'Failed to update status'}`)
      }
      fetchLeads()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    let toastId;
    
    try {
      if (editingLead) {
        const isConverting = formData.status === 'converted' && editingLead.status !== 'converted';
        
        if (isConverting) {
          const confirmConvert = window.confirm('Converting this lead will move it to Contacts and Accounts. Proceed?')
          if (!confirmConvert) return;
        }

        toastId = toast.loading('Updating lead...')

        if (isConverting) {
          const { status, ...otherFields } = formData;
          const { error: updateErr } = await supabase
            .from('leads')
            .update(otherFields)
            .eq('id', editingLead.id)
            
          if (updateErr) throw updateErr

          await convertLeadAction({ ...editingLead, ...formData })
        } else {
          const { error: updateErr } = await supabase
            .from('leads')
            .update(formData)
            .eq('id', editingLead.id)
            
          if (updateErr) throw updateErr
          
          await supabase.from('activities').insert([{
            user_id: session.user.id,
            type: 'Lead Updated',
            description: `Updated details for ${formData.name}`
          }])
        }
      } else {
        toastId = toast.loading('Adding lead...')
        if (formData.status === 'converted') {
           const { data: newLead, error } = await supabase
            .from('leads')
            .insert([{ ...formData, status: 'new', user_id: session.user.id }])
            .select()
            .single()
            
           if (error) throw error
           await convertLeadAction({ ...newLead, ...formData })
        } else {
          const { error } = await supabase
            .from('leads')
            .insert([{ ...formData, user_id: session.user.id }])
            
          if (error) throw error

          await supabase.from('activities').insert([{
            user_id: session.user.id,
            type: 'New Lead',
            description: `Added new lead: ${formData.name}`
          }])
        }
      }
      
      toast.success(editingLead ? 'Lead updated' : 'Lead added', { id: toastId })
      setIsModalOpen(false)
      fetchLeads()
    } catch (error) {
      console.error(error)
      if (toastId) toast.error(`Error: ${error.message || 'Failed to save lead'}`, { id: toastId })
      else toast.error(`Error: ${error.message || 'Failed to save lead'}`)
    }
  }

  if (loading) return <div className="loading-container"><div className="spinner"/></div>
  
  const isAdmin = ['admin', 'administrator'].includes(profile?.role?.toLowerCase())

  return (
    <div>
      {selectedLead ? (
        <div>
          <button className="back-btn" onClick={() => setSelectedLead(null)}>
            ← Back to Leads Hub
          </button>
          
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="detail-header">
              <div className="detail-avatar">
                {selectedLead.name.charAt(0).toUpperCase()}
              </div>
              <div className="detail-info">
                <h1 className="detail-name">{selectedLead.name}</h1>
                <div className="detail-meta">{selectedLead.company} • {selectedLead.email}</div>
                <div className={`badge badge-${selectedLead.status} mt-2`}>{selectedLead.status}</div>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-field">
                <label>Lead ID</label>
                <span className="font-mono">{selectedLead.unique_id}</span>
              </div>
              <div className="detail-field">
                <label>Lead Owner</label>
                <span>{selectedLead.lead_owner}</span>
              </div>
              <div className="detail-field">
                <label>Created Date</label>
                <span>{new Date(selectedLead.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="tabs">
              <button className={`tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
                Tasks ({leadTasks.length})
              </button>
              <button className={`tab ${activeTab === 'activities' ? 'active' : ''}`} onClick={() => setActiveTab('activities')}>
                Activities ({leadActs.length})
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
                      {leadTasks.length === 0 ? (
                        <tr><td colSpan="6" style={{ textAlign:'center', color:'var(--text-muted)' }}>No tasks found</td></tr>
                      ) : (
                        leadTasks.map(t => (
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
                                <button className="btn-icon text-danger" onClick={() => handleDeleteTask(t.id, t.title)}>
                                  <Trash2 size={14}/>
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
            )}

            {activeTab === 'activities' && (
              <div style={{ padding: 24 }}>
                {leadActs.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No recent activities</div>
                ) : (
                  <div className="activity-list">
                    {leadActs.map(a => (
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
              <h1 className="page-title">Leads Hub</h1>
              <p className="page-subtitle">Manage and convert your prospective clients.</p>
            </div>
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              <span style={{ fontSize: 18 }}>+</span> Add New Lead
            </button>
          </div>

          <div className="table-container">
            <div className="table-header">
              <h2 className="table-title">All Leads ({leads.length})</h2>
              <LocalSearch 
                 data={leads} 
                 searchKeys={['name', 'company', 'email', 'unique_id']} 
                 onSelect={(item) => handleOpenModal(item)} 
                 placeholder="Search leads..." 
                 renderItem={(item) => (
                   <>
                     <div className="fw-bold" style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.name}</div>
                     <div className="text-muted" style={{ fontSize: '11px' }}>{item.company}</div>
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
                    <th>Company / Email</th>
                    <th>Unique ID</th>
                    <th>Owner</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan="8">
                        <div className="empty-state">
                          <div className="empty-state-icon"></div>
                          <h3>No leads yet</h3>
                          <p>Start tracking prospects by adding your first lead.</p>
                          <button className="btn btn-secondary mt-4" onClick={() => handleOpenModal()}>Add Lead</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead, idx) => (
                      <tr key={lead.id} className="clickable-row" onClick={() => setSelectedLead(lead)}>
                        <td className="font-mono text-muted">{idx + 1}</td>
                        <td className="fw-bold">{lead.name}</td>
                        <td>
                          <div>{lead.company || '-'}</div>
                          <div className="text-muted" style={{ fontSize: 12 }}>{lead.email}</div>
                        </td>
                        <td className="font-mono">{lead.unique_id}</td>
                        <td>{lead.lead_owner}</td>
                        <td>
                          <select 
                            value={lead.status} 
                            onChange={(e) => handleStatusChange(lead.id, e.target.value, lead)}
                            className={`badge badge-${lead.status}`}
                            style={{ border: 'none', fontWeight: 600, appearance: 'none', paddingRight: 16 }}
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="working">Working</option>
                            <option value="converted">Converted</option>
                            <option value="lost">Lost</option>
                          </select>
                        </td>
                        <td className="text-muted">{new Date(lead.created_at).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              style={{ padding: '6px' }}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenModal(lead)
                              }}
                              title="Edit Lead"
                            >
                              <Edit2 size={14} />
                            </button>
                            {isAdmin && (
                              <button 
                                className="btn-secondary btn-sm" 
                                style={{ padding: '6px', color: 'var(--danger)' }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteLead(lead.id, lead.name)
                                }}
                                title="Delete Lead"
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

      {/* Add/Edit Modal */}
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
              <h2 className="modal-title">{editingLead ? 'Edit Lead' : 'Add New Lead'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input required className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Jane Doe" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" className="form-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="jane@example.com" />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Company Name</label>
                  <input className="form-input" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="Acme Corp" />
                </div>
                <div className="form-group">
                  <label className="form-label">Lead Owner</label>
                  <input className="form-input" value={formData.lead_owner} onChange={e => setFormData({...formData, lead_owner: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Initial Status</label>
                  <select className="form-input" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="working">Working</option>
                    <option value="converted">Converted</option>
                  </select>
                </div>
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingLead ? 'Save Changes' : 'Create Lead'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
