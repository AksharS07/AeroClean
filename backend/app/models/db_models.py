import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

# ==============================================================================
# Production AeroClean Database Models (Garbage Index Mapping System)
# ==============================================================================

class SurveyDB(Base):
    __tablename__ = "surveys"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="processing")  # processing, completed, failed
    total_images = Column(Integer, default=0)
    total_garbage_count = Column(Integer, default=0)
    average_garbage_index = Column(Float, default=0.0)
    area_surveyed_sqm = Column(Float, default=0.0)
    bounds_json = Column(Text, nullable=True)

    images = relationship("ImageDB", back_populates="survey", cascade="all, delete-orphan")
    hotspots = relationship("HotspotDB", back_populates="survey", cascade="all, delete-orphan")


class ImageDB(Base):
    __tablename__ = "images"

    id = Column(String, primary_key=True, default=generate_uuid)
    survey_id = Column(String, ForeignKey("surveys.id"), nullable=False)
    original_filename = Column(String, nullable=False)
    raw_path = Column(String, nullable=False)
    annotated_path = Column(String, nullable=True)
    upload_timestamp = Column(DateTime, default=datetime.utcnow)
    gps_latitude = Column(Float, nullable=True)
    gps_longitude = Column(Float, nullable=True)
    gps_altitude = Column(Float, nullable=True)
    garbage_index = Column(Float, default=0.0)
    garbage_count = Column(Integer, default=0)
    confidence_avg = Column(Float, default=0.0)
    detections_json = Column(Text, nullable=True)

    survey = relationship("SurveyDB", back_populates="images")


class HotspotDB(Base):
    __tablename__ = "hotspots"

    id = Column(String, primary_key=True, default=generate_uuid)
    survey_id = Column(String, ForeignKey("surveys.id"), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    garbage_index = Column(Float, default=0.0)
    garbage_count = Column(Integer, default=0)
    primary_category = Column(String, default="Litter")
    severity_tier = Column(String, default="Low")  # Clean, Moderate, High, Critical
    zone_name = Column(String, nullable=True)
    image_ids_json = Column(Text, nullable=True)

    survey = relationship("SurveyDB", back_populates="hotspots")


# ==============================================================================
# Companion Tool Database Models (AI Model Lab & Dataset Training Studio)
# ==============================================================================

class DatasetImageDB(Base):
    __tablename__ = "dataset_images"

    id = Column(String, primary_key=True, default=generate_uuid)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    thumbnail_path = Column(String, nullable=True)
    file_size_bytes = Column(Integer, default=0)
    width = Column(Integer, default=0)
    height = Column(Integer, default=0)
    phash = Column(String, nullable=True)  # Perceptual hash for duplicate defense
    category = Column(String, default="unknown")  # clean, littered, heavily_littered, unknown
    has_gps = Column(Boolean, default=False)
    gps_latitude = Column(Float, nullable=True)
    gps_longitude = Column(Float, nullable=True)
    gps_altitude = Column(Float, nullable=True)
    gps_timestamp = Column(DateTime, nullable=True)
    image_timestamp = Column(DateTime, nullable=True)
    camera_make = Column(String, nullable=True)
    camera_model = Column(String, nullable=True)
    camera_heading = Column(Float, nullable=True)
    annotation_status = Column(String, default="unannotated")  # unannotated, ai_annotated, human_verified
    split = Column(String, nullable=True)  # train, val, test, unassigned
    dataset_version_id = Column(String, ForeignKey("dataset_versions.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    annotations = relationship("AnnotationDB", back_populates="dataset_image", cascade="all, delete-orphan")
    dataset_version = relationship("DatasetVersionDB", back_populates="images")


class AnnotationDB(Base):
    __tablename__ = "dataset_annotations"

    id = Column(String, primary_key=True, default=generate_uuid)
    dataset_image_id = Column(String, ForeignKey("dataset_images.id"), nullable=False)
    class_id = Column(Integer, default=0)
    class_name = Column(String, nullable=False)
    x_min = Column(Float, nullable=False)
    y_min = Column(Float, nullable=False)
    x_max = Column(Float, nullable=False)
    y_max = Column(Float, nullable=False)
    x_center_norm = Column(Float, nullable=False)
    y_center_norm = Column(Float, nullable=False)
    width_norm = Column(Float, nullable=False)
    height_norm = Column(Float, nullable=False)
    confidence = Column(Float, default=1.0)
    provenance = Column(String, default="human_approved")  # ai_predicted, human_approved, human_corrected
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    dataset_image = relationship("DatasetImageDB", back_populates="annotations")


class DatasetVersionDB(Base):
    __tablename__ = "dataset_versions"

    id = Column(String, primary_key=True, default=generate_uuid)
    version_tag = Column(String, nullable=False, unique=True)  # e.g. v1.0.0, v1.1.0
    description = Column(String, nullable=True)
    total_images = Column(Integer, default=0)
    train_count = Column(Integer, default=0)
    val_count = Column(Integer, default=0)
    test_count = Column(Integer, default=0)
    total_annotations = Column(Integer, default=0)
    class_distribution_json = Column(Text, nullable=True)
    split_config_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    images = relationship("DatasetImageDB", back_populates="dataset_version")
    models = relationship("ModelVersionDB", back_populates="dataset_version")


class ModelVersionDB(Base):
    __tablename__ = "model_versions"

    id = Column(String, primary_key=True, default=generate_uuid)
    version_tag = Column(String, nullable=False, unique=True)  # e.g. yolo-v1.0-baseline
    dataset_version_id = Column(String, ForeignKey("dataset_versions.id"), nullable=True)
    architecture = Column(String, default="YOLOv8n")
    epochs = Column(Integer, default=25)
    batch_size = Column(Integer, default=16)
    img_size = Column(Integer, default=640)
    weights_path = Column(String, nullable=True)
    precision = Column(Float, default=0.0)
    recall = Column(Float, default=0.0)
    map50 = Column(Float, default=0.0)
    map50_95 = Column(Float, default=0.0)
    per_class_metrics_json = Column(Text, nullable=True)
    confusion_matrix_json = Column(Text, nullable=True)
    is_production = Column(Boolean, default=False)
    status = Column(String, default="trained")  # training, trained, failed
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    dataset_version = relationship("DatasetVersionDB", back_populates="models")
