import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Plus, Pencil, CheckCircle, Trash2, ArrowLeft, Package, LayoutGrid, 
  ChevronRight, FileText, Receipt, CheckSquare, Activity, ClipboardList, TrendingUp, Settings, Check, UploadCloud
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import LocalSearch from '../ui/LocalSearch'
import toast from 'react-hot-toast'
import WhatsAppButton from '../ui/WhatsAppButton'
import { getWhatsAppMessage, formatPhoneDisplay, cleanPhoneNumber } from '../../lib/whatsapp'
import FieldBuilderModal from '../ui/FieldBuilderModal'
import BulkUploadModal from '../ui/BulkUploadModal'

// --- Constants ---
const DEFAULT_STAGES = ['Prospecting', 'Scoping', 'Negotiation', 'Legal', 'Contract', 'Closed']

export default function Opportunities({ session, profile }) {
  const { t } = useTranslation()
  const stages = (() => {
    try {
      const stored = localStorage.getItem('pipeline_stages')
      if (stored) return JSON.parse(stored)
    } catch (e) {}
    return DEFAULT_STAGES
  })()
  const location = useLocation()
  // --- State ---
  const [opportunities, setOpportunities] = useState([])
  const [accounts, setAccounts] = useState([])
  const [viewingOpp, setViewingOpp] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedOpp, setSelectedOpp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('products')
  const [formData, setFormData] = useState({
    name: '', account_id: '', amount: 0, stage: stages[0] || 'Prospecting', closed_date: '', owner: 'Ajay'
  })
  const [productForm, setProductForm] = useState({ name: '', qty: 1, price: 0 })
  const [products, setProducts] = useState([])
  const [linkedAccountPhone, setLinkedAccountPhone] = useState(null)
  const [linkedAccountName, setLinkedAccountName] = useState('')
  const [isFieldBuilderOpen, setIsFieldBuilderOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)

  // --- Effects ---
  useEffect(() => {
    fetchData()
  }, [session])

  const fetchData = async () => {
    try {
      setLoading(true)
      const userIds = profile?.teamUserIds || [session.user.id]
      const { data: opps, error: oppsError } = await supabase
        .from('opportunities')
        .select('*, accounts(account_name)')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
      
      const { data: accs, error: accsError } = await supabase
        .from('accounts')
        .select('*')
        .in('user_id', userIds)

      if (oppsError || accsError) throw oppsError || accsError
      setOpportunities(opps || [])
      setAccounts(accs || [])
    } catch (err) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (opportunities.length > 0 && location.state?.openId) {
      const opp = opportunities.find(o => o.id === location.state.openId)
      if (opp) {
        setViewingOpp(opp)
        window.history.replaceState({}, document.title)
      }
    }
  }, [opportunities, location.state])

  // Fetch phone from linked account when viewing an opportunity
  useEffect(() => {
    const fetchLinkedPhone = async () => {
      if (!viewingOpp?.account_id) {
        setLinkedAccountPhone(null)
        setLinkedAccountName('')
        return
      }
      // Try account phone first, then contacts
      const { data: acc } = await supabase
        .from('accounts')
        .select('phone, account_name, contacts(phone)')
        .eq('id', viewingOpp.account_id)
        .single()
      if (acc) {
        setLinkedAccountPhone(acc.phone || acc.contacts?.[0]?.phone || null)
        setLinkedAccountName(acc.account_name || '')
      }
    }
    fetchLinkedPhone()
  }, [viewingOpp])

  // --- Handlers ---
  const handleOpenModal = (opp = null) => {
    if (opp) {
      setSelectedOpp(opp)
      setFormData({
        name: opp.name,
        account_id: opp.account_id || '',
        amount: opp.amount || 0,
        stage: opp.stage || stages[0] || 'Prospecting',
        closed_date: opp.closed_date || '',
        owner: opp.owner || profile?.name || session.user.email
      })
    } else {
      setSelectedOpp(null)
      setFormData({
        name: '', account_id: '', amount: 0, stage: stages[0] || 'Prospecting', closed_date: '', 
        owner: profile?.name || session.user.email
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const loadingToast = toast.loading(selectedOpp ? 'Updating deal...' : 'Adding deal...')
    try {
      const data = { 
        ...formData, 
        user_id: session.user.id,
        account_id: formData.account_id || null,
        closed_date: formData.closed_date || null
      }
      if (selectedOpp) {
        const { error } = await supabase.from('opportunities').update(data).eq('id', selectedOpp.id)
        if (error) throw error

        if (viewingOpp && viewingOpp.id === selectedOpp.id) {
          const { data: updatedOpp } = await supabase
            .from('opportunities')
            .select('*, accounts(account_name)')
            .eq('id', selectedOpp.id)
            .single()
          if (updatedOpp) setViewingOpp(updatedOpp)
        }
      } else {
        const { error } = await supabase.from('opportunities').insert([data])
        if (error) throw error
      }
      setIsModalOpen(false)
      fetchData()
      toast.success(selectedOpp ? 'Deal updated' : 'Deal added', { id: loadingToast })
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Operation failed', { id: loadingToast })
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this deal?')) return
    const loadingToast = toast.loading('Deleting...')
    try {
      await supabase.from('opportunities').delete().eq('id', id)
      setOpportunities(prev => prev.filter(o => o.id !== id))
      if (viewingOpp?.id === id) setViewingOpp(null)
      toast.success('Deal deleted', { id: loadingToast })
    } catch {
      toast.error('Failed to delete', { id: loadingToast })
    }
  }

  const addProduct = (e) => {
    e.preventDefault()
    if (!productForm.name) return
    const newProduct = { 
      id: Date.now(), 
      name: productForm.name, 
      qty: productForm.qty, 
      price: productForm.price, 
      total: productForm.qty * productForm.price 
    }
    setProducts([...products, newProduct])
    setProductForm({ name: '', qty: 1, price: 0 })
  }

  const updateStage = async (newStage) => {
    if (!viewingOpp) return
    try {
      await supabase.from('opportunities').update({ stage: newStage }).eq('id', viewingOpp.id)
      setViewingOpp({ ...viewingOpp, stage: newStage })
      setOpportunities(prev => prev.map(o => o.id === viewingOpp.id ? { ...o, stage: newStage } : o))
      toast.success(`Stage updated to ${newStage}`)
    } catch {
      toast.error('Failed to update stage')
    }
  }

  if (loading) return <div className="loading-container"><div className="spinner"/></div>

  const isAdmin = ['admin', 'administrator'].includes((session?.user?.user_metadata?.role || profile?.role || '').toLowerCase())

  return (
    <div>
      {viewingOpp ? (
        /* --- DETAIL VIEW --- */
        <div className="animate-in fade-in">
          <button className="back-btn" onClick={() => setViewingOpp(null)} title="Back to Deals">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </button>

          <div className="card" style={{ marginBottom: 24 }}>
            <div className="detail-header">
              <div className="detail-avatar" style={{ backgroundColor: 'var(--accent, #ff5900)', color: '#ffffff' }}>
                 <TrendingUp size={24} />
              </div>
              <div className="detail-info">
                <h1 className="detail-name">{viewingOpp.name}</h1>
                <div className="detail-meta">
                   {viewingOpp.accounts?.account_name || 'No Account'} • {profile?.currency || '$'}{Number(viewingOpp.amount).toLocaleString()}
                </div>
                <div className={`badge badge-${viewingOpp.stage.toLowerCase()} mt-2`}>{viewingOpp.stage}</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => handleOpenModal(viewingOpp)}>
                  <Pencil size={14} style={{ marginRight: 6 }} /> Edit
                </button>
                {isAdmin && (
                  <button className="btn btn-secondary text-danger" onClick={() => handleDelete(viewingOpp.id)}>
                     <Trash2 size={14} style={{ marginRight: 6 }} /> Delete
                  </button>
                )}
              </div>
            </div>

            <div className="detail-grid" style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border-subtle, #e2e8f0)' }}>
              <div className="detail-field">
                <label>Deal ID</label>
                <span className="font-mono" style={{ fontSize: 11 }}>{viewingOpp.id}</span>
              </div>
              <div className="detail-field">
                <label>Deal Owner</label>
                <span>{viewingOpp.owner}</span>
              </div>
              <div className="detail-field">
                <label>Expected Close</label>
                <span>{viewingOpp.closed_date ? new Date(viewingOpp.closed_date).toLocaleDateString() : 'Not Set'}</span>
              </div>
              <div className="detail-field">
                <label>Created Date</label>
                <span>{new Date(viewingOpp.created_at).toLocaleDateString()}</span>
              </div>
              <div className="detail-field">
                <label>Contact Phone</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{(() => { const cleaned = cleanPhoneNumber(linkedAccountPhone); return cleaned ? formatPhoneDisplay(cleaned) : (linkedAccountPhone || 'No phone on account'); })()}</span>
                  <WhatsAppButton
                    phone={linkedAccountPhone}
                    messageText={getWhatsAppMessage('opportunity', {
                      firstName: (linkedAccountName || '').split(' ')[0],
                      opportunityName: viewingOpp.name
                    })}
                    session={session}
                    recordName={viewingOpp.name}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
             <div style={{ padding: 24 }}>
                <label className="form-label" style={{ marginBottom: 16, display: 'block', color: 'var(--text-muted)' }}>Pipeline Progress</label>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {stages.map((s, idx) => {
                    const currentIdx = stages.findIndex(val => val.toLowerCase() === (viewingOpp.stage || '').toLowerCase())
                    const isComplete = idx < currentIdx
                    const isActive = idx === currentIdx
                    return (
                      <div key={s} className="flex items-center gap-2 flex-1 min-w-[130px]">
                        <div 
                           onClick={() => updateStage(s)}
                           className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all select-none"
                           style={{
                             width: '100%',
                             minHeight: 46,
                             background: isActive 
                               ? 'linear-gradient(135deg, #ff5900 0%, #ea580c 100%)'
                               : isComplete 
                                 ? 'rgba(16, 185, 129, 0.12)' 
                                 : 'var(--bg-primary, #f8fafc)',
                             color: isActive 
                               ? '#ffffff' 
                               : isComplete 
                                 ? '#059669' 
                                 : 'var(--text-primary, #1e293b)',
                             border: isActive 
                               ? '1.5px solid #ff5900' 
                               : isComplete 
                                 ? '1.5px solid rgba(16, 185, 129, 0.35)' 
                                 : '1.5px solid var(--border-subtle, #e2e8f0)',
                             boxShadow: isActive ? '0 4px 12px rgba(255, 89, 0, 0.28)' : 'none',
                           }}
                        >
                           {isComplete && <Check size={13} strokeWidth={2.5} style={{ color: '#059669', flexShrink: 0 }} />}
                           <span style={{ 
                             fontSize: 11, 
                             fontWeight: isActive ? 800 : isComplete ? 700 : 600, 
                             textTransform: 'uppercase',
                             letterSpacing: '0.04em',
                             color: 'inherit'
                           }}>
                             {s}
                           </span>
                        </div>
                        {idx < stages.length - 1 && (
                          <ChevronRight size={14} style={{ color: 'var(--text-muted, #94a3b8)', flexShrink: 0 }} />
                        )}
                      </div>
                    )
                  })}
                </div>
             </div>
          </div>

          <div className="card">
            <div className="tabs">
              <button className={`tab ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
                Products ({products.length})
              </button>
              <button className={`tab ${activeTab === 'quotes' ? 'active' : ''}`} onClick={() => setActiveTab('quotes')}>
                Quotes
              </button>
              <button className={`tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
                Tasks
              </button>
              <button className={`tab ${activeTab === 'activities' ? 'active' : ''}`} onClick={() => setActiveTab('activities')}>
                Activities
              </button>
            </div>

            <div style={{ padding: 24 }}>
               {activeTab === 'products' && (
                 <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
                      <h3 style={{ margin: 0, fontSize: '15px' }}>Linked Products</h3>
                    </div>
                    <form onSubmit={addProduct} className="form-grid mb-4" style={{ backgroundColor: 'var(--bg-secondary)', padding: 16, borderRadius: 8 }}>
                       <div className="form-group">
                         <label className="form-label">Product Name</label>
                         <input className="form-input" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} placeholder="Service Package A" />
                       </div>
                       <div className="form-group">
                         <label className="form-label">Qty</label>
                         <input type="number" className="form-input" value={productForm.qty} onChange={e => setProductForm({...productForm, qty: parseInt(e.target.value) || 0})} />
                       </div>
                       <div className="form-group">
                         <label className="form-label">Unit Price ({profile?.currency || '$'})</label>
                         <input type="number" className="form-input" value={productForm.price} onChange={e => setProductForm({...productForm, price: parseFloat(e.target.value) || 0})} />
                       </div>
                       <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                         <button className="btn btn-primary w-full">+ Add</button>
                       </div>
                    </form>

                    <div style={{ overflowX: 'auto' }}>
                       <table>
                         <thead>
                           <tr><th>Name</th><th>Quantity</th><th>Price ({profile?.currency || '$'})</th><th>Total ({profile?.currency || '$'})</th></tr>
                         </thead>
                         <tbody>
                           {products.length === 0 ? (
                             <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>No products added</td></tr>
                           ) : (
                             products.map(p => (
                               <tr key={p.id}>
                                  <td className="fw-bold">{p.name}</td>
                                  <td>{p.qty}</td>
                                  <td>{profile?.currency || '$'}{p.price.toLocaleString()}</td>
                                  <td className="fw-bold">{profile?.currency || '$'}{p.total.toLocaleString()}</td>
                               </tr>
                             ))
                           )}
                         </tbody>
                         {products.length > 0 && (
                           <tfoot>
                             <tr style={{ background: 'var(--bg-secondary)' }}>
                                <td colSpan="3" style={{ textAlign: 'right', fontWeight: 700 }}>Grand Total:</td>
                                 <td className="fw-bold" style={{ color: 'var(--accent, #ff5900)', fontSize: 16 }}>
                                  {profile?.currency || '$'}{products.reduce((sum, p) => sum + p.total, 0).toLocaleString()}
                                </td>
                             </tr>
                           </tfoot>
                         )}
                       </table>
                    </div>
                 </div>
               )}

               {activeTab !== 'products' && (
                 <div className="empty-state">
                   <div className="empty-state-icon"></div>
                   <h3>No data found</h3>
                   <p>This section is currently empty for this deal.</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      ) : (
        /* --- LIST VIEW --- */
        <div className="animate-in fade-in">
          <div className="page-header">
            <div>
              <h1 className="page-title">{t('modules.opportunities.title')}</h1>
              <p className="page-subtitle">{t('modules.opportunities.subtitle')}</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => setIsFieldBuilderOpen(true)}>
                <Settings size={18} style={{ marginRight: 6 }} /> {t('modules.opportunities.editFields')}
              </button>
              <button className="btn btn-secondary" onClick={() => setIsImportOpen(true)}>
                <UploadCloud size={18} style={{ marginRight: 6 }} /> {t('bulkImport.button', 'Import Excel/CSV')}
              </button>
              <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                <Plus size={18} style={{ marginRight: 6 }} /> {t('modules.opportunities.newDeal')}
              </button>
            </div>
          </div>

          <div className="table-container">
            <div className="table-header">
              <h2 className="table-title">{t('modules.opportunities.activeDeals')} ({opportunities.length})</h2>
              <LocalSearch 
                 data={opportunities} 
                 searchKeys={['name', 'owner']} 
                 onSelect={(item) => setViewingOpp(item)} 
                 placeholder={t('modules.opportunities.searchPlaceholder')}
                 renderItem={(item) => (
                   <>
                     <div className="fw-bold" style={{ fontSize: '13px' }}>{item.name}</div>
                     <div className="text-muted" style={{ fontSize: '11px' }}>{item.accounts?.account_name}</div>
                   </>
                 )}
              />
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Deal Name</th>
                    <th>Account</th>
                    <th>Amount</th>
                    <th>Stage</th>
                    <th>Owner</th>
                    <th>Close Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.length === 0 ? (
                    <tr>
                      <td colSpan="7">
                        <div className="empty-state">
                          <h3>No deals found</h3>
                          <p>Start your pipeline by adding a new deal.</p>
                          <button className="btn btn-secondary mt-4" onClick={() => handleOpenModal()}>Add Deal</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    opportunities.map(opp => (
                      <tr key={opp.id} className="clickable-row" onClick={() => setViewingOpp(opp)}>
                        <td className="fw-bold">{opp.name}</td>
                        <td className="text-primary fw-bold" style={{ textDecoration: 'underline' }}>
                           {opp.accounts?.account_name || '-'}
                        </td>
                        <td className="fw-bold">{profile?.currency || '$'}{Number(opp.amount).toLocaleString()}</td>
                        <td>
                          <span className={`badge badge-${opp.stage.toLowerCase()}`}>
                            {opp.stage}
                          </span>
                        </td>
                        <td>{opp.owner || '-'}</td>
                        <td className="text-muted">
                           {opp.closed_date ? new Date(opp.closed_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                           <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                              <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); handleOpenModal(opp); }}>
                                 <Pencil size={14} />
                              </button>
                              {isAdmin && (
                                <button className="btn btn-secondary btn-sm text-danger" onClick={(e) => { e.stopPropagation(); handleDelete(opp.id); }}>
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
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{selectedOpp ? 'Edit Deal' : 'New Deal'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Deal Name *</label>
                  <input required className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Q4 Cloud Infrastructure Refresh" />
                </div>
                <div className="form-group">
                  <label className="form-label">Linked Account</label>
                  <select className="form-input" value={formData.account_id} onChange={e => setFormData({...formData, account_id: e.target.value})}>
                     <option value="">-- No Account --</option>
                     {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.account_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Deal Amount ({profile?.currency || '$'})</label>
                  <input type="number" className="form-input" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Pipeline Stage</label>
                  <select className="form-input" value={formData.stage} onChange={e => setFormData({...formData, stage: e.target.value})}>
                    {stages.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Expected Close Date</label>
                  <input type="date" className="form-input" value={formData.closed_date} onChange={e => setFormData({...formData, closed_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Deal Owner</label>
                  <input className="form-input" value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{selectedOpp ? 'Save Changes' : 'Create Deal'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <FieldBuilderModal 
        module="opportunity"
        businessId={session.user.id}
        isOpen={isFieldBuilderOpen}
        onClose={() => setIsFieldBuilderOpen(false)}
      />

      <BulkUploadModal
        module="opportunities"
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        session={session}
        profile={profile}
        onImported={fetchData}
      />
    </div>
  )
}
