import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { supabase } from './lib/supabase'
import { RoleProvider } from './contexts/RoleContext'
import { ThemeProvider } from './contexts/ThemeContext'
import LandingPage from './pages/LandingPage'
import AboutPage from './pages/AboutPage'
import FeaturesPage from './pages/FeaturesPage'
import PricingPage from './pages/PricingPage'
import ContactPage from './pages/ContactPage'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'

function ProtectedRoute({ session, children }) {
  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { t } = useTranslation()
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      setProfile(data || null)
    } catch {
      setProfile(null)
    }
  }

  useEffect(() => {
    // Force sign-out migration if needed
    if (!localStorage.getItem('xowiq_unified_dashboard_migration')) {
      supabase.auth.signOut().then(() => {
        localStorage.setItem('xowiq_unified_dashboard_migration', 'done')
        window.location.href = '/login'
      })
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user?.id) {
        fetchProfile(session.user.id)
      }
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user?.id) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <img
          src="/images/xowiq-logo.png"
          alt="XOWIQ CRM"
          style={{ height: 40, width: 'auto' }}
        />
        <div className="spinner" />
        <span style={{ fontSize: 13, color: '#64748b' }}>{t('loading')}</span>
      </div>
    )
  }

  const loggedInRedirect = '/dashboard'

  return (
    <ThemeProvider>
      <RoleProvider session={session} profile={profile}>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1a2235',
                color: '#f1f5f9',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: '10px',
              },
            }}
          />
          <Routes>
            <Route path="/" element={<LandingPage session={session} />} />
            <Route path="/home" element={<LandingPage session={session} />} />
            <Route path="/about" element={<AboutPage session={session} />} />
            <Route path="/features" element={<FeaturesPage session={session} />} />
            <Route path="/feature" element={<FeaturesPage session={session} />} />
            <Route path="/pricing" element={<PricingPage session={session} />} />
            <Route path="/contact" element={<ContactPage session={session} />} />
            <Route path="/login" element={session ? <Navigate to={loggedInRedirect} replace /> : <Login />} />
            <Route path="/signup" element={session ? <Navigate to={loggedInRedirect} replace /> : <SignUp />} />

            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute session={session}>
                  <Dashboard session={session} />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </RoleProvider>
    </ThemeProvider>
  )
}
