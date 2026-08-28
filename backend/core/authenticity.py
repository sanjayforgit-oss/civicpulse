import os
import cv2
import json
import numpy as np
from PIL import Image, ExifTags
from typing import Dict, Any, List, Optional
from backend.core.config import settings

class ImageAuthenticityDetector:
    """
    3-Tier Image Authenticity & Fake / AI-Generation Detection Engine.
    """
    
    AI_SIGNATURE_KEYWORDS = [
        "midjourney", "stable diffusion", "dall-e", "dalle", "comfyui",
        "novelai", "invokeai", "firefly", "bing image creator", "flux.1",
        "civitai", "automatic1111", "sdxl", "synthid", "ai generated"
    ]

    @classmethod
    def check_metadata_provenance(cls, image_path: str) -> Dict[str, Any]:
        """
        Tier 1: Checks image metadata and EXIF for AI generation signatures,
        prompts, software tags, or missing camera signatures.
        """
        result = {
            "tier1_flagged": False,
            "provenance_score": 0.0,
            "detected_signatures": [],
            "camera_signature_present": False,
            "details": []
        }
        
        try:
            with Image.open(image_path) as img:
                # 1. Check PNG text metadata
                if hasattr(img, "text") and img.text:
                    for key, val in img.text.items():
                        text_content = f"{key}: {val}".lower()
                        for kw in cls.AI_SIGNATURE_KEYWORDS:
                            if kw in text_content:
                                result["tier1_flagged"] = True
                                result["detected_signatures"].append(f"PNG Metadata: {kw}")
                                result["provenance_score"] = 0.95
                                result["details"].append(f"Found AI generator keyword '{kw}' in image chunks.")

                # 2. Check EXIF tags
                exif_data = img._getexif()
                if exif_data:
                    for tag_id, val in exif_data.items():
                        tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                        val_str = str(val).lower()
                        
                        if tag_name in ["Make", "Model"] and len(val_str.strip()) > 1:
                            result["camera_signature_present"] = True
                            
                        if tag_name in ["Software", "UserComment", "ImageDescription", "Artist"]:
                            for kw in cls.AI_SIGNATURE_KEYWORDS:
                                if kw in val_str:
                                    result["tier1_flagged"] = True
                                    result["detected_signatures"].append(f"EXIF {tag_name}: {kw}")
                                    result["provenance_score"] = 0.98
                                    result["details"].append(f"Found AI generator keyword '{kw}' in EXIF {tag_name}.")
                else:
                    # Lack of EXIF alone is not proof of AI, but adds a small weight if other anomalies exist
                    result["details"].append("No camera EXIF metadata found (typical for web/exported files).")
                    
        except Exception as e:
            result["details"].append(f"Metadata read warning: {str(e)}")
            
        return result

    @classmethod
    def check_spectral_fft_anomalies(cls, image_path: str) -> Dict[str, Any]:
        """
        Tier 2: Computes 2D Fast Fourier Transform (FFT) to detect high-frequency
        periodic grid and checkerboard artifacts produced by generative diffusion & GAN upscalers.
        """
        result = {
            "tier2_flagged": False,
            "spectral_score": 0.0,
            "high_freq_peak_ratio": 0.0,
            "details": []
        }
        
        try:
            cv_img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
            if cv_img is None:
                return result
                
            # Resize to standard power-of-2 dimension for FFT
            resized = cv2.resize(cv_img, (512, 512))
            
            # Compute 2D Fast Fourier Transform
            f = np.fft.fft2(resized)
            fshift = np.fft.fftshift(f)
            magnitude_spectrum = 20 * np.log(np.abs(fshift) + 1e-6)
            
            # Calculate center & high-frequency quadrant energy
            rows, cols = resized.shape
            crow, ccol = rows // 2, cols // 2
            
            # Mask out low-frequency center (radius 30)
            y, x = np.ogrid[:rows, :cols]
            center_mask = (x - ccol)**2 + (y - crow)**2 <= 30**2
            
            high_freq_spectrum = magnitude_spectrum.copy()
            high_freq_spectrum[center_mask] = 0
            
            # Measure standard deviation and max peak spikes in high frequency
            hf_std = float(np.std(high_freq_spectrum))
            hf_max = float(np.max(high_freq_spectrum))
            hf_mean = float(np.mean(high_freq_spectrum))
            
            # Grid artifact metric: ratio of high-freq max peak to mean
            peak_ratio = (hf_max - hf_mean) / (hf_std + 1e-6)
            result["high_freq_peak_ratio"] = round(peak_ratio, 3)
            
            # Normalize to spectral score
            normalized_score = min(1.0, max(0.0, (peak_ratio - 3.5) / 4.0))
            result["spectral_score"] = round(normalized_score, 3)
            
            if normalized_score >= settings.FFT_ANOMALY_THRESHOLD:
                result["tier2_flagged"] = True
                result["details"].append(f"High-frequency periodic spectral grid detected (ratio: {peak_ratio:.2f}).")
            else:
                result["details"].append(f"Spectral frequency distribution is within normal natural range ({peak_ratio:.2f}).")
                
        except Exception as e:
            result["details"].append(f"Spectral analysis error: {str(e)}")
            
        return result

    @classmethod
    async def check_vision_ai_semantic(cls, image_path: str) -> Dict[str, Any]:
        """
        Tier 3: Uses Google Gemini Vision to perform zero-shot inspection of
        textures, lighting consistency, impossible geometry, and photorealism.
        """
        result = {
            "tier3_executed": False,
            "vision_ai_score": 0.0,
            "visual_anomalies": [],
            "details": []
        }
        
        api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
        if not api_key:
            result["details"].append("Gemini API Key not configured; skipped Tier 3 semantic inspection.")
            return result
            
        try:
            from google import genai
            from google.genai import types
            
            client = genai.Client(api_key=api_key)
            
            with open(image_path, "rb") as f:
                image_bytes = f.read()
                
            prompt = """
            You are an expert digital forensics AI for municipal civic issue verification.
            Analyze this image carefully to determine if it is:
            1. An AUTHENTIC real-world photograph taken with a physical camera/phone, OR
            2. An AI-GENERATED, SYNTHETIC, or heavily digitally manipulated image (e.g., Midjourney, DALL-E, Stable Diffusion, photorealistic render).

            Look for specific AI generation tells:
            - Unnaturally smooth / waxy / airbrushed surfaces or plastic textures.
            - Mangled, nonsensical, or melting text on street signs, license plates, or posters.
            - Physically inconsistent shadows, impossible perspectives, or surreal light sources.
            - Anatomical anomalies in people or vehicles.
            - Overly picturesque or artistic dream-like lighting atypical of a standard phone camera.

            Respond STRICTLY with valid JSON in this exact schema:
            {
                "is_ai_generated": boolean,
                "ai_probability": float (0.0 to 1.0),
                "confidence": float (0.0 to 1.0),
                "anomalies_detected": ["list of specific visual anomalies if any"],
                "reasoning": "concise explanation of verdict"
            }
            """
            
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[
                    types.Part.from_bytes(
                        data=image_bytes,
                        mime_type="image/jpeg"
                    ),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            
            parsed = json.loads(response.text)
            result["tier3_executed"] = True
            result["vision_ai_score"] = float(parsed.get("ai_probability", 0.0))
            result["visual_anomalies"] = parsed.get("anomalies_detected", [])
            result["details"].append(parsed.get("reasoning", "Gemini Vision inspection complete."))
            
        except Exception as e:
            result["details"].append(f"Tier 3 Gemini Vision execution failed: {str(e)}")
            
        return result

    @classmethod
    async def validate_image(cls, image_path: str) -> Dict[str, Any]:
        """
        Executes all 3 tiers and combines scores into a definitive authenticity verdict.
        """
        # Run Tier 1 (Metadata) & Tier 2 (Spectral FFT)
        t1_meta = cls.check_metadata_provenance(image_path)
        t2_fft = cls.check_spectral_fft_anomalies(image_path)
        
        # Run Tier 3 (Gemini Vision)
        t3_vision = await cls.check_vision_ai_semantic(image_path)
        
        # Calculate Weighted Composite Score
        reasons: List[str] = []
        flags: List[str] = []
        
        if t1_meta["tier1_flagged"]:
            composite_score = max(0.90, t1_meta["provenance_score"])
            flags.extend(t1_meta["detected_signatures"])
            reasons.extend(t1_meta["details"])
        elif t3_vision["tier3_executed"]:
            # If Gemini vision is available, combine Spectral (25%) + Vision (75%)
            composite_score = (0.25 * t2_fft["spectral_score"]) + (0.75 * t3_vision["vision_ai_score"])
            if t2_fft["tier2_flagged"]:
                flags.append("Spectral Grid Anomaly")
            if t3_vision["visual_anomalies"]:
                flags.extend(t3_vision["visual_anomalies"])
            reasons.extend(t3_vision["details"])
        else:
            # Fallback to Tier 2 (Spectral FFT) + Tier 1 checks
            composite_score = t2_fft["spectral_score"]
            if t2_fft["tier2_flagged"]:
                flags.append("High Frequency Spectral Anomaly")
            reasons.extend(t2_fft["details"])
            
        is_authentic = composite_score < settings.AI_DETECTION_CONFIDENCE_THRESHOLD
        
        verdict = {
            "is_authentic": is_authentic,
            "ai_generated_probability": round(composite_score, 3),
            "confidence_score": round(1.0 - abs(composite_score - 0.5) * 0.5, 3),
            "status": "APPROVED" if is_authentic else "REJECTED_AI_GENERATED",
            "flags": flags,
            "reasons": reasons,
            "tier_breakdown": {
                "tier1_metadata": t1_meta,
                "tier2_spectral_fft": t2_fft,
                "tier3_vision_ai": t3_vision
            }
        }
        
        return verdict

authenticity_detector = ImageAuthenticityDetector

