import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { Trash2, Edit2 } from 'lucide-react'
import LocalSearch from '../ui/LocalSearch'

export default function Reports({ session, profile }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingReport, setEditingReport] = useState(null)
  const [formData, setFormData] = useState({
    report_name: '', 
    description: '', 
    folder: 'General',
    report_type: 'leads',
    filters: {
      owner: '',
      status: '',
      priority: '',
      date_from: '',
      date_to: ''
    }
  })
  const [viewingData, setViewingData] = useState(null)

  // To preview the report before downloading
  const [previewData, setPreviewData] = useState(null)
  const previewRef = useRef(null)

  useEffect(() => {
    fetchReports()
  }, [session])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setReports(data || [])
    } catch (error) {
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (report = null) => {
    if (report) {
      setEditingReport(report)
      setFormData({
        report_name: report.report_name,
        description: report.description || '',
        folder: report.folder || 'General',
        report_type: report.report_type,
        filters: report.filters || { owner: '', status: '', priority: '', date_from: '', date_to: '' }
      })
    } else {
      setEditingReport(null)
      setFormData({ 
        report_name: '', 
        description: '', 
        folder: 'General',
        report_type: 'leads',
        filters: { owner: '', status: '', priority: '', date_from: '', date_to: '' }
      })
    }
    setIsModalOpen(true)
  }

  const handleViewReport = async (report) => {
    const toastId = toast.loading('Running report query...')
    try {
      const moduleTable = report.report_type === 'custom' ? 'leads' : report.report_type
      let query = supabase.from(moduleTable).select('*').eq('user_id', session.user.id)
      
      const f = report.filters || {}
      if (f.owner) {
        // Handle owner filtering based on module schema
        const ownerColMap = {
          leads: 'lead_owner',
          contacts: 'contact_owner',
          accounts: 'account_owner',
          opportunities: 'owner',
          tickets: 'owner'
        }
        const ownerCol = ownerColMap[moduleTable] || 'owner'
        query = query.ilike(ownerCol, `%${f.owner}%`)
      }
      if (f.status) query = query.ilike('status', `%${f.status}%`)
      if (f.priority) query = query.eq('priority', f.priority)
      if (f.date_from) query = query.gte('created_at', f.date_from)
      if (f.date_to) query = query.lte('created_at', f.date_to)

      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      
      setViewingData({ report: { ...report, report_type: moduleTable }, data })
      toast.success('Report generated', { id: toastId })
    } catch (error) {
      console.error(error)
      toast.error('Query failed: ' + error.message, { id: toastId })
    }
  }

  const handleSelectReport = (report) => {
    const el = document.getElementById(`report-row-${report.id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.style.transition = 'background-color 0.5s'
      el.style.backgroundColor = 'var(--bg-card-hover)'
      setTimeout(() => { el.style.backgroundColor = '' }, 2000)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingReport ? 'Updating report...' : 'Creating report...')
    
    try {
      if (editingReport) {
        const { error } = await supabase
          .from('reports')
          .update({ 
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingReport.id)
          
        if (error) throw error
        toast.success('Report updated', { id: toastId })
      } else {
        const { error } = await supabase
          .from('reports')
          .insert([{ 
            ...formData, 
            created_by: profile?.name || session.user.email,
            user_id: session.user.id 
          }])
          
        if (error) throw error

        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'Report Created',
          description: `Created new report: ${formData.report_name}`
        }])
        toast.success('Report created', { id: toastId })
      }
      
      setIsModalOpen(false)
      fetchReports()
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleDeleteReport = async (report) => {
    if (!confirm(`Are you sure you want to delete the report "${report.report_name}"?`)) return
    
    const toastId = toast.loading('Deleting report...')
    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', report.id)

      if (error) throw error

      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Report Deleted',
        description: `Deleted report: ${report.report_name}`
      }])

      toast.success('Report deleted', { id: toastId })
      fetchReports()
    } catch (error) {
      toast.error('Failed to delete report: ' + error.message, { id: toastId })
    }
  }

  const generatePDF = async (report) => {
    const toastId = toast.loading('Compiling data & generating PDF...')
    try {
      // 1. Fetch data based on report configuration
      const moduleTable = report.report_type === 'custom' ? 'leads' : report.report_type
      let query = supabase.from(moduleTable).select('*').eq('user_id', session.user.id)
      
      const f = report.filters || {}
      if (f.owner) {
        const ownerColMap = {
          leads: 'lead_owner',
          contacts: 'contact_owner',
          accounts: 'account_owner',
          opportunities: 'owner',
          tickets: 'owner'
        }
        const ownerCol = ownerColMap[moduleTable] || 'owner'
        query = query.ilike(ownerCol, `%${f.owner}%`)
      }
      if (f.status) query = query.ilike('status', `%${f.status}%`)
      if (f.priority) query = query.eq('priority', f.priority)
      if (f.date_from) query = query.gte('created_at', f.date_from)
      if (f.date_to) query = query.lte('created_at', f.date_to)

      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error

      // 2. Set the preview state so it renders in DOM (hidden)
      setPreviewData({ report, data })
      
      // 3. Wait for React to render the hidden preview
      setTimeout(async () => {
        if (!previewRef.current) return toast.error('Render failed', { id: toastId })
        
        const canvas = await html2canvas(previewRef.current, { scale: 2, logging: false })
        const imgData = canvas.toDataURL('image/jpeg', 0.9)
        
        const pdf = new jsPDF('p', 'mm', 'a4')
        const width = pdf.internal.pageSize.getWidth()
        const height = (canvas.height * width) / canvas.width
        pdf.addImage(imgData, 'JPEG', 0, 0, width, height)
        pdf.save(`${report.report_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
        
        setPreviewData(null) // Hide preview
        
        await supabase.from('activities').insert([{
          user_id: session.user.id,
          type: 'Report Downloaded',
          description: `Downloaded ${report.report_name}`
        }])
        
        toast.success('PDF generated successfully', { id: toastId })
      }, 500)
    } catch (error) {
      console.error(error)
      toast.error('Failed to generate PDF', { id: toastId })
      setPreviewData(null)
    }
  }

  if (loading) return <div className="loading-container"><div className="spinner"/></div>
  
  const isAdmin = ['admin', 'administrator'].includes(profile?.role?.toLowerCase())

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Custom insights based on your business data.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <span style={{ fontSize: 18 }}>+</span> Create Report
        </button>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">Available Reports ({reports.length})</h2>
          <LocalSearch 
             data={reports} 
             searchKeys={['report_name', 'folder']} 
             onSelect={(item) => handleSelectReport(item)} 
             placeholder="Search reports..." 
             renderItem={(item) => (
               <>
                 <div className="fw-bold" style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.report_name}</div>
                 <div className="text-muted" style={{ fontSize: '11px' }}>{item.folder}</div>
               </>
             )}
          />
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Report Name</th>
                <th>Description</th>
                <th>Folder</th>
                <th>Created By</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    <div className="empty-state">
                      <div className="empty-state-icon"></div>
                      <h3>No custom reports</h3>
                      <p>Create a report to track customized metrics.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                reports.map(report => (
                  <tr key={report.id} id={`report-row-${report.id}`}>
                    <td className="fw-bold">{report.report_name}</td>
                    <td className="text-muted" style={{ maxWidth: 300 }}><div className="truncate">{report.description}</div></td>
                    <td><span className="badge badge-normal" style={{ background: 'var(--bg-secondary)' }}> {report.folder}</span></td>
                    <td>{report.created_by}</td>
                    <td className="text-muted">{new Date(report.created_at).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleViewReport(report)} title="View Data">
                          View
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => generatePDF(report)} title="Download PDF">
                          PDF
                        </button>
                        <button className="btn-icon text-primary" onClick={() => handleOpenModal(report)} title="Edit Configuration">
                          <Edit2 size={16} />
                        </button>
                        {isAdmin && (
                          <button className="btn-icon text-danger" onClick={() => handleDeleteReport(report)} title="Delete Report">
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

      {viewingData && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '900px', width: '95%' }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{viewingData.report.report_name}</h2>
                <p className="text-muted" style={{ fontSize: '13px' }}>
                  Module: <span className="text-primary fw-bold" style={{ textTransform: 'capitalize' }}>{viewingData.report.report_type}</span> | 
                  Results: <span className="fw-bold">{viewingData.data.length}</span>
                </p>
              </div>
              <button className="modal-close" onClick={() => setViewingData(null)}>✕</button>
            </div>
            
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>{['invoices', 'quotes', 'tickets'].includes(viewingData.report.report_type) ? 'Subject/Name' : 'Name'}</th>
                    <th>Status</th>
                    {['opportunities', 'invoices', 'quotes'].includes(viewingData.report.report_type) && <th>Amount</th>}
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingData.data.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>No records match these filters.</td></tr>
                  ) : (
                    viewingData.data.map((item, idx) => (
                      <tr key={idx}>
                        <td className="fw-bold">{item.name || item.subject || item.report_name || item.account_name || item.invoice_name || item.quote_name}</td>
                        <td><span className="badge badge-normal">{item.status || item.stage || 'N/A'}</span></td>
                        {['opportunities', 'invoices', 'quotes'].includes(viewingData.report.report_type) && (
                          <td className="fw-bold">${Number(item.amount || item.total_price || 0).toLocaleString()}</td>
                        )}
                        <td className="text-muted">{new Date(item.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="form-actions" style={{ marginTop: '24px' }}>
              <button className="btn btn-secondary" onClick={() => setViewingData(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => generatePDF(viewingData.report)}>Download PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Preview Container for PDF Export */}
      {previewData && (
        <div style={{ 
          position: 'absolute', top: '-9999px', left: '-9999px', 
          width: '800px', background: 'white', color: 'black', padding: '40px',
          fontFamily: 'sans-serif' 
        }} ref={previewRef}>
          <div style={{ borderBottom: '2px solid #6366f1', paddingBottom: 20, marginBottom: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 32, color: '#111827' }}>NexusCRM Report</h1>
              <p style={{ margin: 0, color: '#6b7280', marginTop: 8 }}>{previewData.report.report_name}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, color: '#6b7280' }}>Generated On</div>
              <div style={{ fontWeight: 'bold' }}>{new Date().toLocaleDateString()}</div>
            </div>
          </div>
          
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 18, color: '#374151', marginBottom: 16 }}>Summary Description</h2>
            <p style={{ color: '#4b5563', lineHeight: 1.6 }}>{previewData.report.description || 'No description provided for this report.'}</p>
          </div>
          
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 18, color: '#374151', marginBottom: 16 }}>Report Filters</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, background: '#f9fafb', padding: 16, borderRadius: 8 }}>
               <div><span style={{color: '#6b7280'}}>Module:</span> <span style={{fontWeight: 600, textTransform: 'capitalize'}}>{previewData.report.report_type}</span></div>
               <div><span style={{color: '#6b7280'}}>Owner Filter:</span> <span style={{fontWeight: 600}}>{previewData.report.filters?.owner || 'Any'}</span></div>
               <div><span style={{color: '#6b7280'}}>Status:</span> <span style={{fontWeight: 600}}>{previewData.report.filters?.status || 'Any'}</span></div>
               <div><span style={{color: '#6b7280'}}>Date Range:</span> <span style={{fontWeight: 600}}>{previewData.report.filters?.date_from || 'Start'} to {previewData.report.filters?.date_to || 'End'}</span></div>
            </div>
          </div>
          
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 18, color: '#374151', marginBottom: 16 }}>Data Records ({previewData.data.length})</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
                   <th style={{ padding: '12px 0' }}>Module ID / Name</th>
                   <th>Status</th>
                   <th>Amount/Total</th>
                   <th>Created Date</th>
                </tr>
              </thead>
              <tbody>
                {previewData.data.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 0', fontWeight: 600 }}>{item.name || item.subject || item.report_name || item.account_name || item.invoice_name || item.quote_name || 'N/A'}</td>
                    <td>{item.status || item.stage || 'N/A'}</td>
                    <td style={{ fontWeight: 600 }}>{ (item.amount || item.total_price) ? `$${Number(item.amount || item.total_price).toLocaleString()}` : '-' }</td>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {previewData.data.length === 0 && (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>No records found matching filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 100, borderTop: '1px solid #e5e7eb', paddingTop: 20 }}>
            This report was securely generated by NexusCRM. Confidential information.
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editingReport ? 'Edit' : 'Create New'} Report</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Report Name *</label>
                  <input required className="form-input" value={formData.report_name} onChange={e => setFormData({...formData, report_name: e.target.value})} placeholder="Q3 Quarterly Pipeline Review" />
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Detailed analysis of won deals and lead conversion rates." />
                </div>
                <div className="form-group">
                  <label className="form-label">Folder</label>
                  <select className="form-input" value={formData.folder} onChange={e => setFormData({...formData, folder: e.target.value})}>
                    <option value="General">General</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Support">Support</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Pull Reports On (Module)</label>
                  <select className="form-input" value={formData.report_type} onChange={e => setFormData({...formData, report_type: e.target.value})}>
                    <option value="leads">Leads</option>
                    <option value="opportunities">Deals (Opportunities)</option>
                    <option value="tickets">Tickets</option>
                    <option value="tasks">Tasks</option>
                    <option value="accounts">Accounts</option>
                    <option value="invoices">Invoices</option>
                    <option value="contacts">Contacts</option>
                    <option value="quotes">Quotes</option>
                  </select>
                </div>

                <div className="divider full-width" style={{ margin: '16px 0', height: '1px', background: 'var(--border-subtle)' }}></div>
                <h3 className="full-width" style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>Filters</h3>

                <div className="form-group">
                  <label className="form-label">Owner Name</label>
                  <input className="form-input" value={formData.filters.owner} onChange={e => setFormData({...formData, filters: {...formData.filters, owner: e.target.value}})} placeholder="Search owner..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <input className="form-input" value={formData.filters.status} onChange={e => setFormData({...formData, filters: {...formData.filters, status: e.target.value}})} placeholder="e.g. open, won, lost..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-input" value={formData.filters.priority} onChange={e => setFormData({...formData, filters: {...formData.filters, priority: e.target.value}})}>
                    <option value="">-- All --</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Created From</label>
                  <input type="date" className="form-input" value={formData.filters.date_from} onChange={e => setFormData({...formData, filters: {...formData.filters, date_from: e.target.value}})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Created To</label>
                  <input type="date" className="form-input" value={formData.filters.date_to} onChange={e => setFormData({...formData, filters: {...formData.filters, date_to: e.target.value}})} />
                </div>
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingReport ? 'Update' : 'Save'} Report</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
