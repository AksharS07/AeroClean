import os
import shutil
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

if os.getenv("VERCEL"):
    UPLOAD_DIR = Path("/tmp/uploads")
    RAW_UPLOAD_DIR = UPLOAD_DIR / "raw"
    ANNOTATED_UPLOAD_DIR = UPLOAD_DIR / "annotated"

    try:
        RAW_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        ANNOTATED_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

    bundled_uploads = BASE_DIR / "uploads"
    if bundled_uploads.exists():
        for sub in ["raw", "annotated"]:
            bundled_sub = bundled_uploads / sub
            tmp_sub = UPLOAD_DIR / sub
            if bundled_sub.exists():
                for f in bundled_sub.glob("*.*"):
                    target = tmp_sub / f.name
                    if not target.exists():
                        try:
                            shutil.copy2(f, target)
                        except Exception:
                            pass

    bundled_db = BASE_DIR / "aeroclean.db"
    tmp_db = Path("/tmp/aeroclean.db")
    if bundled_db.exists() and not tmp_db.exists():
        try:
            shutil.copy2(bundled_db, tmp_db)
        except Exception:
            pass

    DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{tmp_db}")
else:
    UPLOAD_DIR = BASE_DIR / "uploads"
    RAW_UPLOAD_DIR = UPLOAD_DIR / "raw"
    ANNOTATED_UPLOAD_DIR = UPLOAD_DIR / "annotated"
    try:
        RAW_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        ANNOTATED_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
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
