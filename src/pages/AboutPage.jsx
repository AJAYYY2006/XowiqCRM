import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import FlowaNavbar from '../components/flowa/FlowaNavbar'
import FlowaFooter from '../components/flowa/FlowaFooter'
import { Sparkles, Users, Globe, Shield, HeartHandshake, Award, ArrowRight, Zap, CheckCircle2 } from 'lucide-react'

export default function AboutPage({ session }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-['Poppins',sans-serif] selection:bg-[#ff5900] selection:text-white overflow-x-hidden">
      <FlowaNavbar session={session} />

      {/* Hero */}
      <section className="pt-32 sm:pt-40 pb-16 bg-gradient-to-b from-[#ffeedd] via-[#e2e8f0] to-[#f8fafc] text-center px-6">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#ff5900] bg-white/85 backdrop-blur-md px-4 py-1.5 rounded-full border border-orange-200/80 shadow-sm">
            <Sparkles size={12} />
            <span>ABOUT XOWIQ CRM</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-medium text-slate-950 tracking-tight leading-tight">
            We are humanizing enterprise CRM through intelligence.
          </h1>
          <p className="text-base sm:text-lg text-slate-600 font-light max-w-xl mx-auto leading-relaxed">
            Empowering modern revenue teams with unified 5-role access controls and automated customer pipelines.
          </p>
        </div>
      </section>

      {/* Mission & Story */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <span className="text-xs font-medium text-[#ff5900] uppercase tracking-widest">Our Vision</span>
            <h2 className="text-3xl font-medium text-slate-950">
              Empowering Revenue Teams Globally
            </h2>
            <p className="text-slate-600 font-light text-sm sm:text-base leading-relaxed">
              Sales reps and managers often spend over 60% of their day manually copying notes, updating lead stages, and formatting quotes. XOWIQ eliminates administrative drag with intelligent Supabase sync, drag-and-drop pipelines, and speech-to-text meeting summaries.
            </p>
          </div>
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
            <img
              src="/images/flowa/hero_poppy_hill.jpg"
              alt="XOWIQ CRM landscape"
              className="w-full h-72 object-cover"
            />
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-xs font-medium text-[#ff5900] uppercase tracking-widest">Core Values</span>
            <h2 className="text-3xl font-medium text-slate-950 mt-2">
              Principles That Drive XOWIQ Forward
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Zap className="text-[#ff5900]" size={24} />,
                title: "Speed & Real-Time Sync",
                desc: "Every deal stage update and invoice status is saved instantly to PostgreSQL with zero latency."
              },
              {
                icon: <Shield className="text-[#ff5900]" size={24} />,
                title: "5-Role Granular Security",
                desc: "Super Admin, Sales Manager, Support Lead, B2C Owner, and Staff Viewer roles protect sensitive business metrics."
              },
              {
                icon: <HeartHandshake className="text-[#ff5900]" size={24} />,
                title: "Built for Humans",
                desc: "Modern typography, responsive layouts, and clean visual design make everyday CRM work seamless."
              }
            ].map((val, idx) => (
              <div key={idx} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
                  {val.icon}
                </div>
                <h3 className="text-lg font-medium text-slate-900">{val.title}</h3>
                <p className="text-xs sm:text-sm text-slate-500 font-light leading-relaxed">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FlowaFooter />
    </div>
  )
}
