import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ArrowRight, Zap } from 'lucide-react'

export function FlowaLogo({ size = 28 }) {
  return (
    <Link to="/" className="flex items-center gap-1.5 group cursor-pointer text-slate-900 no-underline font-['Poppins',sans-serif]">
      <div className="flex items-center text-lg tracking-tight font-medium">
        <div className="bg-[#ff5900] text-white px-2.5 py-1 rounded-l-xl shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform duration-300 flex items-center gap-1.5 font-medium">
          <Zap size={14} className="fill-white" />
          <span>XOWIQ</span>
        </div>
        <div className="bg-[#0f172a] text-white px-2 py-1 rounded-r-xl border-l border-white/20 font-light text-sm">
          CRM
        </div>
      </div>
    </Link>
  )
}

export default function FlowaNavbar({ session }) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Features', path: '/features' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'Contact', path: '/contact' }
  ]

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true
    if (path !== '/' && location.pathname.startsWith(path)) return true
    return false
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 sm:px-8 pt-4 sm:pt-6 font-['Poppins',sans-serif]">
      <div
        className={`max-w-6xl mx-auto rounded-full transition-all duration-300 px-5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between ${
          scrolled
            ? 'bg-white/85 backdrop-blur-xl shadow-lg shadow-orange-950/5 border border-white/80'
            : 'bg-white/70 backdrop-blur-md border border-white/50 shadow-sm'
        }`}
      >
        {/* Brand Logo */}
        <FlowaLogo />

        {/* Center Pill Navigation (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1 rounded-full border border-slate-200/60 shadow-inner">
          {navLinks.map((link) => {
            const active = isActive(link.path)
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`relative px-4 py-1.5 rounded-full text-xs sm:text-sm transition-all duration-200 no-underline ${
                  active
                    ? 'text-[#ff5900] font-medium'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-light'
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute inset-0 bg-white rounded-full shadow-sm border border-slate-200/50"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{link.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right CTA */}
        <div className="hidden sm:flex items-center gap-3">
          {session ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 bg-[#ff5900] hover:bg-[#e04f00] text-white font-medium text-xs sm:text-sm px-5 py-2 rounded-full shadow-md shadow-orange-500/25 hover:shadow-lg transition-all duration-200 cursor-pointer border-none"
            >
              <span>Dashboard</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 font-medium text-xs sm:text-sm px-5 py-2 rounded-full border border-slate-200/80 shadow-sm hover:shadow transition-all duration-200 cursor-pointer no-underline"
            >
              <span>Login</span>
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-full text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border-none bg-transparent"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden max-w-6xl mx-auto mt-2 bg-white/95 backdrop-blur-xl rounded-3xl p-5 border border-slate-200/80 shadow-2xl space-y-3"
          >
            <div className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-sm transition-colors no-underline ${
                    isActive(link.path)
                      ? 'bg-orange-50 text-[#ff5900] font-medium'
                      : 'text-slate-700 hover:bg-slate-50 font-light'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl bg-[#ff5900] text-white font-medium text-sm no-underline shadow-md shadow-orange-500/20"
              >
                {session ? 'Go to Dashboard' : 'Sign In'}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
