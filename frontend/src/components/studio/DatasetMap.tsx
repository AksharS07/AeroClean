import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Edit3, Layers, Filter } from 'lucide-react';
import { DatasetImageSummary } from '../../types/studio';
import { studioApi } from '../../services/studioApi';

interface DatasetMapProps {
  onSelectImageToAnnotate: (imageId: string) => void;
}

const createPinIcon = (category: string, isAnnotated: boolean) => {
  const bg = category === 'clean' 
    ? '#10b981' 
    : category === 'heavily_littered' 
    ? '#ef4444' 
    : category === 'littered' 
    ? '#f59e0b' 
    : '#6b7280';

  const ring = isAnnotated ? 'border: 2.5px solid #38bdf8;' : 'border: 2px solid white;';

  return L.divIcon({
    className: 'custom-dataset-pin',
    html: `<div style="width: 28px; height: 28px; border-radius: 50%; background-color: ${bg}; ${ring} display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
             <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
           </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

function MapFitter({ images }: { images: DatasetImageSummary[] }) {
  const map = useMap();
  useEffect(() => {
    const valid = images.filter((img) => img.gps_latitude && img.gps_longitude);
    if (valid.length > 0) {
      const lats = valid.map((img) => img.gps_latitude!);
      const lngs = valid.map((img) => img.gps_longitude!);
      map.fitBounds([
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ], { padding: [60, 60] });
    }
  }, [images, map]);
  return null;
}

export const DatasetMap: React.FC<DatasetMapProps> = ({ onSelectImageToAnnotate }) => {
  const [images, setImages] = useState<DatasetImageSummary[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const defaultCenter: [number, number] = [12.8688, 74.8423]; // Mangalore

  useEffect(() => {
    studioApi.listImages({ has_gps: true }).then((res) => {
      setImages(res.images);
    });
  }, []);

  const filteredImages = images.filter((img) => {
    if (filterCategory === 'all') return true;
    return img.category === filterCategory;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Map Filter Bar */}
      <div className="glass-card p-3 rounded-2xl border border-gray-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-300 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-400" />
            Geotagged Dataset Images ({filteredImages.length} mapped):
          </span>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-gray-200"
          >
            <option value="all">All Mapped Categories</option>
            <option value="clean">Clean (Green)</option>
            <option value="littered">Littered (Yellow)</option>
            <option value="heavily_littered">Heavily Littered (Red)</option>
            <option value="unknown">Unknown (Gray)</option>
          </select>
        </div>

        <div className="flex items-center gap-4 text-gray-400 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Clean
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Littered
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Heavy
          </span>
          <span className="flex items-center gap-1.5 text-cyan-300">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-cyan-400 inline-block"></span> Cyan Ring = Ground Truth
          </span>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[620px] rounded-2xl overflow-hidden border border-gray-800 shadow-2xl bg-gray-950 z-0 isolate">
        <MapContainer center={defaultCenter} zoom={14} scrollWheelZoom={true} className="w-full h-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapFitter images={filteredImages} />

          {filteredImages.map((img) => {
            if (!img.gps_latitude || !img.gps_longitude) return null;
            const isAnnotated = img.annotation_status === 'human_verified';

            return (
              <Marker
                key={img.id}
                position={[img.gps_latitude, img.gps_longitude]}
                icon={createPinIcon(img.category, isAnnotated)}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-2.5 text-gray-900 font-sans max-w-xs space-y-2">
                    <div className="rounded-lg overflow-hidden h-28 border border-gray-200">
                      <img
                        src={img.thumbnail_path || img.file_path}
                        alt="thumb"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-gray-900 truncate">{img.filename}</h5>
                      <p className="text-[11px] text-gray-600">
                        Category: <strong className="capitalize">{img.category.replace('_', ' ')}</strong>
                      </p>
                      <p className="text-[11px] text-gray-500 font-mono">
                        {img.gps_latitude.toFixed(5)}°N, {img.gps_longitude.toFixed(5)}°E
                      </p>
                      <p className="text-[11px] text-gray-600">
                        Annotations: <strong>{img.annotation_count} ground-truth boxes</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => onSelectImageToAnnotate(img.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Open in Annotation Studio
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};
