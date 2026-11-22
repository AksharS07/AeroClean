import { apiClient } from './api';
import {
  DatasetImageSummary,
  DatasetImageDetail,
  DatasetStatsResponse,
  DatasetQualityReport,
  DatasetVersionSummary,
  ModelVersionDetail,
  ModelBenchmarkComparison,
  VisualComparisonItem,
  AnnotationItem,
} from '../types/studio';

export const studioApi = {
  // --- Dataset Images ---
  uploadImages: async (files: File[], category: string = 'unknown'): Promise<DatasetImageSummary[]> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    formData.append('category', category);

    const response = await apiClient.post<DatasetImageSummary[]>('/studio/images/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  listImages: async (params?: {
    category?: string;
    has_gps?: boolean;
    annotation_status?: string;
    split?: string;
    version_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; images: DatasetImageSummary[] }> => {
    const response = await apiClient.get<{ total: number; images: DatasetImageSummary[] }>('/studio/images', {
      params,
    });
    return response.data;
  },

  getImageDetail: async (imageId: string): Promise<DatasetImageDetail> => {
    const response = await apiClient.get<DatasetImageDetail>(`/studio/images/${imageId}`);
    return response.data;
  },

  updateCategory: async (imageId: string, category: string): Promise<{ success: boolean }> => {
    const response = await apiClient.patch(`/studio/images/${imageId}/category`, { category });
    return response.data;
  },

  bulkUpdateCategory: async (imageIds: string[], category: string): Promise<{ success: boolean; updated_count: number }> => {
    const response = await apiClient.post('/studio/images/bulk-category', { image_ids: imageIds, category });
    return response.data;
  },

  deleteImage: async (imageId: string): Promise<{ success: boolean; deleted_image_id: string }> => {
    const response = await apiClient.delete(`/studio/images/${imageId}`);
    return response.data;
  },

  bulkDeleteImages: async (imageIds: string[]): Promise<{ success: boolean; deleted_count: number }> => {
    const response = await apiClient.post('/studio/images/bulk-delete', { image_ids: imageIds });
    return response.data;
  },

  getStats: async (): Promise<DatasetStatsResponse> => {
    const response = await apiClient.get<DatasetStatsResponse>('/studio/stats');
    return response.data;
  },

  // --- Annotation Studio ---
  getClasses: async (): Promise<Array<{ class_id: number; class_name: string }>> => {
    const response = await apiClient.get('/studio/classes');
    return response.data;
  },

  runAutoAnnotation: async (imageId: string): Promise<{ image_id: string; proposals: AnnotationItem[]; count: number }> => {
    const response = await apiClient.post(`/studio/images/${imageId}/auto-annotate`);
    return response.data;
  },

  saveAnnotations: async (imageId: string, annotations: any[]): Promise<AnnotationItem[]> => {
    const response = await apiClient.post<AnnotationItem[]>(`/studio/images/${imageId}/annotations`, { annotations });
    return response.data;
  },

  // --- Quality Control ---
  getQualityReport: async (): Promise<DatasetQualityReport> => {
    const response = await apiClient.get<DatasetQualityReport>('/studio/quality');
    return response.data;
  },

  // --- Dataset Versioning & Training ---
  createDatasetVersion: async (payload: {
    version_tag: string;
    description?: string;
    train_ratio: number;
    val_ratio: number;
    test_ratio: number;
    include_clean_images: boolean;
  }): Promise<DatasetVersionSummary> => {
    const response = await apiClient.post<DatasetVersionSummary>('/studio/versions', payload);
    return response.data;
  },

  trainModel: async (payload: {
    version_tag: string;
    dataset_version_tag: string;
    architecture: string;
    epochs: number;
    batch_size: number;
    img_size: number;
    notes?: string;
  }): Promise<ModelVersionDetail> => {
    const response = await apiClient.post<ModelVersionDetail>('/studio/train', payload);
    return response.data;
  },

  // --- Model Registry & Evaluation ---
  listModels: async (): Promise<ModelVersionDetail[]> => {
    const response = await apiClient.get<ModelVersionDetail[]>('/studio/models');
    return response.data;
  },

  getModelDetail: async (modelId: string): Promise<ModelVersionDetail> => {
    const response = await apiClient.get<ModelVersionDetail>(`/studio/models/${modelId}`);
    return response.data;
  },

  getModelVisualEval: async (modelId: string): Promise<VisualComparisonItem[]> => {
    const response = await apiClient.get<VisualComparisonItem[]>(`/studio/models/${modelId}/eval`);
    return response.data;
  },

  promoteToProduction: async (modelId: string): Promise<{ success: boolean; promoted_model_id: string }> => {
    const response = await apiClient.post(`/studio/models/${modelId}/promote`);
    return response.data;
  },

  getBenchmarkProgression: async (): Promise<ModelBenchmarkComparison> => {
    const response = await apiClient.get<ModelBenchmarkComparison>('/studio/benchmark');
    return response.data;
  },

  seedMangaloreDataset: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/studio/seed-mangalore-dataset');
    return response.data;
  },
};
