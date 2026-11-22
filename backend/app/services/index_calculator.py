from typing import List, Tuple
from app.models.domain import DetectionItem

class GarbageIndexCalculator:
    @staticmethod
    def calculate_image_index(
        detections: List[DetectionItem], 
        image_width: int = 1000, 
        image_height: int = 1000
    ) -> Tuple[float, int, float, str]:
        """
        Calculates normalized Garbage Index (0 - 100), item count, avg confidence, and severity tier.
        Formula:
          GI = min(100, (w1 * count + w2 * (area_garbage / area_image * 100)) * avg_confidence)
        """
        if not detections:
            return (0.0, 0, 0.0, "Clean")

        garbage_count = len(detections)
        total_confidence = sum(d.confidence for d in detections)
        avg_confidence = total_confidence / garbage_count

        total_image_area = max(1.0, float(image_width * image_height))
        garbage_area = 0.0

        for d in detections:
            box_w = max(0.0, d.bbox.x_max - d.bbox.x_min)
            box_h = max(0.0, d.bbox.y_max - d.bbox.y_min)
            garbage_area += (box_w * box_h)

        area_coverage_ratio = (garbage_area / total_image_area) * 100.0

        # Weights calibrated for drone aerial perspective
        w_count = 8.0
        w_area = 70.0

        raw_score = (w_count * garbage_count + w_area * area_coverage_ratio) * avg_confidence
        garbage_index = round(min(100.0, max(0.0, raw_score)), 1)

        # Severity classification
        if garbage_index <= 25.0:
            severity = "Clean"
        elif garbage_index <= 50.0:
            severity = "Moderate"
        elif garbage_index <= 75.0:
            severity = "High"
        else:
            severity = "Critical"

        return (garbage_index, garbage_count, round(avg_confidence, 2), severity)
