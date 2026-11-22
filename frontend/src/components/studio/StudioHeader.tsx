import React from 'react';
import { Database, Map, Edit3, ShieldCheck, Cpu, Award, Sparkles, RefreshCw, Layers } from 'lucide-react';
import { DatasetStatsResponse, ModelVersionDetail } from '../../types/studio';

interface StudioHeaderProps {
  activeTab: 'gallery' | 'map' | 'annotate' | 'quality' | 'train' | 'models';
  onTabChange: (tab: 'gallery' | 'map' | 'annotate' | 'quality' | 'train' | 'models') => void;
  stats: DatasetStatsResponse | null;
  activeModel: ModelVersionDetail | null;
  onSeedDataset: () => void;
  isSeeding: boolean;
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  activeTab,
  onTabChange,
  stats,
  activeModel,
  onSeedDataset,
  isSeeding,
}) => {
  const tabs = [
    { id: 'gallery', label: 'Dataset & Metadata', icon: Database },
    { id: 'map', label: 'Geotagged Map', icon: Map },
    { id: 'annotate', label: 'Annotation Studio', icon: Edit3 },
    { id: 'quality', label: 'Quality Control', icon: ShieldCheck },
    { id: 'train', label: 'Model Training', icon: Cpu },
    { id: 'models', label: 'Model Registry & Eval', icon: Award },
  ] as const;

  return (
    <div className="glass-panel border-b border-gray-800/80 px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Studio Sub-Navigation Tabs */}
      <nav className="flex items-center gap-1.5 overflow-x-auto bg-gray-900/70 p-1.5 rounded-xl border border-gray-800/70">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Stats & Quick Actions Bar */}
      <div className="flex items-center gap-3 self-end md:self-center text-xs">
        {activeModel && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-mono font-bold">Prod: {activeModel.version_tag}</span>
            <span className="text-[10px] text-emerald-400/80">({Math.round(activeModel.map50 * 100)}% mAP)</span>
          </div>
        )}

        {stats && (
          <div className="hidden sm:flex items-center gap-3 text-gray-400 px-3 py-1.5 rounded-xl bg-gray-900/60 border border-gray-800">
            <span>
              Images: <strong className="text-white">{stats.total_images}</strong>
            </span>
            <span>•</span>
            <span>
              Annotated: <strong className="text-cyan-400">{stats.annotated_count}</strong>
            </span>
            <span>•</span>
            <span>
              Labels: <strong className="text-amber-400">{stats.total_annotations}</strong>
            </span>
          </div>
        )}

        <button
          onClick={onSeedDataset}
          disabled={isSeeding}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-600/20 transition disabled:opacity-50"
          title="Seed initial Mangalore street & terrain ground truth dataset"
        >
          {isSeeding ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Seeding...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              Seed Benchmark Data
            </>
          )}
        </button>
      </div>
    </div>
  );
};
