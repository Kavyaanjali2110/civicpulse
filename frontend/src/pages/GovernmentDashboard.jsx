import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Radio,
  BarChart3,
  MapPin,
  ListOrdered,
  Sparkles,
  LayoutDashboard,
  CheckCircle2,
  Menu,
  X,
  HardHat,
  MessageSquare,
  ShieldAlert,
  AlertTriangle,
  ChevronRight,
  Filter
} from 'lucide-react';
import OverviewStats from '../components/dashboard/OverviewStats';
import WorkflowKPIs from '../components/dashboard/WorkflowKPIs';
import InteractiveMap from '../components/dashboard/InteractiveMap';
import PriorityTable from '../components/dashboard/PriorityTable';
import TrendAnalytics from '../components/dashboard/TrendAnalytics';
import RecommendationsPanel from '../components/dashboard/RecommendationsPanel';
import StatusUpdateModal from '../components/dashboard/StatusUpdateModal';
import CrewAssignmentModal from '../components/dashboard/CrewAssignmentModal';
import AssetRiskTable from '../components/predictive/AssetRiskTable';
import AssetIntelligenceModal from '../components/predictive/AssetIntelligenceModal';
import PredictiveCharts from '../components/predictive/PredictiveCharts';
import OmnichannelIntakeView from '../components/omnichannel/OmnichannelIntakeView';
import { useAuth } from '../context/AuthContext';
import { govService } from '../services/govService';
import { citizenService } from '../services/citizenService';
import { predictiveService } from '../services/predictiveService';
import { subscribeToResolutions } from '../utils/syncChannel';

export default function GovernmentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Primary Navigation Tab: 'operations' | 'predictive' | 'omnichannel' | 'analytics'
  const [activeTab, setActiveTab] = useState('operations');

  // Operations Workspace View: 'split' | 'list' | 'map'
  const [workspaceView, setWorkspaceView] = useState('split');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reclustering, setReclustering] = useState(false);

  // Predictive Intelligence States
  const [predictiveAssetsRisk, setPredictiveAssetsRisk] = useState([]);
  const [wardRisks, setWardRisks] = useState([]);
  const [predictiveRecs, setPredictiveRecs] = useState([]);
  const [preventiveOrders, setPreventiveOrders] = useState([]);
  const [selectedPredictiveAsset, setSelectedPredictiveAsset] = useState(null);
  const [predictiveModalOpen, setPredictiveModalOpen] = useState(false);
  const [selectedPredictionWindow, setSelectedPredictionWindow] = useState(30);

  // Filter propagation states for PriorityTable
  const [priorityFilterStatus, setPriorityFilterStatus] = useState('ACTIVE');
  const [priorityFilterSeverity, setPriorityFilterSeverity] = useState('ALL');
  const [priorityFilterCategory, setPriorityFilterCategory] = useState('ALL');

  // Ref tracking current filter status so polling interval does not recreate on filter changes
  const priorityFilterStatusRef = useRef(priorityFilterStatus);
  useEffect(() => {
    priorityFilterStatusRef.current = priorityFilterStatus;
  }, [priorityFilterStatus]);

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

  const fetchDashboardData = useCallback(async (isRefresh = false, overrideStatus = null) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const currentStatus = overrideStatus || priorityFilterStatusRef.current || 'ACTIVE';
      const apiStatus = currentStatus === 'RESOLVED' ? 'RESOLVED' : (currentStatus === 'ALL' ? 'ALL' : 'ACTIVE');

      if (isRefresh) {
        // Lightweight synchronization poll every 10s or upon cross-tab broadcast:
        const [statsRes, workflowRes, hotspotsRes, priorityRes] = await Promise.all([
          govService.getOverviewStats(),
          govService.getWorkflowStats().catch(() => null),
          govService.getHotspots().catch(() => null),
          govService.getPriorityRankings(30, apiStatus),
        ]);

        setStats(statsRes);
        if (workflowRes) setWorkflowStats(workflowRes);
        if (hotspotsRes) setHotspots(hotspotsRes);
        setPriorityData(priorityRes);
      } else {
        // Full initial load
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
          riskRes,
          wardRisksRes,
          predRecsRes,
          ordersRes,
        ] = await Promise.all([
          govService.getOverviewStats(),
          govService.getWorkflowStats().catch(() => null),
          govService.getHotspots(),
          govService.getInfrastructureAssets(),
          govService.getHeatmapPoints(),
          govService.getPriorityRankings(30, apiStatus),
          govService.getTrends(),
          govService.getAIRecommendations(),
          citizenService.getCategories(),
          predictiveService.getAssetsRisk({ prediction_window: selectedPredictionWindow }).catch(() => []),
          predictiveService.getWardRisks().catch(() => []),
          predictiveService.getPredictiveRecommendations().catch(() => []),
          predictiveService.getPreventiveOrders().catch(() => []),
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
        setPredictiveAssetsRisk(riskRes || []);
        setWardRisks(wardRisksRes || []);
        setPredictiveRecs(predRecsRes || []);
        setPreventiveOrders(ordersRes || []);
      }
    } catch (err) {
      console.error("Dashboard fetch failed", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPredictionWindow]);

  useEffect(() => {
    fetchDashboardData();
    // 10-second automatic server synchronization poll
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 10000);

    // Cross-tab broadcast listener for immediate same-browser refresh upon crew resolution
    const unsubscribe = subscribeToResolutions(() => {
      fetchDashboardData(true);
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
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

  const handlePriorityFilterChange = useCallback(async (f) => {
    const prevStatus = priorityFilterStatusRef.current;
    setPriorityFilterStatus(f.status);
    setPriorityFilterSeverity(f.severity);
    setPriorityFilterCategory(f.category);

    const prevApiStatus = prevStatus === 'RESOLVED' ? 'RESOLVED' : (prevStatus === 'ALL' ? 'ALL' : 'ACTIVE');
    const newApiStatus = f.status === 'RESOLVED' ? 'RESOLVED' : (f.status === 'ALL' ? 'ALL' : 'ACTIVE');

    if (prevApiStatus !== newApiStatus) {
      try {
        const priorityRes = await govService.getPriorityRankings(30, newApiStatus);
        setPriorityData(priorityRes);
      } catch (err) {
        console.error("Failed to fetch filtered priority rankings", err);
      }
    }
  }, []);

  // Tab-Aware KPI Card Click Shortcuts
  const handleKpiCardClick = async (cardId) => {
    setActiveTab('operations');
    if (cardId === 'total') {
      if (workspaceView === 'map') setWorkspaceView('list');
      setPriorityFilterStatus('ALL');
      setPriorityFilterSeverity('ALL');
      setPriorityFilterCategory('ALL');
      try {
        const priorityRes = await govService.getPriorityRankings(30, 'ALL');
        setPriorityData(priorityRes);
      } catch (err) {
        console.error("Failed to fetch all priority rankings", err);
      }
    } else if (cardId === 'hotspots') {
      setWorkspaceView('map');
    } else if (cardId === 'critical') {
      if (workspaceView === 'map') setWorkspaceView('list');
      setPriorityFilterSeverity('CRITICAL');
    } else if (cardId === 'active') {
      // Active/In-Progress card: show ACTIVE queue
      if (workspaceView === 'map') setWorkspaceView('list');
      setPriorityFilterStatus('ACTIVE');
      setPriorityFilterSeverity('ALL');
      try {
        const priorityRes = await govService.getPriorityRankings(30, 'ACTIVE');
        setPriorityData(priorityRes);
      } catch (err) {
        console.error("Failed to fetch active priority rankings", err);
      }
    } else if (cardId === 'sla_risk') {
      // SLA Risk card: show ACTIVE queue filtered to highlight overdue
      if (workspaceView === 'map') setWorkspaceView('list');
      setPriorityFilterStatus('ACTIVE');
      setPriorityFilterSeverity('ALL');
      try {
        const priorityRes = await govService.getPriorityRankings(30, 'ACTIVE');
        setPriorityData(priorityRes);
      } catch (err) {
        console.error("Failed to fetch SLA risk rankings", err);
      }
    } else if (cardId === 'priority') {
      if (workspaceView === 'map') setWorkspaceView('list');
      setPriorityFilterStatus('ACTIVE');
      try {
        const priorityRes = await govService.getPriorityRankings(30, 'ACTIVE');
        setPriorityData(priorityRes);
      } catch (err) {
        console.error("Failed to fetch active priority rankings", err);
      }
    } else if (cardId === 'resolved') {
      if (workspaceView === 'map') setWorkspaceView('list');
      setPriorityFilterStatus('RESOLVED');
      try {
        const priorityRes = await govService.getPriorityRankings(30, 'RESOLVED');
        setPriorityData(priorityRes);
      } catch (err) {
        console.error("Failed to fetch resolved priority rankings", err);
      }
    } else if (cardId === 'priority_score' || cardId === 'avg_resolution' || cardId === 'crew_dispatch') {
      // Secondary strip: switch to list view of active queue
      if (workspaceView === 'map') setWorkspaceView('list');
      setPriorityFilterStatus('ACTIVE');
    }
  };

  // AI Recommendation Action Trigger (Switches to Operations + Sets Filter)
  const handleRecommendationAction = (rec) => {
    setActiveTab('operations');
    if (workspaceView === 'map') setWorkspaceView('split');
    if (rec.domain_category) {
      setPriorityFilterCategory(rec.domain_category);
    }
  };

  // Trend Category Click Trigger (Switches to Operations + Sets Filter)
  const handleTrendCategoryClick = (categoryName) => {
    setActiveTab('operations');
    if (workspaceView === 'map') setWorkspaceView('split');
    setPriorityFilterCategory(categoryName);
  };

  // 4 Primary Navigation Tabs
  const navTabs = [
    {
      id: 'operations',
      label: 'Operations & Dispatch',
      shortLabel: 'Operations',
      icon: HardHat,
      purpose: 'What needs action now',
      badge: stats ? `${stats.open_count} Active` : null,
      badgeColor: 'bg-teal-500/15 text-teal-300 border-teal-400/30',
    },
    {
      id: 'predictive',
      label: 'Predictive AI',
      shortLabel: 'Predictive AI',
      icon: ShieldAlert,
      purpose: 'What may fail next',
      badge: predictiveAssetsRisk.filter((a) => a.health_category === 'CRITICAL' || a.predictions?.['30_days']?.risk_level === 'CRITICAL').length > 0
        ? `${predictiveAssetsRisk.filter((a) => a.health_category === 'CRITICAL' || a.predictions?.['30_days']?.risk_level === 'CRITICAL').length} Risk`
        : null,
      badgeColor: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
    },
    {
      id: 'omnichannel',
      label: 'Omnichannel',
      shortLabel: 'Omnichannel',
      icon: MessageSquare,
      purpose: 'Where complaints come from',
      badge: '4 Channels',
      badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    },
    {
      id: 'analytics',
      label: 'Analytics & AI',
      shortLabel: 'Analytics',
      icon: TrendingUp,
      purpose: 'What the data tells us',
      badge: recommendationsData?.critical_actions > 0 ? `${recommendationsData.critical_actions} Actions` : null,
      badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
      {/* Mobile Header Menu Toggle */}
      <div className="lg:hidden flex items-center justify-between bg-slate-900 text-white p-4 rounded-2xl shadow-md">
        <div className="flex items-center space-x-2">
          <Radio className="w-5 h-5 text-teal-400" />
          <span className="font-bold text-sm">CivicPulse Command</span>
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
        } lg:flex lg:w-56 bg-slate-900 text-white rounded-3xl p-5 shadow-xl flex-col justify-between space-y-6 shrink-0 border border-slate-800`}
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

          {/* 4 Primary Navigation Tabs */}
          <nav className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1">
              Command Modules
            </div>
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left group ${
                    isActive
                      ? 'bg-teal-500/15 text-teal-300 border-l-2 border-teal-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    <div className="truncate">
                      <span className="block truncate font-bold">{tab.label}</span>
                      <span className="text-[10px] text-slate-400 block truncate">{tab.purpose}</span>
                    </div>
                  </div>
                  {tab.badge && (
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md shrink-0 ml-1.5 border ${
                      isActive ? 'bg-teal-500/20 text-teal-300 border-teal-400/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
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
      <main className="flex-1 space-y-6 min-w-0">
        {/* Header Banner & Primary Tab Bar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                Real-time incident response, SLA tracking, predictive failure intelligence, and omnichannel grievance orchestration.
              </p>
            </div>

            {/* Sync Intelligence Button */}
            <div className="flex items-center space-x-2.5 shrink-0">
              <button
                type="button"
                onClick={() => fetchDashboardData(true)}
                disabled={refreshing}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-700' : ''}`} />
                <span>{refreshing ? 'Syncing...' : 'Sync Intelligence'}</span>
              </button>
            </div>
          </div>

          {/* Primary Top Tab Selector */}
          <div className="pt-2 border-t border-slate-100 flex items-center space-x-1.5 overflow-x-auto">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100/80 hover:bg-slate-200/70 text-slate-700'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                        isActive
                          ? 'bg-slate-800 text-teal-300'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* -------------------------------------------------------------------------
            TAB 1: OPERATIONS & DISPATCH (DEFAULT PRIMARY VIEW)
           ------------------------------------------------------------------------- */}
        {activeTab === 'operations' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* A. Compact Overview KPI row */}
            <OverviewStats stats={stats} workflowStats={workflowStats} loading={loading} onCardClick={handleKpiCardClick} />

            {/* B. Compact SLA / Workflow KPI row & expandable roster */}
            <WorkflowKPIs workflowStats={workflowStats} />

            {/* C. Main Workspace with [ List ] [ Map ] [ Split ] View Toggle */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <HardHat className="w-4 h-4 text-teal-700" />
                    <span>Incident Queue &amp; Spatial Dispatch</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Triage active infrastructure tickets, inspect spatial clusters, and deploy municipal field crews.
                  </p>
                </div>

                {/* Workspace View Mode Toggle */}
                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setWorkspaceView('list')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      workspaceView === 'list'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>List</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWorkspaceView('map')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      workspaceView === 'map'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Map</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWorkspaceView('split')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      workspaceView === 'split'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Split View</span>
                  </button>
                </div>
              </div>

              {/* Workspace View Render: List View */}
              {workspaceView === 'list' && (
                <div className="space-y-4">
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
                    onFilterChange={handlePriorityFilterChange}
                    isSplitView={false}
                  />
                </div>
              )}

              {/* Workspace View Render: Map View */}
              {workspaceView === 'map' && (
                <div className="space-y-4">
                  <InteractiveMap
                    hotspots={hotspots}
                    infrastructureAssets={infrastructureAssets}
                    heatmapPoints={heatmapPoints}
                    complaints={priorityData.ranked_complaints}
                    categories={categories}
                    predictiveAssetsRisk={predictiveAssetsRisk}
                    onRecluster={handleRecluster}
                    reclustering={reclustering}
                    onSelectComplaint={handleOpenStatusModal}
                    onSelectAsset={(asset) => {
                      setSelectedPredictiveAsset(asset);
                      setPredictiveModalOpen(true);
                    }}
                    isSplitView={false}
                  />
                </div>
              )}

              {/* Workspace View Render: Split View (Queue 55% + Map 45%) */}
              {workspaceView === 'split' && (
                <div className="flex flex-col xl:flex-row gap-4 items-start">
                  {/* Priority Queue: 55% */}
                  <div className="w-full xl:w-[55%] min-w-0 overflow-x-auto">
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
                      onFilterChange={handlePriorityFilterChange}
                      isSplitView={true}
                    />
                  </div>
                  {/* GIS Map: 45% */}
                  <div className="w-full xl:w-[45%] min-w-0">
                    <InteractiveMap
                      hotspots={hotspots}
                      infrastructureAssets={infrastructureAssets}
                      heatmapPoints={heatmapPoints}
                      complaints={priorityData.ranked_complaints}
                      categories={categories}
                      predictiveAssetsRisk={predictiveAssetsRisk}
                      onRecluster={handleRecluster}
                      reclustering={reclustering}
                      onSelectComplaint={handleOpenStatusModal}
                      onSelectAsset={(asset) => {
                        setSelectedPredictiveAsset(asset);
                        setPredictiveModalOpen(true);
                      }}
                      isSplitView={true}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------------
            TAB 2: PREDICTIVE AI (TRACK B PROACTIVE INFRASTRUCTURE INTELLIGENCE)
           ------------------------------------------------------------------------- */}
        {activeTab === 'predictive' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      Predictive Infrastructure Intelligence
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-extrabold uppercase tracking-wide border border-rose-200">
                      Track B • Proactive
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Proactive degradation modeling, failure probability horizons, and preventive work-order dispatch.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fetchDashboardData(true)}
                disabled={refreshing}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer shadow-xs self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-700' : ''}`} />
                <span>Recalculate Predictions</span>
              </button>
            </div>

            {/* 6 Predictive KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white border border-rose-200/80 rounded-2xl p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">Critical Assets</span>
                <div className="text-2xl font-black text-rose-600 font-mono mt-1">
                  {predictiveAssetsRisk.filter((a) => a.health_category === 'CRITICAL' || a.predictions?.['30_days']?.risk_level === 'CRITICAL').length}
                </div>
                <span className="text-[10px] text-rose-500 font-medium">Immediate Hazard</span>
              </div>

              <div className="bg-white border border-orange-200/80 rounded-2xl p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">High-Risk Assets</span>
                <div className="text-2xl font-black text-orange-600 font-mono mt-1">
                  {predictiveAssetsRisk.filter((a) => a.health_category === 'AT_RISK' || a.predictions?.['30_days']?.risk_level === 'HIGH').length}
                </div>
                <span className="text-[10px] text-orange-500 font-medium">Degrading Fast</span>
              </div>

              <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">At-Risk Wards</span>
                <div className="text-2xl font-black text-amber-600 font-mono mt-1">
                  {wardRisks.filter((w) => w.requires_preventive_intervention).length}
                </div>
                <span className="text-[10px] text-amber-600 font-medium">Intervention Req.</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">Failures (7d)</span>
                <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                  {predictiveAssetsRisk.filter((a) => (a.predictions?.['7_days']?.risk_score || 0) >= 0.5).length}
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Next 7 Days</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">Failures (30d)</span>
                <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                  {predictiveAssetsRisk.filter((a) => (a.predictions?.['30_days']?.risk_score || 0) >= 0.5).length}
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Next 30 Days</span>
              </div>

              <div className="bg-white border border-sky-200/80 rounded-2xl p-4 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">Actions Pending</span>
                <div className="text-2xl font-black text-sky-600 font-mono mt-1">
                  {predictiveRecs.length}
                </div>
                <span className="text-[10px] text-sky-600 font-medium">Work Orders Rec.</span>
              </div>
            </div>

            {/* Predictive Analytics Charts */}
            <PredictiveCharts
              assetsRisk={predictiveAssetsRisk}
              wardRisks={wardRisks}
            />

            {/* Asset Risk Table */}
            <AssetRiskTable
              assetsRisk={predictiveAssetsRisk}
              loading={loading}
              selectedWindow={selectedPredictionWindow}
              onWindowChange={(w) => setSelectedPredictionWindow(w)}
              onSelectAsset={(asset) => {
                setSelectedPredictiveAsset(asset);
                setPredictiveModalOpen(true);
              }}
              onCreateWorkOrder={(asset) => {
                setSelectedPredictiveAsset(asset);
                setPredictiveModalOpen(true);
              }}
            />
          </div>
        )}

        {/* -------------------------------------------------------------------------
            TAB 3: OMNICHANNEL (TRACK C INGESTION ENGINE & NOTIFICATIONS)
           ------------------------------------------------------------------------- */}
        {activeTab === 'omnichannel' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <OmnichannelIntakeView />
          </div>
        )}

        {/* -------------------------------------------------------------------------
            TAB 4: ANALYTICS & AI (VELOCITY, SURGES & PRESCRIPTIVE RECOMMENDATIONS)
           ------------------------------------------------------------------------- */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Analytics &amp; Prescriptive AI Insights
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Macro-level grievance velocity trends, emerging surge detection, and automated prescriptive action plans.
                  </p>
                </div>
              </div>
            </div>

            {/* AI Prescriptive Recommendations Panel */}
            <RecommendationsPanel
              recommendationsData={recommendationsData}
              onActionClick={handleRecommendationAction}
            />

            {/* Trend Analytics & Velocity Monitor */}
            <TrendAnalytics
              trendsData={trendsData}
              onCategoryClick={handleTrendCategoryClick}
            />
          </div>
        )}
      </main>

      {/* =========================================================================
          GLOBAL WORKFLOW MODALS (PRESERVED AT ROOT LEVEL)
         ========================================================================= */}

      {/* Status Update & Resolution Evidence Modal */}
      <StatusUpdateModal
        complaint={selectedComplaint}
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        onSuccess={() => fetchDashboardData(true)}
      />

      {/* Crew Assignment / Reassignment Modal */}
      <CrewAssignmentModal
        complaint={selectedComplaintForAssign}
        isOpen={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setSelectedComplaintForAssign(null);
        }}
        onSuccess={() => fetchDashboardData(true)}
      />

      {/* Predictive Asset Intelligence & Preventive Work Order Modal */}
      <AssetIntelligenceModal
        asset={selectedPredictiveAsset}
        isOpen={predictiveModalOpen}
        onClose={() => {
          setPredictiveModalOpen(false);
          setSelectedPredictiveAsset(null);
        }}
        onOrderCreated={() => fetchDashboardData(true)}
      />
    </div>
  );
}
