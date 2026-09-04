import React from 'react'
import { Link } from 'react-router-dom'
import { FlowaLogo } from './FlowaNavbar'
import { Twitter, Linkedin, Github, Disc as Discord, ArrowUpRight, Sparkles } from 'lucide-react'

export default function FlowaFooter() {
  return (
    <footer className="relative bg-white pt-20 pb-12 overflow-hidden border-t border-slate-100 font-['Poppins',sans-serif]">
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-slate-200/80">
          {/* Brand Column */}
          <div className="md:col-span-4 space-y-4">
            <FlowaLogo />
            <p className="text-slate-500 font-light text-sm leading-relaxed max-w-sm">
              Empowering enterprise sales, support, and retail teams with unified RBAC pipelines, automated PDF invoicing, and real-time conversation intelligence.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a href="#" className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-[#ff5900] hover:bg-orange-50 transition-colors">
                <Twitter size={16} />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-[#ff5900] hover:bg-orange-50 transition-colors">
                <Linkedin size={16} />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-[#ff5900] hover:bg-orange-50 transition-colors">
                <Github size={16} />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-[#ff5900] hover:bg-orange-50 transition-colors">
                <Discord size={16} />
              </a>
            </div>
          </div>

          {/* Nav Columns */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <h4 className="font-medium text-slate-900 text-sm tracking-tight mb-4">Platform</h4>
              <ul className="space-y-2.5 text-sm text-slate-500 font-light list-none p-0 m-0">
                <li><Link to="/features" className="hover:text-[#ff5900] transition-colors no-underline text-slate-500">Lead Intelligence</Link></li>
                <li><Link to="/features" className="hover:text-[#ff5900] transition-colors no-underline text-slate-500">Sales Opportunities</Link></li>
                <li><Link to="/features" className="hover:text-[#ff5900] transition-colors no-underline text-slate-500">Quotes & PDF Billing</Link></li>
                <li><Link to="/pricing" className="hover:text-[#ff5900] transition-colors no-underline text-slate-500">Pricing Matrix</Link></li>
                <li><a href="#" className="hover:text-[#ff5900] transition-colors no-underline text-slate-500 inline-flex items-center gap-1">Fast REST API <ArrowUpRight size={12}/></a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-slate-900 text-sm tracking-tight mb-4">Enterprise</h4>
              <ul className="space-y-2.5 text-sm text-slate-500 font-light list-none p-0 m-0">
                <li><Link to="/about" className="hover:text-[#ff5900] transition-colors no-underline text-slate-500">About XOWIQ</Link></li>
                <li><Link to="/contact" className="hover:text-[#ff5900] transition-colors no-underline text-slate-500">Book Enterprise Demo</Link></li>
                <li><a href="#" className="hover:text-[#ff5900] transition-colors no-underline text-slate-500">5-Role RBAC Security</a></li>
                <li><a href="#" className="hover:text-[#ff5900] transition-colors no-underline text-slate-500 inline-flex items-center gap-1.5">Careers <span className="text-[10px] font-medium bg-orange-100 text-[#ff5900] px-1.5 py-0.5 rounded-full">Hiring</span></a></li>
                <li><a href="#" className="hover:text-[#ff5900] transition-colors no-underline text-slate-500">Security & GDPR</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-slate-900 text-sm tracking-tight mb-4">Resources</h4>
              <ul className="space-y-2.5 text-sm text-slate-500 font-light list-none p-0 m-0">
                <li><a href="#" className="hover:text-[#ff5900] transition-colors no-underline text-slate-500">Developer SDK</a></li>
                <li><a href="#" className="hover:text-[#ff5900] transition-colors no-underline text-slate-500">PostgreSQL Schema</a></li>
                <li><a href="#" className="hover:text-[#ff5900] transition-colors no-underline text-slate-500">System Status</a></li>
                <li><a href="#" className="hover:text-[#ff5900] transition-colors no-underline text-slate-500">Audit Logs</a></li>
                <li><a href="#" className="hover:text-[#ff5900] transition-colors no-underline text-slate-500">Support Desk</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-light text-slate-400">
          <p className="m-0">© {new Date().getFullYear()} XOWIQ CRM Technologies Inc. All rights reserved.</p>
          <div className="flex items-center gap-6 font-light">
            <a href="#" className="hover:text-slate-600 transition-colors no-underline text-slate-400">Privacy Policy</a>
            <a href="#" className="hover:text-slate-600 transition-colors no-underline text-slate-400">Terms of Service</a>
            <a href="#" className="hover:text-slate-600 transition-colors no-underline text-slate-400">Security SLA</a>
          </div>
        </div>
      </div>

      {/* Massive subtle background watermark text */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none select-none absolute -bottom-10 left-1/2 -translate-x-1/2 font-['Poppins',sans-serif] font-thin text-[20vw] leading-none text-slate-900/[0.03] tracking-tighter uppercase"
      >
        XOWIQ
      </div>
    </footer>
  )
}
