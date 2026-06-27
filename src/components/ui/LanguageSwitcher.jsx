import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

const languages = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0]

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleChange = (code) => {
    i18n.changeLanguage(code)
    localStorage.setItem('i18nextLng', code)
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Switch Language"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 14px',
          borderRadius: 'var(--radius-md, 8px)',
          border: '1.5px solid var(--border-subtle, #e2e8f0)',
          background: 'var(--bg-card, #fff)',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-primary, #1e293b)',
          transition: 'all 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--accent, #f37a23)'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(243,122,35,0.13)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border-subtle, #e2e8f0)'
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <Globe size={16} style={{ opacity: 0.7 }} />
        <span>{currentLang.flag}</span>
        <span>{currentLang.label}</span>
        <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 2 }}>▼</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: 170,
            background: 'var(--bg-card, #fff)',
            border: '1.5px solid var(--border-subtle, #e2e8f0)',
            borderRadius: 'var(--radius-md, 8px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'langDropIn 0.18s ease-out',
          }}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '10px 16px',
                border: 'none',
                background: i18n.language === lang.code ? 'rgba(243,122,35,0.08)' : 'transparent',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: i18n.language === lang.code ? 700 : 500,
                color: i18n.language === lang.code ? 'var(--accent, #f37a23)' : 'var(--text-primary, #1e293b)',
                transition: 'all 0.15s',
                textAlign: 'left',
              }}
              onMouseEnter={e => {
                if (i18n.language !== lang.code) e.currentTarget.style.background = 'rgba(0,0,0,0.03)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = i18n.language === lang.code ? 'rgba(243,122,35,0.08)' : 'transparent'
              }}
            >
              <span style={{ fontSize: 18 }}>{lang.flag}</span>
              <span>{lang.label}</span>
              {i18n.language === lang.code && (
                <span style={{ marginLeft: 'auto', fontSize: 14, color: 'var(--accent, #f37a23)' }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
