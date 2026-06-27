import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Users, Building2, Briefcase, Ticket, BarChart3, Play, X } from 'lucide-react'
import { useState } from 'react'
import LanguageSwitcher from '../components/ui/LanguageSwitcher'

const IconWrapper = ({ children }) => (
  <div style={{ width: 48, height: 48, backgroundColor: '#FFD3A5', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF5900', marginBottom: 16 }}>
    {children}
  </div>
)

export default function LandingPage({ session }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [showVideo, setShowVideo] = useState(false)

  const features = [
    { icon: <IconWrapper><LayoutDashboard size={24} /></IconWrapper>, title: t('features.smartDashboard'), desc: t('features.smartDashboardDesc') },
    { icon: <IconWrapper><Users size={24} /></IconWrapper>, title: t('features.leadManagement'), desc: t('features.leadManagementDesc') },
    { icon: <IconWrapper><Building2 size={24} /></IconWrapper>, title: t('features.accountContacts'), desc: t('features.accountContactsDesc') },
    { icon: <IconWrapper><Briefcase size={24} /></IconWrapper>, title: t('features.opportunityPipeline'), desc: t('features.opportunityPipelineDesc') },
    { icon: <IconWrapper><Ticket size={24} /></IconWrapper>, title: t('features.ticketSupport'), desc: t('features.ticketSupportDesc') },
    { icon: <IconWrapper><BarChart3 size={24} /></IconWrapper>, title: t('features.reportsInsights'), desc: t('features.reportsInsightsDesc') },
  ]

  const pricing = [
    {
      plan: t('pricingSection.starter'), price: '$0', period: '/month',
      features: [
        t('pricingSection.features.contacts500'), t('pricingSection.features.users3'),
        t('pricingSection.features.basicDashboard'), t('pricingSection.features.emailSupport'),
        t('pricingSection.features.storage5')
      ],
      popular: false, ctaLabel: t('pricingSection.getStartedFree')
    },
    {
      plan: t('pricingSection.pro'), price: '$29', period: '/month',
      features: [
        t('pricingSection.features.unlimitedContacts'), t('pricingSection.features.users10'),
        t('pricingSection.features.advancedAnalytics'), t('pricingSection.features.prioritySupport'),
        t('pricingSection.features.storage50'), t('pricingSection.features.pdfReports'),
        t('pricingSection.features.apiAccess')
      ],
      popular: true, ctaLabel: t('pricingSection.choosePro')
    },
    {
      plan: t('pricingSection.enterprise'), price: '$99', period: '/month',
      features: [
        t('pricingSection.features.unlimitedEverything'), t('pricingSection.features.unlimitedUsers'),
        t('pricingSection.features.customIntegrations'), t('pricingSection.features.dedicatedSupport'),
        t('pricingSection.features.unlimitedStorage'), t('pricingSection.features.customWorkflows'),
        t('pricingSection.features.ssoSaml')
      ],
      popular: false, ctaLabel: t('pricingSection.chooseEnterprise')
    },
  ]

  return (
    <div className="landing">
      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-nav-logo" style={{ display: 'flex', alignItems: 'center', gap: 0, fontWeight: 900, fontFamily: '"Fredoka", sans-serif', fontSize: '26px', letterSpacing: '-0.5px' }}>
          <div style={{ backgroundColor: '#f37a23', color: '#ffffff', padding: '4px 6px', lineHeight: 1 }}>
            XOWIQ
          </div>
          <div style={{ color: '#000000', padding: '4px 6px', lineHeight: 1 }}>
            CRM
          </div>
        </div>
        <ul className="landing-nav-links">
          <li><a href="#features">{t('nav.features')}</a></li>
          <li><a href="#pricing">{t('nav.pricing')}</a></li>
          <li><a href="#about">{t('nav.about')}</a></li>
        </ul>
        <div className="landing-nav-cta" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LanguageSwitcher />
          {session ? (
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>{t('nav.goToDashboard')}</button>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary">{t('nav.signIn')}</Link>
              <Link to="/signup" className="btn btn-primary">{t('nav.getStartedFree')}</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg-blur" />
        <div className="hero-content">
          <div className="hero-badge"> {t('hero.badge')}</div>
          <h1 className="hero-title">
            {t('hero.title1')}<br />
            <span className="gradient-text">{t('hero.title2')}</span>
          </h1>
          <p className="hero-desc">
            {t('hero.desc')}
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="btn btn-primary btn-large">{t('hero.startFree')}</Link>
            <a href="#features" className="btn btn-secondary btn-large">{t('hero.exploreFeatures')}</a>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">10K+</div>
              <div className="hero-stat-label">{t('hero.activeUsers')}</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">$2B+</div>
              <div className="hero-stat-label">{t('hero.pipelineManaged')}</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">98%</div>
              <div className="hero-stat-label">{t('hero.satisfactionRate')}</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">99.9%</div>
              <div className="hero-stat-label">{t('hero.uptimeSLA')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section section-center" id="features">
        <div className="section-label">{t('features.label')}</div>
        <h2 className="section-title">{t('features.title')}</h2>
        <p className="section-desc">{t('features.desc')}</p>
        <div className="features-grid">
          {features.map(f => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="section section-center" id="about" style={{ background: 'rgba(99,102,241,0.03)' }}>
        <div className="section-label">{t('howItWorks.label')}</div>
        <h2 className="section-title">{t('howItWorks.title')}</h2>
        <p className="section-desc">{t('howItWorks.desc')}</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:24, maxWidth:900, margin:'0 auto' }}>
          {[
            { step:'01', title: t('howItWorks.step01'), desc: t('howItWorks.step01Desc') },
            { step:'02', title: t('howItWorks.step02'), desc: t('howItWorks.step02Desc') },
            { step:'03', title: t('howItWorks.step03'), desc: t('howItWorks.step03Desc') },
          ].map(s => (
            <div key={s.step} style={{ padding:32, background:'var(--bg-card)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border-subtle)' }}>
              <div style={{ fontSize:'2.5rem', fontWeight:900, color:'var(--accent)', marginBottom:12, opacity:0.5 }}>{s.step}</div>
              <h3 style={{ marginBottom:8 }}>{s.title}</h3>
              <p style={{ fontSize:14 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Video Demo Section */}
      <section className="section section-center" style={{ paddingBottom: '80px' }}>
        <div className="section-label">{t('videoDemo.label')}</div>
        <h2 className="section-title">{t('videoDemo.title')}</h2>
        <p className="section-desc" style={{ marginBottom: '40px' }}>{t('videoDemo.subtitle')}</p>
        
        <div 
          className="video-placeholder"
          onClick={() => setShowVideo(true)}
          style={{
            maxWidth: '900px',
            margin: '0 auto',
            aspectRatio: '16/9',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            position: 'relative',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-lg)',
            border: '8px solid white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Mock UI Background */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.3, background: 'url(https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80) center/cover' }} />
          
          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              backgroundColor: 'var(--accent)', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: 'white',
              boxShadow: '0 0 30px rgba(255, 89, 0, 0.4)',
              transition: 'transform 0.2s ease'
            }} className="play-button-hover">
              <Play fill="white" size={32} />
            </div>
            <div style={{ color: 'white', fontWeight: 600, fontSize: '1.2rem' }}>{t('videoDemo.watchButton')}</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginTop: '4px' }}>{t('videoDemo.duration')}</div>
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {showVideo && (
        <div className="modal-overlay" onClick={() => setShowVideo(false)}>
          <div 
            className="modal modal-xl" 
            onClick={e => e.stopPropagation()}
            style={{ 
              padding: '0', 
              background: '#000', 
              overflow: 'hidden',
              borderRadius: 'var(--radius-lg)',
              border: 'none',
              width: '90vw',
              maxWidth: '1200px'
            }}
          >
            <div style={{ 
              position: 'absolute', 
              top: '20px', 
              right: '20px', 
              zIndex: 10,
            }}>
              <button 
                onClick={() => setShowVideo(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: 'white',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <X size={24} />
              </button>
            </div>
            <div style={{ aspectRatio: '16/9', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexDirection: 'column', gap: 20 }}>
               <div style={{ textAlign: 'center', padding: '40px' }}>
                  <h3 style={{ marginBottom: '10px' }}>{t('videoDemo.title')}</h3>
                  <p style={{ opacity: 0.7 }}>Video player will be embedded here. Please provide the YouTube/Vimeo URL.</p>
                  <p style={{ fontSize: '13px', marginTop: '20px', fontStyle: 'italic', maxWidth: '600px' }}>
                    "Every new inquiry lands here in Leads... Your pipeline lives here... Inside each deal, the Deal Runway shows you exactly where you stand..."
                  </p>
                  <div style={{ marginTop: 30 }}>
                    <button className="btn btn-primary" onClick={() => setShowVideo(false)}>Close Player</button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Pricing */}
      <section className="section section-center" id="pricing">
        <div className="section-label">{t('pricingSection.label')}</div>
        <h2 className="section-title">{t('pricingSection.title')}</h2>
        <p className="section-desc">{t('pricingSection.desc')}</p>
        <div className="pricing-grid">
          {pricing.map(p => (
            <div className={`pricing-card ${p.popular ? 'popular' : ''}`} key={p.plan}>
              {p.popular && <div className="popular-badge">{t('pricingSection.mostPopular')}</div>}
              <div className="pricing-plan">{p.plan}</div>
              <div className="pricing-price">{p.price}<span> USD</span></div>
              <div className="pricing-period">{t('pricingSection.perUser')} {p.period}</div>
              <ul className="pricing-features">
                {p.features.map(f => (
                  <li key={f}><span className="check"></span> {f}</li>
                ))}
              </ul>
              <Link to="/signup" className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}>
                {p.ctaLabel}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="section-label">{t('cta.label')}</div>
        <h2 style={{ marginBottom:16 }}>{t('cta.title')}</h2>
        <p style={{ color:'var(--text-secondary)', marginBottom:36, fontSize:'1.1rem' }}>{t('cta.desc')}</p>
        <Link to="/signup" className="btn btn-primary btn-large">{t('cta.button')}</Link>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="landing-nav-logo" style={{ display: 'flex', alignItems: 'center', gap: 0, fontWeight: 900, fontFamily: '"Fredoka", sans-serif', fontSize: '20px', letterSpacing: '-0.5px' }}>
          <div style={{ backgroundColor: '#f37a23', color: '#ffffff', padding: '3px 5px', lineHeight: 1 }}>
            XOWIQ
          </div>
          <div style={{ color: '#000000', padding: '3px 5px', lineHeight: 1 }}>
            CRM
          </div>
        </div>
        <div className="footer-text">{t('footer.copyright')}</div>
        <div style={{ display:'flex', gap:20 }}>
          <a href="#features" style={{ fontSize:14, color:'var(--text-muted)' }}>{t('nav.features')}</a>
          <a href="#pricing" style={{ fontSize:14, color:'var(--text-muted)' }}>{t('nav.pricing')}</a>
          <Link to="/login" style={{ fontSize:14, color:'var(--text-muted)' }}>{t('footer.login')}</Link>
        </div>
      </footer>
    </div>
  )
}
