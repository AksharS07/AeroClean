import axios from 'axios';
import { SurveySummary, SurveyDetail, GeoJSONFeatureCollection, HotspotItem, ImageDetails } from '../types';

// Dynamic API Base URL resolution - works with Vite proxy and direct backend host
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.port === '3000') {
    return '/api/v1';
  }
  return 'http://127.0.0.1:8000/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const surveyApi = {
  uploadSurvey: async (title: string, files: File[]): Promise<{ survey_id: string; status: string; total_images: number }> => {
    const formData = new FormData();
    formData.append('title', title);
    files.forEach((file) => formData.append('files', file));

    const response = await apiClient.post('/surveys/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  loadMangaloreDemo: async (): Promise<{ survey_id: string; status: string; total_images: number }> => {
    const response = await apiClient.post('/surveys/demo-mangalore');
    return response.data;
  },

  getSurveyDetail: async (surveyId: string): Promise<SurveyDetail> => {
    const response = await apiClient.get<SurveyDetail>(`/surveys/${surveyId}`);
    return response.data;
  },

  listSurveys: async (): Promise<SurveySummary[]> => {
    const response = await apiClient.get<SurveySummary[]>('/surveys');
    return response.data;
  },

  getGeoJSON: async (surveyId: string): Promise<GeoJSONFeatureCollection> => {
    const response = await apiClient.get<GeoJSONFeatureCollection>(`/surveys/${surveyId}/geojson`);
    return response.data;
  },

  getHotspots: async (surveyId: string): Promise<HotspotItem[]> => {
    const response = await apiClient.get<HotspotItem[]>(`/surveys/${surveyId}/hotspots`);
    return response.data;
  },

  getImageDetail: async (surveyId: string, imageId: string): Promise<ImageDetails> => {
    const response = await apiClient.get<ImageDetails>(`/surveys/${surveyId}/images/${imageId}`);
    return response.data;
  },

  deleteSurvey: async (surveyId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/surveys/${surveyId}`);
    return response.data;
  },
};
