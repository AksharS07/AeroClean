import React, { useState, useEffect } from 'react';
import {
  Award,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Eye,
  Rocket,
  Layers,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  ChevronRight,
  Info,
  Sliders,
  Calendar,
  BarChart2,
  FileCheck,
  Target
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { studioApi } from '../../services/studioApi';
import {
  ModelVersionDetail,
  ModelBenchmarkComparison,
  VisualComparisonItem
} from '../../types/studio';

interface ModelRegistryProps {
  onModelPromoted?: (modelId: string) => void;
}

export const ModelRegistry: React.FC<ModelRegistryProps> = ({ onModelPromoted }) => {
  const [models, setModels] = useState<ModelVersionDetail[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelVersionDetail | null>(null);
  const [benchmark, setBenchmark] = useState<ModelBenchmarkComparison | null>(null);
  const [visualEvalItems, setVisualEvalItems] = useState<VisualComparisonItem[]>([]);
  const [selectedVisualIdx, setSelectedVisualIdx] = useState<number>(0);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPromoting, setIsPromoting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'visual_eval' | 'confusion_matrix'>('overview');

  useEffect(() => {
    loadRegistryData();
  }, []);

  const loadRegistryData = async () => {
    setIsLoading(true);
    try {
      const [modelsList, bench] = await Promise.all([
        studioApi.listModels(),
        studioApi.getBenchmarkProgression(),
      ]);
      setModels(modelsList);
      setBenchmark(bench);

      if (modelsList.length > 0) {
        const prod = modelsList.find((m) => m.is_production) || modelsList[0];
        setSelectedModelId(prod.id);
        setSelectedModel(prod);
        loadVisualEval(prod.id);
      }
    } catch (err) {
      console.error('Failed to load model registry data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectModel = async (model: ModelVersionDetail) => {
    setSelectedModelId(model.id);
    setSelectedModel(model);
    loadVisualEval(model.id);
  };

  const loadVisualEval = async (modelId: string) => {
    try {
      const items = await studioApi.getModelVisualEval(modelId);
      setVisualEvalItems(items);
      setSelectedVisualIdx(0);
    } catch (err) {
      console.error('Failed to load visual evaluation:', err);
    }
  };

  const handlePromote = async (modelId: string) => {
    setIsPromoting(true);
    try {
      await studioApi.promoteToProduction(modelId);
      // Reload registry to reflect updated production badges
      await loadRegistryData();
      if (onModelPromoted) onModelPromoted(modelId);
    } catch (err) {
      console.error('Failed to promote model:', err);
    } finally {
      setIsPromoting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm">Loading Model Registry & Benchmark Metrics...</p>
      </div>
    );
  }

  // Format progression chart data
  const chartData = benchmark?.progression_history.map((pt) => ({
    name: pt.version,
    mAP50: Math.round(pt.map50 * 100),
    mAP50_95: Math.round(pt.map50_95 * 100),
    Precision: Math.round(pt.precision * 100),
    Recall: Math.round(pt.recall * 100),
  })) || [];

  const activeVisual = visualEvalItems[selectedVisualIdx];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-gray-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Model Registry, Benchmark Progression & Visual Evaluation
            </h2>
          </div>
          <p className="text-sm text-gray-400 max-w-2xl mt-1">
            Compare model versions on a constant held-out test benchmark, inspect per-class detection accuracy, and explicitly promote validated models to production.
          </p>
        </div>

        <button
          onClick={loadRegistryData}
          className="p-3 bg-gray-800/80 hover:bg-gray-700 text-gray-300 rounded-xl border border-gray-700 transition"
          title="Refresh Registry"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Visual AI Improvement Progression Chart */}
      {chartData.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl border border-indigo-800/40 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">
                AI Metric Progression (Held-Out Benchmark Test Set)
              </h3>
            </div>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">
              Benchmark: {benchmark?.benchmark_dataset_tag} ({benchmark?.test_set_size} test frames)
            </span>
          </div>

          <p className="text-xs text-gray-400">
            Progress is strictly validated against a consistent held-out test dataset to prove genuine generalizability gains without data contamination or split leakage.
          </p>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={11} domain={[0, 100]} unit="%" tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    borderColor: '#374151',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  formatter={(val: any) => [`${val}%`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="mAP50"
                  name="mAP@50"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#38bdf8' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="mAP50_95"
                  name="mAP@50-95"
                  stroke="#818cf8"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#818cf8' }}
                />
                <Line
                  type="monotone"
                  dataKey="Precision"
                  name="Precision"
                  stroke="#34d399"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
                <Line
                  type="monotone"
                  dataKey="Recall"
                  name="Recall"
                  stroke="#fbbf24"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Model Registry List Table */}
      <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800 bg-gray-900/60 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Trained Model Registry ({models.length})</span>
          </h3>
          <span className="text-xs text-gray-500 font-mono">
            Active Prod: {benchmark?.active_production_model_tag || 'None'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900/80 text-gray-400 font-semibold border-b border-gray-800">
              <tr>
                <th className="py-3 px-4">Model Version</th>
                <th className="py-3 px-4">Dataset Used</th>
                <th className="py-3 px-4">Architecture</th>
                <th className="py-3 px-4">mAP@50</th>
                <th className="py-3 px-4">mAP@50-95</th>
                <th className="py-3 px-4">Precision</th>
                <th className="py-3 px-4">Recall</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-mono">
              {models.map((model) => {
                const isSelected = model.id === selectedModelId;
                const isProd = model.is_production;

                return (
                  <tr
                    key={model.id}
                    onClick={() => handleSelectModel(model)}
                    className={`cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-950/40 hover:bg-blue-950/60'
                        : 'hover:bg-gray-900/50'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <span>{model.version_tag}</span>
                      {isProd && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-sans font-semibold">
                          Production
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-gray-400">{model.dataset_version_tag || 'Base'}</td>
                    <td className="py-3.5 px-4 text-gray-300 font-sans">{model.architecture}</td>
                    <td className="py-3.5 px-4 font-bold text-cyan-400">
                      {(model.map50 * 100).toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 text-indigo-400">
                      {(model.map50_95 * 100).toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 text-emerald-400">
                      {(model.precision * 100).toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 text-amber-400">
                      {(model.recall * 100).toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {model.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2 font-sans">
                      {!isProd && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePromote(model.id);
                          }}
                          disabled={isPromoting}
                          className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold transition"
                        >
                          Promote to Prod
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectModel(model);
                        }}
                        className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Inspection for Selected Model */}
      {selectedModel && (
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-6">
          {/* Sub Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-800 pb-4 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">
                  Evaluation: <span className="text-blue-400 font-mono">{selectedModel.version_tag}</span>
                </h3>
                {selectedModel.is_production && (
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                    Live Production Model
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-mono mt-0.5">
                Arch: {selectedModel.architecture} | Epochs: {selectedModel.epochs} | ImgSize: {selectedModel.img_size}px
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-gray-900 p-1 rounded-xl border border-gray-800 text-xs">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === 'overview'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Per-Class Metrics
              </button>
              <button
                onClick={() => setActiveTab('visual_eval')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === 'visual_eval'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Visual GT vs Predictions ({visualEvalItems.length})
              </button>
            </div>
          </div>

          {/* Tab 1: Per-Class Performance Table */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-900/60 text-gray-400 font-semibold border-b border-gray-800">
                    <tr>
                      <th className="py-2.5 px-4">Garbage Class</th>
                      <th className="py-2.5 px-4">mAP@50</th>
                      <th className="py-2.5 px-4">mAP@50-95</th>
                      <th className="py-2.5 px-4">Precision</th>
                      <th className="py-2.5 px-4">Recall</th>
                      <th className="py-2.5 px-4">Test Instances (Support)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/40 font-mono">
                    {selectedModel.per_class_metrics.map((cls, idx) => (
                      <tr key={idx} className="hover:bg-gray-900/30">
                        <td className="py-2.5 px-4 font-sans font-bold text-white capitalize">
                          {cls.class_name.replace('_', ' ')}
                        </td>
                        <td className="py-2.5 px-4 text-cyan-400">{(cls.map50 * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-4 text-indigo-400">{(cls.map50_95 * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-4 text-emerald-400">{(cls.precision * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-4 text-amber-400">{(cls.recall * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-4 text-gray-400 font-sans">{cls.support} objects</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Visual Ground Truth vs Model Predictions */}
          {activeTab === 'visual_eval' && (
            <div className="space-y-4">
              {visualEvalItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs">
                  No visual evaluation test samples generated yet.
                </div>
              ) : (
                <div>
                  {/* Selector Bar */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4">
                    {visualEvalItems.map((item, idx) => (
                      <button
                        key={item.image_id}
                        onClick={() => setSelectedVisualIdx(idx)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition ${
                          selectedVisualIdx === idx
                            ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                            : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        <span>Test #{idx + 1}</span>
                        <span className="text-[10px] text-gray-500 font-mono">({item.filename})</span>
                      </button>
                    ))}
                  </div>

                  {activeVisual && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                      {/* Visual Inspection Canvas */}
                      <div className="lg:col-span-2 bg-black/90 rounded-2xl p-4 border border-gray-800 relative overflow-hidden flex flex-col items-center">
                        <div className="relative inline-block max-w-full rounded-lg overflow-hidden">
                          <img
                            src={activeVisual.image_url}
                            alt={activeVisual.filename}
                            className="max-h-[480px] max-w-full object-contain rounded-lg"
                          />

                          {/* SVG Box Rendering */}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {/* Ground Truth Boxes (Green outline) */}
                            {activeVisual.ground_truth_boxes.map((gt, i) => {
                              const [xmin, ymin, xmax, ymax] = gt.bbox_pixel;
                              // Approximate relative coordinates
                              return (
                                <rect
                                  key={`gt_${i}`}
                                  x={`${(xmin / 1920) * 100}%`}
                                  y={`${(ymin / 1080) * 100}%`}
                                  width={`${((xmax - xmin) / 1920) * 100}%`}
                                  height={`${((ymax - ymin) / 1080) * 100}%`}
                                  fill="rgba(16, 185, 129, 0.15)"
                                  stroke="#10b981"
                                  strokeWidth="0.8"
                                />
                              );
                            })}

                            {/* Predicted Boxes (Cyan / Orange outline) */}
                            {activeVisual.predicted_boxes.map((pred, i) => {
                              const [xmin, ymin, xmax, ymax] = pred.bbox_pixel;
                              const isTP = pred.status === 'true_positive';
                              return (
                                <rect
                                  key={`pred_${i}`}
                                  x={`${(xmin / 1920) * 100}%`}
                                  y={`${(ymin / 1080) * 100}%`}
                                  width={`${((xmax - xmin) / 1920) * 100}%`}
                                  height={`${((ymax - ymin) / 1080) * 100}%`}
                                  fill={isTP ? 'rgba(56, 189, 248, 0.2)' : 'rgba(239, 68, 68, 0.2)'}
                                  stroke={isTP ? '#38bdf8' : '#ef4444'}
                                  strokeWidth="1.2"
                                  strokeDasharray={isTP ? 'none' : '3,2'}
                                />
                              );
                            })}
                          </svg>
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4 mt-3 text-xs font-semibold">
                          <span className="flex items-center gap-1.5 text-emerald-400">
                            <span className="w-3 h-3 rounded border border-emerald-400 bg-emerald-400/20"></span>
                            Ground Truth ({activeVisual.ground_truth_count})
                          </span>
                          <span className="flex items-center gap-1.5 text-blue-400">
                            <span className="w-3 h-3 rounded border border-blue-400 bg-blue-400/20"></span>
                            True Positive (Match)
                          </span>
                          <span className="flex items-center gap-1.5 text-red-400">
                            <span className="w-3 h-3 rounded border border-red-400 bg-red-400/20 border-dashed"></span>
                            False Positive
                          </span>
                        </div>
                      </div>

                      {/* Image Test Diagnostic Metrics */}
                      <div className="bg-gray-900/90 rounded-2xl p-5 border border-gray-800 space-y-4 text-xs">
                        <div className="font-bold text-white text-sm">Image Evaluation Metrics</div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-950 border border-gray-800">
                            <span className="text-gray-400">True Positives (TP)</span>
                            <span className="font-bold font-mono text-emerald-400">{activeVisual.true_positives}</span>
                          </div>
                          <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-950 border border-gray-800">
                            <span className="text-gray-400">False Positives (FP)</span>
                            <span className="font-bold font-mono text-red-400">{activeVisual.false_positives}</span>
                          </div>
                          <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-950 border border-gray-800">
                            <span className="text-gray-400">Missed Garbage (FN)</span>
                            <span className="font-bold font-mono text-amber-400">{activeVisual.false_negatives}</span>
                          </div>
                        </div>

                        <div className="p-3 bg-blue-950/20 border border-blue-900/40 rounded-xl text-[11px] text-blue-300 leading-relaxed">
                          Visual inspector compares IoU &ge; 0.5 bounding box intersections between ground-truth labels and raw model inference.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
