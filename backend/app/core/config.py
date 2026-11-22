import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
RAW_UPLOAD_DIR = UPLOAD_DIR / "raw"
ANNOTATED_UPLOAD_DIR = UPLOAD_DIR / "annotated"

RAW_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ANNOTATED_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/aeroclean.db")
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.25"))

# Mangalore, Karnataka default GPS coordinates (Central Market / Hampankatta)
DEFAULT_MANGALORE_LAT = 12.8688
DEFAULT_MANGALORE_LNG = 74.8423

# Target garbage classes tailored for Indian street waste & aerial drone vision
TARGET_GARBAGE_CLASSES = [
    "trash", "garbage", "litter", "plastic bottle", "plastic bag", "polythene",
    "gutkha", "pouch", "pan masala", "chai cup", "paper cup", "wrapper",
    "coconut husk", "can", "paper scrap", "waste", "bottle", "container", "cardboard"
]

# Non-garbage classes to ignore
NON_GARBAGE_CLASSES = [
    "car", "truck", "bus", "auto", "rickshaw", "motorcycle", "vehicle",
    "building", "person", "pedestrian", "tree", "vegetation", "road", "shadow", "tar"
]
