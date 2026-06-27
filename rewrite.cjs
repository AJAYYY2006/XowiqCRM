const fs = require('fs');
let code = fs.readFileSync('src/components/modules/Services.jsx', 'utf8');

// Replace state variables
code = code.replace(
  "const [stageFormData, setStageFormData] = useState({\n    stage_name: '',\n    badge_color: '#f37a23'\n  })",
  "const [stageFormData, setStageFormData] = useState({ name: '', color: '#f97316' });\n  const [accounts, setAccounts] = useState([]);\n  const [animatingCards, setAnimatingCards] = useState({});\n  const [stageHistory, setStageHistory] = useState([]);"
);

// Replace fetchStages & use effect tracking
code = code.replace(
  /const fetchStages = async \(\) => {[\s\S]*?const handleToggleStageTracking/m,
  `const fetchStages = async () => {
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
      const { data } = await supabase.from('accounts').select('*, customer_services(service_id, services(service_name))').eq('user_id', session.user.id);
      setAccounts(data || []);
    } catch(e) {
      console.error('Failed to load accounts for stage builder', e);
    }
  };

  const fetchStageHistory = async () => {
    try {
      const { data } = await supabase
        .from('b2c_customer_stages')
        .select('id, moved_at, accounts:customer_id(account_name), b2c_stages:stage_id(name, color), services:service_id(service_name)')
        .order('moved_at', { ascending: false }).limit(20);
      setStageHistory(data || []);
    } catch(e) {
      console.error('Failed to fetch stage history', e);
    }
  };

  useEffect(() => {
    if (isStageTrackingEnabled) {
      fetchStages();
      fetchAccounts();
      fetchStageHistory();
    }
  }, [session, isStageTrackingEnabled]);

  const handleToggleStageTracking`
);

// Replace form state usage
code = code.replace(/stage_name: stage\.stage_name,/g, "name: stage.name,");
code = code.replace(/badge_color: stage\.badge_color(?: \|\| '#f37a23')?/g, "color: stage.color || '#f97316'");
code = code.replace(/stage_name: '',/g, "name: '',");
code = code.replace(/badge_color: '#f37a23'/g, "color: '#f97316'");

code = code.replace(
  "stage_name: stageFormData.stage_name,\n        badge_color: stageFormData.badge_color",
  "name: stageFormData.name,\n        color: stageFormData.color"
);

code = code.replace(
  /const \{ error \} = await supabase.from\('b2c_stages'\).insert\(\[payload\]\)/,
  "payload.order_index = stages.length;\n        const { error } = await supabase.from('b2c_stages').insert([payload])"
);

code = code.replace(
  /Delete stage "\$\{stage.stage_name\}"\?/g,
  `Delete stage "\${stage.name}"?`
);

// Replace drag events
code = code.replace(
  /const handleDragStart = \(e, index\) => \{[\s\S]*?if \(loading\) return/m,
  `const handleDragStartCustomer = (e, accountId, sourceStageId) => {
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
          customer_id: accountId,
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

  if (loading) return`
);

// Replace Customer Stage Builder render section
code = code.replace(
  /<div style={{ border: '1px solid #e2e8f0'[\s\S]*?}\)}[\s\S]*?<\/div>[\s\S]*?}\)}[\s\S]*?<\/div>/m,
  `<div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
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
              <button className="btn-icon text-danger" onClick={() => handleDeleteStage(stg)}><Trash2 size={16} /></button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 100 }}>
            {stageAccounts.map(acc => {
              const serviceName = acc.customer_services?.[0]?.services?.service_name || 'No Service';
              const animation = animatingCards[acc.id] || '';
              return (
              <div 
                key={acc.id} 
                draggable 
                onDragStart={(e) => handleDragStartCustomer(e, acc.id, stg.id)}
                style={{ 
                  background: '#fff', 
                  borderLeft: '4px solid ' + stg.color, 
                  borderRadius: 8, 
                  padding: 12, 
                  cursor: 'grab', 
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  animation: animation ? animation + ' 0.5s forwards' : 'none'
                }}
                className="customer-kanban-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, ' + stg.color + ', #cbd5e1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900 }}>
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
          <span style={{ fontWeight: 600, color: '#1e293b' }}>{hist.accounts?.account_name}</span>
          <span style={{ color: '#64748b' }}>moved to</span>
          <span style={{ padding: '2px 8px', borderRadius: 12, background: (hist.b2c_stages?.color || '#cbd5e1') + '20', color: hist.b2c_stages?.color || '#cbd5e1', fontWeight: 700 }}>{hist.b2c_stages?.name}</span>
          {hist.services?.service_name && <span style={{ color: '#94a3b8' }}>({hist.services.service_name})</span>}
        </div>
      ))}
    </div>
  </div>`
);

code = code.replace(
  /value=\{stageFormData\.stage_name\} onChange=\{e => setStageFormData\(\{\.\.\.stageFormData, stage_name/g,
  "value={stageFormData.name} onChange={e => setStageFormData({...stageFormData, name"
);

code = code.replace(
  /value=\{stageFormData\.badge_color\} onChange=\{e => setStageFormData\(\{\.\.\.stageFormData, badge_color/g,
  "value={stageFormData.color} onChange={e => setStageFormData({...stageFormData, color"
);

code = code.replace(
  /<style dangerouslySetInnerHTML={{ __html: \`/m,
  `<style dangerouslySetInnerHTML={{ __html: \\\`
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
        }\`
`
);

fs.writeFileSync('src/components/modules/Services.jsx', code);
