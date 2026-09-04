import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Info,
  Filter,
  ChevronDown,
  Maximize2,
  Sparkles,
  ArrowRight,
  Users,
  Shield,
  Search,
  Activity,
  CheckCircle2,
  Calendar,
  Layers,
  FileText,
  DollarSign,
  Zap,
  X
} from 'lucide-react'

export default function ExecutiveSuperAdminDashboard({
  session,
  profile,
  users = [],
  kpiData = {},
  onExportPDF,
  currency = '$'
}) {
  // Active month state for Analytics Chart
  const [selectedMonth, setSelectedMonth] = useState('Jun')
  const [selectedTimeRange, setSelectedTimeRange] = useState('Last Year')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [hoveredCell, setHoveredCell] = useState(null)
  const [detailModal, setDetailModal] = useState(null)
  const [searchUser, setSearchUser] = useState('')

  // Analytics monthly data
  const monthlyAnalytics = [
    { month: 'Jan', revenue: 2150, convRate: '7.2%', height: 48 },
    { month: 'Feb', revenue: 1890, convRate: '6.8%', height: 42 },
    { month: 'Mar', revenue: 3200, convRate: '9.4%', height: 75 },
    { month: 'Apr', revenue: 2650, convRate: '8.1%', height: 60 },
    { month: 'May', revenue: 2400, convRate: '7.9%', height: 55 },
    { month: 'Jun', revenue: 2766, convRate: '8.7%', height: 68 }, // highlighted in screenshot
    { month: 'Jul', revenue: 2300, convRate: '7.5%', height: 52 },
    { month: 'Aug', revenue: 2950, convRate: '8.9%', height: 65 },
    { month: 'Sept', revenue: 2540, convRate: '8.0%', height: 58 },
    { month: 'Okt', revenue: 2100, convRate: '7.1%', height: 46 },
    { month: 'Nov', revenue: 3100, convRate: '9.1%', height: 72 },
    { month: 'Dec', revenue: 3450, convRate: '9.8%', height: 82 },
  ]

  const activeAnalytics = monthlyAnalytics.find(m => m.month === selectedMonth) || monthlyAnalytics[5]

  // Visit by time heatmap data matrix (3 time slots x 7 days)
  // Intensity levels: 0 (light gray), 1 (light peach), 2 (medium orange), 3 (vibrant dark orange)
  const heatmapData = [
    {
      timeSlot: '12 AM- 8 AM',
      days: [
        { day: 'Mon', level: 2, count: '6,420 visits' },
        { day: 'Tue', level: 0, count: '1,200 visits' },
        { day: 'Wed', level: 1, count: '3,850 visits' },
        { day: 'Thu', level: 1, count: '4,100 visits' },
        { day: 'Fri', level: 0, count: '1,560 visits' },
        { day: 'Sat', level: 1, count: '3,200 visits' },
        { day: 'Sun', level: 0, count: '1,100 visits' },
      ]
    },
    {
      timeSlot: '8 AM - 4 PM',
      days: [
        { day: 'Mon', level: 3, count: '14,890 visits' },
        { day: 'Tue', level: 1, count: '4,650 visits' },
        { day: 'Wed', level: 3, count: '15,200 visits' },
        { day: 'Thu', level: 2, count: '8,400 visits' },
        { day: 'Fri', level: 1, count: '5,100 visits' },
        { day: 'Sat', level: 2, count: '7,800 visits' },
        { day: 'Sun', level: 3, count: '16,400 visits' },
      ]
    },
    {
      timeSlot: '4 PM - 12 AM',
      days: [
        { day: 'Mon', level: 1, count: '4,200 visits' },
        { day: 'Tue', level: 2, count: '7,900 visits' },
        { day: 'Wed', level: 0, count: '1,800 visits' },
        { day: 'Thu', level: 0, count: '2,100 visits' },
        { day: 'Fri', level: 3, count: '12,650 visits' },
        { day: 'Sat', level: 1, count: '4,800 visits' },
        { day: 'Sun', level: 2, count: '8,900 visits' },
      ]
    }
  ]

  const getHeatmapColor = (level) => {
    switch (level) {
      case 3:
        return 'bg-[#ff5900] text-white shadow-sm' // 10,000+
      case 2:
        return 'bg-[#fdba74] text-slate-800' // medium orange
      case 1:
        return 'bg-[#fed7aa]/70 text-slate-700' // light peach
      case 0:
      default:
        return 'bg-[#f1f5f9] text-slate-400' // subtle gray
    }
  }

  // Filtered team users for bottom table
  const filteredUsers = (users || []).filter(u =>
    (u.name || '').toLowerCase().includes(searchUser.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchUser.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(searchUser.toLowerCase())
  )

  return (
    <div className="space-y-6 font-['Poppins',sans-serif] text-slate-900 selection:bg-[#ff5900] selection:text-white">
      {/* SVG Definitions for Striped Patterns */}
      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          {/* Light Gray Diagonal Stripe Pattern */}
          <pattern id="diag-stripe-gray" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="#f8fafc" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="#cbd5e1" strokeWidth="2.5" />
          </pattern>

          {/* Orange Diagonal Stripe Pattern */}
          <pattern id="diag-stripe-orange" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" fill="#ff5900" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="#ea580c" strokeWidth="2.5" />
          </pattern>
        </defs>
      </svg>

      {/* =========================================================================
          ROW 1: TOP 4 CONNECTED KPI CARDS
          ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        
        {/* CARD 1: ACTIVE SALES */}
        <div className="p-6 flex flex-col justify-between hover:bg-slate-50/50 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <span>Active Sales</span>
                <Info size={13} className="text-slate-400 cursor-help" />
              </div>
            </div>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="text-2xl sm:text-3xl font-medium text-slate-950 tracking-tight">
                  $24,064
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-light">
                  <span>vs last month</span>
                  <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium text-[11px]">
                    <TrendingUp size={11} />
                    <span>12%</span>
                  </span>
                </div>
              </div>

              {/* Graphic: 3 Vertical Rounded Orange Bars */}
              <div className="flex items-end gap-1.5 h-12 pb-1">
                <div className="w-2.5 h-6 bg-[#ff5900] rounded-full" />
                <div className="w-2.5 h-9 bg-[#ff5900] rounded-full" />
                <div className="w-2.5 h-12 bg-[#ff5900] rounded-full" />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => setDetailModal({ title: 'Active Sales', value: '$24,064', desc: '184 active enterprise pipeline deals across all 5 assigned sales channels.' })}
              className="text-xs font-medium text-slate-800 hover:text-[#ff5900] flex items-center gap-1 transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              <span>See Details</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* CARD 2: PRODUCT REVENUE */}
        <div className="p-6 flex flex-col justify-between hover:bg-slate-50/50 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <span>Product Revenue</span>
                <Info size={13} className="text-slate-400 cursor-help" />
              </div>
            </div>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="text-2xl sm:text-3xl font-medium text-slate-950 tracking-tight">
                  $15,490
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-light">
                  <span>vs last month</span>
                  <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium text-[11px]">
                    <TrendingUp size={11} />
                    <span>9%</span>
                  </span>
                </div>
              </div>

              {/* Graphic: Orange Zig-zag Sparkline */}
              <div className="w-16 h-10 flex items-center justify-center">
                <svg width="64" height="32" viewBox="0 0 64 32" fill="none">
                  <path
                    d="M2 24L18 20L32 26L48 10L62 6"
                    stroke="#ff5900"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => setDetailModal({ title: 'Product Revenue', value: '$15,490', desc: 'Direct revenue accrued from paid subscriptions and automated PDF invoices.' })}
              className="text-xs font-medium text-slate-800 hover:text-[#ff5900] flex items-center gap-1 transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              <span>See Details</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* CARD 3: PRODUCT SOLD */}
        <div className="p-6 flex flex-col justify-between hover:bg-slate-50/50 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <span>Product Sold</span>
                <Info size={13} className="text-slate-400 cursor-help" />
              </div>
            </div>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="text-2xl sm:text-3xl font-medium text-slate-950 tracking-tight">
                  2,355
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-light">
                  <span>vs last month</span>
                  <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium text-[11px]">
                    <TrendingUp size={11} />
                    <span>7%</span>
                  </span>
                </div>
              </div>

              {/* Graphic: Orange Circular Segment Arc */}
              <div className="w-12 h-12 flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 40 40">
                  <circle
                    cx="20"
                    cy="20"
                    r="15"
                    fill="none"
                    stroke="#ff5900"
                    strokeWidth="4"
                    strokeDasharray="65 30"
                    strokeLinecap="round"
                    transform="rotate(-45 20 20)"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => setDetailModal({ title: 'Product Sold', value: '2,355 Units', desc: 'Total SaaS enterprise seats, addon packages, and service plans activated.' })}
              className="text-xs font-medium text-slate-800 hover:text-[#ff5900] flex items-center gap-1 transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              <span>See Details</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* CARD 4: CONVERSION RATE */}
        <div className="p-6 flex flex-col justify-between hover:bg-slate-50/50 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <span>Conversion Rate</span>
                <Info size={13} className="text-slate-400 cursor-help" />
              </div>
            </div>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="text-2xl sm:text-3xl font-medium text-slate-950 tracking-tight">
                  12,5%
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-light">
                  <span>vs last month</span>
                  <span className="inline-flex items-center gap-0.5 bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-medium text-[11px]">
                    <TrendingDown size={11} />
                    <span>2%</span>
                  </span>
                </div>
              </div>

              {/* Graphic: 5-bar Soundwave Equalizer */}
              <div className="flex items-center gap-1 h-10">
                <div className="w-1.5 h-4 bg-[#ff5900] rounded-full" />
                <div className="w-1.5 h-8 bg-[#ff5900] rounded-full" />
                <div className="w-1.5 h-10 bg-[#ff5900] rounded-full" />
                <div className="w-1.5 h-7 bg-[#ff5900] rounded-full" />
                <div className="w-1.5 h-5 bg-[#ff5900] rounded-full" />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => setDetailModal({ title: 'Conversion Rate', value: '12.5%', desc: 'Visitor to demo-booking and qualified lead conversion ratio this quarter.' })}
              className="text-xs font-medium text-slate-800 hover:text-[#ff5900] flex items-center gap-1 transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              <span>See Details</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

      </div>

      {/* =========================================================================
          ROW 2: MIDDLE SECTION (SALES PERFORMANCE GAUGE & ANALYTICS STRIPED CHART)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT: SALES PERFORMANCE GAUGE (33% width) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
              <span>Sales Performance</span>
              <Info size={13} className="text-slate-400 cursor-help" />
            </div>

            {/* Semi-Circle Gauge Visual */}
            <div className="mt-8 flex flex-col items-center justify-center relative">
              <svg width="220" height="125" viewBox="0 0 220 125" className="overflow-visible">
                {/* Outer Dashed / Striped Tick Track */}
                <path
                  d="M 20 115 A 90 90 0 0 1 200 115"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="10"
                  strokeDasharray="4 6"
                  strokeLinecap="round"
                />

                {/* Inner Orange Progress Arc (82%) */}
                <path
                  d="M 20 115 A 90 90 0 0 1 180 60"
                  fill="none"
                  stroke="#ff5900"
                  strokeWidth="12"
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>

              {/* Center Score Indicator */}
              <div className="text-center -mt-16">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-4xl font-medium text-slate-950 tracking-tight">82</span>
                  <span className="bg-emerald-50 text-emerald-600 text-[11px] font-medium px-1.5 py-0.5 rounded-full">
                    +1
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-light mt-0.5">of 100 points</div>
              </div>
            </div>

            {/* Motivational Note Card */}
            <div className="mt-8 p-4 rounded-2xl bg-orange-50/40 border border-orange-100/80 space-y-1">
              <div className="text-xs font-medium text-slate-900 flex items-center gap-1.5">
                <span>You're team is great!</span>
                <Sparkles size={13} className="text-[#ff5900]" />
              </div>
              <p className="text-[11px] text-slate-500 font-light leading-relaxed m-0">
                The team is performing well above average, meeting or exceeding targets in several areas.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => toast.success('Target breakdown sent to sales managers.')}
              className="text-xs font-medium text-slate-800 hover:text-[#ff5900] flex items-center gap-1 transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              <span>Improve Your Score</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* RIGHT: ANALYTICS STRIPED BAR CHART (67% width) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between relative">
          <div>
            {/* Header Controls */}
            <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                <span>Analytics</span>
                <Info size={13} className="text-slate-400 cursor-help" />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Filter size={13} />
                  <span>Filter</span>
                </button>

                <div className="relative">
                  <select
                    value={selectedTimeRange}
                    onChange={(e) => setSelectedTimeRange(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 appearance-none pr-7 shadow-sm cursor-pointer focus:outline-none"
                  >
                    <option value="Last Year">Last Year</option>
                    <option value="Last 6 Months">Last 6 Months</option>
                    <option value="This Year">This Year</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <button
                  onClick={() => toast.success('Fullscreen mode toggled')}
                  className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center shadow-sm transition-colors cursor-pointer"
                >
                  <Maximize2 size={13} />
                </button>
              </div>
            </div>

            {/* Main Chart Area */}
            <div className="relative pt-6 pb-2">
              {/* Y-Axis Guidelines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 text-[11px] text-slate-400 font-light">
                <div className="border-b border-dashed border-slate-100 flex items-center justify-between">
                  <span>$4K</span>
                </div>
                <div className="border-b border-dashed border-slate-100 flex items-center justify-between">
                  <span>$3K</span>
                </div>
                <div className="border-b border-dashed border-slate-100 flex items-center justify-between">
                  <span>$2K</span>
                </div>
                <div className="border-b border-dashed border-slate-100 flex items-center justify-between">
                  <span>$1K</span>
                </div>
                <div className="border-b border-slate-200 flex items-center justify-between">
                  <span>0</span>
                </div>
              </div>

              {/* Bars Grid */}
              <div className="relative h-48 flex items-end justify-between pl-8 pr-2 z-10 gap-2 sm:gap-3">
                {monthlyAnalytics.map((item) => {
                  const isSelected = item.month === selectedMonth
                  return (
                    <div
                      key={item.month}
                      onClick={() => setSelectedMonth(item.month)}
                      className="flex-1 flex flex-col items-center cursor-pointer group relative"
                    >
                      {/* Active Indicator Line & Tooltip Card on Selected Month */}
                      {isSelected && (
                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center">
                          <div className="bg-slate-900 text-white rounded-xl px-3 py-2 shadow-2xl text-[11px] space-y-0.5 whitespace-nowrap border border-slate-800">
                            <div className="font-light text-slate-400">{item.month}, 2024</div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400">Revenue</span>
                              <span className="font-medium text-white">${item.revenue.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400">Conv. Rate</span>
                              <span className="font-medium text-white">{item.convRate}</span>
                            </div>
                          </div>
                          {/* Marker dot on bar top */}
                          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5900] border-2 border-white shadow-md mt-1" />
                        </div>
                      )}

                      {/* Bar Body with Diagonal Pattern */}
                      <div
                        style={{ height: `${item.height}%` }}
                        className={`w-full max-w-[28px] rounded-t-xl transition-all duration-300 relative overflow-hidden ${
                          isSelected
                            ? 'bg-[#ff5900] shadow-lg shadow-orange-500/20 scale-y-100 ring-2 ring-[#ff5900]/40'
                            : 'hover:opacity-80'
                        }`}
                      >
                        {/* Diagonal Candy-Stripe Pattern Fill */}
                        <svg className="w-full h-full">
                          <rect
                            width="100%"
                            height="100%"
                            fill={isSelected ? 'url(#diag-stripe-orange)' : 'url(#diag-stripe-gray)'}
                          />
                        </svg>
                      </div>

                      {/* X-Axis Month Label */}
                      <span
                        className={`mt-3 text-[11px] transition-colors ${
                          isSelected ? 'font-medium text-slate-950' : 'text-slate-400 group-hover:text-slate-700'
                        }`}
                      >
                        {item.month}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* =========================================================================
          ROW 3: BOTTOM SECTION (VISIT BY TIME HEATMAP & TOTAL VISIT DONUT BREAKDOWN)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT: VISIT BY TIME HEATMAP (58% width) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            {/* Header with Intensity Legend */}
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
              <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                <span>Visit by Time</span>
                <Info size={13} className="text-slate-400 cursor-help" />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 font-light">
                <span>0</span>
                <div className="flex items-center gap-1">
                  <span className="w-4 h-2.5 rounded-full bg-[#f1f5f9]" />
                  <span className="w-4 h-2.5 rounded-full bg-[#fed7aa]" />
                  <span className="w-4 h-2.5 rounded-full bg-[#fdba74]" />
                  <span className="w-4 h-2.5 rounded-full bg-[#ff5900]" />
                </div>
                <span>10,000+</span>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-8 gap-2 mb-3 text-center text-xs text-slate-400 font-light">
              <div className="text-left text-[11px]">Time</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
              <div>Sun</div>
            </div>

            {/* Matrix Rows */}
            <div className="space-y-3">
              {heatmapData.map((row, rIdx) => (
                <div key={rIdx} className="grid grid-cols-8 gap-2 items-center">
                  <div className="text-[11px] text-slate-500 font-light whitespace-nowrap">
                    {row.timeSlot}
                  </div>

                  {row.days.map((cell, cIdx) => (
                    <div
                      key={cIdx}
                      onMouseEnter={() => setHoveredCell(`${row.timeSlot} on ${cell.day}: ${cell.count}`)}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`h-7 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center hover:scale-105 ${getHeatmapColor(
                        cell.level
                      )}`}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Hover Tooltip display */}
            <div className="mt-4 text-xs text-slate-500 font-light h-5">
              {hoveredCell ? (
                <span className="text-[#ff5900] font-medium">{hoveredCell}</span>
              ) : (
                <span>Hover over any time block to view live traffic volume.</span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: TOTAL VISIT DONUT BREAKDOWN (42% width) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800 mb-4">
              <span>Total Visit</span>
              <Info size={13} className="text-slate-400 cursor-help" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* Left Column: Number & Breakdown List */}
              <div className="space-y-4">
                <div>
                  <div className="text-3xl font-medium text-slate-950 tracking-tight">
                    191,886
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500 font-light">
                    <span>vs last month</span>
                    <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium text-[11px]">
                      <TrendingUp size={11} />
                      <span>8.5%</span>
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ff5900]" />
                      <span className="text-slate-700 font-medium">Mobile</span>
                    </div>
                    <span className="font-medium text-slate-900">115,132</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#fed7aa]" />
                      <span className="text-slate-500 font-light">Website</span>
                    </div>
                    <span className="font-medium text-slate-900">76,754</span>
                  </div>
                </div>
              </div>

              {/* Right Column: 2-Tone Donut Pie Chart with 60% & 40% Badges */}
              <div className="relative flex items-center justify-center">
                <svg width="150" height="150" viewBox="0 0 150 150">
                  {/* Website Slice: 40% (Soft Peach #fed7aa) */}
                  <circle
                    cx="75"
                    cy="75"
                    r="52"
                    fill="none"
                    stroke="#fed7aa"
                    strokeWidth="24"
                    strokeDasharray="130 327"
                    strokeDashoffset="-196"
                    className="transition-all duration-700"
                  />

                  {/* Mobile Slice: 60% (Sunset Orange #ff5900) */}
                  <circle
                    cx="75"
                    cy="75"
                    r="52"
                    fill="none"
                    stroke="#ff5900"
                    strokeWidth="24"
                    strokeDasharray="196 327"
                    strokeDashoffset="0"
                    className="transition-all duration-700"
                  />
                </svg>

                {/* 40% Badge Callout (Top-Right) */}
                <div className="absolute top-2 right-2 bg-white px-2 py-0.5 rounded-full text-[11px] font-medium text-slate-800 shadow-md border border-slate-100">
                  40%
                </div>

                {/* 60% Badge Callout (Bottom-Left) */}
                <div className="absolute bottom-2 left-2 bg-white px-2 py-0.5 rounded-full text-[11px] font-medium text-slate-800 shadow-md border border-slate-100">
                  60%
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* =========================================================================
          ROW 4: SUPER ADMIN TEAM PERFORMANCE & CRM WORKSPACE MONITOR (MORE ITEMS)
          ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-medium text-slate-950 m-0">Team Role & KPI Performance Stream</h3>
            <p className="text-xs text-slate-500 font-light mt-0.5">Real-time breakdown of assigned leads, deals won, and customer service tasks.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff & managers..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs font-light text-slate-800 focus:outline-none focus:border-[#ff5900]"
              />
            </div>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-light space-y-2">
            <Users size={32} className="mx-auto text-slate-300" />
            <div>No team members found matching your search.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-medium uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-medium">Team Member</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Leads Assigned</th>
                  <th className="pb-3 font-medium">Deals Won</th>
                  <th className="pb-3 font-medium">Closed Value</th>
                  <th className="pb-3 font-medium">Tasks Resolved</th>
                  <th className="pb-3 font-medium">Tickets</th>
                  <th className="pb-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-light">
                {filteredUsers.map((u) => {
                  const kpi = kpiData[u.id] || {}
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#ff5900] to-amber-400 text-white flex items-center justify-center font-medium text-xs">
                            {u.name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{u.name || 'Team User'}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-orange-50 text-[#ff5900] uppercase tracking-wide">
                          {u.role || 'viewer'}
                        </span>
                      </td>

                      <td className="py-3.5 font-medium text-slate-800">{kpi.leads ?? 14}</td>
                      <td className="py-3.5 font-medium text-emerald-600">{kpi.dealsCount ?? 6}</td>
                      <td className="py-3.5 font-medium text-slate-900">{currency}{(kpi.dealsValue || 38500).toLocaleString()}</td>
                      <td className="py-3.5 text-slate-600">{kpi.tasks ?? 19}</td>
                      <td className="py-3.5 text-slate-600">{kpi.tickets ?? 3}</td>

                      <td className="py-3.5 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                          <CheckCircle2 size={12} />
                          <span>Active</span>
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#ff5900] flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <h3 className="text-base font-medium text-slate-950 m-0">{detailModal.title}</h3>
                </div>
                <button
                  onClick={() => setDetailModal(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer border-none"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="text-3xl font-medium text-slate-950">
                {detailModal.value}
              </div>

              <p className="text-xs text-slate-600 font-light leading-relaxed">
                {detailModal.desc}
              </p>

              <div className="pt-2">
                <button
                  onClick={() => setDetailModal(null)}
                  className="w-full py-2.5 rounded-full bg-[#ff5900] hover:bg-[#e04f00] text-white font-medium text-xs shadow-lg shadow-orange-500/25 cursor-pointer border-none transition-all"
                >
                  Close Insights
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
