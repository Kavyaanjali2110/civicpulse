import React, { useState } from 'react';
import { PlusCircle, Search, ShieldCheck, Sparkles, Activity, CheckCircle, Radio } from 'lucide-react';
import ComplaintForm from '../components/citizen/ComplaintForm';
import ComplaintTracker from '../components/citizen/ComplaintTracker';
import { useLanguage } from '../context/LanguageContext';

export default function CitizenPortal() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('report');
  const [targetTrackingId, setTargetTrackingId] = useState('');

  const handleSwitchToTrack = (trackingId) => {
    setTargetTrackingId(trackingId);
    setActiveTab('track');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Hero Banner */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-civic-500/10 border border-civic-500/20 text-civic-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-civic-400 animate-pulse" />
          <span>Multilingual Citizen Feedback & AI Infrastructure Intelligence</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          CivicPulse Citizen Portal
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Report civic infrastructure issues via voice or text in any language. Our AI pipeline prioritizes emergency repairs and routes directly to municipal field crews.
        </p>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs text-slate-300">
          <div className="flex items-center space-x-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1 rounded-full">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>Real-Time AI Prioritization</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1 rounded-full">
            <Activity className="w-3.5 h-3.5 text-civic-400" />
            <span>DBSCAN Hotspot Grouping</span>
          </div>
          <div className="flex items-center space-x-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1 rounded-full">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>SLA Tracking Timeline</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex p-1 bg-slate-900/90 border border-slate-800 rounded-2xl max-w-md mx-auto shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab('report')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'report'
              ? 'bg-civic-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('tab_report')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('track')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'track'
              ? 'bg-civic-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>{t('tab_track')}</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'report' ? (
          <ComplaintForm onSwitchToTrack={handleSwitchToTrack} />
        ) : (
          <ComplaintTracker initialTrackingId={targetTrackingId} />
        )}
      </div>
    </div>
  );
}
