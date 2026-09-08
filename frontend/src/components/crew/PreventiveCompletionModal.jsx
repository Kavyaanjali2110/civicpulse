import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Wrench,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Calendar,
  Building2
} from 'lucide-react';
import { predictiveService } from '../../services/predictiveService';

const PREVENTIVE_NOTES_PRESETS = [
  {
    label: 'Pump & Mechanical Seal Overhaul',
    text: 'Replaced worn ceramic seals and drive coupling. Calibrated pressure discharge to 4.5 bar baseline. Telemetry vibration normalized below 0.12 IPS.',
  },
  {
    label: 'Electrical Transformer Insulator Service',
    text: 'Replaced cracked ceramic bushings and refilled dielectric insulating oil. Tested thermal core under 120% nominal load with zero hotspot formation.',
  },
  {
    label: 'Road Subsurface Drainage Repair',
    text: 'Flushed culvert inlet, reinforced reinforced-concrete wingwall, and sealed road shoulder fractures to eliminate water infiltration.',
  },
  {
    label: 'Structural Sluice Gate Lubrication & Alignment',
    text: 'Regreased mechanical worm drives, verified dual backup motor interlocks, and cleared debris screens. Full actuation test passed.',
  },
];

export default function PreventiveCompletionModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}) {
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [technicianName, setTechnicianName] = useState('Vikram Salve (Lead)');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

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
      setTechnicianNotes('');
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const handleApplyPreset = (preset) => {
    setTechnicianNotes(preset.text);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!technicianNotes.trim()) {
      setError('Please provide the physical servicing notes and actions taken.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const fullNotes = `Completed by ${technicianName.trim() || 'Crew Lead'}: ${technicianNotes.trim()}`;
      await predictiveService.updatePreventiveOrderStatus(order.id, {
        new_status: 'COMPLETED',
        notes: fullNotes,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to complete preventive maintenance order', err);
      setError(err.response?.data?.detail || 'Failed to update order status to COMPLETED.');
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
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-600 via-emerald-500 to-indigo-600" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-teal-50 border border-teal-100 text-teal-700">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Log Preventive Maintenance Completion
              </h3>
              <p className="text-xs text-slate-500">
                Work Order <span className="font-mono font-bold text-teal-800">{order.order_number}</span>
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

        {/* Target Asset Summary */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">{order.asset?.name || `Asset #${order.asset_id}`}</h4>
              <p className="text-[11px] text-slate-500">
                {order.asset?.asset_code} • {order.asset?.asset_type} • Ward {order.asset?.ward_id || 'Zone'}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
            Resets AHI Baseline
          </span>
        </div>

        {/* Recommended Action Display */}
        {order.recommended_action && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
            <span className="font-bold block text-[11px] uppercase tracking-wider text-amber-800">
              Scheduled Action Scope:
            </span>
            <p>{order.recommended_action}</p>
          </div>
        )}

        {/* Quick Presets for Demo */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-600 font-bold uppercase tracking-wider">
            <span className="flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Quick Service Presets</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PREVENTIVE_NOTES_PRESETS.map((p, idx) => (
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
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Lead Servicing Technician
            </label>
            <input
              type="text"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 font-medium"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Maintenance Servicing Report & Parts Replaced *
            </label>
            <textarea
              rows={4}
              value={technicianNotes}
              onChange={(e) => setTechnicianNotes(e.target.value)}
              placeholder="Specify components replaced, calibration readings, and verification tests..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none font-medium"
              required
            />
          </div>

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
              disabled={submitting || !technicianNotes.trim()}
              className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Logging Service...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Service & Complete Order</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
