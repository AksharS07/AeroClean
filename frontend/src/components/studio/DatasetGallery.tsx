import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Filter, Grid, List as ListIcon, MapPin, Eye, Edit3, Tag, 
  CheckSquare, Square, Layers, Sparkles, X, Compass, Info, Check, RefreshCw, Trash2, Maximize2 
} from 'lucide-react';
import { DatasetImageSummary, DatasetImageDetail, DatasetStatsResponse } from '../../types/studio';
import { studioApi } from '../../services/studioApi';

interface DatasetGalleryProps {
  onSelectImageToAnnotate: (imageId: string) => void;
  onRefreshStats: () => void;
}

export const DatasetGallery: React.FC<DatasetGalleryProps> = ({
  onSelectImageToAnnotate,
  onRefreshStats,
}) => {
  const [images, setImages] = useState<DatasetImageSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [gpsFilter, setGpsFilter] = useState('all');
  const [annotationFilter, setAnnotationFilter] = useState('all');
  const [splitFilter, setSplitFilter] = useState('all');

  // Selection & Bulk
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState('clean');

  // Detail Drawer
  const [inspectImageId, setInspectImageId] = useState<string | null>(null);
  const [inspectDetail, setInspectDetail] = useState<DatasetImageDetail | null>(null);
  const [isInspectLoading, setIsInspectLoading] = useState(false);

  // Upload dialog
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadCategory, setUploadCategory] = useState('littered');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchImages = async () => {
    setIsLoading(true);
    try {
      const res = await studioApi.listImages({
        category: categoryFilter,
        has_gps: gpsFilter === 'with_gps' ? true : gpsFilter === 'no_gps' ? false : undefined,
        annotation_status: annotationFilter,
        split: splitFilter,
      });
      setImages(res.images);
      setTotalCount(res.total);
    } catch (err) {
      console.error('Error fetching dataset images:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [categoryFilter, gpsFilter, annotationFilter, splitFilter]);

  // Load detailed metadata for inspector drawer
  useEffect(() => {
    if (inspectImageId) {
      setIsInspectLoading(true);
      studioApi.getImageDetail(inspectImageId)
        .then((detail) => setInspectDetail(detail))
        .catch((err) => console.error(err))
        .finally(() => setIsInspectLoading(false));
    } else {
      setInspectDetail(null);
    }
  }, [inspectImageId]);

  const toggleSelectImage = (id: string) => {
    setSelectedImageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedImageIds.length === images.length) {
      setSelectedImageIds([]);
    } else {
      setSelectedImageIds(images.map((img) => img.id));
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedImageIds.length === 0) return;
    try {
      await studioApi.bulkUpdateCategory(selectedImageIds, bulkCategory);
      setSelectedImageIds([]);
      fetchImages();
      onRefreshStats();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteImage = async (imageId: string, filename?: string) => {
    if (!window.confirm(`Are you sure you want to delete ${filename || 'this image'} and all its annotations from the training lab?`)) {
      return;
    }
    try {
      await studioApi.deleteImage(imageId);
      setSelectedImageIds((prev) => prev.filter((id) => id !== imageId));
      if (inspectImageId === imageId) {
        setInspectImageId(null);
        setInspectDetail(null);
      }
      fetchImages();
      onRefreshStats();
    } catch (err) {
      console.error('Failed to delete image:', err);
      alert('Failed to delete image.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedImageIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedImageIds.length} selected images and their annotations from the training lab?`)) {
      return;
    }
    try {
      await studioApi.bulkDeleteImages(selectedImageIds);
      setSelectedImageIds([]);
      fetchImages();
      onRefreshStats();
    } catch (err) {
      console.error('Failed to bulk delete images:', err);
      alert('Failed to delete selected images.');
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadFiles.length === 0) return;
    setIsUploading(true);
    try {
      await studioApi.uploadImages(uploadFiles, uploadCategory);
      setUploadFiles([]);
      setIsUploadOpen(false);
      fetchImages();
      onRefreshStats();
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'clean':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'littered':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'heavily_littered':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-700/30 text-gray-400 border-gray-700/50';
    }
  };

  const getAnnotationBadge = (status: string) => {
    switch (status) {
      case 'human_verified':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'ai_annotated':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      default:
        return 'bg-gray-800 text-gray-500 border-gray-700';
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Filter & Actions Bar */}
      <div className="glass-card p-4 rounded-2xl border border-gray-800 flex flex-wrap items-center justify-between gap-4">
        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 text-gray-400 mr-1 font-semibold">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-gray-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="clean">Clean Streets</option>
            <option value="littered">Littered</option>
            <option value="heavily_littered">Heavily Littered</option>
            <option value="unknown">Unknown</option>
          </select>

          <select
            value={gpsFilter}
            onChange={(e) => setGpsFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-gray-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All GPS Status</option>
            <option value="with_gps">With GPS Tags</option>
            <option value="no_gps">No GPS (Trainable)</option>
          </select>

          <select
            value={annotationFilter}
            onChange={(e) => setAnnotationFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-gray-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Annotations</option>
            <option value="human_verified">Human Verified</option>
            <option value="ai_annotated">AI Proposed</option>
            <option value="unannotated">Unannotated</option>
          </select>

          <select
            value={splitFilter}
            onChange={(e) => setSplitFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-gray-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Splits</option>
            <option value="train">Train Split</option>
            <option value="val">Val Split</option>
            <option value="test">Test Split</option>
          </select>
        </div>

        {/* View Mode & Upload Buttons */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-900 p-1 rounded-xl border border-gray-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Table View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition"
          >
            <Upload className="w-4 h-4" /> Upload Dataset Images
          </button>
        </div>
      </div>

      {/* Bulk Operations Toolbar */}
      {selectedImageIds.length > 0 && (
        <div className="glass-panel px-4 py-2.5 rounded-xl border border-blue-500/40 bg-blue-950/40 flex items-center justify-between text-xs animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2 font-medium text-blue-200">
            <CheckSquare className="w-4 h-4 text-blue-400" />
            <span>{selectedImageIds.length} images selected</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400">Set Category:</span>
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1 text-xs text-white"
            >
              <option value="clean">Clean</option>
              <option value="littered">Littered</option>
              <option value="heavily_littered">Heavily Littered</option>
              <option value="unknown">Unknown</option>
            </select>
            <button
              onClick={handleBulkUpdate}
              className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition"
            >
              Apply Bulk
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 font-semibold transition ml-1"
              title="Permanently delete selected images and annotations"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedImageIds([])}
              className="px-2 py-1 text-gray-400 hover:text-white ml-1"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Image Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img) => {
            const isSelected = selectedImageIds.includes(img.id);
            return (
              <div
                key={img.id}
                className={`glass-card rounded-2xl overflow-hidden border transition-all relative group flex flex-col ${
                  isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-gray-800/80 hover:border-gray-700'
                }`}
              >
                {/* Thumbnail Preview */}
                <div 
                  onClick={() => onSelectImageToAnnotate(img.id)}
                  className="relative h-44 bg-gray-950 overflow-hidden cursor-pointer"
                  title="Click to view full image and mappings"
                >
                  <img
                    src={img.file_path || img.thumbnail_path}
                    alt={img.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="bg-black/85 text-white text-xs px-2.5 py-1 rounded-lg border border-gray-700 flex items-center gap-1.5 shadow-xl font-medium">
                      <Maximize2 className="w-3.5 h-3.5 text-blue-400" /> View Mappings
                    </span>
                  </div>

                  {/* Selection Checkbox */}
                  <button
                    onClick={() => toggleSelectImage(img.id)}
                    className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white transition z-10"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {/* GPS Tag Badge */}
                  <div className="absolute top-2 right-2">
                    {img.has_gps ? (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-500/80 text-white backdrop-blur-md flex items-center gap-1 shadow">
                        <MapPin className="w-2.5 h-2.5" /> GPS Tagged
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-gray-800/90 text-gray-400 backdrop-blur-md border border-gray-700">
                        No GPS
                      </span>
                    )}
                  </div>

                  {/* Category Banner */}
                  <div className="absolute bottom-2 left-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border backdrop-blur-md ${getCategoryBadge(img.category)}`}>
                      {img.category.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h4 className="font-bold text-xs text-white truncate" title={img.filename}>
                      {img.filename}
                    </h4>
                    <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
                      <span>{img.width}x{img.height}px</span>
                      <span>{(img.file_size_bytes / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                  </div>

                  {/* Annotation & Split Badges */}
                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-gray-800/80">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getAnnotationBadge(img.annotation_status)}`}>
                      {img.annotation_status === 'human_verified' ? 'Ground Truth' : img.annotation_status === 'ai_annotated' ? 'AI Proposed' : 'Unannotated'}
                    </span>
                    {img.split && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/15 text-purple-300 border border-purple-500/30 uppercase">
                        {img.split}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      onClick={() => setInspectImageId(img.id)}
                      className="flex items-center justify-center gap-1 py-1.5 px-1 text-[11px] font-semibold rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 transition"
                      title="View EXIF & Telemetry"
                    >
                      <Info className="w-3.5 h-3.5 text-blue-400" /> Info
                    </button>
                    <button
                      onClick={() => onSelectImageToAnnotate(img.id)}
                      className="flex items-center justify-center gap-1 py-1.5 px-1 text-[11px] font-semibold rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition"
                      title="Annotate in HITL Studio"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Annotate
                    </button>
                    <button
                      onClick={() => handleDeleteImage(img.id, img.filename)}
                      className="flex items-center justify-center gap-1 py-1.5 px-1 text-[11px] font-semibold rounded-lg bg-red-600/15 hover:bg-red-600/30 text-red-300 border border-red-500/30 transition"
                      title="Delete picture from training lab"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="glass-panel rounded-2xl overflow-hidden border border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-gray-900/80 text-gray-400 uppercase tracking-wider text-[10px] border-b border-gray-800">
                <tr>
                  <th className="p-3.5">
                    <button onClick={selectAll} className="text-gray-400 hover:text-white">
                      <CheckSquare className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="p-3.5">Thumbnail</th>
                  <th className="p-3.5">Filename</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">GPS Coordinates</th>
                  <th className="p-3.5">Altitude</th>
                  <th className="p-3.5">Annotation Status</th>
                  <th className="p-3.5">Split</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {images.map((img) => (
                  <tr key={img.id} className="hover:bg-gray-900/50 transition">
                    <td className="p-3.5">
                      <input
                        type="checkbox"
                        checked={selectedImageIds.includes(img.id)}
                        onChange={() => toggleSelectImage(img.id)}
                        className="rounded bg-gray-900 border-gray-700"
                      />
                    </td>
                    <td className="p-3.5">
                      <img
                        src={img.file_path || img.thumbnail_path}
                        alt="thumb"
                        className="w-12 h-10 object-cover rounded-lg border border-gray-800"
                      />
                    </td>
                    <td className="p-3.5 font-bold text-white truncate max-w-[180px]">{img.filename}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getCategoryBadge(img.category)}`}>
                        {img.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 text-gray-400 font-mono text-[11px]">
                      {img.has_gps ? `${img.gps_latitude?.toFixed(4)}°N, ${img.gps_longitude?.toFixed(4)}°E` : 'No GPS data'}
                    </td>
                    <td className="p-3.5 text-gray-400">{img.gps_altitude ? `${img.gps_altitude}m` : '—'}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getAnnotationBadge(img.annotation_status)}`}>
                        {img.annotation_status}
                      </span>
                    </td>
                    <td className="p-3.5 uppercase font-mono text-[10px] text-purple-400">{img.split || '—'}</td>
                    <td className="p-3.5 text-right space-x-1.5">
                      <button
                        onClick={() => setInspectImageId(img.id)}
                        className="px-2 py-1 text-xs text-gray-300 hover:text-white bg-gray-800 rounded-md"
                      >
                        Metadata
                      </button>
                      <button
                        onClick={() => onSelectImageToAnnotate(img.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-300 bg-blue-600/20 border border-blue-500/30 rounded-md hover:bg-blue-600/30"
                      >
                        Annotate
                      </button>
                      <button
                        onClick={() => handleDeleteImage(img.id, img.filename)}
                        className="px-2 py-1 text-xs font-semibold text-red-300 bg-red-600/15 border border-red-500/30 rounded-md hover:bg-red-600/30"
                        title="Delete image from training lab"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline text-red-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EXIF Metadata Inspection Side Drawer */}
      {inspectImageId && inspectDetail && (
        <div className="fixed inset-0 z-[99999] flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md h-full p-6 border-l border-gray-800 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <Info className="w-4 h-4 text-blue-400" />
                  <span>EXIF & Drone Telemetry Inspector</span>
                </div>
                <button onClick={() => setInspectImageId(null)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Preview image */}
              <div className="rounded-xl overflow-hidden border border-gray-800 max-h-48 bg-black">
                <img src={inspectDetail.file_path} alt="raw preview" className="w-full h-full object-cover" />
              </div>

              <div className="space-y-3 text-xs">
                <h5 className="font-bold text-gray-300 uppercase tracking-wider text-[10px]">Image Properties</h5>
                <div className="bg-gray-900/80 p-3 rounded-xl border border-gray-800 space-y-1.5">
                  <p className="flex justify-between"><span className="text-gray-400">Filename:</span><strong className="text-white truncate max-w-[200px]">{inspectDetail.filename}</strong></p>
                  <p className="flex justify-between"><span className="text-gray-400">Dimensions:</span><strong>{inspectDetail.width} x {inspectDetail.height} px</strong></p>
                  <p className="flex justify-between"><span className="text-gray-400">File Size:</span><strong>{(inspectDetail.file_size_bytes / (1024 * 1024)).toFixed(2)} MB</strong></p>
                  <p className="flex justify-between"><span className="text-gray-400">Perceptual dHash:</span><span className="font-mono text-cyan-400">{inspectDetail.phash || 'N/A'}</span></p>
                </div>

                <h5 className="font-bold text-gray-300 uppercase tracking-wider text-[10px]">Geospatial / EXIF Telemetry</h5>
                <div className="bg-gray-900/80 p-3 rounded-xl border border-gray-800 space-y-1.5">
                  <p className="flex justify-between">
                    <span className="text-gray-400">GPS Availability:</span>
                    <strong className={inspectDetail.has_gps ? 'text-emerald-400' : 'text-gray-500'}>
                      {inspectDetail.has_gps ? 'GPS Geotagged' : 'No GPS Data'}
                    </strong>
                  </p>
                  {inspectDetail.has_gps && (
                    <>
                      <p className="flex justify-between"><span className="text-gray-400">Latitude:</span><strong className="font-mono">{inspectDetail.gps_latitude}° N</strong></p>
                      <p className="flex justify-between"><span className="text-gray-400">Longitude:</span><strong className="font-mono">{inspectDetail.gps_longitude}° E</strong></p>
                      <p className="flex justify-between"><span className="text-gray-400">Drone Altitude:</span><strong>{inspectDetail.gps_altitude ? `${inspectDetail.gps_altitude} meters` : '25m (default)'}</strong></p>
                      <p className="flex justify-between"><span className="text-gray-400">Timestamp:</span><span>{inspectDetail.image_timestamp ? new Date(inspectDetail.image_timestamp).toLocaleString() : 'N/A'}</span></p>
                    </>
                  )}
                </div>

                <h5 className="font-bold text-gray-300 uppercase tracking-wider text-[10px]">AI Training Metadata</h5>
                <div className="bg-gray-900/80 p-3 rounded-xl border border-gray-800 space-y-1.5">
                  <p className="flex justify-between"><span className="text-gray-400">Dataset Category:</span><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getCategoryBadge(inspectDetail.category)}`}>{inspectDetail.category}</span></p>
                  <p className="flex justify-between"><span className="text-gray-400">Annotation Status:</span><strong>{inspectDetail.annotation_status}</strong></p>
                  <p className="flex justify-between"><span className="text-gray-400">Ground-Truth Boxes:</span><strong className="text-cyan-400">{inspectDetail.annotations.length} items</strong></p>
                  <p className="flex justify-between"><span className="text-gray-400">Dataset Split:</span><span className="uppercase font-mono text-purple-300">{inspectDetail.split || 'Unassigned'}</span></p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800 grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  onSelectImageToAnnotate(inspectDetail.id);
                  setInspectImageId(null);
                }}
                className="col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition"
              >
                <Edit3 className="w-4 h-4" /> Open in Annotation Studio
              </button>
              <button
                onClick={() => handleDeleteImage(inspectDetail.id, inspectDetail.filename)}
                className="col-span-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 font-semibold text-xs transition"
                title="Delete picture from dataset"
              >
                <Trash2 className="w-4 h-4 text-red-400" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Dataset Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-gray-800 p-6 shadow-2xl relative">
            <button onClick={() => setIsUploadOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Upload Training Dataset Images</h3>
                <p className="text-xs text-gray-400">Ingest clean and littered street drone imagery with automatic EXIF parsing</p>
              </div>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold uppercase mb-1.5">Initial Category Tag</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white"
                >
                  <option value="littered">Littered Street</option>
                  <option value="heavily_littered">Heavily Littered Hotspot</option>
                  <option value="clean">Clean Street (Negative Examples)</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-2xl p-7 text-center bg-gray-900/40 cursor-pointer"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files) setUploadFiles(Array.from(e.target.files));
                  }}
                  className="hidden"
                />
                <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-200 font-medium">Click to select drone photos or drag here</p>
                <p className="text-gray-500 text-[11px] mt-1">{uploadFiles.length} files selected</p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || uploadFiles.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-50 flex items-center gap-2"
                >
                  {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Upload {uploadFiles.length} Photos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
