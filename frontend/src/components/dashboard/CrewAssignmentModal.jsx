import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  UserCheck,
  Building2,
  HardHat,
  MapPin,
  Clock,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Phone,
  Layers,
  Sparkles
} from 'lucide-react';
import SeverityBadge from '../common/SeverityBadge';
import { govService } from '../../services/govService';

// Category to Department Recommendation Mapping
const CATEGORY_DEPT_MAP = {
  'WATER': 'Water Supply & Drainage',
  'SEWAGE': 'Water Supply & Drainage',
  'ROADS': 'Roads & Infrastructure',
  'WASTE': 'Sanitation & Waste Management',
  'ELECTRICITY': 'Electrical & Power Grid',
  'SAFETY': 'Public Safety & Traffic Control',
};

export default function CrewAssignmentModal({ complaint, isOpen, onClose, onSuccess }) {
  const [departments, setDepartments] = useState([]);
  const [crews, setCrews] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedCrewId, setSelectedCrewId] = useState('');
  const [officerName, setOfficerName] = useState('Officer R. Verma');
  const [notes, setNotes] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Close on Escape key
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

  // Load departments & crews on open
  useEffect(() => {
    if (!isOpen || !complaint) return;

    setError(null);
    setNotes('');
    setLoadingData(true);

    Promise.all([
      govService.getDepartments({ active_only: true }),
      govService.getCrews({ active_only: true }),
    ])
      .then(([deptRes, crewRes]) => {
        setDepartments(deptRes || []);
        setCrews(crewRes || []);

        // If already assigned, pre-select current department & crew
        const currentCrew = complaint.current_assignment?.crew;
        if (currentCrew) {
          setSelectedDeptId(String(currentCrew.department_id));
          setSelectedCrewId(String(currentCrew.id));
        } else {
          // Auto-recommend department based on complaint category
          const catCode = complaint.category?.code?.toUpperCase() || complaint.category_code?.toUpperCase() || '';
          const recDeptName = CATEGORY_DEPT_MAP[catCode];
          const matchDept = deptRes.find((d) => d.name === recDeptName);

          if (matchDept) {
            setSelectedDeptId(String(matchDept.id));
            // Pre-select crew in same ward if available
            const wardCrew = crewRes.find(
              (c) => c.department_id === matchDept.id && c.ward_id === complaint.ward_id
            );
            if (wardCrew) {
              setSelectedCrewId(String(wardCrew.id));
            } else {
              const firstDeptCrew = crewRes.find((c) => c.department_id === matchDept.id);
              if (firstDeptCrew) setSelectedCrewId(String(firstDeptCrew.id));
            }
          } else if (deptRes.length > 0) {
            setSelectedDeptId(String(deptRes[0].id));
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load dispatch data', err);
        setError('Failed to load municipal departments or field crews.');
      })
      .finally(() => {
        setLoadingData(false);
      });
  }, [isOpen, complaint]);

  // Filter crews for selected department
  const filteredCrews = useMemo(() => {
    if (!selectedDeptId) return crews;
    return crews.filter((c) => String(c.department_id) === String(selectedDeptId));
  }, [crews, selectedDeptId]);

  // Selected crew object
  const selectedCrewObj = useMemo(() => {
    return crews.find((c) => String(c.id) === String(selectedCrewId));
  }, [crews, selectedCrewId]);

  if (!isOpen || !complaint) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedCrewId) {
      setError('Please select a field crew to dispatch.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await govService.assignCrew(complaint.id, {
        crew_id: parseInt(selectedCrewId, 10),
        assigned_by: officerName.trim() || 'Municipal Operations',
        notes: notes.trim() || undefined,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to assign field crew', err);
      setError(err.response?.data?.detail || 'Failed to dispatch field crew.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="crew-dispatch-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-elevation relative overflow-hidden space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-600 to-cyan-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-teal-50 border border-teal-100 text-teal-700">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <h3 id="crew-dispatch-modal-title" className="text-base font-bold text-slate-900 tracking-tight">
                Field Crew Dispatch
              </h3>
              <p className="text-xs text-slate-500">
                Ticket: <span className="font-mono font-bold text-teal-800">{complaint.tracking_id}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dispatch modal"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Complaint Summary Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 flex items-center space-x-1.5">
              <Building2 className="w-3.5 h-3.5 text-teal-700" />
              <span>{complaint.category?.name || complaint.category || 'Civic Issue'}</span>
            </span>
            <SeverityBadge level={complaint.severity_level} score={complaint.severity_score} />
          </div>

          <p className="text-slate-700 italic">
            "{complaint.translated_text || complaint.raw_text}"
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-slate-500">
            <div className="flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-teal-700" />
              <span>{complaint.ward_name || `Ward ${complaint.ward_id || 'Zone'}`}</span>
            </div>
            {complaint.current_assignment?.crew && (
              <div className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg flex items-center space-x-1">
                <HardHat className="w-3 h-3 text-indigo-600" />
                <span>Current: {complaint.current_assignment.crew.name}</span>
              </div>
            )}
            <div className="font-mono text-teal-800 font-bold">
              IPS Priority: {complaint.priority_score?.toFixed(1)} / 100
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="flex items-center space-x-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Dispatch Form */}
        {loadingData ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-500 text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
            <span>Loading department crews...</span>
          </div>
        ) : (
          <form onSubmit={handleAssign} className="space-y-4 text-xs">
            {/* 1. Department Selection */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                1. Target Department
              </label>
              <select
                value={selectedDeptId}
                onChange={(e) => {
                  setSelectedDeptId(e.target.value);
                  const matchingCrews = crews.filter(
                    (c) => String(c.department_id) === String(e.target.value)
                  );
                  setSelectedCrewId(matchingCrews.length > 0 ? String(matchingCrews[0].id) : '');
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 font-medium transition-all"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.crews_count || 0} crews)
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Field Crew Selection */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                2. Assign Field Crew
              </label>
              {filteredCrews.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                  No active crews registered in this department.
                </div>
              ) : (
                <select
                  value={selectedCrewId}
                  onChange={(e) => setSelectedCrewId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 font-medium transition-all"
                  required
                >
                  <option value="" disabled>
                    -- Select Crew --
                  </option>
                  {filteredCrews.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} • {c.ward_name || `Ward ${c.ward_id}`} • Leader: {c.crew_leader} ({c.current_status})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Crew Preview Card */}
            {selectedCrewObj && (
              <div className="p-3.5 bg-teal-50/60 border border-teal-200/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-teal-900 flex items-center space-x-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-teal-700" />
                    <span>Crew Leader: {selectedCrewObj.crew_leader}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      selectedCrewObj.current_status === 'AVAILABLE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedCrewObj.current_status === 'ON_DUTY'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedCrewObj.current_status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px] pt-1 border-t border-teal-200/60">
                  <div className="flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-teal-700" />
                    <span>{selectedCrewObj.contact_number || 'Direct Radio'}</span>
                  </div>
                  <div className="flex items-center space-x-1 justify-end">
                    <Layers className="w-3 h-3 text-teal-700" />
                    <span>Active Load: <strong>{selectedCrewObj.active_assignments_count || 0} tickets</strong></span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Dispatching Officer */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                3. Dispatching Officer
              </label>
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 font-medium"
                required
              />
            </div>

            {/* 4. Dispatch Instructions */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                4. Field Instructions / Safety Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Isolate water main valve at Sector 4 junction before excavation."
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 resize-none font-medium"
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
                disabled={submitting || !selectedCrewId}
                className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Dispatch Crew</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
