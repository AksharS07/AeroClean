import os
import io
import math
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
from PIL import Image
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import UPLOAD_DIR
from app.models.db_models import DatasetImageDB, AnnotationDB, DatasetVersionDB
from app.models.studio_domain import DatasetImageSummary, DatasetImageDetail, AnnotationItem, BBoxPixel, BBoxNorm, DatasetStatsResponse
from app.services.exif_extractor import EXIFExtractor

STUDIO_DIR = UPLOAD_DIR / "studio"
STUDIO_RAW_DIR = STUDIO_DIR / "raw"
STUDIO_THUMB_DIR = STUDIO_DIR / "thumbnails"

STUDIO_RAW_DIR.mkdir(parents=True, exist_ok=True)
STUDIO_THUMB_DIR.mkdir(parents=True, exist_ok=True)


class DatasetService:
    @staticmethod
    def compute_dhash(image: Image.Image, hash_size: int = 8) -> str:
        """
        Computes difference hash (dHash) for fast perceptual duplicate detection.
        """
        resized = image.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
        pixels = np.array(resized)
        diff = pixels[:, 1:] > pixels[:, :-1]
        decimal_val = 0
        hex_str = []
        for idx, val in enumerate(diff.flatten()):
            if val:
                decimal_val += 2 ** (idx % 8)
            if (idx % 8) == 7:
                hex_str.append(hex(decimal_val)[2:].rjust(2, "0"))
                decimal_val = 0
        return "".join(hex_str)

    @staticmethod
    def hamming_distance(hash1: str, hash2: str) -> int:
        """Computes Hamming distance between two hex perceptual hashes."""
        if not hash1 or not hash2 or len(hash1) != len(hash2):
            return 999
        bin1 = bin(int(hash1, 16))[2:].zfill(len(hash1) * 4)
        bin2 = bin(int(hash2, 16))[2:].zfill(len(hash2) * 4)
        return sum(c1 != c2 for c1, c2 in zip(bin1, bin2))

    @classmethod
    def process_and_save_uploaded_image(
        cls, 
        file_bytes: bytes, 
        filename: str, 
        db: Session,
        category: str = "unknown"
    ) -> DatasetImageSummary:
        """
        Ingests a drone image, extracts EXIF metadata, creates a thumbnail,
        calculates perceptual hash, and persists record into DatasetImageDB.
        """
        pil_img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        width, height = pil_img.size
        file_size = len(file_bytes)

        # Generate safe filenames
        import uuid
        image_id = str(uuid.uuid4())
        safe_filename = f"{image_id[:8]}_{filename}"
        raw_path = str(STUDIO_RAW_DIR / safe_filename)
        thumb_filename = f"thumb_{safe_filename}"
        thumb_path = str(STUDIO_THUMB_DIR / thumb_filename)

        # Save raw image
        with open(raw_path, "wb") as f:
            f.write(file_bytes)

        # Generate thumbnail (240x240 max)
        thumb_img = pil_img.copy()
        thumb_img.thumbnail((240, 240), Image.Resampling.LANCZOS)
        thumb_img.save(thumb_path, format="JPEG", quality=85)

        # Compute perceptual hash
        phash = cls.compute_dhash(pil_img)

        # Extract EXIF metadata
        exif_meta = EXIFExtractor.extract_metadata(raw_path)
        lat = exif_meta.get("latitude")
        lng = exif_meta.get("longitude")
        alt = exif_meta.get("altitude")
        timestamp = exif_meta.get("timestamp")
        has_gps = lat is not None and lng is not None

        # Build DB Record
        db_image = DatasetImageDB(
            id=image_id,
            filename=filename,
            file_path=f"/uploads/studio/raw/{safe_filename}",
            thumbnail_path=f"/uploads/studio/thumbnails/{thumb_filename}",
            file_size_bytes=file_size,
            width=width,
            height=height,
            phash=phash,
            category=category,
            has_gps=has_gps,
            gps_latitude=lat,
            gps_longitude=lng,
            gps_altitude=alt,
            gps_timestamp=timestamp if has_gps else None,
            image_timestamp=timestamp,
            annotation_status="unannotated",
            created_at=datetime.utcnow()
        )

        db.add(db_image)
        db.commit()
        db.refresh(db_image)

        return cls._to_summary(db_image)

    @classmethod
    def list_dataset_images(
        cls,
        db: Session,
        category: Optional[str] = None,
        has_gps: Optional[bool] = None,
        annotation_status: Optional[str] = None,
        split: Optional[str] = None,
        version_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[DatasetImageSummary], int]:
        """Queries dataset images with multi-dimensional filtering."""
        query = db.query(DatasetImageDB)

        if category and category != "all":
            query = query.filter(DatasetImageDB.category == category)
        if has_gps is not None:
            query = query.filter(DatasetImageDB.has_gps == has_gps)
        if annotation_status and annotation_status != "all":
            query = query.filter(DatasetImageDB.annotation_status == annotation_status)
        if split and split != "all":
            query = query.filter(DatasetImageDB.split == split)
        if version_id and version_id != "all":
            query = query.filter(DatasetImageDB.dataset_version_id == version_id)

        total = query.count()
        images_db = query.order_by(DatasetImageDB.created_at.desc()).offset(offset).limit(limit).all()

        return [cls._to_summary(img) for img in images_db], total

    @classmethod
    def get_dataset_image_detail(cls, image_id: str, db: Session) -> Optional[DatasetImageDetail]:
        """Returns complete image metadata and human-verified/AI annotations."""
        db_img = db.query(DatasetImageDB).filter(DatasetImageDB.id == image_id).first()
        if not db_img:
            return None

        annotations = []
        for ann in db_img.annotations:
            annotations.append(AnnotationItem(
                id=ann.id,
                dataset_image_id=ann.dataset_image_id,
                class_id=ann.class_id,
                class_name=ann.class_name,
                bbox_pixel=BBoxPixel(
                    x_min=ann.x_min,
                    y_min=ann.y_min,
                    x_max=ann.x_max,
                    y_max=ann.y_max
                ),
                bbox_norm=BBoxNorm(
                    x_center=ann.x_center_norm,
                    y_center=ann.y_center_norm,
                    width=ann.width_norm,
                    height=ann.height_norm
                ),
                confidence=ann.confidence,
                provenance=ann.provenance,
                is_verified=ann.is_verified,
                created_at=ann.created_at
            ))

        return DatasetImageDetail(
            id=db_img.id,
            filename=db_img.filename,
            file_path=db_img.file_path,
            thumbnail_path=db_img.thumbnail_path,
            file_size_bytes=db_img.file_size_bytes,
            width=db_img.width,
            height=db_img.height,
            phash=db_img.phash,
            category=db_img.category,
            has_gps=db_img.has_gps,
            gps_latitude=db_img.gps_latitude,
            gps_longitude=db_img.gps_longitude,
            gps_altitude=db_img.gps_altitude,
            gps_timestamp=db_img.gps_timestamp,
            image_timestamp=db_img.image_timestamp,
            camera_make=db_img.camera_make,
            camera_model=db_img.camera_model,
            camera_heading=db_img.camera_heading,
            annotation_status=db_img.annotation_status,
            split=db_img.split,
            annotation_count=len(annotations),
            created_at=db_img.created_at,
            annotations=annotations
        )

    @classmethod
    def update_image_category(cls, image_id: str, category: str, db: Session) -> bool:
        """Updates category tag for an image (Clean, Littered, Heavily Littered, Unknown)."""
        db_img = db.query(DatasetImageDB).filter(DatasetImageDB.id == image_id).first()
        if db_img:
            db_img.category = category
            db.commit()
            return True
        return False

    @classmethod
    def bulk_update_category(cls, image_ids: List[str], category: str, db: Session) -> int:
        """Bulk updates category tags across multiple images."""
        count = db.query(DatasetImageDB).filter(DatasetImageDB.id.in_(image_ids)).update(
            {DatasetImageDB.category: category}, synchronize_session=False
        )
        db.commit()
        return count

    @classmethod
    def delete_image(cls, image_id: str, db: Session) -> bool:
        """Deletes a dataset image, its annotations, and its files from disk."""
        db_img = db.query(DatasetImageDB).filter(DatasetImageDB.id == image_id).first()
        if not db_img:
            return False

        # Remove annotations
        db.query(AnnotationDB).filter(AnnotationDB.dataset_image_id == image_id).delete(synchronize_session=False)

        # Remove physical files if in uploads directory
        try:
            if db_img.file_path and db_img.file_path.startswith("/uploads/"):
                rel_path = db_img.file_path.replace("/uploads/", "")
                raw_path = UPLOAD_DIR / rel_path
                if raw_path.exists():
                    os.remove(raw_path)
            if db_img.thumbnail_path and db_img.thumbnail_path.startswith("/uploads/"):
                rel_thumb = db_img.thumbnail_path.replace("/uploads/", "")
                thumb_path = UPLOAD_DIR / rel_thumb
                if thumb_path.exists():
                    os.remove(thumb_path)
        except Exception as e:
            print(f"Warning: Failed to delete image file from disk: {e}")

        db.delete(db_img)
        db.commit()
        return True

    @classmethod
    def bulk_delete_images(cls, image_ids: List[str], db: Session) -> int:
        """Deletes multiple dataset images and their associated files/annotations."""
        deleted_count = 0
        for img_id in image_ids:
            if cls.delete_image(img_id, db):
                deleted_count += 1
        return deleted_count

    @classmethod
    def get_dataset_statistics(cls, db: Session) -> DatasetStatsResponse:
        """Computes comprehensive dataset distribution statistics."""
        total = db.query(DatasetImageDB).count()
        clean = db.query(DatasetImageDB).filter(DatasetImageDB.category == "clean").count()
        littered = db.query(DatasetImageDB).filter(DatasetImageDB.category == "littered").count()
        heavily_littered = db.query(DatasetImageDB).filter(DatasetImageDB.category == "heavily_littered").count()
        unknown = db.query(DatasetImageDB).filter(DatasetImageDB.category == "unknown").count()
        
        with_gps = db.query(DatasetImageDB).filter(DatasetImageDB.has_gps == True).count()
        without_gps = total - with_gps

        annotated = db.query(DatasetImageDB).filter(DatasetImageDB.annotation_status.in_(["ai_annotated", "human_verified"])).count()
        unannotated = total - annotated

        total_annotations = db.query(AnnotationDB).count()

        # Class distribution
        class_counts = db.query(AnnotationDB.class_name, func.count(AnnotationDB.id)).group_by(AnnotationDB.class_name).all()
        class_dist = {name: count for name, count in class_counts}

        return DatasetStatsResponse(
            total_images=total,
            clean_count=clean,
            littered_count=littered,
            heavily_littered_count=heavily_littered,
            unknown_count=unknown,
            with_gps_count=with_gps,
            without_gps_count=without_gps,
            annotated_count=annotated,
            unannotated_count=unannotated,
            total_annotations=total_annotations,
            class_distribution=class_dist
        )

    @staticmethod
    def _to_summary(db_img: DatasetImageDB) -> DatasetImageSummary:
        return DatasetImageSummary(
            id=db_img.id,
            filename=db_img.filename,
            file_path=db_img.file_path,
            thumbnail_path=db_img.thumbnail_path,
            file_size_bytes=db_img.file_size_bytes,
            width=db_img.width,
            height=db_img.height,
            category=db_img.category,
            has_gps=db_img.has_gps,
            gps_latitude=db_img.gps_latitude,
            gps_longitude=db_img.gps_longitude,
            gps_altitude=db_img.gps_altitude,
            gps_timestamp=db_img.gps_timestamp,
            image_timestamp=db_img.image_timestamp,
            camera_make=db_img.camera_make,
            camera_model=db_img.camera_model,
            camera_heading=db_img.camera_heading,
            annotation_status=db_img.annotation_status,
            split=db_img.split,
            annotation_count=len(db_img.annotations) if db_img.annotations else 0,
            created_at=db_img.created_at
        )
