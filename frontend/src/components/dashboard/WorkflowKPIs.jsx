import React, { useState } from 'react';
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
  ArrowUpRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function WorkflowKPIs({ workflowStats }) {
  const [showCrewRoster, setShowCrewRoster] = useState(false);

  if (!workflowStats) return null;

  const totalCrews = workflowStats.crew_workload?.length || 0;
  const availableCrews = workflowStats.crew_workload?.filter(c => c.current_status === 'AVAILABLE').length || 0;
  const onDutyCrews = workflowStats.crew_workload?.filter(c => c.current_status === 'ON_DUTY').length || 0;

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

      {/* Crew Workload Roster with Compact Default & Expand Toggle */}
      {totalCrews > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-card overflow-hidden transition-all">
          <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <HardHat className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    Municipal Field Crew Dispatch Summary
                  </span>
                  <span className="px-2 py-0.2 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold">
                    {totalCrews} Units Registered
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-emerald-700 font-semibold">{availableCrews} Available</span>
                  <span>•</span>
                  <span className="text-blue-700 font-semibold">{onDutyCrews} On-Duty</span>
                  <span>•</span>
                  <span>{workflowStats.in_progress_complaints || 0} Actively Deployed</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCrewRoster(!showCrewRoster)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>{showCrewRoster ? 'Hide Crew Roster' : 'View Crew Roster'}</span>
              {showCrewRoster ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>

          {showCrewRoster && (
            <div className="p-4 sm:p-5 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
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
      )}
    </div>
  );
}
