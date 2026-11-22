import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Layers,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
  CheckCircle2,
  Filter,
  BarChart2
} from 'lucide-react';
import { studioApi } from '../../services/studioApi';
import { DatasetQualityReport, QualityIssue, DatasetImageSummary } from '../../types/studio';

interface QualityDashboardProps {
  onSelectImage?: (imageId: string) => void;
  onJumpToAnnotation?: (imageId: string) => void;
}

export const QualityDashboard: React.FC<QualityDashboardProps> = ({
  onSelectImage,
  onJumpToAnnotation,
}) => {
  const [report, setReport] = useState<DatasetQualityReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadQualityReport();
  }, []);

  const loadQualityReport = async () => {
    setIsLoading(true);
    try {
      const data = await studioApi.getQualityReport();
      setReport(data);
    } catch (err) {
      console.error('Failed to load quality report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <p className="text-sm">Running perceptual dHash scanning & bounding box sanity checks...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8 text-center text-gray-500">
        <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Failed to generate dataset quality report.</p>
        <button
          onClick={loadQualityReport}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
        >
          Retry Scan
        </button>
      </div>
    );
  }

  const filteredIssues = report.flagged_issues.filter((issue) => {
    if (severityFilter !== 'all' && issue.severity !== severityFilter) return false;
    if (typeFilter !== 'all' && issue.issue_type !== typeFilter) return false;
    return true;
  });

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 65) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-red-400 border-red-500/30 bg-red-500/10';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Overall Health Score Banner */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Dataset Quality Control & Integrity Dashboard
            </h2>
          </div>
          <p className="text-sm text-gray-400 max-w-2xl">
            Automated guardrails prevent corrupted files, perceptual duplicates, label anomalies, and out-of-boundary bounding boxes from degrading YOLO model training.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className={`px-5 py-3 rounded-2xl border flex items-center gap-3 ${getScoreColor(report.overall_health_score)}`}>
            <div className="text-3xl font-black font-mono">
              {report.overall_health_score}<span className="text-base font-normal">/100</span>
            </div>
            <div className="text-xs">
              <div className="font-bold uppercase tracking-wider">Health Score</div>
              <div className="opacity-80">
                {report.overall_health_score >= 85
                  ? 'Dataset Ready for Training'
                  : report.overall_health_score >= 65
                  ? 'Review Warnings Before Training'
                  : 'Critical Issues Need Attention'}
              </div>
            </div>
          </div>

          <button
            onClick={loadQualityReport}
            className="p-3 bg-gray-800/80 hover:bg-gray-700 text-gray-300 rounded-xl border border-gray-700 transition"
            title="Re-run Quality Scan"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-gray-800">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Issues Detected</div>
          <div className="text-2xl font-bold text-white font-mono">{report.total_issues}</div>
          <p className="text-[11px] text-gray-500 mt-1">Across all uploaded drone images</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-red-900/40 bg-red-950/10">
          <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Critical Blockers</div>
          <div className="text-2xl font-bold text-red-400 font-mono">{report.critical_issues}</div>
          <p className="text-[11px] text-red-500/80 mt-1">Must be resolved before train/val split</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-amber-900/40 bg-amber-950/10">
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">Warnings / Advisories</div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{report.warnings}</div>
          <p className="text-[11px] text-amber-500/80 mt-1">Missing GPS, tiny boxes, or duplicates</p>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-purple-900/40 bg-purple-950/10">
          <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">Perceptual Duplicate Clusters</div>
          <div className="text-2xl font-bold text-purple-400 font-mono">{report.duplicate_groups_count}</div>
          <p className="text-[11px] text-purple-400/80 mt-1">Identified via dHash difference (≤6)</p>
        </div>
      </div>

      {/* Perceptual Duplicate Groups Review Section */}
      {report.duplicate_groups && report.duplicate_groups.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl border border-purple-800/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white">
                Perceptual Duplicate Detection (dHash Similarity)
              </h3>
            </div>
            <span className="text-xs bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full border border-purple-500/30">
              Data Leakage Defense Active
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Near-duplicate drone frames (captured milliseconds apart with high perceptual similarity) are grouped together to guarantee they are never split across train and validation sets, preventing overfitted test metrics.
          </p>

          <div className="space-y-4">
            {report.duplicate_groups.map((group, groupIdx) => (
              <div key={groupIdx} className="bg-gray-900/90 border border-gray-800 rounded-xl p-4">
                <div className="text-xs font-mono font-semibold text-purple-300 mb-3 flex items-center justify-between">
                  <span>Group #{groupIdx + 1} ({group.length} similar frames)</span>
                  <span className="text-[11px] text-gray-500">Perceptual Hash match</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {group.map((img) => (
                    <div
                      key={img.id}
                      className="group relative bg-gray-950 rounded-lg overflow-hidden border border-gray-800 hover:border-purple-500/60 transition p-2"
                    >
                      <div className="aspect-video bg-gray-900 rounded overflow-hidden mb-2">
                        <img
                          src={img.file_path.startsWith('http') ? img.file_path : `http://localhost:8000${img.file_path}`}
                          alt={img.filename}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      </div>
                      <div className="text-[11px] font-semibold text-white truncate" title={img.filename}>
                        {img.filename}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1 font-mono">
                        <span>{img.width}x{img.height}</span>
                        <span className="capitalize">{img.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flagged Issues Explorer */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>Dataset Integrity Diagnostics ({filteredIssues.length})</span>
          </h3>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-xs rounded-lg px-2.5 py-1.5 text-gray-300 focus:outline-none"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-xs rounded-lg px-2.5 py-1.5 text-gray-300 focus:outline-none"
            >
              <option value="all">All Issue Types</option>
              <option value="duplicate">Perceptual Duplicate</option>
              <option value="out_of_bounds">Out of Bounds</option>
              <option value="tiny_box">Extremely Small Box</option>
              <option value="missing_metadata">Missing GPS / EXIF</option>
              <option value="low_resolution">Low Resolution</option>
            </select>
          </div>
        </div>

        {filteredIssues.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-white">No dataset issues found matching filter.</p>
            <p className="text-xs text-gray-500 mt-1">All images comply with YOLO object detection prerequisites.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredIssues.map((issue, idx) => {
              const isCritical = issue.severity === 'critical';
              const isWarning = issue.severity === 'warning';

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                    isCritical
                      ? 'bg-red-950/20 border-red-900/50 hover:border-red-700'
                      : isWarning
                      ? 'bg-amber-950/20 border-amber-900/50 hover:border-amber-700'
                      : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                        isCritical
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {issue.severity}
                    </span>

                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-2">
                        <span>{issue.message}</span>
                        <span className="text-[11px] text-gray-400 font-mono font-normal">({issue.filename})</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        Type: <span className="font-mono text-gray-400">{issue.issue_type}</span>
                      </div>
                    </div>
                  </div>

                  {onJumpToAnnotation && (
                    <button
                      onClick={() => onJumpToAnnotation(issue.image_id)}
                      className="self-end sm:self-center flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition whitespace-nowrap"
                    >
                      <span>Fix in Studio</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
