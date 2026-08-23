import React from 'react';
import { Camera, CheckCircle2, UserCheck, Calendar, Star, FileText, Sparkles } from 'lucide-react';

export default function ResolutionEvidenceViewer({ evidenceList = [], feedback = null }) {
  if (!evidenceList || evidenceList.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
          <Camera className="w-4 h-4 text-teal-700" />
          <span>Verified Resolution Evidence</span>
        </div>
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Work Verified</span>
        </span>
      </div>

      {evidenceList.map((ev, idx) => (
        <div key={ev.id || idx} className="space-y-3">
          {/* Photo Comparison Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Before Photo */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase">
                <span>Before (Reported Hazard)</span>
              </div>
              <div className="aspect-video rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative group">
                {ev.before_photo ? (
                  <img
                    src={ev.before_photo}
                    alt="Before Repair Proof"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                    <Camera className="w-6 h-6 mb-1" />
                    <span>Initial report photo</span>
                  </div>
                )}
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[10px] font-bold">
                  BEFORE
                </span>
              </div>
            </div>

            {/* After Photo */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 uppercase">
                <span>After (Field Crew Resolution)</span>
              </div>
              <div className="aspect-video rounded-xl bg-emerald-50/40 border border-emerald-200 overflow-hidden relative group">
                {ev.after_photo ? (
                  <img
                    src={ev.after_photo}
                    alt="After Repair Proof"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-emerald-600 text-xs">
                    <CheckCircle2 className="w-6 h-6 mb-1" />
                    <span>Resolution completed</span>
                  </div>
                )}
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-emerald-700/90 text-white text-[10px] font-bold">
                  AFTER REPAIR
                </span>
              </div>
            </div>
          </div>

          {/* Description & Crew Note */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-semibold text-slate-800 flex items-center space-x-1">
                <UserCheck className="w-3.5 h-3.5 text-teal-700" />
                <span>Uploaded by: {ev.uploaded_by}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{new Date(ev.uploaded_at).toLocaleString()}</span>
              </span>
            </div>
            <p className="text-slate-700 leading-relaxed font-medium">
              "{ev.description}"
            </p>
          </div>
        </div>
      ))}

      {/* Citizen Feedback Banner if available */}
      {feedback && (
        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 text-amber-900 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Citizen Satisfaction Review</span>
            </div>
            <div className="flex items-center space-x-0.5 text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3.5 h-3.5 ${
                    star <= feedback.rating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300'
                  }`}
                />
              ))}
              <span className="ml-1 text-xs font-bold text-amber-900">{feedback.rating}.0 / 5</span>
            </div>
          </div>
          {feedback.feedback && (
            <p className="text-slate-700 italic text-[11px]">
              "{feedback.feedback}" — <span className="font-semibold text-slate-900">{feedback.citizen_name || 'Citizen'}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
