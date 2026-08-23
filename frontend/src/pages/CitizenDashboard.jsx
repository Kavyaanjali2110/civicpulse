import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  PlusCircle, 
  Search, 
  LogOut, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Flame, 
  Layers, 
  Sparkles, 
  FileText, 
  ChevronRight, 
  Activity,
  Mic,
  MapPin,
  Camera,
  Languages,
  ShieldCheck,
  Calendar,
  Filter,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ComplaintForm from '../components/citizen/ComplaintForm';
import ComplaintTracker from '../components/citizen/ComplaintTracker';
import SeverityBadge from '../components/common/SeverityBadge';
import { govService } from '../services/govService';

const STATUS_META = {
  RECEIVED: { label: 'Received', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  INVESTIGATING: { label: 'Investigating', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  RESOLVED: { label: 'Resolved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Rejected', color: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export default function CitizenDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeView, setActiveView] = useState('overview'); // 'overview' | 'submit' | 'track'
  const [selectedTrackingId, setSelectedTrackingId] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Live data
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoadingComplaints(true);

    try {
      const [complaintsRes, statsRes] = await Promise.all([
        govService.listComplaints({ page: 1, page_size: 20 }),
        govService.getOverviewStats(),
      ]);
      setComplaints(complaintsRes.items || []);
      setStats(statsRes);
    } catch (err) {
      console.error('CitizenDashboard data fetch failed:', err);
    } finally {
      setLoadingComplaints(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const handleTrackComplaint = (trackingId) => {
    setSelectedTrackingId(trackingId);
    setActiveView('track');
  };

  const handleComplaintSubmitted = () => {
    fetchData(true);
    setActiveView('overview');
  };

  const filteredComplaints = useMemo(() => {
    if (statusFilter === 'ALL') return complaints;
    if (statusFilter === 'OPEN') {
      return complaints.filter((c) => c.status === 'RECEIVED' || c.status === 'INVESTIGATING');
    }
    return complaints.filter((c) => c.status === statusFilter);
  }, [complaints, statusFilter]);

  // Dynamic KPI counts from live data
  const kpiCounts = useMemo(() => {
    if (stats) {
      return {
        total: stats.total_complaints,
        open: stats.open_count,
        in_progress: stats.in_progress_count,
        resolved: stats.resolved_count,
      };
    }
    return {
      total: complaints.length,
      open: complaints.filter((c) => c.status === 'RECEIVED' || c.status === 'INVESTIGATING').length,
      in_progress: complaints.filter((c) => c.status === 'IN_PROGRESS').length,
      resolved: complaints.filter((c) => c.status === 'RESOLVED').length,
    };
  }, [stats, complaints]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-7 animate-in fade-in duration-300">
      {/* Welcome Banner Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center space-x-4">
          <div className="w-13 h-13 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-bold text-base shadow-sm shrink-0">
            {user?.avatar || '🏙️'}
          </div>

          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Welcome, {user?.name || 'Citizen'}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold">
                Citizen Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Account: <strong className="text-slate-700 font-medium">{user?.email || 'citizen@civicpulse.ai'}</strong> • Verified Resident
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveView('submit')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
              activeView === 'submit'
                ? 'bg-teal-800 text-white ring-2 ring-teal-600'
                : 'bg-teal-700 hover:bg-teal-800 text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report an Issue</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedTrackingId('');
              setActiveView('track');
            }}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
              activeView === 'track'
                ? 'bg-slate-100 text-slate-900 border-slate-300 ring-2 ring-slate-400'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
          >
            <Search className="w-4 h-4 text-slate-500" />
            <span>Track Complaint</span>
          </button>

          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-700' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* KPI Interactive Metric Cards (Click to Filter Table) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total */}
        <button
          type="button"
          onClick={() => { setActiveView('overview'); setStatusFilter('ALL'); }}
          className={`bg-white border rounded-2xl p-5 shadow-card text-left transition-all cursor-pointer ${
            statusFilter === 'ALL' && activeView === 'overview'
              ? 'border-teal-600 ring-2 ring-teal-100'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total</span>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {loadingComplaints ? <Loader2 className="w-5 h-5 animate-spin text-slate-300 inline" /> : kpiCounts.total}
          </div>
          <span className="text-[10px] text-teal-700 font-semibold">View all reports</span>
        </button>

        {/* Open */}
        <button
          type="button"
          onClick={() => { setActiveView('overview'); setStatusFilter('OPEN'); }}
          className={`bg-white border rounded-2xl p-5 shadow-card text-left transition-all cursor-pointer ${
            statusFilter === 'OPEN' && activeView === 'overview'
              ? 'border-amber-600 ring-2 ring-amber-100'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Open</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">
            {loadingComplaints ? <Loader2 className="w-5 h-5 animate-spin text-amber-200 inline" /> : kpiCounts.open}
          </div>
          <span className="text-[10px] text-amber-700 font-semibold">Awaiting action</span>
        </button>

        {/* In Progress */}
        <button
          type="button"
          onClick={() => { setActiveView('overview'); setStatusFilter('IN_PROGRESS'); }}
          className={`bg-white border rounded-2xl p-5 shadow-card text-left transition-all cursor-pointer ${
            statusFilter === 'IN_PROGRESS' && activeView === 'overview'
              ? 'border-teal-600 ring-2 ring-teal-100'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">In Progress</span>
            <Activity className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-teal-700 mt-2">
            {loadingComplaints ? <Loader2 className="w-5 h-5 animate-spin text-teal-200 inline" /> : kpiCounts.in_progress}
          </div>
          <span className="text-[10px] text-teal-700 font-semibold">Field crews active</span>
        </button>

        {/* Resolved */}
        <button
          type="button"
          onClick={() => { setActiveView('overview'); setStatusFilter('RESOLVED'); }}
          className={`bg-white border rounded-2xl p-5 shadow-card text-left transition-all cursor-pointer ${
            statusFilter === 'RESOLVED' && activeView === 'overview'
              ? 'border-emerald-600 ring-2 ring-emerald-100'
              : 'border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            {loadingComplaints ? <Loader2 className="w-5 h-5 animate-spin text-emerald-200 inline" /> : kpiCounts.resolved}
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold">Completed repairs</span>
        </button>
      </div>

      {/* Feature Capabilities Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-card">
        <span className="text-slate-500 font-bold uppercase text-[11px] tracking-wider">
          Submission Capabilities:
        </span>
        <div className="flex flex-wrap items-center gap-2 text-slate-700">
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
            <Mic className="w-3 h-3 text-teal-700" />
            <span>Voice Recording</span>
          </span>
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
            <Languages className="w-3 h-3 text-teal-700" />
            <span>Multilingual AI</span>
          </span>
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
            <MapPin className="w-3 h-3 text-teal-700" />
            <span>GPS Pin Picker</span>
          </span>
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
            <Camera className="w-3 h-3 text-teal-700" />
            <span>Photo Proof</span>
          </span>
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
            <Activity className="w-3 h-3 text-teal-700" />
            <span>Live SLA Tracking</span>
          </span>
          {stats && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800">
              <TrendingUp className="w-3 h-3 text-teal-700" />
              <span>{stats.resolution_rate?.toFixed(0)}% Resolution Rate</span>
            </span>
          )}
        </div>
      </div>

      {/* Dynamic View Sections */}
      {activeView === 'submit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Grievance Submission Form</h3>
            <button
              type="button"
              onClick={() => setActiveView('overview')}
              className="text-xs text-teal-700 hover:text-teal-900 font-semibold underline cursor-pointer"
            >
              ← Back to Overview
            </button>
          </div>
          <ComplaintForm onSwitchToTrack={(id) => { handleComplaintSubmitted(); handleTrackComplaint(id); }} />
        </div>
      )}

      {activeView === 'track' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Track Grievance Status</h3>
            <button
              type="button"
              onClick={() => setActiveView('overview')}
              className="text-xs text-teal-700 hover:text-teal-900 font-semibold underline cursor-pointer"
            >
              ← Back to Overview
            </button>
          </div>
          <ComplaintTracker initialTrackingId={selectedTrackingId} />
        </div>
      )}

      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* Recent Complaints Table */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">City Complaint Board</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {stats
                    ? `${stats.total_complaints} total city-wide reports • ${stats.critical_count} critical • ${stats.active_hotspots_count} active hotspots`
                    : 'Click any complaint to inspect the real-time municipal audit timeline and dispatch status.'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {statusFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveView('submit')}
                  className="text-xs text-teal-700 hover:text-teal-900 font-bold underline cursor-pointer"
                >
                  + Report New Issue
                </button>
              </div>
            </div>

            {loadingComplaints ? (
              <div className="flex items-center justify-center py-12 space-x-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading live city data...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredComplaints.length > 0 ? (
                  filteredComplaints.map((item) => {
                    const statusMeta = STATUS_META[item.status] || STATUS_META['RECEIVED'];
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleTrackComplaint(item.tracking_id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') handleTrackComplaint(item.tracking_id);
                        }}
                        className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 hover:border-teal-300 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group focus:outline-none focus:ring-2 focus:ring-teal-600"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="font-mono font-bold text-xs text-teal-800">
                              {item.tracking_id}
                            </span>
                            <span className="text-xs font-semibold text-slate-800">
                              {item.category?.name || item.category || 'Civic Issue'}
                            </span>
                            <SeverityBadge level={item.severity_level} score={item.severity_score} />
                          </div>
                          <p className="text-xs text-slate-600 italic line-clamp-1">
                            "{item.summary}"
                          </p>
                          <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                            <Calendar className="w-3 h-3 inline" />
                            <span>{formatDate(item.created_at)}</span>
                            {item.address && (
                              <>
                                <span>•</span>
                                <MapPin className="w-3 h-3 inline" />
                                <span className="truncate max-w-[200px]">{item.address}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 shrink-0">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusMeta.color}`}>
                            {statusMeta.label}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-700 transition-colors" />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    {statusFilter !== 'ALL'
                      ? `No complaints with status "${statusFilter}".`
                      : 'No complaints found in the system.'}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI System Stats Panel */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-rose-50 to-rose-100/60 border border-rose-200 rounded-2xl p-5 shadow-card">
                <div className="flex items-center space-x-2 mb-2">
                  <Flame className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-bold text-rose-900 uppercase tracking-wider">Critical Alerts</span>
                </div>
                <div className="text-3xl font-black text-rose-700">{stats.critical_count}</div>
                <p className="text-[11px] text-rose-600 mt-1">Life-safety priority issues active</p>
              </div>
              <div className="bg-gradient-to-br from-violet-50 to-violet-100/60 border border-violet-200 rounded-2xl p-5 shadow-card">
                <div className="flex items-center space-x-2 mb-2">
                  <Layers className="w-4 h-4 text-violet-600" />
                  <span className="text-xs font-bold text-violet-900 uppercase tracking-wider">Active Hotspots</span>
                </div>
                <div className="text-3xl font-black text-violet-700">{stats.active_hotspots_count}</div>
                <p className="text-[11px] text-violet-600 mt-1">DBSCAN clusters requiring field dispatch</p>
              </div>
              <div className="bg-gradient-to-br from-teal-50 to-teal-100/60 border border-teal-200 rounded-2xl p-5 shadow-card">
                <div className="flex items-center space-x-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span className="text-xs font-bold text-teal-900 uppercase tracking-wider">Avg Priority Score</span>
                </div>
                <div className="text-3xl font-black text-teal-700">{stats.average_priority_score?.toFixed(1)}</div>
                <p className="text-[11px] text-teal-600 mt-1">AI Infrastructure Priority Score (IPS)</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
