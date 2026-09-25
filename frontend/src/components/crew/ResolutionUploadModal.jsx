import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Camera,
  CheckCircle2,
  Upload,
  Loader2,
  AlertCircle,
  Sparkles,
  FileText,
  ShieldCheck,
  Image as ImageIcon
} from 'lucide-react';
import { crewService } from '../../services/crewService';
import { broadcastResolution } from '../../utils/syncChannel';

// Preset high quality civic repair images for rapid demo verification
const DEMO_PRESETS = [
  {
    label: 'Water Pipe Burst & Replacement',
    before: 'https://images.unsplash.com/photo-1542013936693-884638332954?w=600&auto=format&fit=crop&q=80',
    after: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600&auto=format&fit=crop&q=80',
    notes: 'Excavated 1.2m depth, replaced ruptured 6-inch ductile iron main collar, restored system pressure to 4.2 bar.',
  },
  {
    label: 'Road Pothole Asphalt Patch',
    before: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80',
    after: 'https://images.unsplash.com/photo-1578961924611-300fb25c381c?w=600&auto=format&fit=crop&q=80',
    notes: 'Cleaned base aggregate, applied hot bituminous asphalt tack coat, rolled and leveled 4m x 2m asphalt patch.',
  },
  {
    label: 'High-Voltage Streetlight / Transformer Repair',
    before: 'https://images.unsplash.com/photo-1516216628859-9bcceabb84ca?w=600&auto=format&fit=crop&q=80',
    after: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&auto=format&fit=crop&q=80',
    notes: 'Replaced faulty 150W LED driver assembly and reset junction breaker. Verified nighttime illumination.',
  },
];

export default function ResolutionUploadModal({
  complaint,
  assignment,
  isOpen,
  onClose,
  onSuccess,
}) {
  const [beforePhoto, setBeforePhoto] = useState('');
  const [afterPhoto, setAfterPhoto] = useState('');
  const [description, setDescription] = useState('');
  const [officerName, setOfficerName] = useState('Vikram Salve (Leader)');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose();
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

  useEffect(() => {
    if (isOpen) {
      setError(null);
      // Pre-fill initial photo from complaint if available
      if (complaint?.image_url) {
        setBeforePhoto(complaint.image_url);
      }
    }
  }, [isOpen, complaint]);

  if (!isOpen || !complaint || !assignment) return null;

  const handleApplyPreset = (preset) => {
    setBeforePhoto(preset.before);
    setAfterPhoto(preset.after);
    setDescription(preset.notes);
    setError(null);
  };

  const handleSubmitResolution = async (e) => {
    e.preventDefault();

    if (!afterPhoto.trim()) {
      setError('Resolution After-Photo is required as proof of physical completion.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a brief description of the repair work done.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Upload resolution evidence
      await crewService.uploadResolutionEvidence(complaint.id, {
        before_photo: beforePhoto.trim() || undefined,
        after_photo: afterPhoto.trim(),
        description: description.trim(),
        uploaded_by: officerName.trim() || 'Field Crew Officer',
      });

      // 2. Complete the crew assignment & transition complaint to RESOLVED
      await crewService.completeAssignment(assignment.id, {
        changed_by: officerName.trim() || 'Field Crew Officer',
        notes: `Work completed on-site. Proof submitted: ${description.trim().slice(0, 80)}...`,
      });

      // Broadcast resolution event to any open Government Dashboard tabs in the browser
      broadcastResolution({
        complaintId: complaint.id,
        trackingId: complaint.tracking_id,
        assignmentId: assignment.id,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to submit resolution evidence', err);
      setError(err.response?.data?.detail || 'Failed to complete resolution workflow.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-elevation relative overflow-hidden space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Submit Resolution Proof & Complete
              </h3>
              <p className="text-xs text-slate-500">
                Ticket <span className="font-mono font-bold text-teal-800">{complaint.tracking_id}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Autofill Presets for Field Demos */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-600 font-bold uppercase tracking-wider">
            <span className="flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Quick Preset Autofill</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DEMO_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-teal-400 text-slate-700 hover:text-teal-900 text-[11px] font-medium transition-all cursor-pointer shadow-xs"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="flex items-center space-x-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmitResolution} className="space-y-4 text-xs">
          {/* Photo Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Before Photo Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Before Photo (Optional / Initial)
              </label>
              <input
                type="url"
                value={beforePhoto}
                onChange={(e) => setBeforePhoto(e.target.value)}
                placeholder="https://...before_photo.jpg"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 font-sans"
              />
              {beforePhoto && (
                <div className="aspect-video rounded-xl bg-slate-100 border border-slate-200 overflow-hidden mt-1">
                  <img
                    src={beforePhoto}
                    alt="Before preview"
                    className="w-full h-full object-cover"
                    onError={() => {}}
                  />
                </div>
              )}
            </div>

            {/* After Photo Input (Required) */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                After Photo Proof (Required) *
              </label>
              <input
                type="url"
                value={afterPhoto}
                onChange={(e) => setAfterPhoto(e.target.value)}
                placeholder="https://...after_repaired.jpg"
                className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-sans"
                required
              />
              {afterPhoto && (
                <div className="aspect-video rounded-xl bg-emerald-50 border border-emerald-200 overflow-hidden mt-1">
                  <img
                    src={afterPhoto}
                    alt="After preview"
                    className="w-full h-full object-cover"
                    onError={() => {}}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Officer Name */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Reporting Crew Lead
            </label>
            <input
              type="text"
              value={officerName}
              onChange={(e) => setOfficerName(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
              required
            />
          </div>

          {/* Description of Work Done */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Work Completed Summary & Technical Details *
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe physical repairs performed, parts replaced, and site cleanup..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none font-medium"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !afterPhoto.trim() || !description.trim()}
              className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Proof...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verify Proof & Mark Resolved</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
