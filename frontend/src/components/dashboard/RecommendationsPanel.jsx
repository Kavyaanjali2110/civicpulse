import React from 'react';
import { 
  Sparkles, 
  Flame, 
  Clock, 
  ShieldCheck, 
  Cpu, 
  ArrowRight, 
  CheckCircle,
  AlertCircle,
  Wrench,
  Users,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import SeverityBadge from '../common/SeverityBadge';

export default function RecommendationsPanel({ recommendationsData, onActionClick }) {
  if (!recommendationsData || !recommendationsData.recommendations) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 h-48 shadow-card skeleton" />
    );
  }

  const { total_recommendations, critical_actions, recommendations } = recommendationsData;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-card space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-teal-700" />
            <span>AI Infrastructure Insights &amp; Prescriptive Actions</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparent algorithmic attributions and tactical dispatch recommendations derived from spatial density and POI vulnerability.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
            {total_recommendations} Actionable Plans
          </span>
          {critical_actions > 0 && (
            <span className="px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center space-x-1">
              <Flame className="w-3.5 h-3.5 text-rose-600" />
              <span>{critical_actions} Critical Emergency</span>
            </span>
          )}
        </div>
      </div>

      {/* Recommendations Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="bg-slate-50/70 border border-slate-200 hover:border-teal-300 rounded-2xl p-5 space-y-3.5 transition-all hover:shadow-card flex flex-col justify-between group hover-lift"
          >
            <div className="space-y-3.5">
              {/* Title & Priority Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-xs text-teal-800">
                      {rec.id}
                    </span>
                    <SeverityBadge level={rec.severity_level} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">
                    {rec.title}
                  </h4>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">IPS Score</span>
                  <span className="font-mono font-black text-base text-slate-900">
                    {rec.priority_score.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Tactical Action Plan Banner */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 space-y-1 shadow-sm">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
                  <Wrench className="w-3.5 h-3.5 text-teal-700" />
                  <span>Recommended Action Plan:</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {rec.tactical_action_plan}
                </p>
              </div>

              {/* Evidence & Attributions */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  Evidence &amp; Contributing Factors:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {rec.primary_contributing_factors.map((factor, fIdx) => (
                    <span
                      key={fIdx}
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-600 font-medium"
                    >
                      • {factor}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer: Population Impact & Action Button */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-1 text-[11px] text-slate-500 truncate">
                <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">Impact: <strong className="text-slate-700">{rec.affected_population_impact}</strong></span>
              </div>

              <button
                type="button"
                onClick={() => onActionClick && onActionClick(rec)}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-all shadow-sm cursor-pointer shrink-0"
              >
                <span>Dispatch Work Order</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
