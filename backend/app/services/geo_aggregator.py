import json
import math
from typing import List, Dict, Tuple, Any, Optional
from app.models.domain import ImageDetails, HotspotItem, GeoJSONFeatureCollection, GeoJSONFeature, GeoJSONGeometry, GeoJSONProperty

class GeospatialAggregator:
    GRID_CELL_SIZE_METERS = 20.0  # 20x20 meter spatial grid cell size for zone clustering

    @classmethod
    def _meters_to_lat_lng_degrees(cls, meters: float, latitude: float) -> Tuple[float, float]:
        """Converts distance in meters to approximate delta in degrees (Latitude, Longitude)."""
        lat_degree = meters / 111000.0
        lng_degree = meters / (111000.0 * math.cos(math.radians(latitude))) if math.cos(math.radians(latitude)) != 0 else meters / 111000.0
        return lat_degree, lng_degree

    @classmethod
    def _get_zone_name(cls, lat: float, lng: float, index: int) -> str:
        """Assigns recognizable Mangalore urban sector name based on GPS proximity."""
        # Mangalore landmarks lookup
        if abs(lat - 12.8688) < 0.002 and abs(lng - 74.8423) < 0.002:
            return "Mangaluru Central Market Zone"
        elif abs(lat - 12.8715) < 0.002 and abs(lng - 74.8441) < 0.002:
            return "Hampankatta Commercial Corridor"
        elif abs(lat - 12.8872) < 0.002 and abs(lng - 74.8580) < 0.002:
            return "Kadri Temple Road Sector"
        elif abs(lat - 12.8631) < 0.002 and abs(lng - 74.8390) < 0.002:
            return "Bunder Old Port Wholesale Wharf"
        elif abs(lat - 12.8805) < 0.002 and abs(lng - 74.8420) < 0.002:
            return "Lalbagh Municipal Avenue"
        elif abs(lat - 12.8660) < 0.002 and abs(lng - 74.8620) < 0.002:
            return "Kankanady Bypass Market Junction"
        return f"Mangaluru Sector {index + 1} Flight Zone"

    @classmethod
    def process_survey_geospatial_data(cls, images: List[ImageDetails], survey_id: str) -> Tuple[GeoJSONFeatureCollection, List[HotspotItem], Dict[str, float], float]:
        """
        Performs spatial grid binning to handle 60-80% overlapping drone photos,
        groups all photos in each zone, generates GeoJSON for heatmaps, and creates rich Hotspot items.
        """
        if not images:
            return (
                GeoJSONFeatureCollection(features=[]),
                [],
                {"min_lat": 0.0, "max_lat": 0.0, "min_lng": 0.0, "max_lng": 0.0},
                0.0
            )

        valid_images = [img for img in images if img.gps_latitude is not None and img.gps_longitude is not None]
        if not valid_images:
            return (
                GeoJSONFeatureCollection(features=[]),
                [],
                {"min_lat": 0.0, "max_lat": 0.0, "min_lng": 0.0, "max_lng": 0.0},
                0.0
            )

        # Determine survey bounding box
        lats = [img.gps_latitude for img in valid_images]
        lngs = [img.gps_longitude for img in valid_images]
        min_lat, max_lat = min(lats), max(lats)
        min_lng, max_lng = min(lngs), max(lngs)

        bounds = {
            "min_lat": min_lat,
            "max_lat": max_lat,
            "min_lng": min_lng,
            "max_lng": max_lng
        }

        avg_lat = (min_lat + max_lat) / 2.0
        delta_lat_m, delta_lng_m = cls._meters_to_lat_lng_degrees(cls.GRID_CELL_SIZE_METERS, avg_lat)

        # Spatial Grid Binning
        grid_cells: Dict[Tuple[int, int], List[ImageDetails]] = {}
        for img in valid_images:
            cell_x = int((img.gps_longitude - min_lng) / delta_lng_m) if delta_lng_m > 0 else 0
            cell_y = int((img.gps_latitude - min_lat) / delta_lat_m) if delta_lat_m > 0 else 0
            grid_key = (cell_x, cell_y)
            
            if grid_key not in grid_cells:
                grid_cells[grid_key] = []
            grid_cells[grid_key].append(img)

        geojson_features: List[GeoJSONFeature] = []
        hotspots: List[HotspotItem] = []

        for idx, ((cx, cy), cell_imgs) in enumerate(grid_cells.items()):
            # Peak Garbage Index in this zone cell
            max_gi_img = max(cell_imgs, key=lambda x: x.garbage_index)
            cell_avg_lat = sum(x.gps_latitude for x in cell_imgs) / len(cell_imgs)
            cell_avg_lng = sum(x.gps_longitude for x in cell_imgs) / len(cell_imgs)
            cell_total_garbage = sum(x.garbage_count for x in cell_imgs)
            image_ids_in_zone = [x.id for x in cell_imgs]

            zone_title = cls._get_zone_name(cell_avg_lat, cell_avg_lng, idx)
            intensity = round(max_gi_img.garbage_index / 100.0, 3)

            feature = GeoJSONFeature(
                geometry=GeoJSONGeometry(coordinates=[cell_avg_lng, cell_avg_lat]),
                properties=GeoJSONProperty(
                    id=max_gi_img.id,
                    garbage_index=max_gi_img.garbage_index,
                    garbage_count=cell_total_garbage,
                    intensity=intensity,
                    title=f"{zone_title} ({len(cell_imgs)} Frames)",
                    image_count=len(cell_imgs),
                    zone_name=zone_title
                )
            )
            geojson_features.append(feature)

            # Create hotspot marker if cell GI exceeds clean threshold (> 25)
            if max_gi_img.garbage_index > 25.0:
                severity = "Critical" if max_gi_img.garbage_index > 75.0 else \
                           "High" if max_gi_img.garbage_index > 50.0 else "Moderate"
                
                # Aggregate category breakdown across all pictures in this zone
                categories = []
                for img in cell_imgs:
                    categories.extend([d.label for d in img.detections])
                primary_cat = max(set(categories), key=categories.count) if categories else "Litter"

                hotspot = HotspotItem(
                    id=f"hotspot_{max_gi_img.id}",
                    survey_id=survey_id,
                    latitude=cell_avg_lat,
                    longitude=cell_avg_lng,
                    garbage_index=max_gi_img.garbage_index,
                    garbage_count=cell_total_garbage,
                    primary_category=primary_cat,
                    severity_tier=severity,
                    associated_image_id=max_gi_img.id,
                    zone_name=zone_title,
                    image_ids=image_ids_in_zone,
                    images=cell_imgs
                )
                hotspots.append(hotspot)

        # Estimate total area surveyed
        lat_dist_m = (max_lat - min_lat) * 111000.0
        lng_dist_m = (max_lng - min_lng) * 111000.0 * math.cos(math.radians(avg_lat))
        area_sqm = round(max(100.0, lat_dist_m * lng_dist_m), 1)

        return (
            GeoJSONFeatureCollection(features=geojson_features),
            hotspots,
            bounds,
            area_sqm
        )
