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
  ArrowRight
} from 'lucide-react';

export default function OverviewStats({ stats, loading = false, onCardClick }) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 h-24 shadow-card skeleton" />
        ))}
      </div>
    );
  }

  const statItems = [
    {
      id: 'total',
      title: 'Total Complaints',
      value: stats.total_complaints.toLocaleString(),
      subtext: `${stats.open_count} active • ${stats.resolved_count} resolved`,
      icon: BarChart3,
      iconColor: 'text-slate-700',
      iconBg: 'bg-slate-100',
      hint: 'View all queue',
    },
    {
      id: 'hotspots',
      title: 'Active Hotspots',
      value: stats.active_hotspots_count,
      subtext: 'DBSCAN Spatial Density Clusters',
      icon: Layers,
      iconColor: 'text-amber-700',
      iconBg: 'bg-amber-50',
      badge: 'Cluster Alert',
      badgeColor: 'bg-amber-100 text-amber-800',
      hint: 'Inspect map',
    },
    {
      id: 'critical',
      title: 'Critical Severity',
      value: stats.critical_count,
      subtext: `${stats.high_severity_count} high severity pending`,
      icon: Flame,
      iconColor: 'text-rose-700',
      iconBg: 'bg-rose-50',
      badge: 'Immediate SLA',
      badgeColor: 'bg-rose-100 text-rose-800',
      hint: 'Filter critical',
    },
    {
      id: 'priority',
      title: 'Avg Priority Score',
      value: `${stats.average_priority_score.toFixed(1)}`,
      subtext: 'Infrastructure Priority Index (IPS)',
      icon: Activity,
      iconColor: 'text-teal-700',
      iconBg: 'bg-teal-50',
      hint: 'View rankings',
    },
    {
      id: 'resolved',
      title: 'Resolution Rate',
      value: `${stats.resolution_rate.toFixed(1)}%`,
      subtext: `${stats.resolved_count} closed to date`,
      icon: CheckCircle2,
      iconColor: 'text-emerald-700',
      iconBg: 'bg-emerald-50',
      hint: 'Filter resolved',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onCardClick && onCardClick(item.id)}
            className="relative bg-white border border-slate-200/90 hover:border-teal-500 rounded-2xl p-5 shadow-card hover:shadow-elevation transition-all text-left group cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-600 hover-lift"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 group-hover:text-slate-800 transition-colors">
                {item.title}
              </span>
              <div className={`p-2 rounded-xl ${item.iconBg} ${item.iconColor} group-hover:scale-105 transition-transform`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-2.5">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
                {item.value}
              </div>
              <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                <span className="truncate">{item.subtext}</span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-teal-700 opacity-80 group-hover:opacity-100 transition-opacity">
              <span>{item.hint}</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>

            {item.badge && (
              <span className={`absolute top-4 right-12 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${item.badgeColor}`}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
