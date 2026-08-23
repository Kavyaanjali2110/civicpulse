import React from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HardHat,
  TrendingUp,
  Percent,
  Timer,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export default function WorkflowKPIs({ workflowStats }) {
  if (!workflowStats) return null;

  return (
    <div className="space-y-4">
      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. SLA Compliance */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              SLA Compliance
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-800">
            {workflowStats.sla_compliance_percentage}%
          </div>
          <p className="text-[11px] text-slate-500">
            {workflowStats.resolved_complaints} of {workflowStats.total_complaints} tickets resolved on-time
          </p>
        </div>

        {/* 2. Avg Resolution Turnaround */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Avg Resolution Time
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center">
              <Timer className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-teal-800">
            {workflowStats.average_resolution_time_hours} hrs
          </div>
          <p className="text-[11px] text-slate-500">
            From intake to verified completion
          </p>
        </div>

        {/* 3. Assigned vs Unassigned */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Active Crew Dispatch
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center">
              <HardHat className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-blue-800">
              {workflowStats.assigned_complaints}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              / {workflowStats.unassigned_complaints} unassigned
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            {workflowStats.in_progress_complaints} crews actively on-site
          </p>
        </div>

        {/* 4. Overdue / At-Risk */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              SLA Risk Alerts
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-rose-700">
              {workflowStats.overdue_complaints}
            </span>
            <span className="text-xs text-amber-700 font-medium">
              ({workflowStats.at_risk_complaints} at risk)
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Requires supervisor escalation
          </p>
        </div>
      </div>

      {/* Crew Workload Roster */}
      {workflowStats.crew_workload && workflowStats.crew_workload.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
              <HardHat className="w-4 h-4 text-teal-700" />
              <span>Municipal Field Crew Dispatch Roster</span>
            </div>
            <span className="text-[11px] text-slate-500">
              {workflowStats.crew_workload.length} Municipal Units Registered
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {workflowStats.crew_workload.map((crew) => (
              <div
                key={crew.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between space-y-2 hover:border-teal-300 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-900 truncate pr-1">{crew.name}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                        crew.current_status === 'AVAILABLE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : crew.current_status === 'ON_DUTY'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {crew.current_status}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {crew.department_name} • {crew.ward_name || `Ward ${crew.ward_id}`}
                  </div>
                  <div className="text-[11px] text-slate-700 font-medium mt-1">
                    Leader: <strong>{crew.crew_leader}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] pt-2 border-t border-slate-200 text-slate-600">
                  <span>Active Load: <strong className="text-teal-800 font-bold">{crew.active_jobs}</strong></span>
                  <span>Resolved: <strong className="text-emerald-700 font-bold">{crew.completed_jobs}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
