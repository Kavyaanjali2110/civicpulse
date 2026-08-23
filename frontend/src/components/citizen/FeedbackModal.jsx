import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Copy, Check, Sparkles, Clock, ArrowRight, X, ShieldAlert, Cpu } from 'lucide-react';
import SeverityBadge from '../common/SeverityBadge';
import { useLanguage } from '../../context/LanguageContext';

export default function FeedbackModal({ data, isOpen, onClose, onTrackNow }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

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

  if (!isOpen || !data) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(data.tracking_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-elevation relative overflow-hidden space-y-5">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-600 to-emerald-500" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close confirmation dialog"
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Success Icon & Title */}
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 id="feedback-modal-title" className="text-lg font-bold text-slate-900 tracking-tight">
              {t('success_title')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {data.message}
            </p>
          </div>
        </div>

        {/* Tracking ID Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              {t('tracking_id_label')}
            </div>
            <div className="text-xl font-mono font-bold text-teal-800 mt-0.5 select-all">
              {data.tracking_id}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy tracking ID to clipboard"
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              copied
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-teal-700 hover:bg-teal-800 text-white shadow-sm'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{t('copied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{t('copy_tracking')}</span>
              </>
            )}
          </button>
        </div>

        {/* AI Intelligence Summary Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Cpu className="w-4 h-4 text-teal-700" />
            <span>{t('ai_analysis_title')}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            {/* Category */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">{t('category_detected')}</span>
              <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                {data.predicted_category}
              </span>
            </div>

            {/* Severity */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">{t('severity_level')}</span>
              <div className="mt-1">
                <SeverityBadge level={data.severity_level} score={data.severity_score} />
              </div>
            </div>

            {/* Priority Score */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">Priority (IPS)</span>
              <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">
                {data.priority_score.toFixed(1)} / 100
              </span>
            </div>
          </div>

          {/* Subcategory & SLA Target */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200 text-xs">
            <div className="flex items-center space-x-1.5 text-slate-600">
              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
              <span>Entity: <strong className="text-slate-900">{data.subcategory || 'General Issue'}</strong></span>
            </div>
            <div className="flex items-center space-x-1 text-emerald-700 font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>SLA: {data.estimated_sla_hours} Hours</span>
            </div>
          </div>

          {data.is_duplicate && (
            <div className="flex items-center space-x-1.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{t('duplicate_notice')} (Increases urgency weight).</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onTrackNow(data.tracking_id);
            }}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <span>Track Grievance Timeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
