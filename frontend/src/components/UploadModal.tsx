import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileImage, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { surveyApi } from '../services/api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSurveyUploaded: (surveyId: string) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onSurveyUploaded }) => {
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selected]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const dropped = Array.from(e.dataTransfer.files);
      setFiles((prev) => [...prev, ...dropped]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTriggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a survey mission title.');
      return;
    }
    if (files.length === 0) {
      setError('Please select or drop at least one drone survey image.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const response = await surveyApi.uploadSurvey(title, files);
      setIsUploading(false);
      onSurveyUploaded(response.survey_id);
      onClose();
    } catch (err: any) {
      setIsUploading(false);
      setError(err.response?.data?.detail || 'Failed to upload survey images. Ensure backend server is running.');
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-xl rounded-2xl border border-gray-800 p-6 shadow-2xl relative z-[100000]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800/60 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Upload Drone Survey Photos</h2>
            <p className="text-xs text-gray-400">Select aerial and road photos captured during the drone survey flight</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Survey Mission Title
              </label>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <span>Quick Fill:</span>
                <button
                  type="button"
                  onClick={() => setTitle('Drone Cleanliness Flight - Sector A')}
                  className="text-blue-400 hover:underline"
                >
                  Sector A
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setTitle('Roadside Embankment Survey Mission')}
                  className="text-blue-400 hover:underline"
                >
                  Embankment
                </button>
              </div>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mangaluru Urban Drone Cleanliness Survey - Flight 1"
              className="w-full bg-gray-900/80 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Drag and Drop Container with Full-Surface Click Trigger */}
          <div
            onClick={handleTriggerFileSelect}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-7 text-center transition cursor-pointer group ${
              isDragging
                ? 'border-blue-500 bg-blue-950/40 shadow-lg shadow-blue-500/20'
                : 'border-gray-700/80 hover:border-blue-500/60 bg-gray-900/40 hover:bg-gray-900/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <UploadCloud className="w-12 h-12 mx-auto text-gray-400 group-hover:text-blue-400 group-hover:scale-110 transition mb-2" />
            <p className="text-sm font-medium text-gray-200">
              <span className="text-blue-400 underline font-semibold">Click to browse</span> or drag & drop drone photos here
            </p>
            <p className="text-xs text-gray-500 mt-1">Supports JPEG, PNG (with native EXIF GPS or automatic flight grid mapping)</p>
          </div>

          {files.length > 0 && (
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-400 mb-1">
                <span>Selected Images ({files.length}):</span>
                <button
                  type="button"
                  onClick={() => setFiles([])}
                  className="text-red-400 hover:underline text-[11px]"
                >
                  Clear all
                </button>
              </div>
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-900/70 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-300">
                  <div className="flex items-center gap-2 truncate">
                    <FileImage className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="truncate">{file.name}</span>
                    <span className="text-gray-500">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                    className="text-gray-500 hover:text-red-400 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || files.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading & Starting AI Detection...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Start AI Analysis ({files.length} Photos)
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
