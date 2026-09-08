import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Smartphone,
  Globe,
  Webhook,
  Sparkles,
  Filter,
  RefreshCw,
  Bell,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Send,
  Radio
} from 'lucide-react';
import { webhookService } from '../../services/webhookService';
import { govService } from '../../services/govService';
import OmnichannelSimulatorModal from './OmnichannelSimulatorModal';

export default function OmnichannelIntakeView() {
  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch omnichannel breakdown stats
      const statsRes = await webhookService.getOmnichannelStats();
      setStats(statsRes);

      // 2. Fetch complaints filtered by channel if selected
      const complaintParams = selectedChannel !== 'ALL' ? { source_channel: selectedChannel } : {};
      const complaintsRes = await govService.listComplaints(complaintParams);
      setComplaints(complaintsRes.complaints || complaintsRes || []);

      // 3. Fetch recent outbound notifications
      const notifsRes = await webhookService.getNotifications({ limit: 15 });
      setNotifications(notifsRes || []);
    } catch (err) {
      console.error('Failed to load omnichannel data:', err);
      setError(err.message || 'Failed to fetch omnichannel data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedChannel]);

  const getChannelBadge = (channel) => {
    switch (channel) {
      case 'WHATSAPP':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <MessageSquare className="w-3 h-3" /> WhatsApp
          </span>
        );
      case 'SMS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            <Smartphone className="w-3 h-3" /> SMS
          </span>
        );
      case 'WEBHOOK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Webhook className="w-3 h-3" /> Webhook
          </span>
        );
      case 'WEB':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <Globe className="w-3 h-3" /> Web Portal
          </span>
        );
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      RECEIVED: 'bg-slate-700 text-slate-300',
      AI_ANALYZED: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      ASSIGNED: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
      IN_PROGRESS: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
      RESOLVED: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    };
    return (
      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${map[status] || 'bg-slate-800 text-slate-300'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse" /> Omnichannel Gateway Active
              </span>
              <span className="text-xs text-slate-400 font-mono">Track C Ingestion Engine</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Omnichannel Grievance Intake & Notifications
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Citizens submit grievances via WhatsApp, SMS, Web Portal, or Partner Webhooks. All channels normalize automatically into the CivicPulse AI Pipeline with instant two-way SMS/WhatsApp lifecycle updates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-semibold flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setSimulatorOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition"
            >
              <Sparkles className="w-4 h-4" />
              Launch Simulator
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Omnichannel */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Grievances</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{stats?.total_complaints ?? 0}</span>
            <span className="text-xs text-slate-400">across 4 channels</span>
          </div>
          <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1 font-semibold">
            <CheckCircle className="w-3.5 h-3.5" /> 100% Unified Pipeline
          </div>
        </div>

        {/* WhatsApp Channel */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">WhatsApp Intake</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400">
              {stats?.channel_breakdown?.WHATSAPP ?? stats?.channel_stats?.WHATSAPP?.total ?? 0}
            </span>
            <span className="text-xs text-slate-400">
              ({stats?.total_complaints ? Math.round((((stats?.channel_breakdown?.WHATSAPP ?? stats?.channel_stats?.WHATSAPP?.total) || 0) / stats.total_complaints) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
            <span>Webhook: </span>
            <span className="font-mono text-emerald-300">/webhooks/whatsapp</span>
          </div>
        </div>

        {/* SMS Gateway */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">SMS Gateway</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-400">
              {stats?.channel_breakdown?.SMS ?? stats?.channel_stats?.SMS?.total ?? 0}
            </span>
            <span className="text-xs text-slate-400">
              ({stats?.total_complaints ? Math.round((((stats?.channel_breakdown?.SMS ?? stats?.channel_stats?.SMS?.total) || 0) / stats.total_complaints) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-2 text-xs text-indigo-300 flex items-center gap-1 font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> No-GPS Ward Fallback
          </div>
        </div>

        {/* Citizen Notifications Sent */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Notifications Sent</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400">
              {stats?.total_notifications_sent ?? 0}
            </span>
            <span className="text-xs text-slate-400">automated alerts</span>
          </div>
          <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1 font-semibold">
            <CheckCircle className="w-3.5 h-3.5" /> 100% Delivery (Simulated)
          </div>
        </div>
      </div>

      {/* Main Content Grid: Complaints Feed (8 cols) & Outbound Notifications (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Complaints Table by Channel */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-xl shadow-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Incoming Omnichannel Grievance Feed
                <span className="text-xs font-normal text-slate-400">({complaints.length} records)</span>
              </h2>
              <p className="text-xs text-slate-400">Every message passes through multilingual NLP, DBSCAN hotspot detection & IPS scoring.</p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['ALL', 'WHATSAPP', 'SMS', 'WEB', 'WEBHOOK'].map((ch) => (
                <button
                  key={ch}
                  onClick={() => setSelectedChannel(ch)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    selectedChannel === ch
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {ch === 'ALL' ? 'All' : ch}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Tracking ID</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Citizen Contact</th>
                  <th className="py-2.5 px-3">Category / Text</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {complaints.length > 0 ? (
                  complaints.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 font-mono font-bold text-slate-200">
                        {c.tracking_id}
                        {c.external_message_id && (
                          <div className="text-[10px] font-normal text-slate-500">
                            Ext: {c.external_message_id}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getChannelBadge(c.source_channel)}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        <div className="font-semibold text-white">{c.citizen_name || 'Citizen'}</div>
                        <div className="text-[11px] text-slate-400">{c.citizen_contact || 'Anonymous'}</div>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-semibold text-slate-200 truncate">
                          {c.category?.name || c.subcategory || 'Civic Issue'}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {c.raw_text}
                        </div>
                        {c.detected_language && c.detected_language !== 'en' && (
                          <span className="text-[10px] text-indigo-400 uppercase font-mono">
                            [{c.detected_language}] translated
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-rose-400">{c.priority_score}</span>
                          <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                            {c.severity_level}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getStatusBadge(c.status)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500">
                      No complaints found for channel filter: {selectedChannel}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Outbound Notifications Live Feed */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl shadow-xl p-5 space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Outbound Citizen Alerts</h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
              Live Mock Dispatch
            </span>
          </div>

          <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-1.5 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-emerald-400 flex items-center gap-1">
                      {n.channel === 'WHATSAPP' ? (
                        <MessageSquare className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Smartphone className="w-3 h-3 text-indigo-400" />
                      )}
                      {n.event_type}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {n.sent_at ? new Date(n.sent_at).toLocaleTimeString() : 'Just now'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 italic">
                    "{n.message}"
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/40">
                    <span>To: <strong className="text-slate-300">{n.citizen_identifier}</strong></span>
                    <span className="text-emerald-400 font-semibold font-mono">STATUS: {n.status}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                No outbound notifications recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Omnichannel Simulator Modal */}
      <OmnichannelSimulatorModal
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
        onComplaintIngested={() => {
          fetchData();
        }}
      />
    </div>
  );
}
