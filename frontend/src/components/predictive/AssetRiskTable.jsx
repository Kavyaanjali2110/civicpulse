import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Search, 
  Filter, 
  ExternalLink, 
  Wrench, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  ChevronRight,
  Droplets,
  Zap,
  Building2,
  GraduationCap,
  Train,
  ArrowUpDown
} from 'lucide-react';

const getAssetTypeIcon = (type) => {
  switch (type) {
    case 'WATER_FACILITY':
      return <Droplets className="w-4 h-4 text-cyan-400" />;
    case 'POWER_STATION':
      return <Zap className="w-4 h-4 text-amber-400" />;
    case 'HOSPITAL':
      return <Building2 className="w-4 h-4 text-rose-400" />;
    case 'SCHOOL':
      return <GraduationCap className="w-4 h-4 text-blue-400" />;
    case 'TRANSIT_HUB':
      return <Train className="w-4 h-4 text-emerald-400" />;
    default:
      return <Wrench className="w-4 h-4 text-slate-400" />;
  }
};

const getRiskBadge = (level) => {
  switch (level?.toUpperCase()) {
    case 'CRITICAL':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          CRITICAL
        </span>
      );
    case 'HIGH':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
          HIGH
        </span>
      );
    case 'MEDIUM':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          MEDIUM
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          LOW
        </span>
      );
  }
};

const getHealthBarColor = (score) => {
  if (score >= 75) return 'bg-rose-500';
  if (score >= 50) return 'bg-orange-500';
  if (score >= 25) return 'bg-amber-400';
  return 'bg-emerald-400';
};

export default function AssetRiskTable({
  assetsRisk = [],
  loading = false,
  onSelectAsset,
  onCreateWorkOrder,
  selectedWindow = 30,
  onWindowChange,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [wardFilter, setWardFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');

  const filteredAssets = useMemo(() => {
    return assetsRisk.filter((asset) => {
      const predKey = `${selectedWindow}_days`;
      const pred = asset.predictions?.[predKey] || asset.predictions?.['30_days'];

      // Search match
      const searchLower = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        asset.asset_name?.toLowerCase().includes(searchLower) ||
        asset.recommended_action?.toLowerCase().includes(searchLower) ||
        asset.ward_name?.toLowerCase().includes(searchLower);

      // Ward match
      const matchWard =
        wardFilter === 'ALL' ||
        String(asset.ward_id) === String(wardFilter);

      // Type match
      const matchType =
        typeFilter === 'ALL' ||
        asset.asset_type === typeFilter;

      // Risk level match
      const matchRisk =
        riskFilter === 'ALL' ||
        pred?.risk_level?.toUpperCase() === riskFilter.toUpperCase();

      return matchSearch && matchWard && matchType && matchRisk;
    });
  }, [assetsRisk, searchTerm, wardFilter, typeFilter, riskFilter, selectedWindow]);

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* Header & Controls */}
      <div className="p-6 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-rose-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">
                Infrastructure Asset Risk & Failure Forecasting
              </h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Multi-horizon probability models estimating degradation and recommending preventive maintenance.
            </p>
          </div>

          {/* Prediction Window Selector */}
          <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-700/80">
            <span className="text-xs font-semibold text-slate-400 px-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-sky-400" /> Horizon:
            </span>
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => onWindowChange && onWindowChange(days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedWindow === days
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {days} Days
              </button>
            ))}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search asset, ward, action..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Ward Filter */}
          <select
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Municipal Wards</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((w) => (
              <option key={w} value={w}>Ward {w}</option>
            ))}
          </select>

          {/* Asset Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Asset Types</option>
            <option value="WATER_FACILITY">Water Facilities</option>
            <option value="POWER_STATION">Power & Transformers</option>
            <option value="HOSPITAL">Hospitals</option>
            <option value="SCHOOL">Schools</option>
            <option value="BRIDGE">Bridges & Flyovers</option>
            <option value="TRANSIT_HUB">Transit Hubs</option>
          </select>

          {/* Risk Level */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Risk Tiers</option>
            <option value="CRITICAL">Critical Risk</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="text-xs uppercase bg-slate-950/70 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Asset</th>
              <th className="px-4 py-3.5 font-semibold">Ward</th>
              <th className="px-4 py-3.5 font-semibold">Health Score</th>
              <th className="px-4 py-3.5 font-semibold">Risk ({selectedWindow}d)</th>
              <th className="px-4 py-3.5 font-semibold">Risk Level</th>
              <th className="px-5 py-3.5 font-semibold">Top Risk Factor</th>
              <th className="px-5 py-3.5 font-semibold">Recommended Action</th>
              <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                  <div className="inline-flex items-center gap-2">
                    <Activity className="w-5 h-5 animate-spin text-sky-400" />
                    <span>Computing predictive asset intelligence...</span>
                  </div>
                </td>
              </tr>
            ) : filteredAssets.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                  No infrastructure assets match the selected filters.
                </td>
              </tr>
            ) : (
              filteredAssets.map((asset) => {
                const predKey = `${selectedWindow}_days`;
                const pred = asset.predictions?.[predKey] || asset.predictions?.['30_days'] || {};
                const riskPct = pred.risk_percentage || 0;
                const riskLevel = pred.risk_level || 'MEDIUM';
                const topFactor = asset.contributing_factors?.[0] || 'Standard aging lifecycle';

                return (
                  <tr
                    key={asset.asset_id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Asset Name & Type */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/80">
                          {getAssetTypeIcon(asset.asset_type)}
                        </div>
                        <div>
                          <div className="font-semibold text-white group-hover:text-sky-300 transition-colors">
                            {asset.asset_name}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            {asset.asset_type.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Ward */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-slate-300 text-xs bg-slate-800 px-2 py-1 rounded-md border border-slate-700/60">
                        {asset.ward_name || `Ward ${asset.ward_id}`}
                      </span>
                    </td>

                    {/* Health Score */}
                    <td className="px-4 py-4">
                      <div className="w-28">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400 font-mono">{asset.health_score}</span>
                          <span className="text-slate-500 text-[10px] uppercase">{asset.health_category}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getHealthBarColor(asset.health_score)} transition-all duration-500`}
                            style={{ width: `${Math.min(100, Math.max(5, asset.health_score))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Risk Score */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-mono text-base font-bold text-white">
                        {riskPct}%
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        prob. {pred.risk_score}
                      </div>
                    </td>

                    {/* Risk Level */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getRiskBadge(riskLevel)}
                    </td>

                    {/* Top Risk Factor */}
                    <td className="px-5 py-4 text-xs text-slate-300 max-w-xs">
                      <div className="truncate" title={topFactor}>
                        {topFactor}
                      </div>
                    </td>

                    {/* Recommended Action */}
                    <td className="px-5 py-4 text-xs text-slate-400 max-w-sm">
                      <div className="line-clamp-2" title={asset.recommended_action}>
                        {asset.recommended_action}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onSelectAsset && onSelectAsset(asset)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white border border-slate-700 transition-all flex items-center gap-1.5"
                          title="View complete asset diagnostic telemetry"
                        >
                          <Activity className="w-3.5 h-3.5" /> Intelligence
                        </button>
                        {(riskLevel === 'CRITICAL' || riskLevel === 'HIGH' || asset.health_category === 'CRITICAL' || asset.health_category === 'AT_RISK') && (
                          <button
                            onClick={() => onCreateWorkOrder && onCreateWorkOrder(asset)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-md shadow-rose-900/30 transition-all flex items-center gap-1"
                            title="Dispatch preventive work order"
                          >
                            <Wrench className="w-3.5 h-3.5" /> Order
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
