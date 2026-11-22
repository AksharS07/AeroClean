import React, { useState, useEffect } from 'react';
import { X, MapPin, AlertTriangle, Layers, Award, Tag, Sparkles, ChevronLeft, ChevronRight, Grid, Image as ImageIcon, Compass } from 'lucide-react';
import { ImageDetails, HotspotItem } from '../types';

interface HotspotModalProps {
  isOpen: boolean;
  image: ImageDetails | null;
  hotspot: HotspotItem | null;
  onClose: () => void;
}

export const HotspotModal: React.FC<HotspotModalProps> = ({ isOpen, image, hotspot, onClose }) => {
  const [viewAnnotated, setViewAnnotated] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Collect all images in this zone
  const zoneImages: ImageDetails[] = React.useMemo(() => {
    if (hotspot?.images && hotspot.images.length > 0) {
      return hotspot.images;
    }
    if (image) {
      return [image];
    }
    return [];
  }, [hotspot, image]);

  useEffect(() => {
    // If specific image passed, find its index in zoneImages
    if (image && zoneImages.length > 0) {
      const idx = zoneImages.findIndex(img => img.id === image.id);
      if (idx !== -1) {
        setSelectedImageIndex(idx);
      } else {
        setSelectedImageIndex(0);
      }
    } else {
      setSelectedImageIndex(0);
    }
  }, [image, zoneImages]);

  if (!isOpen || (zoneImages.length === 0 && !hotspot)) return null;

  const currentImage = zoneImages[selectedImageIndex] || image;
  const gi = currentImage?.garbage_index ?? hotspot?.garbage_index ?? 0;
  const count = currentImage?.garbage_count ?? hotspot?.garbage_count ?? 0;
  const lat = currentImage?.gps_latitude ?? hotspot?.latitude;
  const lng = currentImage?.gps_longitude ?? hotspot?.longitude;
  const zoneTitle = hotspot?.zone_name || (currentImage ? currentImage.original_filename : 'Garbage Hotspot Zone');

  const getBadgeColor = (val: number) => {
    if (val <= 25) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (val <= 50) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    if (val <= 75) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const rawPath = currentImage?.raw_path || '';
  const annotatedPath = currentImage?.annotated_path || rawPath;
  const currentImgSrc = viewAnnotated ? annotatedPath : rawPath;

  const handlePrevImage = () => {
    if (zoneImages.length > 1) {
      setSelectedImageIndex(prev => (prev > 0 ? prev - 1 : zoneImages.length - 1));
    }
  };

  const handleNextImage = () => {
    if (zoneImages.length > 1) {
      setSelectedImageIndex(prev => (prev < zoneImages.length - 1 ? prev + 1 : 0));
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-5xl rounded-2xl border border-gray-800 p-6 shadow-2xl relative z-[100000] max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/60 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {zoneTitle}
                </h2>
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getBadgeColor(gi)}`}>
                  GI: {gi} / 100
                </span>
                {zoneImages.length > 1 && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                    <Layers className="w-3 h-3" /> {zoneImages.length} Aerial Angles
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                Mangalore GPS: {lat ? lat.toFixed(5) : '12.8688'}° N, {lng ? lng.toFixed(5) : '74.8423'}° E
              </p>
            </div>
          </div>

          {/* Image Layer Toggle Button */}
          {currentImage && (
            <div className="flex items-center bg-gray-900/80 p-1 rounded-xl border border-gray-800 mr-8">
              <button
                onClick={() => setViewAnnotated(false)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  !viewAnnotated ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                Raw Drone Image
              </button>
              <button
                onClick={() => setViewAnnotated(true)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1 ${
                  viewAnnotated ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3 text-cyan-300" />
                AI Bounding Boxes
              </button>
            </div>
          )}
        </div>

        {/* Main Body */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0 overflow-y-auto pr-1">
          {/* Main Photo Viewer */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <div className="relative rounded-2xl overflow-hidden border border-gray-800 bg-black flex items-center justify-center min-h-[360px] max-h-[440px] group">
              {currentImgSrc ? (
                <img
                  src={currentImgSrc}
                  alt="Zone frame view"
                  className="w-full h-full object-contain max-h-[430px]"
                />
              ) : (
                <div className="text-gray-500 text-sm">No preview image available</div>
              )}
              
              {/* Navigation Arrows if multi-image zone */}
              {zoneImages.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70 hover:bg-black/90 text-white border border-gray-700 transition"
                    title="Previous Frame in Zone"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70 hover:bg-black/90 text-white border border-gray-700 transition"
                    title="Next Frame in Zone"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Bottom Tags */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <div className="glass-panel px-3 py-1 rounded-lg text-[10px] text-gray-200">
                  {currentImage?.original_filename || 'Drone Frame'}
                </div>
                <div className="glass-panel px-3 py-1 rounded-lg text-[10px] text-cyan-300 font-semibold">
                  Layer: {viewAnnotated ? 'YOLO AI Detection & BBoxes' : 'High-Res Optical Overhead'}
                </div>
              </div>
            </div>

            {/* Zone Multi-Image Carousel / Gallery Strip */}
            {zoneImages.length > 1 && (
              <div className="glass-card p-3 rounded-xl border border-gray-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-300">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Grid className="w-3.5 h-3.5 text-blue-400" />
                    All Pictures in this Zone ({zoneImages.length} Drone Frames):
                  </span>
                  <span className="text-gray-500 text-[11px]">
                    Viewing {selectedImageIndex + 1} of {zoneImages.length}
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {zoneImages.map((img, idx) => (
                    <div
                      key={img.id}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                        idx === selectedImageIndex
                          ? 'border-blue-500 ring-2 ring-blue-500/40 scale-105 shadow-md shadow-blue-500/20'
                          : 'border-gray-800 hover:border-gray-600 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={img.annotated_path || img.raw_path}
                        alt={`frame-${idx}`}
                        className="w-full h-16 object-cover"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-black/80 text-[9px] px-1 py-0.5 text-center font-bold text-gray-200 truncate">
                        GI: {img.garbage_index} ({img.garbage_count})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Metrics & Detections List */}
          <div className="space-y-4 flex flex-col">
            <div className="glass-card p-4 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-blue-400" /> Frame Cleanliness Evaluation
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-800">
                  <span className="text-gray-400 block text-[10px]">Detected Litter Items</span>
                  <span className="text-xl font-bold text-white">{count}</span>
                </div>
                <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-800">
                  <span className="text-gray-400 block text-[10px]">Avg Detection Confidence</span>
                  <span className="text-xl font-bold text-cyan-400">
                    {currentImage ? `${Math.round(currentImage.confidence_avg * 100)}%` : '92%'}
                  </span>
                </div>
              </div>
            </div>

            {/* Indian Street Litter Category Breakdown */}
            <div className="glass-card p-4 rounded-xl flex-1 flex flex-col space-y-2.5 min-h-[220px]">
              <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-cyan-400" /> Detected Waste Categories
                </h3>
                <span className="text-[11px] text-gray-400">
                  {currentImage?.detections.length || 0} items
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[260px]">
                {currentImage && currentImage.detections.length > 0 ? (
                  currentImage.detections.map((det, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-900/70 p-2.5 rounded-lg border border-gray-800 text-xs hover:border-gray-700 transition">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                        <span className="font-semibold text-gray-200">{det.label}</span>
                      </div>
                      <span className="text-gray-400 text-[11px] font-mono px-2 py-0.5 rounded bg-gray-800 border border-gray-700">
                        {Math.round(det.confidence * 100)}%
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 italic p-3 text-center">No individual litter items detected in this frame.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
