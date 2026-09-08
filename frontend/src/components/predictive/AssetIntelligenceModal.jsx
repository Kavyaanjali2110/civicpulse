import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  Activity,
  Calendar,
  Clock,
  MapPin,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  FileText,
  UserCheck,
  Building2,
  Droplets,
  Zap,
  GraduationCap,
  Train,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { predictiveService } from '../../services/predictiveService';
import { govService } from '../../services/govService';

export default function AssetIntelligenceModal({
  asset,
  isOpen,
  onClose,
  onOrderCreated
}) {
  const [activeTab, setActiveTab] = useState('forecast'); // forecast, factors, complaints, dispatch
  const [healthDetail, setHealthDetail] = useState(null);
  const [predictionsDetail, setPredictionsDetail] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [crews, setCrews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dispatch Form State
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedCrewId, setSelectedCrewId] = useState('');
  const [dispatchPriority, setDispatchPriority] = useState('HIGH');
  const [dispatchAction, setDispatchAction] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  useEffect(() => {
    if (!isOpen || !asset) return;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const [hRes, pRes, deptsRes, crewsRes] = await Promise.all([
          predictiveService.getAssetHealthDetail(asset.asset_id).catch(() => null),
          predictiveService.getAssetPredictions(asset.asset_id).catch(() => null),
          govService.getDepartments().catch(() => []),
          govService.getCrews().catch(() => []),
        ]);

        setHealthDetail(hRes);
        setPredictionsDetail(pRes);
        setDepartments(deptsRes || []);
        setCrews(crewsRes || []);

        // Pre-fill recommendation values
        if (pRes) {
          setDispatchAction(pRes.recommended_action || asset.recommended_action || '');
          const recDept = deptsRes.find((d) =>
            d.name.toLowerCase().includes(pRes.target_department?.toLowerCase()?.slice(0, 4) || '')
          ) || deptsRes[0];
          
          if (recDept) {
            setSelectedDeptId(String(recDept.id));
            const matchCrew = crewsRes.find(
              (c) => c.department_id === recDept.id && c.ward_id === asset.ward_id
            ) || crewsRes.find((c) => c.department_id === recDept.id);
            if (matchCrew) setSelectedCrewId(String(matchCrew.id));
          }
        }
      } catch (err) {
        console.error('Failed to load asset intelligence', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [isOpen, asset]);

  if (!isOpen || !asset) return null;

  const handleDeptChange = (deptId) => {
    setSelectedDeptId(deptId);
    const availableCrews = crews.filter((c) => String(c.department_id) === String(deptId));
    if (availableCrews.length > 0) {
      setSelectedCrewId(String(availableCrews[0].id));
    } else {
      setSelectedCrewId('');
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!selectedDeptId) {
      alert('Please select a target municipal department.');
      return;
    }

    setSubmittingOrder(true);
    try {
      const payload = {
        infrastructure_id: asset.asset_id,
        department_id: parseInt(selectedDeptId, 10),
        crew_id: selectedCrewId ? parseInt(selectedCrewId, 10) : null,
        priority: dispatchPriority,
        recommended_action: dispatchAction || asset.recommended_action || 'Preventive engineering audit',
        notes: dispatchNotes || 'Dispatched via Predictive Infrastructure Intelligence Console'
      };

      const res = await predictiveService.createPreventiveOrder(payload);
      setOrderSuccess(res);
      if (onOrderCreated) onOrderCreated(res);
    } catch (err) {
      console.error('Failed to create preventive work order', err);
      alert(err.response?.data?.detail || 'Failed to dispatch preventive order.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const metrics = healthDetail?.metrics || {};
  const predictions = predictionsDetail?.predictions || asset.predictions || {};
  const p7 = predictions['7_days'] || {};
  const p14 = predictions['14_days'] || {};
  const p30 = predictions['30_days'] || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {asset.asset_name}
                </h3>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {asset.asset_type?.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                {asset.ward_name || `Ward ${asset.ward_id}`}
                <span className="text-slate-600">•</span>
                <span className="font-mono">Lat: {asset.latitude?.toFixed(4)}, Lon: {asset.longitude?.toFixed(4)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Stat Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
              <div className="text-xs text-slate-400 font-medium">Asset Health Index</div>
              <div className="text-2xl font-bold text-white font-mono mt-1">
                {asset.health_score} <span className="text-xs font-normal text-slate-500">/ 100</span>
              </div>
              <div className="text-[11px] font-semibold text-rose-400 uppercase mt-0.5">
                {asset.health_category}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
              <div className="text-xs text-slate-400 font-medium">30-Day Failure Risk</div>
              <div className="text-2xl font-bold text-rose-400 font-mono mt-1">
                {p30.risk_percentage || 0}%
              </div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase mt-0.5">
                Tier: {p30.risk_level || 'EVALUATING'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
              <div className="text-xs text-slate-400 font-medium">Asset Age</div>
              <div className="text-2xl font-bold text-sky-400 font-mono mt-1">
                {metrics.age_years !== undefined ? `${metrics.age_years} yrs` : '11 yrs'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Commissioned: 2013
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
              <div className="text-xs text-slate-400 font-medium">Last Maintenance</div>
              <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
                {metrics.days_since_maintenance !== undefined ? `${metrics.days_since_maintenance}d` : '290d'}
              </div>
              <div className="text-[11px] text-amber-400 font-medium mt-0.5">
                Overdue by &gt;90 days
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 gap-4">
            {[
              { id: 'forecast', label: 'Failure Forecast (7-30d)', icon: TrendingUp },
              { id: 'factors', label: 'Risk Factors & Telemetry', icon: ShieldAlert },
              { id: 'action', label: 'Action Plan & Work Order', icon: Wrench },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'border-sky-500 text-sky-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: FAILURE FORECAST */}
          {activeTab === 'forecast' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 7 Days */}
                <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">7-Day Horizon</span>
                    <Clock className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white font-mono mt-3">
                    {p7.risk_percentage || 0}%
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    Probability: {p7.risk_score || 0.1}
                  </div>
                  <div className="mt-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      p7.risk_level === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' :
                      p7.risk_level === 'HIGH' ? 'bg-orange-500/20 text-orange-300' :
                      'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {p7.risk_level || 'LOW'} RISK
                    </span>
                  </div>
                </div>

                {/* 14 Days */}
                <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">14-Day Horizon</span>
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white font-mono mt-3">
                    {p14.risk_percentage || 0}%
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    Probability: {p14.risk_score || 0.25}
                  </div>
                  <div className="mt-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      p14.risk_level === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' :
                      p14.risk_level === 'HIGH' ? 'bg-orange-500/20 text-orange-300' :
                      'bg-amber-500/20 text-amber-300'
                    }`}>
                      {p14.risk_level || 'MEDIUM'} RISK
                    </span>
                  </div>
                </div>

                {/* 30 Days */}
                <div className="p-5 rounded-2xl bg-slate-950/70 border border-rose-900/40 bg-gradient-to-b from-slate-950/90 to-rose-950/20 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-300 uppercase tracking-wider">30-Day Cumulative</span>
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-rose-400 font-mono mt-3">
                    {p30.risk_percentage || 0}%
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    Probability: {p30.risk_score || 0.5}
                  </div>
                  <div className="mt-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      p30.risk_level === 'CRITICAL' ? 'bg-rose-500 text-white' :
                      'bg-orange-500/30 text-orange-300'
                    }`}>
                      {p30.risk_level || 'HIGH'} RISK
                    </span>
                  </div>
                </div>
              </div>

              {/* XAI Narrative Box */}
              <div className="p-5 rounded-2xl bg-sky-950/30 border border-sky-800/40 text-sm">
                <div className="flex items-center gap-2 text-sky-400 font-bold mb-2">
                  <ShieldAlert className="w-4 h-4" /> Explainable AI (XAI) Risk Rationale:
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {predictionsDetail?.explanation || asset.explanation || 
                   `${asset.asset_name} is considered elevated risk due to localized grievance acceleration and elapsed duration since mechanical overhaul.`}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: FACTORS & TELEMETRY */}
          {activeTab === 'factors' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Contributing Factor Decomposition
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(healthDetail?.contributing_factors || asset.contributing_factors || []).map((factor, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3"
                  >
                    <div className="w-2 h-2 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                    <span className="text-sm text-slate-300">{factor}</span>
                  </div>
                ))}
              </div>

              {/* Component breakdown bars */}
              {healthDetail?.component_scores && (
                <div className="mt-6 p-5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Score Components (Normalized 0–100)
                  </h5>
                  {Object.entries(healthDetail.component_scores).map(([k, val]) => (
                    <div key={k} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400 capitalize">{k.replace('_score', '').replace('_', ' ')}</span>
                        <span className="text-slate-200 font-mono font-bold">{val} / 100</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-sky-500 rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ACTION PLAN & WORK ORDER CREATION */}
          {activeTab === 'action' && (
            <div className="space-y-5">
              {orderSuccess ? (
                <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h4 className="text-lg font-bold text-white">
                    Preventive Work Order Dispatched Successfully!
                  </h4>
                  <p className="text-sm text-slate-300">
                    Order Reference: <span className="font-mono font-bold text-emerald-300">{orderSuccess.order_code}</span>
                  </p>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    The work order has been routed to <strong>{orderSuccess.department_name}</strong> and assigned to <strong>{orderSuccess.crew_name || 'Ward Crew'}</strong>.
                  </p>
                  <button
                    onClick={() => {
                      setOrderSuccess(null);
                      onClose();
                    }}
                    className="mt-3 px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-all"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateOrder} className="space-y-4">
                  {/* Recommendation Card */}
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400 uppercase">Recommended Preventive Action</span>
                      <span className="text-xs font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                        Urgency: Within 48 hours
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={dispatchAction}
                      onChange={(e) => setDispatchAction(e.target.value)}
                      className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                      placeholder="Specify technical scope for the field crew..."
                      required
                    />
                  </div>

                  {/* Dispatch Parameters */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Department */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Target Department</label>
                      <select
                        value={selectedDeptId}
                        onChange={(e) => handleDeptChange(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                        required
                      >
                        <option value="">Select Department...</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Field Crew */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Assigned Field Crew</label>
                      <select
                        value={selectedCrewId}
                        onChange={(e) => setSelectedCrewId(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                      >
                        <option value="">Auto-Assign Best Crew</option>
                        {crews
                          .filter((c) => !selectedDeptId || String(c.department_id) === String(selectedDeptId))
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.ward_name || `Ward ${c.ward_id}`})
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">Priority</label>
                      <select
                        value={dispatchPriority}
                        onChange={(e) => setDispatchPriority(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                      >
                        <option value="CRITICAL">CRITICAL</option>
                        <option value="HIGH">HIGH</option>
                        <option value="MEDIUM">MEDIUM</option>
                      </select>
                    </div>
                  </div>

                  {/* Operational Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Dispatcher Notes / Access Instructions</label>
                    <input
                      type="text"
                      value={dispatchNotes}
                      onChange={(e) => setDispatchNotes(e.target.value)}
                      placeholder="e.g., Access via Gate 3; coordinate with site facility manager."
                      className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* Confirmation Action */}
                  <div className="pt-3 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingOrder}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-lg shadow-sky-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                      {submittingOrder ? (
                        <>
                          <Activity className="w-4 h-4 animate-spin" /> Dispatching...
                        </>
                      ) : (
                        <>
                          <Wrench className="w-4 h-4" /> Confirm &amp; Create Preventive Work Order
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div>
            Asset ID: <span className="font-mono text-slate-300">#{asset.asset_id}</span>
          </div>
          {activeTab !== 'action' && (
            <button
              onClick={() => setActiveTab('action')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-md transition-all flex items-center gap-1.5"
            >
              <Wrench className="w-3.5 h-3.5" /> [CREATE PREVENTIVE WORK ORDER]
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
