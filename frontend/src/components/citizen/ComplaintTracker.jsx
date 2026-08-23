import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  FileText, 
  ShieldCheck, 
  UserCheck, 
  Calendar,
  Layers,
  ArrowRight,
  Loader2,
  Star,
  Camera,
  HardHat,
  Send,
  Sparkles
} from 'lucide-react';
import SeverityBadge from '../common/SeverityBadge';
import ResolutionEvidenceViewer from '../dashboard/ResolutionEvidenceViewer';
import { citizenService } from '../../services/citizenService';
import { useLanguage } from '../../context/LanguageContext';

const STATUS_STEPS = [
  { key: 'RECEIVED', label: 'Received' },
  { key: 'INVESTIGATING', label: 'Investigating' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'RESOLVED', label: 'Resolved' },
];

export default function ComplaintTracker({ initialTrackingId = '' }) {
  const { t } = useLanguage();
  const [trackingId, setTrackingId] = useState(initialTrackingId);
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Rating & Feedback State for Resolved Complaints
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [citizenName, setCitizenName] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);

  useEffect(() => {
    if (initialTrackingId) {
      setTrackingId(initialTrackingId);
      fetchComplaint(initialTrackingId);
    }
  }, [initialTrackingId]);

  const fetchComplaint = async (idToFetch) => {
    const id = (idToFetch || trackingId).trim();
    if (!id) return;

    setLoading(true);
    setError(null);
    setFeedbackSuccess(false);
    setFeedbackError(null);

    try {
      const data = await citizenService.trackComplaint(id);
      setComplaint(data);
      if (data.citizen_name) {
        setCitizenName(data.citizen_name);
      }
    } catch (err) {
      console.error("Tracking error", err);
      setComplaint(null);
      setError(
        err.response?.data?.detail || `No grievance found with Tracking ID '${id.toUpperCase()}'. Please check the code.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchComplaint();
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!complaint) return;

    setSubmittingFeedback(true);
    setFeedbackError(null);

    try {
      const fbData = await citizenService.submitFeedback(complaint.tracking_id, {
        rating: parseInt(rating, 10),
        feedback: feedbackText.trim() || undefined,
        citizen_name: citizenName.trim() || undefined,
      });

      setComplaint((prev) => ({
        ...prev,
        citizen_feedback: fbData,
      }));
      setFeedbackSuccess(true);
    } catch (err) {
      console.error("Feedback submit error", err);
      setFeedbackError(
        err.response?.data?.detail || 'Failed to submit satisfaction rating.'
      );
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const getStepStatus = (stepKey, currentStatus) => {
    const statusOrder = ['RECEIVED', 'INVESTIGATING', 'IN_PROGRESS', 'RESOLVED'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf(stepKey);

    if (currentStatus === 'REJECTED') {
      return stepKey === 'RECEIVED' ? 'completed' : 'rejected';
    }

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  const isResolved = complaint?.status === 'RESOLVED';
  const hasExistingFeedback = !!complaint?.citizen_feedback;
  const sla = complaint?.sla_metrics;
  const assignedCrew = complaint?.current_assignment?.crew;

  return (
    <div className="space-y-6">
      {/* Search Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-card space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {t('tracking_heading')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t('tracking_subheading')}
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              placeholder={t('tracking_placeholder')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-all"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50 cursor-pointer shrink-0"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{t('track_btn')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Quick Sample IDs */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span>Sample active tracking codes:</span>
          {['CP-2026-W101', 'CP-2026-R102', 'CP-2026-E102', 'CP-2026-G502'].map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setTrackingId(code);
                fetchComplaint(code);
              }}
              className="font-mono text-teal-700 hover:text-teal-900 font-semibold underline cursor-pointer"
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2.5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Complaint Detail Card */}
      {complaint && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-card space-y-6 animate-in fade-in duration-300">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2.5">
                <span className="font-mono font-bold text-lg text-teal-900 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-lg">
                  {complaint.tracking_id}
                </span>
                <SeverityBadge level={complaint.severity_level} score={complaint.severity_score} />
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
              <p className="text-xs text-slate-500 mt-1.5">
                Category: <strong className="text-slate-800 font-semibold">{complaint.category?.name}</strong> • Reported on {new Date(complaint.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {assignedCrew && (
                <div className="flex items-center space-x-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3.5 py-2 text-xs">
                  <HardHat className="w-4 h-4 text-indigo-700 shrink-0" />
                  <div className="text-left">
                    <div className="text-indigo-500 text-[10px] uppercase font-bold">Assigned Unit</div>
                    <div className="font-bold text-indigo-950">{assignedCrew.name}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
                <Clock className="w-4 h-4 text-teal-700 shrink-0" />
                <div className="text-right text-xs">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Target SLA</div>
                  <div className="font-bold text-slate-800">{complaint.category?.default_sla_hours || 48} Hours</div>
                </div>
              </div>
            </div>
          </div>

          {/* Workflow Progress Steps */}
          <div className="py-2">
            <div className="grid grid-cols-4 gap-2 relative">
              {STATUS_STEPS.map((step, idx) => {
                const state = getStepStatus(step.key, complaint.status);
                return (
                  <div key={step.key} className="flex flex-col items-center text-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                        state === 'completed'
                          ? 'bg-emerald-600 text-white'
                          : state === 'current'
                          ? 'bg-teal-700 text-white ring-4 ring-teal-100'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {state === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-semibold mt-2 ${
                        state === 'current'
                          ? 'text-teal-800 font-bold'
                          : state === 'completed'
                          ? 'text-emerald-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resolution Evidence Display */}
          {complaint.resolution_evidences && complaint.resolution_evidences.length > 0 && (
            <ResolutionEvidenceViewer
              evidenceList={complaint.resolution_evidences}
              feedback={complaint.citizen_feedback}
            />
          )}

          {/* 5-Star Citizen Rating & Feedback Box (Available for Resolved Grievances) */}
          {isResolved && !hasExistingFeedback && (
            <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/50 border border-amber-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-950">
                      Rate Your Resolution Experience
                    </h3>
                    <p className="text-xs text-amber-800/80">
                      Your satisfaction rating helps improve municipal field crew response quality.
                    </p>
                  </div>
                </div>
              </div>

              {feedbackSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Thank you for your feedback! Your review has been logged with municipal oversight.</span>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="space-y-4 text-xs">
                  {feedbackError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
                      {feedbackError}
                    </div>
                  )}

                  {/* Interactive Star Selector */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-900">
                      Satisfaction Rating (1 to 5 Stars) *
                    </label>
                    <div className="flex items-center space-x-1.5 pt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 rounded-md transition-transform hover:scale-110 cursor-pointer"
                        >
                          <Star
                            className={`w-7 h-7 transition-colors ${
                              (hoverRating || rating) >= star
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300 hover:text-amber-200'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="font-bold font-mono text-sm text-amber-950 ml-2">
                        {rating}.0 / 5.0
                      </span>
                    </div>
                  </div>

                  {/* Feedback Textarea */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-900">
                      Citizen Review &amp; Comments
                    </label>
                    <textarea
                      rows={2}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Was the issue fixed to your satisfaction? Share any feedback regarding the field crew's timeliness or work quality..."
                      className="w-full bg-white border border-amber-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none font-sans"
                    />
                  </div>

                  {/* Submit Feedback Button */}
                  <div className="flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={submittingFeedback}
                      className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {submittingFeedback ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit Satisfaction Rating</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Grievance Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center space-x-1.5 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5 text-teal-700" />
                <span>Reported Description ({complaint.detected_language.toUpperCase()})</span>
              </div>
              <p className="text-slate-800 leading-relaxed italic font-medium">
                "{complaint.raw_text}"
              </p>
              {complaint.detected_language !== 'en' && complaint.translated_text && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">
                    AI Translation (English)
                  </span>
                  <p className="text-slate-700 mt-0.5 font-medium">
                    {complaint.translated_text}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center space-x-1.5 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-teal-700" />
                <span>Geographic Location</span>
              </div>
              <p className="text-slate-800 font-medium">
                {complaint.address || 'Location coordinates recorded'}
              </p>
              <p className="font-mono text-slate-500 text-[11px]">
                Ward: {complaint.ward_name || `Ward ${complaint.ward_id}`} • Coordinates: {complaint.latitude.toFixed(5)}, {complaint.longitude.toFixed(5)}
              </p>
              {complaint.cluster && (
                <div className="flex items-center space-x-1.5 pt-2 border-t border-slate-200 text-amber-800 text-[11px]">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Associated with Hotspot Cluster: <strong>{complaint.cluster.cluster_code}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Audit Timeline */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-teal-700" />
              <span>{t('timeline_title')}</span>
            </div>

            <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {complaint.audit_logs && complaint.audit_logs.length > 0 ? (
                complaint.audit_logs.map((log, idx) => (
                  <div key={idx} className="relative flex items-start space-x-3 pl-8">
                    <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-teal-700 border-2 border-white ring-2 ring-teal-100" />
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex-1 text-xs">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-slate-800 flex items-center space-x-1">
                          <UserCheck className="w-3 h-3 text-teal-700" />
                          <span>{log.changed_by || 'Municipal Operations'}</span>
                        </span>
                        <span className="text-slate-400">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-teal-800 font-semibold mb-0.5">
                        Status changed: <span className="font-bold text-slate-900">{log.new_status}</span>
                      </div>
                      {log.notes && (
                        <p className="text-slate-600 text-[11px] mt-1 italic">
                          "{log.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 pl-8">{t('no_logs')}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
