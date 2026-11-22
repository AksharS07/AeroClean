import os
import exifread
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from typing import Tuple, Optional, Dict, Any
from datetime import datetime
from app.core.config import DEFAULT_MANGALORE_LAT, DEFAULT_MANGALORE_LNG

class EXIFExtractor:
    @staticmethod
    def _convert_to_degrees(value) -> float:
        """Helper to convert EXIF GPS coordinate tuple (degrees, minutes, seconds) to decimal degrees."""
        if not value:
            return 0.0
        
        try:
            d = float(value[0].num) / float(value[0].den)
            m = float(value[1].num) / float(value[1].den)
            s = float(value[2].num) / float(value[2].den)
            return d + (m / 60.0) + (s / 3600.0)
        except Exception:
            try:
                # Handle raw numbers, fractions, or tuples directly
                return float(value[0]) + (float(value[1]) / 60.0) + (float(value[2]) / 3600.0)
            except Exception:
                return 0.0

    @classmethod
    def extract_metadata(cls, image_path: str) -> Dict[str, Any]:
        """
        Extracts GPS Latitude, Longitude, Altitude, and Timestamp from image EXIF.
        """
        lat, lng, alt = None, None, None
        timestamp = datetime.utcnow()

        try:
            with open(image_path, 'rb') as f:
                tags = exifread.process_file(f, details=False)
                
                if 'GPS GPSLatitude' in tags and 'GPS GPSLatitudeRef' in tags:
                    lat_value = tags['GPS GPSLatitude'].values
                    lat_ref = str(tags['GPS GPSLatitudeRef'].values)
                    lat = cls._convert_to_degrees(lat_value)
                    if lat_ref.upper() == 'S':
                        lat = -lat

                if 'GPS GPSLongitude' in tags and 'GPS GPSLongitudeRef' in tags:
                    lng_value = tags['GPS GPSLongitude'].values
                    lng_ref = str(tags['GPS GPSLongitudeRef'].values)
                    lng = cls._convert_to_degrees(lng_value)
                    if lng_ref.upper() == 'W':
                        lng = -lng

                if 'GPS GPSAltitude' in tags:
                    try:
                        alt_val = tags['GPS GPSAltitude'].values[0]
                        alt = float(alt_val.num) / float(alt_val.den)
                    except Exception:
                        alt = 25.0  # standard 25m drone altitude fallback
        except Exception as e:
            print(f"EXIF extraction note for {image_path}: {e}")

        # Try Pillow fallback if exifread misses tags
        if lat is None or lng is None:
            try:
                img = Image.open(image_path)
                exif_data = img._getexif()
                if exif_data:
                    gps_info = {}
                    for tag_id, value in exif_data.items():
                        tag_name = TAGS.get(tag_id, tag_id)
                        if tag_name == 'GPSInfo':
                            for key in value:
                                sub_tag = GPSTAGS.get(key, key)
                                gps_info[sub_tag] = value[key]
                    
                    if 'GPSLatitude' in gps_info and 'GPSLatitudeRef' in gps_info:
                        lat = cls._convert_to_degrees(gps_info['GPSLatitude'])
                        if gps_info['GPSLatitudeRef'] == 'S':
                            lat = -lat
                            
                    if 'GPSLongitude' in gps_info and 'GPSLongitudeRef' in gps_info:
                        lng = cls._convert_to_degrees(gps_info['GPSLongitude'])
                        if gps_info['GPSLongitudeRef'] == 'W':
                            lng = -lng
            except Exception:
                pass

        return {
            "latitude": round(lat, 6) if lat is not None else None,
            "longitude": round(lng, 6) if lng is not None else None,
            "altitude": alt or 25.0,
            "timestamp": timestamp
        }

    @staticmethod
    def generate_fallback_flight_path(
        index: int, 
        total: int, 
        base_lat: float = DEFAULT_MANGALORE_LAT, 
        base_lng: float = DEFAULT_MANGALORE_LNG
    ) -> Tuple[float, float, float]:
        """
        Generates simulated drone flight grid coordinates over the Mangalore urban sector
        if EXIF metadata is missing. Creates a realistic lawnmower flight path across streets.
        """
        cols = max(1, int(total ** 0.5))
        row = index // cols
        col = index % cols
        
        # ~20 meters spacing between drone capture points across Mangalore road grid
        lat_offset = (row * 0.00018) + (col * 0.00003)
        lng_offset = (col * 0.00020)
        
        return (round(base_lat + lat_offset, 6), round(base_lng + lng_offset, 6), 25.0)
