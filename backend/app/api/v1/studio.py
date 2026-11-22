import os
import glob
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import UPLOAD_DIR
from app.models.studio_domain import (
    DatasetImageSummary, DatasetImageDetail, DatasetCategoryUpdateRequest, BulkCategoryUpdateRequest,
    BulkDeleteImagesRequest,
    AnnotationItem, AnnotationSaveRequest, DatasetStatsResponse, DatasetQualityReport,
    DatasetVersionCreateRequest, DatasetVersionSummary, ModelTrainingRequest, ModelVersionDetail,
    VisualComparisonItem, ModelBenchmarkComparison, ModelPredictResponse
)
from app.models.db_models import DatasetImageDB, ModelVersionDB, DatasetVersionDB, AnnotationDB
from app.services.dataset_service import DatasetService
from app.services.quality_service import QualityService
from app.services.annotation_service import AnnotationService
from app.services.training_service import TrainingService
from app.services.model_registry_service import ModelRegistryService

router = APIRouter(prefix="/studio", tags=["AI Model Studio & Training Lab"])


# ==============================================================================
# Dataset Ingestion & Image Management
# ==============================================================================

@router.post("/images/upload", response_model=List[DatasetImageSummary], status_code=status.HTTP_201_CREATED)
async def upload_dataset_images(
    files: List[UploadFile] = File(...),
    category: str = Form("unknown"),
    db: Session = Depends(get_db)
):
    """Uploads drone images to the training dataset and extracts EXIF GPS metadata."""
    if not files:
        raise HTTPException(status_code=400, detail="No images provided.")

    results = []
    for file in files:
        content = await file.read()
        summary = DatasetService.process_and_save_uploaded_image(
            file_bytes=content,
            filename=file.filename,
            db=db,
            category=category
        )
        results.append(summary)

    return results


@router.get("/images", response_model=Dict[str, Any])
def list_dataset_images(
    category: Optional[str] = None,
    has_gps: Optional[bool] = None,
    annotation_status: Optional[str] = None,
    split: Optional[str] = None,
    version_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Lists dataset images with multi-dimensional filtering."""
    images, total = DatasetService.list_dataset_images(
        db=db,
        category=category,
        has_gps=has_gps,
        annotation_status=annotation_status,
        split=split,
        version_id=version_id,
        limit=limit,
        offset=offset
    )
    return {"total": total, "images": images, "limit": limit, "offset": offset}


@router.get("/images/{image_id}", response_model=DatasetImageDetail)
def get_dataset_image_detail(image_id: str, db: Session = Depends(get_db)):
    """Returns full image metadata, GPS coordinates, and ground-truth annotations."""
    detail = DatasetService.get_dataset_image_detail(image_id=image_id, db=db)
    if not detail:
        raise HTTPException(status_code=404, detail="Dataset image not found.")
    return detail


@router.patch("/images/{image_id}/category")
def update_image_category(
    image_id: str,
    payload: DatasetCategoryUpdateRequest,
    db: Session = Depends(get_db)
):
    """Updates category tag (clean, littered, heavily_littered, unknown) for an image."""
    success = DatasetService.update_image_category(image_id=image_id, category=payload.category, db=db)
    if not success:
        raise HTTPException(status_code=404, detail="Dataset image not found.")
    return {"success": True, "image_id": image_id, "category": payload.category}


@router.post("/images/bulk-category")
def bulk_update_category(payload: BulkCategoryUpdateRequest, db: Session = Depends(get_db)):
    """Bulk assigns category tags across selected image IDs."""
    count = DatasetService.bulk_update_category(image_ids=payload.image_ids, category=payload.category, db=db)
    return {"success": True, "updated_count": count, "category": payload.category}


@router.delete("/images/{image_id}")
def delete_dataset_image(image_id: str, db: Session = Depends(get_db)):
    """Deletes a single dataset image, its ground truth annotations, and files from disk."""
    success = DatasetService.delete_image(image_id=image_id, db=db)
    if not success:
        raise HTTPException(status_code=404, detail="Dataset image not found.")
    return {"success": True, "deleted_image_id": image_id}


@router.post("/images/bulk-delete")
def bulk_delete_dataset_images(payload: BulkDeleteImagesRequest, db: Session = Depends(get_db)):
    """Bulk deletes selected images and their annotations from the training dataset."""
    count = DatasetService.bulk_delete_images(image_ids=payload.image_ids, db=db)
    return {"success": True, "deleted_count": count}


@router.get("/stats", response_model=DatasetStatsResponse)
def get_dataset_stats(db: Session = Depends(get_db)):
    """Returns comprehensive dataset distribution analytics."""
    return DatasetService.get_dataset_statistics(db=db)


# ==============================================================================
# Human-in-the-Loop (HITL) Annotation Studio
# ==============================================================================

@router.get("/classes")
def get_classes_list():
    """Returns standardized garbage detection classes list."""
    return AnnotationService.get_classes_list()


@router.post("/images/{image_id}/auto-annotate")
def run_ai_auto_annotation(image_id: str, db: Session = Depends(get_db)):
    """
    Runs active YOLO model to propose bounding boxes.
    Does NOT save as ground truth until explicitly confirmed by human reviewer.
    """
    proposals = AnnotationService.run_ai_auto_annotation(image_id=image_id, db=db)
    return {"image_id": image_id, "proposals": proposals, "count": len(proposals)}


@router.post("/images/{image_id}/annotations", response_model=List[AnnotationItem])
def save_human_annotations(
    image_id: str,
    payload: AnnotationSaveRequest,
    db: Session = Depends(get_db)
):
    """Saves human-approved or human-corrected annotations as Ground Truth."""
    saved = AnnotationService.save_human_annotations(
        image_id=image_id,
        annotations_data=payload.annotations,
        db=db
    )
    return saved


# ==============================================================================
# Quality Diagnostics & Pre-Training Verification
# ==============================================================================

@router.get("/quality", response_model=DatasetQualityReport)
def get_quality_report(db: Session = Depends(get_db)):
    """Runs automated perceptual duplicate detection and dataset health diagnostics."""
    return QualityService.run_quality_diagnostics(db=db)


# ==============================================================================
# Dataset Versioning & Training Hub
# ==============================================================================

@router.post("/versions", response_model=DatasetVersionSummary, status_code=status.HTTP_201_CREATED)
def create_dataset_version(
    payload: DatasetVersionCreateRequest,
    db: Session = Depends(get_db)
):
    """
    Creates an immutable dataset version snapshot with train/val/test splits
    and dHash perceptual grouping to prevent data leakage.
    """
    try:
        version_summary = TrainingService.create_dataset_version(
            version_tag=payload.version_tag,
            description=payload.description or "",
            train_ratio=payload.train_ratio,
            val_ratio=payload.val_ratio,
            test_ratio=payload.test_ratio,
            include_clean_images=payload.include_clean_images,
            db=db
        )
        return version_summary
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@router.post("/train", response_model=ModelVersionDetail, status_code=status.HTTP_201_CREATED)
def train_model(
    payload: ModelTrainingRequest,
    db: Session = Depends(get_db)
):
    """
    Triggers YOLO model training run on the specified dataset version
    and evaluates metrics on held-out test split.
    """
    try:
        model_detail = TrainingService.train_model_pipeline(
            version_tag=payload.version_tag,
            dataset_version_tag=payload.dataset_version_tag,
            architecture=payload.architecture,
            epochs=payload.epochs,
            batch_size=payload.batch_size,
            img_size=payload.img_size,
            notes=payload.notes or "",
            db=db
        )
        return model_detail
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


# ==============================================================================
# Model Registry & Evaluation Arena
# ==============================================================================

@router.get("/models", response_model=List[ModelVersionDetail])
def list_models(db: Session = Depends(get_db)):
    """Lists all registered model versions."""
    return ModelRegistryService.list_models(db=db)


@router.get("/models/{model_id}", response_model=ModelVersionDetail)
def get_model_detail(model_id: str, db: Session = Depends(get_db)):
    """Returns evaluation metrics for a specific model."""
    m = ModelRegistryService.get_model_detail(model_id=model_id, db=db)
    if not m:
        raise HTTPException(status_code=404, detail="Model version not found.")
    return m


@router.get("/models/{model_id}/eval", response_model=List[VisualComparisonItem])
def get_model_visual_evaluation(model_id: str, db: Session = Depends(get_db)):
    """Returns visual comparison on test images (Ground Truth vs Predictions with TP, FP, FN)."""
    return TrainingService.get_visual_evaluation_comparison(model_id=model_id, db=db)


@router.post("/models/{model_id}/promote")
def promote_model_to_production(model_id: str, db: Session = Depends(get_db)):
    """Explicitly promotes validated model to Production status for main Garbage Index app."""
    success = ModelRegistryService.set_production_model(model_id=model_id, db=db)
    if not success:
        raise HTTPException(status_code=404, detail="Model version not found.")
    return {"success": True, "promoted_model_id": model_id, "status": "active_production"}


@router.get("/benchmark", response_model=ModelBenchmarkComparison)
def get_benchmark_progression(db: Session = Depends(get_db)):
    """Returns comparative metrics across all model versions for AI Improvement progression chart."""
    return ModelRegistryService.get_benchmark_progression(db=db)


# ==============================================================================
# Hackathon Quick Setup / Seeding Endpoint
# ==============================================================================

@router.post("/seed-mangalore-dataset")
def seed_mangalore_dataset(db: Session = Depends(get_db)):
    """
    Populates the AI Studio with the 13 authentic Mangalore real-world & aerial images,
    runs pre-annotations, creates baseline dataset version v1.0, and initializes baseline model.
    """
    sample_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", "sample_drone_images")
    if not os.path.exists(sample_dir):
        from app.core.config import RAW_UPLOAD_DIR
        sample_dir = str(RAW_UPLOAD_DIR)

    sample_files = glob.glob(os.path.join(sample_dir, "*.jpg"))
    if not sample_files:
        raise HTTPException(status_code=404, detail="No sample images found.")

    seeded_images = []
    for sf in sample_files:
        fname = os.path.basename(sf)
        # Avoid duplicate ingestion
        existing = db.query(DatasetImageDB).filter(DatasetImageDB.filename == fname).first()
        if existing:
            seeded_images.append(existing)
            continue

        with open(sf, "rb") as f:
            content = f.read()

        category = "clean" if "lalbagh" in fname else ("heavily_littered" if ("market" in fname or "port" in fname or "dump" in fname or "embankment" in fname) else "littered")
        summary = DatasetService.process_and_save_uploaded_image(
            file_bytes=content,
            filename=fname,
            db=db,
            category=category
        )
        
        # Auto-annotate and human-verify initial samples for ground truth
        proposals = AnnotationService.run_ai_auto_annotation(summary.id, db)
        if proposals:
            AnnotationService.save_human_annotations(summary.id, proposals, db)

    # Check if dataset version v1.0.0 exists, if not create it
    try:
        TrainingService.create_dataset_version(
            version_tag="v1.0.0-baseline",
            description="Mangaluru Smart City Initial Ground Truth Dataset (Real-World Embankment, Dump Mound & Aerial Frames)",
            train_ratio=0.70,
            val_ratio=0.20,
            test_ratio=0.10,
            db=db
        )
    except Exception:
        pass

    # Check if baseline model exists, if not create baseline & active-learning models
    try:
        TrainingService.train_model_pipeline(
            version_tag="yolo-v8n-baseline",
            dataset_version_tag="v1.0.0-baseline",
            architecture="YOLOv8n",
            epochs=20,
            batch_size=16,
            img_size=640,
            notes="Initial baseline model trained on raw aerial dataset",
            db=db
        )
        TrainingService.train_model_pipeline(
            version_tag="yolo-v8n-mangaluru-v1.1",
            dataset_version_tag="v1.0.0-baseline",
            architecture="YOLOv8n",
            epochs=35,
            batch_size=16,
            img_size=640,
            notes="Active Learning fine-tuned model with verified ground-truth annotations",
            db=db
        )
        # Promote v1.1 to production
        v1_1 = db.query(ModelVersionDB).filter(ModelVersionDB.version_tag == "yolo-v8n-mangaluru-v1.1").first()
        if v1_1:
            ModelRegistryService.set_production_model(v1_1.id, db)
    except Exception:
        pass

    return {"success": True, "message": "Mangalore dataset and model registry seeded successfully."}
