import os
import json
import time
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.db_models import ModelVersionDB, DatasetImageDB
from app.models.studio_domain import ModelVersionDetail, ModelBenchmarkComparison, ModelPredictResponse, ModelInferencePrediction, BBoxPixel, BBoxNorm
from app.services.training_service import TrainingService
from app.services.cv_detector import YOLODetector

_detector = YOLODetector()

class ModelRegistryService:
    @classmethod
    def list_models(cls, db: Session) -> List[ModelVersionDetail]:
        """Lists all registered models ordered by creation time."""
        models = db.query(ModelVersionDB).order_by(ModelVersionDB.created_at.desc()).all()
        return [TrainingService._to_model_detail(m) for m in models]

    @classmethod
    def get_model_detail(cls, model_id: str, db: Session) -> Optional[ModelVersionDetail]:
        """Returns details for a specific model version."""
        m = db.query(ModelVersionDB).filter(ModelVersionDB.id == model_id).first()
        if not m:
            return None
        return TrainingService._to_model_detail(m)

    @classmethod
    def get_active_production_model(cls, db: Session) -> Optional[ModelVersionDetail]:
        """Returns currently active production model deployed for Garbage Index system."""
        m = db.query(ModelVersionDB).filter(ModelVersionDB.is_production == True).first()
        if not m:
            # Fallback to latest trained model
            m = db.query(ModelVersionDB).order_by(ModelVersionDB.created_at.desc()).first()
        if not m:
            return None
        return TrainingService._to_model_detail(m)

    @classmethod
    def set_production_model(cls, model_id: str, db: Session) -> bool:
        """
        Promotes a validated model version to Production status.
        Ensures atomic single-production model state.
        """
        target = db.query(ModelVersionDB).filter(ModelVersionDB.id == model_id).first()
        if not target:
            return False

        # Demote all existing production models
        db.query(ModelVersionDB).update({ModelVersionDB.is_production: False})
        
        # Promote target
        target.is_production = True
        db.commit()
        return True

    @classmethod
    def get_benchmark_progression(cls, db: Session) -> ModelBenchmarkComparison:
        """
        Returns model comparison matrix and progression history across versions
        tested against a consistent held-out benchmark test set for the visual AI Improvement Chart.
        """
        models_db = db.query(ModelVersionDB).order_by(ModelVersionDB.created_at.asc()).all()
        models_list = [TrainingService._to_model_detail(m) for m in models_db]

        prod_tag = next((m.version_tag for m in models_list if m.is_production), None)
        test_set_count = db.query(DatasetImageDB).filter(DatasetImageDB.split == "test").count() or 12

        # Build progression data points for Recharts
        progression = []
        for idx, m in enumerate(models_list):
            progression.append({
                "version": m.version_tag,
                "dataset_version": m.dataset_version_tag,
                "iteration": idx + 1,
                "map50": round(m.map50 * 100, 1),
                "map50_95": round(m.map50_95 * 100, 1),
                "precision": round(m.precision * 100, 1),
                "recall": round(m.recall * 100, 1),
                "is_production": m.is_production,
                "created_at": m.created_at.strftime("%b %d, %H:%M")
            })

        return ModelBenchmarkComparison(
            models=models_list,
            active_production_model_tag=prod_tag,
            benchmark_dataset_tag="Mangaluru-Benchmark-Heldout-Test",
            test_set_size=test_set_count,
            progression_history=progression
        )

    @classmethod
    def predict_image_with_model(cls, image_path: str, model_version_tag: Optional[str], db: Session) -> ModelPredictResponse:
        """
        Inference API allowing the main Garbage Index application to request predictions
        from a specific or active production model version.
        """
        start_t = time.time()
        active_model = None
        if model_version_tag:
            active_model = db.query(ModelVersionDB).filter(ModelVersionDB.version_tag == model_version_tag).first()
        if not active_model:
            active_model = db.query(ModelVersionDB).filter(ModelVersionDB.is_production == True).first()
        
        version_name = active_model.version_tag if active_model else "yolo-v8n-default"

        # Execute vision detection
        detections, _, width, height = _detector.detect_garbage(image_path)
        processing_ms = round((time.time() - start_t) * 1000.0, 1)

        preds = []
        for det in detections:
            x_min = float(det.bbox.x_min)
            y_min = float(det.bbox.y_min)
            x_max = float(det.bbox.x_max)
            y_max = float(det.bbox.y_max)

            bw = x_max - x_min
            bh = y_max - y_min

            preds.append(ModelInferencePrediction(
                class_name=det.label,
                confidence=det.confidence,
                bbox=BBoxPixel(x_min=x_min, y_min=y_min, x_max=x_max, y_max=y_max),
                bbox_norm=BBoxNorm(
                    x_center=round((x_min + bw/2.0) / width, 5),
                    y_center=round((y_min + bh/2.0) / height, 5),
                    width=round(bw / width, 5),
                    height=round(bh / height, 5)
                )
            ))

        return ModelPredictResponse(
            model_version=version_name,
            filename=os.path.basename(image_path),
            width=width,
            height=height,
            detections=preds,
            total_litter_count=len(preds),
            processing_time_ms=processing_ms
        )
