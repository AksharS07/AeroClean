from abc import ABC, abstractmethod
from typing import List, Optional
from app.models.domain import SurveySummary, SurveyDetail, ImageDetails, HotspotItem

class IDatabaseRepository(ABC):
    @abstractmethod
    def create_survey(self, title: str, total_images: int) -> SurveySummary:
        pass

    @abstractmethod
    def get_survey(self, survey_id: str) -> Optional[SurveyDetail]:
        pass

    @abstractmethod
    def list_surveys(self) -> List[SurveySummary]:
        pass

    @abstractmethod
    def update_survey_status(self, survey_id: str, status: str, total_garbage: int, avg_index: float, area_sqm: float, bounds_json: str):
        pass

    @abstractmethod
    def add_image_record(self, image_data: ImageDetails) -> ImageDetails:
        pass

    @abstractmethod
    def add_hotspot_records(self, hotspots: List[HotspotItem]):
        pass

    @abstractmethod
    def delete_survey(self, survey_id: str) -> bool:
        pass
