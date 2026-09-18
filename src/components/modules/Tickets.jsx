import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Trash2, Edit2, Settings, Save, UploadCloud } from 'lucide-react'
import LocalSearch from '../ui/LocalSearch'
import FieldBuilderModal from '../ui/FieldBuilderModal'
import BulkUploadModal from '../ui/BulkUploadModal'

function renderCustomFieldInput(config, value, onChange) {
  const commonProps = {
    required: config.is_required,
    className: 'form-input',
    value: value || '',
    onChange: (e) => onChange(e.target.value)
  }

  switch (config.field_type) {
    case 'number': return <input type="number" {...commonProps} />
    case 'date': return <input type="date" {...commonProps} />
    case 'checkbox': return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 42 }}>
        <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} style={{ width: 18, height: 18 }} />
        <span style={{ fontSize: 13, color: '#64748b' }}>Check if applicable</span>
      </div>
    )
    case 'dropdown': 
      return (
        <select {...commonProps}>
          <option value="">-- Select Option --</option>
          {(config.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )
    case 'long_text': return <textarea {...commonProps} style={{ minHeight: 80 }} />
    case 'url': return <input type="url" {...commonProps} placeholder="https://" />
    default: return <input type="text" {...commonProps} />
  }
}

export default function Tickets({ session, profile }) {
  const { t } = useTranslation()
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
    subject: '', priority: 'medium', status: 'open', owner: '', contact_id: '', account_id: '', description: '',
    custom_data: {}
  })
  const [editingTicket, setEditingTicket] = useState(null)
  const [ticketConfigs, setTicketConfigs] = useState([])
  const [isFieldBuilderOpen, setIsFieldBuilderOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)

  const fetchTicketConfigs = async () => {
    try {
      const { data: existing, error } = await supabase
        .from('custom_field_configs')
        .select('*')
        .eq('business_id', session.user.id)
        .eq('module', 'ticket')
        .order('display_order', { ascending: true })
      
      if (error) throw error

      const coreFieldsTarget = [
        { label: 'Ticket No.', field_key: 'ticket_no', field_type: 'text', is_core: true, order: 0 },
        { label: 'Subject', field_key: 'subject', field_type: 'text', is_core: true, order: 1 },
        { label: 'Description', field_key: 'description', field_type: 'long_text', is_core: true, order: 2 },
        { label: 'Contact', field_key: 'contact', field_type: 'text', is_core: true, order: 3 },
        { label: 'Account', field_key: 'account', field_type: 'text', is_core: true, order: 4 },
        { label: 'Priority', field_key: 'priority', field_type: 'dropdown', options: ['low', 'medium', 'high'], is_core: true, order: 5 },
        { label: 'Status', field_key: 'status', field_type: 'dropdown', options: ['open', 'pending', 'closed'], is_core: true, order: 6 },
        { label: 'Owner', field_key: 'owner', field_type: 'text', is_core: true, order: 7 },
        { label: 'Date/Time', field_key: 'created_at', field_type: 'date', is_core: true, order: 8 }
      ]

      let finalData = existing || []
      const missingCore = coreFieldsTarget.filter(t => !finalData.find(f => f.field_key === t.field_key))

      if (missingCore.length > 0) {
        const toInsert = missingCore.map(c => ({
          business_id: session.user.id,
          module: 'ticket',
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

      setTicketConfigs(finalData.filter(f => !f.is_archived))
    } catch (err) {
      console.error('Error loading ticket configs:', err)
    }
  }

  const location = useLocation()
  const userIds = profile?.teamUserIds || [session.user.id]

  useEffect(() => {
    fetchData()
    fetchTicketConfigs()
  }, [session, profile])

  useEffect(() => {
    if (tickets.length > 0 && location.state?.openId) {
      const tkt = tickets.find(t => t.id === location.state.openId)
      if (tkt) {
        setEditingTicket(tkt)
        setFormData({
          subject: tkt.subject || '',
          priority: tkt.priority || 'medium',
          status: tkt.status || 'open',
          owner: tkt.owner || '',
          contact_id: tkt.contact_id || '',
          account_id: tkt.account_id || '',
          description: tkt.description || '',
          custom_data: tkt.custom_data || {}
        })
        setIsModalOpen(true)
        window.history.replaceState({}, document.title)
      }
    }
  }, [tickets, location.state])

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
          .in('user_id', userIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('contacts')
          .select('id, name, account_id')
          .in('user_id', userIds)
          .order('name'),
        supabase
          .from('accounts')
          .select('id, account_name')
          .in('user_id', userIds)
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
        description: ticket.description || '',
        custom_data: ticket.custom_data || {}
      })
      setAccSearch('')
    } else {
      setEditingTicket(null)
      setFormData({
        subject: '', priority: 'medium', status: 'open',
        owner: profile?.name || session.user.email, contact_id: '', account_id: '',
        description: '',
        custom_data: {}
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
            description: formData.description,
            custom_data: formData.custom_data || {}
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
            subject: formData.subject,
            priority: formData.priority,
            status: formData.status,
            owner: formData.owner,
            contact_id: formData.contact_id || null,
            account_id: formData.account_id || null,
            description: formData.description,
            custom_data: formData.custom_data || {},
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
    if (!window.confirm(`Are you sure you want to delete ticket "${subject}"?`)) return false
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
      return true
    } catch (error) {
      toast.error(`Error deleting ticket: ${error.message}`, { id: toastId })
      return false
    }
  }

  const [selectedTicket, setSelectedTicket] = useState(null)

  if (loading) return <div className="loading-container"><div className="spinner"/></div>
  
  const isAdmin = ['admin', 'administrator'].includes((session?.user?.user_metadata?.role || profile?.role || '').toLowerCase())

  const TICKET_STAGES = ['open', 'pending', 'closed']
  const TICKET_STAGE_LABELS = { open: 'Open', pending: 'Pending', closed: 'Closed' }

  if (selectedTicket) {
    const currentStageIdx = TICKET_STAGES.indexOf(selectedTicket.status)

    const handleStageClick = (stage) => {
      if (stage === selectedTicket.status) return
      handleStatusChange(selectedTicket.id, stage)
      setSelectedTicket(prev => ({ ...prev, status: stage }))
    }

    return (
      <div className="ticket-detail-view anim-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <button className="btn btn-secondary" onClick={() => setSelectedTicket(null)} style={{ borderRadius: '20px', padding: '8px 16px' }}>
            <span style={{ fontSize: '18px', marginRight: '8px' }}>←</span> Back to Tickets
          </button>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={() => handleOpenModal(selectedTicket)}>
              <Edit2 size={16} /> Edit Ticket
            </button>
            {isAdmin && (
              <button className="btn btn-danger" onClick={async () => { await handleDeleteTicket(selectedTicket.id, selectedTicket.subject); setSelectedTicket(null); }}>
                <Trash2 size={16} /> Delete Ticket
              </button>
            )}
          </div>
        </div>

        {/* Pipeline Stage Bar */}
        <div className="card" style={{ marginBottom: 24, padding: '20px 24px' }}>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ticket Stage</span>
            <div style={{ marginTop: 4, fontSize: '13px', fontWeight: 600 }}>
              Step <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{currentStageIdx + 1}</span> of {TICKET_STAGES.length}
              {' '}&mdash; <span style={{ color: 'var(--accent)' }}>{TICKET_STAGE_LABELS[selectedTicket.status]}</span>
            </div>
          </div>
          <div style={{ display: 'flex', width: '100%', gap: 0 }}>
            {TICKET_STAGES.map((stage, idx) => {
              const isDone = idx < currentStageIdx
              const isCurrent = idx === currentStageIdx
              const isFirst = idx === 0
              const isLast = idx === TICKET_STAGES.length - 1
              const bgColor = (isDone || isCurrent) ? 'var(--accent)' : 'var(--bg-primary, #f0f0f0)'
              const textColor = (isDone || isCurrent) ? '#fff' : 'var(--text-muted)'
              const borderColor = (isDone || isCurrent) ? 'var(--accent)' : 'var(--border-subtle)'
              const clipLeft = isFirst ? 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)'
                : isLast ? 'polygon(14px 0, 100% 0, 100% 100%, 0 100%, 14px 50%)'
                : 'polygon(14px 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)'

              return (
                <div
                  key={stage}
                  onClick={() => handleStageClick(stage)}
                  title={`Move to ${TICKET_STAGE_LABELS[stage]}`}
                  style={{
                    flex: 1,
                    clipPath: clipLeft,
                    background: bgColor,
                    color: textColor,
                    border: `1.5px solid ${borderColor}`,
                    padding: '11px 20px 11px ' + (isFirst ? '20px' : '28px'),
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: isCurrent ? 800 : 600,
                    fontSize: '13px',
                    cursor: isCurrent ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                    marginLeft: idx === 0 ? 0 : '-13px',
                    position: 'relative',
                    zIndex: TICKET_STAGES.length - idx,
                    opacity: isCurrent ? 1 : isDone ? 0.92 : 0.65,
                    userSelect: 'none',
                    boxShadow: isCurrent ? '0 2px 12px rgba(0,0,0,0.13)' : 'none',
                  }}
                  onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.opacity = isDone ? '0.92' : '0.65' }}
                >
                  {isDone && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {TICKET_STAGE_LABELS[stage]}
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="card" style={{ marginBottom: 24, borderLeft: '6px solid var(--accent)' }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span className="font-mono text-muted" style={{ fontSize: '14px' }}>{selectedTicket.ticket_no}</span>
                  <span className={`badge badge-${selectedTicket.status}`}>{selectedTicket.status}</span>
                </div>
                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>{selectedTicket.subject}</h1>
              </div>

              <div style={{ marginBottom: 32 }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Description</label>
                <p style={{ fontSize: '15px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {selectedTicket.description || 'No description provided for this ticket.'}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '24px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Priority</label>
                  <div style={{ marginTop: 4 }}>
                    <span className={`badge badge-${selectedTicket.priority}`}>{selectedTicket.priority}</span>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Owner</label>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>{selectedTicket.owner}</div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Opened On</label>
                  <div style={{ fontWeight: 600, marginTop: 4 }}>
                    {new Date(selectedTicket.created_at).toLocaleDateString()} at {new Date(selectedTicket.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-1">
            <div className="card">
              <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 20 }}>Related Information</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Customer / Account</label>
                  {selectedTicket.contacts?.accounts?.account_name ? (
                    <div 
                      className="fw-bold" 
                      style={{ color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => navigate('/dashboard/accounts', { state: { openId: selectedTicket.contacts.account_id } })}
                    >
                      {selectedTicket.contacts.accounts.account_name}
                    </div>
                  ) : (
                    <div className="text-muted">No linked account</div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Primary Contact</label>
                  <div className="fw-bold">{selectedTicket.contacts?.name || 'No linked contact'}</div>
                </div>

                <div style={{ marginTop: 8, padding: 16, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                   <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                     Need to update the status quickly?
                   </p>
                   <select 
                    value={selectedTicket.status} 
                    onChange={(e) => {
                      handleStatusChange(selectedTicket.id, e.target.value);
                      setSelectedTicket(prev => ({...prev, status: e.target.value}));
                    }}
                    className={`badge badge-${selectedTicket.status}`}
                    style={{ marginTop: 12, width: '100%', border: '1.5px solid var(--border-subtle)', borderRadius: 8 }}
                  >
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isModalOpen && renderModal()}
      </div>
    )
  }

  function renderModal() {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal-header">
            <h2 className="modal-title">{editingTicket ? 'Edit Ticket' : 'Create Support Ticket'}</h2>
            <button className="modal-close" onClick={() => { setIsModalOpen(false); setEditingTicket(null); }}>✕</button>
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
              {/* Dynamic Custom Fields Loop */}
              {ticketConfigs.filter(c => !c.is_core).map(config => (
                <div key={config.id} className="form-group" style={{ gridColumn: (config.field_type === 'long_text' || config.field_type === 'file_upload') ? 'span 2' : 'auto' }}>
                  <label className="form-label">{config.label} {config.is_required && <span className="text-danger">*</span>}</label>
                  {renderCustomFieldInput(config, formData.custom_data?.[config.field_key], (val) => {
                    setFormData({
                      ...formData,
                      custom_data: { ...formData.custom_data, [config.field_key]: val }
                    })
                  })}
                </div>
              ))}

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
              {editingTicket && isAdmin && (
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  style={{ marginRight: 'auto' }}
                  onClick={async () => { 
                    if (await handleDeleteTicket(editingTicket.id, editingTicket.subject)) {
                      setIsModalOpen(false); setEditingTicket(null); setSelectedTicket(null); 
                    }
                  }}
                >
                  <Trash2 size={16} style={{ marginRight: 8 }} /> Delete Ticket
                </button>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => { setIsModalOpen(false); setEditingTicket(null); }}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editingTicket ? 'Save Changes' : 'Create Ticket'}</button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('modules.tickets.title')}</h1>
          <p className="page-subtitle">{t('modules.tickets.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setIsFieldBuilderOpen(true)}>
            <Settings size={14} /> {t('modules.tickets.editFields')}
          </button>
          <button className="btn btn-secondary" onClick={() => setIsImportOpen(true)}>
            <UploadCloud size={14} style={{ marginRight: 6 }} /> {t('bulkImport.button', 'Import Excel/CSV')}
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <span style={{ fontSize: 18 }}>+</span> {t('modules.tickets.createTicket')}
          </button>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">{t('modules.tickets.allTickets')} ({tickets.length})</h2>
          <LocalSearch 
             data={tickets} 
             searchKeys={['subject', 'ticket_no']} 
             onSelect={(item) => handleSelectTicket(item)} 
             placeholder={t('modules.tickets.searchPlaceholder')} 
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
                {ticketConfigs.filter(c => c.show_in_list).map(config => (
                  <th key={config.id}>{config.label}</th>
                ))}
                <th style={{ width: 70 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={ticketConfigs.filter(c => c.show_in_list).length + 1}>
                    <div className="empty-state">
                      <div className="empty-state-icon"></div>
                      <h3>No support tickets</h3>
                      <p>All clear! Create a ticket to log customer inquiries.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tickets.map(ticket => (
                  <tr key={ticket.id} id={`ticket-row-${ticket.id}`} className="clickable-row" onClick={() => setSelectedTicket(ticket)}>
                    {ticketConfigs.filter(c => c.show_in_list).map(config => {
                      if (config.field_key === 'ticket_no') {
                        return <td key={config.id} className="font-mono text-muted">{ticket.ticket_no}</td>
                      }
                      if (config.field_key === 'subject') {
                        return <td key={config.id} className="fw-bold" style={{ color: 'var(--accent)' }}>{ticket.subject}</td>
                      }
                      if (config.field_key === 'description') {
                        return (
                          <td key={config.id} className="text-muted" style={{ fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ticket.description}>
                            {ticket.description || '-'}
                          </td>
                        )
                      }
                      if (config.field_key === 'contact') {
                        return <td key={config.id}>{ticket.contacts?.name || '-'}</td>
                      }
                      if (config.field_key === 'account') {
                        return (
                          <td key={config.id}>
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
                        )
                      }
                      if (config.field_key === 'priority') {
                        return (
                          <td key={config.id}>
                            <select 
                              value={ticket.priority} 
                              onChange={(e) => { e.stopPropagation(); handlePriorityChange(ticket.id, e.target.value); }}
                              className={`badge badge-${ticket.priority}`}
                              style={{ border: 'none', fontWeight: 600, appearance: 'none', paddingRight: 16 }}
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </td>
                        )
                      }
                      if (config.field_key === 'status') {
                        return (
                          <td key={config.id}>
                            <select 
                              value={ticket.status} 
                              onChange={(e) => { e.stopPropagation(); handleStatusChange(ticket.id, e.target.value); }}
                              className={`badge badge-${ticket.status}`}
                              style={{ border: 'none', fontWeight: 600, appearance: 'none', paddingRight: 16 }}
                            >
                              <option value="open">Open</option>
                              <option value="pending">Pending</option>
                              <option value="closed">Closed</option>
                            </select>
                          </td>
                        )
                      }
                      if (config.field_key === 'owner') {
                        return <td key={config.id}>{ticket.owner}</td>
                      }
                      if (config.field_key === 'created_at') {
                        return (
                          <td key={config.id} className="text-muted">
                            {new Date(ticket.created_at).toLocaleDateString()} {new Date(ticket.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </td>
                        )
                      }
                      return <td key={config.id}>{ticket[config.field_key] || ticket.custom_data?.[config.field_key] || '—'}</td>
                    })}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn-icon text-primary"
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(ticket); }}
                          title="Edit Ticket"
                        >
                          <Edit2 size={16} />
                        </button>
                        {isAdmin && (
                          <button
                            className="btn-icon text-danger"
                            onClick={(e) => { e.stopPropagation(); handleDeleteTicket(ticket.id, ticket.subject); }}
                            title="Delete Ticket"
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

      {isModalOpen && renderModal()}

      <BulkUploadModal
        module="tickets"
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        session={session}
        profile={profile}
        onImported={fetchData}
      />

      <FieldBuilderModal 
        module="ticket"
        businessId={session.user.id}
        isOpen={isFieldBuilderOpen}
        onClose={() => {
          setIsFieldBuilderOpen(false)
          fetchTicketConfigs()
        }}
      />
    </div>
  )
}
