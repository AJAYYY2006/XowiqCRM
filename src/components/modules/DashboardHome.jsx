import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import toast from 'react-hot-toast'
import ExecutiveSuperAdminDashboard from '../dashboard/ExecutiveSuperAdminDashboard'

export default function DashboardHome({ session, profile }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [kpiData, setKpiData] = useState({})
  const [loading, setLoading] = useState(true)
  const dashboardRef = useRef(null)

  const companyName = profile?.company_name || session?.user?.user_metadata?.companyName || ''

  useEffect(() => {
    fetchTeamAndKPIs()
  }, [session, profile])

  const fetchTeamAndKPIs = async () => {
    try {
      setLoading(true)
      if (!session?.user?.id) return

      // Fetch team users
      let { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, name, email, role, created_at, company_name, company_type, created_by_admin_id')
        .eq('created_by_admin_id', session.user.id)

      if (!allProfiles || allProfiles.length === 0) {
        const legacyRes = await supabase
          .from('profiles')
          .select('id, name, email, role, created_at, company_name, company_type, created_by_admin_id')
          .eq('created_by', session.user.id)
        allProfiles = legacyRes.data || []
      }

      if (!allProfiles || allProfiles.length === 0) {
        const fallback = await supabase
          .from('profiles')
          .select('id, name, email, role, created_at, company_name, company_type')
          .ilike('company_name', companyName ? `%${companyName}%` : '%')
          .neq('id', session.user.id)
        allProfiles = fallback.data || []
      }

      const teamUsers = (allProfiles || []).filter(p =>
        ['user', 'manager', 'admin', 'b2c', 'agent'].includes((p.role || '').toLowerCase())
      )

      setUsers(teamUsers)

      // Fetch KPIs for team
      const kpiMap = {}
      await Promise.all(teamUsers.map(async (u) => {
        const [leadsRes, customersRes, dealsRes, tasksRes, ticketsRes, activitiesRes] = await Promise.all([
          supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', u.id),
          supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', u.id).eq('status', 'converted'),
          supabase.from('opportunities').select('amount').eq('user_id', u.id).eq('stage', 'closed'),
          supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', u.id).eq('status', 'Completed'),
          supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('user_id', u.id).eq('status', 'resolved'),
          supabase.from('activities').select('created_at').eq('user_id', u.id).order('created_at', { ascending: false }).limit(1),
        ])

        const deals = dealsRes.data || []
        const dealsCount = deals.length
        const dealsValue = deals.reduce((sum, d) => sum + Number(d.amount || 0), 0)

        kpiMap[u.id] = {
          leads: leadsRes.count || 0,
          customers: customersRes.count || 0,
          dealsCount: dealsCount,
          dealsValue: dealsValue,
          tasks: tasksRes.count || 0,
          tickets: ticketsRes.count || 0,
          lastActive: activitiesRes.data?.[0]?.created_at || null
        }
      }))

      setKpiData(kpiMap)
    } catch (err) {
      console.warn('Dashboard data fetch notice:', err)
    } finally {
      setLoading(false)
    }
  }

  const exportPDF = async () => {
    const toastId = toast.loading('Generating Executive PDF Report...')
    try {
      if (!dashboardRef.current) return
      const canvas = await html2canvas(dashboardRef.current, { scale: 2, backgroundColor: '#f8fafc', logging: false })
      const imgData = canvas.toDataURL('image/jpeg', 1.0)
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`XOWIQ_Executive_Report_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('Report downloaded successfully!', { id: toastId })
    } catch (error) {
      toast.error('PDF export failed.', { id: toastId })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-400 font-light text-sm">
        <div className="w-6 h-6 border-2 border-[#ff5900] border-t-transparent rounded-full animate-spin mr-3" />
        <span>Loading Executive Overview...</span>
      </div>
    )
  }

  return (
    <div ref={dashboardRef} className="font-['Poppins',sans-serif] pb-10 max-w-full overflow-x-hidden">
      <ExecutiveSuperAdminDashboard
        session={session}
        profile={profile}
        users={users}
        kpiData={kpiData}
        onExportPDF={exportPDF}
        currency={profile?.currency || '$'}
      />
    </div>
  )
}
