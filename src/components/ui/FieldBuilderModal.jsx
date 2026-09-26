import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Trash2, Edit2, Plus, Settings, ArrowUp, ArrowDown, X } from 'lucide-react'
import { useRole } from '../../contexts/RoleContext'

const CORE_FIELDS_BY_MODULE = {
  opportunity: [
    { label: 'Deal Name', field_key: 'name', field_type: 'text', is_required: true, is_core: true, display_order: 0 },
    { label: 'Account', field_key: 'account_id', field_type: 'dropdown', is_required: true, is_core: true, display_order: 1 },
    { label: 'Deal Value', field_key: 'amount', field_type: 'number', is_required: true, is_core: true, display_order: 2 },
    { label: 'Stage', field_key: 'stage', field_type: 'dropdown', options: ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'], is_required: true, is_core: true, display_order: 3 },
    { label: 'Expected Close Date', field_key: 'closed_date', field_type: 'date', is_required: false, is_core: true, display_order: 4 },
    { label: 'Owner', field_key: 'owner', field_type: 'text', is_required: false, is_core: true, display_order: 5 },
    { label: 'Probability (%)', field_key: 'probability', field_type: 'number', is_required: false, is_core: true, display_order: 6 }
  ],
  quote: [
    { label: 'Proposal Name', field_key: 'quote_name', field_type: 'text', is_required: true, is_core: true, display_order: 0 },
    { label: 'Related Opportunity', field_key: 'opportunity_id', field_type: 'dropdown', is_required: false, is_core: true, display_order: 1 },
    { label: 'Account', field_key: 'account_id', field_type: 'dropdown', is_required: false, is_core: true, display_order: 2 },
    { label: 'Workflow Status', field_key: 'status', field_type: 'dropdown', options: ['Draft', 'Sent', 'Approved', 'Rejected'], is_required: false, is_core: true, display_order: 3 },
    { label: 'Validity Date', field_key: 'expires_at', field_type: 'date', is_required: false, is_core: true, display_order: 4 },
    { label: 'Total Value', field_key: 'total_price', field_type: 'number', is_required: true, is_core: true, display_order: 5 },
    { label: 'Tax Rate (%)', field_key: 'tax_rate', field_type: 'number', is_required: false, is_core: true, display_order: 6 },
    { label: 'Discount', field_key: 'discount', field_type: 'number', is_required: false, is_core: true, display_order: 7 }
  ],
  lead: [
    { label: 'Lead Name', field_key: 'lead_name', field_type: 'text', is_required: true, is_core: true, display_order: 0 },
    { label: 'Contact Number', field_key: 'contact_number', field_type: 'text', is_required: true, is_core: true, display_order: 1 },
    { label: 'Email Address', field_key: 'email', field_type: 'text', is_required: false, is_core: true, display_order: 2 },
    { label: 'Company Name', field_key: 'company', field_type: 'text', is_required: false, is_core: true, display_order: 3 }
  ],
  customer_profile: [
    { label: 'Customer Name', field_key: 'customer_name', field_type: 'text', is_required: true, is_core: true, display_order: 0 },
    { label: 'Contact Number', field_key: 'contact_number', field_type: 'text', is_required: true, is_core: true, display_order: 1 },
    { label: 'Email ID', field_key: 'email_id', field_type: 'text', is_required: false, is_core: true, display_order: 2 },
    { label: 'Gender', field_key: 'gender', field_type: 'dropdown', options: ['Male', 'Female', 'Other'], is_required: false, is_core: true, display_order: 3 },
    { label: 'Notes', field_key: 'notes', field_type: 'long_text', is_required: false, is_core: true, display_order: 4 }
  ],
  ticket: [
    { label: 'Ticket No.', field_key: 'ticket_no', field_type: 'text', is_required: false, is_core: true, display_order: 0 },
    { label: 'Subject', field_key: 'subject', field_type: 'text', is_required: true, is_core: true, display_order: 1 },
    { label: 'Description', field_key: 'description', field_type: 'long_text', is_required: false, is_core: true, display_order: 2 },
    { label: 'Contact', field_key: 'contact', field_type: 'text', is_required: false, is_core: true, display_order: 3 },
    { label: 'Account', field_key: 'account', field_type: 'text', is_required: false, is_core: true, display_order: 4 },
    { label: 'Priority', field_key: 'priority', field_type: 'dropdown', options: ['low', 'medium', 'high'], is_core: true, display_order: 5 },
    { label: 'Status', field_key: 'status', field_type: 'dropdown', options: ['open', 'pending', 'closed'], is_core: true, display_order: 6 },
    { label: 'Owner', field_key: 'owner', field_type: 'text', is_required: false, is_core: true, display_order: 7 }
  ],
  task: [
    { label: 'Task Name', field_key: 'task_name', field_type: 'text', is_required: true, is_core: true, display_order: 0 },
    { label: 'Description', field_key: 'description', field_type: 'long_text', is_required: false, is_core: true, display_order: 1 },
    { label: 'Due Date', field_key: 'due_date', field_type: 'date', is_required: false, is_core: true, display_order: 2 },
    { label: 'Priority', field_key: 'priority', field_type: 'dropdown', options: ['Low', 'Medium', 'High'], is_required: false, is_core: true, display_order: 3 },
    { label: 'Status', field_key: 'status', field_type: 'dropdown', options: ['Pending', 'In Progress', 'Completed'], is_required: false, is_core: true, display_order: 4 },
    { label: 'Assignee', field_key: 'assigned_to', field_type: 'text', is_required: false, is_core: true, display_order: 5 }
  ],
  invoice: [
    { label: 'Invoice Number', field_key: 'invoice_number', field_type: 'text', is_required: true, is_core: true, display_order: 0 },
    { label: 'Client / Account', field_key: 'account_id', field_type: 'dropdown', is_required: true, is_core: true, display_order: 1 },
    { label: 'Total Amount', field_key: 'amount', field_type: 'number', is_required: true, is_core: true, display_order: 2 },
    { label: 'Payment Status', field_key: 'status', field_type: 'dropdown', options: ['Unpaid', 'Paid', 'Overdue', 'Cancelled'], is_required: true, is_core: true, display_order: 3 },
    { label: 'Due Date', field_key: 'due_date', field_type: 'date', is_required: false, is_core: true, display_order: 4 }
  ],
  account: [
    { label: 'Account Name', field_key: 'account_name', field_type: 'text', is_required: true, is_core: true, display_order: 0 },
    { label: 'Industry', field_key: 'industry', field_type: 'text', is_required: false, is_core: true, display_order: 1 },
    { label: 'Website', field_key: 'website', field_type: 'url', is_required: false, is_core: true, display_order: 2 },
    { label: 'Phone', field_key: 'phone', field_type: 'text', is_required: false, is_core: true, display_order: 3 },
    { label: 'Account Owner', field_key: 'account_owner', field_type: 'text', is_required: false, is_core: true, display_order: 4 }
  ]
}

export default function FieldBuilderModal({ module, businessId, isOpen, onClose }) {
  const [allCustomFields, setAllCustomFields] = useState([])
  const [showArchived, setShowArchived] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingField, setEditingField] = useState(null)
  const [fieldForm, setFieldForm] = useState({
    label: '',
    field_type: 'text',
    options: '',
    is_required: false,
    show_in_list: true
  })

  const roleContext = useRole?.()
  const isAdmin = roleContext ? roleContext.isAdmin : true

  useEffect(() => {
    if (isOpen) fetchConfigs()
  }, [isOpen, module])

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_field_configs')
        .select('*')
        .eq('business_id', businessId)
        .eq('module', module)
        .order('display_order', { ascending: true })
      
      if (error) throw error

      let currentFields = data || []
      const defaultCore = CORE_FIELDS_BY_MODULE[module]
      if (defaultCore && defaultCore.length > 0) {
        const missingCore = defaultCore.filter(c => !currentFields.some(f => f.field_key === c.field_key))
        if (missingCore.length > 0) {
          const toInsert = missingCore.map(c => ({
            business_id: businessId,
            module: module,
            field_key: c.field_key,
            label: c.label,
            field_type: c.field_type,
            options: c.options || null,
            is_required: c.is_required || false,
            is_core: true,
            show_in_list: true,
            display_order: c.display_order
          }))
          const { data: inserted } = await supabase.from('custom_field_configs').insert(toInsert).select()
          if (inserted) {
            currentFields = [...currentFields, ...inserted].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
          }
        }
      }

      setAllCustomFields(currentFields)
    } catch (err) {
      console.error('Error loading custom fields:', err)
    }
  }

  const handleOpenEditor = (field = null) => {
    if (field) {
      setEditingField(field)
      setFieldForm({
        label: field.label,
        field_type: field.field_type,
        options: (field.options || []).join(', '),
        is_required: field.is_required,
        show_in_list: field.show_in_list
      })
    } else {
      setEditingField(null)
      setFieldForm({
        label: '',
        field_type: 'text',
        options: '',
        is_required: false,
        show_in_list: true
      })
    }
    setIsEditorOpen(true)
  }

  const handleFieldSubmit = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingField ? 'Updating field...' : 'Adding field...')
    try {
      const optionsArray = fieldForm.options.split(',').map(o => o.trim()).filter(o => o !== '')
      
      if (editingField) {
        const { error } = await supabase
          .from('custom_field_configs')
          .update({
            label: fieldForm.label,
            is_required: fieldForm.is_required,
            show_in_list: fieldForm.show_in_list,
            options: (fieldForm.field_type === 'dropdown' || fieldForm.field_type === 'multi_select') ? optionsArray : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingField.id)
        
        if (error) throw error
        toast.success('Field updated', { id: toastId })
      } else {
        const baseKey = fieldForm.label.toLowerCase().replace(/[^a-z0-9]/g, '_')
        const field_key = `${baseKey}_${Date.now().toString().slice(-4)}`
        
        const { error } = await supabase
          .from('custom_field_configs')
          .insert([{
            business_id: businessId,
            module: module,
            field_key,
            label: fieldForm.label,
            field_type: fieldForm.field_type,
            options: (fieldForm.field_type === 'dropdown' || fieldForm.field_type === 'multi_select') ? optionsArray : null,
            is_required: fieldForm.is_required,
            show_in_list: fieldForm.show_in_list,
            display_order: allCustomFields.length
          }])
        
        if (error) throw error
        toast.success('New field added!', { id: toastId })
      }
      setIsEditorOpen(false)
      fetchConfigs()
    } catch (err) {
      toast.error(err.message, { id: toastId })
    }
  }

  const handleArchiveField = async (field) => {
    if (!isAdmin) {
      toast.error('Only Super Admin can modify or archive fields')
      return
    }
    if (field.is_core) {
      toast.error('System mandatory fields cannot be archived')
      return
    }

    const actionText = field.is_archived ? 'restore' : 'archive'
    const moduleName = 
      module === 'lead' ? 'Leads' :
      module === 'opportunity' ? 'Opportunities' :
      module === 'quote' ? 'Quotes' :
      module === 'invoice' ? 'Invoices' :
      module === 'ticket' ? 'Tickets' :
      module === 'task' ? 'Tasks' :
      module === 'account' ? 'Accounts' :
      module === 'contact' ? 'Contacts' :
      'Customers'
    const confirmMessage = field.is_archived 
      ? `Are you sure you want to restore "${field.label}"? It will reappear on all ${moduleName} forms.`
      : `This will hide "${field.label}" from ${moduleName} forms. Existing data won't be deleted. Continue?`

    if (!confirm(confirmMessage)) return

    const toastId = toast.loading(`${actionText === 'archive' ? 'Archiving' : 'Restoring'} field...`)
    try {
      const { error } = await supabase
        .from('custom_field_configs')
        .update({ is_archived: !field.is_archived })
        .eq('id', field.id)
      
      if (error) throw error
      toast.success(`Field ${field.is_archived ? 'restored' : 'archived'}!`, { id: toastId })
      fetchConfigs()
    } catch (err) {
      toast.error(err.message, { id: toastId })
    }
  }

  const moveField = async (field, direction) => {
    const currentIndex = allCustomFields.findIndex(f => f.id === field.id)
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    
    if (targetIndex < 0 || targetIndex >= allCustomFields.length) return

    const newFields = [...allCustomFields]
    const temp = newFields[currentIndex]
    newFields[currentIndex] = newFields[targetIndex]
    newFields[targetIndex] = temp

    setAllCustomFields(newFields)

    try {
      await Promise.all([
        supabase.from('custom_field_configs').update({ display_order: targetIndex }).eq('id', field.id),
        supabase.from('custom_field_configs').update({ display_order: currentIndex }).eq('id', allCustomFields[targetIndex].id)
      ])
      fetchConfigs()
    } catch (err) {
      toast.error('Failed to update order')
      fetchConfigs()
    }
  }

  if (!isOpen) return null

  const displayTitle = 
    module === 'lead' ? 'Leads Form Builder' :
    module === 'opportunity' ? 'Opportunities Form Builder' :
    module === 'quote' ? 'Quotes Form Builder' :
    module === 'invoice' ? 'Invoices Form Builder' :
    module === 'ticket' ? 'Tickets Form Builder' :
    module === 'task' ? 'Tasks Form Builder' :
    module === 'account' ? 'Accounts Form Builder' :
    module === 'contact' ? 'Contacts Form Builder' :
    'Customer Profile Builder'

  const moduleDescription = 
    module === 'lead' ? 'leads' :
    module === 'opportunity' ? 'opportunities' :
    module === 'quote' ? 'quotes' :
    module === 'invoice' ? 'invoices' :
    module === 'ticket' ? 'tickets' :
    module === 'task' ? 'tasks' :
    module === 'account' ? 'accounts' :
    module === 'contact' ? 'contacts' :
    'customers'

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal" style={{ maxWidth: 850, borderRadius: 24, overflow: 'hidden' }}>
        {/* Header */}
        <div className="modal-header" style={{ padding: '30px 40px', background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <h2 className="modal-title" style={{ fontSize: 24, fontWeight: 900, color: '#1e293b' }}>{displayTitle}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#64748b' }}>Configure dynamic fields for your {moduleDescription}.</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Action Bar */}
        <div style={{ padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer', color: '#64748b' }}>
            <input 
              type="checkbox" 
              checked={showArchived} 
              onChange={e => setShowArchived(e.target.checked)} 
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#f37a23' }}
            />
            <span style={{ fontWeight: 600 }}>Show archived fields</span>
          </label>
          <button className="btn btn-primary" onClick={() => handleOpenEditor()}>
            <Plus size={18} style={{ marginRight: 6 }} /> Add New Field
          </button>
        </div>

        {/* Table Area */}
        <div style={{ padding: '40px', maxHeight: '60vh', overflowY: 'auto' }}>
          <div className="table-container" style={{ margin: 0, boxShadow: 'none', border: '1px solid #e6e9ef', borderRadius: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ width: 50, padding: 12 }}></th>
                  <th style={{ padding: 12, fontSize: 11, color: '#94a3b8' }}>FIELD LABEL</th>
                  <th style={{ padding: 12, fontSize: 11, color: '#94a3b8' }}>TYPE</th>
                  <th style={{ padding: 12, fontSize: 11, color: '#94a3b8' }}>DISPLAY</th>
                  <th style={{ textAlign: 'right', padding: '12px 20px', fontSize: 11, color: '#94a3b8' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {allCustomFields
                  .filter(f => showArchived || !f.is_archived)
                  .map((f, idx) => (
                    <tr key={f.id} style={{ 
                      opacity: f.is_archived ? 0.6 : 1, 
                      background: f.is_core ? '#fff9f5' : 'transparent'
                    }}>
                      <td style={{ padding: 12, borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <button onClick={() => moveField(f, 'up')} disabled={idx === 0} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: idx === 0 ? '#f1f5f9' : '#cbd5e1' }}><ArrowUp size={14}/></button>
                          <button onClick={() => moveField(f, 'down')} disabled={idx === allCustomFields.length - 1} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: idx === allCustomFields.length - 1 ? '#f1f5f9' : '#cbd5e1' }}><ArrowDown size={14}/></button>
                        </div>
                      </td>
                      <td style={{ padding: 12, borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>{f.label}</span>
                          {f.is_core && <span style={{ fontSize: 9, background: '#f37a23', color: '#fff', padding: '1px 5px', borderRadius: 4, fontWeight: 900 }}>CORE</span>}
                        </div>
                      </td>
                      <td style={{ padding: 12, borderTop: '1px solid #f1f5f9', fontSize: 12, color: '#64748b', textTransform: 'capitalize' }}>
                        {f.field_type.replace('_', ' ')}
                      </td>
                      <td style={{ padding: 12, borderTop: '1px solid #f1f5f9', fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {f.is_required && <span style={{ color: '#ef4444' }}>REQ</span>}
                          {f.show_in_list && <span style={{ color: '#10b981' }}>LIST</span>}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', padding: '12px 20px', borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn-icon" onClick={() => handleOpenEditor(f)}><Edit2 size={16} /></button>
                          {!f.is_core && isAdmin && (
                            <button 
                              className={`btn-icon ${f.is_archived ? 'text-primary' : 'text-danger'}`} 
                              onClick={() => handleArchiveField(f)}
                              title={f.is_archived ? 'Restore' : 'Archive'}
                            >
                              {f.is_archived ? <Plus size={16} /> : <Trash2 size={16} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inner Field Editor Modal */}
        {isEditorOpen && (
          <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal" style={{ maxWidth: 500, borderRadius: 20, overflow: 'hidden' }}>
              <div className="modal-header" style={{ background: '#f8fafc', padding: '20px 30px', borderBottom: '1px solid #e2e8f0' }}>
                <h2 className="modal-title" style={{ fontSize: 18 }}>{editingField ? 'Edit Field Settings' : 'New Custom Field'}</h2>
                <button className="modal-close" onClick={() => setIsEditorOpen(false)}>✕</button>
              </div>
              <form onSubmit={handleFieldSubmit} style={{ padding: '30px' }}>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label className="form-label">Display Label *</label>
                    <input 
                      required 
                      className="form-input" 
                      value={fieldForm.label} 
                      onChange={e => setFieldForm({...fieldForm, label: e.target.value})} 
                      placeholder="e.g. Loyalty ID, Vehicle Color" 
                    />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, width: '100%' }}>
                    <div className="form-group">
                      <label className="form-label">Field Type</label>
                      <select 
                        className="form-input" 
                        disabled={!!editingField}
                        value={fieldForm.field_type} 
                        onChange={e => setFieldForm({...fieldForm, field_type: e.target.value})}
                      >
                        <option value="text">Text Input</option>
                        <option value="number">Number</option>
                        <option value="dropdown">Dropdown Select</option>
                        <option value="multi_select">Multi-Select</option>
                        <option value="date">Date Picker</option>
                        <option value="checkbox">Checkbox/Toggle</option>
                        <option value="file_upload">File Upload</option>
                        <option value="url">URL Link</option>
                        <option value="long_text">Long Text/Bio</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center', marginTop: 15 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
                        <input type="checkbox" checked={fieldForm.is_required} onChange={e => setFieldForm({...fieldForm, is_required: e.target.checked})} style={{ width: 16, height: 16, accentColor: '#f37a23' }} />
                        Required Field
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
                        <input type="checkbox" checked={fieldForm.show_in_list} onChange={e => setFieldForm({...fieldForm, show_in_list: e.target.checked})} style={{ width: 16, height: 16, accentColor: '#f37a23' }} />
                        Show in Table
                      </label>
                    </div>
                  </div>

                  {(fieldForm.field_type === 'dropdown' || fieldForm.field_type === 'multi_select') && (
                    <div className="form-group full-width" style={{ marginTop: 10 }}>
                      <label className="form-label">Options (Comma separated) *</label>
                      <textarea 
                        required
                        className="form-input" 
                        value={fieldForm.options} 
                        onChange={e => setFieldForm({...fieldForm, options: e.target.value})} 
                        placeholder="High, Medium, Low"
                        rows={3}
                      />
                    </div>
                  )}
                </div>
                <div className="form-actions" style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsEditorOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ minWidth: 140 }}>{editingField ? 'Save Changes' : 'Create Field'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
