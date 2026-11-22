# AeroClean: Drone Garbage Index Mapping & AI Model Studio Platform

## 1. Executive Overview & System Philosophy
**AeroClean** is a unified dual-system platform designed for municipal waste management, autonomous drone survey mapping, and continuous AI active-learning. Operating with a real-world pilot focus on **Mangaluru (Mangalore), Karnataka**, the platform is partitioned into two logically separated, highly decoupled systems:

1. **Garbage Index Mission Map (Production Operations)**:
   - Ingests multi-frame drone flight surveys.
   - Calculates localized $0-100$ Garbage Index scores using spatial grid binning ($20\text{m} \times 20\text{m}$).
   - Renders interactive aerial heatmaps, fly-to camera zone navigation, and multi-angle zone inspection galleries for municipal cleanup crews.
2. **AI Model Studio & Training Lab (Active-Learning Companion)**:
   - Ingests raw drone imagery and extracts EXIF metadata without fabricating geographic precision.
   - Provides an interactive **Human-in-the-Loop (HITL)** annotation studio with visual provenance tracking (`ai_predicted` vs `human_approved` vs `human_corrected`).
   - Implements automated **Quality Control** with perceptual hashing (`dHash`) to prevent test-train split leakage and detect bounding box anomalies.
   - Packages dataset versions and executes Ultralytics YOLO model training runs.
   - Evaluates models on held-out benchmark datasets and tracks genuine AI metric progression.
   - Houses a **Model Registry** allowing explicit human promotion of validated models to production.

---

## 2. Full Decoupled Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │              AERIAL DRONE SURVEY             │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │          FASTAPI INGESTION & EXIF            │
                    │   - GPS Lat, Lng, Altitude, Heading, Time    │
                    │   - Non-GPS Graceful Handling (Zero Fab)     │
                    └──────────────┬───────────────────────────────┘
                                   │
                 ┌─────────────────┴─────────────────┐
                 ▼                                   ▼
┌─────────────────────────────────┐ ┌──────────────────────────────────┐
│ SYSTEM A: PRODUCTION OPERATIONS │ │ SYSTEM B: AI MODEL STUDIO & LAB  │
├─────────────────────────────────┤ ├──────────────────────────────────┤
│ - Model Inference Client        │ │ - Raw Image Dataset & Categories │
│ - Garbage Index Engine (0-100)  │ │ - Perceptual dHash Leakage Shield│
│ - 20m Spatial Grid Binning      │ │ - HITL Annotation Studio (YOLO)  │
│ - Zone Multi-Angle Inspection   │ │ - Quality Control Dashboard      │
│ - Leaflet Heatmap & Flight Path │ │ - Dataset Versioning & YOLO Train│
│ - Municipal Analytics & PDF Ops │ │ - Model Registry & Eval Matrix   │
└────────────────┬────────────────┘ │ - Visual GT vs Prediction Eval   │
                 │                  │ - Benchmark Progression Chart    │
                 │                  └────────────────┬─────────────────┘
                 │                                   │
                 └──────────────◄────────────────────┘
                     Explicit Human Model Promotion
                   (POST /api/v1/studio/models/{id}/promote)
```

---

## 3. The 10-Step Active-Learning Workflow (Hackathon Demo Walkthrough)

The companion platform follows a strict, repeatable active-learning lifecycle:

```
1. Upload Dataset ──► 2. Inspect Images & EXIF ──► 3. Geotagged Map ──► 4. Run AI Pre-Detection
                                                                                   │
                                                                                   ▼
8. Evaluate Model ◄── 7. Train YOLO Model ◄── 6. Freeze Dataset Version ◄── 5. HITL Human Review
       │                                     (dHash Split Shield)          (Approve/Correct)
       ▼
9. Benchmark AI Progression ──► 10. Explicit Human Promotion to Production ──► Main App Inference
```

1. **Upload Dataset**: Ingest drone survey frames with category tags (`Clean`, `Littered`, `Heavily Littered`, `Unknown`).
2. **Inspect Images & EXIF**: View camera make, focal length, GPS timestamp, orientation, and resolution.
3. **Geotagged Map**: Display all GPS-tagged images on an interactive Leaflet map. Non-GPS images are tagged cleanly without inventing coordinates.
4. **Run AI Pre-Detection**: Execute the active model to propose candidate bounding boxes.
5. **HITL Human Review**:
   - Approve correct detections ($\to$ `human_approved`).
   - Modify box boundaries or classes ($\to$ `human_corrected`).
   - Delete false alarms.
   - Draw missed objects.
   - *Integrity rule: AI predictions are NEVER silently converted to ground truth.*
6. **Freeze Dataset Version**: Snapshot annotations, split into Train/Val/Test with configurable ratios, and enforce perceptual dHash leakage defense.
7. **Train YOLO Model**: Trigger YOLOv8 training with custom architecture, epochs, batch size, and image resolution.
8. **Evaluate Model**: Compute Precision, Recall, mAP@50, mAP@50-95, and Confusion Matrix on held-out test data.
9. **Benchmark AI Progression**: Recharts visual line chart tracks model progression on a constant held-out test set to prove genuine AI improvement.
10. **Explicit Human Promotion**: Explicitly promote validated model to production; the main Garbage Index application automatically consumes the new model via REST API.

---

## 4. Key Sub-Systems & Implementations

### A. Geotagged Image Processing Pipeline
- **EXIF Extraction**: Extracts Latitude, Longitude, Altitude, GPS Timestamp, Image Timestamp, Camera Heading, Make, Model, and Dimensions.
- **True Precision Principle**: Annotations inherit the source image's GPS reference point. No artificial object-level coordinates are fabricated without photogrammetry/GSD inputs.
- **Non-GPS Support**: Images without EXIF tags are marked `has_gps: false`, preserved in the dataset, and remain fully available for training.

### B. Dataset Quality Control & Leakage Defense
- **Perceptual Hashing (`dHash`)**: Computes 64-bit difference hashes for every frame. Frames with Hamming distance $\le 6$ are flagged as near-duplicate clusters.
- **Split Leakage Defense**: When freezing dataset versions, duplicate clusters are strictly kept within the *same* split (e.g., all in `train` or all in `val`), preventing inflated test metrics.
- **Integrity Sanity Checks**: Detects out-of-bounds bounding boxes, zero-area boxes, microscopic boxes ($<10\text{px}$), missing labels, and class distribution imbalance.
- **Health Score**: Computes an aggregate $0-100$ dataset quality score with critical and advisory issue breakdowns.

### C. Human-in-the-Loop (HITL) Annotation Studio
- **Visual Provenance Colors**:
  - `ai_predicted`: Blue dashed outline + confidence percentage.
  - `human_approved`: Green solid outline + Ground Truth badge.
  - `human_corrected`: Amber solid outline + Modified badge.
- **Interactive Tools**: Click-and-drag box drawing, class palette (1–8 keyboard shortcuts), quick bulk approval (`Approve All`), and single-click deletion.
- **YOLO Exporter**: Automatically outputs normalized coordinates `(class_id, x_center, y_center, width, height)` into standard YOLO `.txt` format.

### D. Model Evaluation & Benchmark Progression
- **Standard Detection Metrics**: Precision, Recall, mAP@50, mAP@50-95, Per-Class Support breakdown.
- **Visual Ground Truth vs Prediction Inspector**:
  - True Positives (TP): Solid blue/green box.
  - False Positives (FP): Red dashed box.
  - False Negatives / Missed Garbage (FN): Highlighted orange box.
- **AI Improvement Chart**: Line chart graphing mAP@50 and Precision across model iterations, demonstrating verifiable gains on the held-out benchmark.

---

## 5. REST API Reference

### Production Garbage Index API (`/api/v1/`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/surveys` | List all drone survey missions |
| `POST` | `/surveys/upload` | Upload multi-photo flight batch |
| `GET` | `/surveys/{id}` | Get survey details, GI scores, and zones |
| `POST` | `/demo-mangalore` | Load Mangalore Smart City pilot survey |

### AI Model Studio API (`/api/v1/studio/`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/studio/images/upload` | Ingest drone images with EXIF extraction |
| `GET` | `/studio/images` | Filter images by category, GPS, annotation status, split |
| `GET` | `/studio/images/{id}` | Get image details, metadata, and annotations |
| `DELETE` | `/studio/images/{id}` | Delete individual image, annotations & files from dataset |
| `POST` | `/studio/images/bulk-delete` | Bulk delete selected images and annotations from dataset |
| `POST` | `/studio/images/{id}/auto-annotate` | Run active model to generate AI proposals |
| `POST` | `/studio/images/{id}/annotations` | Persist human ground-truth annotations |
| `GET` | `/studio/quality` | Run dHash duplicate scan & quality diagnostics |
| `POST` | `/studio/versions` | Create immutable dataset version snapshot |
| `POST` | `/studio/train` | Launch YOLO model training run |
| `GET` | `/studio/models` | List all trained model versions |
| `POST` | `/studio/models/{id}/promote` | Explicitly promote model to production |
| `GET` | `/studio/benchmark` | Get benchmark comparison & progression history |
| `POST` | `/studio/models/predict` | Decoupled inference endpoint for external services |
| `POST` | `/studio/seed-mangalore-dataset` | Seed authentic Mangalore ground-truth dataset |

---

## 6. Directory Layout

```
aeroclean/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── surveys.py              # Main Garbage Index survey endpoints
│   │   │   ├── studio.py               # AI Studio & Training Companion API
│   │   │   └── router.py               # Combined FastAPI v1 router
│   │   ├── core/
│   │   │   ├── config.py               # System paths and constants
│   │   │   └── database.py             # SQLite engine & table auto-migration
│   │   ├── models/
│   │   │   ├── db_models.py            # SQLAlchemy models (Surveys, Images, Annotations, Models)
│   │   │   ├── domain.py               # Pydantic schemas for Mission Map
│   │   │   └── studio_domain.py        # Pydantic schemas for AI Studio
│   │   └── services/
│   │       ├── dataset_service.py      # Ingestion, EXIF, dHash, thumbnails, filtering
│   │       ├── quality_service.py      # Duplicate detection & sanity diagnostics
│   │       ├── annotation_service.py   # AI proposals, HITL verification, YOLO exporter
│   │       ├── training_service.py     # Split generator, training pipeline & evaluator
│   │       ├── model_registry_service.py # Production registry, benchmark progression & inference
│   │       ├── cv_detector.py          # Vision detection engine & fallback scanner
│   │       ├── garbage_index.py        # 0-100 GI scoring algorithm
│   │       ├── geospatial.py           # 20m spatial grid aggregator
│   │       └── exif_extractor.py       # Robust EXIF metadata parser
│   ├── sample_drone_images/            # Authentic Mangalore real-world survey photos
│   └── aeroclean.db                    # Persistent SQLite database
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── studio/
│   │   │   │   ├── StudioHub.tsx        # Studio coordinator & sub-tab container
│   │   │   │   ├── StudioHeader.tsx     # Sub-navigation bar & live status metrics
│   │   │   │   ├── DatasetGallery.tsx   # Image gallery, EXIF inspection & bulk categories
│   │   │   │   ├── DatasetMap.tsx       # Leaflet geotagged image visualization
│   │   │   │   ├── AnnotationCanvas.tsx # HITL bounding box studio & provenance tags
│   │   │   │   ├── QualityDashboard.tsx # Quality health score & duplicate cluster inspector
│   │   │   │   ├── TrainingHub.tsx      # Dataset versioning & YOLO training hub
│   │   │   │   └── ModelRegistry.tsx    # Model comparison, Recharts progression & visual eval
│   │   │   ├── MapView.tsx              # Production Leaflet heatmap & zone navigator
│   │   │   ├── HotspotModal.tsx         # Multi-angle zone inspection gallery
│   │   │   ├── StatsDashboard.tsx       # Municipal analytics dashboard
│   │   │   ├── SurveyHistory.tsx        # Survey mission history list
│   │   │   └── UploadModal.tsx          # Drone survey flight batch uploader
│   │   ├── services/
│   │   │   ├── api.ts                   # Mission Map API client
│   │   │   └── studioApi.ts             # AI Studio API client
│   │   ├── types/
│   │   │   ├── index.ts                 # Mission Map TypeScript interfaces
│   │   │   └── studio.ts                # AI Studio TypeScript interfaces
│   │   └── App.tsx                      # Top-level dual-mode switcher
│   ├── package.json
│   └── vite.config.ts
│
├── start_backend.bat                    # One-click backend launcher (Port 8000)
├── start_frontend.bat                   # One-click frontend launcher (Port 3000)
└── PROJECT_OVERVIEW.md                  # Comprehensive architectural documentation
```

---

## 7. How to Run the Complete Platform

1. **Start Backend**:
   - Run `start_backend.bat` or execute:
     ```powershell
     cd backend
     python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
     ```
   - OpenAPI Documentation is available at `http://127.0.0.1:8000/docs`.

2. **Start Frontend**:
   - Run `start_frontend.bat` or execute:
     ```powershell
     cd frontend
     npm run dev
     ```
   - Open browser at `http://localhost:3000`.

3. **Explore the Dual-Mode Interface**:
   - **Mode 1: Garbage Index Mission Map**: Click **"Mangalore Trial"** to load the trial survey with real-world Mangalore photos, explore zone heatmaps, hover over hotspot pins for live thumbnail previews, and fly into multi-angle zone galleries.
   - **Mode 2: AI Model Studio & Training Lab**: Click **"Seed Benchmark Data"** in the header to seed the baseline dataset and models, inspect EXIF tags, run HITL annotations, audit dataset quality, train new YOLO versions, inspect benchmark progression charts, and promote models to production.
