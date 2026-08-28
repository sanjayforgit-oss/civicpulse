import os
import cv2
import numpy as np
from PIL import Image, ExifTags
from typing import Tuple, Dict, Any, Optional

def _convert_to_degrees(value) -> float:
    """Helper function to convert GPS coordinates in EXIF to decimal degrees."""
    try:
        d0 = value[0][0] / value[0][1] if isinstance(value[0], tuple) else float(value[0])
        d1 = value[1][0] / value[1][1] if isinstance(value[1], tuple) else float(value[1])
        d2 = value[2][0] / value[2][1] if isinstance(value[2], tuple) else float(value[2])
        return d0 + (d1 / 60.0) + (d2 / 3600.0)
    except Exception:
        return 0.0

def extract_exif_metadata(image_path: str) -> Dict[str, Any]:
    """
    Extracts camera, timestamp, and GPS metadata from image EXIF.
    """
    metadata: Dict[str, Any] = {
        "has_exif": False,
        "camera_make": None,
        "camera_model": None,
        "capture_timestamp": None,
        "software": None,
        "latitude": None,
        "longitude": None,
        "raw_exif_tags": {}
    }
    
    try:
        with Image.open(image_path) as img:
            exif_data = img._getexif()
            if not exif_data:
                return metadata
            
            metadata["has_exif"] = True
            for tag_id, value in exif_data.items():
                tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                
                if tag_name == "Make":
                    metadata["camera_make"] = str(value).strip()
                elif tag_name == "Model":
                    metadata["camera_model"] = str(value).strip()
                elif tag_name in ["DateTimeOriginal", "DateTime"]:
                    metadata["capture_timestamp"] = str(value).strip()
                elif tag_name == "Software":
                    metadata["software"] = str(value).strip()
                elif tag_name == "GPSInfo":
                    gps_info = {}
                    for t in value:
                        sub_tag = ExifTags.GPSTAGS.get(t, str(t))
                        gps_info[sub_tag] = value[t]
                    
                    if "GPSLatitude" in gps_info and "GPSLatitudeRef" in gps_info:
                        lat = _convert_to_degrees(gps_info["GPSLatitude"])
                        if gps_info["GPSLatitudeRef"] != "N":
                            lat = -lat
                        metadata["latitude"] = round(lat, 6)
                        
                    if "GPSLongitude" in gps_info and "GPSLongitudeRef" in gps_info:
                        lon = _convert_to_degrees(gps_info["GPSLongitude"])
                        if gps_info["GPSLongitudeRef"] != "E":
                            lon = -lon
                        metadata["longitude"] = round(lon, 6)
                        
                # Store non-binary tags in raw dictionary
                if isinstance(value, (str, int, float)):
                    metadata["raw_exif_tags"][tag_name] = value
                    
    except Exception as e:
        metadata["error"] = str(e)
        
    return metadata

def apply_pii_redaction(image_path: str, output_path: str) -> Dict[str, Any]:
    """
    Detects human faces and vehicle license plates, applies Gaussian blurring,
    and saves an EXIF-stripped sanitized image for public views.
    """
    stats = {
        "faces_blurred": 0,
        "plates_blurred": 0,
        "sanitized_file_path": output_path
    }
    
    # Read image using OpenCV
    cv_img = cv2.imread(image_path)
    if cv_img is None:
        raise ValueError(f"Could not read image file at {image_path}")
        
    height, width = cv_img.shape[:2]
    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    
    # Load OpenCV Haar Cascades safely
    face_cascade = None
    plate_cascade = None
    
    if hasattr(cv2, 'data') and hasattr(cv2.data, 'haarcascades') and hasattr(cv2, 'CascadeClassifier'):
        cascade_dir = cv2.data.haarcascades
        face_cascade_path = os.path.join(cascade_dir, 'haarcascade_frontalface_default.xml')
        if os.path.exists(face_cascade_path):
            face_cascade = cv2.CascadeClassifier(face_cascade_path)
            
        plate_cascade_path = os.path.join(cascade_dir, 'haarcascade_russian_plate_number.xml')
        if os.path.exists(plate_cascade_path):
            plate_cascade = cv2.CascadeClassifier(plate_cascade_path)
    
    # 1. Detect & Blur Faces
    if face_cascade is not None and not face_cascade.empty():
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=4,
            minSize=(30, 30)
        )
        for (x, y, w, h) in faces:
            pad_x = int(w * 0.1)
            pad_y = int(h * 0.1)
            x1 = max(0, x - pad_x)
            y1 = max(0, y - pad_y)
            x2 = min(width, x + w + pad_x)
            y2 = min(height, y + h + pad_y)
            
            roi = cv_img[y1:y2, x1:x2]
            if roi.size > 0:
                ksize = max(25, int(w * 0.3) | 1)
                blurred_roi = cv2.GaussianBlur(roi, (ksize, ksize), 30)
                cv_img[y1:y2, x1:x2] = blurred_roi
                stats["faces_blurred"] += 1
                
    # 2. Detect & Blur License Plates
    if plate_cascade is not None and not plate_cascade.empty():
        plates = plate_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=3,
            minSize=(30, 15)
        )
        for (x, y, w, h) in plates:
            x1 = max(0, x)
            y1 = max(0, y)
            x2 = min(width, x + w)
            y2 = min(height, y + h)
            
            roi = cv_img[y1:y2, x1:x2]
            if roi.size > 0:
                ksize = max(21, int(w * 0.25) | 1)
                blurred_roi = cv2.GaussianBlur(roi, (ksize, ksize), 25)
                cv_img[y1:y2, x1:x2] = blurred_roi
                stats["plates_blurred"] += 1

    # 3. Save Sanitized image (EXIF is automatically stripped on OpenCV write)
    cv2.imwrite(output_path, cv_img, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    
    return stats
