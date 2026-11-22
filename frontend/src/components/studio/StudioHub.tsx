import React, { useState, useEffect } from 'react';
import { StudioHeader } from './StudioHeader';
import { DatasetGallery } from './DatasetGallery';
import { DatasetMap } from './DatasetMap';
import { AnnotationCanvas } from './AnnotationCanvas';
import { QualityDashboard } from './QualityDashboard';
import { TrainingHub } from './TrainingHub';
import { ModelRegistry } from './ModelRegistry';
import { studioApi } from '../../services/studioApi';
import { DatasetStatsResponse, ModelVersionDetail } from '../../types/studio';

export const StudioHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'gallery' | 'map' | 'annotate' | 'quality' | 'train' | 'models'>('gallery');
  const [stats, setStats] = useState<DatasetStatsResponse | null>(null);
  const [activeModel, setActiveModel] = useState<ModelVersionDetail | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  const fetchStatsAndModels = async () => {
    try {
      const [statsData, modelsData] = await Promise.all([
        studioApi.getStats(),
        studioApi.listModels(),
      ]);
      setStats(statsData);
      const prod = modelsData.find((m) => m.is_production) || modelsData[0] || null;
      setActiveModel(prod);
    } catch (err) {
      console.error('Failed to load studio overview stats:', err);
    }
  };

  useEffect(() => {
    fetchStatsAndModels();
  }, []);

  const handleSeedDataset = async () => {
    setIsSeeding(true);
    try {
      await studioApi.seedMangaloreDataset();
      await fetchStatsAndModels();
    } catch (err) {
      console.error('Failed to seed benchmark dataset:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleJumpToAnnotation = (imageId: string) => {
    setSelectedImageId(imageId);
    setActiveTab('annotate');
  };

  return (
    <div className="flex flex-col flex-1 bg-[#090d16] text-gray-100 min-h-screen">
      {/* Studio Header with Sub-tabs and Live Stats */}
      <StudioHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        stats={stats}
        activeModel={activeModel}
        onSeedDataset={handleSeedDataset}
        isSeeding={isSeeding}
      />

      {/* Main Tab Content */}
      <div className="flex-1 w-full">
        {activeTab === 'gallery' && (
          <DatasetGallery
            onSelectImageToAnnotate={handleJumpToAnnotation}
            onRefreshStats={fetchStatsAndModels}
          />
        )}

        {activeTab === 'map' && (
          <DatasetMap
            onSelectImageToAnnotate={handleJumpToAnnotation}
          />
        )}

        {activeTab === 'annotate' && (
          <AnnotationCanvas
            initialImageId={selectedImageId}
            onNavigateImage={(id) => setSelectedImageId(id)}
            onAnnotationSaved={fetchStatsAndModels}
          />
        )}

        {activeTab === 'quality' && (
          <QualityDashboard
            onSelectImage={(id) => setSelectedImageId(id)}
            onJumpToAnnotation={handleJumpToAnnotation}
          />
        )}

        {activeTab === 'train' && (
          <TrainingHub
            stats={stats}
            onTrainingComplete={(model) => {
              setActiveModel(model);
              fetchStatsAndModels();
            }}
            onNavigateToRegistry={() => setActiveTab('models')}
          />
        )}

        {activeTab === 'models' && (
          <ModelRegistry
            onModelPromoted={(modelId) => {
              fetchStatsAndModels();
            }}
          />
        )}
      </div>
    </div>
  );
};
