from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    x_min: float
    y_min: float
    x_max: float
    y_max: float

class DetectionItem(BaseModel):
    label: str
    confidence: float
    bbox: BoundingBox

class ImageDetails(BaseModel):
    id: str
    survey_id: str
    original_filename: str
    raw_path: str
    annotated_path: Optional[str] = None
    upload_timestamp: datetime
    gps_latitude: Optional[float] = None
    gps_longitude: Optional[float] = None
    gps_altitude: Optional[float] = None
    garbage_index: float
    garbage_count: int
    confidence_avg: float
    detections: List[DetectionItem] = []

class HotspotItem(BaseModel):
    id: str
    survey_id: str
    latitude: float
    longitude: float
    garbage_index: float
    garbage_count: int
    primary_category: str
    severity_tier: str
    associated_image_id: Optional[str] = None
    zone_name: Optional[str] = None
    image_ids: List[str] = []
    images: List[ImageDetails] = []

class SurveySummary(BaseModel):
    id: str
    title: str
    created_at: datetime
    status: str
    total_images: int
    total_garbage_count: int
    average_garbage_index: float
    area_surveyed_sqm: float
    bounds: Optional[Dict[str, float]] = None

class SurveyDetail(SurveySummary):
    images: List[ImageDetails] = []
    hotspots: List[HotspotItem] = []

class GeoJSONProperty(BaseModel):
    id: str
    garbage_index: float
    garbage_count: int
    intensity: float
    title: str
    image_count: int = 1
    zone_name: Optional[str] = None

class GeoJSONGeometry(BaseModel):
    type: str = "Point"
    coordinates: List[float]  # [longitude, latitude]

class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: GeoJSONGeometry
    properties: GeoJSONProperty

class GeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[GeoJSONFeature]

class SurveyCreateResponse(BaseModel):
    survey_id: str
    title: str
    status: str
    total_images: int
    message: str

class HealthCheckResponse(BaseModel):
    status: str
    version: str
    database: str
