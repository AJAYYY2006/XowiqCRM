import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Check, 
  TrendingUp, 
  Sparkles, 
  Mic, 
  Users, 
  Zap, 
  ShieldCheck, 
  ArrowRight, 
  Building2, 
  MessageSquare,
  BarChart3,
  CheckCircle2,
  Clock,
  Shield,
  Lightbulb,
  FileCheck
} from 'lucide-react'

// 1. Hero Floating Talking Points Card
export function HeroAITalkingCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="relative mx-auto max-w-sm w-full bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl shadow-orange-950/15 border border-white/80 font-['Poppins',sans-serif]"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-orange-50 text-[#ff5900] flex items-center justify-center">
            <Sparkles size={14} />
          </div>
          <span className="text-xs font-medium text-slate-800 tracking-tight">XOWIQ AI Live Copilot</span>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[11px] font-medium">
          <TrendingUp size={12} />
          <span>+32% Win Rate</span>
        </div>
      </div>

      <div className="pt-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#ff5900] animate-pulse" />
          <span className="text-[11px] font-light text-slate-500">Live Enterprise Call • 04:18</span>
        </div>
        <div className="text-xs text-slate-700 font-light bg-slate-50 rounded-xl p-2.5 border border-slate-100 leading-relaxed flex items-start gap-2">
          <Lightbulb size={14} className="text-[#ff5900] shrink-0 mt-0.5" />
          <span><strong className="text-slate-900 font-medium">Recommended:</strong> "Highlight the 5-Role granular RBAC access controls, fast Supabase sync, and 1-click PDF quote generator."</span>
        </div>
      </div>
    </motion.div>
  )
}

// 2. Section 3 Wireframe Graphics
export function DeltaPrismGraphic() {
  return (
    <div className="w-full h-32 flex items-center justify-center">
      <svg width="90" height="90" viewBox="0 0 100 100" fill="none" className="text-slate-300">
        <polygon points="50,15 90,85 10,85" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" fill="none" />
        <polygon points="50,30 80,80 20,80" stroke="#ff5900" strokeWidth="2" fill="rgba(255, 89, 0, 0.06)" />
        <circle cx="50" cy="55" r="8" fill="#ff8237" className="animate-ping" opacity="0.4" />
        <circle cx="50" cy="55" r="5" fill="#ff5900" />
      </svg>
    </div>
  )
}

export function WaveformGraphic() {
  return (
    <div className="w-full h-32 flex items-center justify-center gap-1.5">
      {[16, 28, 45, 70, 52, 85, 60, 95, 75, 40, 65, 30, 18].map((h, i) => (
        <motion.div
          key={i}
          animate={{ height: [h * 0.4, h, h * 0.4] }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            delay: i * 0.1,
            ease: 'easeInOut'
          }}
          className="w-1.5 bg-gradient-to-t from-[#ff5900] via-[#ff8237] to-[#6366f1] rounded-full"
          style={{ height: h }}
        />
      ))}
    </div>
  )
}

export function RadarGraphic() {
  return (
    <div className="w-full h-32 flex items-center justify-center relative">
      <div className="w-24 h-24 rounded-full border border-dashed border-slate-300 flex items-center justify-center animate-spin" style={{ animationDuration: '20s' }}>
        <div className="w-16 h-16 rounded-full border border-orange-200 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-orange-50 border border-orange-400 flex items-center justify-center text-[#ff5900]">
            <Shield size={14} />
          </div>
        </div>
      </div>
      <div className="absolute w-2.5 h-2.5 rounded-full bg-[#ff5900] shadow-lg shadow-orange-500/50 -top-1 right-8" />
      <div className="absolute w-2 h-2 rounded-full bg-[#6366f1] shadow-lg shadow-indigo-500/50 bottom-2 left-8" />
    </div>
  )
}

// 3. Section 4 Mockups
export function LeadManagementMockup() {
  const leads = [
    { name: 'Marcus Sterling', company: 'Apex Global (B2B)', value: '$48,000', status: 'Hot Lead', tagColor: 'bg-rose-50 text-rose-600' },
    { name: 'Sarah Jenkins', company: 'Nova Retail (B2C)', value: '$64,500', status: 'Qualified', tagColor: 'bg-emerald-50 text-emerald-600' },
    { name: 'Liam Zhao', company: 'Vanguard Systems', value: '$32,000', status: 'Proposal Sent', tagColor: 'bg-orange-50 text-[#ff5900]' }
  ]

  return (
    <div className="bg-white rounded-2xl p-5 shadow-xl border border-slate-200/80 w-full font-['Poppins',sans-serif]">
      {/* Top metrics bar */}
      <div className="grid grid-cols-3 gap-3 pb-4 mb-4 border-b border-slate-100 text-center">
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <div className="text-[11px] text-slate-400 font-light">Total Pipeline</div>
          <div className="text-sm font-medium text-slate-900">$184.5k</div>
        </div>
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <div className="text-[11px] text-slate-400 font-light">Active Leads</div>
          <div className="text-sm font-medium text-[#ff5900]">92 Deals</div>
        </div>
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <div className="text-[11px] text-slate-400 font-light">Win Rate</div>
          <div className="text-sm font-medium text-emerald-600">74.8%</div>
        </div>
      </div>

      {/* Leads Rows */}
      <div className="space-y-2.5">
        {leads.map((lead, idx) => (
          <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#ff5900] to-[#ff8237] text-white font-medium text-xs flex items-center justify-center shadow-sm">
                {lead.name.charAt(0)}
              </div>
              <div>
                <div className="text-xs font-medium text-slate-900">{lead.name}</div>
                <div className="text-[11px] font-light text-slate-400">{lead.company}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-slate-900">{lead.value}</div>
              <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${lead.tagColor}`}>
                {lead.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SalesPipelineMockup() {
  const [activeMonth, setActiveMonth] = useState(3)
  const data = [
    { month: 'Jan', val: 40 },
    { month: 'Feb', val: 55 },
    { month: 'Mar', val: 75 },
    { month: 'Apr', val: 95 },
    { month: 'May', val: 68 },
    { month: 'Jun', val: 88 }
  ]

  return (
    <div className="bg-white rounded-2xl p-5 shadow-xl border border-slate-200/80 w-full relative font-['Poppins',sans-serif]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs font-medium text-slate-900">Revenue Trajectory</div>
          <div className="text-[11px] font-light text-slate-400">Quarterly growth forecasting</div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
          <TrendingUp size={13} />
          <span>+42.6% YoY</span>
        </div>
      </div>

      {/* Floating active pill */}
      <div className="absolute top-16 right-10 bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-lg text-xs font-medium flex items-center gap-1.5 z-20">
        <Sparkles size={12} className="text-orange-400" />
        <span>$48,900 Closed-Won</span>
      </div>

      {/* Bar Chart Mockup */}
      <div className="h-40 flex items-end justify-between gap-3 pt-8 pb-2 px-2">
        {data.map((item, idx) => (
          <div 
            key={idx} 
            className="flex-1 flex flex-col items-center gap-2 group cursor-pointer"
            onClick={() => setActiveMonth(idx)}
          >
            <div 
              className={`w-full rounded-t-lg transition-all duration-300 ${
                activeMonth === idx 
                  ? 'bg-gradient-to-t from-[#ff5900] to-[#ff8237] shadow-md shadow-orange-500/30' 
                  : 'bg-slate-100 group-hover:bg-slate-200'
              }`}
              style={{ height: `${item.val}%` }}
            />
            <span className={`text-[11px] font-medium ${activeMonth === idx ? 'text-[#ff5900]' : 'text-slate-400'}`}>
              {item.month}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AISalesInsightsMockup() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-xl border border-slate-200/80 w-full space-y-3.5 font-['Poppins',sans-serif]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#ff5900] text-white flex items-center justify-center shadow-sm">
            <Mic size={14} />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-900">Post-Call AI Summary</div>
            <div className="text-[10px] font-light text-slate-400">Call with CloudScale Enterprise</div>
          </div>
        </div>
        <span className="bg-emerald-50 text-emerald-600 font-medium text-[10px] px-2 py-0.5 rounded-full">
          91% Sentiment
        </span>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] font-medium text-slate-600 uppercase tracking-wider">Automated Next Steps</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 font-light">
            <CheckCircle2 size={14} className="text-[#ff5900] shrink-0" />
            <span>Generate customized 25-Seat Pro quote with 18% tax</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 font-light">
            <CheckCircle2 size={14} className="text-[#ff5900] shrink-0" />
            <span>Assign Support Lead role for technical security review</span>
          </div>
        </div>
      </div>
    </div>
  )
}
