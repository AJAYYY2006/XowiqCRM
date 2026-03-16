import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Trash2, Edit2, Calendar, User, Tag, Link2, CheckCircle2, Clock, PlayCircle, AlertCircle } from 'lucide-react'
import LocalSearch from '../ui/LocalSearch'

const TASK_TYPES = ['Email', 'Message', 'Call', 'Demo Meeting', 'Events', 'Inperson Meeting']
const STATUS_STAGES = ['Open', 'Working', 'Pending', 'Completed']
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
  
  // Entity data for relationships
  const [entityData, setEntityData] = useState({
    leads: [], contacts: [], accounts: [], opportunities: [], invoices: [], quotes: [], tickets: []
  })

  const [formData, setFormData] = useState({
    title: '',
    due_date: '',
    status: 'Open',
    task_type: 'Call',
    owner: profile?.name || session.user.email,
    related_to: 'leads',
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
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setTasks(data || [])
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
        status: task.status || 'Open',
        task_type: task.task_type || 'Call',
        owner: task.owner || profile?.name || session.user.email,
        related_to: task.related_to || 'leads',
        related_id: task.related_id || ''
      })
    } else {
      setEditingTask(null)
      setFormData({
        title: '',
        due_date: '',
        status: 'Open',
        task_type: 'Call',
        owner: profile?.name || session.user.email,
        related_to: 'leads',
        related_id: ''
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingTask ? 'Updating task...' : 'Creating task...')
    
    try {
      const payload = {
        ...formData,
        user_id: session.user.id
      }

      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update(payload)
          .eq('id', editingTask.id)
        if (error) throw error
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
      case 'Completed': return <CheckCircle2 size={16} className="text-success" />
      case 'Working': return <PlayCircle size={16} style={{ color: '#3b82f6' }} />
      case 'Pending': return <Clock size={16} style={{ color: '#f59e0b' }} />
      default: return <AlertCircle size={16} style={{ color: '#6b7280' }} />
    }
  }

  const getRelatedName = (task) => {
    if (!task.related_to || !task.related_id) return 'None'
    const list = entityData[task.related_to] || []
    const item = list.find(i => i.id === task.related_id)
    return item ? (item.name || item.account_name || item.invoice_name || item.quote_name || item.subject) : 'Unknown'
  }

  if (loading) return <div className="loading-container"><div className="spinner" /></div>
  
  const isAdmin = ['admin', 'administrator'].includes(profile?.role?.toLowerCase())

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">Track follow-ups, meetings, and project tasks.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <span style={{ fontSize: 18 }}>+</span> Create Task
        </button>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">All Tasks ({tasks.length})</h2>
          <LocalSearch 
            data={tasks}
            searchKeys={['title', 'task_type', 'owner']}
            onSelect={(item) => handleOpenModal(item)}
            placeholder="Search tasks..."
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Task Title</th>
                <th>Type</th>
                <th>Related To</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Owner</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="empty-state">
                      <h3>No tasks assigned</h3>
                      <p>Start by creating a task for your leads or opportunities.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tasks.map(task => (
                  <tr key={task.id}>
                    <td>
                      <div className="fw-bold">{task.title}</div>
                    </td>
                    <td>
                      <span className="badge badge-normal">{task.task_type}</span>
                    </td>
                    <td>
                      <div className="text-muted" style={{ fontSize: '12px' }}>
                        <span style={{ textTransform: 'capitalize' }}>{task.related_to || '-'}:</span> {getRelatedName(task)}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px' }}>
                        <Calendar size={14} className="text-muted" />
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No deadline'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {getStatusIcon(task.status)}
                        <span className="fw-bold" style={{ fontSize: '13px' }}>{task.status}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px' }}>
                        <User size={14} className="text-muted" />
                        {task.owner}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn-icon text-primary" onClick={() => handleOpenModal(task)}>
                          <Edit2 size={16} />
                        </button>
                        {isAdmin && (
                          <button className="btn-icon text-danger" onClick={() => handleDeleteTask(task)}>
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
                    {RELATED_ENTITIES.map(re => <option key={re.value} value={re.value}>{re.label}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Select {RELATED_ENTITIES.find(re => re.value === formData.related_to)?.label}</label>
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
