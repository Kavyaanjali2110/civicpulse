import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  Smartphone,
  Webhook,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  MapPin,
  Image as ImageIcon,
  CheckCheck,
  RefreshCw
} from 'lucide-react';
import { webhookService } from '../../services/webhookService';

export default function OmnichannelSimulatorModal({ isOpen, onClose, onComplaintIngested }) {
  const [activeChannel, setActiveChannel] = useState('WHATSAPP');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [outgoingNotifications, setOutgoingNotifications] = useState([]);

  // WhatsApp Form State
  const [waPhone, setWaPhone] = useState('+919876543210');
  const [waName, setWaName] = useState('Aarav Sharma');
  const [waText, setWaText] = useState('Severe water pipeline burst near Dadar Market causing heavy flooding on main road.');
  const [waLocation, setWaLocation] = useState('19.0178, 72.8478');
  const [waMediaUrl, setWaMediaUrl] = useState('');

  // SMS Form State
  const [smsPhone, setSmsPhone] = useState('+919812345678');
  const [smsSenderName, setSmsSenderName] = useState('Priya Patel');
  const [smsText, setSmsText] = useState('Streetlight fixture completely unhinged and swinging in heavy wind outside ward 4 hospital.');
  const [smsLocationFallback, setSmsLocationFallback] = useState('profile'); // 'profile', 'none'

  // Webhook Form State
  const [webhookSource, setWebhookSource] = useState('SMART_CITY_IOT_SENSORS');
  const [webhookPayload, setWebhookPayload] = useState(JSON.stringify({
    source: "Smart City Urban IoT Network",
    external_ticket_id: "IOT-PWR-8821",
    citizen_name: "Automated Sensor #402",
    contact: "noc-sensors@civicpulse.gov",
    description: "High voltage transformer overheating with sparking detected at substation grid junction",
    category_hint: "ELECTRICITY",
    latitude: 19.0760,
    longitude: 72.8777,
    address: "Substation Bay 4, Central Metro Zone"
  }, null, 2));

  if (!isOpen) return null;

  const handlePresetSelect = (channel, text, coords, hint) => {
    if (channel === 'WHATSAPP') {
      setWaText(text);
      if (coords) setWaLocation(coords);
    } else if (channel === 'SMS') {
      setSmsText(text);
    } else {
      try {
        const obj = JSON.parse(webhookPayload);
        obj.description = text;
        if (coords) {
          const [lat, lon] = coords.split(',').map(s => parseFloat(s.trim()));
          obj.latitude = lat;
          obj.longitude = lon;
        }
        if (hint) obj.category_hint = hint;
        setWebhookPayload(JSON.stringify(obj, null, 2));
      } catch (err) {
        // ignore json parse error
      }
    }
  };

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    setLastResult(null);
    setOutgoingNotifications([]);

    try {
      let result;
      const timestampSuffix = Date.now().toString().slice(-6);

      if (activeChannel === 'WHATSAPP') {
        const [latStr, lonStr] = waLocation ? waLocation.split(',').map(s => s.trim()) : [null, null];
        const lat = latStr ? parseFloat(latStr) : null;
        const lon = lonStr ? parseFloat(lonStr) : null;

        const payload = {
          message_id: `WA-SIM-${timestampSuffix}`,
          from: waPhone.trim(),
          sender_name: waName.trim(),
          type: waMediaUrl ? 'image' : 'text',
          text: waText.trim(),
          media_url: waMediaUrl.trim() || null,
          location: (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) ? {
            latitude: lat,
            longitude: lon,
            name: "WhatsApp Shared Location Pin"
          } : null
        };

        result = await webhookService.postWhatsAppWebhook(payload);
      } else if (activeChannel === 'SMS') {
        const payload = {
          sms_id: `SMS-SIM-${timestampSuffix}`,
          sender: smsPhone.trim(),
          sender_name: smsSenderName.trim(),
          body: smsText.trim()
        };

        result = await webhookService.postSMSWebhook(payload);
      } else {
        // Generic Webhook
        let parsed;
        try {
          parsed = JSON.parse(webhookPayload);
        } catch (err) {
          throw new Error("Invalid JSON payload in Generic Webhook editor.");
        }
        parsed.external_ticket_id = parsed.external_ticket_id || `EXT-SIM-${timestampSuffix}`;
        result = await webhookService.postGenericWebhook(parsed);
      }

      setLastResult(result);

      // Fetch simulated two-way outgoing notifications for this complaint
      if (result && result.complaint_id) {
        try {
          const notifs = await webhookService.getComplaintNotifications(result.complaint_id);
          setOutgoingNotifications(notifs);
        } catch (nErr) {
          console.error("Could not fetch outgoing notifications:", nErr);
        }
      }

      if (onComplaintIngested) {
        onComplaintIngested(result);
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Failed to ingest message via webhook.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Omnichannel Civic Grievance Simulator
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Track C Live
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Simulate citizen grievances arriving from WhatsApp, SMS, or Partner Webhooks into the CivicPulse AI Pipeline.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Channel Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/80 px-6">
          <button
            onClick={() => { setActiveChannel('WHATSAPP'); setLastResult(null); setError(null); }}
            className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeChannel === 'WHATSAPP'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>WhatsApp Messenger</span>
            <span className="text-xs px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 font-mono">Mock Webhook</span>
          </button>

          <button
            onClick={() => { setActiveChannel('SMS'); setLastResult(null); setError(null); }}
            className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeChannel === 'SMS'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4 text-indigo-400" />
            <span>Standard SMS Gateway</span>
            <span className="text-xs px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 font-mono">No-GPS Fallback</span>
          </button>

          <button
            onClick={() => { setActiveChannel('WEBHOOK'); setLastResult(null); setError(null); }}
            className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeChannel === 'WEBHOOK'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Webhook className="w-4 h-4 text-amber-400" />
            <span>Generic Partner Webhook</span>
            <span className="text-xs px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 font-mono">IoT / 311 API</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Message Composer Form */}
          <div className="lg:col-span-7 space-y-4">
            {/* Presets Bar */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quick Test Scenarios:</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handlePresetSelect(
                    activeChannel,
                    'Dangerous water pipe rupture flooding Dadar railway station road with murky water.',
                    '19.0178, 72.8478',
                    'WATER'
                  )}
                  className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                >
                  💧 Water Burst (Dadar)
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSelect(
                    activeChannel,
                    'Deep dangerous pothole on Western Express Highway near Andheri flyover causing motorbikes to skid.',
                    '19.1197, 72.8464',
                    'ROADS'
                  )}
                  className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                >
                  🕳️ Pothole Skid (Andheri)
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSelect(
                    activeChannel,
                    'Streetlight cable sparking and completely dark street near Ward 4 school gate.',
                    '19.0760, 72.8777',
                    'ELECTRICITY'
                  )}
                  className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                >
                  ⚡ Sparking Cable (Ward 4)
                </button>
              </div>
            </div>

            {/* CHANNEL 1: WHATSAPP */}
            {activeChannel === 'WHATSAPP' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">WhatsApp Phone Number</label>
                    <input
                      type="text"
                      value={waPhone}
                      onChange={(e) => setWaPhone(e.target.value)}
                      placeholder="+919876543210"
                      className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Citizen Display Name</label>
                    <input
                      type="text"
                      value={waName}
                      onChange={(e) => setWaName(e.target.value)}
                      placeholder="Citizen Name"
                      className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    WhatsApp Message Text (Multilingual Supported)
                  </label>
                  <textarea
                    rows={3}
                    value={waText}
                    onChange={(e) => setWaText(e.target.value)}
                    placeholder="Enter citizen grievance in English, Hindi, Marathi, etc."
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      Shared Location Pin (Lat, Lon)
                    </label>
                    <input
                      type="text"
                      value={waLocation}
                      onChange={(e) => setWaLocation(e.target.value)}
                      placeholder="19.0760, 72.8777"
                      className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                      Attached Image URL (Optional)
                    </label>
                    <input
                      type="text"
                      value={waMediaUrl}
                      onChange={(e) => setWaMediaUrl(e.target.value)}
                      placeholder="https://example.com/pothole.jpg"
                      className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* CHANNEL 2: SMS */}
            {activeChannel === 'SMS' && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 flex items-start gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>SMS No-GPS Intelligence:</strong> SMS submissions do not carry hardware GPS coordinates.
                    CivicPulse AI automatically checks citizen profile history or defaults to Ward 1 headquarters geocoding fallback so field crews still receive a valid dispatch zone!
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Sender Mobile Number</label>
                    <input
                      type="text"
                      value={smsPhone}
                      onChange={(e) => setSmsPhone(e.target.value)}
                      placeholder="+919812345678"
                      className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Sender Name</label>
                    <input
                      type="text"
                      value={smsSenderName}
                      onChange={(e) => setSmsSenderName(e.target.value)}
                      placeholder="Citizen Name"
                      className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-medium text-slate-400">SMS Body Text</label>
                    <span className="text-xs text-slate-500 font-mono">{smsText.length} / 160 chars</span>
                  </div>
                  <textarea
                    rows={4}
                    value={smsText}
                    onChange={(e) => setSmsText(e.target.value)}
                    placeholder="Enter short SMS message..."
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
            )}

            {/* CHANNEL 3: GENERIC WEBHOOK */}
            {activeChannel === 'WEBHOOK' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-slate-400">Partner Webhook JSON Payload</label>
                  <span className="text-xs text-amber-400 font-mono">POST /api/v1/webhooks/civic-complaint</span>
                </div>
                <textarea
                  rows={8}
                  value={webhookPayload}
                  onChange={(e) => setWebhookPayload(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Action */}
            <button
              onClick={handleSend}
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center space-x-2 transition-all shadow-lg ${
                activeChannel === 'WHATSAPP'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  : activeChannel === 'SMS'
                  ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                  : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executing Unified Ingestion Pipeline...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    Simulate Inbound {activeChannel === 'WHATSAPP' ? 'WhatsApp Message' : activeChannel === 'SMS' ? 'SMS Grievance' : 'Partner Webhook'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Live Chat / Outbound Notification Simulation */}
          <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    activeChannel === 'WHATSAPP' ? 'bg-emerald-500' : activeChannel === 'SMS' ? 'bg-indigo-500' : 'bg-amber-500'
                  } animate-pulse`} />
                  <span className="text-xs font-semibold text-slate-300">Live Channel Handshake</span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase">Two-Way Status</span>
              </div>

              {/* Ingestion Pipeline Output Card */}
              {lastResult ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Grievance Ingested Successfully
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300">
                        {lastResult.source_channel}
                      </span>
                    </div>

                    <div className="text-xs text-slate-200">
                      Tracking ID: <span className="font-mono font-bold text-emerald-300">{lastResult.tracking_id}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-300 border-t border-emerald-500/20">
                      <div>
                        <span className="text-slate-400">Category:</span>{' '}
                        <span className="font-semibold text-white">{lastResult.category}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Zone:</span>{' '}
                        <span className="font-semibold text-white">{lastResult.ward_name?.split('–')[0] || 'Ward 1'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Severity:</span>{' '}
                        <span className="font-semibold text-amber-300">{lastResult.severity_level}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">IPS Priority:</span>{' '}
                        <span className="font-semibold text-rose-300">{lastResult.priority_score}/100</span>
                      </div>
                    </div>
                  </div>

                  {/* Two-Way Outbound Citizen Notification Mockup */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Automated Citizen Notifications Dispatched:
                    </label>

                    {outgoingNotifications.length > 0 ? (
                      outgoingNotifications.map((notif, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span className="font-semibold text-emerald-400">{notif.event_type}</span>
                            <span className="font-mono text-slate-500">Delivered ({notif.channel})</span>
                          </div>
                          <p className="text-slate-200 text-xs italic">
                            "{notif.message}"
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 rounded-lg bg-slate-900/60 border border-dashed border-slate-800 text-center text-xs text-slate-500">
                        Initial dispatch notification recorded in database with status SENT.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 mb-3">
                    <Clock className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-medium text-slate-400">Awaiting Inbound Message</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                    Choose a scenario on the left and click Simulate to see live AI ingestion, category prediction, and automated citizen SMS/WhatsApp reply generation.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>CivicPulse Omnichannel Engine</span>
              <span className="font-mono">v1.3.0 Verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
