import os
import uuid
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
from PIL import Image
from sqlalchemy.orm import Session

from app.core.config import UPLOAD_DIR
from app.models.db_models import DatasetImageDB, AnnotationDB
from app.models.studio_domain import AnnotationItem, BBoxPixel, BBoxNorm
from app.services.cv_detector import YOLODetector

# Standardized Class Name to Class ID Mapping for YOLO training
GARBAGE_CLASSES = [
    "Plastic Carry Bag",
    "PET Water Bottle",
    "Gutkha Pouch",
    "Chai Paper Cup",
    "Snack Wrapper",
    "Coconut Husk",
    "Cardboard Scrap",
    "Beverage Can",
    "Street Litter"
]

CLASS_TO_ID = {name: idx for idx, name in enumerate(GARBAGE_CLASSES)}
ID_TO_CLASS = {idx: name for idx, name in enumerate(GARBAGE_CLASSES)}

_detector = YOLODetector()

class AnnotationService:
    @classmethod
    def get_classes_list(cls) -> List[Dict[str, Any]]:
        """Returns standard garbage detection classes list."""
        return [{"class_id": idx, "class_name": name} for idx, name in enumerate(GARBAGE_CLASSES)]

    @classmethod
    def run_ai_auto_annotation(cls, image_id: str, db: Session) -> List[Dict[str, Any]]:
        """
        Runs the active YOLO detector on the image to generate PROPOSED detections.
        These are marked as provenance='ai_predicted' and are NOT committed as ground truth
        until confirmed by a human annotator.
        """
        db_img = db.query(DatasetImageDB).filter(DatasetImageDB.id == image_id).first()
        if not db_img:
            return []

        full_raw_path = str(UPLOAD_DIR / db_img.file_path.replace("/uploads/", ""))
        if not os.path.exists(full_raw_path):
            return []

        # Run AI Vision Detector
        detections, _, width, height = _detector.detect_garbage(full_raw_path)

        proposals = []
        for det in detections:
            class_name = det.label
            class_id = CLASS_TO_ID.get(class_name, 8)  # default to Street Litter
            
            # Pixel bbox
            x_min = max(0.0, float(det.bbox.x_min))
            y_min = max(0.0, float(det.bbox.y_min))
            x_max = min(float(width), float(det.bbox.x_max))
            y_max = min(float(height), float(det.bbox.y_max))

            # Normalized YOLO bbox
            box_w = max(1.0, x_max - x_min)
            box_h = max(1.0, y_max - y_min)
            x_center_norm = round((x_min + (box_w / 2.0)) / width, 5)
            y_center_norm = round((y_min + (box_h / 2.0)) / height, 5)
            width_norm = round(box_w / width, 5)
            height_norm = round(box_h / height, 5)

            proposals.append({
                "id": f"ai_prop_{uuid.uuid4().hex[:8]}",
                "class_id": class_id,
                "class_name": class_name,
                "bbox_pixel": {
                    "x_min": x_min,
                    "y_min": y_min,
                    "x_max": x_max,
                    "y_max": y_max
                },
                "bbox_norm": {
                    "x_center": x_center_norm,
                    "y_center": y_center_norm,
                    "width": width_norm,
                    "height": height_norm
                },
                "confidence": det.confidence,
                "provenance": "ai_predicted",
                "is_verified": False
            })

        return proposals

    @classmethod
    def save_human_annotations(cls, image_id: str, annotations_data: List[Dict[str, Any]], db: Session) -> List[AnnotationItem]:
        """
        Saves human-approved / human-corrected annotations as Ground Truth.
        Replaces any prior annotations for this image and updates image annotation status.
        """
        db_img = db.query(DatasetImageDB).filter(DatasetImageDB.id == image_id).first()
        if not db_img:
            return []

        width = float(db_img.width) or 800.0
        height = float(db_img.height) or 800.0

        # Remove existing annotations
        db.query(AnnotationDB).filter(AnnotationDB.dataset_image_id == image_id).delete()

        saved_items = []
        for ann in annotations_data:
            class_name = ann.get("class_name", "Street Litter")
            class_id = ann.get("class_id", CLASS_TO_ID.get(class_name, 0))
            
            # Extract bbox coordinates
            pixel = ann.get("bbox_pixel", {})
            x_min = float(pixel.get("x_min", 0.0))
            y_min = float(pixel.get("y_min", 0.0))
            x_max = float(pixel.get("x_max", 0.0))
            y_max = float(pixel.get("y_max", 0.0))

            # Clamp to image dimensions
            x_min = max(0.0, min(width, x_min))
            y_min = max(0.0, min(height, y_min))
            x_max = max(x_min + 1.0, min(width, x_max))
            y_max = max(y_min + 1.0, min(height, y_max))

            box_w = x_max - x_min
            box_h = y_max - y_min
            x_center_norm = round((x_min + (box_w / 2.0)) / width, 5)
            y_center_norm = round((y_min + (box_h / 2.0)) / height, 5)
            width_norm = round(box_w / width, 5)
            height_norm = round(box_h / height, 5)

            provenance = ann.get("provenance", "human_approved")
            if provenance == "ai_predicted":
                provenance = "human_approved"  # Converted by explicit human approval

            db_ann = AnnotationDB(
                id=str(uuid.uuid4()),
                dataset_image_id=image_id,
                class_id=class_id,
                class_name=class_name,
                x_min=x_min,
                y_min=y_min,
                x_max=x_max,
                y_max=y_max,
                x_center_norm=x_center_norm,
                y_center_norm=y_center_norm,
                width_norm=width_norm,
                height_norm=height_norm,
                confidence=float(ann.get("confidence", 1.0)),
                provenance=provenance,
                is_verified=True,
                created_at=datetime.utcnow()
            )

            db.add(db_ann)
            db.flush()

            saved_items.append(AnnotationItem(
                id=db_ann.id,
                dataset_image_id=image_id,
                class_id=db_ann.class_id,
                class_name=db_ann.class_name,
                bbox_pixel=BBoxPixel(x_min=x_min, y_min=y_min, x_max=x_max, y_max=y_max),
                bbox_norm=BBoxNorm(x_center=x_center_norm, y_center=y_center_norm, width=width_norm, height=height_norm),
                confidence=db_ann.confidence,
                provenance=db_ann.provenance,
                is_verified=True,
                created_at=db_ann.created_at
            ))

        # Update parent image annotation status
        db_img.annotation_status = "human_verified" if saved_items else "unannotated"
        db.commit()

        return saved_items

    @classmethod
    def generate_yolo_label_text(cls, annotations: List[AnnotationDB]) -> str:
        """
        Converts annotation records into standard YOLO formatted label lines:
        <class_id> <x_center_norm> <y_center_norm> <width_norm> <height_norm>
        """
        lines = []
        for ann in annotations:
            lines.append(f"{ann.class_id} {ann.x_center_norm:.6f} {ann.y_center_norm:.6f} {ann.width_norm:.6f} {ann.height_norm:.6f}")
        return "\n".join(lines)
