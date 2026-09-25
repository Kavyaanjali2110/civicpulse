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
  HardHat,
  MessageSquare
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
import { ShieldAlert, AlertTriangle } from 'lucide-react';

export default function GovernmentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeNav, setActiveNav] = useState('overview');
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
        // Refetches overview stats, workflow SLA stats, hotspots, and status-filtered priority ranking
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

  const scrollToSection = (sectionId, navKey) => {
    setActiveNav(navKey);
    setMobileMenuOpen(false);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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

  // KPI Card Click Shortcuts
  const handleKpiCardClick = async (cardId) => {
    if (cardId === 'total') {
      setPriorityFilterStatus('ALL');
      setPriorityFilterSeverity('ALL');
      setPriorityFilterCategory('ALL');
      scrollToSection('sec-priority', 'queue');
      try {
        const priorityRes = await govService.getPriorityRankings(30, 'ALL');
        setPriorityData(priorityRes);
      } catch (err) {
        console.error("Failed to fetch all priority rankings", err);
      }
    } else if (cardId === 'hotspots') {
      scrollToSection('sec-map', 'hotspots');
    } else if (cardId === 'critical') {
      setPriorityFilterSeverity('CRITICAL');
      scrollToSection('sec-priority', 'queue');
    } else if (cardId === 'priority') {
      setPriorityFilterStatus('ACTIVE');
      scrollToSection('sec-priority', 'queue');
      try {
        const priorityRes = await govService.getPriorityRankings(30, 'ACTIVE');
        setPriorityData(priorityRes);
      } catch (err) {
        console.error("Failed to fetch active priority rankings", err);
      }
    } else if (cardId === 'resolved') {
      setPriorityFilterStatus('RESOLVED');
      scrollToSection('sec-priority', 'queue');
      try {
        const priorityRes = await govService.getPriorityRankings(30, 'RESOLVED');
        setPriorityData(priorityRes);
      } catch (err) {
        console.error("Failed to fetch resolved priority rankings", err);
      }
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
    { key: 'omnichannel', label: 'Omnichannel Intake', icon: MessageSquare, target: 'sec-omnichannel' },
    { key: 'predictive', label: 'Predictive Intelligence', icon: ShieldAlert, target: 'sec-predictive' },
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

        {/* Omnichannel Grievance Intake & Notifications Section (Track C) */}
        <div id="sec-omnichannel">
          <OmnichannelIntakeView />
        </div>

        {/* Predictive Infrastructure Intelligence Section */}
        <div id="sec-predictive" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Predictive Infrastructure Intelligence
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-extrabold uppercase tracking-wide border border-rose-200">
                Track B
              </span>
            </div>
            <span className="text-xs text-slate-500">
              Proactive failure probability modeling &amp; preventive maintenance
            </span>
          </div>

          {/* 6 Predictive KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Card 1: Critical Assets */}
            <div className="bg-white border border-rose-200/80 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Critical Assets</span>
              <div className="text-2xl font-black text-rose-600 font-mono mt-1">
                {predictiveAssetsRisk.filter((a) => a.health_category === 'CRITICAL' || a.predictions?.['30_days']?.risk_level === 'CRITICAL').length}
              </div>
              <span className="text-[10px] text-rose-500 font-medium">Immediate Hazard</span>
            </div>

            {/* Card 2: High-Risk Assets */}
            <div className="bg-white border border-orange-200/80 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">High-Risk Assets</span>
              <div className="text-2xl font-black text-orange-600 font-mono mt-1">
                {predictiveAssetsRisk.filter((a) => a.health_category === 'AT_RISK' || a.predictions?.['30_days']?.risk_level === 'HIGH').length}
              </div>
              <span className="text-[10px] text-orange-500 font-medium">Degrading Fast</span>
            </div>

            {/* Card 3: At-Risk Wards */}
            <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">At-Risk Wards</span>
              <div className="text-2xl font-black text-amber-600 font-mono mt-1">
                {wardRisks.filter((w) => w.requires_preventive_intervention).length}
              </div>
              <span className="text-[10px] text-amber-600 font-medium">Intervention Req.</span>
            </div>

            {/* Card 4: Predicted Failures (7 Days) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Failures (7d)</span>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {predictiveAssetsRisk.filter((a) => (a.predictions?.['7_days']?.risk_score || 0) >= 0.5).length}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Next 7 Days</span>
            </div>

            {/* Card 5: Predicted Failures (30 Days) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Failures (30d)</span>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {predictiveAssetsRisk.filter((a) => (a.predictions?.['30_days']?.risk_score || 0) >= 0.5).length}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Next 30 Days</span>
            </div>

            {/* Card 6: Preventive Actions Pending */}
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
            predictiveAssetsRisk={predictiveAssetsRisk}
            onRecluster={handleRecluster}
            reclustering={reclustering}
            onSelectComplaint={handleOpenStatusModal}
            onSelectAsset={(asset) => {
              setSelectedPredictiveAsset(asset);
              setPredictiveModalOpen(true);
            }}
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
            onFilterChange={handlePriorityFilterChange}
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
