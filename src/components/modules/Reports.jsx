import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Trash2, Edit2 } from 'lucide-react'
import LocalSearch from '../ui/LocalSearch'

export default function Reports({ session, profile }) {
  const { t } = useTranslation()
  const userIds = profile?.teamUserIds || [session.user.id]
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

  const navigate = useNavigate()
  
  const handleNavigateToRecord = (item, type) => {
    const id = item.id
    if (!id) return
    
    // Map internal types to dashboard routes
    const routeMap = {
      leads: 'leads',
      contacts: 'contacts',
      accounts: 'accounts',
      opportunities: 'opportunities',
      tickets: 'tickets',
      tasks: 'tasks',
      invoices: 'invoices',
      quotes: 'quotes'
    }
    
    const targetModule = routeMap[type] || type
    navigate(`/dashboard/${targetModule}`, { state: { openId: id } })
  }

  useEffect(() => {
    fetchReports()
  }, [session, profile])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .in('user_id', userIds)
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
      let query = supabase.from(moduleTable).select('*').in('user_id', userIds)
      
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
    const toastId = toast.loading('Generating PDF...')
    try {
      // 1. Fetch report data from Supabase
      const moduleTable = report.report_type === 'custom' ? 'leads' : report.report_type
      let query = supabase.from(moduleTable).select('*').in('user_id', userIds)

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

      // 2. Build PDF directly with jsPDF + autoTable — no DOM capture needed

      const doc = new jsPDF('p', 'mm', 'a4')
      const pw = doc.internal.pageSize.getWidth()

      // ── Header bar ─────────────────────────────────────────────────────────
      doc.setFillColor(243, 122, 35)
      doc.rect(0, 0, pw, 28, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('XOWIQ CRM Report', 14, 17)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pw - 14, 17, { align: 'right' })

      // ── Report title & meta ─────────────────────────────────────────────────
      doc.setTextColor(17, 24, 39)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(report.report_name, 14, 42)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(107, 114, 128)
      if (report.description) {
        const descLines = doc.splitTextToSize(report.description, pw - 28)
        doc.text(descLines, 14, 50)
      }
      doc.text(
        `Module: ${report.report_type}  |  Records: ${data.length}  |  Created by: ${report.created_by || 'N/A'}`,
        14, 62
      )

      // ── Data table ──────────────────────────────────────────────────────────
      const cols = ['Name / Subject', 'Status / Stage', 'Amount', 'Created Date']
      const rows = data.map(item => [
        item.name || item.subject || item.account_name || item.invoice_name || item.quote_name || 'N/A',
        item.status || item.stage || 'N/A',
        (item.amount || item.total_price)
          ? `${profile?.currency || '₹'}${Number(item.amount || item.total_price).toLocaleString()}`
          : '—',
        new Date(item.created_at).toLocaleDateString()
      ])

      autoTable(doc, {
        head: [cols],
        body: rows,
        startY: 70,
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [243, 122, 35], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { left: 14, right: 14 }
      })

      // ── Page footers ────────────────────────────────────────────────────────
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(156, 163, 175)
        doc.text('XOWIQ CRM — Confidential Report', 14, doc.internal.pageSize.getHeight() - 8)
        doc.text(`Page ${i} of ${pageCount}`, pw - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' })
      }

      // ── Download ────────────────────────────────────────────────────────────
      doc.save(`${report.report_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)

      await supabase.from('activities').insert([{
        user_id: session.user.id,
        type: 'Report Downloaded',
        description: `Downloaded ${report.report_name}`
      }])

      toast.success('PDF downloaded!', { id: toastId })
    } catch (err) {
      console.error('PDF generation error:', err)
      toast.error('Failed to generate PDF', { id: toastId })
    }
  }

  if (loading) return <div className="loading-container"><div className="spinner"/></div>
  
  const isAdmin = ['admin', 'administrator'].includes((session?.user?.user_metadata?.role || profile?.role || '').toLowerCase())

  if (viewingData) {
    const { report, data } = viewingData
    return (
      <div className="report-detail-view anim-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <button className="btn btn-secondary" onClick={() => setViewingData(null)} style={{ borderRadius: '20px', padding: '8px 16px' }}>
            <span style={{ fontSize: '18px', marginRight: '8px' }}>←</span> Back to Reports
          </button>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={() => handleOpenModal(report)}>
              <Edit2 size={16} /> Edit Report
            </button>
            <button className="btn btn-primary" onClick={() => generatePDF(report)} style={{ background: 'var(--success)' }}>
              Download PDF
            </button>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24, borderLeft: '6px solid var(--accent)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '32px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800 }}>{report.report_name}</h1>
                <span className="badge badge-normal" style={{ background: 'var(--bg-primary)', color: 'var(--accent)' }}>{report.folder}</span>
              </div>
              <p className="text-secondary" style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: 20 }}>
                {report.description || 'No description provided for this report.'}
              </p>
              
              <div className="report-meta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Module</label>
                  <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{report.report_type}</div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Created By</label>
                  <div style={{ fontWeight: 600 }}>{report.created_by}</div>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Records Found</label>
                  <div style={{ fontWeight: 800, color: 'var(--accent)' }}>{data.length}</div>
                </div>
              </div>
            </div>

            <div style={{ paddingLeft: '32px', borderLeft: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16 }}>Applied Filters</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '13px' }}><span style={{ color: 'var(--text-muted)' }}>Status:</span> <strong>{report.filters?.status || 'All'}</strong></div>
                <div style={{ fontSize: '13px' }}><span style={{ color: 'var(--text-muted)' }}>Owner:</span> <strong>{report.filters?.owner || 'Any'}</strong></div>
                <div style={{ fontSize: '13px' }}><span style={{ color: 'var(--text-muted)' }}>Priority:</span> <strong>{report.filters?.priority || 'All'}</strong></div>
                <div style={{ fontSize: '13px' }}><span style={{ color: 'var(--text-muted)' }}>Range:</span> <strong>{report.filters?.date_from || 'S'} - {report.filters?.date_to || 'E'}</strong></div>
              </div>
            </div>
          </div>
        </div>

        <div className="table-container card" style={{ padding: 0 }}>
          <div className="table-header" style={{ padding: '16px 24px' }}>
            <h2 className="table-title">Report Data Results</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>{['invoices', 'quotes', 'tickets'].includes(report.report_type) ? 'Subject/Name' : 'Name'}</th>
                  <th>Status</th>
                  {['opportunities', 'invoices', 'quotes'].includes(report.report_type) && <th>Amount</th>}
                  <th>Created At</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>No records match the applied filters.</td></tr>
                ) : (
                  data.map((item, idx) => (
                    <tr key={idx} className="clickable-row">
                      <td className="fw-bold" style={{ color: 'var(--accent)' }}>{item.name || item.subject || item.report_name || item.account_name || item.invoice_name || item.quote_name}</td>
                      <td><span className="badge badge-normal">{item.status || item.stage || 'N/A'}</span></td>
                      {['opportunities', 'invoices', 'quotes'].includes(report.report_type) && (
                        <td className="fw-bold text-success">{profile?.currency || '$'}{Number(item.amount || item.total_price || 0).toLocaleString()}</td>
                      )}
                      <td className="text-muted">{new Date(item.created_at).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'right' }}>
                         <button className="btn btn-secondary btn-sm" onClick={() => handleNavigateToRecord(item, report.report_type)}>
                           Open Record
                         </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
                  <option value="opportunities">Deals</option>
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
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('modules.reports.title')}</h1>
          <p className="page-subtitle">{t('modules.reports.subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <span style={{ fontSize: 18 }}>+</span> {t('modules.reports.createReport')}
        </button>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">{t('modules.reports.availableReports')} ({reports.length})</h2>
          <LocalSearch 
             data={reports} 
             searchKeys={['report_name', 'folder']} 
             onSelect={(item) => handleSelectReport(item)} 
             placeholder={t('modules.reports.searchPlaceholder')} 
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
                  <tr key={report.id} id={`report-row-${report.id}`} className="clickable-row" onClick={() => handleViewReport(report)}>
                    <td className="fw-bold">
                      <span className="report-name-link" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                        {report.report_name}
                      </span>
                    </td>
                    <td className="text-muted" style={{ maxWidth: 300 }}><div className="truncate">{report.description}</div></td>
                    <td><span className="badge badge-normal" style={{ background: 'var(--bg-secondary)' }}> {report.folder}</span></td>
                    <td>{report.created_by}</td>
                    <td className="text-muted">{new Date(report.created_at).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-2" style={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); generatePDF(report); }} title="Download PDF">
                          PDF
                        </button>
                        <button className="btn-icon text-primary" onClick={(e) => { e.stopPropagation(); handleOpenModal(report); }} title="Edit Configuration">
                          <Edit2 size={16} />
                        </button>
                        {isAdmin && (
                          <button className="btn-icon text-danger" onClick={(e) => { e.stopPropagation(); handleDeleteReport(report); }} title="Delete Report">
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

      {/* PDF is now generated directly with jsPDF — no hidden preview div needed */}

      {isModalOpen && renderModal()}
    </div>
  )
}
