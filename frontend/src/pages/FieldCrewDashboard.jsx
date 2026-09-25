import React, { useState, useEffect, useCallback } from 'react';
import {
  HardHat,
  CheckCircle2,
  Clock,
  MapPin,
  Play,
  Camera,
  AlertCircle,
  RefreshCw,
  Phone,
  ShieldCheck,
  UserCheck,
  Building2,
  Calendar,
  Sparkles,
  Layers,
  Star,
  ExternalLink,
  Wrench,
  ShieldAlert,
  Activity,
  FileCheck,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { crewService } from '../services/crewService';
import { govService } from '../services/govService';
import { predictiveService } from '../services/predictiveService';
import SeverityBadge from '../components/common/SeverityBadge';
import ResolutionUploadModal from '../components/crew/ResolutionUploadModal';
import PreventiveCompletionModal from '../components/crew/PreventiveCompletionModal';

export default function FieldCrewDashboard() {
  const { user } = useAuth();
  const [selectedCrewId, setSelectedCrewId] = useState(user?.crewId || 1);
  const [availableCrews, setAvailableCrews] = useState([]);

  const [crewInfo, setCrewInfo] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [preventiveOrders, setPreventiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Top level queue mode: 'CITIZEN' vs 'PREVENTIVE'
  const [queueMode, setQueueMode] = useState('CITIZEN');

  // Sub-filter tabs
  const [complaintFilterTab, setComplaintFilterTab] = useState('ALL'); // ALL, ASSIGNED, IN_PROGRESS, COMPLETED
  const [preventiveFilterTab, setPreventiveFilterTab] = useState('ALL'); // ALL, ASSIGNED, ACCEPTED, IN_PROGRESS, COMPLETED

  const [actionInProgress, setActionInProgress] = useState({});
  const [toastMessage, setToastMessage] = useState(null);

  // Modals
  const [selectedComplaintForModal, setSelectedComplaintForModal] = useState(null);
  const [selectedAssignmentForModal, setSelectedAssignmentForModal] = useState(null);
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false);

  const [selectedOrderForModal, setSelectedOrderForModal] = useState(null);
  const [preventiveModalOpen, setPreventiveModalOpen] = useState(false);

  // Load available crews for switcher
  useEffect(() => {
    govService.getCrews({ active_only: true })
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setAvailableCrews(res);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch crew info, complaints & preventive maintenance orders
  const fetchData = useCallback(async () => {
    try {
      const [crewRes, complaintsRes, prevOrdersRes] = await Promise.all([
        crewService.getCrewInfo(selectedCrewId).catch(() => null),
        crewService.getAssignedComplaints(selectedCrewId).catch(() => []),
        predictiveService.getCrewPreventiveOrders(selectedCrewId).catch(() => []),
      ]);

      if (crewRes) setCrewInfo(crewRes);
      setComplaints(complaintsRes || []);
      setPreventiveOrders(prevOrdersRes || []);
    } catch (err) {
      console.error('Failed to fetch crew dashboard data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCrewId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // --- Reactive Citizen Grievance Workflows ---
  const handleAcceptComplaint = async (assignmentId) => {
    setActionInProgress((prev) => ({ ...prev, [assignmentId]: true }));
    try {
      await crewService.acceptAssignment(assignmentId, {
        changed_by: user?.name || 'Field Crew Leader',
        notes: 'Dispatched to location.',
      });
      showToast('Assignment accepted. En route to location.');
      await fetchData();
    } catch (err) {
      console.error('Failed to accept assignment', err);
      alert(err.response?.data?.detail || 'Failed to accept assignment.');
    } finally {
      setActionInProgress((prev) => ({ ...prev, [assignmentId]: false }));
    }
  };

  const handleStartComplaint = async (assignmentId) => {
    setActionInProgress((prev) => ({ ...prev, [assignmentId]: true }));
    try {
      await crewService.startWork(assignmentId, {
        changed_by: user?.name || 'Field Crew Leader',
        notes: 'On-site investigation & physical repairs active.',
      });
      showToast('Work started. Ticket status set to IN PROGRESS.');
      await fetchData();
    } catch (err) {
      console.error('Failed to start work', err);
      alert(err.response?.data?.detail || 'Failed to start work.');
    } finally {
      setActionInProgress((prev) => ({ ...prev, [assignmentId]: false }));
    }
  };

  const handleOpenResolutionModal = (complaint, assignment) => {
    setSelectedComplaintForModal(complaint);
    setSelectedAssignmentForModal(assignment);
    setResolutionModalOpen(true);
  };

  // --- Predictive Maintenance Order Workflows ---
  const handleAcceptPreventive = async (orderId) => {
    setActionInProgress((prev) => ({ ...prev, [`prev_${orderId}`]: true }));
    try {
      await predictiveService.updatePreventiveOrderStatus(orderId, {
        new_status: 'ACCEPTED',
        notes: 'Crew acknowledged and accepted preventive maintenance order.',
      });
      showToast('Preventive order accepted. Maintenance scheduled.');
      await fetchData();
    } catch (err) {
      console.error('Failed to accept preventive order', err);
      alert(err.response?.data?.detail || 'Failed to accept preventive maintenance order.');
    } finally {
      setActionInProgress((prev) => ({ ...prev, [`prev_${orderId}`]: false }));
    }
  };

  const handleStartPreventive = async (orderId) => {
    setActionInProgress((prev) => ({ ...prev, [`prev_${orderId}`]: true }));
    try {
      await predictiveService.updatePreventiveOrderStatus(orderId, {
        new_status: 'IN_PROGRESS',
        notes: 'Crew deployed on-site, performing preventive maintenance service.',
      });
      showToast('Preventive maintenance in progress.');
      await fetchData();
    } catch (err) {
      console.error('Failed to start preventive order', err);
      alert(err.response?.data?.detail || 'Failed to start preventive maintenance.');
    } finally {
      setActionInProgress((prev) => ({ ...prev, [`prev_${orderId}`]: false }));
    }
  };

  const handleOpenPreventiveModal = (order) => {
    setSelectedOrderForModal(order);
    setPreventiveModalOpen(true);
  };

  // Filters for Complaints
  const filteredComplaints = complaints.filter((c) => {
    const currentAssign = c.current_assignment;
    const status = currentAssign?.assignment_status || 'ASSIGNED';

    if (complaintFilterTab === 'ALL') return true;
    if (complaintFilterTab === 'ASSIGNED') return status === 'ASSIGNED' || status === 'ACCEPTED';
    if (complaintFilterTab === 'IN_PROGRESS') return status === 'IN_PROGRESS';
    if (complaintFilterTab === 'COMPLETED') return status === 'COMPLETED';
    return true;
  });

  // Filters for Preventive Orders
  const filteredPreventiveOrders = preventiveOrders.filter((order) => {
    const status = order.status || 'ASSIGNED';
    if (preventiveFilterTab === 'ALL') return true;
    if (preventiveFilterTab === 'ASSIGNED') return status === 'ASSIGNED';
    if (preventiveFilterTab === 'ACCEPTED') return status === 'ACCEPTED';
    if (preventiveFilterTab === 'IN_PROGRESS') return status === 'IN_PROGRESS';
    if (preventiveFilterTab === 'COMPLETED') return status === 'COMPLETED';
    return true;
  });

  // Stats calculation
  const totalReactive = complaints.length;
  const totalPreventive = preventiveOrders.length;
  const inProgressTotal =
    complaints.filter((c) => c.current_assignment?.assignment_status === 'IN_PROGRESS').length +
    preventiveOrders.filter((o) => o.status === 'IN_PROGRESS').length;
  const completedTotal =
    complaints.filter((c) => c.current_assignment?.assignment_status === 'COMPLETED').length +
    preventiveOrders.filter((o) => o.status === 'COMPLETED').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-elevation flex items-center space-x-2 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-elevation relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-cyan-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-cyan-300">
                <HardHat className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {crewInfo?.name || 'Municipal Field Operations'}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
                  <span>{crewInfo?.department?.name || user?.department || 'Infrastructure Operations'}</span>
                  <span>•</span>
                  <span>{crewInfo?.ward_name || 'Ward Operations'}</span>
                  <span>•</span>
                  <span className="text-cyan-300 font-semibold">Lead: {crewInfo?.crew_leader || user?.name}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Active Crew Switcher */}
            {availableCrews.length > 0 && (
              <div className="flex items-center space-x-2 bg-white/10 hover:bg-white/15 px-3 py-2 rounded-xl border border-white/10 backdrop-blur-sm transition-colors">
                <span className="text-[11px] text-white/70 font-semibold">Viewing:</span>
                <select
                  value={selectedCrewId}
                  onChange={(e) => setSelectedCrewId(Number(e.target.value))}
                  className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer [&>option]:text-slate-900 [&>option]:bg-white"
                  aria-label="Select Field Crew Roster"
                >
                  {availableCrews.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Ward {c.ward_id || 'All'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-semibold backdrop-blur-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setQueueMode('CITIZEN')}
          onKeyDown={(e) => e.key === 'Enter' && setQueueMode('CITIZEN')}
          className={`border rounded-2xl p-4 shadow-card space-y-1 cursor-pointer transition-all ${
            queueMode === 'CITIZEN'
              ? 'bg-teal-50/50 border-teal-400 ring-2 ring-teal-500/20 shadow-sm'
              : 'bg-white border-slate-200/90 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Reactive Grievances
            </span>
            <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase bg-teal-100 text-teal-800 rounded">
              Citizen
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{totalReactive}</div>
          <p className="text-[11px] text-slate-400">Citizen complaints assigned</p>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => setQueueMode('PREVENTIVE')}
          onKeyDown={(e) => e.key === 'Enter' && setQueueMode('PREVENTIVE')}
          className={`border rounded-2xl p-4 shadow-card space-y-1 cursor-pointer transition-all bg-gradient-to-br from-white to-purple-50/40 ${
            queueMode === 'PREVENTIVE'
              ? 'border-purple-400 ring-2 ring-purple-500/20 bg-purple-50/70 shadow-sm'
              : 'border-purple-200/90 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
              Preventive Work
            </span>
            <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase bg-purple-100 text-purple-800 rounded">
              Predictive
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-purple-800">{totalPreventive}</div>
          <p className="text-[11px] text-purple-600 font-medium">Failure mitigation orders</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card space-y-1">
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
            Active In Progress
          </span>
          <div className="text-2xl font-bold font-mono text-blue-800">{inProgressTotal}</div>
          <p className="text-[11px] text-slate-400">Repairs & inspections on-site</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card space-y-1">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
            Completed & Verified
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-800">{completedTotal}</div>
          <p className="text-[11px] text-slate-400">With verified audit logs</p>
        </div>
      </div>

      {/* Primary Queue Mode Switcher (Reactive Complaints vs Preventive Orders) */}
      <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center space-x-1.5">
        <button
          onClick={() => setQueueMode('CITIZEN')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            queueMode === 'CITIZEN'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Building2 className="w-4 h-4 text-teal-600" />
          <span>Citizen Grievances</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              complaints.length > 0 ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {complaints.length}
          </span>
          {complaints.filter((c) => c.current_assignment?.assignment_status === 'ASSIGNED').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 uppercase animate-pulse">
              {complaints.filter((c) => c.current_assignment?.assignment_status === 'ASSIGNED').length} new
            </span>
          )}
        </button>

        <button
          onClick={() => setQueueMode('PREVENTIVE')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            queueMode === 'PREVENTIVE'
              ? 'bg-purple-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Wrench className="w-4 h-4 text-purple-300" />
          <span>Preventive Maintenance (Predictive AI)</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              queueMode === 'PREVENTIVE'
                ? 'bg-purple-800 text-purple-100 border border-purple-700'
                : preventiveOrders.length > 0
                ? 'bg-purple-100 text-purple-800'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {preventiveOrders.length}
          </span>
          {preventiveOrders.filter((o) => o.status === 'ASSIGNED').length > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase animate-pulse ${
                queueMode === 'PREVENTIVE' ? 'bg-purple-700 text-purple-200' : 'bg-purple-200 text-purple-900'
              }`}
            >
              {preventiveOrders.filter((o) => o.status === 'ASSIGNED').length} new
            </span>
          )}
        </button>
      </div>

      {/* Cross-Queue Helper Notification Banners */}
      {queueMode === 'CITIZEN' && preventiveOrders.length > 0 && (
        <div className="bg-purple-50/90 border border-purple-200 rounded-2xl p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-purple-950 shadow-xs">
          <div className="flex items-center space-x-2.5">
            <Wrench className="w-4 h-4 text-purple-600 shrink-0" />
            <span>
              <strong>Predictive Work Pending:</strong> You have{' '}
              <span className="font-bold font-mono text-purple-900">{preventiveOrders.length}</span>{' '}
              proactive infrastructure maintenance order(s) assigned to this crew.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setQueueMode('PREVENTIVE')}
            className="px-3 py-1 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-[11px] transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
          >
            Switch to Preventive Orders →
          </button>
        </div>
      )}

      {queueMode === 'PREVENTIVE' && complaints.length > 0 && (
        <div className="bg-teal-50/90 border border-teal-200 rounded-2xl p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-teal-950 shadow-xs">
          <div className="flex items-center space-x-2.5">
            <Building2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              <strong>Citizen Grievances Active:</strong> You have{' '}
              <span className="font-bold font-mono text-teal-900">{complaints.length}</span>{' '}
              reactive grievance ticket(s) assigned to this crew.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setQueueMode('CITIZEN')}
            className="px-3 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-[11px] transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
          >
            Switch to Citizen Grievances →
          </button>
        </div>
      )}

      {/* =========================================================================
          QUEUE MODE 1: CITIZEN GRIEVANCES (REACTIVE)
         ========================================================================= */}
      {queueMode === 'CITIZEN' && (
        <div className="space-y-4">
          {/* Sub-filter Tabs */}
          <div className="flex items-center space-x-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
            {[
              { id: 'ALL', label: `All Grievances (${complaints.length})` },
              { id: 'ASSIGNED', label: 'Pending Acceptance' },
              {
                id: 'IN_PROGRESS',
                label: `In Progress (${complaints.filter((c) => c.current_assignment?.assignment_status === 'IN_PROGRESS').length})`,
              },
              {
                id: 'COMPLETED',
                label: `Completed (${complaints.filter((c) => c.current_assignment?.assignment_status === 'COMPLETED').length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setComplaintFilterTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  complaintFilterTab === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Complaints List */}
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-500 text-xs">
              <RefreshCw className="w-8 h-8 animate-spin text-teal-700" />
              <span>Loading citizen grievance work orders...</span>
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center space-y-3 shadow-card">
              <HardHat className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No citizen complaints in this view</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {preventiveOrders.length > 0
                  ? `Your crew has ${preventiveOrders.length} active Preventive Maintenance work order(s) waiting in the Predictive AI queue!`
                  : 'You currently have no tasks matching this filter. Switch tabs or refresh the queue.'}
              </p>
              {preventiveOrders.length > 0 && (
                <button
                  type="button"
                  onClick={() => setQueueMode('PREVENTIVE')}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer mt-2"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>View {preventiveOrders.length} Preventive Maintenance Orders →</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredComplaints.map((item) => {
                const assignment = item.current_assignment;
                const assignStatus = assignment?.assignment_status || 'ASSIGNED';
                const sla = item.sla_metrics;
                const isProcessing = actionInProgress[assignment?.id];

                return (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-card hover:shadow-elevation transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Row: Category, Tracking ID & SLA */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-teal-900 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                            {item.tracking_id}
                          </span>
                          <SeverityBadge level={item.severity_level} score={item.severity_score} />
                        </div>

                        {sla?.status && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              sla.status === 'ON_TIME'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sla.status === 'AT_RISK'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            SLA: {sla.status.replace('_', ' ')}
                          </span>
                        )}
                      </div>

                      {/* Category & Location */}
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                          <Building2 className="w-4 h-4 text-teal-700" />
                          <span>{item.category?.name || 'Civic Infrastructure Issue'}</span>
                        </h4>
                        <div className="flex items-center space-x-1 text-xs text-slate-500 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                          <span className="truncate">{item.address || `Ward ${item.ward_id || 'Zone'}`}</span>
                        </div>
                      </div>

                      {/* Citizen Text */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 italic">
                        "{item.translated_text || item.raw_text}"
                      </div>

                      {/* Assignment Notes if any */}
                      {assignment?.notes && (
                        <div className="text-[11px] text-indigo-900 bg-indigo-50/70 border border-indigo-200 rounded-xl p-2.5 space-y-0.5">
                          <span className="font-bold block">Dispatch Instructions:</span>
                          <span>{assignment.notes}</span>
                        </div>
                      )}

                      {/* Assignment Progress Milestones */}
                      <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 border-t border-slate-100">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Assigned: {new Date(assignment?.assigned_at || item.created_at).toLocaleDateString()}</span>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            assignStatus === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : assignStatus === 'IN_PROGRESS'
                              ? 'bg-blue-100 text-blue-800'
                              : assignStatus === 'ACCEPTED'
                              ? 'bg-cyan-100 text-cyan-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          Status: {assignStatus}
                        </span>
                      </div>
                    </div>

                    {/* Workflow Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                      {assignStatus === 'ASSIGNED' && (
                        <button
                          onClick={() => handleAcceptComplaint(assignment.id)}
                          disabled={isProcessing}
                          className="w-full flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{isProcessing ? 'Accepting...' : 'Accept Assignment'}</span>
                        </button>
                      )}

                      {assignStatus === 'ACCEPTED' && (
                        <button
                          onClick={() => handleStartComplaint(assignment.id)}
                          disabled={isProcessing}
                          className="w-full flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>{isProcessing ? 'Starting...' : 'Start On-Site Work'}</span>
                        </button>
                      )}

                      {assignStatus === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleOpenResolutionModal(item, assignment)}
                          className="w-full flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Upload Proof & Complete</span>
                        </button>
                      )}

                      {assignStatus === 'COMPLETED' && (
                        <div className="w-full flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                          <span className="flex items-center space-x-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Work Completed & Verified</span>
                          </span>
                          {item.citizen_feedback && (
                            <div className="flex items-center space-x-1 text-amber-600">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{item.citizen_feedback.rating}.0 Rating</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          QUEUE MODE 2: PREVENTIVE MAINTENANCE ORDERS (PREDICTIVE AI)
         ========================================================================= */}
      {queueMode === 'PREVENTIVE' && (
        <div className="space-y-4">
          {/* Sub-filter Tabs */}
          <div className="flex items-center space-x-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
            {[
              { id: 'ALL', label: `All Preventive Orders (${preventiveOrders.length})` },
              {
                id: 'ASSIGNED',
                label: `Assigned (${preventiveOrders.filter((o) => o.status === 'ASSIGNED').length})`,
              },
              {
                id: 'ACCEPTED',
                label: `Accepted (${preventiveOrders.filter((o) => o.status === 'ACCEPTED').length})`,
              },
              {
                id: 'IN_PROGRESS',
                label: `In Progress (${preventiveOrders.filter((o) => o.status === 'IN_PROGRESS').length})`,
              },
              {
                id: 'COMPLETED',
                label: `Completed (${preventiveOrders.filter((o) => o.status === 'COMPLETED').length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPreventiveFilterTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  preventiveFilterTab === tab.id
                    ? 'bg-purple-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Orders List */}
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-500 text-xs">
              <RefreshCw className="w-8 h-8 animate-spin text-purple-700" />
              <span>Loading preventive work orders...</span>
            </div>
          ) : filteredPreventiveOrders.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center space-y-3 shadow-card">
              <Wrench className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No preventive orders in this view</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {complaints.length > 0
                  ? `Your crew has ${complaints.length} active Citizen Grievance ticket(s) waiting in the Citizen queue!`
                  : 'No predictive infrastructure work orders match this status filter.'}
              </p>
              {complaints.length > 0 && (
                <button
                  type="button"
                  onClick={() => setQueueMode('CITIZEN')}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer mt-2"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>View {complaints.length} Citizen Grievances →</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPreventiveOrders.map((order) => {
                const isProcessing = actionInProgress[`prev_${order.id}`];
                const status = order.status;

                return (
                  <div
                    key={order.id}
                    className="bg-white border border-purple-100 rounded-3xl p-5 shadow-card hover:shadow-elevation transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Row: Order ID, Priority & Scheduled Date */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-purple-900 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-md">
                            {order.order_number}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              order.priority === 'CRITICAL'
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : order.priority === 'HIGH'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {order.priority} PRIORITY
                          </span>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : status === 'IN_PROGRESS'
                              ? 'bg-blue-100 text-blue-800'
                              : status === 'ACCEPTED'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          Status: {status}
                        </span>
                      </div>

                      {/* Asset Details */}
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                          <Building2 className="w-4 h-4 text-purple-700" />
                          <span>{order.asset?.name || `Infrastructure Asset #${order.asset_id}`}</span>
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                          <span className="font-mono text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                            {order.asset?.asset_code}
                          </span>
                          <span>•</span>
                          <span className="font-medium text-slate-700">{order.asset?.asset_type}</span>
                          <span>•</span>
                          <div className="flex items-center space-x-0.5">
                            <MapPin className="w-3 h-3 text-purple-600 shrink-0" />
                            <span>Ward {order.asset?.ward_id || 'Zone'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Predictive Reason / Trigger */}
                      <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 flex items-center space-x-1">
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          <span>Predictive AI Trigger Justification:</span>
                        </span>
                        <p className="text-xs text-purple-950 font-medium leading-relaxed">
                          {order.reason}
                        </p>
                      </div>

                      {/* Recommended Action Scope */}
                      {order.recommended_action && (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1">
                            <Wrench className="w-3 h-3 text-slate-500" />
                            <span>Prescribed Maintenance Action:</span>
                          </span>
                          <p className="text-xs text-slate-800">{order.recommended_action}</p>
                        </div>
                      )}

                      {/* Execution Notes / Audit Log if any */}
                      {order.notes && (
                        <div className="p-2.5 bg-slate-100/80 rounded-xl text-[11px] text-slate-600 space-y-0.5">
                          <span className="font-bold text-slate-700 block">Crew Service Logs:</span>
                          <p className="italic">{order.notes}</p>
                        </div>
                      )}

                      {/* Scheduled Target Date & Department */}
                      <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 border-t border-slate-100">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>
                            Target Date: {order.scheduled_date ? new Date(order.scheduled_date).toLocaleDateString() : 'Immediate'}
                          </span>
                        </span>
                        <span className="text-slate-600 font-medium">
                          {order.department?.name || 'Public Works Department'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons for Predictive Workflow */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                      {status === 'ASSIGNED' && (
                        <button
                          onClick={() => handleAcceptPreventive(order.id)}
                          disabled={isProcessing}
                          className="w-full flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{isProcessing ? 'Accepting Order...' : 'Accept Preventive Order'}</span>
                        </button>
                      )}

                      {status === 'ACCEPTED' && (
                        <button
                          onClick={() => handleStartPreventive(order.id)}
                          disabled={isProcessing}
                          className="w-full flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>{isProcessing ? 'Deploying...' : 'Start Servicing On-Site'}</span>
                        </button>
                      )}

                      {status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleOpenPreventiveModal(order)}
                          className="w-full flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>Complete & Log Service</span>
                        </button>
                      )}

                      {status === 'COMPLETED' && (
                        <div className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                          <span className="flex items-center space-x-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Serviced & AHI Health Baseline Restored</span>
                          </span>
                          {order.completed_at && (
                            <span className="text-[10px] text-emerald-700 font-normal">
                              {new Date(order.completed_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal for uploading resolution evidence & completing reactive complaints */}
      {resolutionModalOpen && (
        <ResolutionUploadModal
          complaint={selectedComplaintForModal}
          assignment={selectedAssignmentForModal}
          isOpen={resolutionModalOpen}
          onClose={() => {
            setResolutionModalOpen(false);
            setSelectedComplaintForModal(null);
            setSelectedAssignmentForModal(null);
          }}
          onSuccess={() => {
            showToast('Resolution proof uploaded and work completed successfully!');
            fetchData();
          }}
        />
      )}

      {/* Modal for logging preventive maintenance completion */}
      {preventiveModalOpen && (
        <PreventiveCompletionModal
          order={selectedOrderForModal}
          isOpen={preventiveModalOpen}
          onClose={() => {
            setPreventiveModalOpen(false);
            setSelectedOrderForModal(null);
          }}
          onSuccess={() => {
            showToast('Preventive maintenance recorded and asset health baseline updated!');
            fetchData();
          }}
        />
      )}
    </div>
  );
}
