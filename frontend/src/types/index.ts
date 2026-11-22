export interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

export interface DetectionItem {
  label: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface ImageDetails {
  id: string;
  survey_id: string;
  original_filename: string;
  raw_path: string;
  annotated_path?: string;
  upload_timestamp: string;
  gps_latitude?: number;
  gps_longitude?: number;
  gps_altitude?: number;
  garbage_index: number;
  garbage_count: number;
  confidence_avg: number;
  detections: DetectionItem[];
}

export interface HotspotItem {
  id: string;
  survey_id: string;
  latitude: number;
  longitude: number;
  garbage_index: number;
  garbage_count: number;
  primary_category: string;
  severity_tier: 'Clean' | 'Moderate' | 'High' | 'Critical';
  associated_image_id?: string;
  zone_name?: string;
  image_ids?: string[];
  images?: ImageDetails[];
}

export interface SurveySummary {
  id: string;
  title: string;
  created_at: string;
  status: 'processing' | 'completed' | 'failed';
  total_images: number;
  total_garbage_count: number;
  average_garbage_index: number;
  area_surveyed_sqm: number;
  bounds?: {
    min_lat: number;
    max_lat: number;
    min_lng: number;
    max_lng: number;
  };
}

export interface SurveyDetail extends SurveySummary {
  images: ImageDetails[];
  hotspots: HotspotItem[];
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    id: string;
    garbage_index: number;
    garbage_count: number;
    intensity: number;
    title: string;
    image_count?: number;
    zone_name?: string;
  };
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}
