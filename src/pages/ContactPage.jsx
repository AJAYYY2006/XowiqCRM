import React, { useState } from 'react'
import { motion } from 'framer-motion'
import FlowaNavbar from '../components/flowa/FlowaNavbar'
import FlowaFooter from '../components/flowa/FlowaFooter'
import toast from 'react-hot-toast'
import {
  Mail,
  Phone,
  MapPin,
  Send,
  MessageSquare,
  Clock,
  CheckCircle2,
  Sparkles,
  Building2,
  ShieldCheck,
  ArrowRight
} from 'lucide-react'

export default function ContactPage({ session }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    teamSize: '10-50',
    message: ''
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.email) {
      toast.error('Please provide your name and work email.')
      return
    }
    setSubmitted(true)
    toast.success('Thank you! Our XOWIQ sales team will reach out within 15 minutes.')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-['Poppins',sans-serif] selection:bg-[#ff5900] selection:text-white overflow-x-hidden">
      <FlowaNavbar session={session} />

      {/* Hero Section - Simple & Single Sentence Based */}
      <section className="pt-32 sm:pt-40 pb-16 bg-gradient-to-b from-[#ffeedd] via-[#e2e8f0] to-[#f8fafc] text-center px-6">
        <div className="max-w-3xl mx-auto space-y-5">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#ff5900] bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-orange-200/80 shadow-sm"
          >
            <Sparkles size={13} className="text-[#ff5900]" />
            <span>Get In Touch</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl font-medium text-slate-950 tracking-tight leading-tight"
          >
            Let's talk about accelerating your revenue.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-slate-600 font-light max-w-xl mx-auto leading-relaxed"
          >
            Schedule a personalized demo with our enterprise architects or ask us anything.
          </motion.p>
        </div>
      </section>

      {/* Form & Info Section */}
      <section className="py-16 sm:py-20 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Direct Contact Details */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-3">
              <span className="text-xs font-medium text-[#ff5900] uppercase tracking-widest">Direct Assistance</span>
              <h2 className="text-2xl sm:text-3xl font-medium text-slate-950">
                We are here to help your team grow.
              </h2>
              <p className="text-slate-500 font-light text-sm leading-relaxed">
                Connect with our dedicated enterprise support and solutions engineers anytime.
              </p>
            </div>

            <div className="space-y-3.5 text-sm">
              <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-100/90 hover:border-orange-200 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff5900] flex items-center justify-center shrink-0 shadow-sm">
                  <Mail size={18} />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-light">Email Direct</div>
                  <div className="font-medium text-slate-900">sales@xowiq.com</div>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-100/90 hover:border-orange-200 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff5900] flex items-center justify-center shrink-0 shadow-sm">
                  <Phone size={18} />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-light">Phone Toll-Free</div>
                  <div className="font-medium text-slate-900">+1 (800) XOWIQ-CRM</div>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-100/90 hover:border-orange-200 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff5900] flex items-center justify-center shrink-0 shadow-sm">
                  <Clock size={18} />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-light">Guaranteed SLA</div>
                  <div className="font-medium text-emerald-600">Response time under 15 minutes</div>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-100/90 hover:border-orange-200 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff5900] flex items-center justify-center shrink-0 shadow-sm">
                  <MapPin size={18} />
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-light">Enterprise Headquarters</div>
                  <div className="font-medium text-slate-900">San Francisco, CA & Global Hubs</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-100 flex items-start gap-3">
              <ShieldCheck size={20} className="text-[#ff5900] shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 font-light leading-relaxed">
                Enterprise security standard: SOC2 certified, 256-bit AES encryption, and dedicated PostgreSQL tenancy.
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Booking / Contact Form */}
          <div className="lg:col-span-7 bg-slate-50 rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-md">
            {submitted ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-2xl font-medium text-slate-900">Inquiry Received!</h3>
                <p className="text-sm text-slate-600 font-light max-w-sm mx-auto leading-relaxed">
                  A XOWIQ CRM solutions consultant has been assigned to your request and will contact you at <strong>{formData.email}</strong> shortly.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-6 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer border-none transition-colors"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="mb-4">
                  <h3 className="text-xl font-medium text-slate-900">Book a Live Demo</h3>
                  <p className="text-xs text-slate-500 font-light mt-0.5">Experience the 5-role CRM workflow in action.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Alex Rivera"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#ff5900] shadow-sm font-light"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Work Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="alex@xowiq.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#ff5900] shadow-sm font-light"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Company Name</label>
                    <input
                      type="text"
                      placeholder="Apex Global"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#ff5900] shadow-sm font-light"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Sales Team Size</label>
                    <select
                      value={formData.teamSize}
                      onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#ff5900] shadow-sm cursor-pointer font-light"
                    >
                      <option value="1-5">1 - 5 Reps</option>
                      <option value="5-20">5 - 20 Reps</option>
                      <option value="20-50">20 - 50 Reps</option>
                      <option value="50+">50+ Enterprise Seats</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">How can we help your team?</label>
                  <textarea
                    rows={4}
                    placeholder="Tell us about your current sales process, 5-role requirements, and billing bottlenecks..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#ff5900] shadow-sm resize-none font-light"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-full bg-[#ff5900] hover:bg-[#e04f00] text-white font-medium text-sm shadow-xl shadow-orange-500/25 hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 border-none"
                >
                  <Send size={15} />
                  <span>Submit Demo Request</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <FlowaFooter />
    </div>
  )
}
