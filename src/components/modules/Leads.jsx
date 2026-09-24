import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { Trash2, Edit2, ArrowRightCircle, Settings, Plus, LayoutGrid, UploadCloud } from 'lucide-react'
import LocalSearch from '../ui/LocalSearch'
import toast from 'react-hot-toast'
import FieldBuilderModal from '../ui/FieldBuilderModal'
import BulkUploadModal from '../ui/BulkUploadModal'
import WhatsAppButton from '../ui/WhatsAppButton'
import { getWhatsAppMessage, formatPhoneDisplay, cleanPhoneNumber } from '../../lib/whatsapp'
import { sanitizePhone, validatePhone, validateEmail, validateRequired } from '../../lib/validation'

export default function Leads({ session, profile }) {
  const { t } = useTranslation()
  const companyType = session.user.user_metadata?.companyType || 'B2B'
  const isB2C = companyType === 'B2C'
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
  
  const [customFieldConfigs, setCustomFieldConfigs] = useState([])
  const [isFieldBuilderOpen, setIsFieldBuilderOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    name: '', company: '', email: '', contact_number: '', gender: '', lead_owner: '', status: 'new',
    custom_data: {}
  })

  const userIds = profile?.teamUserIds || [session.user.id]

  useEffect(() => { 
    fetchLeads() 
    fetchCustomConfigs()
  }, [session, profile])

  const fetchCustomConfigs = async () => {
    try {
      const { data: existing, error } = await supabase
        .from('custom_field_configs')
        .select('*')
        .eq('business_id', session.user.id)
        .eq('module', 'lead')
        .order('display_order', { ascending: true })
      
      if (error) throw error

      const coreFieldsTarget = [
        { label: 'Lead Name', field_key: 'lead_name', field_type: 'text', is_core: true, order: 0 },
        { label: 'Contact Number', field_key: 'contact_number', field_type: 'text', is_core: true, order: 1 },
        { label: 'Email Address', field_key: 'email', field_type: 'text', is_core: true, order: 2 },
        { label: 'Company Name', field_key: 'company', field_type: 'text', is_core: true, order: 3 },
        { label: 'Gender', field_key: 'gender', field_type: 'dropdown', options: ['Male', 'Female', 'Other'], is_core: true, order: 4 }
      ]

      let finalData = existing || []
      const missingCore = coreFieldsTarget.filter(t => !finalData.find(f => f.field_key === t.field_key))

      if (missingCore.length > 0) {
        const toInsert = missingCore.map(c => ({
          business_id: session.user.id,
          module: 'lead',
          field_key: c.field_key,
          label: c.label,
          field_type: c.field_type,
          options: c.options || null,
          is_core: true,
          display_order: c.order,
          is_required: c.field_key === 'lead_name' || c.field_key === 'contact_number',
          show_in_list: c.field_key !== 'gender'
        }))
        const { data: inserted } = await supabase.from('custom_field_configs').insert(toInsert).select()
        if (inserted) {
          finalData = [...finalData, ...inserted].sort((a,b) => (a.display_order || 0) - (b.display_order || 0))
        }
      }

      setCustomFieldConfigs(finalData.filter(f => !f.is_archived))
    } catch (err) {
      console.error('Error loading custom fields:', err)
    }
  }

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
        .in('user_id', userIds)
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
    const { data: aData } = await supabase.from('activities').select('*').in('user_id', userIds)
    
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
      // Start with every configured field blank, fill core fields from the DB columns,
      // then layer any values saved in custom_data on top so nothing shows empty.
      const seeded = {}
      customFieldConfigs.forEach(f => { seeded[f.field_key] = '' })
      Object.assign(seeded, {
        lead_name: lead.name || '',
        email: lead.email || '',
        company: lead.company || '',
        contact_number: lead.contact_number || '',
        gender: lead.gender || lead.custom_data?.gender || ''
      })
      Object.entries(lead.custom_data || {}).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') seeded[k] = v
      })
      setFormData({
        name: lead.name || '',
        company: lead.company || '',
        email: lead.email || '',
        contact_number: lead.contact_number || '',
        gender: lead.gender || lead.custom_data?.gender || '',
        lead_owner: lead.lead_owner || '',
        status: lead.status || 'new',
        custom_data: seeded
      })
    } else {
      setEditingLead(null)
      // Initialize with core field keys
      const initialCustom = {}
      customFieldConfigs.forEach(f => { initialCustom[f.field_key] = '' })

      setFormData({
        name: '', company: '', email: '', contact_number: '', gender: '',
        lead_owner: profile?.name || session.user.email,
        status: 'new',
        custom_data: initialCustom
      })
    }
    setIsModalOpen(true)
  }

  const convertLeadAction = async (leadData) => {
    if (isB2C) {
      // B2C: Convert to a Customer Profile in accounts table
      let stageId = null;
      const { data: stages } = await supabase
        .from('b2c_stages')
        .select('id')
        .order('order_index', { ascending: true })
        .limit(1)
      if (stages && stages.length > 0) stageId = stages[0].id

      const payload = {
        user_id: session.user.id,
        account_name: leadData.name,
        account_owner: leadData.lead_owner || profile?.name || session.user.email || null,
        status: 'Active',
        b2c_stage_id: stageId,
        email: leadData.email || leadData.custom_data?.email || leadData.custom_data?.email_id || null,
        phone: leadData.contact_number || leadData.custom_data?.contact_number || null,
        custom_data: {
          customer_name: leadData.name,
          contact_number: leadData.contact_number || leadData.custom_data?.contact_number || '',
          email_id: leadData.email || leadData.custom_data?.email || leadData.custom_data?.email_id || '',
          gender: leadData.custom_data?.gender || '',
          date_of_birth: leadData.custom_data?.date_of_birth || '',
          address: leadData.custom_data?.address || '',
          ...(leadData.custom_data || {})
        }
      }

      const { error: accErr } = await supabase
        .from('accounts')
        .insert([payload])
        
      if (accErr) throw accErr

      // Mark lead as converted
      const { error: lErr } = await supabase
        .from('leads')
        .update({ status: 'converted' })
        .eq('id', leadData.id)
        
      if (lErr) throw lErr

      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Lead Converted',
        description: `Lead ${leadData.name} was converted to Customer Profile`
      }])
    } else {
      // B2B: Convert to Account & Contact (existing behavior)
      let accountId = null;
      
      const { data: accData, error: accErr } = await supabase
        .from('accounts')
        .insert([{
          user_id: session.user.id,
          account_name: leadData.company || `${leadData.name}'s Account`,
          account_owner: leadData.lead_owner || profile?.name || session.user.email || null,
          status: 'prospect'
        }]).select()
        
      if (accErr) throw accErr
      if (accData && accData.length > 0) accountId = accData[0].id

      const { error: cErr } = await supabase
        .from('contacts')
        .insert([{
          user_id: session.user.id,
          name: leadData.name,
          email: leadData.email || leadData.custom_data?.email || null,
          phone: leadData.contact_number || leadData.custom_data?.contact_number || null,
          gender: leadData.custom_data?.gender || null,
          contact_owner: leadData.lead_owner || null,
          account_id: accountId,
          lead_id: leadData.id,
          custom_data: leadData.custom_data || {}
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
  }

  const handleDeleteLead = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete lead "${name}"?`)) return false
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
      return true
    } catch (error) {
      toast.error(`Error deleting lead: ${error.message}`, { id: toastId })
      return false
    }
  }

  const handleStatusChange = async (id, newStatus, currentLead) => {
    let currentToastId;
    try {
      if (newStatus === 'converted') {
        const targetSection = isB2C ? 'Customer Profiles' : 'Contacts and Accounts'
        const confirmConvert = window.confirm(`Converting this lead will move it to ${targetSection}. Proceed?`)
        if (!confirmConvert) return fetchLeads() // Reset dropdown
        
        currentToastId = toast.loading('Converting lead...')
        await convertLeadAction(currentLead)
        toast.success(isB2C ? 'Lead converted to Customer Profile successfully!' : 'Lead converted successfully!', { id: currentToastId })
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

    const leadName = formData.custom_data?.lead_name || formData.name
    const nameCheck = validateRequired(leadName, 'Lead Name')
    if (!nameCheck.valid) { toast.error(nameCheck.error); return }

    const phoneVal = formData.custom_data?.contact_number || formData.contact_number
    const phoneCheck = validatePhone(phoneVal, { label: 'Contact Number', required: true })
    if (!phoneCheck.valid) { toast.error(phoneCheck.error); return }

    const emailVal = formData.custom_data?.email || formData.email
    const emailCheck = validateEmail(emailVal, { label: 'Email Address', required: false })
    if (!emailCheck.valid) { toast.error(emailCheck.error); return }

    let toastId;
    
    // Core fields live in their own columns; everything the user typed is also kept
    // in custom_data so non-core custom fields are preserved between edits.
    const { custom_data, ...dbFields } = formData
    const cleanPhone = sanitizePhone(phoneVal)
    const dbSafe = {
      ...dbFields,
      name: leadName.trim(),
      email: emailVal ? emailVal.trim() : null,
      company: custom_data?.company || dbFields.company || null,
      contact_number: cleanPhone,
      gender: dbFields.gender || custom_data?.gender || null,
      lead_owner: dbFields.lead_owner || profile?.name || session.user.email,
      custom_data: {
        ...(custom_data || {}),
        contact_number: cleanPhone,
        email: emailVal ? emailVal.trim() : '',
        gender: dbFields.gender || custom_data?.gender || ''
      }
    }

    try {
      if (editingLead) {
        const isConverting = formData.status === 'converted' && editingLead.status !== 'converted';
        
        if (isConverting) {
          const confirmConvert = window.confirm('Converting this lead will move it to Contacts and Accounts. Proceed?')
          if (!confirmConvert) return;
        }

        toastId = toast.loading('Updating lead...')

        if (isConverting) {
          const { status, ...otherFields } = dbSafe;
          const { error: updateErr } = await supabase
            .from('leads')
            .update(otherFields)
            .eq('id', editingLead.id)
            
          if (updateErr) throw updateErr

          await convertLeadAction({ ...editingLead, ...dbSafe })
        } else {
          const { error: updateErr } = await supabase
            .from('leads')
            .update(dbSafe)
            .eq('id', editingLead.id)
            
          if (updateErr) throw updateErr
          
          await supabase.from('activities').insert([{
            user_id: session.user.id,
            type: 'Lead Updated',
            description: `Updated details for ${dbSafe.name}`
          }])
        }
      } else {
        toastId = toast.loading('Adding lead...')
        if (formData.status === 'converted') {
           const { data: newLead, error } = await supabase
            .from('leads')
            .insert([{ ...dbSafe, status: 'new', user_id: session.user.id }])
            .select()
            .single()
            
           if (error) throw error
           await convertLeadAction({ ...newLead, ...dbSafe })
        } else {
          const payload = {
            ...dbSafe,
            user_id: session.user.id
          }
          const { error } = await supabase
            .from('leads')
            .insert([payload])
            
          if (error) throw error

          await supabase.from('activities').insert([{
            user_id: session.user.id,
            type: 'New Lead',
            description: `Added new lead: ${payload.name}`
          }])
        }
      }
      
      toast.success(editingLead ? 'Lead updated' : 'Lead added', { id: toastId })
      setIsModalOpen(false)
      fetchLeads()

      // Keep the open detail view in sync if this lead was edited from there
      if (editingLead && selectedLead?.id === editingLead.id && formData.status !== 'converted') {
        const { data: refreshed } = await supabase.from('leads').select('*').eq('id', editingLead.id).single()
        if (refreshed) setSelectedLead(refreshed)
      }
    } catch (error) {
      console.error(error)
      if (toastId) toast.error(`Error: ${error.message || 'Failed to save lead'}`, { id: toastId })
      else toast.error(`Error: ${error.message || 'Failed to save lead'}`)
    }
  }

  if (loading) return <div className="loading-container"><div className="spinner"/></div>
  
  const isAdmin = ['admin', 'administrator'].includes((session?.user?.user_metadata?.role || profile?.role || '').toLowerCase())

  return (
    <div>
      {selectedLead ? (
        <div>
          <button className="back-btn" onClick={() => setSelectedLead(null)} title="Back to Leads">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </button>
          
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="detail-header">
              <div className="detail-avatar">
                {selectedLead.name.charAt(0).toUpperCase()}
              </div>
              <div className="detail-info">
                <h1 className="detail-name">{selectedLead.name}</h1>
                <div className="detail-meta">{selectedLead.company} • {selectedLead.email}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                    {(() => { const raw = selectedLead.contact_number || selectedLead.custom_data?.contact_number; const cleaned = cleanPhoneNumber(raw); return cleaned ? formatPhoneDisplay(cleaned) : (raw || 'No phone'); })()}
                  </span>
                  <WhatsAppButton
                    phone={selectedLead.contact_number || selectedLead.custom_data?.contact_number}
                    messageText={getWhatsAppMessage('lead', {
                      firstName: (selectedLead.name || '').split(' ')[0],
                      businessName: profile?.company_name || 'our company'
                    })}
                    session={session}
                    recordName={selectedLead.name}
                  />
                </div>
                <div style={{ marginTop: 8 }}>
                  <select
                    value={selectedLead.status}
                    onChange={async (e) => {
                      const newStatus = e.target.value
                      await handleStatusChange(selectedLead.id, newStatus, selectedLead)
                      if (newStatus === 'converted') {
                        setSelectedLead(null)
                      } else {
                        setSelectedLead(prev => prev ? ({ ...prev, status: newStatus }) : null)
                      }
                    }}
                    className={`badge badge-${selectedLead.status}`}
                    style={{
                      border: 'none',
                      fontWeight: 700,
                      cursor: 'pointer',
                      outline: 'none',
                      padding: '4px 10px',
                      fontSize: '12px'
                    }}
                    title="Change status"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="working">Working</option>
                    <option value="converted">Converted</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => handleOpenModal(selectedLead)}>
                  <Edit2 size={14} style={{ marginRight: 6 }} /> Edit
                </button>
                {isAdmin && (
                  <button className="btn btn-secondary text-danger" onClick={async () => {
                    const deleted = await handleDeleteLead(selectedLead.id, selectedLead.name)
                    if (deleted) setSelectedLead(null)
                  }}>
                    <Trash2 size={14} style={{ marginRight: 6 }} /> Delete
                  </button>
                )}
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-field">
                <label>Lead ID</label>
                <span className="font-mono">{selectedLead.unique_id}</span>
              </div>
              <div className="detail-field">
                <label>Lead Owner</label>
                <span>{selectedLead.lead_owner || '—'}</span>
              </div>
              <div className="detail-field">
                <label>Gender</label>
                <span style={{ fontWeight: 600 }}>{selectedLead.gender || selectedLead.custom_data?.gender || '—'}</span>
              </div>
              <div className="detail-field">
                <label>Created Date</label>
                <span>{new Date(selectedLead.created_at).toLocaleDateString()}</span>
              </div>
              {customFieldConfigs
                .filter(f => !['name', 'lead_name', 'email', 'company', 'contact_number', 'phone', 'gender', 'lead_owner', 'status', 'unique_id'].includes(f.field_key))
                .map(f => {
                  const val = selectedLead[f.field_key] || selectedLead.custom_data?.[f.field_key]
                  if (!val && val !== false) return null
                  return (
                    <div key={f.id} className="detail-field">
                      <label>{f.field_label || f.label || f.name || f.field_key}</label>
                      <span>{String(val)}</span>
                    </div>
                  )
                })}
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
              <h1 className="page-title">{t('modules.leads.title')}</h1>
              <p className="page-subtitle">{t('modules.leads.subtitle')}</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => setIsFieldBuilderOpen(true)}>
                <Settings size={18} style={{ marginRight: 6 }} /> {t('modules.leads.editFields')}
              </button>
              <button className="btn btn-secondary" onClick={() => setIsImportOpen(true)}>
                <UploadCloud size={18} style={{ marginRight: 6 }} /> {t('bulkImport.button', 'Import Excel/CSV')}
              </button>
              <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                <Plus size={18} style={{ marginRight: 6 }} /> {t('modules.leads.addNewLead')}
              </button>
            </div>
          </div>

          <div className="table-container">
            <div className="table-header">
              <h2 className="table-title">{t('modules.leads.allLeads')} ({leads.length})</h2>
              <LocalSearch 
                 data={leads} 
                 searchKeys={['name', 'company', 'email', 'unique_id']} 
                 onSelect={(item) => handleOpenModal(item)} 
                 placeholder={t('modules.leads.searchPlaceholder')} 
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
                    {customFieldConfigs.filter(f => f.show_in_list && !['lead_name', 'email', 'company'].includes(f.field_key)).map(f => (
                      <th key={f.id}>{f.label}</th>
                    ))}
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
                        <td onClick={(e) => e.stopPropagation()}>
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
                        {customFieldConfigs.filter(f => f.show_in_list && !['lead_name', 'email', 'company'].includes(f.field_key)).map(f => (
                          <td key={f.id} className="text-muted" style={{ fontSize: 13 }}>
                            {lead[f.field_key] || lead.custom_data?.[f.field_key] || '-'}
                          </td>
                        ))}
                        <td className="text-muted">{new Date(lead.created_at).toLocaleDateString()}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            {isB2C && lead.status !== 'converted' && (
                              <button 
                                className="btn btn-primary btn-sm" 
                                style={{ padding: '4px 8px', fontSize: 11 }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStatusChange(lead.id, 'converted', lead)
                                }}
                                title="Convert to Opportunity"
                              >
                                <ArrowRightCircle size={13} style={{ marginRight: 3 }} /> Convert
                              </button>
                            )}
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
                {customFieldConfigs.length > 0 ? (
                  customFieldConfigs.map(f => (
                    <div key={f.id} className={`form-group ${f.field_type === 'long_text' ? 'full-width' : ''}`}>
                      <label className="form-label">{f.label} {f.is_required && <span style={{ color: '#ef4444' }}>*</span>}</label>
                      {f.field_type === 'dropdown' ? (
                        <select 
                          required={f.is_required}
                          className="form-input"
                          value={formData.custom_data?.[f.field_key] || ''}
                          onChange={e => setFormData({
                            ...formData, 
                            custom_data: { ...formData.custom_data, [f.field_key]: e.target.value },
                            ...(f.field_key === 'gender' ? { gender: e.target.value } : {})
                          })}
                        >
                          <option value="">Select {f.label}</option>
                          {(f.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : f.field_type === 'long_text' ? (
                        <textarea 
                          required={f.is_required}
                          className="form-input"
                          rows={3}
                          value={formData.custom_data?.[f.field_key] || ''}
                          onChange={e => setFormData({
                            ...formData, 
                            custom_data: { ...formData.custom_data, [f.field_key]: e.target.value } 
                          })}
                          placeholder={`Enter ${f.label.toLowerCase()}...`}
                        />
                      ) : (
                        <input 
                          type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'}
                          required={f.is_required}
                          className="form-input"
                          value={formData.custom_data?.[f.field_key] || ''}
                          onChange={e => setFormData({
                            ...formData, 
                            custom_data: { ...formData.custom_data, [f.field_key]: e.target.value } 
                          })}
                          placeholder={`Enter ${f.label.toLowerCase()}...`}
                        />
                      )}
                    </div>
                  ))
                ) : (
                  /* Fallback core fields when custom field configs haven't loaded */
                  <>
                    <div className="form-group">
                      <label className="form-label">Lead Name <span style={{ color: '#ef4444' }}>*</span></label>
                      <input 
                        type="text"
                        required
                        className="form-input"
                        value={formData.name || formData.custom_data?.lead_name || ''}
                        onChange={e => setFormData({
                          ...formData,
                          name: e.target.value,
                          custom_data: { ...formData.custom_data, lead_name: e.target.value }
                        })}
                        placeholder="Enter lead name..."
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Company Name</label>
                      <input 
                        type="text"
                        className="form-input"
                        value={formData.company || formData.custom_data?.company || ''}
                        onChange={e => setFormData({
                          ...formData,
                          company: e.target.value,
                          custom_data: { ...formData.custom_data, company: e.target.value }
                        })}
                        placeholder="Enter company name..."
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contact Number (10 digits) <span style={{ color: '#ef4444' }}>*</span></label>
                      <input 
                        type="tel"
                        required
                        maxLength={10}
                        inputMode="numeric"
                        className="form-input"
                        value={formData.custom_data?.contact_number || formData.contact_number || ''}
                        onChange={e => {
                          const sanitized = sanitizePhone(e.target.value)
                          setFormData({
                            ...formData,
                            contact_number: sanitized,
                            custom_data: { ...formData.custom_data, contact_number: sanitized }
                          })
                        }}
                        placeholder="10-digit mobile number (e.g. 9876543210)"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <input
                        type="email"
                        className="form-input"
                        value={formData.email || formData.custom_data?.email || ''}
                        onChange={e => setFormData({
                          ...formData,
                          email: e.target.value,
                          custom_data: { ...formData.custom_data, email: e.target.value }
                        })}
                        placeholder="e.g. user@gmail.com"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Gender</label>
                      <select
                        className="form-input"
                        value={formData.gender || formData.custom_data?.gender || ''}
                        onChange={e => setFormData({
                          ...formData,
                          gender: e.target.value,
                          custom_data: { ...formData.custom_data, gender: e.target.value }
                        })}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label className="form-label">Lead Owner</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.lead_owner || ''}
                    onChange={e => setFormData({ ...formData, lead_owner: e.target.value })}
                    placeholder="Enter lead owner..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={formData.status || 'new'}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="working">Working</option>
                    <option value="lost">Lost</option>
                    {editingLead && <option value="converted">Converted</option>}
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

      <BulkUploadModal
        module="leads"
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        session={session}
        profile={profile}
        onImported={fetchLeads}
      />

      <FieldBuilderModal 
        module="lead"
        businessId={session.user.id}
        isOpen={isFieldBuilderOpen}
        onClose={() => {
          setIsFieldBuilderOpen(false)
          fetchCustomConfigs()
        }}
      />
    </div>
  )
}
