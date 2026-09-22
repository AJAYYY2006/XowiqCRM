import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import FlowaNavbar from '../components/flowa/FlowaNavbar'
import FlowaFooter from '../components/flowa/FlowaFooter'
import {
  HeroAITalkingCard,
  DeltaPrismGraphic,
  WaveformGraphic,
  RadarGraphic,
  LeadManagementMockup,
  SalesPipelineMockup,
  AISalesInsightsMockup
} from '../components/flowa/FlowaShowcases'
import {
  ArrowRight,
  Check,
  Sparkles,
  Zap,
  Shield,
  Play,
  Layers,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  FileText
} from 'lucide-react'

export default function LandingPage({ session }) {
  const navigate = useNavigate()
  const [annualBilling, setAnnualBilling] = useState(true)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-['Poppins',sans-serif] selection:bg-[#ff5900] selection:text-white overflow-x-hidden">
      {/* Floating Pill Navbar */}
      <FlowaNavbar session={session} />

      {/* =========================================================================
          SECTION 1: HERO SECTION - SIMPLE & SINGLE SENTENCE BASED
          ========================================================================= */}
      <section className="relative pt-32 sm:pt-40 pb-0 overflow-hidden bg-gradient-to-b from-[#ffeedd] via-[#e2e8f0] to-[#f8fafc]">
        {/* Atmospheric soft lighting overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-400/20 via-indigo-500/10 to-transparent pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          {/* Top Pill / Badge */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-orange-200/80 shadow-sm text-xs font-medium text-[#ff5900] mb-6"
          >
            <Sparkles size={13} className="text-[#ff5900]" />
            <span>Intelligent Enterprise CRM Platform</span>
          </motion.div>

          {/* Main Hero Headline - Simple & Single Sentence */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-medium text-slate-950 tracking-tight leading-[1.12] max-w-3xl mx-auto"
          >
            Turn every customer conversation into predictable revenue growth.
          </motion.h1>

          {/* Subtitle - Single Sentence */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-base sm:text-lg md:text-xl text-slate-600 font-light max-w-2xl mx-auto leading-relaxed"
          >
            Unify leads, sales pipelines, billing, and team collaboration into one seamless AI-powered workspace.
          </motion.p>

          {/* Hero Dual CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to={session ? "/dashboard" : "/signup"}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#ff5900] hover:bg-[#e04f00] text-white font-medium text-sm sm:text-base shadow-xl shadow-orange-500/25 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 no-underline cursor-pointer flex items-center justify-center gap-2 border-none"
            >
              <span>Start Free Trial</span>
              <ArrowRight size={16} />
            </Link>

            <Link
              to="/contact"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white/95 hover:bg-white text-slate-800 font-medium text-sm sm:text-base border border-slate-200 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 no-underline cursor-pointer flex items-center justify-center gap-2"
            >
              <Play size={14} className="fill-slate-800" />
              <span>Book a Demo</span>
            </Link>
          </motion.div>

          {/* Micro trust row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-light"
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-500" />
              <span>5-minute workspace setup</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-500" />
              <span>Full 5-role RBAC access</span>
            </div>
          </motion.div>
        </div>

        {/* Hero Curved Poppy Meadow Dome */}
        <div className="relative mt-8 sm:mt-12 max-w-5xl mx-auto px-4 sm:px-6">
          {/* Floating Live AI Talking Points Card */}
          <div className="relative z-20 -mb-16 sm:-mb-24">
            <HeroAITalkingCard />
          </div>

          {/* Grassy Curved Dome Hill Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative z-10 rounded-t-[40px] sm:rounded-t-[80px] overflow-hidden shadow-2xl border-t border-x border-white/60"
          >
            <img
              src="/images/flowa/hero_dome_hill.jpg"
              alt="Lush green hill with red poppy flowers under blue sky"
              className="w-full h-64 sm:h-96 md:h-[480px] object-cover object-bottom"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent opacity-80" />
          </motion.div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: TRUSTED BY LOGOS
          ========================================================================= */}
      <section className="py-12 sm:py-16 bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400 mb-8">
            POWERING 20,000+ HIGH-GROWTH REVENUE TEAMS WORLDWIDE
          </p>

          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-70 grayscale hover:grayscale-0 transition-all duration-300">
            {['Typeform', 'ActiveCampaign', 'CloudWatch', 'Techscribe', 'Prismflow'].map((brand, idx) => (
              <div key={idx} className="flex items-center gap-2 text-slate-700 font-medium text-lg tracking-tight hover:text-[#ff5900] transition-colors">
                <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-medium">
                  {brand.charAt(0)}
                </div>
                <span>{brand}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: MADE FOR INTELLIGENT WORK (4-CARD GRID)
          ========================================================================= */}
      <section className="py-20 sm:py-28 bg-slate-50 relative">
        <div className="max-w-6xl mx-auto px-6">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#ff5900] uppercase tracking-widest bg-orange-50 px-3 py-1 rounded-full mb-3 border border-orange-100">
                <Sparkles size={12} />
                <span>KEY CAPABILITIES</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium text-slate-950 tracking-tight">
                Built for Intelligent CRM Operations
              </h2>
            </div>
            <p className="text-slate-500 font-light max-w-md text-sm sm:text-base leading-relaxed">
              Empower every department with tailored 5-role permissions, automatic Supabase syncing, and intelligent deal scoring.
            </p>
          </div>

          {/* 4 Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 01: 5-Role RBAC Security */}
            <motion.div
              whileHover={{ y: -6 }}
              className="bg-white rounded-3xl p-6 shadow-lg shadow-slate-200/50 border border-slate-200/80 flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-medium text-slate-400 mb-4">01.</div>
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-900">5-Role RBAC Matrix</span>
                    <span className="text-[10px] font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Active</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#ff5900] h-full w-full rounded-full" />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">Role-Based Access Control</h3>
                <p className="text-xs font-light text-slate-500 leading-relaxed">
                  Granular gates for Super Admin, Sales Manager, Support Lead, and B2C Store Owner.
                </p>
              </div>
            </motion.div>

            {/* Card 02: Fast Supabase Sync */}
            <motion.div
              whileHover={{ y: -6 }}
              className="bg-white rounded-3xl p-6 shadow-lg shadow-slate-200/50 border border-slate-200/80 flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-medium text-slate-400 mb-2">02.</div>
                <DeltaPrismGraphic />
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">Fast Supabase Sync</h3>
                <p className="text-xs font-light text-slate-500 leading-relaxed">
                  Direct PostgreSQL integration with Row Level Security, instant queries, and audit logs.
                </p>
              </div>
            </motion.div>

            {/* Card 03: Speech-to-Text Voice AI */}
            <motion.div
              whileHover={{ y: -6 }}
              className="bg-white rounded-3xl p-6 shadow-lg shadow-slate-200/50 border border-slate-200/80 flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-medium text-slate-400 mb-2">03.</div>
                <WaveformGraphic />
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">Voice AI Intelligence</h3>
                <p className="text-xs font-light text-slate-500 leading-relaxed">
                  Live meeting transcription, customer sentiment scores, and automatic action item extraction.
                </p>
              </div>
            </motion.div>

            {/* Card 04: Quotes & Invoices */}
            <motion.div
              whileHover={{ y: -6 }}
              className="bg-white rounded-3xl p-6 shadow-lg shadow-slate-200/50 border border-slate-200/80 flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-medium text-slate-400 mb-2">04.</div>
                <RadarGraphic />
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">Quotes & PDF Billing</h3>
                <p className="text-xs font-light text-slate-500 leading-relaxed">
                  Generate verified PDF quotes and client invoices with 1-click tax calculations and downloads.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: EVERYTHING YOUR TEAM NEEDS (3 LARGE SHOWCASE CARDS)
          ========================================================================= */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6 space-y-16 sm:space-y-24">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#ff5900] uppercase tracking-widest bg-orange-50 px-3 py-1 rounded-full mb-3 border border-orange-100">
              <Layers size={12} />
              <span>COMPLETE PLATFORM</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium text-slate-950 tracking-tight">
              Everything Your Enterprise Needs to Close More Deals
            </h2>
            <p className="mt-4 text-slate-500 font-light text-sm sm:text-base leading-relaxed">
              A unified system built to streamline pipelines, customer support tickets, service billing, and revenue predictability.
            </p>
          </div>

          {/* Feature 1: Smart Lead Management */}
          <div className="bg-slate-50/80 rounded-3xl sm:rounded-[36px] p-8 sm:p-12 border border-slate-200/80 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-5">
              <h3 className="text-2xl sm:text-3xl font-medium text-slate-950 tracking-tight">
                Smart Lead Scoring & Conversion
              </h3>
              <p className="text-slate-600 font-light text-sm sm:text-base leading-relaxed">
                Score incoming leads automatically, track engagement channels, and route opportunities to the right sales reps instantly.
              </p>
              <ul className="space-y-2.5 text-sm text-slate-700 font-light list-none p-0">
                <li className="flex items-center gap-2.5"><CheckCircle2 size={16} className="text-[#ff5900] shrink-0"/> Multi-channel contact enrichment with verified data</li>
                <li className="flex items-center gap-2.5"><CheckCircle2 size={16} className="text-[#ff5900] shrink-0"/> Automated stage progression and alert triggers</li>
                <li className="flex items-center gap-2.5"><CheckCircle2 size={16} className="text-[#ff5900] shrink-0"/> Deal conversion probability indicators</li>
              </ul>
              <div className="pt-2">
                <Link to="/features" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#ff5900] hover:bg-[#e04f00] text-white font-medium text-sm no-underline shadow-md shadow-orange-500/20">
                  <span>Explore Leads Pipeline</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
            <div className="lg:col-span-6">
              <LeadManagementMockup />
            </div>
          </div>

          {/* Feature 2: Visual Deal Pipeline */}
          <div className="bg-slate-50/80 rounded-3xl sm:rounded-[36px] p-8 sm:p-12 border border-slate-200/80 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-6 order-2 lg:order-1">
              <SalesPipelineMockup />
            </div>
            <div className="lg:col-span-6 space-y-5 order-1 lg:order-2">
              <h3 className="text-2xl sm:text-3xl font-medium text-slate-950 tracking-tight">
                Drag-and-Drop Deal Kanban
              </h3>
              <p className="text-slate-600 font-light text-sm sm:text-base leading-relaxed">
                Visualize every deal stage from initial discovery to closed-won with weighted forecasting and automated follow-up reminders.
              </p>
              <ul className="space-y-2.5 text-sm text-slate-700 font-light list-none p-0">
                <li className="flex items-center gap-2.5"><CheckCircle2 size={16} className="text-[#ff5900] shrink-0"/> Custom opportunity stages for B2B and B2C sales</li>
                <li className="flex items-center gap-2.5"><CheckCircle2 size={16} className="text-[#ff5900] shrink-0"/> Quarterly revenue projection models</li>
                <li className="flex items-center gap-2.5"><CheckCircle2 size={16} className="text-[#ff5900] shrink-0"/> Task and SLA trigger automations</li>
              </ul>
              <div className="pt-2">
                <Link to="/features" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#ff5900] hover:bg-[#e04f00] text-white font-medium text-sm no-underline shadow-md shadow-orange-500/20">
                  <span>View Pipeline Kanban</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>

          {/* Feature 3: AI Speech & Sentiment Analysis */}
          <div className="bg-slate-50/80 rounded-3xl sm:rounded-[36px] p-8 sm:p-12 border border-slate-200/80 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-5">
              <h3 className="text-2xl sm:text-3xl font-medium text-slate-950 tracking-tight">
                AI Speech & Sentiment Insights
              </h3>
              <p className="text-slate-600 font-light text-sm sm:text-base leading-relaxed">
                Transcribe customer calls automatically, generate concise executive summaries, and extract agreed action items directly into CRM profiles.
              </p>
              <ul className="space-y-2.5 text-sm text-slate-700 font-light list-none p-0">
                <li className="flex items-center gap-2.5"><CheckCircle2 size={16} className="text-[#ff5900] shrink-0"/> Real-time speech transcription & sentiment scoring</li>
                <li className="flex items-center gap-2.5"><CheckCircle2 size={16} className="text-[#ff5900] shrink-0"/> Instant objection detection and competitive cues</li>
                <li className="flex items-center gap-2.5"><CheckCircle2 size={16} className="text-[#ff5900] shrink-0"/> Direct Supabase activity timeline sync</li>
              </ul>
              <div className="pt-2">
                <Link to="/features" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#ff5900] hover:bg-[#e04f00] text-white font-medium text-sm no-underline shadow-md shadow-orange-500/20">
                  <span>Discover AI Intel</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
            <div className="lg:col-span-6">
              <AISalesInsightsMockup />
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: PRICING PLANS (3 TIERS WITH FEATURED NATURE BACKGROUND CARD)
          ========================================================================= */}
      <section className="py-20 sm:py-28 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#ff5900] uppercase tracking-widest bg-orange-50 px-3 py-1 rounded-full mb-3 border border-orange-100">
              <Sparkles size={12} />
              <span>PRICING MATRIX</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium text-slate-950 tracking-tight">
              Choose The Intelligence That Fits Your Workflow
            </h2>
            <p className="mt-3 text-slate-500 font-light text-sm sm:text-base">
              Scale with flexible plans designed for high-growth startups and established enterprise teams.
            </p>

            {/* Monthly / Annual Toggle */}
            <div className="mt-8 inline-flex items-center gap-3 bg-white p-1.5 rounded-full border border-slate-200 shadow-sm">
              <button
                onClick={() => setAnnualBilling(false)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  !annualBilling ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnualBilling(true)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                  annualBilling ? 'bg-[#ff5900] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Annual Billing</span>
                <span className="bg-emerald-400 text-slate-950 text-[10px] font-medium px-1.5 py-0.2 rounded-full">SAVE 20%</span>
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* Plan 1: Starter */}
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

            {/* Plan 2: Pro (Featured with Poppy Landscape Background) */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-[#ff5900] flex flex-col justify-between text-white group">
              {/* Nature background */}
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

            {/* Plan 3: Custom / Enterprise */}
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

      {/* =========================================================================
          SECTION 6: TESTIMONIALS ("Loved by Teams That Sell Smarter")
          ========================================================================= */}
      <section className="py-20 sm:py-28 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#ff5900] uppercase tracking-widest bg-orange-50 px-3 py-1 rounded-full mb-3 border border-orange-100">
              <Sparkles size={12} />
              <span>TESTIMONIALS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium text-slate-950 tracking-tight">
              Loved by High-Velocity Revenue Teams
            </h2>
            <p className="mt-3 text-slate-500 font-light text-sm sm:text-base">
              Hear how enterprise sales leaders close deals 2x faster with XOWIQ CRM.
            </p>
          </div>

          {/* Testimonials 2-row Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                quote: "XOWIQ's RBAC allowed us to seamlessly onboard our sales reps, support leads, and B2C managers with zero permission conflicts.",
                author: "Elena Rostova",
                role: "VP of Sales, CloudScale",
                avatar: "E"
              },
              {
                quote: "The direct Supabase sync and custom deal stages gave our executive team unprecedented visibility into our quarterly revenue pipeline.",
                author: "David Chen",
                role: "Head of Revenue Operations, FinFlow",
                avatar: "D"
              },
              {
                quote: "We replaced three disparate tools with XOWIQ CRM. Our deal conversion velocity jumped by 34% in the very first month.",
                author: "Marcus Vance",
                role: "Chief Commercial Officer, Apex AI",
                avatar: "M"
              },
              {
                quote: "The 1-click PDF quote and invoice generator cut our billing cycle down from 4 days to literally 3 minutes.",
                author: "Sarah Connor",
                role: "Sales Director, Horizon Tech",
                avatar: "S"
              },
              {
                quote: "The automated speech transcription and action item detection keeps our reps focused on closing instead of manual logging.",
                author: "Alex Rivera",
                role: "Chief Technology Officer, Nexus Systems",
                avatar: "A"
              },
              {
                quote: "The natural poppy landscape visual design makes working inside XOWIQ an absolute joy every morning.",
                author: "Chloe Dubois",
                role: "Founder & CEO, Studio Velo",
                avatar: "C"
              }
            ].map((t, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -4 }}
                className="bg-slate-50 rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between"
              >
                <p className="text-xs sm:text-sm text-slate-700 font-light leading-relaxed italic mb-6">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#ff5900] to-[#ff8237] text-white font-medium text-xs flex items-center justify-center shadow-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-900">{t.author}</div>
                    <div className="text-[11px] font-light text-slate-400">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 7: PANORAMIC NATURE CTA BANNER
          ========================================================================= */}
      <section className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="relative rounded-[36px] sm:rounded-[48px] overflow-hidden shadow-2xl p-10 sm:p-20 text-center text-white border border-white/40">
            {/* Background Image */}
            <img
              src="/images/flowa/cta_landscape.jpg"
              alt="Panoramic poppy hill landscape"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Sunset Orange to Indigo Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-orange-950/80 to-slate-900/75 backdrop-blur-[1px]" />

            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-white uppercase tracking-widest bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/30">
                <Sparkles size={12} />
                <span>START YOUR FREE TRIAL</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-medium text-white tracking-tight leading-tight drop-shadow-md">
                Give Your Sales Team The Tools to Close More Deals
              </h2>

              <p className="text-sm sm:text-base text-orange-100 font-light max-w-xl mx-auto leading-relaxed">
                Join thousands of high-performing revenue teams using XOWIQ CRM today. No credit card required.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to={session ? "/dashboard" : "/signup"}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#ff5900] hover:bg-[#e04f00] text-white font-medium text-sm sm:text-base shadow-xl hover:scale-105 transition-all no-underline border-none"
                >
                  Start Free Trial
                </Link>
                <Link
                  to="/contact"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white/20 hover:bg-white/30 text-white font-medium text-sm sm:text-base border border-white/40 backdrop-blur-md hover:scale-105 transition-all no-underline"
                >
                  Book a 1-on-1 Demo
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 8: ENTERPRISE FOOTER
          ========================================================================= */}
      <FlowaFooter />
    </div>
  )
}
