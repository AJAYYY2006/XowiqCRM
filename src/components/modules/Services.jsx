import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Package, DollarSign, Clock, Save, GripVertical, Settings2, Palette, Zap, Layers } from 'lucide-react'
import LocalSearch from '../ui/LocalSearch'

export default function Services({ session, profile }) {
  const userIds = profile?.teamUserIds || [session.user.id]
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingService, setEditingService] = useState(null)
  
  const [formData, setFormData] = useState({
    service_name: '',
    price: 0,
    reminder_days: 30,
    description: '',
    status: 'active',
    service_type: 'Instant'
  })

  // Stage Builder State
  // Stage tracking is now per-service (service_type field), no global toggle needed
  const [stages, setStages] = useState([])
  const [isStageModalOpen, setIsStageModalOpen] = useState(false)
  const [editingStage, setEditingStage] = useState(null)
  
  const [stageFormData, setStageFormData] = useState({ name: '', color: '#f97316' });
  const [accounts, setAccounts] = useState([]);
  const [animatingCards, setAnimatingCards] = useState({});
  const [stageHistory, setStageHistory] = useState([]);
  const isAdmin = ['admin', 'administrator'].includes((session?.user?.user_metadata?.role || profile?.role || '').toLowerCase())

  useEffect(() => {
    fetchServices()
    fetchStages();
    fetchAccounts();
    fetchStageHistory();
  }, [session, profile])

  const fetchStages = async () => {
    try {
      const { data, error } = await supabase.from('b2c_stages').select('*').order('order_index', { ascending: true });
      if (error) throw error;
      setStages(data || []);
    } catch (e) {
      console.error('Failed to load stages:', e);
    }
  };

  const fetchAccounts = async () => {
    try {
      const { data: accsData, error: accErr } = await supabase
        .from('accounts')
        .select('*')
        .in('user_id', userIds);

      if (accErr) throw accErr;

      const accountIds = (accsData || []).map(a => a.id);
      if (accountIds.length === 0) {
        setAccounts([]);
        return;
      }

      const { data: csData } = await supabase
        .from('customer_services')
        .select('*, services(service_name)')
        .in('account_id', accountIds);

      // Coerce both sides to String to avoid bigint vs UUID mismatch
      const mappedAccounts = (accsData || []).map(acc => {
        const myServices = (csData || []).filter(
          cs => String(cs.account_id) === String(acc.id)
        );
        return { ...acc, customer_services: myServices };
      });

      console.log('[StageBuilder] accounts mapped:', mappedAccounts.map(a => ({
        name: a.account_name,
        id: a.id,
        services: (a.customer_services || []).map(cs => cs.services?.service_name)
      })));
      setAccounts(mappedAccounts);
    } catch(e) {
      console.error('Failed to load accounts for stage builder', e);
    }
  };

  const fetchStageHistory = async () => {
    try {
      const { data } = await supabase
        .from('b2c_customer_stages')
        .select('id, moved_at, customer_id, b2c_stages:stage_id(name, color), services:service_id(service_name)')
        .order('moved_at', { ascending: false }).limit(20);
      
      // Resolve account names (customer_id is text, accounts.id is bigint — can't FK join)
      if (data && data.length > 0) {
        const customerIds = [...new Set(data.map(d => d.customer_id).filter(Boolean))];
        const { data: accs } = await supabase.from('accounts').select('id, account_name').in('id', customerIds);
        const accMap = {};
        (accs || []).forEach(a => { accMap[String(a.id)] = a.account_name; });
        const enriched = data.map(d => ({ ...d, customer_name: accMap[String(d.customer_id)] || `Customer #${d.customer_id}` }));
        setStageHistory(enriched);
      } else {
        setStageHistory([]);
      }
    } catch(e) {
      console.error('Failed to fetch stage history', e);
    }
  };

  // Global toggle removed — stage tracking is now per-service via service_type field

  const fetchServices = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setServices(data || [])
    } catch (error) {
      console.error('Failed to load services:', error)
      toast.error('Failed to load services catalog')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (service = null) => {
    if (service) {
      setEditingService(service)
      setFormData({
        service_name: service.service_name,
        price: service.price || 0,
        reminder_days: service.reminder_days || 30,
        description: service.description || '',
        status: service.status || 'active',
        service_type: service.service_type || 'Multi-Stage'
      })
    } else {
      setEditingService(null)
      setFormData({
        service_name: '',
        price: 0,
        reminder_days: 30,
        description: '',
        status: 'active',
        service_type: 'Instant'
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingService ? 'Updating service...' : 'Adding service...')
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        reminder_days: Number(formData.reminder_days),
        user_id: session.user.id
      }

      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update(payload)
          .eq('id', editingService.id)
        if (error) throw error
        toast.success('Service updated', { id: toastId })
        
        // SYNC REMINDERS: If Name or Reminder Days changed
        if (editingService.service_name !== payload.service_name || editingService.reminder_days !== payload.reminder_days) {
          try {
            // Find all active service entries
            const { data: linkedServices } = await supabase.from('customer_services').select('*, accounts(account_name)').eq('service_id', editingService.id).not('task_id', 'is', null)
            
            if (linkedServices && linkedServices.length > 0) {
              for (const entry of linkedServices) {
                const sDate = new Date(entry.assigned_date)
                const newReminderDate = new Date(sDate)
                newReminderDate.setDate(newReminderDate.getDate() + Number(payload.reminder_days))
                
                await supabase.from('tasks').update({
                  title: `Service Reminder: ${payload.service_name} for ${entry.accounts?.account_name || 'Customer'}`,
                  due_date: newReminderDate.toISOString()
                }).eq('id', entry.task_id)
              }
              toast.success(`Synched ${linkedServices.length} linked reminder(s)`)
            }
          } catch(e) {
            console.error('Failed to sync linked reminders', e)
          }
        }
      } else {
        const { error } = await supabase
          .from('services')
          .insert([payload])
        if (error) throw error
        toast.success('Service added to catalog', { id: toastId })
      }
      
      setIsModalOpen(false)
      fetchServices()
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleDelete = async (service) => {
    if (!confirm(`Delete service "${service.service_name}"? This might affect existing customer history.`)) return
    const toastId = toast.loading('Deleting...')
    try {
      const { error } = await supabase.from('services').delete().eq('id', service.id)
      if (error) throw error
      toast.success('Service deleted', { id: toastId })
      fetchServices()
    } catch (error) {
      toast.error('Failed to delete service', { id: toastId })
    }
  }

  // --- STAGE LOGIC ---
  const handleOpenStageModal = (stage = null) => {
    if (stage) {
      setEditingStage(stage)
      setStageFormData({
        name: stage.name,
        color: stage.color || '#f97316'
      })
    } else {
      setEditingStage(null)
      setStageFormData({
        name: '',
        color: '#f97316'
      })
    }
    setIsStageModalOpen(true)
  }

  const handleStageSubmit = async (e) => {
    e.preventDefault()
    const toastId = toast.loading(editingStage ? 'Updating stage...' : 'Adding stage...')
    try {
      const payload = {
        name: stageFormData.name,
        color: stageFormData.color
      }

      if (editingStage) {
        const { error } = await supabase.from('b2c_stages').update(payload).eq('id', editingStage.id)
        if (error) throw error
        toast.success('Stage updated', { id: toastId })
      } else {
        payload.order_index = stages.length;
        payload.user_id = session.user.id;
        const { error } = await supabase.from('b2c_stages').insert([payload])
        if (error) throw error
        toast.success('Stage added', { id: toastId })
      }
      
      setIsStageModalOpen(false)
      fetchStages()
    } catch (error) {
      toast.error(error.message, { id: toastId })
    }
  }

  const handleDeleteStage = async (stage) => {
    if (!confirm(`Delete stage "${stage.name}"? Customers in this stage will lose their specific tracking stage.`)) return
    const toastId = toast.loading('Deleting...')
    try {
      const { error } = await supabase.from('b2c_stages').delete().eq('id', stage.id)
      if (error) throw error
      toast.success('Stage deleted', { id: toastId })
      fetchStages()
    } catch (error) {
      toast.error('Failed to delete stage', { id: toastId })
    }
  }

  const handleDragStartCustomer = (e, accountId, sourceStageId) => {
    e.dataTransfer.setData('accountId', accountId);
    e.dataTransfer.setData('sourceStageId', sourceStageId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropCustomer = async (e, destStageId) => {
    e.preventDefault();
    const accountId = e.dataTransfer.getData('accountId');
    const sourceStageId = e.dataTransfer.getData('sourceStageId');
    if (!accountId || sourceStageId === destStageId) return;

    const destStage = stages.find(s => s.id === destStageId);
    const sourceStage = stages.find(s => s.id === sourceStageId);
    
    const isForward = (destStage?.order_index || 0) > (sourceStage?.order_index || 0);
    const animationClass = isForward ? 'flyUp' : 'flyBack';

    setAnimatingCards(prev => ({ ...prev, [accountId]: animationClass }));

    setTimeout(async () => {
      const updatedAccounts = accounts.map(a => 
        a.id === accountId ? { ...a, b2c_stage_id: destStageId } : a
      );
      setAccounts(updatedAccounts);
      
      setAnimatingCards(prev => ({ ...prev, [accountId]: 'flyIn' }));
      
      setTimeout(() => {
        setAnimatingCards(prev => {
          const newState = { ...prev };
          delete newState[accountId];
          return newState;
        });
      }, 500);

      try {
        await supabase.from('accounts').update({ b2c_stage_id: destStageId }).eq('id', accountId);

        const customer = accounts.find(a => a.id === accountId);
        const serviceId = customer?.customer_services?.[0]?.service_id || null;

        await supabase.from('b2c_customer_stages').insert({
          customer_id: String(accountId),
          stage_id: destStageId,
          service_id: serviceId,
          moved_at: new Date().toISOString()
        });
        
        fetchStageHistory();
      } catch (err) {
        toast.error('Failed to update stage');
        fetchAccounts();
      }
    }, 480);
  };

  if (loading) return <div className="loading-container"><div className="spinner" /></div>

  return (
    <div className="services-page" style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title"><Package size={28} style={{ color: '#f37a23', marginRight: 12, verticalAlign: 'bottom' }} />Master Services Catalog</h1>
          <p className="page-subtitle">Define and manage the services your business offers to customers.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Add New Service
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: '0 20px' }}>
          <LocalSearch 
            data={services} 
            setResults={(res) => {}} // LocalSearch usually handles internal state but let's assume it works
            placeholder="Search services by name or description..." 
          />
      </div>

      <div className="services-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
        {services.length === 0 ? (
          <div className="empty-state card" style={{ gridColumn: '1/-1', padding: 60 }}>
            <Package size={48} color="#e2e8f0" style={{ marginBottom: 16 }} />
            <h3>No services in catalog</h3>
            <p>Your master services list is empty. Add your first service to start assigning it to customers.</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={() => handleOpenModal()}>Create Service</button>
          </div>
        ) : (
          services.map(svc => (
            <div key={svc.id} className="card service-card" style={{ padding: 24, position: 'relative', borderTop: '4px solid #f37a23' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#1e293b' }}>{svc.service_name}</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-icon" onClick={() => handleOpenModal(svc)} title="Edit"><Edit2 size={16} /></button>
                  {isAdmin && (
                    <button className="btn-icon text-danger" onClick={() => handleDelete(svc)} title="Delete"><Trash2 size={16} /></button>
                  )}
                </div>
              </div>
              
              <div className="service-details" style={{ fontSize: 14, color: '#64748b' }}>
                <p style={{ marginBottom: 12, minHeight: 40 }}>{svc.description || 'No description provided.'}</p>
                
                <div style={{ marginBottom: 12 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800, background: (svc.service_type || 'Multi-Stage') === 'Instant' ? '#dbeafe' : '#fef3c7', color: (svc.service_type || 'Multi-Stage') === 'Instant' ? '#1d4ed8' : '#92400e' }}>
                    {(svc.service_type || 'Multi-Stage') === 'Instant' ? <Zap size={13} /> : <Layers size={13} />}
                    {svc.service_type || 'Multi-Stage'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: 4 }}>Standard Price</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a' }}>{profile?.currency || '$'}{Number(svc.price).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: 4 }}>Reminder Cycle</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#f37a23', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                      <Clock size={16} /> {svc.reminder_days} Days
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- CUSTOMER STAGE BUILDER SECTION --- */}
      <div className="card" style={{ marginTop: 40, padding: 32, borderTop: '4px solid #f97316' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Settings2 size={24} color="#f97316" />
              Customer Stage Builder
            </h2>
            <p style={{ color: '#64748b', fontSize: 14 }}>Visual Kanban pipelines for Multi-Stage services. Instant services skip stages automatically.</p>
          </div>
        </div>

          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#475569' }}>Your Custom Stages</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => handleOpenStageModal()}>
                <Plus size={16} /> Add New Stage
              </button>
            </div>

            {stages.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12 }}>
                <p style={{ color: '#64748b', marginBottom: 12 }}>You have not defined any stages yet.</p>
                <button className="btn btn-primary btn-sm" onClick={() => handleOpenStageModal()}>Create First Stage</button>
              </div>
            ) : (
              <>
              <div className="kanban-scroll-container" style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, width: '100%', minWidth: 0 }}>
                  {stages.map((stg) => {
                    const stageAccounts = accounts.filter(a => a.b2c_stage_id === stg.id);
                    return (
                      <div 
                        key={stg.id} 
                        style={{ flex: '0 0 320px', background: '#f8fafc', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0' }}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropCustomer(e, stg.id)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: stg.color }}></div>
                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{stg.name}</h3>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', background: '#e2e8f0', padding: '2px 8px', borderRadius: 12 }}>{stageAccounts.length}</span>
                            <button className="btn-icon" onClick={() => handleOpenStageModal(stg)}><Edit2 size={16} /></button>
                            {isAdmin && (
                              <button className="btn-icon text-danger" onClick={() => handleDeleteStage(stg)}><Trash2 size={16} /></button>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 100 }}>
                          {stageAccounts.map(acc => {
                            const serviceNames = (acc.customer_services || [])
                              .map(cs => cs.services?.service_name)
                              .filter(Boolean);
                            const serviceName = serviceNames.length > 0 ? serviceNames.join(', ') : 'No Service';
                            const animation = animatingCards[acc.id] || '';
                            return (
                            <div 
                              key={acc.id} 
                              draggable 
                              onDragStart={(e) => handleDragStartCustomer(e, acc.id, stg.id)}
                              style={{ 
                                background: '#fff', 
                                borderLeft: `4px solid ${stg.color}`, 
                                borderRadius: 8, 
                                padding: 12, 
                                cursor: 'grab', 
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                animation: animation ? `${animation} 0.5s forwards` : 'none'
                              }}
                              className="customer-kanban-card"
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: `linear-gradient(135deg, ${stg.color}, #cbd5e1)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900 }}>
                                  {acc.account_name[0]?.toUpperCase()}
                                </div>
                                <span style={{ fontWeight: 700, fontSize: 14 }}>{acc.account_name}</span>
                              </div>
                              <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Package size={12} /> {serviceName}
                              </div>
                            </div>
                          )})}
                          {stageAccounts.length === 0 && <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>Drop customers here</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* Timeline UI */}
                <div style={{ marginTop: 32, padding: '24px 0', borderTop: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 16 }}>Live Stage Timeline</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {stageHistory.length === 0 ? <p style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>No movement history yet.</p> : null}
                    {stageHistory.map(hist => (
                      <div key={hist.id} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: hist.b2c_stages?.color || '#cbd5e1' }} />
                        <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(hist.moved_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{hist.customer_name}</span>
                        <span style={{ color: '#64748b' }}>moved to</span>
                        <span style={{ padding: '2px 8px', borderRadius: 12, background: (hist.b2c_stages?.color || '#cbd5e1') + '20', color: hist.b2c_stages?.color || '#cbd5e1', fontWeight: 700 }}>{hist.b2c_stages?.name}</span>
                        {hist.services?.service_name && <span style={{ color: '#94a3b8' }}>({hist.services.service_name})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingService ? 'Edit Service' : 'Define New Service'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Service Name *</label>
                <input required className="form-input" value={formData.service_name} onChange={e => setFormData({...formData, service_name: e.target.value})} placeholder="e.g. Monthly Maintenance, Full Cleanup" />
              </div>
              
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Standard Price ({profile?.currency || '$'}) *</label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input type="number" required className="form-input" style={{ paddingLeft: 32 }} value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Reminder Cycle (Days) *</label>
                  <div style={{ position: 'relative' }}>
                    <Clock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input type="number" required className="form-input" style={{ paddingLeft: 32 }} value={formData.reminder_days} onChange={e => setFormData({...formData, reminder_days: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Service Type *</label>
                <select required className="form-input" value={formData.service_type} onChange={e => setFormData({...formData, service_type: e.target.value})}>
                  <option value="Instant">⚡ Instant — Completed immediately, no Kanban card</option>
                  <option value="Multi-Stage">🔄 Multi-Stage — Tracked through custom stages</option>
                </select>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  {formData.service_type === 'Instant' 
                    ? 'This service will be marked as completed immediately when assigned to a customer.'
                    : 'This service will create a Kanban card and move through your custom stages.'}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label">Service Description</label>
                <textarea className="form-input" style={{ minHeight: 100, padding: 12 }} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Briefly describe what this service includes..." />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Save size={18} /> {editingService ? 'Save Changes' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stage Modal */}
      {isStageModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2 className="modal-title">{editingStage ? 'Edit Stage' : 'Define New Stage'}</h2>
              <button className="modal-close" onClick={() => setIsStageModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleStageSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Stage Name *</label>
                <input required className="form-input" value={stageFormData.name} onChange={e => setStageFormData({...stageFormData, name: e.target.value})} placeholder="e.g. In Progress, Completed" />
              </div>
              
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label">Stage Color Badge *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input type="color" required style={{ width: 50, height: 40, padding: 0, cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: 8 }} value={stageFormData.color} onChange={e => setStageFormData({...stageFormData, color: e.target.value})} />
                  <span style={{ fontSize: 13, color: '#64748b' }}>Select badge color</span>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsStageModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Save size={18} /> {editingStage ? 'Save Stage' : 'Create Stage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes flyUp {
          0%   { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
          30%  { transform: translateY(-18px) scale(1.04) rotate(-1.5deg); opacity: 1; }
          70%  { transform: translateY(-80px) scale(0.92) rotate(2deg); opacity: 0.6; }
          100% { transform: translateY(-160px) scale(0.7) rotate(-3deg); opacity: 0; }
        }
        @keyframes flyIn {
          0%   { transform: translateY(-60px) scale(0.85); opacity: 0; }
          60%  { transform: translateY(6px) scale(1.02); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes flyBack {
          0%   { transform: translateY(0) scale(1); opacity: 1; }
          40%  { transform: translateY(30px) scale(0.95); opacity: 0.5; }
          100% { transform: translateY(80px) scale(0.8); opacity: 0; }
        }

        .service-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .service-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 25px -5px rgba(243, 122, 35, 0.1), 0 10px 10px -5px rgba(243, 122, 35, 0.04);
        }
      `}} />
      <style>{`
        .kanban-scroll-container::-webkit-scrollbar { height: 8px; }
        .kanban-scroll-container::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .kanban-scroll-container::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .kanban-scroll-container::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  )
}
