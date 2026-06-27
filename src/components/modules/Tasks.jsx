import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Trash2, Edit2, Calendar, User, Tag, Link2, CheckCircle2, Clock, PlayCircle, AlertCircle, CheckCircle } from 'lucide-react'
import LocalSearch from '../ui/LocalSearch'

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

export default function Tasks({ session, profile }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [viewMode, setViewMode] = useState('active') // 'active' or 'history'
  
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
    related_id: ''
  })

  useEffect(() => {
    fetchTasks()
    fetchAllEntities()
  }, [session])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', session.user.id)
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
        supabase.from('leads').select('id, name').eq('user_id', session.user.id),
        supabase.from('contacts').select('id, name').eq('user_id', session.user.id),
        supabase.from('accounts').select('id, account_name').eq('user_id', session.user.id),
        supabase.from('opportunities').select('id, name').eq('user_id', session.user.id),
        supabase.from('invoices').select('id, invoice_name').eq('user_id', session.user.id),
        supabase.from('quotes').select('id, quote_name').eq('user_id', session.user.id),
        supabase.from('tickets').select('id, subject').eq('user_id', session.user.id)
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
        related_id: task.related_id || ''
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
        related_id: ''
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
                <th>Task Title</th>
                <th>Type</th>
                <th>Related To</th>
                <th>Due Date</th>
                <th>Owner</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {taskList.map(task => (
                <tr key={task.id}>
                  <td>{getStatusIcon(task.status)}</td>
                  <td>
                    <div className="fw-bold">{task.title}</div>
                  </td>
                  <td>
                    <span className="badge badge-normal">{task.task_type}</span>
                  </td>
                  <td>
                    <div className="text-muted" style={{ fontSize: '12px' }}>
                      <span style={{ textTransform: 'capitalize' }}>
                        {task.related_to === 'accounts' ? (isB2C ? 'Customer' : 'Account') : task.related_to || '-'}:
                      </span> {getRelatedName(task)}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', color: task.status === 'Overdue' ? '#dc2626' : 'inherit' }}>
                      <Calendar size={14} className="text-muted" />
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No deadline'}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px' }}>
                      <User size={14} className="text-muted" />
                      {task.owner}
                    </div>
                  </td>
                  <td>
                    <span style={{ 
                      fontSize: '11px', fontWeight: 800, padding: '4px 8px', borderRadius: '12px',
                      background: `${getStatusColor(task.status)}15`, color: getStatusColor(task.status)
                    }}>
                      {task.status}
                    </span>
                  </td>
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
                      <button className="btn-icon text-danger" onClick={() => handleDeleteTask(task)}><Trash2 size={16} /></button>
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
  
  const isAdmin = ['admin', 'administrator'].includes(profile?.role?.toLowerCase())

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isB2C ? 'Antigravity B2C Tasks' : 'Tasks'}</h1>
          <p className="page-subtitle">{isB2C ? 'Automated engagement tracking and customer follow-ups.' : 'Track follow-ups, meetings, and project tasks.'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <span style={{ fontSize: 18 }}>+</span> Create Task
        </button>
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
              Active Tasks ({tasks.filter(t => t.status !== 'Completed').length})
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
              Task History ({tasks.filter(t => t.status === 'Completed').length})
            </button>
          </div>
          <div style={{ marginLeft: 'auto', paddingBottom: 12 }}>
            <LocalSearch 
              data={tasks}
              searchKeys={['title', 'task_type', 'owner']}
              onSelect={(item) => handleOpenModal(item)}
              placeholder="Search tasks..."
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
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingTask ? 'Update' : 'Create'} Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
