import os
import shutil
import json
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import RAW_UPLOAD_DIR
from app.repositories.sqlite_repo import SQLiteRepository
from app.models.domain import (
    SurveySummary, SurveyDetail, SurveyCreateResponse, 
    GeoJSONFeatureCollection, HotspotItem, ImageDetails
)
from app.services.exif_extractor import EXIFExtractor
from app.services.cv_detector import YOLODetector
from app.services.index_calculator import GarbageIndexCalculator
from app.services.geo_aggregator import GeospatialAggregator

router = APIRouter(prefix="/surveys", tags=["Surveys"])

# Shared singleton instance of detection model
_detector_instance = YOLODetector()

def process_survey_background_job(survey_id: str, file_paths: List[str], filenames: List[str], db_session_factory):
    """
    Background worker function executing the complete AI vision and geospatial pipeline.
    """
    db: Session = db_session_factory()
    try:
        repo = SQLiteRepository(db)
        image_records: List[ImageDetails] = []
        total_garbage_in_survey = 0
        total_index_sum = 0.0

        for idx, (raw_path, filename) in enumerate(zip(file_paths, filenames)):
            # 1. EXIF Metadata extraction
            exif_meta = EXIFExtractor.extract_metadata(raw_path)
            lat, lng, alt = exif_meta["latitude"], exif_meta["longitude"], exif_meta["altitude"]

            # Fallback coordinates if EXIF GPS absent
            if lat is None or lng is None:
                lat, lng, alt = EXIFExtractor.generate_fallback_flight_path(idx, len(file_paths))

            # 2. AI Object Detection & Visual Annotation
            detections, annotated_rel_path, width, height = _detector_instance.detect_garbage(raw_path)

            # 3. Garbage Index calculation
            garbage_index, count, confidence_avg, severity = GarbageIndexCalculator.calculate_image_index(
                detections=detections,
                image_width=width,
                image_height=height
            )

            total_garbage_in_survey += count
            total_index_sum += garbage_index

            raw_rel_path = f"/uploads/raw/{os.path.basename(raw_path)}"

            img_detail = ImageDetails(
                id=f"img_{idx}_{survey_id[:8]}",
                survey_id=survey_id,
                original_filename=filename,
                raw_path=raw_rel_path,
                annotated_path=annotated_rel_path,
                upload_timestamp=datetime.utcnow(),
                gps_latitude=lat,
                gps_longitude=lng,
                gps_altitude=alt,
                garbage_index=garbage_index,
                garbage_count=count,
                confidence_avg=confidence_avg,
                detections=detections
            )

            repo.add_image_record(img_detail)
            image_records.append(img_detail)

        # 4. Geospatial Grid Binning & Hotspot clustering
        geojson, hotspots, bounds, area_sqm = GeospatialAggregator.process_survey_geospatial_data(
            images=image_records,
            survey_id=survey_id
        )

        repo.add_hotspot_records(hotspots)

        avg_survey_gi = round(total_index_sum / max(1, len(image_records)), 1)
        bounds_json_str = json.dumps(bounds)

        # Update survey status to completed
        repo.update_survey_status(
            survey_id=survey_id,
            status="completed",
            total_garbage=total_garbage_in_survey,
            avg_index=avg_survey_gi,
            area_sqm=area_sqm,
            bounds_json=bounds_json_str
        )
    except Exception as e:
        print(f"Error processing survey {survey_id}: {e}")
        repo.update_survey_status(
            survey_id=survey_id,
            status="failed",
            total_garbage=0,
            avg_index=0.0,
            area_sqm=0.0,
            bounds_json="{}"
        )
    finally:
        db.close()


@router.post("/upload", response_model=SurveyCreateResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_survey(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    if not files:
        raise HTTPException(status_code=400, detail="No drone survey images provided.")

    repo = SQLiteRepository(db)
    survey_summary = repo.create_survey(title=title, total_images=len(files))

    file_paths = []
    filenames = []

    for file in files:
        safe_filename = f"{survey_summary.id[:8]}_{file.filename}"
        dest_path = str(RAW_UPLOAD_DIR / safe_filename)
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_paths.append(dest_path)
        filenames.append(file.filename)

    # Import SessionLocal inside request to pass factory to background task
    from app.core.database import SessionLocal
    if os.getenv("VERCEL"):
        process_survey_background_job(
            survey_id=survey_summary.id,
            file_paths=file_paths,
            filenames=filenames,
            db_session_factory=SessionLocal
        )
    else:
        background_tasks.add_task(
            process_survey_background_job,
            survey_id=survey_summary.id,
            file_paths=file_paths,
            filenames=filenames,
            db_session_factory=SessionLocal
        )

    return SurveyCreateResponse(
        survey_id=survey_summary.id,
        title=survey_summary.title,
        status="processing",
        total_images=len(files),
        message="Drone survey upload accepted. Processing image batch in background."
    )


@router.post("/demo-mangalore", response_model=SurveyCreateResponse, status_code=status.HTTP_202_ACCEPTED)
async def load_mangalore_demo(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Instantly loads and processes the Mangalore, Karnataka street cleanliness trial survey.
    """
    sample_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", "sample_drone_images")
    if not os.path.exists(sample_dir):
        sample_dir = str(RAW_UPLOAD_DIR)

    sample_files = [
        "mangaluru_forest_embankment_angle1.jpg",
        "mangaluru_forest_embankment_angle2.jpg",
        "mangaluru_red_soil_dump_angle1.jpg",
        "mangaluru_red_soil_dump_angle2.jpg",
        "mangaluru_roadside_slope_angle1.jpg",
        "mangaluru_central_market_frame_01.jpg",
        "mangaluru_central_market_frame_02.jpg",
        "hampankatta_commercial_angle_a.jpg",
        "hampankatta_commercial_angle_b.jpg",
        "bunder_port_wharf_frame_01.jpg",
        "bunder_port_wharf_frame_02.jpg",
        "kadri_temple_road_frame.jpg",
        "lalbagh_mangaluru_circle.jpg"
    ]

    valid_paths = []
    filenames = []
    repo = SQLiteRepository(db)
    survey_summary = repo.create_survey(
        title="Mangaluru Smart City Street Cleanliness Survey (Karnataka)",
        total_images=len(sample_files)
    )

    for sf in sample_files:
        src = os.path.join(sample_dir, sf)
        if os.path.exists(src):
            safe_filename = f"{survey_summary.id[:8]}_{sf}"
            dest_path = str(RAW_UPLOAD_DIR / safe_filename)
            shutil.copyfile(src, dest_path)
            valid_paths.append(dest_path)
            filenames.append(sf)

    from app.core.database import SessionLocal
    if os.getenv("VERCEL"):
        process_survey_background_job(
            survey_id=survey_summary.id,
            file_paths=valid_paths,
            filenames=filenames,
            db_session_factory=SessionLocal
        )
    else:
        background_tasks.add_task(
            process_survey_background_job,
            survey_id=survey_summary.id,
            file_paths=valid_paths,
            filenames=filenames,
            db_session_factory=SessionLocal
        )

    return SurveyCreateResponse(
        survey_id=survey_summary.id,
        title=survey_summary.title,
        status="processing",
        total_images=len(valid_paths),
        message="Mangalore trial survey initiated. Processing 6 high-density street frames in background."
    )


@router.get("", response_model=List[SurveySummary])
def list_surveys(db: Session = Depends(get_db)):
    repo = SQLiteRepository(db)
    return repo.list_surveys()


@router.get("/{survey_id}", response_model=SurveyDetail)
def get_survey(survey_id: str, db: Session = Depends(get_db)):
    repo = SQLiteRepository(db)
    survey = repo.get_survey(survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found.")
    return survey


@router.get("/{survey_id}/geojson", response_model=GeoJSONFeatureCollection)
def get_survey_geojson(survey_id: str, db: Session = Depends(get_db)):
    repo = SQLiteRepository(db)
    survey = repo.get_survey(survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found.")
    
    geojson, _, _, _ = GeospatialAggregator.process_survey_geospatial_data(
        images=survey.images,
        survey_id=survey_id
    )
    return geojson


@router.get("/{survey_id}/hotspots", response_model=List[HotspotItem])
def get_survey_hotspots(survey_id: str, db: Session = Depends(get_db)):
    repo = SQLiteRepository(db)
    survey = repo.get_survey(survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found.")
    return survey.hotspots


@router.get("/{survey_id}/images/{image_id}", response_model=ImageDetails)
def get_image_details(survey_id: str, image_id: str, db: Session = Depends(get_db)):
    repo = SQLiteRepository(db)
    survey = repo.get_survey(survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found.")
    
    for img in survey.images:
        if img.id == image_id:
            return img
    raise HTTPException(status_code=404, detail="Image not found in survey.")


@router.delete("/{survey_id}")
def delete_survey(survey_id: str, db: Session = Depends(get_db)):
    repo = SQLiteRepository(db)
    success = repo.delete_survey(survey_id)
    if not success:
        raise HTTPException(status_code=404, detail="Survey not found.")
    return {"success": True, "message": "Survey deleted successfully."}
