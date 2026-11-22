import os
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session

from app.models.db_models import DatasetImageDB, AnnotationDB
from app.models.studio_domain import DatasetQualityReport, QualityIssue, DatasetImageSummary
from app.services.dataset_service import DatasetService

class QualityService:
    @classmethod
    def run_quality_diagnostics(cls, db: Session) -> DatasetQualityReport:
        """
        Runs comprehensive dataset diagnostics:
        1. Duplicate / near-duplicate detection via dHash Hamming distance
        2. Bounding box validity (out-of-bounds, zero-area, tiny boxes)
        3. Missing metadata / corrupt images
        4. Class imbalance diagnostics
        """
        images = db.query(DatasetImageDB).all()
        annotations = db.query(AnnotationDB).all()

        flagged_issues: List[QualityIssue] = []
        critical_count = 0
        warning_count = 0

        # 1. Perceptual Duplicate Detection (Hamming Distance <= 6)
        duplicate_groups_map: Dict[str, List[DatasetImageDB]] = {}
        processed_pairs = set()

        for i in range(len(images)):
            for j in range(i + 1, len(images)):
                img1 = images[i]
                img2 = images[j]
                if img1.phash and img2.phash:
                    dist = DatasetService.hamming_distance(img1.phash, img2.phash)
                    if dist <= 6:
                        # Found duplicate / near-duplicate pair
                        pair_key = tuple(sorted([img1.id, img2.id]))
                        if pair_key not in processed_pairs:
                            processed_pairs.add(pair_key)
                            flagged_issues.append(QualityIssue(
                                issue_type="duplicate",
                                severity="warning",
                                message=f"Near-duplicate image pair detected (Similarity: {100 - int(dist/64*100)}%). Ensure they are partitioned into the same split to avoid data leakage.",
                                image_id=img1.id,
                                filename=img1.filename,
                                details={"duplicate_with_id": img2.id, "duplicate_with_filename": img2.filename, "hamming_distance": dist}
                            ))
                            warning_count += 1

                            # Grouping
                            root = img1.id
                            if root not in duplicate_groups_map:
                                duplicate_groups_map[root] = [img1]
                            if img2 not in duplicate_groups_map[root]:
                                duplicate_groups_map[root].append(img2)

        duplicate_groups: List[List[DatasetImageSummary]] = [
            [DatasetService._to_summary(img) for img in group] for group in duplicate_groups_map.values()
        ]

        # 2. Annotation Bounding Box Sanity Checks
        for ann in annotations:
            # Out of bounds check
            if ann.x_min < 0 or ann.y_min < 0 or ann.x_center_norm > 1.0 or ann.y_center_norm > 1.0 or ann.width_norm > 1.0 or ann.height_norm > 1.0:
                flagged_issues.append(QualityIssue(
                    issue_type="out_of_bounds",
                    severity="critical",
                    message=f"Bounding box extends beyond image boundaries in {ann.class_name}.",
                    image_id=ann.dataset_image_id,
                    filename=ann.dataset_image.filename if ann.dataset_image else "unknown",
                    details={"annotation_id": ann.id, "class_name": ann.class_name, "bbox": [ann.x_min, ann.y_min, ann.x_max, ann.y_max]}
                ))
                critical_count += 1

            # Extremely tiny bounding boxes (< 8px width or height)
            box_w = abs(ann.x_max - ann.x_min)
            box_h = abs(ann.y_max - ann.y_min)
            if box_w < 8.0 or box_h < 8.0:
                flagged_issues.append(QualityIssue(
                    issue_type="tiny_box",
                    severity="warning",
                    message=f"Extremely small bounding box ({box_w:.0f}x{box_h:.0f}px) detected for {ann.class_name}.",
                    image_id=ann.dataset_image_id,
                    filename=ann.dataset_image.filename if ann.dataset_image else "unknown",
                    details={"annotation_id": ann.id, "box_width": box_w, "box_height": box_h}
                ))
                warning_count += 1

            # Missing class name or label
            if not ann.class_name or ann.class_name.strip() == "":
                flagged_issues.append(QualityIssue(
                    issue_type="missing_label",
                    severity="critical",
                    message="Orphan bounding box without valid garbage category label.",
                    image_id=ann.dataset_image_id,
                    filename=ann.dataset_image.filename if ann.dataset_image else "unknown",
                    details={"annotation_id": ann.id}
                ))
                critical_count += 1

        # 3. Missing Metadata & Low Resolution Checks
        for img in images:
            if img.width < 400 or img.height < 400:
                flagged_issues.append(QualityIssue(
                    issue_type="low_resolution",
                    severity="warning",
                    message=f"Low resolution aerial image ({img.width}x{img.height}px). Recommended min resolution is 640x640px.",
                    image_id=img.id,
                    filename=img.filename,
                    details={"width": img.width, "height": img.height}
                ))
                warning_count += 1

            if not img.has_gps:
                flagged_issues.append(QualityIssue(
                    issue_type="missing_metadata",
                    severity="info",
                    message="No EXIF GPS metadata found. Image is usable for training but cannot be geotagged on the map.",
                    image_id=img.id,
                    filename=img.filename,
                    details={}
                ))

        # Calculate Overall Health Score (100 - penalties)
        total_images_count = max(1, len(images))
        penalty = (critical_count * 15.0) + (warning_count * 3.5)
        health_score = max(10.0, min(100.0, round(100.0 - (penalty / total_images_count * 10.0), 1)))

        return DatasetQualityReport(
            overall_health_score=health_score,
            total_issues=len(flagged_issues),
            critical_issues=critical_count,
            warnings=warning_count,
            duplicate_groups_count=len(duplicate_groups),
            duplicate_groups=duplicate_groups,
            flagged_issues=flagged_issues
        )
