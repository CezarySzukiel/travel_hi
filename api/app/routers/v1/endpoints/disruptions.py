# app/routers/v1/endpoints/disruptions.py
from typing import Optional
from fastapi import APIRouter, HTTPException, status

from app.schemas.traffic import TrafficReport, DisruptionPrediction
from app.utils.llm import assess_disruption


router = APIRouter(prefix="/disruptions", tags=["AI"])

@router.post(
    "/predict",
    response_model=Optional[DisruptionPrediction],
    status_code=status.HTTP_200_OK,
)
def predict_disruption(report: TrafficReport) -> Optional[DisruptionPrediction]:
    try:
        return assess_disruption(report)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"LLM error: {e}")
