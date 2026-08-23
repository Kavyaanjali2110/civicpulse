import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  LogOut, 
  RefreshCw, 
  Layers, 
  Flame, 
  Activity, 
  Cpu, 
  TrendingUp, 
  ShieldCheck, 
  FileSpreadsheet,
  Calendar,
  Radio,
  BarChart3,
  MapPin,
  ListOrdered,
  Sparkles,
  LayoutDashboard,
  CheckCircle2,
  Menu,
  X,
  HardHat
} from 'lucide-react';
import OverviewStats from '../components/dashboard/OverviewStats';
import WorkflowKPIs from '../components/dashboard/WorkflowKPIs';
import InteractiveMap from '../components/dashboard/InteractiveMap';
import PriorityTable from '../components/dashboard/PriorityTable';
import TrendAnalytics from '../components/dashboard/TrendAnalytics';
import RecommendationsPanel from '../components/dashboard/RecommendationsPanel';
import StatusUpdateModal from '../components/dashboard/StatusUpdateModal';
import CrewAssignmentModal from '../components/dashboard/CrewAssignmentModal';
import { useAuth } from '../context/AuthContext';
import { govService } from '../services/govService';
import { citizenService } from '../services/citizenService';

export default function GovernmentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeNav, setActiveNav] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reclustering, setReclustering] = useState(false);

  // Filter propagation states for PriorityTable
  const [priorityFilterStatus, setPriorityFilterStatus] = useState('ALL');
  const [priorityFilterSeverity, setPriorityFilterSeverity] = useState('ALL');
  const [priorityFilterCategory, setPriorityFilterCategory] = useState('ALL');

  // Data States
  const [stats, setStats] = useState(null);
  const [workflowStats, setWorkflowStats] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [infrastructureAssets, setInfrastructureAssets] = useState([]);
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [priorityData, setPriorityData] = useState({ ranked_complaints: [], ranked_hotspots: [] });
  const [trendsData, setTrendsData] = useState(null);
  const [recommendationsData, setRecommendationsData] = useState(null);
  const [categories, setCategories] = useState([]);

  // Modal States
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedComplaintForAssign, setSelectedComplaintForAssign] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [
        statsRes,
        workflowRes,
        hotspotsRes,
        assetsRes,
        heatmapRes,
        priorityRes,
        trendsRes,
        recsRes,
        catsRes,
      ] = await Promise.all([
        govService.getOverviewStats(),
        govService.getWorkflowStats().catch(() => null),
        govService.getHotspots(),
        govService.getInfrastructureAssets(),
        govService.getHeatmapPoints(),
        govService.getPriorityRankings(30),
        govService.getTrends(),
        govService.getAIRecommendations(),
        citizenService.getCategories(),
      ]);

      setStats(statsRes);
      setWorkflowStats(workflowRes);
      setHotspots(hotspotsRes);
      setInfrastructureAssets(assetsRes);
      setHeatmapPoints(heatmapRes);
      setPriorityData(priorityRes);
      setTrendsData(trendsRes);
      setRecommendationsData(recsRes);
      setCategories(catsRes);
    } catch (err) {
      console.error("Dashboard fetch failed", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => fetchDashboardData(true), 45000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const handleRecluster = async () => {
    setReclustering(true);
    try {
      await govService.triggerRecluster();
      await fetchDashboardData(true);
    } catch (err) {
      console.error("Reclustering failed", err);
    } finally {
      setReclustering(false);
    }
  };

  const handleOpenStatusModal = (complaint) => {
    setSelectedComplaint(complaint);
    setStatusModalOpen(true);
  };

  const handleOpenAssignModal = (complaint) => {
    setSelectedComplaintForAssign(complaint);
    setAssignModalOpen(true);
  };

  const scrollToSection = (sectionId, navKey) => {
    setActiveNav(navKey);
    setMobileMenuOpen(false);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // KPI Card Click Shortcuts
  const handleKpiCardClick = (cardId) => {
    if (cardId === 'total') {
      setPriorityFilterStatus('ALL');
      setPriorityFilterSeverity('ALL');
      setPriorityFilterCategory('ALL');
      scrollToSection('sec-priority', 'queue');
    } else if (cardId === 'hotspots') {
      scrollToSection('sec-map', 'hotspots');
    } else if (cardId === 'critical') {
      setPriorityFilterSeverity('CRITICAL');
      scrollToSection('sec-priority', 'queue');
    } else if (cardId === 'priority') {
      scrollToSection('sec-priority', 'queue');
    } else if (cardId === 'resolved') {
      setPriorityFilterStatus('RESOLVED');
      scrollToSection('sec-priority', 'queue');
    }
  };

  // AI Recommendation Action Trigger
  const handleRecommendationAction = (rec) => {
    if (rec.domain_category) {
      setPriorityFilterCategory(rec.domain_category);
    }
    scrollToSection('sec-priority', 'queue');
  };

  // Trend Category Click Trigger
  const handleTrendCategoryClick = (categoryName) => {
    setPriorityFilterCategory(categoryName);
    scrollToSection('sec-priority', 'queue');
  };

  const navItems = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard, target: 'sec-overview' },
    { key: 'dispatch', label: 'Crew Dispatch & SLA', icon: HardHat, target: 'sec-dispatch' },
    { key: 'map', label: 'Infrastructure Map', icon: MapPin, target: 'sec-map' },
    { key: 'queue', label: 'Priority Queue', icon: ListOrdered, target: 'sec-priority' },
    { key: 'hotspots', label: 'Hotspots', icon: Layers, target: 'sec-map' },
    { key: 'trends', label: 'Trends & Velocity', icon: TrendingUp, target: 'sec-trends' },
    { key: 'ai', label: 'AI Recommendations', icon: Cpu, target: 'sec-ai' },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
      {/* Mobile Toggle Button for Sidebar */}
      <div className="lg:hidden flex items-center justify-between bg-slate-900 text-white p-4 rounded-2xl shadow-md">
        <div className="flex items-center space-x-2">
          <Radio className="w-5 h-5 text-teal-400" />
          <span className="font-bold text-sm">Gov Command Menu</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
          aria-label="Toggle Command Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* 1. Dark Navy Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } lg:flex lg:w-64 bg-slate-900 text-white rounded-3xl p-5 shadow-xl flex-col justify-between space-y-6 shrink-0 border border-slate-800`}
      >
        <div className="space-y-6">
          {/* Logo & Platform Info */}
          <div className="flex items-center space-x-3 px-2 pt-1">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-sm">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white block">
                CivicPulse <span className="text-teal-400">AI</span>
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                Government Console
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => scrollToSection(item.target, item.key)}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                    isActive
                      ? 'bg-teal-500/15 text-teal-300 border-l-2 border-teal-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Officer Profile Card & Logout */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center space-x-2.5 px-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs border border-amber-500/30 shrink-0">
              OV
            </div>
            <div className="truncate">
              <span className="font-bold text-xs text-white block truncate">
                {user?.name || 'Officer Verma'}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                {user?.department || 'Municipal Operations'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-rose-900/30 text-slate-300 hover:text-rose-300 border border-slate-700/60 text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>End Session</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Dashboard Content Surface */}
      <main className="flex-1 space-y-7 min-w-0">
        {/* Header Banner */}
        <div id="sec-overview" className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Municipal Intelligence Command Center
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold uppercase tracking-wider">
                Live Feed
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time multi-hazard spatial analytics, AI urgency dispatch, field crew management, and SLA tracking.
            </p>
          </div>

          {/* Sync Button */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <button
              type="button"
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-700' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Sync Intelligence'}</span>
            </button>
          </div>
        </div>

        {/* 1. Overview KPI Cards */}
        <OverviewStats stats={stats} loading={loading} onCardClick={handleKpiCardClick} />

        {/* 2. Field Crew Dispatch & SLA Section */}
        <div id="sec-dispatch">
          <WorkflowKPIs workflowStats={workflowStats} />
        </div>

        {/* 3. Infrastructure Map */}
        <div id="sec-map">
          <InteractiveMap
            hotspots={hotspots}
            infrastructureAssets={infrastructureAssets}
            heatmapPoints={heatmapPoints}
            complaints={priorityData.ranked_complaints}
            categories={categories}
            onRecluster={handleRecluster}
            reclustering={reclustering}
            onSelectComplaint={handleOpenStatusModal}
          />
        </div>

        {/* 4. Priority Ranking Table */}
        <div id="sec-priority">
          <PriorityTable
            rankedComplaints={priorityData.ranked_complaints}
            rankedHotspots={priorityData.ranked_hotspots}
            categories={categories}
            onSelectComplaint={handleOpenStatusModal}
            onOpenStatusModal={handleOpenStatusModal}
            onOpenAssignModal={handleOpenAssignModal}
            selectedFilterStatus={priorityFilterStatus}
            selectedFilterSeverity={priorityFilterSeverity}
            selectedFilterCategory={priorityFilterCategory}
            onFilterChange={(f) => {
              setPriorityFilterStatus(f.status);
              setPriorityFilterSeverity(f.severity);
              setPriorityFilterCategory(f.category);
            }}
          />
        </div>

        {/* 5. AI Infrastructure Insights & Prescriptive Recommendations */}
        <div id="sec-ai">
          <RecommendationsPanel
            recommendationsData={recommendationsData}
            onActionClick={handleRecommendationAction}
          />
        </div>

        {/* 6. Trend Analytics & Surge Monitor */}
        <div id="sec-trends">
          <TrendAnalytics
            trendsData={trendsData}
            onCategoryClick={handleTrendCategoryClick}
          />
        </div>
      </main>

      {/* Status Update Modal */}
      <StatusUpdateModal
        complaint={selectedComplaint}
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        onSuccess={() => fetchDashboardData(true)}
      />

      {/* Crew Assignment Modal */}
      <CrewAssignmentModal
        complaint={selectedComplaintForAssign}
        isOpen={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setSelectedComplaintForAssign(null);
        }}
        onSuccess={() => fetchDashboardData(true)}
      />
    </div>
  );
}
