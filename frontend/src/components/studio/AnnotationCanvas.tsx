import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Check,
  CheckCheck,
  Trash2,
  Plus,
  Save,
  RotateCcw,
  Tag,
  MapPin,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  Crosshair,
  AlertCircle,
  HelpCircle,
  Maximize2,
  ShieldCheck
} from 'lucide-react';
import { studioApi } from '../../services/studioApi';
import {
  DatasetImageDetail,
  DatasetImageSummary,
  AnnotationItem,
  BBoxPixel,
  BBoxNorm
} from '../../types/studio';

const GARBAGE_CLASSES = [
  { id: 0, name: 'plastic_bottle', color: '#38bdf8', label: 'Plastic Bottle' },
  { id: 1, name: 'plastic_bag', color: '#f43f5e', label: 'Plastic Bag' },
  { id: 2, name: 'food_wrapper', color: '#fb923c', label: 'Food Wrapper' },
  { id: 3, name: 'beverage_can', color: '#eab308', label: 'Beverage Can' },
  { id: 4, name: 'paper_cardboard', color: '#a855f7', label: 'Paper & Cardboard' },
  { id: 5, name: 'glass_bottle', color: '#10b981', label: 'Glass Bottle' },
  { id: 6, name: 'organic_waste', color: '#84cc16', label: 'Organic Waste' },
  { id: 7, name: 'general_litter', color: '#06b6d4', label: 'General Litter' }
];

interface AnnotationCanvasProps {
  initialImageId?: string | null;
  onNavigateImage?: (imageId: string) => void;
  onAnnotationSaved?: () => void;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  initialImageId,
  onNavigateImage,
  onAnnotationSaved,
}) => {
  const [images, setImages] = useState<DatasetImageSummary[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [imageDetail, setImageDetail] = useState<DatasetImageDetail | null>(null);
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number>(0);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrawBox, setCurrentDrawBox] = useState<BBoxPixel | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // 1. Load image list
  useEffect(() => {
    loadImages();
  }, [statusFilter]);

  const loadImages = async () => {
    setIsLoading(true);
    try {
      const params: any = { limit: 100 };
      if (statusFilter !== 'all') {
        params.annotation_status = statusFilter;
      }
      const data = await studioApi.listImages(params);
      setImages(data.images);

      if (data.images.length > 0) {
        if (initialImageId) {
          const idx = data.images.findIndex((img) => img.id === initialImageId);
          setCurrentImageIndex(idx >= 0 ? idx : 0);
        } else {
          setCurrentImageIndex(0);
        }
      }
    } catch (err) {
      console.error('Failed to load studio images:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Load active image detail & annotations
  useEffect(() => {
    if (images.length > 0 && currentImageIndex >= 0 && currentImageIndex < images.length) {
      const activeId = images[currentImageIndex].id;
      loadImageDetail(activeId);
    }
  }, [currentImageIndex, images]);

  const loadImageDetail = async (imageId: string) => {
    try {
      const detail = await studioApi.getImageDetail(imageId);
      setImageDetail(detail);
      setAnnotations(detail.annotations || []);
      setSelectedAnnotationId(null);
      setCurrentDrawBox(null);
    } catch (err) {
      console.error('Failed to load image detail:', err);
    }
  };

  const currentImage = images[currentImageIndex];

  // AI Auto-Annotation Trigger
  const handleAutoAnnotate = async () => {
    if (!currentImage) return;
    setIsAutoDetecting(true);
    try {
      const res = await studioApi.runAutoAnnotation(currentImage.id);
      // Replace with proposals marked as ai_predicted
      setAnnotations(res.proposals);
      setSelectedAnnotationId(null);
    } catch (err) {
      console.error('Auto annotation failed:', err);
    } finally {
      setIsAutoDetecting(false);
    }
  };

  // Approve single annotation
  const handleApprove = (annId: string) => {
    setAnnotations((prev) =>
      prev.map((ann) =>
        ann.id === annId
          ? {
              ...ann,
              provenance: 'human_approved',
              is_verified: true,
              confidence: 1.0,
            }
          : ann
      )
    );
  };

  // Approve all annotations
  const handleApproveAll = () => {
    setAnnotations((prev) =>
      prev.map((ann) => ({
        ...ann,
        provenance: ann.provenance === 'ai_predicted' ? 'human_approved' : ann.provenance,
        is_verified: true,
        confidence: 1.0,
      }))
    );
  };

  // Delete annotation
  const handleDelete = (annId: string) => {
    setAnnotations((prev) => prev.filter((ann) => ann.id !== annId));
    if (selectedAnnotationId === annId) {
      setSelectedAnnotationId(null);
    }
  };

  // Update class of selected annotation
  const handleClassChange = (classId: number) => {
    if (!selectedAnnotationId) return;
    const targetClass = GARBAGE_CLASSES.find((c) => c.id === classId);
    if (!targetClass) return;

    setAnnotations((prev) =>
      prev.map((ann) =>
        ann.id === selectedAnnotationId
          ? {
              ...ann,
              class_id: classId,
              class_name: targetClass.name,
              provenance: 'human_corrected',
              is_verified: true,
            }
          : ann
      )
    );
  };

  // Save annotations back to database / ML pipeline
  const handleSave = async () => {
    if (!currentImage) return;
    setIsSaving(true);
    try {
      const saved = await studioApi.saveAnnotations(currentImage.id, annotations);
      setAnnotations(saved);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (onAnnotationSaved) onAnnotationSaved();
      // Update local images list annotation count
      setImages((prev) =>
        prev.map((img) =>
          img.id === currentImage.id
            ? {
                ...img,
                annotation_status: saved.some((a) => a.is_verified) ? 'human_verified' : 'ai_annotated',
                annotation_count: saved.length,
              }
            : img
        )
      );
    } catch (err) {
      console.error('Failed to save annotations:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCurrentImage = async () => {
    if (!currentImage) return;
    if (!window.confirm(`Are you sure you want to delete ${currentImage.filename} and its annotations from the training lab?`)) {
      return;
    }
    try {
      await studioApi.deleteImage(currentImage.id);
      loadImages();
      if (onAnnotationSaved) onAnnotationSaved();
    } catch (err) {
      console.error('Failed to delete current image:', err);
      alert('Failed to delete image.');
    }
  };

  // Canvas Mouse Coordinates relative to original image size
  const getImageCoordinates = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return null;
    const rect = imgRef.current.getBoundingClientRect();
    const naturalWidth = imgRef.current.naturalWidth || 1920;
    const naturalHeight = imgRef.current.naturalHeight || 1080;

    const scaleX = naturalWidth / rect.width;
    const scaleY = naturalHeight / rect.height;

    const x = Math.max(0, Math.min(naturalWidth, (e.clientX - rect.left) * scaleX));
    const y = Math.max(0, Math.min(naturalHeight, (e.clientY - rect.top) * scaleY));

    return { x: Math.round(x), y: Math.round(y), naturalWidth, naturalHeight };
  };

  // Canvas Drawing Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== imgRef.current && (e.target as HTMLElement).tagName !== 'svg') return;
    const coords = getImageCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    setDrawStart({ x: coords.x, y: coords.y });
    setCurrentDrawBox({
      x_min: coords.x,
      y_min: coords.y,
      x_max: coords.x,
      y_max: coords.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawStart) return;
    const coords = getImageCoordinates(e);
    if (!coords) return;

    const x_min = Math.min(drawStart.x, coords.x);
    const y_min = Math.min(drawStart.y, coords.y);
    const x_max = Math.max(drawStart.x, coords.x);
    const y_max = Math.max(drawStart.y, coords.y);

    setCurrentDrawBox({ x_min, y_min, x_max, y_max });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentDrawBox || !imgRef.current) {
      setIsDrawing(false);
      return;
    }

    const w = currentDrawBox.x_max - currentDrawBox.x_min;
    const h = currentDrawBox.y_max - currentDrawBox.y_min;

    // Minimum 10px box
    if (w > 10 && h > 10) {
      const imgW = imgRef.current.naturalWidth || 1920;
      const imgH = imgRef.current.naturalHeight || 1080;
      const targetClass = GARBAGE_CLASSES.find((c) => c.id === selectedClassId) || GARBAGE_CLASSES[0];

      const newAnn: AnnotationItem = {
        id: 'new_' + Date.now(),
        class_id: targetClass.id,
        class_name: targetClass.name,
        bbox_pixel: currentDrawBox,
        bbox_norm: {
          x_center: Number(((currentDrawBox.x_min + w / 2) / imgW).toFixed(6)),
          y_center: Number(((currentDrawBox.y_min + h / 2) / imgH).toFixed(6)),
          width: Number((w / imgW).toFixed(6)),
          height: Number((h / imgH).toFixed(6)),
        },
        confidence: 1.0,
        provenance: 'human_corrected',
        is_verified: true,
      };

      setAnnotations((prev) => [...prev, newAnn]);
      setSelectedAnnotationId(newAnn.id);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setCurrentDrawBox(null);
  };

  // Convert pixel bbox to percentage for responsive SVG overlay
  const getBBoxSvgCoords = (bbox: BBoxPixel) => {
    const nw = imageDetail?.width || imgRef.current?.naturalWidth || 1920;
    const nh = imageDetail?.height || imgRef.current?.naturalHeight || 1080;
    return {
      x: (bbox.x_min / nw) * 100,
      y: (bbox.y_min / nh) * 100,
      width: ((bbox.x_max - bbox.x_min) / nw) * 100,
      height: ((bbox.y_max - bbox.y_min) / nh) * 100,
    };
  };

  return (
    <div className="flex flex-col h-[calc(100vh-125px)] bg-gray-950 text-gray-100 overflow-hidden">
      {/* Top Action Bar */}
      <div className="bg-gray-900/90 border-b border-gray-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Navigation & Image info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-800 rounded-lg p-0.5 border border-gray-700">
            <button
              onClick={() => setCurrentImageIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentImageIndex <= 0}
              className="p-1.5 hover:bg-gray-700 rounded-md disabled:opacity-30 transition"
              title="Previous image"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono font-medium text-gray-300">
              {images.length > 0 ? `${currentImageIndex + 1} / ${images.length}` : '0 / 0'}
            </span>
            <button
              onClick={() => setCurrentImageIndex((prev) => Math.min(images.length - 1, prev + 1))}
              disabled={currentImageIndex >= images.length - 1}
              className="p-1.5 hover:bg-gray-700 rounded-md disabled:opacity-30 transition"
              title="Next image"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {currentImage && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-white truncate max-w-[200px]" title={currentImage.filename}>
                {currentImage.filename}
              </span>
              <span className="text-gray-500 font-mono">
                {currentImage.width}x{currentImage.height}
              </span>
              {currentImage.has_gps && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                  <MapPin className="w-3 h-3" />
                  {currentImage.gps_latitude?.toFixed(4)}, {currentImage.gps_longitude?.toFixed(4)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* HITL AI & Action Controls */}
        <div className="flex items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-xs rounded-lg px-2.5 py-1.5 text-gray-300 focus:outline-none"
          >
            <option value="all">Filter: All Statuses</option>
            <option value="unannotated">Unannotated</option>
            <option value="ai_annotated">AI Annotated</option>
            <option value="human_verified">Human Verified</option>
          </select>

          <button
            onClick={handleAutoAnnotate}
            disabled={isAutoDetecting || !currentImage}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-semibold transition disabled:opacity-40"
            title="Run active Garbage Index detection model to propose initial bounding boxes"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAutoDetecting ? 'animate-spin' : 'text-blue-400'}`} />
            {isAutoDetecting ? 'Detecting...' : 'AI Auto-Detect'}
          </button>

          <button
            onClick={handleApproveAll}
            disabled={annotations.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold transition disabled:opacity-40"
            title="Approve all AI proposed bounding boxes as verified Ground Truth"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            Approve All
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || !currentImage}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow transition disabled:opacity-40 ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
            }`}
          >
            {isSaving ? (
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saveSuccess ? 'Saved Ground Truth!' : 'Save Ground Truth'}
          </button>

          <button
            onClick={handleDeleteCurrentImage}
            disabled={!currentImage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600/15 hover:bg-red-600/30 text-red-300 border border-red-500/40 transition disabled:opacity-30"
            title="Delete current image from training lab"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            Delete Image
          </button>
        </div>
      </div>

      {/* Main Annotation Workspace: Canvas + Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center Canvas Area */}
        <div
          ref={containerRef}
          className="flex-1 bg-black/80 flex items-center justify-center p-4 relative overflow-hidden select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {currentImage ? (
            <div className="relative inline-block max-w-full max-h-full border border-gray-800 rounded-lg overflow-hidden shadow-2xl">
              {/* Main Aerial Drone Image */}
              <img
                ref={imgRef}
                src={currentImage.file_path.startsWith('http') ? currentImage.file_path : `http://localhost:8000${currentImage.file_path}`}
                alt={currentImage.filename}
                className="max-h-[calc(100vh-210px)] max-w-full object-contain pointer-events-auto cursor-crosshair"
                draggable={false}
              />

              {/* Responsive SVG Bounding Box Layer */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Drawn active box */}
                {currentDrawBox && imgRef.current && (
                  <rect
                    x={`${(currentDrawBox.x_min / (imageDetail?.width || imgRef.current.naturalWidth || 1920)) * 100}%`}
                    y={`${(currentDrawBox.y_min / (imageDetail?.height || imgRef.current.naturalHeight || 1080)) * 100}%`}
                    width={`${((currentDrawBox.x_max - currentDrawBox.x_min) / (imageDetail?.width || imgRef.current.naturalWidth || 1920)) * 100}%`}
                    height={`${((currentDrawBox.y_max - currentDrawBox.y_min) / (imageDetail?.height || imgRef.current.naturalHeight || 1080)) * 100}%`}
                    fill="rgba(56, 189, 248, 0.25)"
                    stroke="#38bdf8"
                    strokeWidth="0.75"
                    strokeDasharray="2,2"
                  />
                )}

                {/* Saved / Candidate Bounding Boxes */}
                {annotations.map((ann) => {
                  const isSelected = ann.id === selectedAnnotationId;
                  const coords = getBBoxSvgCoords(ann.bbox_pixel);
                  const isAi = ann.provenance === 'ai_predicted';
                  const isApproved = ann.provenance === 'human_approved';
                  const isCorrected = ann.provenance === 'human_corrected';

                  let strokeColor = '#38bdf8'; // Blue for AI
                  if (isApproved) strokeColor = '#10b981'; // Green for approved
                  if (isCorrected) strokeColor = '#f59e0b'; // Amber for human manual/edited

                  return (
                    <g key={ann.id} className="pointer-events-auto cursor-pointer" onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAnnotationId(ann.id);
                    }}>
                      <rect
                        x={`${coords.x}%`}
                        y={`${coords.y}%`}
                        width={`${coords.width}%`}
                        height={`${coords.height}%`}
                        fill={isSelected ? `${strokeColor}40` : `${strokeColor}15`}
                        stroke={strokeColor}
                        strokeWidth={isSelected ? '1.5' : '0.8'}
                        strokeDasharray={isAi ? '3,2' : 'none'}
                        className="transition-all hover:stroke-white"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* HTML Bounding Box Label Chips (overlaying over SVG) */}
              {annotations.map((ann) => {
                const isSelected = ann.id === selectedAnnotationId;
                const coords = getBBoxSvgCoords(ann.bbox_pixel);
                const isAi = ann.provenance === 'ai_predicted';
                const isApproved = ann.provenance === 'human_approved';

                let badgeBg = 'bg-blue-600';
                let badgeText = 'AI';
                if (isApproved) {
                  badgeBg = 'bg-emerald-600';
                  badgeText = 'GT (Approved)';
                } else if (ann.provenance === 'human_corrected') {
                  badgeBg = 'bg-amber-600';
                  badgeText = 'GT (Edited)';
                }

                return (
                  <div
                    key={`lbl_${ann.id}`}
                    style={{
                      left: `${coords.x}%`,
                      top: `${Math.max(0, coords.y - 3.5)}%`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAnnotationId(ann.id);
                    }}
                    className={`absolute z-10 -translate-y-full transform cursor-pointer flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold text-white shadow-lg pointer-events-auto transition-transform ${badgeBg} ${
                      isSelected ? 'ring-2 ring-white scale-105' : 'opacity-90 hover:opacity-100'
                    }`}
                  >
                    <span>{ann.class_name}</span>
                    <span className="text-[9px] opacity-80 font-mono">
                      {isAi ? `${Math.round(ann.confidence * 100)}%` : badgeText}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No images found in dataset matching current filter.</p>
            </div>
          )}

          {/* Quick Drawing Instruction HUD */}
          <div className="absolute bottom-4 left-6 bg-gray-900/80 backdrop-blur border border-gray-800 px-3 py-1.5 rounded-lg text-[11px] text-gray-400 flex items-center gap-2 pointer-events-none">
            <Crosshair className="w-3.5 h-3.5 text-blue-400" />
            <span>Click & Drag to add new Ground Truth object</span>
            <span className="text-gray-600">|</span>
            <span className="text-blue-400">Dashed = AI Proposal</span>
            <span className="text-emerald-400">Solid Green = Verified Ground Truth</span>
          </div>
        </div>

        {/* Right Inspection & Annotation Control Panel */}
        <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-full overflow-y-auto">
          {/* Class Palette Selection */}
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Tool Class Palette</span>
              <span className="text-[10px] text-gray-500">Press 1-8 to switch</span>
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {GARBAGE_CLASSES.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => {
                    setSelectedClassId(cls.id);
                    if (selectedAnnotationId) handleClassChange(cls.id);
                  }}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border transition ${
                    selectedClassId === cls.id
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
                      : 'bg-gray-800/60 border-gray-700/60 text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cls.color }}></span>
                  <span className="truncate">{cls.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Detections List & HITL Verification */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Bounding Boxes ({annotations.length})
              </h3>
              <span className="text-[10px] text-emerald-400 font-mono">
                {annotations.filter((a) => a.is_verified).length} Verified
              </span>
            </div>

            {annotations.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-xs">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No bounding boxes on this image.</p>
                <p className="text-[11px] text-gray-600 mt-1">
                  Click 'AI Auto-Detect' or drag on canvas to label.
                </p>
              </div>
            ) : (
              annotations.map((ann, idx) => {
                const isSelected = ann.id === selectedAnnotationId;
                const isAi = ann.provenance === 'ai_predicted';
                const isApproved = ann.provenance === 'human_approved';

                return (
                  <div
                    key={ann.id}
                    onClick={() => setSelectedAnnotationId(ann.id)}
                    className={`p-3 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/40'
                        : 'bg-gray-800/40 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">#{idx + 1} {ann.class_name}</span>
                        {isAi ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            AI {(ann.confidence * 100).toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> GT Verified
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {isAi && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(ann.id);
                            }}
                            className="p-1 text-emerald-400 hover:bg-emerald-950/60 rounded border border-emerald-800/40 transition"
                            title="Confirm as Human Ground Truth"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(ann.id);
                          }}
                          className="p-1 text-red-400 hover:bg-red-950/60 rounded border border-red-800/40 transition"
                          title="Delete false detection"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[11px] text-gray-400 font-mono bg-gray-900/60 p-1.5 rounded border border-gray-800/60">
                      <div>Box: [{ann.bbox_pixel.x_min}, {ann.bbox_pixel.y_min}]</div>
                      <div>Dim: {ann.bbox_pixel.x_max - ann.bbox_pixel.x_min}x{ann.bbox_pixel.y_max - ann.bbox_pixel.y_min}px</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Human-in-the-Loop Philosophy Notice */}
          <div className="p-4 border-t border-gray-800 bg-gray-950/60 text-[11px] text-gray-400 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-gray-300">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>HITL Ground-Truth Integrity</span>
            </div>
            <p className="text-gray-500 leading-relaxed">
              AI pre-annotations remain marked as <code className="text-blue-300">ai_predicted</code> until explicitly approved. Only human-approved or human-corrected annotations are packaged into YOLO training datasets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
