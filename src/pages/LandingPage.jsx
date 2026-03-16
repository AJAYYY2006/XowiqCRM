import { Link, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Building2, Briefcase, Ticket, BarChart3 } from 'lucide-react'

const IconWrapper = ({ children }) => (
  <div style={{ width: 48, height: 48, backgroundColor: '#FFD3A5', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF5900', marginBottom: 16 }}>
    {children}
  </div>
)

const features = [
  { icon: <IconWrapper><LayoutDashboard size={24} /></IconWrapper>, title: 'Smart Dashboard', desc: 'Real-time analytics on revenue, leads, pipeline and activities. Everything you need at a glance.' },
  { icon: <IconWrapper><Users size={24} /></IconWrapper>, title: 'Lead Management', desc: 'Capture, track and convert leads efficiently. Automatic transfer to contacts on conversion.' },
  { icon: <IconWrapper><Building2 size={24} /></IconWrapper>, title: 'Account & Contacts', desc: 'Manage all your business relationships in one place with rich contact profiles and account hierarchies.' },
  { icon: <IconWrapper><Briefcase size={24} /></IconWrapper>, title: 'Opportunity Pipeline', desc: 'Visualize your entire sales pipeline with drag-and-drop stages and real-time deal tracking.' },
  { icon: <IconWrapper><Ticket size={24} /></IconWrapper>, title: 'Ticket Support', desc: 'Handle customer queries efficiently with priority-based ticket management and status tracking.' },
  { icon: <IconWrapper><BarChart3 size={24} /></IconWrapper>, title: 'Reports & Insights', desc: 'Generate comprehensive reports and download them as PDFs. Stay informed about your CRM performance.' },
]

const pricing = [
  {
    plan: 'Starter', price: '$0', period: '/month',
    features: ['Up to 500 contacts', '3 users', 'Basic dashboard', 'Email support', '5 GB storage'],
    popular: false
  },
  {
    plan: 'Pro', price: '$29', period: '/month',
    features: ['Unlimited contacts', '10 users', 'Advanced analytics', 'Priority support', '50 GB storage', 'PDF reports', 'API access'],
    popular: true
  },
  {
    plan: 'Enterprise', price: '$99', period: '/month',
    features: ['Unlimited everything', 'Unlimited users', 'Custom integrations', 'Dedicated support', 'Unlimited storage', 'Custom workflows', 'SSO & SAML'],
    popular: false
  },
]

export default function LandingPage({ session }) {
  const navigate = useNavigate()
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
          <li><a href="#features">Features</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#about">About</a></li>
        </ul>
        <div className="landing-nav-cta">
          {session ? (
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Go to Dashboard →</button>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary">Sign In</Link>
              <Link to="/signup" className="btn btn-primary">Get Started Free</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-bg-blur" />
        <div className="hero-content">
          <div className="hero-badge"> The Modern CRM for Fast-Growing Teams</div>
          <h1 className="hero-title">
            Manage Relationships,<br />
            <span className="gradient-text">Close More Deals</span>
          </h1>
          <p className="hero-desc">
            XOWIQ CRM is the all-in-one platform for startups and businesses to manage leads, contacts, accounts, opportunities, and customer support — beautifully.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="btn btn-primary btn-large">Start for Free →</Link>
            <a href="#features" className="btn btn-secondary btn-large">Explore Features</a>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">10K+</div>
              <div className="hero-stat-label">Active Users</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">$2B+</div>
              <div className="hero-stat-label">Pipeline Managed</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">98%</div>
              <div className="hero-stat-label">Satisfaction Rate</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">99.9%</div>
              <div className="hero-stat-label">Uptime SLA</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section section-center" id="features">
        <div className="section-label">Features</div>
        <h2 className="section-title">Everything you need to grow</h2>
        <p className="section-desc">A complete CRM toolkit built for modern sales teams. No bloat, just what matters.</p>
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
        <div className="section-label">How it Works</div>
        <h2 className="section-title">Simple. Powerful. Fast.</h2>
        <p className="section-desc">Get started in minutes and see results immediately.</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:24, maxWidth:900, margin:'0 auto' }}>
          {[
            { step:'01', title:'Sign Up', desc:'Create your account in seconds. No credit card required.' },
            { step:'02', title:'Import Data', desc:'Bring in your existing contacts and leads effortlessly.' },
            { step:'03', title:'Track & Close', desc:'Manage your pipeline and convert leads into revenue.' },
          ].map(s => (
            <div key={s.step} style={{ padding:32, background:'var(--bg-card)', borderRadius:'var(--radius-lg)', border:'1px solid var(--border-subtle)' }}>
              <div style={{ fontSize:'2.5rem', fontWeight:900, color:'var(--accent)', marginBottom:12, opacity:0.5 }}>{s.step}</div>
              <h3 style={{ marginBottom:8 }}>{s.title}</h3>
              <p style={{ fontSize:14 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="section section-center" id="pricing">
        <div className="section-label">Pricing</div>
        <h2 className="section-title">Simple, transparent pricing</h2>
        <p className="section-desc">No hidden fees. Cancel anytime.</p>
        <div className="pricing-grid">
          {pricing.map(p => (
            <div className={`pricing-card ${p.popular ? 'popular' : ''}`} key={p.plan}>
              {p.popular && <div className="popular-badge"> Most Popular</div>}
              <div className="pricing-plan">{p.plan}</div>
              <div className="pricing-price">{p.price}<span> USD</span></div>
              <div className="pricing-period">per user {p.period}</div>
              <ul className="pricing-features">
                {p.features.map(f => (
                  <li key={f}><span className="check"></span> {f}</li>
                ))}
              </ul>
              <Link to="/signup" className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}>
                {p.plan === 'Starter' ? 'Get Started Free' : `Choose ${p.plan}`}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="section-label">Get Started Today</div>
        <h2 style={{ marginBottom:16 }}>Ready to transform your sales process?</h2>
        <p style={{ color:'var(--text-secondary)', marginBottom:36, fontSize:'1.1rem' }}>Join thousands of businesses managing relationships with XOWIQ CRM.</p>
        <Link to="/signup" className="btn btn-primary btn-large">Start Your Free Trial →</Link>
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
        <div className="footer-text">© 2026 XOWIQ CRM. All rights reserved.</div>
        <div style={{ display:'flex', gap:20 }}>
          <a href="#features" style={{ fontSize:14, color:'var(--text-muted)' }}>Features</a>
          <a href="#pricing" style={{ fontSize:14, color:'var(--text-muted)' }}>Pricing</a>
          <Link to="/login" style={{ fontSize:14, color:'var(--text-muted)' }}>Login</Link>
        </div>
      </footer>
    </div>
  )
}
