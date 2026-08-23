import React, { useState, useMemo } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Circle, 
  CircleMarker, 
  Marker, 
  Popup, 
  Tooltip 
} from 'react-leaflet';
import L from 'leaflet';
import { 
  Layers, 
  Flame, 
  Hospital, 
  GraduationCap, 
  Train, 
  RefreshCw, 
  Filter, 
  Info,
  Sparkles,
  MapPin
} from 'lucide-react';
import SeverityBadge from '../common/SeverityBadge';

// Custom POI Icon builder
const createPoiIcon = (type, emoji, color) => {
  return new L.DivIcon({
    className: 'custom-poi-icon',
    html: `
      <div style="
        background: ${color};
        width: 28px;
        height: 28px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        border: 2px solid #ffffff;
      ">
        ${emoji}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const hospitalIcon = createPoiIcon('HOSPITAL', '🏥', '#dc2626');
const schoolIcon = createPoiIcon('SCHOOL', '🏫', '#2563eb');
const transitIcon = createPoiIcon('TRANSIT_HUB', '🚉', '#d97706');

// Complaint Pin Icon
const complaintPinIcon = (sevLevel) => {
  const color = sevLevel === 'CRITICAL' ? '#e11d48' : sevLevel === 'HIGH' ? '#ea580c' : '#0284c7';
  return new L.DivIcon({
    className: 'custom-complaint-icon',
    html: `
      <div style="
        background: ${color};
        width: 22px;
        height: 22px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        border: 1.5px solid #ffffff;
      ">
        <div style="width: 6px; height: 6px; background: #ffffff; border-radius: 50%; transform: rotate(45deg);"></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  });
};

export default function InteractiveMap({
  hotspots = [],
  infrastructureAssets = [],
  heatmapPoints = [],
  complaints = [],
  categories = [],
  onRecluster,
  reclustering = false,
  onSelectComplaint,
}) {
  // Layer visibility state
  const [showHotspots, setShowHotspots] = useState(true);
  const [showAssets, setShowAssets] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showPins, setShowPins] = useState(true);

  // Filters
  const [selectedCatId, setSelectedCatId] = useState('ALL');

  const defaultCenter = useMemo(() => [19.0760, 72.8800], []);

  // Filtered complaints and heatmap points
  const filteredComplaints = useMemo(() => {
    if (selectedCatId === 'ALL') return complaints;
    return complaints.filter((c) => c.category_id === parseInt(selectedCatId));
  }, [complaints, selectedCatId]);

  const filteredHeatmap = useMemo(() => {
    if (selectedCatId === 'ALL') return heatmapPoints;
    const cat = categories.find((c) => c.id === parseInt(selectedCatId));
    if (!cat) return heatmapPoints;
    return heatmapPoints.filter((pt) => pt.category === cat.name);
  }, [heatmapPoints, selectedCatId, categories]);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-card space-y-4">
      {/* Map Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-teal-700" />
            <span>Infrastructure Intelligence Map</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Geospatial overlay of DBSCAN density clusters, critical public POIs, and complaint concentration zones.
          </p>
        </div>

        {/* Action Controls & Layer Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCatId}
              onChange={(e) => setSelectedCatId(e.target.value)}
              aria-label="Filter Map By Category"
              className="bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Layer Checkboxes */}
          <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-xl p-1 text-[11px] text-slate-600">
            <button
              type="button"
              onClick={() => setShowHotspots(!showHotspots)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                showHotspots ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              🔥 Hotspots ({hotspots.length})
            </button>
            <button
              type="button"
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                showHeatmap ? 'bg-rose-100 text-rose-900 border border-rose-300' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              ⚡ Heat Density
            </button>
            <button
              type="button"
              onClick={() => setShowAssets(!showAssets)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                showAssets ? 'bg-blue-100 text-blue-900 border border-blue-300' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              🏥 Public POIs ({infrastructureAssets.length})
            </button>
            <button
              type="button"
              onClick={() => setShowPins(!showPins)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                showPins ? 'bg-teal-100 text-teal-900 border border-teal-300' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              📍 Pins ({filteredComplaints.length})
            </button>
          </div>

          {/* Trigger DBSCAN Recluster */}
          <button
            type="button"
            onClick={onRecluster}
            disabled={reclustering}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reclustering ? 'animate-spin' : ''}`} />
            <span>{reclustering ? 'Clustering...' : 'DBSCAN Re-Cluster'}</span>
          </button>
        </div>
      </div>

      {/* Leaflet Map Canvas */}
      <div className="h-[460px] w-full rounded-2xl overflow-hidden border border-slate-200 relative shadow-sm">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* 1. Heatmap Density Circles Layer */}
          {showHeatmap &&
            filteredHeatmap.map((pt, idx) => {
              const radius = Math.max(80, pt.intensity * 240);
              const color =
                pt.intensity >= 0.8
                  ? '#e11d48'
                  : pt.intensity >= 0.5
                  ? '#ea580c'
                  : '#0284c7';

              return (
                <Circle
                  key={`heat-${idx}`}
                  center={[pt.lat, pt.lng]}
                  radius={radius}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: Math.min(0.35, pt.intensity * 0.45),
                    color: color,
                    weight: 1,
                    opacity: 0.5,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -5]} opacity={0.95}>
                    <div className="text-xs font-sans">
                      <strong className="text-slate-900">{pt.title}</strong>
                      <div className="text-slate-500 text-[10px]">
                        Intensity: {(pt.intensity * 100).toFixed(0)}% • {pt.category}
                      </div>
                    </div>
                  </Tooltip>
                </Circle>
              );
            })}

          {/* 2. DBSCAN Hotspots Layer */}
          {showHotspots &&
            hotspots.map((h) => {
              const isCritical = h.avg_severity >= 0.8 || h.aggregate_priority_score >= 80;
              const circleColor = isCritical ? '#dc2626' : '#d97706';

              return (
                <React.Fragment key={`hotspot-${h.id}`}>
                  <Circle
                    center={[h.centroid_lat, h.centroid_lon]}
                    radius={h.radius_meters || 300}
                    pathOptions={{
                      fillColor: circleColor,
                      fillOpacity: 0.18,
                      color: circleColor,
                      weight: 2,
                      dashArray: '4, 6',
                    }}
                  />

                  <CircleMarker
                    center={[h.centroid_lat, h.centroid_lon]}
                    radius={11}
                    pathOptions={{
                      fillColor: circleColor,
                      fillOpacity: 0.95,
                      color: '#ffffff',
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="p-1 space-y-2 max-w-xs text-xs">
                        <div className="flex items-center justify-between border-b pb-1">
                          <span className="font-mono font-bold text-slate-900">
                            {h.cluster_code}
                          </span>
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {h.complaint_count} Reports
                          </span>
                        </div>
                        <div className="text-slate-700">
                          <strong>Category:</strong> {h.category?.name || 'Civic'}
                        </div>
                        <div className="text-slate-700">
                          <strong>Priority (IPS):</strong> {h.aggregate_priority_score.toFixed(1)} / 100
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[11px] text-slate-700">
                          <strong className="text-slate-900 block mb-0.5">AI Summary:</strong>
                          {h.ai_summary}
                        </div>
                        {h.ai_recommendation && (
                          <div className="bg-amber-50 p-2 rounded border border-amber-200 text-[11px] text-amber-900">
                            <strong className="block mb-0.5">Tactical Action Plan:</strong>
                            {h.ai_recommendation}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                </React.Fragment>
              );
            })}

          {/* 3. Critical Infrastructure POIs Layer */}
          {showAssets &&
            infrastructureAssets.map((asset) => {
              let icon = hospitalIcon;
              if (asset.asset_type === 'SCHOOL') icon = schoolIcon;
              if (asset.asset_type === 'TRANSIT_HUB') icon = transitIcon;

              return (
                <Marker
                  key={`asset-${asset.id}`}
                  position={[asset.latitude, asset.longitude]}
                  icon={icon}
                >
                  <Popup>
                    <div className="p-1 text-xs">
                      <strong className="text-slate-900 block">{asset.name}</strong>
                      <span className="text-slate-500 text-[11px]">
                        Type: {asset.asset_type} • Vulnerability Weight: {(asset.vulnerability_weight * 100).toFixed(0)}%
                      </span>
                    </div>
                  </Popup>
                  <Tooltip direction="top" offset={[0, -14]} opacity={0.95}>
                    <span className="text-xs font-semibold">{asset.name}</span>
                  </Tooltip>
                </Marker>
              );
            })}

          {/* 4. Individual Complaint Pins */}
          {showPins &&
            filteredComplaints.slice(0, 35).map((c) => (
              <Marker
                key={`comp-${c.id}`}
                position={[c.latitude, c.longitude]}
                icon={complaintPinIcon(c.severity_level)}
                eventHandlers={{
                  click: () => {
                    if (onSelectComplaint) onSelectComplaint(c);
                  },
                }}
              >
                <Popup>
                  <div className="p-1 space-y-1.5 max-w-xs text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">{c.tracking_id}</span>
                      <span className="text-[10px] font-semibold text-slate-600">{c.status}</span>
                    </div>
                    <p className="text-slate-700 italic">"{c.translated_text || c.raw_text}"</p>
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t">
                      <span>IPS: <strong>{c.priority_score.toFixed(1)}</strong></span>
                      <span>Sev: <strong>{c.severity_level}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectComplaint && onSelectComplaint(c)}
                      className="w-full mt-1 py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold text-center cursor-pointer transition-colors"
                    >
                      View Details &amp; Dispatch
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>

        {/* Floating Map Legend */}
        <div className="absolute bottom-3 right-3 z-[400] bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3 shadow-elevation text-xs space-y-1.5">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Map Legend
          </div>
          <div className="flex items-center space-x-2 text-slate-700 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
            <span>Critical Severity / Hotspot</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-700 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
            <span>High Severity</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-700 text-[11px]">
            <span className="w-3.5 h-3.5 rounded bg-red-600 text-white text-[9px] flex items-center justify-center">🏥</span>
            <span>Hospital POI</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-700 text-[11px]">
            <span className="w-3.5 h-3.5 rounded bg-blue-600 text-white text-[9px] flex items-center justify-center">🏫</span>
            <span>School / College POI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
