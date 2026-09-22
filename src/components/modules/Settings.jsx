import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { ASSIGNABLE_ROLES } from '../../config/roles'
import toast from 'react-hot-toast'
import {
  Settings as SettingsIcon,
  ArrowLeft,
  Building2,
  DollarSign,
  Globe,
  Users,
  Bell,
  ListChecks,
  Shield,
  ChevronRight,
  Upload,
  Plus,
  Trash2,
  Check,
  X,
  UserPlus,
  Edit3,
} from 'lucide-react'

// ─── localStorage helpers ────────────────────────────────────────────────────
const lsGet = (key, fallback) => {
  try {
    const v = localStorage.getItem(key)
    return v !== null ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}
const lsSet = (key, val) => localStorage.setItem(key, JSON.stringify(val))

// ─── Dropdown arrow SVG (same as original) ──────────────────────────────────
const DROP_ARROW =
  'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23333%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")'

const dropStyle = {
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: DROP_ARROW,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 16px center',
  backgroundSize: '10px',
}

// ─── Section menu metadata ───────────────────────────────────────────────────
const SECTIONS = [
  {
    key: 'about',
    icon: <Building2 size={26} />,
    title: 'Business info',
    desc: 'Business name, logo, address and tax details.',
    color: '#f97316',
  },
  {
    key: 'money',
    icon: <DollarSign size={26} />,
    title: 'Currency settings',
    desc: 'Currency, tax rate and invoice payment due days.',
    color: '#10b981',
  },
  {
    key: 'language',
    icon: <Globe size={26} />,
    title: 'Languages',
    desc: 'Display language, date and number formats.',
    color: '#3b82f6',
  },
  {
    key: 'team',
    icon: <Users size={26} />,
    title: 'Team details',
    desc: 'Add team members and manage their roles.',
    color: '#8b5cf6',
  },
  {
    key: 'notifications',
    icon: <Bell size={26} />,
    title: 'Notifications',
    desc: 'WhatsApp, SMS and email notification preferences.',
    color: '#ec4899',
  },
  {
    key: 'pipeline',
    icon: <ListChecks size={26} />,
    title: 'Pipeline settings',
    desc: 'Rename your deals pipeline stages to match how you work.',
    color: '#f59e0b',
  },
  {
    key: 'backup',
    icon: <Shield size={26} />,
    title: 'Security',
    desc: 'Auto-backup and extra login security.',
    color: '#64748b',
  },
]

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function SettingsPage({ session, profile }) {
  const { i18n, t } = useTranslation()
  const [activeSection, setActiveSection] = useState(null)

  const SECTIONS = [
    {
      key: 'about',
      icon: <Building2 size={26} />,
      title: t('settings.sections.about.title'),
      desc: t('settings.sections.about.desc'),
      color: '#f97316',
    },
    {
      key: 'money',
      icon: <DollarSign size={26} />,
      title: t('settings.sections.money.title'),
      desc: t('settings.sections.money.desc'),
      color: '#10b981',
    },
    {
      key: 'language',
      icon: <Globe size={26} />,
      title: t('settings.sections.language.title'),
      desc: t('settings.sections.language.desc'),
      color: '#3b82f6',
    },
    {
      key: 'team',
      icon: <Users size={26} />,
      title: t('settings.sections.team.title'),
      desc: t('settings.sections.team.desc'),
      color: '#8b5cf6',
    },
    {
      key: 'notifications',
      icon: <Bell size={26} />,
      title: t('settings.sections.notifications.title'),
      desc: t('settings.sections.notifications.desc'),
      color: '#ec4899',
    },
    {
      key: 'pipeline',
      icon: <ListChecks size={26} />,
      title: t('settings.sections.pipeline.title'),
      desc: t('settings.sections.pipeline.desc'),
      color: '#f59e0b',
    },
    {
      key: 'backup',
      icon: <Shield size={26} />,
      title: t('settings.sections.backup.title'),
      desc: t('settings.sections.backup.desc'),
      color: '#64748b',
    },
  ]

  const isAdmin = ['admin', 'administrator'].includes(
    (session?.user?.user_metadata?.role || profile?.role || '').toLowerCase()
  )

  const goBack = () => setActiveSection(null)

  // ── Route to active section ──────────────────────────────────────────────
  if (activeSection === 'about')
    return <AboutSection session={session} profile={profile} onBack={goBack} />
  if (activeSection === 'money')
    return <MoneySection session={session} profile={profile} onBack={goBack} />
  if (activeSection === 'language')
    return <LanguageSection session={session} profile={profile} onBack={goBack} i18n={i18n} />
  if (activeSection === 'team')
    return <TeamSection session={session} profile={profile} onBack={goBack} isAdmin={isAdmin} />
  if (activeSection === 'notifications')
    return <NotificationsSection session={session} profile={profile} onBack={goBack} />
  if (activeSection === 'pipeline')
    return <PipelineSection session={session} profile={profile} onBack={goBack} />
  if (activeSection === 'backup')
    return <BackupSection session={session} profile={profile} onBack={goBack} />

  // ── Main Settings menu ───────────────────────────────────────────────────
  return (
    <div className="settings-page anim-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <SettingsIcon
              size={24}
              style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }}
            />
            {t('settings.title')}
          </h1>
          <p className="page-subtitle">{t('settings.subtitle')}</p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
          gap: 14,
          maxWidth: 900,
        }}
      >
        {SECTIONS.map((sec) => (
          <button
            key={sec.key}
            onClick={() => setActiveSection(sec.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '18px 18px',
              background: '#ffffff',
              border: '1.5px solid #e5e7eb',
              borderRadius: 16,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.18s ease',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              width: '100%',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = sec.color
              e.currentTarget.style.boxShadow = `0 4px 18px ${sec.color}28`
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb'
              e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            {/* Icon bubble */}
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 12,
                flexShrink: 0,
                background: sec.color + '18',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: sec.color,
              }}
            >
              {sec.icon}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#111827',
                  marginBottom: 3,
                }}
              >
                {sec.title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#9ca3af',
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {sec.desc}
              </div>
            </div>

            <ChevronRight size={17} style={{ color: '#d1d5db', flexShrink: 0 }} />
          </button>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// REUSABLE SECTION CARD WRAPPER
// ════════════════════════════════════════════════════════════════════════════
function SectionCard({ onBack, icon, color, title, desc, children, backLabel }) {
  const { t } = useTranslation()
  return (
    <div className="anim-fade-in" style={{ maxWidth: 620 }}>
      {/* Breadcrumb / back row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 22,
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: '1.5px solid #e5e7eb',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: 13,
            fontWeight: 600,
            color: '#4b5563',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.color = 'var(--accent)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb'
            e.currentTarget.style.color = '#4b5563'
          }}
        >
          <ArrowLeft size={14} />
          {t('settings.backToSettings')}
        </button>
        <span style={{ fontSize: 13, color: '#9ca3af' }}>/ {title}</span>
      </div>

      {/* Main card */}
      <div className="card" style={{ padding: 28 }}>
        {/* Section header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
            marginBottom: 22,
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              flexShrink: 0,
              background: color + '18',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color,
            }}
          >
            {icon}
          </div>
          <div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: '#111827',
                marginBottom: 4,
              }}
            >
              {title}
            </h2>
            <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>{desc}</p>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #f1f5f9', marginBottom: 22 }} />
        {children}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 1. ABOUT MY BUSINESS
// ════════════════════════════════════════════════════════════════════════════
function AboutSection({ session, profile, onBack }) {
  const { t } = useTranslation()
  const [bizName, setBizName] = useState(
    profile?.business_name || lsGet('biz_name', '')
  )
  const [bizAddress, setBizAddress] = useState(
    profile?.business_address || lsGet('biz_address', '')
  )
  const [gstId, setGstId] = useState(
    profile?.gst_id || lsGet('biz_gst', '')
  )
  const [logoUrl, setLogoUrl] = useState(
    profile?.business_logo_url || lsGet('biz_logo', '')
  )
  const [logoFileName, setLogoFileName] = useState(
    (profile?.business_logo_url || lsGet('biz_logo', ''))?.startsWith('data:image') ? 'Saved Image' : ''
  )
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error(t('settings.about.imageOnly'))
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setLogoUrl(event.target.result)
      setLogoFileName(file.name)
    }
    reader.readAsDataURL(file)
  }

  const validate = () => {
    if (!bizName.trim()) {
      toast.error(t('settings.about.bizNameRequired'))
      return false
    }
    if (gstId && !/^[A-Za-z0-9]{1,15}$/.test(gstId)) {
      toast.error(t('settings.about.gstError'))
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    const tid = toast.loading(t('settings.about.saving'))

    // Always persist to localStorage as a reliable fallback
    lsSet('biz_name', bizName.trim())
    lsSet('biz_address', bizAddress.trim())
    lsSet('biz_gst', gstId.trim())
    lsSet('biz_logo', logoUrl.trim())

    // Also attempt Supabase (columns may need the migration SQL to exist)
    const { error } = await supabase
      .from('profiles')
      .update({
        business_name: bizName.trim(),
        business_address: bizAddress.trim(),
        gst_id: gstId.trim(),
        business_logo_url: logoUrl.trim(),
      })
      .eq('id', session.user.id)

    if (error) {
      // Column doesn't exist yet — localStorage save is enough for now
      toast.success(t('settings.about.savedSuccess'), { id: tid })
    } else {
      toast.success(t('settings.about.savedSuccess'), { id: tid })
    }
    setSaving(false)
  }

  return (
    <SectionCard
      onBack={onBack}
      icon={<Building2 size={22} />}
      color="#f97316"
      title={t('settings.about.title')}
      desc={t('settings.about.desc')}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Business Name */}
        <div className="form-group">
          <label className="form-label">{t('settings.about.businessName')}</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. Kaviya Traders"
            value={bizName}
            onChange={(e) => setBizName(e.target.value)}
          />
        </div>

        {/* Logo */}
        <div className="form-group">
          <label className="form-label">{t('settings.about.businessLogo')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-input"
              type="text"
              placeholder={t('settings.about.logoPlaceholder')}
              value={logoFileName || logoUrl}
              onChange={(e) => {
                if (logoFileName) {
                  setLogoFileName('')
                  setLogoUrl('')
                } else {
                  setLogoUrl(e.target.value)
                }
              }}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                ...(logoFileName ? { background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' } : {})
              }}
            >
              {logoFileName ? <Check size={13} /> : <Upload size={13} />}
              {logoFileName ? t('settings.about.uploaded') : t('settings.about.upload')}
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={() => {
                  setLogoUrl('')
                  setLogoFileName('')
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  padding: '8px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: '#ef4444',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  transition: 'all 0.15s ease'
                }}
              >
                <Trash2 size={13} />
                {t('settings.about.remove')}
              </button>
            )}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              style={{ display: 'none' }} 
            />
          </div>
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Logo preview"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
              style={{
                marginTop: 10,
                height: 48,
                maxWidth: 180,
                objectFit: 'contain',
                borderRadius: 6,
                border: '1px solid #e5e7eb',
                padding: 4,
              }}
            />
          )}
        </div>

        {/* Address */}
        <div className="form-group">
          <label className="form-label">{t('settings.about.businessAddress')}</label>
          <textarea
            className="form-input"
            rows={3}
            placeholder={t('settings.about.addressPlaceholder')}
            value={bizAddress}
            onChange={(e) => setBizAddress(e.target.value)}
            style={{ resize: 'vertical' }}
          ></textarea>
        </div>

        {/* GST */}
        <div className="form-group">
          <label className="form-label">{t('settings.about.gstId')}</label>
          <input
            className="form-input"
            type="text"
            placeholder={t('settings.about.gstPlaceholder')}
            value={gstId}
            onChange={(e) => setGstId(e.target.value.toUpperCase())}
            maxLength={15}
            style={{ maxWidth: 280 }}
          />
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 5 }}>
            {t('settings.about.gstNote')}
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
          style={{ alignSelf: 'flex-start', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? t('settings.about.saving') : t('settings.about.saveBtn')}
        </button>
      </div>
    </SectionCard>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 2. MONEY SETTINGS
// ════════════════════════════════════════════════════════════════════════════
function MoneySection({ session, profile, onBack }) {
  const { t } = useTranslation()
  const [currency, setCurrency] = useState(profile?.currency || '$')
  const [taxRate, setTaxRate] = useState(
    String(profile?.tax_rate ?? lsGet('tax_rate', 18))
  )
  const [dueDays, setDueDays] = useState(
    String(profile?.payment_due_days ?? lsGet('payment_due_days', 15))
  )
  const [revenueGoal, setRevenueGoal] = useState(
    String(profile?.revenue_goal ?? lsGet('revenue_goal', 10000))
  )
  const [saving, setSaving] = useState(false)

  const validate = () => {
    const tax = parseFloat(taxRate)
    const days = parseInt(dueDays, 10)
    const goal = parseFloat(revenueGoal)
    if (isNaN(tax) || tax < 0 || tax > 100) {
      toast.error(t('settings.money.taxRateError'))
      return false
    }
    if (isNaN(days) || days < 1 || days > 365) {
      toast.error(t('settings.money.dueDaysError'))
      return false
    }
    if (isNaN(goal) || goal <= 0) {
      toast.error(t('settings.money.revenueGoalError', 'Please enter a valid revenue goal greater than 0.'))
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    const tid = toast.loading(t('settings.money.savingMsg'))

    // Save to localStorage always
    lsSet('currency', currency)
    lsSet('tax_rate', parseFloat(taxRate))
    lsSet('payment_due_days', parseInt(dueDays, 10))
    lsSet('revenue_goal', parseFloat(revenueGoal))

    // Save currency (this column definitely exists)
    const { error } = await supabase
      .from('profiles')
      .update({ currency })
      .eq('id', session.user.id)

    // Attempt to save new columns (might silently fail if migration not run yet, but localStorage handles it locally)
    await supabase
      .from('profiles')
      .update({
        tax_rate: parseFloat(taxRate),
        payment_due_days: parseInt(dueDays, 10),
        revenue_goal: parseFloat(revenueGoal),
      })
      .eq('id', session.user.id)

    if (error) {
      toast.success(t('settings.money.savedSuccess'), { id: tid })
    } else {
      toast.success(t('settings.money.savedSuccess'), { id: tid })
    }

    setSaving(false)
    // Reload so currency propagates to all tiles (same as original behaviour)
    setTimeout(() => window.location.reload(), 900)
  }

  return (
    <SectionCard
      onBack={onBack}
      icon={<DollarSign size={22} />}
      color="#10b981"
      title={t('settings.money.title')}
      desc={t('settings.money.desc')}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Currency */}
        <div className="form-group">
          <label className="form-label">{t('settings.money.currencyLabel')}</label>
          <select
            className="form-input"
            style={{ maxWidth: 300, ...dropStyle }}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="$">$ — USD / Global</option>
            <option value="₹">₹ — Indian Rupee (INR)</option>
            <option value="€">€ — Euro (EUR)</option>
            <option value="£">£ — British Pound (GBP)</option>
            <option value="¥">¥ — Japanese Yen / Chinese Yuan</option>
          </select>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 5 }}>
            {t('settings.money.currencyNote')}
          </p>
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9' }} />

        {/* Monthly Revenue Goal */}
        <div className="form-group">
          <label className="form-label">{t('settings.money.revenueGoal', 'Monthly Revenue Goal')}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              className="form-input"
              type="number"
              min={1}
              value={revenueGoal}
              onChange={(e) => setRevenueGoal(e.target.value)}
              style={{ maxWidth: 200 }}
            />
            <span
              style={{ fontSize: 14, color: '#4b5563', fontWeight: 600 }}
            >
              {currency}
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 5 }}>
            {t('settings.money.revenueGoalNote', 'Target sales/invoiced revenue for the dashboard goal meter.')}
          </p>
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9' }} />

        {/* Tax Rate */}
        <div className="form-group">
          <label className="form-label">{t('settings.money.taxRate')}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              className="form-input"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              style={{ maxWidth: 140 }}
            />
            <span
              style={{ fontSize: 14, color: '#4b5563', fontWeight: 600 }}
            >
              %
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 5 }}>
            {t('settings.money.taxNote')}
          </p>
        </div>

        {/* Due Days */}
        <div className="form-group">
          <label className="form-label">{t('settings.money.dueDays')}</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              className="form-input"
              type="number"
              min={1}
              max={365}
              value={dueDays}
              onChange={(e) => setDueDays(e.target.value)}
              style={{ maxWidth: 140 }}
            />
            <span
              style={{ fontSize: 14, color: '#4b5563', fontWeight: 600 }}
            >
              {t('settings.money.daysUnit')}
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 5 }}>
            {t('settings.money.dueDaysNote')}
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
          style={{ alignSelf: 'flex-start', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? t('settings.money.saving') : t('settings.money.saveBtn')}
        </button>
      </div>
    </SectionCard>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 3. LANGUAGE & FORMAT
// ════════════════════════════════════════════════════════════════════════════
// Moved ToggleRow outside to prevent remounting issues on re-render
const ToggleRow = ({ label, desc, optA, optB, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label className="form-label">{label}</label>
    <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 6px' }}>{desc}</p>
    <div
      style={{
        display: 'flex',
        background: '#f1f5f9',
        borderRadius: 10,
        padding: 4,
        maxWidth: 400,
      }}
    >
      {[optA, optB].map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1,
            padding: '8px 10px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s',
            background: value === opt.value ? '#fff' : 'transparent',
            color: value === opt.value ? 'var(--accent)' : '#6b7280',
            boxShadow:
              value === opt.value
                ? '0 1px 4px rgba(0,0,0,0.1)'
                : 'none',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
)

function LanguageSection({ session, profile, onBack, i18n }) {
  const { t } = useTranslation()
  const [selectedLang, setSelectedLang] = useState(
    () => localStorage.getItem('i18nextLng') || i18n?.language || 'en'
  )
  const [dateFormat, setDateFormat] = useState(lsGet('date_format', 'DD/MM/YYYY'))
  const [numberFormat, setNumberFormat] = useState(lsGet('number_format', 'indian'))

  const languages = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
    { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  ]

  // Same logic as original — immediate language switch + localStorage
  const handleLanguageChange = (code) => {
    setSelectedLang(code)
    if (i18n && i18n.changeLanguage) {
      i18n.changeLanguage(code)
    }
    localStorage.setItem('i18nextLng', code)
    toast.success(t('settings.language.languageUpdated'))
  }

  const handleFormatSave = () => {
    lsSet('date_format', dateFormat)
    lsSet('number_format', numberFormat)
    toast.success(t('settings.language.formatSaved'))
  }

  return (
    <SectionCard
      onBack={onBack}
      icon={<Globe size={22} />}
      color="#3b82f6"
      title={t('settings.language.title')}
      desc={t('settings.language.desc')}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Language picker — same UI as original */}
        <div className="form-group">
          <label
            className="form-label"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 12,
            }}
          >
            <Globe size={14} />
            {t('settings.language.displayLanguage')}
          </label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 10,
                  border:
                    selectedLang === lang.code
                      ? '2px solid var(--accent)'
                      : '1.5px solid #e2e8f0',
                  background:
                    selectedLang === lang.code
                      ? 'rgba(255,89,0,0.08)'
                      : '#fff',
                  cursor: 'pointer',
                  fontWeight: selectedLang === lang.code ? 700 : 500,
                  fontSize: 13,
                  color:
                    selectedLang === lang.code
                      ? 'var(--accent)'
                      : 'var(--text-primary, #1e293b)',
                  transition: 'all 0.18s',
                  boxShadow:
                    selectedLang === lang.code
                      ? '0 2px 8px rgba(255,89,0,0.13)'
                      : '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <span style={{ fontSize: 18 }}>{lang.flag}</span>
                <span>{lang.label}</span>
                {selectedLang === lang.code && (
                  <span
                    style={{
                      marginLeft: 4,
                      fontSize: 13,
                      color: 'var(--accent)',
                    }}
                  >
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
            {t('settings.language.changesNote')}
          </p>
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9' }} />

        {/* Date format */}
        <ToggleRow
          label={t('settings.language.dateFormat')}
          desc={t('settings.language.dateFormatDesc')}
          optA={{ value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' }}
          optB={{ value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' }}
          value={dateFormat}
          onChange={setDateFormat}
        />

        {/* Number format */}
        <ToggleRow
          label={t('settings.language.numberFormat')}
          desc={t('settings.language.numberFormatDesc')}
          optA={{ value: 'indian', label: t('settings.language.indian') }}
          optB={{ value: 'international', label: t('settings.language.international') }}
          value={numberFormat}
          onChange={setNumberFormat}
        />

        <button
          onClick={handleFormatSave}
          className="btn btn-primary"
          style={{ alignSelf: 'flex-start' }}
        >
          {t('settings.language.saveFormatBtn')}
        </button>
      </div>
    </SectionCard>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 4. MY TEAM
// ════════════════════════════════════════════════════════════════════════════
function TeamSection({ session, profile, onBack, isAdmin }) {
  const { t } = useTranslation()
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [creating, setCreating] = useState(false)

  const BLANK_ADD = { name: '', email: '', password: '', role: 'manager', phone: '', address: '', age: '', gender: '', date_of_birth: '', date_of_joining: '' }
  const [addForm, setAddForm] = useState(BLANK_ADD)
  const [addPhoto, setAddPhoto] = useState(null)
  const addPhotoRef = useRef(null)

  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editPhoto, setEditPhoto] = useState(null)
  const editPhotoRef = useRef(null)

  const ROLE_OPTIONS = ASSIGNABLE_ROLES
  const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say']

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  const uploadPhoto = async (file, userId) => {
    if (!file || !userId) return null
    const ext = file.name.split('.').pop()
    const path = `team-photos/${userId}.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data?.publicUrl || null
  }

  const fetchTeam = async () => {
    setLoading(true)
    try {
      let ids = []
      const { data: byAdmin } = await supabase.from('profiles').select('id').eq('created_by_admin_id', session.user.id)
      if (byAdmin) byAdmin.forEach(t => ids.push(t.id))
      const { data: byCreator } = await supabase.from('profiles').select('id').eq('created_by', session.user.id)
      if (byCreator) byCreator.forEach(t => { if (!ids.includes(t.id)) ids.push(t.id) })
      if (profile?.company_name) {
        const { data: byCompany } = await supabase.from('profiles').select('id').ilike('company_name', `%${profile.company_name}%`).neq('id', session.user.id)
        if (byCompany) byCompany.forEach(t => { if (!ids.includes(t.id)) ids.push(t.id) })
      }
      if (ids.length > 0) {
        const { data } = await supabase.from('profiles').select('*').in('id', ids).order('created_at', { ascending: false })
        setTeamMembers(data || [])
      } else {
        setTeamMembers([])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) fetchTeam()
  }, [isAdmin])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!addForm.name.trim()) return toast.error(t('settings.team.nameRequired'))
    if (!isValidEmail(addForm.email)) return toast.error(t('settings.team.invalidEmail'))
    if (addForm.password.length < 6) return toast.error(t('settings.team.passwordShort'))

    setCreating(true)
    const tid = toast.loading(t('settings.team.creatingAccount'))

    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = 'https://bmsnbwgwdxqhccqesgkt.supabase.co'
      const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtc25id2d3ZHhxaGNjcWVzZ2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTExNjksImV4cCI6MjA4OTA4NzE2OX0.IhByvcKXFOL6XwW3UhTig6XMzNrNvpYFhaehq2_DUBU'
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } })

      const { error } = await tempClient.auth.signUp({
        email: addForm.email, password: addForm.password,
        options: {
          data: {
            name: addForm.name.trim(), role: addForm.role,
            companyName: profile?.company_name || 'My Company',
            companyType: profile?.company_type || 'B2B',
            created_by_admin_id: session.user.id
          },
        },
      })
      if (error) throw error

      toast.success(`Account for ${addForm.email} created. Profile details can be edited once they appear below.`, { id: tid })
      setAddForm(BLANK_ADD)
      setAddPhoto(null)
      setIsAdding(false)
      setTimeout(fetchTeam, 1500)
    } catch (err) {
      toast.error(err.message || 'Failed to create account', { id: tid })
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (user) => {
    setEditingId(user.id)
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'user',
      phone: user.phone || '',
      address: user.address || '',
      age: user.age || '',
      gender: user.gender || '',
      date_of_birth: user.date_of_birth || '',
      date_of_joining: user.date_of_joining || '',
      photo_url: user.photo_url || '',
    })
    setEditPhoto(null)
  }

  const cancelEdit = () => { setEditingId(null); setEditForm({}); setEditPhoto(null) }

  const saveEdit = async (userId) => {
    if (!editForm.name.trim()) return toast.error(t('settings.team.nameEmpty'))
    const tid = toast.loading(t('settings.team.savingChanges'))
    try {
      let photo_url = editForm.photo_url || null
      if (editPhoto) {
        const uploaded = await uploadPhoto(editPhoto, userId)
        if (uploaded) photo_url = uploaded
      }

      const updatePayload = {
        name: editForm.name,
        role: editForm.role,
        phone: editForm.phone || null,
        address: editForm.address || null,
        age: editForm.age ? parseInt(editForm.age) : null,
        gender: editForm.gender || null,
        date_of_birth: editForm.date_of_birth || null,
        date_of_joining: editForm.date_of_joining || null,
        photo_url,
      }

      const { error } = await supabase.from('profiles').update(updatePayload).eq('id', userId)
      if (error) throw error
      toast.success(t('settings.team.memberUpdated'), { id: tid })
      setEditingId(null)
      setEditPhoto(null)
      fetchTeam()
    } catch (err) {
      toast.error(err.message, { id: tid })
    }
  }

  const handleRemove = async (userId, userName) => {
    if (!window.confirm(`${t('settings.team.confirmRemove')} ${userName || 'this user'}?`)) return
    const tid = toast.loading(t('settings.team.removingMember'))
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId)
      if (error) throw error
      toast.success(t('settings.team.memberRemoved'), { id: tid })
      fetchTeam()
    } catch (err) {
      toast.error(err.message, { id: tid })
    }
  }

  const fieldStyle = { padding: '7px 10px', margin: 0 }
  const labelStyle = { fontSize: 11, color: '#64748b', fontWeight: 600, marginBottom: 3, display: 'block' }

  return (
    <SectionCard
      onBack={onBack}
      icon={<Users size={22} />}
      color="#8b5cf6"
      title={t('settings.team.title')}
      desc={t('settings.team.desc')}
    >
      {!isAdmin ? (
        <div style={{ padding: '14px 16px', background: '#fef9c3', borderRadius: 10, fontSize: 13, color: '#92400e' }}>
          ⚠️ {t('settings.team.adminOnly')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Add Button */}
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#8b5cf6', color: '#fff', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer', alignSelf: 'flex-start' }}
            >
              <UserPlus size={16} /> {t('settings.team.addNewUser')}
            </button>
          )}

          {/* Inline Add Form */}
          {isAdding && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1e293b' }}>{t('settings.team.addNewUser')}</h4>
                <button onClick={() => { setIsAdding(false); setAddForm(BLANK_ADD) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { label: t('settings.team.fullName'), key: 'name', type: 'text' },
                  { label: t('settings.team.emailAddress'), key: 'email', type: 'email' },
                  { label: t('settings.team.password'), key: 'password', type: 'password' },
                  { label: t('settings.team.phoneNumber'), key: 'phone', type: 'tel' },
                  { label: t('settings.team.dateOfJoining'), key: 'date_of_joining', type: 'date' },
                  { label: t('settings.team.dateOfBirth'), key: 'date_of_birth', type: 'date' },
                  { label: t('settings.team.age'), key: 'age', type: 'number' },
                ].map(f => (
                  <div key={f.key} className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>{f.label}</label>
                    <input type={f.type} className="form-input" style={{ padding: '8px 12px' }}
                      value={addForm[f.key]} onChange={e => setAddForm(p => ({ ...p, [f.key]: e.target.value }))}
                      required={f.label.includes('*')} min={f.type === 'number' ? 1 : undefined} />
                  </div>
                ))}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>{t('settings.team.gender')}</label>
                  <select className="form-input" style={{ padding: '8px 12px', ...dropStyle }} value={addForm.gender} onChange={e => setAddForm(p => ({ ...p, gender: e.target.value }))}>
                    <option value="">{t('settings.team.selectGender')}</option>
                    {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>{t('settings.team.role')}</label>
                  <select className="form-input" style={{ padding: '8px 12px', ...dropStyle }} value={addForm.role} onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))}>
                    {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>{t('settings.team.address')}</label>
                  <input type="text" className="form-input" style={{ padding: '8px 12px' }} value={addForm.address} onChange={e => setAddForm(p => ({ ...p, address: e.target.value }))} />
                </div>
                <div style={{ gridColumn: '1 / -1', marginTop: 4 }}>
                  <button type="submit" disabled={creating} className="btn btn-primary" style={{ padding: '8px 20px', background: '#8b5cf6', borderColor: '#8b5cf6' }}>
                    {creating ? t('settings.team.creating') : t('settings.team.createUser')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Team List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#334155' }}>{t('settings.team.existingMembers')}</h4>
            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 14 }}>{t('settings.team.loadingTeam')}</div>
            ) : teamMembers.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', background: '#f8fafc', borderRadius: 8, color: '#64748b', fontSize: 14 }}>
                {t('settings.team.noMembers')}
              </div>
            ) : (
              teamMembers.map(user => {
                const isEditing = editingId === user.id
                return (
                  <div key={user.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
                    {/* VIEW MODE */}
                    {!isEditing && (
                      <div style={{ display: 'flex', gap: 16, padding: 16, alignItems: 'flex-start' }}>
                        {/* Photo */}
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f1f5f9', border: '2px solid #e2e8f0', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#94a3b8' }}>
                          {user.photo_url
                            ? <img src={user.photo_url} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : (user.name?.[0] || '?').toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div>
                              <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 15 }}>{user.name || t('settings.team.unnamed')}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span style={{ padding: '3px 10px', background: user.role === 'admin' ? '#ede9fe' : '#f0fdf4', color: user.role === 'admin' ? '#7c3aed' : '#16a34a', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                                {ROLE_OPTIONS.find(r => r.value === user.role)?.label || user.role}
                              </span>
                              <button onClick={() => startEdit(user)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b5cf6', padding: 6 }} title={t('settings.team.edit')}><Edit3 size={15} /></button>
                              <button onClick={() => handleRemove(user.id, user.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 6 }} title={t('settings.team.remove')}><Trash2 size={15} /></button>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '6px 16px', fontSize: 12, color: '#64748b' }}>
                            {user.email && <div><strong>{t('settings.team.email')}</strong> {user.email}</div>}
                            {user.phone && <div><strong>{t('settings.team.phone')}</strong> {user.phone}</div>}
                            {user.gender && <div><strong>{t('settings.team.genderLabel')}</strong> {user.gender}</div>}
                            {user.age && <div><strong>{t('settings.team.ageLabel')}</strong> {user.age}</div>}
                            {user.date_of_birth && <div><strong>{t('settings.team.dobLabel')}</strong> {new Date(user.date_of_birth).toLocaleDateString()}</div>}
                            {user.date_of_joining && <div><strong>{t('settings.team.joinedLabel')}</strong> {new Date(user.date_of_joining).toLocaleDateString()}</div>}
                            {user.address && <div style={{ gridColumn: '1 / -1' }}><strong>{t('settings.team.addressLabel')}</strong> {user.address}</div>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* EDIT MODE */}
                    {isEditing && (
                      <div style={{ padding: 18 }}>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
                          {/* Photo edit */}
                          <div
                            onClick={() => editPhotoRef.current?.click()}
                            style={{ width: 70, height: 70, borderRadius: '50%', background: '#f1f5f9', border: '2px dashed #8b5cf6', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 11, color: '#8b5cf6', textAlign: 'center' }}
                            title={t('settings.team.changePhoto')}
                          >
                            {editPhoto
                              ? <img src={URL.createObjectURL(editPhoto)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : editForm.photo_url
                                ? <img src={editForm.photo_url} alt="current" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : t('settings.team.photo')}
                          </div>
                          <input type="file" accept="image/*" ref={editPhotoRef} style={{ display: 'none' }} onChange={e => setEditPhoto(e.target.files[0] || null)} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>{t('settings.team.editingPrefix')} {editForm.name}</div>
                            <div style={{ fontSize: 12, color: '#94a3b8' }}>{t('settings.team.clickPhotoHint')}</div>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          {[
                            { label: t('settings.team.fullName'), key: 'name', type: 'text' },
                            { label: t('settings.team.phoneNumber'), key: 'phone', type: 'tel' },
                            { label: t('settings.team.age'), key: 'age', type: 'number' },
                            { label: t('settings.team.dateOfBirth'), key: 'date_of_birth', type: 'date' },
                            { label: t('settings.team.dateOfJoining'), key: 'date_of_joining', type: 'date' },
                          ].map(f => (
                            <div key={f.key}>
                              <label style={labelStyle}>{f.label}</label>
                              <input type={f.type} className="form-input" style={fieldStyle}
                                value={editForm[f.key] || ''}
                                onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                                min={f.type === 'number' ? 1 : undefined} />
                            </div>
                          ))}
                          <div>
                            <label style={labelStyle}>{t('settings.team.gender')}</label>
                            <select className="form-input" style={{ ...fieldStyle, ...dropStyle }} value={editForm.gender || ''} onChange={e => setEditForm(p => ({ ...p, gender: e.target.value }))}>
                              <option value="">{t('settings.team.selectGender')}</option>
                              {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={labelStyle}>{t('settings.team.role')}</label>
                            <select className="form-input" style={{ ...fieldStyle, ...dropStyle }} value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}>
                              {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={labelStyle}>{t('settings.team.emailReadOnly')}</label>
                            <input type="email" className="form-input" style={{ ...fieldStyle, opacity: 0.6 }} value={editForm.email} disabled />
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>{t('settings.team.address')}</label>
                            <input type="text" className="form-input" style={fieldStyle} value={editForm.address || ''} onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))} />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                          <button onClick={() => saveEdit(user.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#10b981', border: 'none', borderRadius: 7, color: '#fff', cursor: 'pointer', padding: '8px 16px', fontWeight: 600 }}>
                            <Check size={15} /> {t('settings.team.saveChanges')}
                          </button>
                          <button onClick={cancelEdit} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#e2e8f0', border: 'none', borderRadius: 7, color: '#475569', cursor: 'pointer', padding: '8px 14px', fontWeight: 600 }}>
                            <X size={15} /> {t('settings.team.cancel')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </SectionCard>
  )
}


// ════════════════════════════════════════════════════════════════════════════
// 5. HOW I GET NOTIFIED
// ════════════════════════════════════════════════════════════════════════════
function NotificationsSection({ session, profile, onBack }) {
  const { t } = useTranslation()
  const [wa, setWa] = useState(lsGet('notif_whatsapp', false))
  const [sms, setSms] = useState(lsGet('notif_sms', true))
  const [emailNotif, setEmailNotif] = useState(lsGet('notif_email', true))

  const handleSave = () => {
    lsSet('notif_whatsapp', wa)
    lsSet('notif_sms', sms)
    lsSet('notif_email', emailNotif)
    toast.success(t('settings.notifications.savedSuccess'))
  }

  const ToggleSwitch = ({ label, desc, value, onChange }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        padding: '16px 0',
        borderBottom: '1px solid #f1f5f9',
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#111827',
            marginBottom: 3,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 12, color: '#9ca3af' }}>{desc}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          border: 'none',
          cursor: 'pointer',
          background: value ? 'var(--accent)' : '#d1d5db',
          position: 'relative',
          flexShrink: 0,
          transition: 'background 0.2s',
          marginTop: 2,
        }}
        aria-label={label}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: value ? 23 : 3,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </button>
    </div>
  )

  return (
    <SectionCard
      onBack={onBack}
      icon={<Bell size={22} />}
      color="#ec4899"
      title={t('settings.notifications.title')}
      desc={t('settings.notifications.desc')}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <ToggleSwitch
          label={t('settings.notifications.whatsapp')}
          desc={t('settings.notifications.whatsappDesc')}
          value={wa}
          onChange={setWa}
        />
        <ToggleSwitch
          label={t('settings.notifications.sms')}
          desc={t('settings.notifications.smsDesc')}
          value={sms}
          onChange={setSms}
        />
        <ToggleSwitch
          label={t('settings.notifications.email')}
          desc={t('settings.notifications.emailDesc')}
          value={emailNotif}
          onChange={setEmailNotif}
        />
        <button
          onClick={handleSave}
          className="btn btn-primary"
          style={{ alignSelf: 'flex-start', marginTop: 22 }}
        >
          {t('settings.notifications.saveBtn')}
        </button>
      </div>
    </SectionCard>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 6. MY SALES STEPS (Pipeline)
// ════════════════════════════════════════════════════════════════════════════
const DEFAULT_STAGES = ['New Lead', 'Contacted', 'Quote Sent', 'Won', 'Lost']

function PipelineSection({ session, profile, onBack }) {
  const { t } = useTranslation()
  const [stages, setStages] = useState(() =>
    lsGet('pipeline_stages', DEFAULT_STAGES)
  )
  const [editIdx, setEditIdx] = useState(null)
  const [editVal, setEditVal] = useState('')
  const [newStage, setNewStage] = useState('')

  const startEdit = (i) => {
    setEditIdx(i)
    setEditVal(stages[i])
  }
  const cancelEdit = () => {
    setEditIdx(null)
    setEditVal('')
  }
  const confirmEdit = () => {
    if (!editVal.trim()) {
      toast.error(t('settings.pipeline.stageEmpty'))
      return
    }
    setStages(stages.map((s, i) => (i === editIdx ? editVal.trim() : s)))
    setEditIdx(null)
    setEditVal('')
  }
  const removeStage = (i) => {
    if (stages.length <= 2) {
      toast.error(t('settings.pipeline.minStages'))
      return
    }
    setStages(stages.filter((_, idx) => idx !== i))
  }
  const addStage = () => {
    if (!newStage.trim()) return
    if (stages.map((s) => s.toLowerCase()).includes(newStage.trim().toLowerCase())) {
      toast.error(t('settings.pipeline.stageExists'))
      return
    }
    setStages([...stages, newStage.trim()])
    setNewStage('')
  }
  const handleSave = async () => {
    const oldStages = lsGet('pipeline_stages', ['Prospecting', 'Scoping', 'Negotiation', 'Legal', 'Contract', 'Closed'])
    lsSet('pipeline_stages', stages)

    const loadingToast = toast.loading(t('settings.pipeline.syncing') || 'Syncing deals to updated pipeline...')
    try {
      // 1. Handle renamed stages
      for (let i = 0; i < Math.min(oldStages.length, stages.length); i++) {
        const oldName = oldStages[i]
        const newName = stages[i]
        if (oldName !== newName) {
          await supabase
            .from('opportunities')
            .update({ stage: newName })
            .eq('stage', oldName)
        }
      }

      // 2. Handle deleted stages (fallback deals to the first stage of the new pipeline)
      const deletedStages = oldStages.filter(s => !stages.includes(s))
      if (deletedStages.length > 0 && stages.length > 0) {
        const fallbackStage = stages[0]
        for (const ds of deletedStages) {
          await supabase
            .from('opportunities')
            .update({ stage: fallbackStage })
            .eq('stage', ds)
        }
      }

      toast.success(t('settings.pipeline.savedSuccess') || 'Pipeline updated successfully!', { id: loadingToast })
    } catch (err) {
      console.error(err)
      toast.error('Failed to sync pipeline update', { id: loadingToast })
    }
  }

  return (
    <SectionCard
      onBack={onBack}
      icon={<ListChecks size={22} />}
      color="#f59e0b"
      title={t('settings.pipeline.title')}
      desc={t('settings.pipeline.desc')}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {stages.map((stage, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              background: '#f9fafb',
              borderRadius: 10,
              border: '1.5px solid #e5e7eb',
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: '#9ca3af',
                fontWeight: 700,
                minWidth: 22,
                flexShrink: 0,
              }}
            >
              {i + 1}.
            </span>

            {editIdx === i ? (
              <>
                <input
                  value={editVal}
                  autoFocus
                  onChange={(e) => setEditVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmEdit()
                    if (e.key === 'Escape') cancelEdit()
                  }}
                  style={{
                    flex: 1,
                    border: '1.5px solid var(--accent)',
                    borderRadius: 6,
                    padding: '5px 10px',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={confirmEdit}
                  type="button"
                  title={t('settings.pipeline.save')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#10b981',
                    padding: 4,
                  }}
                >
                  <Check size={15} />
                </button>
                <button
                  onClick={cancelEdit}
                  type="button"
                  title={t('settings.pipeline.cancel')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9ca3af',
                    padding: 4,
                  }}
                >
                  <X size={15} />
                </button>
              </>
            ) : (
              <>
                <span
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#111827',
                  }}
                >
                  {stage}
                </span>
                <button
                  onClick={() => startEdit(i)}
                  type="button"
                  title={t('settings.pipeline.rename')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9ca3af',
                    padding: 4,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = '#f59e0b')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = '#9ca3af')
                  }
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => removeStage(i)}
                  type="button"
                  title={t('settings.pipeline.remove')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9ca3af',
                    padding: 4,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = '#ef4444')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = '#9ca3af')
                  }
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add new stage */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          className="form-input"
          type="text"
          placeholder={t('settings.pipeline.addPlaceholder')}
          value={newStage}
          onChange={(e) => setNewStage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addStage()
          }}
          style={{ flex: 1 }}
        />
        <button
          onClick={addStage}
          type="button"
          className="btn btn-secondary"
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Plus size={14} />
          {t('settings.pipeline.addBtn')}
        </button>
      </div>

      <button
        onClick={handleSave}
        className="btn btn-primary"
        style={{ alignSelf: 'flex-start' }}
      >
        {t('settings.pipeline.saveBtn')}
      </button>
    </SectionCard>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 7. BACKUP & SAFETY
// ════════════════════════════════════════════════════════════════════════════
function BackupSection({ session, profile, onBack }) {
  const { t } = useTranslation()
  const [autoBackup, setAutoBackup] = useState(lsGet('auto_backup', false))
  const [requireOtp, setRequireOtp] = useState(lsGet('require_otp', false))

  const handleSave = () => {
    lsSet('auto_backup', autoBackup)
    lsSet('require_otp', requireOtp)
    toast.success(t('settings.backup.savedSuccess'))
  }

  const ToggleSwitch = ({ label, desc, value, onChange }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        padding: '16px 0',
        borderBottom: '1px solid #f1f5f9',
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#111827',
            marginBottom: 3,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 12, color: '#9ca3af' }}>{desc}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          border: 'none',
          cursor: 'pointer',
          background: value ? 'var(--accent)' : '#d1d5db',
          position: 'relative',
          flexShrink: 0,
          transition: 'background 0.2s',
          marginTop: 2,
        }}
        aria-label={label}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: value ? 23 : 3,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </button>
    </div>
  )

  return (
    <SectionCard
      onBack={onBack}
      icon={<Shield size={22} />}
      color="#64748b"
      title={t('settings.backup.title')}
      desc={t('settings.backup.desc')}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <ToggleSwitch
          label={t('settings.backup.autoBackup')}
          desc={t('settings.backup.autoBackupDesc')}
          value={autoBackup}
          onChange={setAutoBackup}
        />
        <ToggleSwitch
          label={t('settings.backup.extraSecurity')}
          desc={t('settings.backup.extraSecurityDesc')}
          value={requireOtp}
          onChange={setRequireOtp}
        />
        <button
          onClick={handleSave}
          className="btn btn-primary"
          style={{ alignSelf: 'flex-start', marginTop: 22 }}
        >
          {t('settings.backup.saveBtn')}
        </button>
      </div>
    </SectionCard>
  )
}
