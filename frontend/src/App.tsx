import React, { useState, useEffect } from 'react';
import { Plane, Map, BarChart3, Upload, History, RefreshCw, Layers, Sparkles, Cpu, ShieldCheck } from 'lucide-react';
import { SurveySummary, SurveyDetail, HotspotItem, ImageDetails } from './types';
import { surveyApi } from './services/api';
import { UploadModal } from './components/UploadModal';
import { MapView } from './components/MapView';
import { HotspotModal } from './components/HotspotModal';
import { StatsDashboard } from './components/StatsDashboard';
import { SurveyHistory } from './components/SurveyHistory';
import { StudioHub } from './components/studio/StudioHub';

export default function App() {
  // Top-level mode switch: 'mission_map' (Production Operations) vs 'model_studio' (Active-Learning Companion)
  const [appMode, setAppMode] = useState<'mission_map' | 'model_studio'>('mission_map');

  // Mission Map Sub-tabs
  const [activeTab, setActiveTab] = useState<'map' | 'analytics' | 'history'>('map');
  const [surveys, setSurveys] = useState<SurveySummary[]>([]);
  const [activeSurveyId, setActiveSurveyId] = useState<string | null>(null);
  const [activeSurvey, setActiveSurvey] = useState<SurveyDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotItem | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageDetails | null>(null);
  const [isInspectionOpen, setIsInspectionOpen] = useState<boolean>(false);

  // Load survey list on mount
  const fetchSurveys = async () => {
    try {
      const data = await surveyApi.listSurveys();
      setSurveys(data);
      if (data.length > 0 && !activeSurveyId) {
        setActiveSurveyId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching surveys:', err);
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, []);

  // Load survey detail when activeSurveyId changes
  const fetchActiveSurveyDetail = async (id: string) => {
    setIsLoading(true);
    try {
      const detail = await surveyApi.getSurveyDetail(id);
      setActiveSurvey(detail);
    } catch (err) {
      console.error('Error loading survey detail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSurveyId) {
      fetchActiveSurveyDetail(activeSurveyId);
    }
  }, [activeSurveyId]);

  // Status polling for active processing survey
  useEffect(() => {
    let timer: any;
    if (activeSurvey && activeSurvey.status === 'processing') {
      timer = setInterval(() => {
        fetchActiveSurveyDetail(activeSurvey.id);
        fetchSurveys();
      }, 2500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeSurvey?.status, activeSurvey?.id]);

  const handleSelectHotspot = (hotspot: HotspotItem) => {
    setSelectedHotspot(hotspot);
    const img = activeSurvey?.images.find((i) => i.id === hotspot.associated_image_id) || hotspot.images?.[0] || null;
    setSelectedImage(img);
    setIsInspectionOpen(true);
  };

  const handleSelectImage = (img: ImageDetails) => {
    setSelectedImage(img);
    setSelectedHotspot(null);
    setIsInspectionOpen(true);
  };

  const handleSurveyUploaded = (newSurveyId: string) => {
    fetchSurveys();
    setActiveSurveyId(newSurveyId);
    setActiveTab('map');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-gray-100 selection:bg-blue-600 selection:text-white">
      {/* Top Navbar with App-Mode Selector */}
      <header className="glass-panel sticky top-0 z-50 border-b border-gray-800/80 px-6 py-3 flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Brand Identity */}
        <div className="flex items-center gap-3 self-start lg:self-center">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/20">
            <Plane className="w-5 h-5 text-white transform -rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-blue-400">
                AeroClean
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Drone Garbage Index & AI Studio
              </span>
            </div>
            <p className="text-xs text-gray-400">Geospatial Cleanliness Assessment & Active-Learning ML Platform</p>
          </div>
        </div>

        {/* Top-Level Mode Selector (Mission Operations vs AI Studio) */}
        <div className="flex items-center gap-2 bg-gray-950 p-1 rounded-xl border border-gray-800 shadow-inner">
          <button
            onClick={() => setAppMode('mission_map')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              appMode === 'mission_map'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            Garbage Index Mission Map
          </button>
          <button
            onClick={() => setAppMode('model_studio')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              appMode === 'model_studio'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-yellow-300" />
            AI Model Studio & Training Lab
          </button>
        </div>

        {/* Action Controls per Mode */}
        {appMode === 'mission_map' && (
          <div className="flex items-center gap-3">
            {/* Mission Map Navigation Tabs */}
            <nav className="flex items-center gap-1 bg-gray-900/60 p-1 rounded-xl border border-gray-800/60">
              <button
                onClick={() => setActiveTab('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  activeTab === 'map'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                Heatmap
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  activeTab === 'analytics'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Missions ({surveys.length})
              </button>
            </nav>

            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-600/30 transition-all transform active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Flight Batch
            </button>
          </div>
        )}
      </header>

      {/* Processing Notification Banner for Mission Map */}
      {appMode === 'mission_map' && activeSurvey?.status === 'processing' && (
        <div className="bg-gradient-to-r from-blue-900/80 via-indigo-900/70 to-cyan-900/80 border-b border-blue-500/30 px-6 py-2.5 flex items-center justify-between text-xs text-blue-200 animate-pulse">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span>
              Analyzing Survey Mission: <strong>{activeSurvey.title}</strong> — Extracting GPS coordinates, running computer vision garbage detection & computing Garbage Indexes...
            </span>
          </div>
          <span className="font-mono text-cyan-300 font-bold">Processing Flight Batch...</span>
        </div>
      )}

      {/* Main Viewport */}
      {appMode === 'model_studio' ? (
        <StudioHub />
      ) : (
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          {activeTab === 'map' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {activeSurvey && (
                <div className="flex items-center justify-between glass-card p-4 rounded-xl border border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">{activeSurvey.title}</h3>
                      <p className="text-xs text-gray-400">
                        {activeSurvey.total_images} Drone Capture Frames | Total Detected Litter: <strong className="text-white">{activeSurvey.total_garbage_count}</strong> items
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-400">Average Garbage Index:</span>
                    <span className={`font-extrabold text-sm px-3 py-1 rounded-lg border ${
                      activeSurvey.average_garbage_index <= 25 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                        : activeSurvey.average_garbage_index <= 50
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : activeSurvey.average_garbage_index <= 75
                        ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                        : 'bg-red-500/20 text-red-300 border-red-500/30'
                    }`}>
                      {activeSurvey.average_garbage_index} / 100
                    </span>
                  </div>
                </div>
              )}

              <MapView
                survey={activeSurvey}
                onSelectHotspot={handleSelectHotspot}
                onSelectImage={handleSelectImage}
                onOpenUpload={() => setIsUploadOpen(true)}
              />
            </div>
          )}

          {activeTab === 'analytics' && (
            <StatsDashboard survey={activeSurvey} />
          )}

          {activeTab === 'history' && (
            <SurveyHistory
              surveys={surveys}
              activeSurveyId={activeSurveyId}
              onSelectSurvey={(id) => {
                setActiveSurveyId(id);
                setActiveTab('map');
              }}
              onRefreshHistory={fetchSurveys}
            />
          )}
        </main>
      )}

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSurveyUploaded={handleSurveyUploaded}
      />

      <HotspotModal
        isOpen={isInspectionOpen}
        image={selectedImage}
        hotspot={selectedHotspot}
        onClose={() => setIsInspectionOpen(false)}
      />
    </div>
  );
}
