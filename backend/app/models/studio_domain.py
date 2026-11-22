from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

# ==============================================================================
# Annotation Domain Models
# ==============================================================================

class BBoxNorm(BaseModel):
    x_center: float
    y_center: float
    width: float
    height: float

class BBoxPixel(BaseModel):
    x_min: float
    y_min: float
    x_max: float
    y_max: float

class AnnotationItem(BaseModel):
    id: str
    dataset_image_id: str
    class_id: int
    class_name: str
    bbox_pixel: BBoxPixel
    bbox_norm: BBoxNorm
    confidence: float = 1.0
    provenance: str = "human_approved"  # ai_predicted, human_approved, human_corrected
    is_verified: bool = True
    created_at: datetime

class AnnotationSaveRequest(BaseModel):
    annotations: List[Dict[str, Any]]

# ==============================================================================
# Dataset Image Domain Models
# ==============================================================================

class DatasetImageSummary(BaseModel):
    id: str
    filename: str
    file_path: str
    thumbnail_path: Optional[str] = None
    file_size_bytes: int
    width: int
    height: int
    category: str  # clean, littered, heavily_littered, unknown
    has_gps: bool
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    gps_altitude: Optional[float] = None
    gps_timestamp: Optional[datetime] = None
    image_timestamp: Optional[datetime] = None
    camera_make: Optional[str] = None
    camera_model: Optional[str] = None
    camera_heading: Optional[float] = None
    annotation_status: str  # unannotated, ai_annotated, human_verified
    split: Optional[str] = None  # train, val, test
    annotation_count: int = 0
    created_at: datetime

class DatasetImageDetail(DatasetImageSummary):
    annotations: List[AnnotationItem] = []
    phash: Optional[str] = None

class DatasetCategoryUpdateRequest(BaseModel):
    category: str

class BulkCategoryUpdateRequest(BaseModel):
    image_ids: List[str]
    category: str

class BulkDeleteImagesRequest(BaseModel):
    image_ids: List[str]

# ==============================================================================
# Dataset Statistics & Quality Models
# ==============================================================================

class DatasetStatsResponse(BaseModel):
    total_images: int
    clean_count: int
    littered_count: int
    heavily_littered_count: int
    unknown_count: int
    with_gps_count: int
    without_gps_count: int
    annotated_count: int
    unannotated_count: int
    total_annotations: int
    class_distribution: Dict[str, int]

class QualityIssue(BaseModel):
    issue_type: str  # duplicate, out_of_bounds, tiny_box, missing_label, corrupt_file
    severity: str  # critical, warning, info
    message: str
    image_id: str
    filename: str
    details: Dict[str, Any] = {}

class DatasetQualityReport(BaseModel):
    overall_health_score: float  # 0 to 100
    total_issues: int
    critical_issues: int
    warnings: int
    duplicate_groups_count: int
    duplicate_groups: List[List[DatasetImageSummary]] = []
    flagged_issues: List[QualityIssue] = []

# ==============================================================================
# Dataset Versioning & Training Models
# ==============================================================================

class DatasetVersionCreateRequest(BaseModel):
    version_tag: str  # e.g. v1.0.0
    description: Optional[str] = None
    train_ratio: float = 0.70
    val_ratio: float = 0.20
    test_ratio: float = 0.10
    include_clean_images: bool = True

class DatasetVersionSummary(BaseModel):
    id: str
    version_tag: str
    description: Optional[str] = None
    total_images: int
    train_count: int
    val_count: int
    test_count: int
    total_annotations: int
    class_distribution: Dict[str, int] = {}
    created_at: datetime

class ModelTrainingRequest(BaseModel):
    version_tag: str  # e.g. yolo-v1.1-mangaluru-active-learning
    dataset_version_tag: str  # e.g. v1.0.0
    architecture: str = "YOLOv8n"
    epochs: int = 25
    batch_size: int = 16
    img_size: int = 640
    notes: Optional[str] = None

class PerClassMetric(BaseModel):
    class_name: str
    precision: float
    recall: float
    map50: float
    map50_95: float
    support: int

class VisualComparisonItem(BaseModel):
    image_id: str
    filename: str
    image_url: str
    ground_truth_count: int
    predicted_count: int
    true_positives: int
    false_positives: int
    false_negatives: int
    ground_truth_boxes: List[Dict[str, Any]]
    predicted_boxes: List[Dict[str, Any]]

class ModelVersionDetail(BaseModel):
    id: str
    version_tag: str
    dataset_version_tag: Optional[str] = None
    architecture: str
    epochs: int
    batch_size: int
    img_size: int
    weights_path: Optional[str] = None
    precision: float
    recall: float
    map50: float
    map50_95: float
    is_production: bool
    status: str
    notes: Optional[str] = None
    created_at: datetime
    per_class_metrics: List[PerClassMetric] = []
    confusion_matrix: Dict[str, Any] = {}

class ModelBenchmarkComparison(BaseModel):
    models: List[ModelVersionDetail]
    active_production_model_tag: Optional[str] = None
    benchmark_dataset_tag: str
    test_set_size: int
    progression_history: List[Dict[str, Any]]  # List of points for Recharts AI improvement chart

class ModelInferencePrediction(BaseModel):
    class_name: str
    confidence: float
    bbox: BBoxPixel
    bbox_norm: BBoxNorm

class ModelPredictResponse(BaseModel):
    model_version: str
    image_id: Optional[str] = None
    filename: str
    width: int
    height: int
    detections: List[ModelInferencePrediction]
    total_litter_count: int
    processing_time_ms: float
