import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Trash2, Edit2, Calendar, User, Tag, Link2, CheckCircle2, Clock, PlayCircle, AlertCircle, CheckCircle, Settings, Save } from 'lucide-react'
import LocalSearch from '../ui/LocalSearch'
import FieldBuilderModal from '../ui/FieldBuilderModal'

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
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [viewMode, setViewMode] = useState('active') // 'active' or 'history'
  
  const isAdmin = ['admin', 'administrator'].includes((session?.user?.user_metadata?.role || profile?.role || '').toLowerCase())
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
        setEditingTask(tsk)
        setFormData({
          title: tsk.title || '',
          due_date: tsk.due_date || '',
          status: tsk.status || 'Pending',
          task_type: tsk.task_type || 'Follow-up',
          owner: tsk.owner || '',
          related_to: tsk.related_to || 'accounts',
          related_id: tsk.related_id || '',
          custom_data: tsk.custom_data || {}
        })
        setIsModalOpen(true)
        window.history.replaceState({}, document.title)
      }
    }
  }, [tasks, location.state])

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
    if (!confirm('Are you sure you want to delete this task?')) return
    const toastId = toast.loading('Deleting task...')
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', task.id)
      if (error) throw error
      toast.success('Task deleted', { id: toastId })
      fetchTasks()
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
                <tr key={task.id}>
                  <td>{getStatusIcon(task.status)}</td>
                  {taskConfigs.filter(c => c.show_in_list).map(config => {
                    if (config.field_key === 'title') {
                      return (
                        <td key={config.id}>
                          <div className="fw-bold">{task.title}</div>
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
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                      {task.status !== 'Completed' && (
                        <>
                          <button className="btn btn-sm btn-secondary" style={{ color: '#16a34a', border: '1px solid #dcfce3', background: '#f0fdf4' }} onClick={() => handleMarkComplete(task)}>
                            <CheckCircle size={14} style={{ marginRight: 4 }} /> Done
                          </button>
                          <button className="btn btn-sm btn-secondary" style={{ color: '#f37a23', border: '1px solid #fff5f0', background: '#fff5f0' }} onClick={() => handleSnooze(task)}>
                            <Clock size={14} style={{ marginRight: 4 }} /> Snooze
                          </button>
                        </>
                      )}
                      <button className="btn-icon" onClick={() => handleOpenModal(task)}><Edit2 size={16} /></button>
                      {isAdmin && (
                        <button className="btn-icon text-danger" onClick={() => handleDeleteTask(task)}><Trash2 size={16} /></button>
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
      <div className="page-header">
        <div>
          <h1 className="page-title">{isB2C ? t('modules.tasks.titleB2C') : t('modules.tasks.title')}</h1>
          <p className="page-subtitle">{isB2C ? t('modules.tasks.subtitleB2C') : t('modules.tasks.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setIsFieldBuilderOpen(true)}>
            <Settings size={14} /> {t('modules.tasks.editFields')}
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
              onSelect={(item) => handleOpenModal(item)}
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
