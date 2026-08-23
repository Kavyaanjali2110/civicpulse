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
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { crewService } from '../services/crewService';
import { govService } from '../services/govService';
import SeverityBadge from '../components/common/SeverityBadge';
import ResolutionUploadModal from '../components/crew/ResolutionUploadModal';

export default function FieldCrewDashboard() {
  const { user } = useAuth();
  const crewId = user?.crewId || 1; // Default to Crew 1 if mock session

  const [crewInfo, setCrewInfo] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState('ALL'); // ALL, ASSIGNED, IN_PROGRESS, COMPLETED
  const [actionInProgress, setActionInProgress] = useState({});
  const [selectedComplaintForModal, setSelectedComplaintForModal] = useState(null);
  const [selectedAssignmentForModal, setSelectedAssignmentForModal] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Fetch crew info & assigned complaints
  const fetchData = useCallback(async () => {
    try {
      const [crewRes, complaintsRes] = await Promise.all([
        crewService.getCrewInfo(crewId).catch(() => null),
        crewService.getAssignedComplaints(crewId).catch(() => []),
      ]);

      if (crewRes) setCrewInfo(crewRes);
      setComplaints(complaintsRes || []);
    } catch (err) {
      console.error('Failed to fetch crew dashboard data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [crewId]);

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

  // Crew accepts assignment
  const handleAccept = async (assignmentId) => {
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

  // Crew starts work
  const handleStart = async (assignmentId) => {
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

  // Open evidence upload modal
  const handleOpenCompleteModal = (complaint, assignment) => {
    setSelectedComplaintForModal(complaint);
    setSelectedAssignmentForModal(assignment);
    setModalOpen(true);
  };

  // Filter complaints based on tab
  const filteredComplaints = complaints.filter((c) => {
    const currentAssign = c.current_assignment;
    const status = currentAssign?.assignment_status || 'ASSIGNED';

    if (filterTab === 'ALL') return true;
    if (filterTab === 'ASSIGNED') return status === 'ASSIGNED' || status === 'ACCEPTED';
    if (filterTab === 'IN_PROGRESS') return status === 'IN_PROGRESS';
    if (filterTab === 'COMPLETED') return status === 'COMPLETED';
    return true;
  });

  // Calculate quick stats
  const totalAssigned = complaints.length;
  const inProgressCount = complaints.filter(
    (c) => c.current_assignment?.assignment_status === 'IN_PROGRESS'
  ).length;
  const completedCount = complaints.filter(
    (c) => c.current_assignment?.assignment_status === 'COMPLETED'
  ).length;

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

          <div className="flex items-center space-x-3">
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
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Work Orders
          </span>
          <div className="text-2xl font-bold font-mono text-slate-900">{totalAssigned}</div>
          <p className="text-[11px] text-slate-400">Assigned to this unit</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card space-y-1">
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
            In Progress (On-Site)
          </span>
          <div className="text-2xl font-bold font-mono text-blue-800">{inProgressCount}</div>
          <p className="text-[11px] text-slate-400">Active repairs</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card space-y-1">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
            Resolved & Verified
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-800">{completedCount}</div>
          <p className="text-[11px] text-slate-400">With photo proof</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card space-y-1">
          <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">
            Unit Readiness
          </span>
          <div className="text-2xl font-bold font-mono text-teal-800">
            {crewInfo?.current_status || 'AVAILABLE'}
          </div>
          <p className="text-[11px] text-slate-400">Radio contact active</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'ALL', label: `All Orders (${complaints.length})` },
          { id: 'ASSIGNED', label: 'Pending Acceptance / Dispatched' },
          { id: 'IN_PROGRESS', label: `In Progress (${inProgressCount})` },
          { id: 'COMPLETED', label: `Completed (${completedCount})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              filterTab === tab.id
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
          <span>Loading assigned work orders...</span>
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center space-y-3 shadow-card">
          <HardHat className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No work orders in this view</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You currently have no tasks matching this filter. Switch tabs or refresh the queue.
          </p>
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
                      onClick={() => handleAccept(assignment.id)}
                      disabled={isProcessing}
                      className="w-full flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{isProcessing ? 'Accepting...' : 'Accept Assignment'}</span>
                    </button>
                  )}

                  {assignStatus === 'ACCEPTED' && (
                    <button
                      onClick={() => handleStart(assignment.id)}
                      disabled={isProcessing}
                      className="w-full flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>{isProcessing ? 'Starting...' : 'Start On-Site Work'}</span>
                    </button>
                  )}

                  {assignStatus === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleOpenCompleteModal(item, assignment)}
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

      {/* Modal for uploading resolution evidence & completing */}
      {modalOpen && (
        <ResolutionUploadModal
          complaint={selectedComplaintForModal}
          assignment={selectedAssignmentForModal}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedComplaintForModal(null);
            setSelectedAssignmentForModal(null);
          }}
          onSuccess={() => {
            showToast('Resolution proof uploaded and work completed successfully!');
            fetchData();
          }}
        />
      )}
    </div>
  );
}
