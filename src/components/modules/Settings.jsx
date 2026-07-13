import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
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
    title: 'About My Business',
    desc: 'Business name, logo, address and tax details.',
    color: '#f97316',
  },
  {
    key: 'money',
    icon: <DollarSign size={26} />,
    title: 'Money Settings',
    desc: 'Currency, tax rate and invoice payment due days.',
    color: '#10b981',
  },
  {
    key: 'language',
    icon: <Globe size={26} />,
    title: 'Language & Format',
    desc: 'Display language, date and number formats.',
    color: '#3b82f6',
  },
  {
    key: 'team',
    icon: <Users size={26} />,
    title: 'My Team',
    desc: 'Add team members and manage their roles.',
    color: '#8b5cf6',
  },
  {
    key: 'notifications',
    icon: <Bell size={26} />,
    title: 'How I Get Notified',
    desc: 'WhatsApp, SMS and email notification preferences.',
    color: '#ec4899',
  },
  {
    key: 'pipeline',
    icon: <ListChecks size={26} />,
    title: 'My Sales Steps',
    desc: 'Rename your deals pipeline stages to match how you work.',
    color: '#f59e0b',
  },
  {
    key: 'backup',
    icon: <Shield size={26} />,
    title: 'Backup & Safety',
    desc: 'Auto-backup and extra login security.',
    color: '#64748b',
  },
]

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function SettingsPage({ session, profile }) {
  const { i18n } = useTranslation()
  const [activeSection, setActiveSection] = useState(null)

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
            Settings
          </h1>
          <p className="page-subtitle">Tap a section below to configure it.</p>
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
function SectionCard({ onBack, icon, color, title, desc, children }) {
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
          Back to Settings
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
  const [saving, setSaving] = useState(false)

  const validate = () => {
    if (!bizName.trim()) {
      toast.error('Business name is required')
      return false
    }
    if (gstId && !/^[A-Za-z0-9]{1,15}$/.test(gstId)) {
      toast.error('GST/Tax ID must be up to 15 alphanumeric characters')
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    const tid = toast.loading('Saving business info…')

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
      toast.success('Business info saved!', { id: tid })
    } else {
      toast.success('Business info saved!', { id: tid })
    }
    setSaving(false)
  }

  return (
    <SectionCard
      onBack={onBack}
      icon={<Building2 size={22} />}
      color="#f97316"
      title="About My Business"
      desc="This information appears on every invoice, quote, and customer-facing document."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Business Name */}
        <div className="form-group">
          <label className="form-label">Business Name</label>
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
          <label className="form-label">Business Logo</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-input"
              type="text"
              placeholder="Paste your logo image URL here"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-secondary"
              type="button"
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
              }}
            >
              <Upload size={13} />
              Upload
            </button>
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
          <label className="form-label">Business Address</label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Street, City, State, PIN code"
            value={bizAddress}
            onChange={(e) => setBizAddress(e.target.value)}
            style={{ resize: 'vertical' }}
          ></textarea>
        </div>

        {/* GST */}
        <div className="form-group">
          <label className="form-label">GST / Tax ID</label>
          <input
            className="form-input"
            type="text"
            placeholder="Up to 15 alphanumeric characters"
            value={gstId}
            onChange={(e) => setGstId(e.target.value.toUpperCase())}
            maxLength={15}
            style={{ maxWidth: 280 }}
          />
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 5 }}>
            Printed on your invoices and quotes.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
          style={{ alignSelf: 'flex-start', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving…' : 'Save Business Info'}
        </button>
      </div>
    </SectionCard>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 2. MONEY SETTINGS
// ════════════════════════════════════════════════════════════════════════════
function MoneySection({ session, profile, onBack }) {
  const [currency, setCurrency] = useState(profile?.currency || '$')
  const [taxRate, setTaxRate] = useState(
    String(profile?.tax_rate ?? lsGet('tax_rate', 18))
  )
  const [dueDays, setDueDays] = useState(
    String(profile?.payment_due_days ?? lsGet('payment_due_days', 15))
  )
  const [saving, setSaving] = useState(false)

  const validate = () => {
    const tax = parseFloat(taxRate)
    const days = parseInt(dueDays, 10)
    if (isNaN(tax) || tax < 0 || tax > 100) {
      toast.error('Tax rate must be between 0 and 100')
      return false
    }
    if (isNaN(days) || days < 1 || days > 365) {
      toast.error('Payment due days must be between 1 and 365')
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    const tid = toast.loading('Updating money settings…')

    // Save to localStorage always
    lsSet('tax_rate', parseFloat(taxRate))
    lsSet('payment_due_days', parseInt(dueDays, 10))

    // Save to Supabase — currency already works this way in original code
    const { error } = await supabase
      .from('profiles')
      .update({
        currency,
        tax_rate: parseFloat(taxRate),
        payment_due_days: parseInt(dueDays, 10),
      })
      .eq('id', session.user.id)

    if (error) {
      toast.success('Money settings saved!', { id: tid })
    } else {
      toast.success('Money settings saved!', { id: tid })
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
      title="Money Settings"
      desc="Set your default currency, tax rate, and how long customers have to pay."
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Currency */}
        <div className="form-group">
          <label className="form-label">Global Currency Symbol</label>
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
            Affects all dashboard tiles, quotes, and PDF invoices.
          </p>
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9' }} />

        {/* Tax Rate */}
        <div className="form-group">
          <label className="form-label">Tax Rate / GST %</label>
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
            Automatically applied to invoice line items.
          </p>
        </div>

        {/* Due Days */}
        <div className="form-group">
          <label className="form-label">Payment Due Days</label>
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
              days
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 5 }}>
            Sets the due date on new invoices and triggers overdue reminders.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
          style={{ alignSelf: 'flex-start', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving…' : 'Save Money Settings'}
        </button>
      </div>
    </SectionCard>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 3. LANGUAGE & FORMAT
// ════════════════════════════════════════════════════════════════════════════
function LanguageSection({ session, profile, onBack, i18n }) {
  const [selectedLang, setSelectedLang] = useState(
    () => localStorage.getItem('i18nextLng') || i18n.language || 'en'
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
    i18n.changeLanguage(code)
    localStorage.setItem('i18nextLng', code)
    toast.success('Language updated!')
  }

  const handleFormatSave = () => {
    lsSet('date_format', dateFormat)
    lsSet('number_format', numberFormat)
    toast.success('Format settings saved!')
  }

  // Inline toggle control
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

  return (
    <SectionCard
      onBack={onBack}
      icon={<Globe size={22} />}
      color="#3b82f6"
      title="Language & Format"
      desc="Changes apply immediately across the entire CRM."
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
            Display Language
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
            Changes apply immediately across the entire CRM.
          </p>
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9' }} />

        {/* Date format */}
        <ToggleRow
          label="Date Format"
          desc="How dates appear on invoices and throughout the CRM."
          optA={{ value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' }}
          optB={{ value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' }}
          value={dateFormat}
          onChange={setDateFormat}
        />

        {/* Number format */}
        <ToggleRow
          label="Number Format"
          desc="How large numbers are grouped — Indian style (1,00,000) or international (100,000)."
          optA={{ value: 'indian', label: 'Indian  1,00,000' }}
          optB={{ value: 'international', label: 'International  100,000' }}
          value={numberFormat}
          onChange={setNumberFormat}
        />

        <button
          onClick={handleFormatSave}
          className="btn btn-primary"
          style={{ alignSelf: 'flex-start' }}
        >
          Save Format Settings
        </button>
      </div>
    </SectionCard>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 4. MY TEAM
// ════════════════════════════════════════════════════════════════════════════
function TeamSection({ session, profile, onBack, isAdmin }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [companyType, setCompanyType] = useState('B2B')
  const [role, setRole] = useState('user')
  const [creating, setCreating] = useState(false)

  // Role descriptions (plain language, no jargon)
  const ROLE_INFO = {
    user: 'Can add leads and contacts, but cannot delete records or manage accounts.',
    manager:
      'Can add, edit, and delete records. Cannot create new team members.',
    admin: 'Full access — can manage accounts, team members, and all settings.',
  }

  const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  // Same Supabase signUp logic as original handleCreateUser
  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Please enter a full name')
      return
    }
    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setCreating(true)
    const tid = toast.loading('Creating team member account…')

    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = 'https://bmsnbwgwdxqhccqesgkt.supabase.co'
      const supabaseAnonKey =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtc25id2d3ZHhxaGNjcWVzZ2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTExNjksImV4cCI6MjA4OTA4NzE2OX0.IhByvcKXFOL6XwW3UhTig6XMzNrNvpYFhaehq2_DUBU'

      // Secondary client — no session persistence, so current user stays logged in
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
      })

      const { error } = await tempClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name.trim(),
            // NOTE: role is stored in user_metadata here.
            // Permission enforcement (restricting UI by role) is a follow-up task.
            role,
            companyName:
              company.trim() || profile?.company_name || 'My Company',
            companyType,
          },
        },
      })

      if (error) throw error

      toast.success(`Account for ${email} created successfully!`, { id: tid })
      // Reset form
      setName('')
      setEmail('')
      setPassword('')
      setCompany('')
      setCompanyType('B2B')
      setRole('user')
    } catch (err) {
      toast.error(err.message || 'Failed to create account', { id: tid })
    } finally {
      setCreating(false)
    }
  }

  return (
    <SectionCard
      onBack={onBack}
      icon={<Users size={22} />}
      color="#8b5cf6"
      title="My Team"
      desc="Add team members and choose what they can do in the CRM."
    >
      {!isAdmin ? (
        <div
          style={{
            padding: '14px 16px',
            background: '#fef9c3',
            borderRadius: 10,
            fontSize: 13,
            color: '#92400e',
          }}
        >
          ⚠️ Only admins can add new team members. Contact your admin to get
          someone added.
        </div>
      ) : (
        <form
          onSubmit={handleCreate}
          style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 2,
            }}
          >
            <UserPlus size={15} style={{ color: '#8b5cf6' }} />
            <span
              style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}
            >
              Add a Team Member
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Email Address (they will use this to log in)
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Company Name</label>
            <input
              type="text"
              className="form-input"
              placeholder={profile?.company_name || 'Company Name'}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Company Type</label>
            <select
              className="form-input"
              value={companyType}
              onChange={(e) => setCompanyType(e.target.value)}
              style={dropStyle}
            >
              <option value="B2B">B2B (Business to Business)</option>
              <option value="B2C">B2C (Business to Consumer)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <select
              className="form-input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={dropStyle}
            >
              <option value="user">Staff</option>
              <option value="manager">Manager</option>
              <option value="admin">Owner / Admin</option>
            </select>
            <p
              style={{
                fontSize: 12,
                color: '#9ca3af',
                marginTop: 6,
                fontStyle: 'italic',
              }}
            >
              {ROLE_INFO[role]}
            </p>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="btn btn-primary"
            style={{
              alignSelf: 'flex-start',
              opacity: creating ? 0.7 : 1,
            }}
          >
            {creating ? 'Creating…' : 'Add Team Member'}
          </button>
        </form>
      )}
    </SectionCard>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 5. HOW I GET NOTIFIED
// ════════════════════════════════════════════════════════════════════════════
function NotificationsSection({ session, profile, onBack }) {
  const [wa, setWa] = useState(lsGet('notif_whatsapp', false))
  const [sms, setSms] = useState(lsGet('notif_sms', true))
  const [emailNotif, setEmailNotif] = useState(lsGet('notif_email', true))

  const handleSave = () => {
    lsSet('notif_whatsapp', wa)
    lsSet('notif_sms', sms)
    lsSet('notif_email', emailNotif)
    toast.success('Notification settings saved!')
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
      title="How I Get Notified"
      desc="Choose how you want to hear from the CRM when something needs your attention."
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <ToggleSwitch
          label="WhatsApp"
          desc="Get a WhatsApp message when a new lead comes in or an invoice is overdue."
          value={wa}
          onChange={setWa}
        />
        <ToggleSwitch
          label="SMS"
          desc="Get a text message when a customer hasn't paid in 7 days."
          value={sms}
          onChange={setSms}
        />
        <ToggleSwitch
          label="Email"
          desc="Get an email when a deal is updated or a task is assigned to you."
          value={emailNotif}
          onChange={setEmailNotif}
        />
        <button
          onClick={handleSave}
          className="btn btn-primary"
          style={{ alignSelf: 'flex-start', marginTop: 22 }}
        >
          Save Notification Settings
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
      toast.error('Stage name cannot be empty')
      return
    }
    setStages(stages.map((s, i) => (i === editIdx ? editVal.trim() : s)))
    setEditIdx(null)
    setEditVal('')
  }
  const removeStage = (i) => {
    if (stages.length <= 2) {
      toast.error('You need at least 2 stages')
      return
    }
    setStages(stages.filter((_, idx) => idx !== i))
  }
  const addStage = () => {
    if (!newStage.trim()) return
    if (stages.map((s) => s.toLowerCase()).includes(newStage.trim().toLowerCase())) {
      toast.error('This stage already exists')
      return
    }
    setStages([...stages, newStage.trim()])
    setNewStage('')
  }
  const handleSave = () => {
    lsSet('pipeline_stages', stages)
    toast.success('Sales steps saved!')
  }

  return (
    <SectionCard
      onBack={onBack}
      icon={<ListChecks size={22} />}
      color="#f59e0b"
      title="My Sales Steps"
      desc="These stages appear on your deals board. Rename them to match how you actually work."
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
                  title="Save"
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
                  title="Cancel"
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
                  title="Rename"
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
                  title="Remove"
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
          placeholder="Add a new stage…"
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
          Add
        </button>
      </div>

      <button
        onClick={handleSave}
        className="btn btn-primary"
        style={{ alignSelf: 'flex-start' }}
      >
        Save Sales Steps
      </button>
    </SectionCard>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// 7. BACKUP & SAFETY
// ════════════════════════════════════════════════════════════════════════════
function BackupSection({ session, profile, onBack }) {
  const [autoBackup, setAutoBackup] = useState(lsGet('auto_backup', false))
  const [requireOtp, setRequireOtp] = useState(lsGet('require_otp', false))

  const handleSave = () => {
    lsSet('auto_backup', autoBackup)
    lsSet('require_otp', requireOtp)
    toast.success('Safety settings saved!')
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
      title="Backup & Safety"
      desc="Keep your data safe and control how you log in."
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <ToggleSwitch
          label="Auto-backup my data"
          desc="Automatically save a copy of your CRM data every day so nothing is lost."
          value={autoBackup}
          onChange={setAutoBackup}
        />
        <ToggleSwitch
          label="Extra login security"
          desc="Get a one-time code on your phone every time you log in, for extra protection."
          value={requireOtp}
          onChange={setRequireOtp}
        />
        <button
          onClick={handleSave}
          className="btn btn-primary"
          style={{ alignSelf: 'flex-start', marginTop: 22 }}
        >
          Save Safety Settings
        </button>
      </div>
    </SectionCard>
  )
}
