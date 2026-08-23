import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  UserCheck, 
  FileText, 
  Loader2,
  AlertCircle,
  HardHat,
  Camera,
  Star,
  Sparkles,
  Calendar
} from 'lucide-react';
import SeverityBadge from '../common/SeverityBadge';
import ResolutionEvidenceViewer from './ResolutionEvidenceViewer';
import { govService } from '../../services/govService';

export default function StatusUpdateModal({ complaint, isOpen, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('update'); // 'update' | 'evidence' | 'timeline'
  const [newStatus, setNewStatus] = useState('INVESTIGATING');
  const [officerName, setOfficerName] = useState('Officer R. Verma');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Sync state with selected complaint
  useEffect(() => {
    if (complaint) {
      setNewStatus(complaint.status || 'INVESTIGATING');
      setNotes('');
      setError(null);
      if (complaint.resolution_evidences?.length > 0) {
        setActiveTab('evidence');
      } else {
        setActiveTab('update');
      }
    }
  }, [complaint]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !complaint) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await govService.updateComplaintStatus(complaint.id, {
        status: newStatus,
        changed_by: officerName.trim() || 'Municipal Operations',
        notes: notes.trim() || undefined,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to update status", err);
      setError(err.response?.data?.detail || "Failed to update complaint status.");
    } finally {
      setSubmitting(false);
    }
  };

  const hasEvidence = complaint.resolution_evidences && complaint.resolution_evidences.length > 0;
  const hasFeedback = !!complaint.citizen_feedback;
  const assignedCrew = complaint.current_assignment?.crew;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-elevation relative overflow-hidden space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <span id="status-modal-title" className="font-mono font-bold text-base text-slate-900">
              {complaint.tracking_id}
            </span>
            <SeverityBadge level={complaint.severity_level} score={complaint.severity_score} />
            {complaint.sla_metrics?.status && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  complaint.sla_metrics.status === 'ON_TIME'
                    ? 'bg-emerald-100 text-emerald-800'
                    : complaint.sla_metrics.status === 'AT_RISK'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                SLA: {complaint.sla_metrics.status.replace('_', ' ')}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close status update dialog"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('update')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'update'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Workflow Status
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('evidence')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'evidence'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-teal-400" />
            <span>Resolution Proof ({complaint.resolution_evidences?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Audit Timeline</span>
          </button>
        </div>

        {/* Complaint Context Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>Category: <strong className="text-slate-800 font-bold">{complaint.category?.name || complaint.category}</strong></span>
            <span>Priority (IPS): <strong className="text-slate-900 font-mono font-bold">{complaint.priority_score.toFixed(1)}/100</strong></span>
          </div>

          <p className="text-slate-700 italic leading-relaxed font-medium">
            "{complaint.translated_text || complaint.summary || complaint.raw_text}"
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-200">
            <div className="flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-teal-700" />
              <span>{complaint.address || `${complaint.latitude?.toFixed(4)}, ${complaint.longitude?.toFixed(4)}`}</span>
            </div>
            {assignedCrew && (
              <div className="flex items-center space-x-1.5 text-indigo-900 font-bold">
                <HardHat className="w-3.5 h-3.5 text-indigo-600" />
                <span>Assigned: {assignedCrew.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab 1: Update Status Form */}
        {activeTab === 'update' && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Select Updated Workflow Status:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['RECEIVED', 'INVESTIGATING', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setNewStatus(st)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                      newStatus === st
                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm ring-2 ring-slate-900 ring-offset-1'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Authorizing Officer:
                </label>
                <input
                  type="text"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-all font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resolution / Dispatch Notes:
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Field crew dispatched with repair vehicle."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-all font-sans"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Commit Status &amp; Audit Log</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Resolution Evidence Viewer */}
        {activeTab === 'evidence' && (
          <div className="space-y-4">
            {hasEvidence ? (
              <ResolutionEvidenceViewer
                evidenceList={complaint.resolution_evidences}
                feedback={complaint.citizen_feedback}
              />
            ) : (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs text-slate-500">
                <Camera className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-700">No Resolution Evidence Uploaded Yet</p>
                <p>Field crew will submit before/after photo proof upon on-site repair completion.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Lifecycle Timeline */}
        {activeTab === 'timeline' && (
          <div className="space-y-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div className="flex items-center space-x-2 font-bold text-slate-800 pb-2 border-b border-slate-200">
              <Clock className="w-4 h-4 text-teal-700" />
              <span>Full Resolution Lifecycle Trail</span>
            </div>

            <div className="space-y-2.5">
              {/* Intake */}
              <div className="flex items-start space-x-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-600 mt-1 shrink-0" />
                <div>
                  <span className="font-bold text-slate-800">Complaint Registered &amp; AI Triaged</span>
                  <span className="text-[10px] text-slate-400 block">
                    {new Date(complaint.created_at).toLocaleString()} • Severity {complaint.severity_level} (IPS {complaint.priority_score?.toFixed(1)})
                  </span>
                </div>
              </div>

              {/* Assignment */}
              {complaint.crew_assignments?.map((a) => (
                <React.Fragment key={a.id}>
                  <div className="flex items-start space-x-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-1 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-800">Field Crew Dispatched: {a.crew?.name}</span>
                      <span className="text-[10px] text-slate-400 block">
                        Assigned by {a.assigned_by} at {new Date(a.assigned_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {a.accepted_at && (
                    <div className="flex items-start space-x-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-600 mt-1 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-800">Crew Acknowledged &amp; En Route</span>
                        <span className="text-[10px] text-slate-400 block">
                          Accepted at {new Date(a.accepted_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {a.started_at && (
                    <div className="flex items-start space-x-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-800">On-Site Work Started</span>
                        <span className="text-[10px] text-slate-400 block">
                          Started at {new Date(a.started_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {a.completed_at && (
                    <div className="flex items-start space-x-2.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 mt-1 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-800">Work Completed &amp; Evidence Verified</span>
                        <span className="text-[10px] text-slate-400 block">
                          Resolved at {new Date(a.completed_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}

              {/* Citizen feedback */}
              {complaint.citizen_feedback && (
                <div className="flex items-start space-x-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800">Citizen Satisfaction Feedback Received</span>
                    <span className="text-[10px] text-slate-400 block">
                      Rated {complaint.citizen_feedback.rating} / 5 stars by {complaint.citizen_feedback.citizen_name || 'Citizen'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
