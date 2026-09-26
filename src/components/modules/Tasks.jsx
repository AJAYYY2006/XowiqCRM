import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { 
  Trash2, Edit2, Calendar, User, Tag, Link2, CheckCircle2, Clock, 
  PlayCircle, AlertCircle, CheckCircle, Settings, Save, UploadCloud,
  ArrowLeft, ChevronRight, ExternalLink, MessageSquare, Send, Check 
} from 'lucide-react'
import LocalSearch from '../ui/LocalSearch'
import FieldBuilderModal from '../ui/FieldBuilderModal'
import BulkUploadModal from '../ui/BulkUploadModal'
import { useRole } from '../../contexts/RoleContext'

const TASK_TYPES = ['Follow-up', 'Demo', 'Onboarding', 'Renewal', 'Support', 'Email', 'Message', 'Call', 'Events']
const STATUS_STAGES = ['Pending', 'In Progress', 'Completed', 'Overdue']
const RELATED_ENTITIES = [
  { value: 'leads', label: 'Lead' },
  { value: 'contacts', label: 'Contact' },
  { value: 'accounts', label: 'Account' },
  { value: 'opportunities', label: 'Opportunity' },
  { value: 'invoices', label: 'Invoice' },
  { value: 'quotes', label: 'Quote' },
  { value: 'tickets', label: 'Ticket' }
]

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

export default function Tasks({ session, profile }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [taskActivities, setTaskActivities] = useState([])
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [viewMode, setViewMode] = useState('active') // 'active' or 'history'
  
  const roleContext = useRole?.()
  const isAdmin = roleContext ? roleContext.isAdmin : (session?.user?.user_metadata?.role || profile?.role || '').toLowerCase() === 'admin'
  const companyType = session.user.user_metadata?.companyType || 'B2B'
  const isB2C = companyType === 'B2C'

  // Entity data for relationships
  const [entityData, setEntityData] = useState({
    leads: [], contacts: [], accounts: [], opportunities: [], invoices: [], quotes: [], tickets: []
  })

  const [formData, setFormData] = useState({
    title: '',
    due_date: '',
    status: 'Pending',
    task_type: 'Follow-up',
    owner: profile?.name || session.user.email,
    related_to: 'accounts',
    related_id: '',
    custom_data: {}
  })

  const [taskConfigs, setTaskConfigs] = useState([])
  const [isFieldBuilderOpen, setIsFieldBuilderOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)

  const fetchTaskConfigs = async () => {
    try {
      const { data: existing, error } = await supabase
        .from('custom_field_configs')
        .select('*')
        .eq('business_id', session.user.id)
        .eq('module', 'task')
        .order('display_order', { ascending: true })
      
      if (error) throw error

      const coreFieldsTarget = [
        { label: 'Task Title', field_key: 'title', field_type: 'text', is_core: true, order: 0 },
        { label: 'Due Date', field_key: 'due_date', field_type: 'date', is_core: true, order: 1 },
        { label: 'Status', field_key: 'status', field_type: 'dropdown', options: STATUS_STAGES, is_core: true, order: 2 },
        { label: 'Task Type', field_key: 'task_type', field_type: 'dropdown', options: TASK_TYPES, is_core: true, order: 3 },
        { label: 'Owner', field_key: 'owner', field_type: 'text', is_core: true, order: 4 },
        { label: 'Relationship', field_key: 'related_to', field_type: 'text', is_core: true, order: 5 }
      ]

      let finalData = existing || []
      const missingCore = coreFieldsTarget.filter(t => !finalData.find(f => f.field_key === t.field_key))

      if (missingCore.length > 0) {
        const toInsert = missingCore.map(c => ({
          business_id: session.user.id,
          module: 'task',
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

      setTaskConfigs(finalData.filter(f => !f.is_archived))
    } catch (err) {
      console.error('Error loading task configs:', err)
    }
  }

  const location = useLocation()
  const userIds = profile?.teamUserIds || [session.user.id]

  useEffect(() => {
    fetchTasks()
    fetchAllEntities()
    fetchTaskConfigs()
  }, [session, profile])

  useEffect(() => {
    if (tasks.length > 0 && location.state?.openId) {
      const tsk = tasks.find(t => t.id === location.state.openId)
      if (tsk) {
        setSelectedTask(tsk)
        window.history.replaceState({}, document.title)
      }
    }
  }, [tasks, location.state])

  useEffect(() => {
    if (selectedTask) {
      fetchTaskActivities(selectedTask)
    }
  }, [selectedTask?.id])

  const fetchTaskActivities = async (task) => {
    if (!task) return
    try {
      const { data } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', session.user.id)
        .ilike('description', `%${task.title}%`)
        .order('created_at', { ascending: false })
        .limit(15)
      setTaskActivities(data || [])
    } catch (e) {
      console.warn('Could not load task activities:', e)
    }
  }

  const handleUpdateTaskStatus = async (task, newStatus) => {
    if (newStatus === 'Completed') {
      await handleMarkComplete(task)
      return
    }
    const toastId = toast.loading(`Updating status to ${newStatus}...`)
    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, updated_at: now })
        .eq('id', task.id)
      if (error) throw error

      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: `Task ${newStatus}`,
        description: `Status of "${task.title}" updated to ${newStatus}`
      }])

      toast.success(`Status updated to ${newStatus}`, { id: toastId })
      const updated = { ...task, status: newStatus, updated_at: now }
      if (selectedTask?.id === task.id) {
        setSelectedTask(updated)
      }
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
      fetchTaskActivities(updated)
    } catch (err) {
      toast.error(err.message, { id: toastId })
    }
  }

  const handleAddNote = async (e) => {
    e.preventDefault()
    if (!newNote.trim() || !selectedTask) return
    setAddingNote(true)
    const toastId = toast.loading('Adding note...')
    try {
      const noteDesc = `Note on task "${selectedTask.title}": ${newNote.trim()}`
      const { data, error } = await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Task Note',
        description: noteDesc
      }]).select()
      if (error) throw error
      toast.success('Note added', { id: toastId })
      setNewNote('')
      setTaskActivities(prev => [data[0], ...prev])
    } catch (err) {
      toast.error('Failed to add note', { id: toastId })
    } finally {
      setAddingNote(false)
    }
  }

  const handleNavigateToRelated = (relatedTo, relatedId) => {
    if (!relatedTo || !relatedId) return
    const routeMap = {
      accounts: 'accounts',
      contacts: 'contacts',
      leads: 'leads',
      opportunities: 'opportunities',
      invoices: 'invoices',
      quotes: 'quotes',
      tickets: 'tickets'
    }
    const target = routeMap[relatedTo] || relatedTo
    navigate(`/dashboard/${target}`, { state: { openId: relatedId } })
  }

  const getRelatedEntityLabel = (relatedTo) => {
    switch (relatedTo) {
      case 'accounts': return isB2C ? 'Customer Account' : 'Company Account'
      case 'contacts': return 'Contact Person'
      case 'leads': return 'Sales Lead'
      case 'opportunities': return 'Deal Opportunity'
      case 'invoices': return 'Billing Invoice'
      case 'quotes': return 'Quote / Proposal'
      case 'tickets': return 'Support Ticket'
      default: return relatedTo ? String(relatedTo).charAt(0).toUpperCase() + String(relatedTo).slice(1) : 'Record'
    }
  }

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .in('user_id', userIds)
        .order('due_date', { ascending: true })
      
      if (error) throw error
      
      // Auto-update to Overdue if needed
      const today = new Date(); today.setHours(0,0,0,0)
      const updatedData = (data || []).map(t => {
        if (t.status !== 'Completed' && t.due_date && new Date(t.due_date) < today && t.status !== 'Overdue') {
          return { ...t, status: 'Overdue' }
        }
        return t
      })
      
      setTasks(updatedData)
    } catch (error) {
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllEntities = async () => {
    try {
      const results = await Promise.all([
        supabase.from('leads').select('id, name').in('user_id', userIds),
        supabase.from('contacts').select('id, name').in('user_id', userIds),
        supabase.from('accounts').select('id, account_name').in('user_id', userIds),
        supabase.from('opportunities').select('id, name').in('user_id', userIds),
        supabase.from('invoices').select('id, invoice_name').in('user_id', userIds),
        supabase.from('quotes').select('id, quote_name').in('user_id', userIds),
        supabase.from('tickets').select('id, subject').in('user_id', userIds)
      ])

      setEntityData({
        leads: results[0].data || [],
        contacts: results[1].data || [],
        accounts: results[2].data || [],
        opportunities: results[3].data || [],
        invoices: results[4].data || [],
        quotes: results[5].data || [],
        tickets: results[6].data || []
      })
    } catch (error) {
      console.error('Failed to fetch entities:', error)
    }
  }

  const handleOpenModal = (task = null) => {
    if (task) {
      setEditingTask(task)
      setFormData({
        title: task.title,
        due_date: task.due_date || '',
        status: task.status || 'Pending',
        task_type: task.task_type || 'Follow-up',
        owner: task.owner || profile?.name || session.user.email,
        related_to: task.related_to || 'accounts',
        related_id: task.related_id || '',
        custom_data: task.custom_data || {}
      })
    } else {
      setEditingTask(null)
      setFormData({
        title: '',
        due_date: '',
        status: 'Pending',
        task_type: 'Follow-up',
        owner: profile?.name || session.user.email,
        related_to: 'accounts',
        related_id: '',
        custom_data: {}
      })
    }
    setIsModalOpen(true)
  }

  const handleMarkComplete = async (task) => {
    const toastId = toast.loading('Marking as completed...')
    try {
      const now = new Date().toISOString()
      
      // 1. Update status
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'Completed', updated_at: now })
        .eq('id', task.id)
      
      if (error) throw error

      // 2. Interaction History Log
      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Task Completed',
        description: `Completed ${task.task_type}: ${task.title}` + (task.related_id ? ` for ${getRelatedName(task)}` : '')
      }])

      // 3. Auto-generate next follow-up if type is "Follow-up"
      if (task.task_type === 'Follow-up' && task.related_id) {
        const nextDue = new Date()
        nextDue.setDate(nextDue.getDate() + 7)
        
        await supabase.from('tasks').insert([{
          title: `Next Follow-up: ${task.title}`,
          task_type: 'Follow-up',
          due_date: nextDue.toISOString().split('T')[0],
          status: 'Pending',
          owner: task.owner,
          related_to: task.related_to,
          related_id: task.related_id,
          user_id: session.user.id
        }])
        toast.success('Next follow-up generated (+7 days)')
      }

      // 4. Lead Status Update (Behavior 1.4)
      if (task.related_to === 'leads' && task.related_id) {
        // Check if all other tasks for this lead are completed
        const { data: otherTasks } = await supabase
          .from('tasks')
          .select('status')
          .eq('related_to', 'leads')
          .eq('related_id', task.related_id)
          .neq('id', task.id)
        
        const allDone = (otherTasks || []).every(t => t.status === 'Completed')
        if (allDone) {
          await supabase.from('leads').update({ status: 'Nurturing Complete' }).eq('id', task.related_id)
          toast.success('Lead status updated to: Nurturing Complete')
        }
      }

      toast.success('Task marked as completed', { id: toastId })
      fetchTasks()
      if (selectedTask?.id === task.id) {
        setSelectedTask(prev => prev ? { ...prev, status: 'Completed', updated_at: now } : null)
      }
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleSnooze = async (task) => {
    const toastId = toast.loading('Snoozing task (+24h)...')
    try {
      const currentDue = task.due_date ? new Date(task.due_date) : new Date()
      currentDue.setDate(currentDue.getDate() + 1)
      
      const { error } = await supabase
        .from('tasks')
        .update({ due_date: currentDue.toISOString().split('T')[0], status: 'Pending' })
        .eq('id', task.id)
      
      if (error) throw error
      toast.success('Snoozed to tomorrow', { id: toastId })
      fetchTasks()
      if (selectedTask?.id === task.id) {
        setSelectedTask(prev => prev ? { ...prev, due_date: currentDue.toISOString().split('T')[0], status: 'Pending' } : null)
      }
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingTask ? 'Updating task...' : 'Creating task...')
    
    try {
      const payload = {
        ...formData,
        // Convert empty strings to null for database compatibility (UUID/Date fields)
        related_id: formData.related_id || null,
        due_date: formData.due_date || null,
        user_id: session.user.id
      }

      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update(payload)
          .eq('id', editingTask.id)
        if (error) throw error
        
        // Behavior 1.1 logic if status changed to Completed here
        if (formData.status === 'Completed' && editingTask.status !== 'Completed') {
          handleMarkComplete(editingTask) // Uses existing logic for follow-ups
          return // handleMarkComplete handles the close/refresh
        }
        
        toast.success('Task updated', { id: toastId })
        if (selectedTask?.id === editingTask.id) {
          setSelectedTask({ ...editingTask, ...payload })
        }
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([payload])
        if (error) throw error
        toast.success('Task created', { id: toastId })
      }
      
      setIsModalOpen(false)
      fetchTasks()
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleDeleteTask = async (task) => {
    if (!isAdmin) {
      toast.error('Only Super Admin can delete tasks')
      return
    }
    if (!confirm('Are you sure you want to delete this task?')) return
    const toastId = toast.loading('Deleting task...')
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', task.id)
      if (error) throw error
      toast.success('Task deleted', { id: toastId })
      fetchTasks()
      if (selectedTask?.id === task.id) {
        setSelectedTask(null)
      }
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed': return <CheckCircle2 size={18} className="text-success" />
      case 'In Progress': return <PlayCircle size={18} style={{ color: '#3b82f6' }} />
      case 'Pending': return <Clock size={18} style={{ color: '#f59e0b' }} />
      case 'Overdue': return <AlertCircle size={18} className="text-danger" />
      default: return <Clock size={18} style={{ color: '#6b7280' }} />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return '#16a34a' // Green
      case 'In Progress': return '#3b82f6' // Blue
      case 'Overdue': return '#dc2626' // Red
      case 'Pending': return '#f59e0b' // Yellow (prompt said Yellow for In Progress, but standard is Pending=Yellow)
      default: return '#6b7280'
    }
  }

  const getRelatedName = (task) => {
    if (!task.related_to || !task.related_id) return 'None'
    const list = entityData[task.related_to] || []
    const item = list.find(i => i.id === task.related_id)
    return item ? (item.name || item.account_name || item.invoice_name || item.quote_name || item.subject) : 'Unknown'
  }

  const filteredTasksByStatus = tasks.filter(t => 
    viewMode === 'active' ? t.status !== 'Completed' : t.status === 'Completed'
  )

  const groupTasks = (taskList) => {
    const today = new Date(); today.setHours(0,0,0,0)
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
    const endOfWeek = new Date(today); endOfWeek.setDate(today.getDate() + (7 - today.getDay()))

    return {
      overdue: taskList.filter(t => t.status === 'Overdue' || (t.due_date && new Date(t.due_date) < today)),
      today: taskList.filter(t => t.due_date && new Date(t.due_date).setHours(0,0,0,0) === today.getTime()),
      thisWeek: taskList.filter(t => t.due_date && new Date(t.due_date) >= tomorrow && new Date(t.due_date) <= endOfWeek),
      upcoming: taskList.filter(t => !t.due_date || new Date(t.due_date) > endOfWeek)
    }
  }

  const groups = groupTasks(filteredTasksByStatus)

  const renderTaskTable = (taskList, title, color) => {
    if (taskList.length === 0) return null;

    return (
      <div key={title} style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 13, color: color, marginBottom: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
          {title.toUpperCase()} ({taskList.length})
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                {taskConfigs.filter(c => c.show_in_list).map(config => (
                  <th key={config.id}>{config.label}</th>
                ))}
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {taskList.map(task => (
                <tr 
                  key={task.id}
                  className="clickable-row"
                  onClick={() => setSelectedTask(task)}
                  style={{ cursor: 'pointer' }}
                >
                  <td onClick={(e) => { e.stopPropagation(); handleUpdateTaskStatus(task, task.status === 'Completed' ? 'Pending' : 'Completed') }} title="Click to toggle status">
                    {getStatusIcon(task.status)}
                  </td>
                  {taskConfigs.filter(c => c.show_in_list).map(config => {
                    if (config.field_key === 'title') {
                      return (
                        <td key={config.id}>
                          <div className="fw-bold" style={{ color: 'var(--text-primary)' }}>{task.title}</div>
                          {task.unique_id && <div style={{ fontFamily: 'monospace', fontSize: 11, opacity: 0.6 }}>{task.unique_id}</div>}
                        </td>
                      )
                    }
                    if (config.field_key === 'task_type') {
                      return (
                        <td key={config.id}>
                          <span className="badge badge-normal">{task.task_type}</span>
                        </td>
                      )
                    }
                    if (config.field_key === 'related_to') {
                      return (
                        <td key={config.id}>
                          <div className="text-muted" style={{ fontSize: '12px' }}>
                            <span style={{ textTransform: 'capitalize' }}>
                              {task.related_to === 'accounts' ? (isB2C ? 'Customer' : 'Account') : task.related_to || '-'}:
                            </span> {getRelatedName(task)}
                          </div>
                        </td>
                      )
                    }
                    if (config.field_key === 'due_date') {
                      return (
                        <td key={config.id}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', color: task.status === 'Overdue' ? '#dc2626' : 'inherit' }}>
                            <Calendar size={14} className="text-muted" />
                            {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No deadline'}
                          </div>
                        </td>
                      )
                    }
                    if (config.field_key === 'owner') {
                      return (
                        <td key={config.id}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px' }}>
                            <User size={14} className="text-muted" />
                            {task.owner}
                          </div>
                        </td>
                      )
                    }
                    if (config.field_key === 'status') {
                      return (
                        <td key={config.id}>
                          <span style={{ 
                            fontSize: '11px', fontWeight: 800, padding: '4px 8px', borderRadius: '12px',
                            background: `${getStatusColor(task.status)}15`, color: getStatusColor(task.status)
                          }}>
                            {task.status}
                          </span>
                        </td>
                      )
                    }
                    return <td key={config.id}>{task[config.field_key] || task.custom_data?.[config.field_key] || '—'}</td>
                  })}
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                      {task.status !== 'Completed' && (
                        <>
                          <button className="btn btn-sm btn-secondary" style={{ color: '#16a34a', border: '1px solid #dcfce3', background: '#f0fdf4' }} onClick={(e) => { e.stopPropagation(); handleMarkComplete(task); }}>
                            <CheckCircle size={14} style={{ marginRight: 4 }} /> Done
                          </button>
                          <button className="btn btn-sm btn-secondary" style={{ color: '#f37a23', border: '1px solid #fff5f0', background: '#fff5f0' }} onClick={(e) => { e.stopPropagation(); handleSnooze(task); }}>
                            <Clock size={14} style={{ marginRight: 4 }} /> Snooze
                          </button>
                        </>
                      )}
                      <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleOpenModal(task); }}><Edit2 size={16} /></button>
                      {isAdmin && (
                        <button className="btn-icon text-danger" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task); }}><Trash2 size={16} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (loading) return <div className="loading-container"><div className="spinner" /></div>
  
  return (
    <div>
      {selectedTask ? (
        /* --- TASK DETAIL VIEW ("INSIDE THE TASK") --- */
        <div className="animate-in fade-in">
          {/* Back Button */}
          <button 
            type="button"
            className="back-btn" 
            onClick={() => setSelectedTask(null)} 
            title="Back to Tasks"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              marginBottom: 20,
              background: 'var(--bg-card, #ffffff)',
              border: '1px solid var(--border-subtle, #e2e8f0)',
              borderRadius: 10,
              color: 'var(--text-secondary, #475569)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Tasks</span>
          </button>

          {/* Header Card */}
          <div className="card" style={{ marginBottom: 24, padding: 28, borderRadius: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, minWidth: 0, flex: 1 }}>
                <div 
                  style={{ 
                    width: 52, 
                    height: 52, 
                    borderRadius: 14, 
                    background: selectedTask.status === 'Completed'
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : selectedTask.status === 'In Progress'
                        ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                        : selectedTask.status === 'Overdue'
                          ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                          : 'linear-gradient(135deg, #ff5900 0%, #ea580c 100%)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: '#ffffff',
                    flexShrink: 0,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.12)'
                  }}
                >
                  {selectedTask.status === 'Completed' ? <CheckCircle2 size={26} /> :
                   selectedTask.status === 'In Progress' ? <PlayCircle size={26} /> :
                   selectedTask.status === 'Overdue' ? <AlertCircle size={26} /> :
                   <Clock size={26} />}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: 0, wordBreak: 'break-word' }}>
                      {selectedTask.title}
                    </h1>
                    {selectedTask.unique_id && <span style={{ fontFamily: 'monospace', fontSize: 12, opacity: 0.6 }}>{selectedTask.unique_id}</span>}
                    <span style={{ 
                      fontSize: 11, 
                      fontWeight: 800, 
                      padding: '4px 10px', 
                      borderRadius: 20,
                      background: `${getStatusColor(selectedTask.status)}18`, 
                      color: getStatusColor(selectedTask.status),
                      border: `1px solid ${getStatusColor(selectedTask.status)}30`,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em'
                    }}>
                      {selectedTask.status}
                    </span>
                    <span className="badge badge-normal" style={{ fontSize: 11, fontWeight: 700 }}>
                      {selectedTask.task_type}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: 'var(--text-muted, #94a3b8)', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <User size={14} className="text-muted" />
                      Assigned to <strong style={{ color: 'var(--text-secondary, #475569)', marginLeft: 3 }}>{selectedTask.owner}</strong>
                    </span>
                    <span>•</span>
                    <span>Created on {new Date(selectedTask.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {selectedTask.due_date && (
                      <>
                        <span>•</span>
                        <span style={{ color: selectedTask.status === 'Overdue' ? '#dc2626' : 'var(--text-secondary, #475569)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={14} /> Due {new Date(selectedTask.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Top Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {selectedTask.status !== 'Completed' && (
                  <button 
                    type="button"
                    className="btn btn-primary" 
                    onClick={() => handleMarkComplete(selectedTask)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: 'linear-gradient(135deg, #10b981, #059669)', borderColor: '#059669' }}
                  >
                    <CheckCircle size={15} />
                    <span>Mark as Done</span>
                  </button>
                )}

                {selectedTask.status !== 'Completed' && (
                  <button 
                    type="button"
                    className="btn btn-secondary" 
                    onClick={() => handleSnooze(selectedTask)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px' }}
                  >
                    <Clock size={15} style={{ color: '#f59e0b' }} />
                    <span>Snooze (+24h)</span>
                  </button>
                )}

                <button 
                  type="button"
                  className="btn btn-secondary" 
                  onClick={() => handleOpenModal(selectedTask)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px' }}
                >
                  <Edit2 size={15} />
                  <span>Edit</span>
                </button>

                {isAdmin && (
                  <button 
                    type="button"
                    className="btn btn-secondary text-danger" 
                    onClick={() => handleDeleteTask(selectedTask)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px' }}
                  >
                    <Trash2 size={15} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Workflow Stage Progress Bar */}
          <div className="card" style={{ marginBottom: 24, padding: 24, borderRadius: 16 }}>
            <label className="form-label" style={{ marginBottom: 14, display: 'block', color: 'var(--text-muted)' }}>
              Workflow Stage
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {['Pending', 'In Progress', 'Completed'].map((stageName, idx, arr) => {
                const isCurrent = selectedTask.status === stageName
                const isDone = (selectedTask.status === 'Completed') || (selectedTask.status === 'In Progress' && stageName === 'Pending')
                return (
                  <div key={stageName} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 130 }}>
                    <button
                      type="button"
                      onClick={() => handleUpdateTaskStatus(selectedTask, stageName)}
                      style={{
                        width: '100%',
                        minHeight: 46,
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        border: isCurrent ? '1.5px solid #ff5900' : isDone ? '1.5px solid rgba(16, 185, 129, 0.4)' : '1.5px solid var(--border-subtle, #e2e8f0)',
                        background: isCurrent 
                          ? 'linear-gradient(135deg, #ff5900 0%, #ea580c 100%)' 
                          : isDone 
                            ? 'rgba(16, 185, 129, 0.12)' 
                            : 'var(--bg-primary, #f8fafc)',
                        color: isCurrent ? '#ffffff' : isDone ? '#059669' : 'var(--text-primary, #334155)',
                        fontWeight: isCurrent ? 800 : 700,
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        transition: 'all 0.15s ease',
                        boxShadow: isCurrent ? '0 4px 12px rgba(255, 89, 0, 0.28)' : 'none'
                      }}
                    >
                      {isDone && <Check size={14} strokeWidth={2.5} style={{ color: '#059669' }} />}
                      <span>{stageName}</span>
                    </button>
                    {idx < arr.length - 1 && <ChevronRight size={14} style={{ color: 'var(--text-muted, #94a3b8)', flexShrink: 0 }} />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* 2-Column Details & Interaction Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 32 }}>
            {/* Left Card: Task Details & Associated Entity */}
            <div className="card" style={{ padding: 24, borderRadius: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18, color: 'var(--text-primary, #0f172a)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag size={18} style={{ color: '#ff5900' }} /> Task Information
              </h3>

              <div className="detail-grid" style={{ gap: 16 }}>
                {/* Associated Record Card */}
                <div className="detail-field" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>Associated CRM Record</label>
                  {selectedTask.related_to && selectedTask.related_id ? (
                    <div 
                      onClick={() => handleNavigateToRelated(selectedTask.related_to, selectedTask.related_id)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '12px 16px', 
                        background: 'var(--bg-primary, #f8fafc)', 
                        border: '1px solid var(--border-subtle, #e2e8f0)',
                        borderRadius: 12,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        marginTop: 4
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff5900'; e.currentTarget.style.background = 'rgba(255, 89, 0, 0.04)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle, #e2e8f0)'; e.currentTarget.style.background = 'var(--bg-primary, #f8fafc)'; }}
                      title="Click to view related record"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ff590015', color: '#ff5900', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Link2 size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', fontWeight: 700 }}>
                            {getRelatedEntityLabel(selectedTask.related_to)}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                            {getRelatedName(selectedTask)}
                          </div>
                        </div>
                      </div>
                      <ExternalLink size={15} style={{ color: '#ff5900' }} />
                    </div>
                  ) : (
                    <div style={{ padding: '12px 16px', background: 'var(--bg-primary, #f8fafc)', borderRadius: 10, color: 'var(--text-muted, #94a3b8)', fontSize: 13, marginTop: 4 }}>
                      No linked record. Click "Edit" to associate this task with an Account, Lead, or Opportunity.
                    </div>
                  )}
                </div>

                <div className="detail-field">
                  <label style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>Task Category</label>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>{selectedTask.task_type}</span>
                </div>

                <div className="detail-field">
                  <label style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>Assigned Owner</label>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>{selectedTask.owner}</span>
                </div>

                <div className="detail-field">
                  <label style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>Due Date</label>
                  <span style={{ fontSize: 14, fontWeight: 600, color: selectedTask.status === 'Overdue' ? '#dc2626' : 'var(--text-primary, #0f172a)' }}>
                    {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline set'}
                  </span>
                </div>

                <div className="detail-field">
                  <label style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>Urgency Status</label>
                  <span style={{ fontSize: 13, fontWeight: 700, color: getStatusColor(selectedTask.status) }}>
                    {selectedTask.status === 'Completed' ? 'Completed' :
                     selectedTask.status === 'Overdue' ? 'Overdue Deadline' :
                     selectedTask.due_date ? (new Date(selectedTask.due_date).setHours(0,0,0,0) === new Date().setHours(0,0,0,0) ? 'Due Today' : 'On Track') : 'Flexible'}
                  </span>
                </div>

                {/* Custom Fields */}
                {taskConfigs.filter(c => !c.is_core).map(config => (
                  <div key={config.id} className="detail-field">
                    <label style={{ fontSize: 12, color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>{config.label}</label>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                      {selectedTask.custom_data?.[config.field_key] ? String(selectedTask.custom_data[config.field_key]) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Card: Progress Notes & Activity Stream */}
            <div className="card" style={{ padding: 24, borderRadius: 16, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18, color: 'var(--text-primary, #0f172a)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare size={18} style={{ color: '#ff5900' }} /> Activity & Progress Notes
              </h3>

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} style={{ marginBottom: 20 }}>
                <textarea
                  className="form-input"
                  placeholder="Log an update or note for this task..."
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  style={{ width: '100%', minHeight: 76, padding: '10px 14px', borderRadius: 10, fontSize: 13, resize: 'vertical', marginBottom: 10 }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    type="submit" 
                    disabled={addingNote || !newNote.trim()}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}
                  >
                    <Send size={13} />
                    <span>{addingNote ? 'Saving...' : 'Add Note'}</span>
                  </button>
                </div>
              </form>

              {/* Activity Timeline List */}
              <div style={{ flex: 1, overflowY: 'auto', maxHeight: 320, paddingRight: 4 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 10 }}>
                  Recent Task History
                </label>
                {taskActivities.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)', fontSize: 13, background: 'var(--bg-primary, #f8fafc)', borderRadius: 10 }}>
                    No recent activities recorded for this task.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {taskActivities.map((act) => (
                      <div 
                        key={act.id} 
                        style={{ 
                          padding: '12px 14px', 
                          background: 'var(--bg-primary, #f8fafc)', 
                          border: '1px solid var(--border-subtle, #e2e8f0)',
                          borderRadius: 10,
                          fontSize: 13
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 12, color: '#ff5900' }}>
                            {act.type}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted, #94a3b8)' }}>
                            {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(act.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-primary, #334155)', lineHeight: 1.4 }}>
                          {act.description}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* --- TASK LIST VIEW --- */
        <div>
          <div className="page-header">
            <div>
              <h1 className="page-title">{isB2C ? t('modules.tasks.titleB2C') : t('modules.tasks.title')}</h1>
              <p className="page-subtitle">{isB2C ? t('modules.tasks.subtitleB2C') : t('modules.tasks.subtitle')}</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setIsFieldBuilderOpen(true)}>
                <Settings size={14} /> {t('modules.tasks.editFields')}
              </button>
              <button className="btn btn-secondary" onClick={() => setIsImportOpen(true)}>
                <UploadCloud size={14} style={{ marginRight: 6 }} /> {t('bulkImport.button', 'Import Excel/CSV')}
              </button>
              <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                <span style={{ fontSize: 18 }}>+</span> {t('modules.tasks.createTask')}
              </button>
            </div>
          </div>

          <div className="table-container">
            <div className="table-header" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 0 }}>
              <div style={{ display: 'flex', gap: 24 }}>
                <button 
                  onClick={() => setViewMode('active')}
                  style={{
                    padding: '16px 4px', fontSize: 14, fontWeight: 700,
                    borderBottom: viewMode === 'active' ? '3px solid #f37a23' : '3px solid transparent',
                    color: viewMode === 'active' ? '#f37a23' : '#64748b',
                    background: 'none', borderLeft: 'none', borderRight: 'none', borderTop: 'none',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {t('modules.tasks.activeTasks')} ({tasks.filter(t => t.status !== 'Completed').length})
                </button>
                <button 
                  onClick={() => setViewMode('history')}
                  style={{
                    padding: '16px 4px', fontSize: 14, fontWeight: 700,
                    borderBottom: viewMode === 'history' ? '3px solid #f37a23' : '3px solid transparent',
                    color: viewMode === 'history' ? '#f37a23' : '#64748b',
                    background: 'none', borderLeft: 'none', borderRight: 'none', borderTop: 'none',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {t('modules.tasks.taskHistory')} ({tasks.filter(t => t.status === 'Completed').length})
                </button>
              </div>
              <div style={{ marginLeft: 'auto', paddingBottom: 12 }}>
                <LocalSearch 
                  data={tasks}
                  searchKeys={['title', 'task_type', 'owner']}
                  onSelect={(item) => setSelectedTask(item)}
                  placeholder={t('modules.tasks.searchPlaceholder')}
                  renderItem={(item) => (
                    <>
                      <div className="fw-bold" style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.title}</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>{item.task_type} • {item.owner}</div>
                    </>
                  )}
                />
              </div>
            </div>

            <div style={{ padding: 20 }}>
              {filteredTasksByStatus.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>✨</div>
                  <h3>No {viewMode} tasks</h3>
                  <p>Everything looks clean here!</p>
                </div>
              ) : (
                viewMode === 'active' ? (
                  <>
                    {renderTaskTable(groups.overdue, 'Overdue', '#dc2626')}
                    {renderTaskTable(groups.today, 'Today', '#f37a23')}
                    {renderTaskTable(groups.thisWeek, 'Next 7 Days', '#3b82f6')}
                    {renderTaskTable(groups.upcoming, 'Upcoming / No Date', '#64748b')}
                  </>
                ) : (
                  renderTaskTable(filteredTasksByStatus, 'Completed History', '#16a34a')
                )
              )}
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingTask ? 'Edit Task' : 'Create Task'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Task Title *</label>
                  <input 
                    required 
                    className="form-input" 
                    value={formData.title} 
                    onChange={e => setFormData({ ...formData, title: e.target.value })} 
                    placeholder="e.g. Follow up on demo"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label"><Tag size={12} style={{marginRight:4}}/> Task Type</label>
                  <select 
                    className="form-input" 
                    value={formData.task_type} 
                    onChange={e => setFormData({ ...formData, task_type: e.target.value })}
                  >
                    {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label"><Calendar size={12} style={{marginRight:4}}/> Deadline</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={formData.due_date} 
                    onChange={e => setFormData({ ...formData, due_date: e.target.value })} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status Pipeline</label>
                  <select 
                    className="form-input" 
                    value={formData.status} 
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    {STATUS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label"><User size={12} style={{marginRight:4}}/> Assigned Owner</label>
                  <input 
                    className="form-input" 
                    value={formData.owner} 
                    onChange={e => setFormData({ ...formData, owner: e.target.value })} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label"><Link2 size={12} style={{marginRight:4}}/> Related To</label>
                  <select 
                    className="form-input" 
                    value={formData.related_to} 
                    onChange={e => setFormData({ ...formData, related_to: e.target.value, related_id: '' })}
                  >
                    {RELATED_ENTITIES.map(re => (
                      <option key={re.value} value={re.value}>
                        {re.value === 'accounts' ? (isB2C ? 'Customer' : 'Account') : re.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Select {RELATED_ENTITIES.find(re => re.value === formData.related_to)?.label || 'Item'}</label>
                  <select 
                    className="form-input" 
                    value={formData.related_id} 
                    onChange={e => setFormData({ ...formData, related_id: e.target.value })}
                  >
                    <option value="">-- No Relation --</option>
                    {entityData[formData.related_to]?.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name || item.account_name || item.invoice_name || item.quote_name || item.subject}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dynamic Custom Fields Loop */}
                {taskConfigs.filter(c => !c.is_core).map(config => (
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
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingTask ? 'Update' : 'Create'} Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BulkUploadModal
        module="tasks"
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        session={session}
        profile={profile}
        onImported={fetchTasks}
      />

      <FieldBuilderModal 
        module="task"
        businessId={session.user.id}
        isOpen={isFieldBuilderOpen}
        onClose={() => {
          setIsFieldBuilderOpen(false)
          fetchTaskConfigs()
        }}
      />
    </div>
  )
}
