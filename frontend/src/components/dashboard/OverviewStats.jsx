import React from 'react';
import {
  BarChart3,
  Flame,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
  TrendingUp,
  ArrowRight,
  HardHat,
  ShieldAlert,
  Zap,
  Timer
} from 'lucide-react';

export default function OverviewStats({ stats, workflowStats, loading = false, onCardClick }) {
  if (loading || !stats) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 h-24 shadow-card skeleton" />
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 h-10 shadow-card skeleton" />
      </div>
    );
  }

  // --- 6 Primary KPI Cards ---
  const primaryItems = [
    {
      id: 'total',
      title: 'Total Complaints',
      value: stats.total_complaints.toLocaleString(),
      subtext: `${stats.open_count} active`,
      icon: BarChart3,
      iconColor: 'text-slate-700',
      iconBg: 'bg-slate-100',
      hint: 'View all queue',
    },
    {
      id: 'critical',
      title: 'Critical',
      value: stats.critical_count,
      subtext: `${stats.high_severity_count} high sev.`,
      icon: Flame,
      iconColor: 'text-rose-700',
      iconBg: 'bg-rose-50',
      badge: 'Imm. SLA',
      badgeColor: 'bg-rose-100 text-rose-800',
      hint: 'Filter critical',
      valueCls: 'text-rose-700',
    },
    {
      id: 'active',
      title: 'Active / In Progress',
      value: workflowStats ? (workflowStats.assigned_complaints + workflowStats.in_progress_complaints) : stats.open_count,
      subtext: workflowStats ? `${workflowStats.in_progress_complaints} on-site` : 'Open tickets',
      icon: Zap,
      iconColor: 'text-amber-700',
      iconBg: 'bg-amber-50',
      hint: 'View active',
      valueCls: 'text-amber-700',
    },
    {
      id: 'resolved',
      title: 'Resolved',
      value: stats.resolved_count.toLocaleString(),
      subtext: 'Closed to date',
      icon: CheckCircle2,
      iconColor: 'text-emerald-700',
      iconBg: 'bg-emerald-50',
      hint: 'Filter resolved',
      valueCls: 'text-emerald-700',
    },
    {
      id: 'sla_risk',
      title: 'SLA Risk',
      value: workflowStats ? (workflowStats.overdue_complaints + workflowStats.at_risk_complaints) : '—',
      subtext: workflowStats ? `${workflowStats.overdue_complaints} overdue` : 'At-risk tickets',
      icon: ShieldAlert,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-50',
      hint: 'Escalate',
      valueCls: workflowStats && (workflowStats.overdue_complaints + workflowStats.at_risk_complaints) > 0
        ? 'text-rose-600' : 'text-slate-800',
    },
    {
      id: 'priority',
      title: 'Resolution Rate',
      value: `${stats.resolution_rate.toFixed(1)}%`,
      subtext: `${stats.resolved_count} of ${stats.total_complaints}`,
      icon: TrendingUp,
      iconColor: 'text-teal-700',
      iconBg: 'bg-teal-50',
      hint: 'View rankings',
    },
  ];

  // --- 4 Secondary Operational Intelligence metrics ---
  const secondaryItems = [
    {
      id: 'hotspots',
      label: 'Active Hotspots',
      value: stats.active_hotspots_count,
      icon: Layers,
      color: 'text-amber-700',
      hint: 'Inspect map',
    },
    {
      id: 'priority_score',
      label: 'Avg IPS',
      value: stats.average_priority_score.toFixed(1),
      icon: Activity,
      color: 'text-teal-700',
      hint: 'Priority index',
    },
    {
      id: 'avg_resolution',
      label: 'Avg Resolution Time',
      value: workflowStats ? `${workflowStats.average_resolution_time_hours}h` : '—',
      icon: Timer,
      color: 'text-slate-600',
      hint: 'Turnaround',
    },
    {
      id: 'crew_dispatch',
      label: 'Active Crew Dispatch',
      value: workflowStats ? workflowStats.assigned_complaints : '—',
      icon: HardHat,
      color: 'text-blue-700',
      hint: 'Deployments',
    },
  ];

  return (
    <div className="space-y-3">
      {/* Primary 6-Card KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onCardClick && onCardClick(item.id)}
              className="relative bg-white border border-slate-200/90 hover:border-teal-500 rounded-2xl p-4 shadow-card hover:shadow-elevation transition-all text-left group cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-600 hover-lift"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 group-hover:text-slate-700 transition-colors leading-tight">
                  {item.title}
                </span>
                <div className={`p-1.5 rounded-xl ${item.iconBg} ${item.iconColor} group-hover:scale-105 transition-transform shrink-0`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className={`text-2xl font-black tracking-tight font-sans ${item.valueCls || 'text-slate-900'}`}>
                {item.value}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">{item.subtext}</div>

              <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-teal-700 opacity-60 group-hover:opacity-100 transition-opacity">
                <span>{item.hint}</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>

              {item.badge && (
                <span className={`absolute top-3 right-10 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Secondary Operational Intelligence Strip */}
      <div className="bg-white border border-slate-200/90 rounded-xl px-4 py-2.5 shadow-card flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest shrink-0">
          Operational Intelligence
        </span>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 flex-1">
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onCardClick && onCardClick(item.id)}
                className="flex items-center space-x-1.5 group cursor-pointer hover:opacity-80 transition-opacity"
                title={item.hint}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${item.color}`} />
                <span className="text-[11px] text-slate-500 font-medium">{item.label}:</span>
                <span className={`text-[11px] font-extrabold ${item.color}`}>{item.value}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
