import React from 'react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { TrendingUp, AlertTriangle, Zap, Calendar, ArrowUpRight } from 'lucide-react';

const CATEGORY_COLORS = {
  ROADS: '#d97706',
  WATER: '#0284c7',
  WASTE: '#059669',
  ELECTRICITY: '#ca8a04',
  SEWAGE: '#7c3aed',
  SAFETY: '#e11d48',
};

export default function TrendAnalytics({ trendsData, onCategoryClick }) {
  if (!trendsData) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse h-64 shadow-card" />
    );
  }

  const { daily_series = [], category_trends = [], emerging_alerts = [] } = trendsData;

  return (
    <div className="space-y-4">
      {/* Surge Alerts Banner */}
      {emerging_alerts && emerging_alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3.5 shadow-sm">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Emerging Velocity Surges Detected
            </div>
            <div className="mt-1 space-y-1">
              {emerging_alerts.map((alert, idx) => (
                <p key={idx} className="text-xs text-amber-800 font-medium">
                  • {alert}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grid of 2 Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. 14-Day Timeline Area Chart */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-card space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-700" />
                <span>14-Day Grievance Intake Volume</span>
              </h4>
              <p className="text-[11px] text-slate-500">Daily citizen feedback influx timeline</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              Live Intake
            </span>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily_series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorComplaints" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f766e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="display_date" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  allowDecimals={false} 
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#0f172a',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                />
                <Area
                  type="monotone"
                  dataKey="complaints"
                  name="Grievances"
                  stroke="#0f766e"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorComplaints)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Category 7-Day Velocity & Spike Monitor */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-card space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-amber-700" />
                <span>7-Day Growth vs Baseline Velocity</span>
              </h4>
              <p className="text-[11px] text-slate-500">Click any category to filter the priority queue</p>
            </div>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-48 pr-1">
            {category_trends.map((item) => (
              <button
                key={item.category_id}
                type="button"
                onClick={() => onCategoryClick && onCategoryClick(item.category_name)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 text-xs transition-colors cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <div className="flex items-center space-x-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[item.category_code] || '#94a3b8' }}
                  />
                  <div>
                    <span className="font-bold text-slate-800 block">
                      {item.category_name}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {item.count_last_7d} reports (7d) vs {item.baseline_weekly_avg.toFixed(1)} avg
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`inline-flex items-center space-x-0.5 font-mono font-bold text-xs ${
                      item.is_surge
                        ? 'text-rose-700'
                        : item.growth_percentage > 0
                        ? 'text-amber-800'
                        : 'text-emerald-700'
                    }`}
                  >
                    <span>{item.growth_percentage >= 0 ? `+${item.growth_percentage}%` : `${item.growth_percentage}%`}</span>
                    {item.growth_percentage > 0 && <ArrowUpRight className="w-3 h-3" />}
                  </div>
                  {item.is_surge && (
                    <span className="block text-[9px] font-bold text-rose-700 uppercase tracking-tight">
                      Surge Alert
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
