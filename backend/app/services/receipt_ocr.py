"""OCR service for fuel receipt extraction using OpenAI GPT-4o-mini Vision."""

import base64
import json
import logging
from pathlib import Path
from dataclasses import dataclass

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class OcrResult:
    amount: float | None = None
    liters: float | None = None
    date: str | None = None  # YYYY-MM-DD
    tva_amount: float | None = None
    tva_number: str | None = None
    station_address: str | None = None
    raw_text: str | None = None
    error: str | None = None


def extract_receipt_data(photo_abs_path: str) -> OcrResult:
    """
    Extract amount, liters and date from a fuel receipt photo using OpenAI Vision.
    Returns OcrResult with extracted data or error.
    Falls back gracefully if OpenAI is not configured.
    """
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        logger.info("OPENAI_API_KEY not set — skipping OCR, manual entry required")
        return OcrResult(error="OCR non configuré — saisie manuelle requise")

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)

        # Read and encode image
        image_data = Path(photo_abs_path).read_bytes()
        b64_image = base64.b64encode(image_data).decode("utf-8")

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Analyse ce ticket de carburant/essence. "
                                "Extrais les informations suivantes et retourne UNIQUEMENT du JSON valide sans markdown :\n"
                                "{\n"
                                '  "amount": <montant total TTC en CHF ou EUR, nombre décimal ou null>,\n'
                                '  "liters": <nombre de litres, nombre décimal ou null>,\n'
                                '  "date": "<date au format YYYY-MM-DD ou null>",\n'
                                '  "tva_amount": <montant de la TVA en CHF ou EUR, nombre décimal ou null>,\n'
                                '  "tva_number": "<numéro de TVA de la station (format CHE-xxx.xxx.xxx ou similaire) ou null>",\n'
                                '  "station_address": "<adresse complète de la station-service ou null>"\n'
                                "}\n"
                                "Si tu ne peux pas extraire une valeur, mets null."
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{b64_image}",
                                "detail": "high",
                            },
                        },
                    ],
                }
            ],
            max_tokens=400,
            temperature=0,
        )

        raw = response.choices[0].message.content or ""
        logger.info(f"OCR raw response: {raw}")

        # Parse JSON from response (handle potential markdown wrapping)
        clean = raw.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        data = json.loads(clean)

        return OcrResult(
            amount=float(data["amount"]) if data.get("amount") is not None else None,
            liters=float(data["liters"]) if data.get("liters") is not None else None,
            date=data.get("date"),
            tva_amount=float(data["tva_amount"]) if data.get("tva_amount") is not None else None,
            tva_number=data.get("tva_number") or None,
            station_address=data.get("station_address") or None,
            raw_text=raw,
        )

    except ImportError:
        logger.warning("openai package not installed — OCR unavailable")
        return OcrResult(error="Package openai non installé")
    except json.JSONDecodeError as e:
        logger.error(f"OCR JSON parse error: {e}, raw: {raw}")
        return OcrResult(raw_text=raw, error="Erreur de lecture du ticket — saisie manuelle requise")
    except Exception as e:
        logger.error(f"OCR error: {e}")
        return OcrResult(error=f"Erreur OCR : {str(e)[:100]}")
