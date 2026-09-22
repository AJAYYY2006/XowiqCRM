import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import FlowaNavbar from '../components/flowa/FlowaNavbar'
import FlowaFooter from '../components/flowa/FlowaFooter'
import { Check, ChevronDown, ChevronUp, Sparkles, HelpCircle } from 'lucide-react'

export default function PricingPage({ session }) {
  const [annualBilling, setAnnualBilling] = useState(true)
  const [openFaq, setOpenFaq] = useState(null)

  const faqs = [
    {
      q: "Can I switch or cancel my plan at any time?",
      a: "Yes, you can upgrade, downgrade, or cancel your XOWIQ subscription anytime from your workspace settings with zero penalties."
    },
    {
      q: "How does the 14-day free trial work?",
      a: "You get unrestricted access to the Pro tier for 14 days without requiring a credit card. You can test all roles and explore the PDF invoice engine."
    },
    {
      q: "How does Role-Based Access Control (RBAC) protect my customer data?",
      a: "Each account tier respects PostgreSQL Row Level Security. Super Admins manage global settings, Sales Leads manage opportunities, Support Leads handle tickets, and B2C Owners manage retail lifecycle operations."
    },
    {
      q: "Do you offer custom CRM data onboarding?",
      a: "Yes. Enterprise and Growth tier teams receive direct support from a dedicated XOWIQ Solutions Engineer for automated CSV and Supabase migrations."
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-['Poppins',sans-serif] selection:bg-[#ff5900] selection:text-white overflow-x-hidden">
      <FlowaNavbar session={session} />

      {/* Hero */}
      <section className="pt-32 sm:pt-40 pb-16 bg-gradient-to-b from-[#ffeedd] via-[#e2e8f0] to-[#f8fafc] text-center px-6">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#ff5900] bg-white/85 backdrop-blur-md px-4 py-1.5 rounded-full border border-orange-200/80 shadow-sm">
            <Sparkles size={12} />
            <span>TRANSPARENT PRICING</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-medium text-slate-950 tracking-tight leading-tight">
            Predictable pricing for every stage of your growth.
          </h1>
          <p className="text-base sm:text-lg text-slate-600 font-light max-w-xl mx-auto leading-relaxed">
            Choose the ideal plan to scale your sales pipelines, customer support, and billing operations.
          </p>

          {/* Toggle */}
          <div className="pt-4 inline-flex items-center gap-3 bg-white p-1.5 rounded-full border border-slate-200 shadow-sm">
            <button
              onClick={() => setAnnualBilling(false)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border-none ${
                !annualBilling ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnualBilling(true)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border-none ${
                annualBilling ? 'bg-[#ff5900] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 bg-transparent'
              }`}
            >
              <span>Annual Billing</span>
              <span className="bg-emerald-400 text-slate-950 text-[10px] font-medium px-1.5 py-0.2 rounded-full">SAVE 20%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* Starter */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-md flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Starter</h3>
                <p className="text-xs font-light text-slate-500 mb-6">Essential CRM tools for boutique teams.</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-medium text-slate-950">
                    ${annualBilling ? '39' : '49'}
                  </span>
                  <span className="text-xs text-slate-400 font-light">/ month</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-600 font-light list-none p-0 mb-8">
                  <li className="flex items-center gap-2"><Check size={14} className="text-[#ff5900]"/> Up to 5 team members</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-[#ff5900]"/> Lead & contact management</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-[#ff5900]"/> Deals & pipeline kanban</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-[#ff5900]"/> 5GB document storage</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-[#ff5900]"/> Standard email support</li>
                </ul>
              </div>
              <Link
                to="/signup"
                className="w-full text-center py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs no-underline transition-colors block"
              >
                Get Started
              </Link>
            </div>

            {/* Pro (Featured) */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-[#ff5900] flex flex-col justify-between text-white group">
              <img
                src="/images/flowa/hero_poppy_hill.jpg"
                alt="Pro plan poppy hill background"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-orange-950/80 to-slate-900/85 backdrop-blur-[2px]" />

              <div className="relative z-10 p-8">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-white">Pro Growth</h3>
                  <span className="bg-[#ff5900] text-white text-[10px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
                    MOST POPULAR
                  </span>
                </div>
                <p className="text-xs text-orange-100/80 font-light mb-6">Complete AI CRM intelligence for scaling teams.</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-medium text-white">
                    ${annualBilling ? '119' : '149'}
                  </span>
                  <span className="text-xs text-orange-200 font-light">/ month</span>
                </div>
                <ul className="space-y-3 text-xs text-orange-50 font-light list-none p-0 mb-8">
                  <li className="flex items-center gap-2"><Check size={14} className="text-orange-400"/> Up to 25 team members</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-orange-400"/> 5-Role RBAC access controls</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-orange-400"/> Quotes, invoices & PDF generator</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-orange-400"/> Fast Express API & webhooks</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-orange-400"/> 24/7 priority customer support</li>
                </ul>
              </div>

              <div className="relative z-10 p-8 pt-0">
                <Link
                  to="/signup"
                  className="w-full text-center py-3.5 rounded-full bg-white hover:bg-orange-50 text-slate-950 font-medium text-xs no-underline shadow-xl transition-all hover:shadow-2xl block"
                >
                  Start 14-Day Free Trial
                </Link>
              </div>
            </div>

            {/* Custom */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-md flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Custom</h3>
                <p className="text-xs font-light text-slate-500 mb-6">Enterprise-grade security and governance.</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-medium text-slate-950">
                    Custom
                  </span>
                </div>
                <ul className="space-y-3 text-xs text-slate-600 font-light list-none p-0 mb-8">
                  <li className="flex items-center gap-2"><Check size={14} className="text-[#ff5900]"/> Unlimited team seats</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-[#ff5900]"/> Custom AI LLM model training</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-[#ff5900]"/> Enterprise SSO & audit logs</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-[#ff5900]"/> Dedicated customer success manager</li>
                  <li className="flex items-center gap-2"><Check size={14} className="text-[#ff5900]"/> 99.99% SLA uptime guarantee</li>
                </ul>
              </div>
              <Link
                to="/contact"
                className="w-full text-center py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs no-underline transition-colors block"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-xs font-medium text-[#ff5900] uppercase tracking-widest">Common Questions</span>
            <h2 className="text-3xl font-medium text-slate-950 mt-2">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-colors bg-slate-50/50"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between text-left font-medium text-sm sm:text-base text-slate-900 cursor-pointer bg-transparent border-none p-0"
                >
                  <span>{faq.q}</span>
                  {openFaq === idx ? <ChevronUp size={18} className="text-[#ff5900] shrink-0"/> : <ChevronDown size={18} className="text-slate-400 shrink-0"/>}
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs sm:text-sm text-slate-600 font-light mt-3 leading-relaxed"
                    >
                      {faq.a}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FlowaFooter />
    </div>
  )
}
