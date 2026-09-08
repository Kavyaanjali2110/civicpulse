import React from 'react';
import { 
  BarChart3, 
  PieChart, 
  Activity, 
  ShieldAlert, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  MapPin,
  CheckCircle2
} from 'lucide-react';

export default function PredictiveCharts({
  assetsRisk = [],
  wardRisks = []
}) {
  // 1. Asset Health Distribution
  const healthDist = {
    HEALTHY: 0,
    MONITORED: 0,
    AT_RISK: 0,
    CRITICAL: 0
  };

  let totalRisk7d = 0;
  let totalRisk14d = 0;
  let totalRisk30d = 0;

  assetsRisk.forEach((a) => {
    const cat = a.health_category?.toUpperCase() || 'HEALTHY';
    if (healthDist[cat] !== undefined) healthDist[cat]++;

    totalRisk7d += a.predictions?.['7_days']?.risk_percentage || 0;
    totalRisk14d += a.predictions?.['14_days']?.risk_percentage || 0;
    totalRisk30d += a.predictions?.['30_days']?.risk_percentage || 0;
  });

  const totalAssets = Math.max(1, assetsRisk.length);
  const avgRisk7d = Math.round(totalRisk7d / totalAssets);
  const avgRisk14d = Math.round(totalRisk14d / totalAssets);
  const avgRisk30d = Math.round(totalRisk30d / totalAssets);

  // 2. High-risk wards sorted by ward_risk_score
  const topWards = [...wardRisks]
    .sort((a, b) => b.ward_risk_score - a.ward_risk_score)
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chart 1: Asset Health Distribution */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <PieChart className="w-4 h-4 text-sky-400" />
              Asset Health Distribution
            </h3>
            <span className="text-xs text-slate-400 font-mono">{assetsRisk.length} Assets</span>
          </div>

          {/* Segmented Progress Bar */}
          <div className="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden flex gap-0.5 p-0.5">
            <div
              style={{ width: `${(healthDist.HEALTHY / totalAssets) * 100}%` }}
              className="bg-emerald-500 rounded-l-full transition-all duration-500"
              title={`Healthy: ${healthDist.HEALTHY}`}
            />
            <div
              style={{ width: `${(healthDist.MONITORED / totalAssets) * 100}%` }}
              className="bg-amber-400 transition-all duration-500"
              title={`Monitored: ${healthDist.MONITORED}`}
            />
            <div
              style={{ width: `${(healthDist.AT_RISK / totalAssets) * 100}%` }}
              className="bg-orange-500 transition-all duration-500"
              title={`At Risk: ${healthDist.AT_RISK}`}
            />
            <div
              style={{ width: `${(healthDist.CRITICAL / totalAssets) * 100}%` }}
              className="bg-rose-500 rounded-r-full transition-all duration-500"
              title={`Critical: ${healthDist.CRITICAL}`}
            />
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Healthy
              </div>
              <div className="text-xl font-bold text-white font-mono mt-1">
                {healthDist.HEALTHY} <span className="text-xs font-normal text-slate-500">({Math.round((healthDist.HEALTHY / totalAssets) * 100)}%)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Monitored
              </div>
              <div className="text-xl font-bold text-white font-mono mt-1">
                {healthDist.MONITORED} <span className="text-xs font-normal text-slate-500">({Math.round((healthDist.MONITORED / totalAssets) * 100)}%)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-orange-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> At Risk
              </div>
              <div className="text-xl font-bold text-white font-mono mt-1">
                {healthDist.AT_RISK} <span className="text-xs font-normal text-slate-500">({Math.round((healthDist.AT_RISK / totalAssets) * 100)}%)</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-rose-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Critical
              </div>
              <div className="text-xl font-bold text-white font-mono mt-1">
                {healthDist.CRITICAL} <span className="text-xs font-normal text-slate-500">({Math.round((healthDist.CRITICAL / totalAssets) * 100)}%)</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-4">
          {healthDist.CRITICAL + healthDist.AT_RISK} assets currently warrant preventive maintenance inspection.
        </p>
      </div>

      {/* Chart 2: Failure Risk Escalation Horizon */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Risk Escalation Horizon
            </h3>
            <span className="text-xs text-slate-400">Mean Probability</span>
          </div>

          <div className="space-y-4 mt-2">
            {/* 7-Day Bar */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-400" /> 7-Day Forecast Window
                </span>
                <span className="font-mono text-white font-bold">{avgRisk7d}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, avgRisk7d))}%` }}
                />
              </div>
            </div>

            {/* 14-Day Bar */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> 14-Day Forecast Window
                </span>
                <span className="font-mono text-white font-bold">{avgRisk14d}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, avgRisk14d))}%` }}
                />
              </div>
            </div>

            {/* 30-Day Bar */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-rose-400" /> 30-Day Forecast Window
                </span>
                <span className="font-mono text-white font-bold">{avgRisk30d}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-500 to-rose-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, avgRisk30d))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-400 mt-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Failure probability increases {avgRisk30d - avgRisk7d}% over 30 days without preventive intervention.</span>
        </div>
      </div>

      {/* Chart 3: Top At-Risk Municipal Wards */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-400" />
              Highest-Risk Wards
            </h3>
            <span className="text-xs text-slate-400 font-mono">Risk Index</span>
          </div>

          <div className="space-y-3">
            {topWards.map((w) => (
              <div
                key={w.ward_id}
                className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    {w.ward_name}
                    {w.requires_preventive_intervention && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {w.metrics?.at_risk_assets_count || 0} at-risk asset(s) • {w.metrics?.predicted_failures_30d || 0} forecast failure(s)
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                    w.ward_risk_score >= 75 ? 'bg-rose-500/20 text-rose-300' :
                    w.ward_risk_score >= 50 ? 'bg-orange-500/20 text-orange-300' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {w.ward_risk_score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-3">
          Wards prioritized by composite spatial complaint velocity and asset vulnerability.
        </p>
      </div>
    </div>
  );
}
