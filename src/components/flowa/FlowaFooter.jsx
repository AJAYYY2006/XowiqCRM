import React from 'react'
import { Link } from 'react-router-dom'
import { FlowaLogo } from './FlowaNavbar'
import { Twitter, Linkedin, Github, Disc as Discord, ArrowUpRight } from 'lucide-react'

export default function FlowaFooter() {
  return (
    <footer className="relative bg-white pt-20 pb-12 overflow-hidden border-t border-slate-100">
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-slate-200/80">
          {/* Brand Column */}
          <div className="md:col-span-4 space-y-4">
            <FlowaLogo />
            <p className="text-slate-500 text-sm leading-relaxed max-w-sm">
              Transforming B2B sales teams with intelligent conversation intelligence, automatic pipeline sync, and real-time revenue predictability.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a href="#" className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <Twitter size={16} />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <Linkedin size={16} />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <Github size={16} />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <Discord size={16} />
              </a>
            </div>
          </div>

          {/* Nav Columns */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <h4 className="font-semibold text-slate-900 text-sm tracking-tight mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm text-slate-500 list-none p-0 m-0">
                <li><Link to="/features" className="hover:text-blue-600 transition-colors no-underline text-slate-500">Overview</Link></li>
                <li><Link to="/features" className="hover:text-blue-600 transition-colors no-underline text-slate-500">Lead Intelligence</Link></li>
                <li><Link to="/features" className="hover:text-blue-600 transition-colors no-underline text-slate-500">Sales Pipeline</Link></li>
                <li><Link to="/pricing" className="hover:text-blue-600 transition-colors no-underline text-slate-500">Pricing Plans</Link></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors no-underline text-slate-500 inline-flex items-center gap-1">Integrations <ArrowUpRight size={12}/></a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 text-sm tracking-tight mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm text-slate-500 list-none p-0 m-0">
                <li><Link to="/about" className="hover:text-blue-600 transition-colors no-underline text-slate-500">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-blue-600 transition-colors no-underline text-slate-500">Contact Sales</Link></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors no-underline text-slate-500">Customer Stories</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors no-underline text-slate-500 inline-flex items-center gap-1.5">Careers <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Hiring</span></a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors no-underline text-slate-500">Press & Media</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 text-sm tracking-tight mb-4">Resources</h4>
              <ul className="space-y-2.5 text-sm text-slate-500 list-none p-0 m-0">
                <li><a href="#" className="hover:text-blue-600 transition-colors no-underline text-slate-500">Documentation</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors no-underline text-slate-500">API Reference</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors no-underline text-slate-500">System Status</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors no-underline text-slate-500">Security & GDPR</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors no-underline text-slate-500">Community Forum</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p className="m-0">© {new Date().getFullYear()} Flowa Technologies Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-slate-600 transition-colors no-underline text-slate-400">Privacy Policy</a>
            <a href="#" className="hover:text-slate-600 transition-colors no-underline text-slate-400">Terms of Service</a>
            <a href="#" className="hover:text-slate-600 transition-colors no-underline text-slate-400">Security</a>
          </div>
        </div>
      </div>

      {/* Massive subtle background watermark text */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none select-none absolute -bottom-10 left-1/2 -translate-x-1/2 font-['Outfit',sans-serif] font-black text-[22vw] leading-none text-slate-900/[0.03] tracking-tighter"
      >
        Flowa
      </div>
    </footer>
  )
}
