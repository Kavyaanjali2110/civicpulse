import React, { useState, useMemo } from 'react';
import { 
  Flame, 
  Layers, 
  ArrowUpDown, 
  ArrowUp,
  ArrowDown, 
  ExternalLink, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Search,
  Filter,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  RotateCcw,
  HardHat,
  UserCheck
} from 'lucide-react';
import SeverityBadge from '../common/SeverityBadge';

export default function PriorityTable({
  rankedComplaints = [],
  rankedHotspots = [],
  categories = [],
  onSelectComplaint,
  onOpenStatusModal,
  onOpenAssignModal,
  selectedFilterStatus = 'ALL',
  selectedFilterSeverity = 'ALL',
  selectedFilterCategory = 'ALL',
  onFilterChange,
}) {
  const [activeTab, setActiveTab] = useState('complaints');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local or controlled filter states
  const [statusFilter, setStatusFilter] = useState(selectedFilterStatus);
  const [severityFilter, setSeverityFilter] = useState(selectedFilterSeverity);
  const [categoryFilter, setCategoryFilter] = useState(selectedFilterCategory);

  // Sorting
  const [sortField, setSortField] = useState('priority_score'); // 'priority_score' | 'tracking_id' | 'severity_score'
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // Default descending for scores
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setSeverityFilter('ALL');
    setCategoryFilter('ALL');
    if (onFilterChange) onFilterChange({ status: 'ALL', severity: 'ALL', category: 'ALL' });
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'ALL' ||
    severityFilter !== 'ALL' ||
    categoryFilter !== 'ALL';

  // Filter and sort complaints
  const processedComplaints = useMemo(() => {
    return rankedComplaints
      .filter((c) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          !query ||
          c.tracking_id.toLowerCase().includes(query) ||
          c.summary.toLowerCase().includes(query) ||
          c.category.toLowerCase().includes(query) ||
          (c.address && c.address.toLowerCase().includes(query)) ||
          (c.assigned_crew_name && c.assigned_crew_name.toLowerCase().includes(query));

        const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
        const matchesSeverity = severityFilter === 'ALL' || c.severity_level === severityFilter;
        const matchesCategory =
          categoryFilter === 'ALL' ||
          c.category.toLowerCase() === categoryFilter.toLowerCase() ||
          (c.category_id && c.category_id.toString() === categoryFilter);

        return matchesSearch && matchesStatus && matchesSeverity && matchesCategory;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (typeof valA === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortAsc ? valA - valB : valB - valA;
      });
  }, [rankedComplaints, searchQuery, statusFilter, severityFilter, categoryFilter, sortField, sortAsc]);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-card space-y-4">
      {/* Header & Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('complaints')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'complaints'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Infrastructure Priority Queue ({processedComplaints.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hotspots')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'hotspots'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-teal-400" />
            <span>Active Hotspots ({rankedHotspots.length})</span>
          </button>
        </div>

        {/* Filter / Search Bar */}
        {activeTab === 'complaints' && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, crew, ward..."
                className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-all w-44 sm:w-52"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="RECEIVED">Received</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        {activeTab === 'complaints' ? (
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200 select-none">
              <tr>
                <th
                  className="py-3 px-3 cursor-pointer hover:text-slate-900"
                  onClick={() => handleSort('tracking_id')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Priority / ID</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3">Category &amp; Location</th>
                <th
                  className="py-3 px-3 text-center cursor-pointer hover:text-slate-900"
                  onClick={() => handleSort('severity_score')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Severity</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="py-3 px-3 text-center cursor-pointer hover:text-slate-900"
                  onClick={() => handleSort('priority_score')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>IPS Score</span>
                    {sortField === 'priority_score' ? (
                      sortAsc ? <ArrowUp className="w-3 h-3 text-teal-700" /> : <ArrowDown className="w-3 h-3 text-teal-700" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-3">Assigned Crew</th>
                <th className="py-3 px-3 text-center">Status / SLA</th>
                <th className="py-3 px-3 text-right">Dispatch Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedComplaints.length > 0 ? (
                processedComplaints.map((c, idx) => {
                  const assignedCrew = c.current_assignment?.crew || (c.assigned_crew_name ? { name: c.assigned_crew_name } : null);
                  const isResolved = c.status === 'RESOLVED';
                  const isAssigned = !!assignedCrew || c.status === 'INVESTIGATING' || c.status === 'IN_PROGRESS';
                  const sla = c.sla_metrics;

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer focus:bg-slate-100 focus:outline-none"
                      onClick={() => onSelectComplaint && onSelectComplaint(c)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (onSelectComplaint) onSelectComplaint(c);
                        }
                      }}
                    >
                      <td className="py-3.5 px-3 font-mono">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[11px] text-slate-400 font-bold w-5">#{idx + 1}</span>
                          <span className="font-bold text-slate-900 group-hover:text-teal-800">
                            {c.tracking_id}
                          </span>
                          {c.source_channel && c.source_channel !== 'WEB' && (
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                              c.source_channel === 'WHATSAPP'
                                ? 'bg-emerald-100 text-emerald-800'
                                : c.source_channel === 'SMS'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {c.source_channel}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 max-w-xs">
                        <div className="font-bold text-slate-900">{c.category}</div>
                        <p className="truncate text-slate-600 text-[11px] mt-0.5" title={c.summary}>
                          {c.summary}
                        </p>
                        {c.address && (
                          <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                            📍 {c.address}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <SeverityBadge level={c.severity_level} score={c.severity_score} />
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center space-x-1.5">
                          <div className="w-10 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                            <div
                              className={`h-full ${
                                c.priority_score >= 80
                                  ? 'bg-rose-600'
                                  : c.priority_score >= 60
                                  ? 'bg-amber-500'
                                  : 'bg-teal-600'
                              }`}
                              style={{ width: `${Math.min(100, c.priority_score)}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {c.priority_score.toFixed(1)}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        {assignedCrew ? (
                          <div className="flex items-center space-x-1.5 text-xs text-indigo-950 font-semibold">
                            <HardHat className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="truncate max-w-[140px]" title={assignedCrew.name}>
                              {assignedCrew.name}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-medium">
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center space-y-1">
                        <div>
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              c.status === 'RESOLVED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : c.status === 'IN_PROGRESS'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : c.status === 'INVESTIGATING'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>
                        {sla?.status && (
                          <div className="text-[9px] font-bold uppercase tracking-tight">
                            <span
                              className={
                                sla.status === 'ON_TIME'
                                  ? 'text-emerald-700'
                                  : sla.status === 'AT_RISK'
                                  ? 'text-amber-700'
                                  : 'text-rose-700'
                              }
                            >
                              SLA: {sla.status.replace('_', ' ')}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                        {!isResolved && !isAssigned && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onOpenAssignModal) onOpenAssignModal(c);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                          >
                            Assign Crew
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenStatusModal) onOpenStatusModal(c);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-800 border border-slate-200 text-[11px] font-bold transition-all cursor-pointer"
                        >
                          Status
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No complaints match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          /* Hotspots Sub-View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            {rankedHotspots.map((h) => (
              <div
                key={h.id}
                className="border border-slate-200/90 rounded-2xl p-4.5 bg-slate-50/50 hover:bg-white hover:border-teal-300 transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-bold font-mono text-xs">
                      #{h.cluster_id}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">
                        {h.category?.name || 'Infrastructure Cluster'}
                      </h4>
                      <span className="text-[10px] text-slate-500">
                        {h.ward_name || `Ward ${h.ward_id}`}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      h.severity_level === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-800'
                        : h.severity_level === 'HIGH'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-teal-100 text-teal-800'
                    }`}
                  >
                    {h.severity_level}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-200/60 text-center font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Complaints</span>
                    <strong className="text-slate-900">{h.complaint_count}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Radius</span>
                    <strong className="text-slate-900">{h.radius_meters?.toFixed(0)}m</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Avg IPS</span>
                    <strong className="text-teal-800">{h.avg_priority_score?.toFixed(1)}</strong>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-700">Recommended Action:</span>{' '}
                  {h.recommended_action || 'Deploy rapid inspection team.'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
