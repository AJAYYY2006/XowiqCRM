import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import FlowaNavbar from '../components/flowa/FlowaNavbar'
import FlowaFooter from '../components/flowa/FlowaFooter'
import {
  LeadManagementMockup,
  SalesPipelineMockup,
  AISalesInsightsMockup
} from '../components/flowa/FlowaShowcases'
import {
  Sparkles,
  Zap,
  Shield,
  Layers,
  FileText,
  Users,
  Mic,
  BarChart3,
  CheckCircle2,
  ArrowRight
} from 'lucide-react'

export default function FeaturesPage({ session }) {
  const [activeTab, setActiveTab] = useState('leads')

  const features = [
    { id: 'leads', label: 'Lead Scoring & Routing', icon: <Users size={16} /> },
    { id: 'pipeline', label: 'Kanban Deals & Forecasting', icon: <BarChart3 size={16} /> },
    { id: 'ai', label: 'AI Voice & Speech Insights', icon: <Mic size={16} /> },
    { id: 'invoices', label: 'Quotes & PDF Billing', icon: <FileText size={16} /> },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-['Poppins',sans-serif] selection:bg-[#ff5900] selection:text-white overflow-x-hidden">
      <FlowaNavbar session={session} />

      {/* Hero */}
      <section className="pt-32 sm:pt-40 pb-16 bg-gradient-to-b from-[#ffeedd] via-[#e2e8f0] to-[#f8fafc] text-center px-6">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#ff5900] bg-white/85 backdrop-blur-md px-4 py-1.5 rounded-full border border-orange-200/80 shadow-sm">
            <Sparkles size={12} />
            <span>XOWIQ CAPABILITIES</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-medium text-slate-950 tracking-tight leading-tight">
            Engineered for modern high-velocity revenue teams.
          </h1>
          <p className="text-base sm:text-lg text-slate-600 font-light max-w-xl mx-auto leading-relaxed">
            Everything you need from lead scoring and deal kanbans to automated billing in one platform.
          </p>
        </div>
      </section>

      {/* Interactive Tabs Showcase */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          {/* Tab Selector */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-16">
            {features.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveTab(f.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer border-none ${
                  activeTab === f.id
                    ? 'bg-[#ff5900] text-white shadow-lg shadow-orange-500/25 scale-105'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 font-light'
                }`}
              >
                {f.icon}
                <span>{f.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content Panes */}
          <div className="bg-slate-50 rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-sm">
            {activeTab === 'leads' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-4">
                  <span className="text-xs font-medium text-[#ff5900] uppercase tracking-widest">Lead Intelligence</span>
                  <h3 className="text-3xl font-medium text-slate-950">
                    Precision Lead Scoring & Routing
                  </h3>
                  <p className="text-slate-600 font-light text-sm leading-relaxed">
                    XOWIQ automatically computes engagement signals, tags priority opportunities, and routes leads to dedicated sales managers with zero delay.
                  </p>
                  <ul className="space-y-2 text-sm text-slate-700 font-light list-none p-0">
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#ff5900]"/> Direct PostgreSQL sync with company contact enrichment</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#ff5900]"/> Stage movement alerts and team task assignments</li>
                  </ul>
                </div>
                <div className="lg:col-span-6">
                  <LeadManagementMockup />
                </div>
              </div>
            )}

            {activeTab === 'pipeline' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-4">
                  <span className="text-xs font-medium text-[#ff5900] uppercase tracking-widest">Opportunity Kanban</span>
                  <h3 className="text-3xl font-medium text-slate-950">
                    Interactive Deals & Revenue Forecast
                  </h3>
                  <p className="text-slate-600 font-light text-sm leading-relaxed">
                    Track every deal through customizable B2B & B2C stages. Calculate weighted revenue forecasts and view quarterly trends with real-time accuracy.
                  </p>
                  <ul className="space-y-2 text-sm text-slate-700 font-light list-none p-0">
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#ff5900]"/> Dynamic drag-and-drop opportunity cards</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#ff5900]"/> Real-time probability calculation per stage</li>
                  </ul>
                </div>
                <div className="lg:col-span-6">
                  <SalesPipelineMockup />
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-4">
                  <span className="text-xs font-medium text-[#ff5900] uppercase tracking-widest">Conversational AI</span>
                  <h3 className="text-3xl font-medium text-slate-950">
                    Real-Time Voice AI & Meeting Intelligence
                  </h3>
                  <p className="text-slate-600 font-light text-sm leading-relaxed">
                    Automatically transcribe customer conversations, detect customer objections, score call sentiment, and extract structured action items.
                  </p>
                  <ul className="space-y-2 text-sm text-slate-700 font-light list-none p-0">
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#ff5900]"/> Instant post-call CRM summary updates</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#ff5900]"/> Automated proposal generation suggestions</li>
                  </ul>
                </div>
                <div className="lg:col-span-6">
                  <AISalesInsightsMockup />
                </div>
              </div>
            )}

            {activeTab === 'invoices' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-4">
                  <span className="text-xs font-medium text-[#ff5900] uppercase tracking-widest">Financial Operations</span>
                  <h3 className="text-3xl font-medium text-slate-950">
                    1-Click Quotes & PDF Invoice Generation
                  </h3>
                  <p className="text-slate-600 font-light text-sm leading-relaxed">
                    Convert won opportunities into branded PDF quotes and invoices instantly with custom tax rates, discount lines, and downloadable PDFs.
                  </p>
                  <ul className="space-y-2 text-sm text-slate-700 font-light list-none p-0">
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#ff5900]"/> Verified jsPDF invoice engine with custom branding</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#ff5900]"/> Paid vs Pending status tracking</li>
                  </ul>
                </div>
                <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="font-medium text-xs text-slate-900">Invoice #XOWIQ-2026-084</div>
                    <span className="bg-emerald-50 text-emerald-600 text-[10px] font-medium px-2 py-0.5 rounded-full">PAID</span>
                  </div>
                  <div className="text-xs text-slate-500 font-light">Client: <strong className="text-slate-800 font-medium">Apex Global Technologies</strong></div>
                  <div className="text-2xl font-medium text-slate-900">$24,500.00</div>
                  <div className="text-[11px] text-slate-400 font-light">Includes 25 Pro Seats + Enterprise Support SLA</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <FlowaFooter />
    </div>
  )
}
