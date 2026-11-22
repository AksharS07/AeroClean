import json
from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.base import IDatabaseRepository
from app.models.db_models import SurveyDB, ImageDB, HotspotDB
from app.models.domain import SurveySummary, SurveyDetail, ImageDetails, HotspotItem, DetectionItem

class SQLiteRepository(IDatabaseRepository):
    def __init__(self, db: Session):
        self.db = db

    def create_survey(self, title: str, total_images: int) -> SurveySummary:
        survey_db = SurveyDB(title=title, total_images=total_images, status="processing")
        self.db.add(survey_db)
        self.db.commit()
        self.db.refresh(survey_db)
        return SurveySummary(
            id=survey_db.id,
            title=survey_db.title,
            created_at=survey_db.created_at,
            status=survey_db.status,
            total_images=survey_db.total_images,
            total_garbage_count=survey_db.total_garbage_count,
            average_garbage_index=survey_db.average_garbage_index,
            area_surveyed_sqm=survey_db.area_surveyed_sqm,
            bounds=json.loads(survey_db.bounds_json) if survey_db.bounds_json else None
        )

    def get_survey(self, survey_id: str) -> Optional[SurveyDetail]:
        survey_db = self.db.query(SurveyDB).filter(SurveyDB.id == survey_id).first()
        if not survey_db:
            return None

        images_list = []
        images_by_id = {}
        for img in survey_db.images:
            detections = []
            if img.detections_json:
                raw_dets = json.loads(img.detections_json)
                detections = [DetectionItem(**d) for d in raw_dets]

            img_detail = ImageDetails(
                id=img.id,
                survey_id=img.survey_id,
                original_filename=img.original_filename,
                raw_path=img.raw_path,
                annotated_path=img.annotated_path,
                upload_timestamp=img.upload_timestamp,
                gps_latitude=img.gps_latitude,
                gps_longitude=img.gps_longitude,
                gps_altitude=img.gps_altitude,
                garbage_index=img.garbage_index,
                garbage_count=img.garbage_count,
                confidence_avg=img.confidence_avg,
                detections=detections
            )
            images_list.append(img_detail)
            images_by_id[img.id] = img_detail

        hotspots_list = []
        for h in survey_db.hotspots:
            img_ids = []
            if h.image_ids_json:
                try:
                    img_ids = json.loads(h.image_ids_json)
                except Exception:
                    img_ids = []
            
            # Match image details belonging to this zone
            zone_imgs = [images_by_id[iid] for iid in img_ids if iid in images_by_id]
            if not zone_imgs and images_list:
                # Fallback: if single image associated or proximity
                matched = [img for img in images_list if img.gps_latitude and abs(img.gps_latitude - h.latitude) < 0.001 and abs(img.gps_longitude - h.longitude) < 0.001]
                zone_imgs = matched if matched else images_list[:1]
                img_ids = [z.id for z in zone_imgs]

            hotspots_list.append(HotspotItem(
                id=h.id,
                survey_id=h.survey_id,
                latitude=h.latitude,
                longitude=h.longitude,
                garbage_index=h.garbage_index,
                garbage_count=h.garbage_count,
                primary_category=h.primary_category,
                severity_tier=h.severity_tier,
                associated_image_id=zone_imgs[0].id if zone_imgs else None,
                zone_name=h.zone_name or "Mangaluru Urban Cleanliness Zone",
                image_ids=img_ids,
                images=zone_imgs
            ))

        bounds = json.loads(survey_db.bounds_json) if survey_db.bounds_json else None

        return SurveyDetail(
            id=survey_db.id,
            title=survey_db.title,
            created_at=survey_db.created_at,
            status=survey_db.status,
            total_images=survey_db.total_images,
            total_garbage_count=survey_db.total_garbage_count,
            average_garbage_index=survey_db.average_garbage_index,
            area_surveyed_sqm=survey_db.area_surveyed_sqm,
            bounds=bounds,
            images=images_list,
            hotspots=hotspots_list
        )

    def list_surveys(self) -> List[SurveySummary]:
        surveys_db = self.db.query(SurveyDB).order_by(SurveyDB.created_at.desc()).all()
        return [
            SurveySummary(
                id=s.id,
                title=s.title,
                created_at=s.created_at,
                status=s.status,
                total_images=s.total_images,
                total_garbage_count=s.total_garbage_count,
                average_garbage_index=s.average_garbage_index,
                area_surveyed_sqm=s.area_surveyed_sqm,
                bounds=json.loads(s.bounds_json) if s.bounds_json else None
            )
            for s in surveys_db
        ]

    def update_survey_status(self, survey_id: str, status: str, total_garbage: int, avg_index: float, area_sqm: float, bounds_json: str):
        survey_db = self.db.query(SurveyDB).filter(SurveyDB.id == survey_id).first()
        if survey_db:
            survey_db.status = status
            survey_db.total_garbage_count = total_garbage
            survey_db.average_garbage_index = avg_index
            survey_db.area_surveyed_sqm = area_sqm
            survey_db.bounds_json = bounds_json
            self.db.commit()

    def add_image_record(self, image_data: ImageDetails) -> ImageDetails:
        detections_raw = [d.dict() for d in image_data.detections]
        img_db = ImageDB(
            id=image_data.id,
            survey_id=image_data.survey_id,
            original_filename=image_data.original_filename,
            raw_path=image_data.raw_path,
            annotated_path=image_data.annotated_path,
            upload_timestamp=image_data.upload_timestamp,
            gps_latitude=image_data.gps_latitude,
            gps_longitude=image_data.gps_longitude,
            gps_altitude=image_data.gps_altitude,
            garbage_index=image_data.garbage_index,
            garbage_count=image_data.garbage_count,
            confidence_avg=image_data.confidence_avg,
            detections_json=json.dumps(detections_raw)
        )
        self.db.add(img_db)
        self.db.commit()
        return image_data

    def add_hotspot_records(self, hotspots: List[HotspotItem]):
        for h in hotspots:
            h_db = HotspotDB(
                id=h.id,
                survey_id=h.survey_id,
                latitude=h.latitude,
                longitude=h.longitude,
                garbage_index=h.garbage_index,
                garbage_count=h.garbage_count,
                primary_category=h.primary_category,
                severity_tier=h.severity_tier,
                zone_name=h.zone_name,
                image_ids_json=json.dumps(h.image_ids) if h.image_ids else None
            )
            self.db.add(h_db)
        self.db.commit()

    def delete_survey(self, survey_id: str) -> bool:
        survey_db = self.db.query(SurveyDB).filter(SurveyDB.id == survey_id).first()
        if survey_db:
            self.db.delete(survey_db)
            self.db.commit()
            return True
        return False
