import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { supabase } from './lib/supabase'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/AdminDashboard'

function ProtectedRoute({ session, children }) {
  if (!session) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ session, children }) {
  if (!session) return <Navigate to="/login" replace />
  // Role comes from user_metadata — set at login time, always available immediately
  const role = (session.user.user_metadata?.role || 'user').toLowerCase()
  const isAdmin = ['admin', 'administrator'].includes(role)
  if (!isAdmin) return <Navigate to="/dashboard" replace />
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
      // Non-critical — profile is used for display only
      setProfile(null)
    }
  }

  useEffect(() => {
    // Always resolve loading — never hang
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user?.id) {
        fetchProfile(session.user.id)
      }
      setLoading(false)   // ← always called, no async await blocking this
    }).catch(() => {
      setLoading(false)   // ← even if getSession itself throws
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
      <div className="loading-container" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
        <span>{t('loading')}</span>
      </div>
    )
  }

  // Redirect destination based on role in user_metadata (always available after login)
  const role = (session?.user?.user_metadata?.role || 'user').toLowerCase()
  const isAdmin = ['admin', 'administrator'].includes(role)
  const loggedInRedirect = isAdmin ? '/admin' : '/dashboard'

  return (
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
        <Route path="/login" element={session ? <Navigate to={loggedInRedirect} replace /> : <Login />} />
        <Route path="/signup" element={session ? <Navigate to={loggedInRedirect} replace /> : <SignUp />} />

        {/* Regular user CRM */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute session={session}>
              <Dashboard session={session} />
            </ProtectedRoute>
          }
        />

        {/* Admin-only dashboard */}
        <Route
          path="/admin/*"
          element={
            <AdminRoute session={session}>
              <AdminDashboard session={session} />
            </AdminRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
