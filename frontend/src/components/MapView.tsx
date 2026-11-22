import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { SurveyDetail, HotspotItem, ImageDetails } from '../types';
import { ShieldAlert, Image, MapPin, Eye, Upload, Layers, ZoomIn, Grid } from 'lucide-react';

interface MapViewProps {
  survey: SurveyDetail | null;
  onSelectHotspot: (hotspot: HotspotItem) => void;
  onSelectImage: (image: ImageDetails) => void;
  onOpenUpload?: () => void;
}

// Custom pulsing pin icon for Hotspots
const customHotspotIcon = L.divIcon({
  className: 'custom-hotspot-pin',
  html: `<div class="w-9 h-9 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white shadow-xl shadow-red-600/60 animate-bounce cursor-pointer hover:scale-110 transition-transform">
           <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
         </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

function MapController({ bounds, targetCoords }: { bounds?: { min_lat: number; max_lat: number; min_lng: number; max_lng: number }; targetCoords?: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (targetCoords) {
      map.flyTo(targetCoords, 17.5, { duration: 1.2 });
    } else if (bounds && bounds.min_lat && bounds.max_lat && bounds.min_lat !== bounds.max_lat) {
      map.fitBounds([
        [bounds.min_lat, bounds.min_lng],
        [bounds.max_lat, bounds.max_lng]
      ], { padding: [50, 50] });
    }
  }, [bounds, targetCoords, map]);

  return null;
}

export const MapView: React.FC<MapViewProps> = ({ 
  survey, 
  onSelectHotspot, 
  onSelectImage,
  onOpenUpload 
}) => {
  // Default coordinates: Mangalore, Karnataka (Central Market / Hampankatta)
  const defaultCenter: [number, number] = [12.8688, 74.8423];
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<HotspotItem | null>(null);

  const getColorByGI = (gi: number) => {
    if (gi <= 25) return '#10b981'; // Green (Clean)
    if (gi <= 50) return '#f59e0b'; // Yellow (Moderate)
    if (gi <= 75) return '#f97316'; // Orange (High)
    return '#ef4444'; // Red (Critical Hotspot)
  };

  const handleHotspotClick = (hotspot: HotspotItem) => {
    setFlyTarget([hotspot.latitude, hotspot.longitude]);
    onSelectHotspot(hotspot);
  };

  return (
    <div className="relative w-full h-[640px] rounded-2xl overflow-hidden border border-gray-800 shadow-2xl bg-gray-950 z-0 isolate">
      <MapContainer
        center={defaultCenter}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController bounds={survey?.bounds} targetCoords={flyTarget} />

        {/* Heatmap intensity circle markers */}
        {survey?.images.map((img) => {
          if (!img.gps_latitude || !img.gps_longitude) return null;
          const color = getColorByGI(img.garbage_index);

          return (
            <CircleMarker
              key={img.id}
              center={[img.gps_latitude, img.gps_longitude]}
              radius={Math.max(14, Math.min(32, img.garbage_index / 2.7))}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.60,
                weight: 2,
              }}
            >
              <Popup className="custom-leaflet-popup">
                <div className="p-2.5 text-gray-900 font-sans max-w-xs">
                  <div className="flex items-center gap-1.5 font-bold text-xs mb-1 text-gray-800">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{img.original_filename}</span>
                  </div>
                  <div className="text-xs space-y-1 bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <p className="flex justify-between">
                      <span>Garbage Index:</span>
                      <strong style={{ color }}>{img.garbage_index} / 100</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Detected Litter:</span>
                      <strong>{img.garbage_count} items</strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Confidence:</span>
                      <strong>{Math.round(img.confidence_avg * 100)}%</strong>
                    </p>
                    <p className="flex justify-between text-[11px] text-gray-500">
                      <span>Location:</span>
                      <span>{img.gps_latitude.toFixed(4)}°N, {img.gps_longitude.toFixed(4)}°E</span>
                    </p>
                  </div>
                  <button
                    onClick={() => onSelectImage(img)}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" /> Inspect Bounding Boxes
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Hotspot Markers with Hover & Zoom triggers */}
        {survey?.hotspots.map((hotspot) => {
          const zoneImages = hotspot.images && hotspot.images.length > 0 
            ? hotspot.images 
            : survey.images.filter(img => hotspot.image_ids?.includes(img.id));

          return (
            <Marker
              key={hotspot.id}
              position={[hotspot.latitude, hotspot.longitude]}
              icon={customHotspotIcon}
              eventHandlers={{
                click: () => handleHotspotClick(hotspot),
                mouseover: () => setHoveredHotspot(hotspot),
                mouseout: () => setHoveredHotspot(null),
              }}
            >
              {/* Sleek On-Hover Tooltip Peek */}
              <Tooltip 
                direction="top" 
                offset={[0, -20]} 
                opacity={0.98}
                className="custom-leaflet-tooltip"
              >
                <div className="p-2 font-sans text-gray-900 min-w-[200px]">
                  <div className="flex items-center justify-between gap-2 mb-1 border-b pb-1">
                    <span className="font-bold text-xs text-red-600 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {hotspot.zone_name || 'Garbage Hotspot Zone'}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                      GI: {hotspot.garbage_index}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-blue-600" />
                    <strong>{zoneImages.length} Drone Images</strong> in this zone
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Total Litter: <strong>{hotspot.garbage_count} items</strong> ({hotspot.primary_category})
                  </p>
                  <p className="text-[10px] text-blue-600 font-semibold mt-1 flex items-center gap-0.5">
                    <ZoomIn className="w-3 h-3" /> Click to Zoom & Evaluate Zone
                  </p>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Top Banner indicating Mangalore region */}
      <div className="absolute top-4 left-4 z-10 glass-panel px-3.5 py-2 rounded-xl border border-gray-800 text-xs shadow-xl flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="font-semibold text-white">Region: Mangaluru, Karnataka</span>
        <span className="text-gray-400 text-[11px]">(12.8688° N, 74.8423° E)</span>
      </div>

      {/* Live Zone Hover Peek Floater (Bottom Left) */}
      {hoveredHotspot && (
        <div className="absolute bottom-16 left-4 z-10 glass-panel p-3.5 rounded-xl border border-red-500/40 shadow-2xl max-w-sm w-full animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">{hoveredHotspot.zone_name || 'Hotspot Zone'}</h4>
                <p className="text-[10px] text-gray-400">Hovering Zone Pin • Click to Zoom</p>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-red-500/20 text-red-400 border border-red-500/30">
              GI: {hoveredHotspot.garbage_index}
            </span>
          </div>

          {/* Thumbnail preview strip of all images in this zone */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-gray-300">
              <span className="flex items-center gap-1 font-semibold">
                <Grid className="w-3 h-3 text-cyan-400" />
                Zone Pictures ({hoveredHotspot.images?.length || 1} Frames):
              </span>
              <span className="text-gray-400">{hoveredHotspot.garbage_count} total litter</span>
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {hoveredHotspot.images?.map((img) => (
                <div
                  key={img.id}
                  onClick={() => handleHotspotClick(hoveredHotspot)}
                  className="shrink-0 w-16 h-14 rounded-lg overflow-hidden border border-gray-700 hover:border-blue-400 cursor-pointer relative group transition-transform hover:scale-105"
                >
                  <img src={img.annotated_path || img.raw_path} alt="preview" className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 right-0 px-1 py-0.2 bg-black/80 text-[8px] text-cyan-300 font-bold">
                    GI:{img.garbage_index}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State Banner if no survey loaded */}
      {!survey && (
        <div className="absolute inset-0 z-20 bg-gray-950/75 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="glass-card max-w-md w-full p-6 rounded-2xl border border-blue-500/30 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-3.5 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 w-fit mx-auto">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">No Drone Survey Loaded</h3>
              <p className="text-xs text-gray-300 mt-1">
                Upload aerial and roadside flight photos taken from your drone survey to run AI garbage detection, cluster hotspots, and generate the Garbage Index heatmap.
              </p>
            </div>
            {onOpenUpload && (
              <button
                onClick={onOpenUpload}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition"
              >
                <Upload className="w-4 h-4" />
                Upload Drone Survey Photos
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Legend Overlay */}
      <div className="absolute bottom-4 right-4 z-10 glass-panel px-4 py-3 rounded-xl border border-gray-800 text-xs shadow-xl space-y-2">
        <h4 className="font-bold text-gray-200 uppercase tracking-wider text-[10px]">Garbage Index (GI) Severity</h4>
        <div className="flex items-center gap-3.5 text-gray-300">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Clean (0-25)</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> Moderate (26-50)</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block"></span> High (51-75)</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> Hotspot (76-100)</div>
        </div>
      </div>
    </div>
  );
};
