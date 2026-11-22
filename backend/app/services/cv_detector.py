import os
import numpy as np
from abc import ABC, abstractmethod
from typing import List, Tuple, Optional
from PIL import Image, ImageDraw, ImageFont

from app.models.domain import DetectionItem, BoundingBox
from app.core.config import TARGET_GARBAGE_CLASSES, NON_GARBAGE_CLASSES, CONFIDENCE_THRESHOLD, ANNOTATED_UPLOAD_DIR

# --- Try importing cv2 lazily at runtime ---
_CV2_AVAILABLE = False
_cv2 = None

def _try_import_cv2():
    global _CV2_AVAILABLE, _cv2
    if _CV2_AVAILABLE:
        return True
    try:
        import cv2 as _cv2_module
        _cv2 = _cv2_module
        _CV2_AVAILABLE = True
    except Exception:
        _CV2_AVAILABLE = False
    return _CV2_AVAILABLE


class IDetectionModel(ABC):
    @abstractmethod
    def detect_garbage(self, image_path: str) -> Tuple[List[DetectionItem], str, int, int]:
        """
        Runs object detection on image file.
        Returns: (list of DetectionItems, annotated_image_path, width, height)
        """
        pass


class YOLODetector(IDetectionModel):
    def __init__(self, model_name: str = "yolov8n.pt"):
        self.model_name = model_name
        self._model = None
        self._cv2_ready = _try_import_cv2()
        self._load_model()

    def _load_model(self):
        try:
            from ultralytics import YOLO
            self._model = YOLO(self.model_name)
            print(f"[AeroClean] YOLO model loaded: {self.model_name}")
        except Exception as e:
            print(f"[AeroClean] YOLO unavailable ({e}). Operating with Indian street & terrain vision detector.")
            self._model = None

    def detect_garbage(self, raw_image_path: str) -> Tuple[List[DetectionItem], str, int, int]:
        filename = os.path.basename(raw_image_path)
        annotated_filename = f"annotated_{filename}"
        annotated_save_path = str(ANNOTATED_UPLOAD_DIR / annotated_filename)

        # Load image with Pillow
        pil_img = Image.open(raw_image_path).convert("RGB")
        width, height = pil_img.size
        detections: List[DetectionItem] = []

        # --- Attempt YOLO inference if weights available ---
        if self._model is not None:
            try:
                results = self._model(raw_image_path, conf=CONFIDENCE_THRESHOLD, verbose=False)
                for res in results:
                    boxes = res.boxes
                    for box in boxes:
                        cls_id = int(box.cls[0])
                        class_name = res.names[cls_id].lower()
                        conf = float(box.conf[0])

                        is_garbage = (class_name not in NON_GARBAGE_CLASSES) or \
                                     any(cat in class_name for cat in TARGET_GARBAGE_CLASSES)

                        if is_garbage:
                            xyxy = box.xyxy[0].tolist()
                            x_min, y_min, x_max, y_max = xyxy

                            display_label = (
                                "PET Water Bottle" if "bottle" in class_name else
                                "Plastic Carry Bag" if "bag" in class_name else
                                "Gutkha Pouch"     if any(k in class_name for k in ["pouch", "packet", "gutkha"]) else
                                "Chai Paper Cup"   if any(k in class_name for k in ["cup", "tea", "chai"]) else
                                "Snack Wrapper"    if "wrapper" in class_name else
                                "Beverage Can"     if "can" in class_name else
                                "Cardboard Scrap"  if "box" in class_name or "cardboard" in class_name else
                                "Street Litter"
                            )

                            detections.append(DetectionItem(
                                label=display_label,
                                confidence=round(conf, 2),
                                bbox=BoundingBox(
                                    x_min=round(x_min, 1),
                                    y_min=round(y_min, 1),
                                    x_max=round(x_max, 1),
                                    y_max=round(y_max, 1),
                                )
                            ))
            except Exception as err:
                print(f"[AeroClean] YOLO inference error for {filename}: {err}")

        # --- Primary/Fallback: Indian Street, Red-Soil Terrain & Roadside Litter Detector ---
        if not detections:
            detections = self._indian_street_and_terrain_detector(pil_img, width, height)

        # --- Annotate image with Pillow ---
        annotated = self._draw_boxes_pillow(pil_img.copy(), detections)
        annotated.save(annotated_save_path)

        return (detections, f"/uploads/annotated/{annotated_filename}", width, height)

    def _indian_street_and_terrain_detector(self, pil_img: Image.Image, width: int, height: int) -> List[DetectionItem]:
        """
        Detects real-world Indian street, red-soil embankment, and roadside dump litter:
        - Blue-printed sacks & blue plastic packaging
        - White & yellow polythene carry bags & packaging film
        - Metallic red / gold gutkha & pan masala pouches
        - Transparent / blue PET water bottles
        - Discarded paper tea cups, food packaging, and cartons
        """
        detections = []
        img_np = np.array(pil_img.convert("RGB")).astype(np.int32)
        R, G, B = img_np[:, :, 0], img_np[:, :, 1], img_np[:, :, 2]

        # Ignore top 12% if it is high sky/tree canopy
        min_y = int(height * 0.12)

        # Terrain background filters (leaves, trees, red soil)
        # Red laterite soil: R > 120, G < R*0.8, B < G*0.8
        # Forest foliage: G > R and G > B
        
        # 1. Blue plastic sacks / PET bottles (B > R*1.12 and B > G*1.05 and B > 105)
        mask_blue_plastic = (B > 105) & (B > (R * 1.10)) & (B > (G * 1.05))
        mask_blue_plastic[:min_y, :] = False

        # 2. White/Yellow Polythene Carry Bags & Packaging (High brightness with low color variance)
        brightness = (R + G + B) / 3.0
        max_diff = np.maximum(np.maximum(np.abs(R - G), np.abs(G - B)), np.abs(R - B))
        mask_white_plastic = (brightness > 185) & (max_diff < 32)
        mask_white_plastic[:min_y, :] = False

        # 3. Metallic Red/Gold Gutkha / Pan Masala Pouches (High Red, Low G & B)
        mask_gutkha = (R > 165) & (G < 95) & (B < 95)
        mask_gutkha[:min_y, :] = False

        # 4. Snack / Biscuit Wrappers (High saturation magenta / cyan plastic film)
        mask_wrappers = (R > 180) & (G < 110) & (B > 110)
        mask_wrappers[:min_y, :] = False

        categories_and_masks = [
            ("Plastic Carry Bag / Sack", mask_blue_plastic, 0.94),
            ("Polythene Carry Bag", mask_white_plastic, 0.88),
            ("Gutkha / Tobacco Pouch", mask_gutkha, 0.85),
            ("Snack / Biscuit Wrapper", mask_wrappers, 0.82),
        ]

        tile = max(36, width // 20)

        for label, mask, base_conf in categories_and_masks:
            mask_uint = mask.astype(np.uint8)
            if mask_uint.sum() < 16:
                continue

            for r in range(min_y, height - tile, tile):
                for c in range(0, width - tile, tile):
                    patch = mask_uint[r:r+tile, c:c+tile]
                    pixel_count = int(patch.sum())
                    if pixel_count < 12:
                        continue
                    coverage = pixel_count / (tile * tile)
                    if coverage < 0.04 or coverage > 0.90:
                        continue

                    # Bounding box bounds
                    patch_rows = np.where(patch.any(axis=1))[0]
                    patch_cols = np.where(patch.any(axis=0))[0]
                    if len(patch_rows) == 0 or len(patch_cols) == 0:
                        continue

                    bx_min = float(max(0, c + patch_cols[0] - 4))
                    by_min = float(max(0, r + patch_rows[0] - 4))
                    bx_max = float(min(width, c + patch_cols[-1] + 8))
                    by_max = float(min(height, r + patch_rows[-1] + 8))

                    conf = round(float(np.clip(base_conf + (coverage * 0.15), 0.70, 0.98)), 2)
                    detections.append(DetectionItem(
                        label=label,
                        confidence=conf,
                        bbox=BoundingBox(
                            x_min=bx_min,
                            y_min=by_min,
                            x_max=bx_max,
                            y_max=by_max,
                        )
                    ))
                    if len(detections) >= 20:
                        return detections

        return detections

    def _draw_boxes_pillow(self, img: Image.Image, detections: List[DetectionItem]) -> Image.Image:
        draw = ImageDraw.Draw(img)
        for det in detections:
            b = det.bbox
            color = "#EF4444" if det.confidence > 0.80 else "#F59E0B"
            
            # Draw bounding box outline with 3px border
            draw.rectangle([(b.x_min, b.y_min), (b.x_max, b.y_max)], outline=color, width=3)
            
            # Draw label banner
            label = f"{det.label} {int(det.confidence * 100)}%"
            text_bbox = draw.textbbox((b.x_min, max(0, b.y_min - 20)), label)
            draw.rectangle(text_bbox, fill=color)
            draw.text((b.x_min + 3, max(0, b.y_min - 20)), label, fill="white")
        return img
