import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Users, Building2, Briefcase, Ticket, BarChart3, Play, X, ArrowRight, Sparkles, Check } from 'lucide-react'
import { useState } from 'react'
import LanguageSwitcher from '../components/ui/LanguageSwitcher'
import {
  SplitText,
  ShinyText,
  CountUp,
  SpotlightCard,
  TiltCard,
  AuroraBackground,
  ParticlesBackground,
  ShinyButton,
} from '../components/reactbits'

const IconWrapper = ({ children }) => (
  <div style={{
    width: 52,
    height: 52,
    background: 'linear-gradient(135deg, rgba(255, 89, 0, 0.15) 0%, rgba(243, 122, 35, 0.25) 100%)',
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ff5900',
    marginBottom: 16,
    border: '1px solid rgba(255, 89, 0, 0.2)',
    boxShadow: '0 4px 15px -3px rgba(255, 89, 0, 0.2)'
  }}>
    {children}
  </div>
)

export default function LandingPage({ session }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [showVideo, setShowVideo] = useState(false)

  const features = [
    { icon: <IconWrapper><LayoutDashboard size={26} /></IconWrapper>, title: t('features.smartDashboard'), desc: t('features.smartDashboardDesc') },
    { icon: <IconWrapper><Users size={26} /></IconWrapper>, title: t('features.leadManagement'), desc: t('features.leadManagementDesc') },
    { icon: <IconWrapper><Building2 size={26} /></IconWrapper>, title: t('features.accountContacts'), desc: t('features.accountContactsDesc') },
    { icon: <IconWrapper><Briefcase size={26} /></IconWrapper>, title: t('features.opportunityPipeline'), desc: t('features.opportunityPipelineDesc') },
    { icon: <IconWrapper><Ticket size={26} /></IconWrapper>, title: t('features.ticketSupport'), desc: t('features.ticketSupportDesc') },
    { icon: <IconWrapper><BarChart3 size={26} /></IconWrapper>, title: t('features.reportsInsights'), desc: t('features.reportsInsightsDesc') },
  ]

  const pricing = [
    {
      plan: t('pricingSection.starter'), price: 0, prefix: '$', period: '/month',
      features: [
        t('pricingSection.features.contacts500'), t('pricingSection.features.users3'),
        t('pricingSection.features.basicDashboard'), t('pricingSection.features.emailSupport'),
        t('pricingSection.features.storage5')
      ],
      popular: false, ctaLabel: t('pricingSection.getStartedFree')
    },
    {
      plan: t('pricingSection.pro'), price: 29, prefix: '$', period: '/month',
      features: [
        t('pricingSection.features.unlimitedContacts'), t('pricingSection.features.users10'),
        t('pricingSection.features.advancedAnalytics'), t('pricingSection.features.prioritySupport'),
        t('pricingSection.features.storage50'), t('pricingSection.features.pdfReports'),
        t('pricingSection.features.apiAccess')
      ],
      popular: true, ctaLabel: t('pricingSection.choosePro')
    },
    {
      plan: t('pricingSection.enterprise'), price: 99, prefix: '$', period: '/month',
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
    <div className="landing" style={{ position: 'relative', overflowX: 'hidden' }}>
      {/* Nav */}
      <nav className="landing-nav" style={{ backdropFilter: 'blur(16px)', background: 'rgba(10, 15, 30, 0.75)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div className="landing-nav-logo" style={{ display: 'flex', alignItems: 'center', gap: 0, fontWeight: 900, fontFamily: '"Fredoka", sans-serif', fontSize: '26px', letterSpacing: '-0.5px' }}>
          <div style={{ backgroundColor: '#f37a23', color: '#ffffff', padding: '4px 6px', lineHeight: 1, borderRadius: '6px 0 0 6px' }}>
            XOWIQ
          </div>
          <div style={{ color: '#ffffff', backgroundColor: '#1e293b', padding: '4px 6px', lineHeight: 1, borderRadius: '0 6px 6px 0' }}>
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
            <ShinyButton variant="primary" onClick={() => navigate('/dashboard')}>
              {t('nav.goToDashboard')}
            </ShinyButton>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary" style={{ borderRadius: 10 }}>{t('nav.signIn')}</Link>
              <ShinyButton variant="primary" onClick={() => navigate('/signup')}>
                {t('nav.getStartedFree')}
              </ShinyButton>
            </>
          )}
        </div>
      </nav>

      {/* Dynamic Aurora & Particles Hero Section */}
      <AuroraBackground className="hero-aurora-wrap">
        <ParticlesBackground quantity={45} color="#6366f1" />
        <section className="hero" style={{ position: 'relative', zIndex: 2, paddingTop: 140, paddingBottom: 100 }}>
          <div className="hero-content" style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
            
            {/* Animated Badge */}
            <div className="hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 999, background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.35)', marginBottom: 24 }}>
              <Sparkles size={16} color="#818cf8" />
              <ShinyText text={`✨ ${t('hero.badge')}`} speed={3} />
            </div>

            {/* Animated Split Headline */}
            <h1 className="hero-title" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.2rem)', fontWeight: 900, lineHeight: 1.15, letterSpacing: '-1.5px', marginBottom: 24 }}>
              <SplitText text={t('hero.title1')} delay={40} />
              <br />
              <span className="gradient-text" style={{ background: 'linear-gradient(135deg, #ff5900 0%, #ff8a00 50%, #f37a23 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                <SplitText text={t('hero.title2')} delay={60} />
              </span>
            </h1>

            <p className="hero-desc" style={{ fontSize: '1.2rem', color: '#94a3b8', maxWidth: 680, margin: '0 auto 36px', lineHeight: 1.6 }}>
              {t('hero.desc')}
            </p>

            <div className="hero-actions" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56 }}>
              <ShinyButton variant="primary" style={{ padding: '14px 32px', fontSize: '1.1rem' }} onClick={() => navigate('/signup')}>
                <span>{t('hero.startFree')}</span>
                <ArrowRight size={18} />
              </ShinyButton>
              <a href="#features" className="btn btn-secondary btn-large" style={{ padding: '14px 28px', fontSize: '1.1rem', borderRadius: 12 }}>
                {t('hero.exploreFeatures')}
              </a>
            </div>

            {/* Dynamic CountUp Statistics */}
            <div className="hero-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 20, maxWidth: 840, margin: '0 auto' }}>
              <SpotlightCard className="hero-stat-card" style={{ padding: '20px 16px', textAlign: 'center', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(10px)' }}>
                <div className="hero-stat-value" style={{ fontSize: '2.2rem', fontWeight: 900, color: '#f8fafc', marginBottom: 4 }}>
                  <CountUp to={10} suffix="K+" duration={2.5} />
                </div>
                <div className="hero-stat-label" style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{t('hero.activeUsers')}</div>
              </SpotlightCard>

              <SpotlightCard className="hero-stat-card" style={{ padding: '20px 16px', textAlign: 'center', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(10px)' }}>
                <div className="hero-stat-value" style={{ fontSize: '2.2rem', fontWeight: 900, color: '#ff5900', marginBottom: 4 }}>
                  <CountUp to={2} prefix="$" suffix="B+" duration={2.5} />
                </div>
                <div className="hero-stat-label" style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{t('hero.pipelineManaged')}</div>
              </SpotlightCard>

              <SpotlightCard className="hero-stat-card" style={{ padding: '20px 16px', textAlign: 'center', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(10px)' }}>
                <div className="hero-stat-value" style={{ fontSize: '2.2rem', fontWeight: 900, color: '#10b981', marginBottom: 4 }}>
                  <CountUp to={98} suffix="%" duration={2} />
                </div>
                <div className="hero-stat-label" style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{t('hero.satisfactionRate')}</div>
              </SpotlightCard>

              <SpotlightCard className="hero-stat-card" style={{ padding: '20px 16px', textAlign: 'center', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(10px)' }}>
                <div className="hero-stat-value" style={{ fontSize: '2.2rem', fontWeight: 900, color: '#38bdf8', marginBottom: 4 }}>
                  <CountUp to={99.9} decimals={1} suffix="%" duration={2.5} />
                </div>
                <div className="hero-stat-label" style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{t('hero.uptimeSLA')}</div>
              </SpotlightCard>
            </div>

          </div>
        </section>
      </AuroraBackground>

      {/* Features Grid with Spotlight Cards */}
      <section className="section section-center" id="features" style={{ padding: '100px 24px', background: '#080c16' }}>
        <div className="section-label" style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, background: 'rgba(255, 89, 0, 0.12)', color: '#ff5900', fontWeight: 700, fontSize: 12, marginBottom: 12 }}>
          {t('features.label')}
        </div>
        <h2 className="section-title" style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 16 }}>{t('features.title')}</h2>
        <p className="section-desc" style={{ color: '#94a3b8', maxWidth: 600, margin: '0 auto 60px' }}>{t('features.desc')}</p>
        
        <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, maxWidth: 1100, margin: '0 auto' }}>
          {features.map(f => (
            <SpotlightCard
              key={f.title}
              spotlightColor="rgba(255, 89, 0, 0.15)"
              borderColor="rgba(255, 255, 255, 0.08)"
              style={{ padding: 32, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', textAlign: 'left', borderRadius: 16 }}
            >
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 10, color: '#f8fafc' }}>{f.title}</h3>
              <p className="feature-desc" style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6 }}>{f.desc}</p>
            </SpotlightCard>
          ))}
        </div>
      </section>

      {/* How it works with 3D Tilt Cards */}
      <section className="section section-center" id="about" style={{ padding: '100px 24px', background: 'radial-gradient(ellipse at top, #111827, #080c16)' }}>
        <div className="section-label" style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', fontWeight: 700, fontSize: 12, marginBottom: 12 }}>
          {t('howItWorks.label')}
        </div>
        <h2 className="section-title" style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 16 }}>{t('howItWorks.title')}</h2>
        <p className="section-desc" style={{ color: '#94a3b8', maxWidth: 600, margin: '0 auto 60px' }}>{t('howItWorks.desc')}</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 28, maxWidth: 960, margin: '0 auto' }}>
          {[
            { step: '01', title: t('howItWorks.step01'), desc: t('howItWorks.step01Desc') },
            { step: '02', title: t('howItWorks.step02'), desc: t('howItWorks.step02Desc') },
            { step: '03', title: t('howItWorks.step03'), desc: t('howItWorks.step03Desc') },
          ].map(s => (
            <TiltCard key={s.step} style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ padding: 32, textAlign: 'left' }}>
                <div style={{ fontSize: '3rem', fontWeight: 900, color: '#ff5900', marginBottom: 12, opacity: 0.6 }}>{s.step}</div>
                <h3 style={{ marginBottom: 10, fontSize: '1.2rem', color: '#f8fafc' }}>{s.title}</h3>
                <p style={{ fontSize: '0.95rem', color: '#94a3b8', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* Video Demo Section */}
      <section className="section section-center" style={{ padding: '80px 24px', background: '#080c16' }}>
        <div className="section-label" style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, background: 'rgba(255, 89, 0, 0.12)', color: '#ff5900', fontWeight: 700, fontSize: 12, marginBottom: 12 }}>
          {t('videoDemo.label')}
        </div>
        <h2 className="section-title" style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 16 }}>{t('videoDemo.title')}</h2>
        <p className="section-desc" style={{ marginBottom: 40, color: '#94a3b8' }}>{t('videoDemo.subtitle')}</p>
        
        <SpotlightCard 
          onClick={() => setShowVideo(true)}
          spotlightColor="rgba(255, 89, 0, 0.25)"
          style={{
            maxWidth: 900,
            margin: '0 auto',
            aspectRatio: '16/9',
            borderRadius: 20,
            cursor: 'pointer',
            border: '2px solid rgba(255, 255, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
          }}
        >
          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
            <div style={{ 
              width: 80, 
              height: 80, 
              background: 'linear-gradient(135deg, #ff5900 0%, #f37a23 100%)', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: 'white',
              boxShadow: '0 0 35px rgba(255, 89, 0, 0.5)',
            }}>
              <Play fill="white" size={32} />
            </div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '1.25rem' }}>{t('videoDemo.watchButton')}</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginTop: 6 }}>{t('videoDemo.duration')}</div>
          </div>
        </SpotlightCard>
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
              border: '1px solid rgba(255, 255, 255, 0.15)',
              width: '90vw',
              maxWidth: '1100px'
            }}
          >
            <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
              <button 
                onClick={() => setShowVideo(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: 'white',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <X size={22} />
              </button>
            </div>
            <div style={{ aspectRatio: '16/9', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexDirection: 'column', gap: 20, padding: 40, textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 700 }}>{t('videoDemo.title')}</h3>
              <p style={{ opacity: 0.8, maxWidth: 600 }}>Interactive CRM video overview walkthrough. Watch how deal pipelines, custom data schemas, quotes, and reports operate seamlessly.</p>
              <ShinyButton variant="primary" onClick={() => setShowVideo(false)}>
                Close Preview
              </ShinyButton>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Section */}
      <section className="section section-center" id="pricing" style={{ padding: '100px 24px', background: 'radial-gradient(ellipse at top, #111827, #080c16)' }}>
        <div className="section-label" style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, background: 'rgba(255, 89, 0, 0.12)', color: '#ff5900', fontWeight: 700, fontSize: 12, marginBottom: 12 }}>
          {t('pricingSection.label')}
        </div>
        <h2 className="section-title" style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 16 }}>{t('pricingSection.title')}</h2>
        <p className="section-desc" style={{ color: '#94a3b8', maxWidth: 600, margin: '0 auto 60px' }}>{t('pricingSection.desc')}</p>
        
        <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 28, maxWidth: 1050, margin: '0 auto' }}>
          {pricing.map(p => (
            <SpotlightCard
              key={p.plan}
              spotlightColor={p.popular ? 'rgba(255, 89, 0, 0.22)' : 'rgba(99, 102, 241, 0.15)'}
              borderColor={p.popular ? 'rgba(255, 89, 0, 0.5)' : 'rgba(255, 255, 255, 0.08)'}
              style={{
                padding: 36,
                background: p.popular ? 'rgba(30, 41, 59, 0.85)' : 'rgba(15, 23, 42, 0.7)',
                borderRadius: 20,
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative'
              }}
            >
              <div>
                {p.popular && (
                  <div style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    background: 'linear-gradient(135deg, #ff5900, #f37a23)',
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '4px 12px',
                    borderRadius: 999,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5
                  }}>
                    {t('pricingSection.mostPopular')}
                  </div>
                )}
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f8fafc', marginBottom: 12 }}>{p.plan}</div>
                <div style={{ fontSize: '2.8rem', fontWeight: 900, color: p.popular ? '#ff5900' : '#f8fafc', marginBottom: 4 }}>
                  <CountUp to={p.price} prefix={p.prefix} duration={1.5} />
                  <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 500 }}> USD</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 24 }}>{t('pricingSection.perUser')} {p.period}</div>
                
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {p.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem', color: '#cbd5e1' }}>
                      <Check size={16} color="#10b981" /> {f}
                    </li>
                  ))}
                </ul>
              </div>

              <ShinyButton
                variant={p.popular ? 'primary' : 'secondary'}
                style={{ width: '100%' }}
                onClick={() => navigate('/signup')}
              >
                {p.ctaLabel}
              </ShinyButton>
            </SpotlightCard>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section" style={{ padding: '100px 24px', textAlign: 'center', background: '#080c16', position: 'relative' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div className="section-label" style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, background: 'rgba(255, 89, 0, 0.12)', color: '#ff5900', fontWeight: 700, fontSize: 12, marginBottom: 16 }}>
            {t('cta.label')}
          </div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f8fafc', marginBottom: 16 }}>{t('cta.title')}</h2>
          <p style={{ color: '#94a3b8', marginBottom: 36, fontSize: '1.1rem', lineHeight: 1.6 }}>{t('cta.desc')}</p>
          <ShinyButton variant="primary" style={{ padding: '14px 36px', fontSize: '1.1rem' }} onClick={() => navigate('/signup')}>
            <span>{t('cta.button')}</span>
            <ArrowRight size={18} />
          </ShinyButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer" style={{ padding: '40px 32px', background: '#05070e', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
        <div className="landing-nav-logo" style={{ display: 'flex', alignItems: 'center', gap: 0, fontWeight: 900, fontFamily: '"Fredoka", sans-serif', fontSize: '20px', letterSpacing: '-0.5px' }}>
          <div style={{ backgroundColor: '#f37a23', color: '#ffffff', padding: '3px 5px', lineHeight: 1, borderRadius: '4px 0 0 4px' }}>
            XOWIQ
          </div>
          <div style={{ color: '#ffffff', backgroundColor: '#1e293b', padding: '3px 5px', lineHeight: 1, borderRadius: '0 4px 4px 0' }}>
            CRM
          </div>
        </div>
        <div className="footer-text" style={{ color: '#64748b', fontSize: 14 }}>{t('footer.copyright')}</div>
        <div style={{ display: 'flex', gap: 20 }}>
          <a href="#features" style={{ fontSize: 14, color: '#94a3b8', textDecoration: 'none' }}>{t('nav.features')}</a>
          <a href="#pricing" style={{ fontSize: 14, color: '#94a3b8', textDecoration: 'none' }}>{t('nav.pricing')}</a>
          <Link to="/login" style={{ fontSize: 14, color: '#94a3b8', textDecoration: 'none' }}>{t('footer.login')}</Link>
        </div>
      </footer>
    </div>
  )
}
