export interface BBoxPixel {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

export interface BBoxNorm {
  x_center: number;
  y_center: number;
  width: number;
  height: number;
}

export interface AnnotationItem {
  id: string;
  dataset_image_id?: string;
  class_id: number;
  class_name: string;
  bbox_pixel: BBoxPixel;
  bbox_norm: BBoxNorm;
  confidence: number;
  provenance: 'ai_predicted' | 'human_approved' | 'human_corrected';
  is_verified: boolean;
  created_at?: string;
}

export interface DatasetImageSummary {
  id: string;
  filename: string;
  file_path: string;
  thumbnail_path?: string;
  file_size_bytes: number;
  width: number;
  height: number;
  category: 'clean' | 'littered' | 'heavily_littered' | 'unknown';
  has_gps: boolean;
  gps_latitude?: number;
  gps_longitude?: number;
  gps_altitude?: number;
  gps_timestamp?: string;
  image_timestamp?: string;
  camera_make?: string;
  camera_model?: string;
  camera_heading?: number;
  annotation_status: 'unannotated' | 'ai_annotated' | 'human_verified';
  split?: 'train' | 'val' | 'test';
  annotation_count: number;
  created_at: string;
}

export interface DatasetImageDetail extends DatasetImageSummary {
  annotations: AnnotationItem[];
  phash?: string;
}

export interface DatasetStatsResponse {
  total_images: number;
  clean_count: number;
  littered_count: number;
  heavily_littered_count: number;
  unknown_count: number;
  with_gps_count: number;
  without_gps_count: number;
  annotated_count: number;
  unannotated_count: number;
  total_annotations: number;
  class_distribution: Record<string, number>;
}

export interface QualityIssue {
  issue_type: 'duplicate' | 'out_of_bounds' | 'tiny_box' | 'missing_label' | 'low_resolution' | 'missing_metadata';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  image_id: string;
  filename: string;
  details?: Record<string, any>;
}

export interface DatasetQualityReport {
  overall_health_score: number;
  total_issues: number;
  critical_issues: number;
  warnings: number;
  duplicate_groups_count: number;
  duplicate_groups: DatasetImageSummary[][];
  flagged_issues: QualityIssue[];
}

export interface DatasetVersionSummary {
  id: string;
  version_tag: string;
  description?: string;
  total_images: number;
  train_count: number;
  val_count: number;
  test_count: number;
  total_annotations: number;
  class_distribution: Record<string, number>;
  created_at: string;
}

export interface PerClassMetric {
  class_name: string;
  precision: number;
  recall: number;
  map50: number;
  map50_95: number;
  support: number;
}

export interface ModelVersionDetail {
  id: string;
  version_tag: string;
  dataset_version_tag?: string;
  architecture: string;
  epochs: number;
  batch_size: number;
  img_size: number;
  weights_path?: string;
  precision: number;
  recall: number;
  map50: number;
  map50_95: number;
  is_production: boolean;
  status: 'training' | 'trained' | 'failed';
  notes?: string;
  created_at: string;
  per_class_metrics: PerClassMetric[];
  confusion_matrix: {
    classes?: string[];
    matrix?: number[][];
  };
}

export interface ModelBenchmarkProgressionPoint {
  version: string;
  dataset_version?: string;
  iteration: number;
  map50: number;
  map50_95: number;
  precision: number;
  recall: number;
  is_production: boolean;
  created_at: string;
}

export interface ModelBenchmarkComparison {
  models: ModelVersionDetail[];
  active_production_model_tag?: string;
  benchmark_dataset_tag: string;
  test_set_size: number;
  progression_history: ModelBenchmarkProgressionPoint[];
}

export interface VisualComparisonItem {
  image_id: string;
  filename: string;
  image_url: string;
  ground_truth_count: number;
  predicted_count: number;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  ground_truth_boxes: Array<{
    class_name: string;
    bbox_pixel: [number, number, number, number];
    status: string;
  }>;
  predicted_boxes: Array<{
    class_name: string;
    confidence: number;
    bbox_pixel: [number, number, number, number];
    status: string;
  }>;
}
