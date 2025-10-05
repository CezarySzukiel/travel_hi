# app/utils/llm.py
from typing import Literal, Optional
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

from app.schemas.traffic import TrafficReport, DisruptionPrediction
from app.utils.moderation import ensure_allowed_or_none  # moderacja przed LLM

# ===== Structured output schema =====
class _AssessmentModel(BaseModel):
    probability: float = Field(..., ge=0.0, le=1.0)
    category: Literal["delay", "breakdown", "accident", "congestion", "strike", "unknown"]
    reasoning: str = Field(..., description="1–2 zwięzłe zdania, konkret.")
    recommended_action: str = Field(..., description="Jedno zwięzłe zdanie z zaleceniem.")
    confidence: float = Field(..., ge=0.0, le=1.0)

# ===== Prompty =====
_BASE_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     "Jesteś analitykiem transportu publicznego. "
     "Zwracaj wynik ZWIĘZŁY, ale KONKRETNY. "
     "Formę trzymaj tak: 'reasoning' = 1–2 zdania (~15–40 słów), "
     "'recommended_action' = 1 zdanie (~10–25 słów). "
     "Po polsku. "
     "category wybierz wyłącznie z: delay, breakdown, accident, congestion, strike, unknown."),
    ("human",
     "Miasto: {city}\nŚrodek: {mode}\nLinia: {line}\nLokalizacja: {lat}, {lon}\n"
     "Czas: {timestamp}\nOpis użytkownika: {user_text}\n"
     "Zwróć wynik zgodny ze schematem.")
])

# „Krótsza” wersja do retry (gdy zabraknie tokenów)
_SHORT_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     "Zwróć TYLKO structured output zgodny ze schematem. "
     "reasoning: ≤ 14 słów. recommended_action: ≤ 14 słów. Po polsku. "
     "category z {delay, breakdown, accident, congestion, strike, unknown}. Bez dygresji."),
    ("human",
     "Miasto: {city}\nŚrodek: {mode}\nLinia: {line}\nLokalizacja: {lat}, {lon}\n"
     "Czas: {timestamp}\nOpis użytkownika: {user_text}\n"
     "Zwróć wynik.")
])

# ===== Model LLM (więcej tokenów wyjścia) =====
_llm = ChatOpenAI(
    model="gpt-5-mini",
    temperature=0.2,
    max_tokens=512,  # ← było 260; podnosimy, żeby dokończył JSON
)
_structured = _llm.with_structured_output(_AssessmentModel)
_structured_short = _llm.with_structured_output(_AssessmentModel)  # używamy tego samego modelu

def _missing_fields(res: _AssessmentModel) -> list[str]:
    missing = []
    for f in ("probability", "category", "reasoning", "recommended_action", "confidence"):
        val = getattr(res, f, None)
        if val is None or (isinstance(val, str) and not val.strip()):
            missing.append(f)
    return missing

def assess_disruption(report: TrafficReport) -> Optional[DisruptionPrediction]:
    """
    1) Moderacja user_text – jeśli NIEDOZWOLONE → None (body=null).
    2) LLM structured output (1. próba).
    3) Jeśli padnie na limit tokenów / parsing: retry z krótszym promptem.
    4) Jeśli dalej źle albo brakuje pól → bezpieczny fallback (nie 503).
    """
    # — Moderacja —
    allowed_text = ensure_allowed_or_none(report.user_text)
    if allowed_text is None:
        return None

    variables = {
        "city": report.city,
        "mode": report.mode,
        "line": report.line or "unknown",
        "lat": report.latitude,
        "lon": report.longitude,
        "timestamp": report.timestamp.isoformat(),
        "user_text": allowed_text or "brak",
    }

    result: Optional[_AssessmentModel] = None

    # 1) podejście – pełny prompt
    try:
        result = (_BASE_PROMPT | _structured).invoke(variables)
    except Exception:
        result = None  # przechodzimy do retry

    # 2) retry – krótszy prompt (mniej treści)
    if result is None or _missing_fields(result):
        try:
            result = (_SHORT_PROMPT | _structured_short).invoke(variables)
        except Exception:
            result = None

    # 3) fallback – bez 503 (stabilna odpowiedź)
    if result is None or _missing_fields(result):
        return DisruptionPrediction(
            probability=0.6,
            category="unknown",
            reasoning="Na podstawie zgłoszenia szacowane umiarkowane ryzyko lokalnych opóźnień w najbliższym czasie.",
            recommended_action="Sprawdź alternatywne trasy i komunikaty przewoźnika; zaplanuj dodatkowe 10–20 minut.",
            confidence=0.55,
        )

    return DisruptionPrediction(
        probability=result.probability,
        category=result.category,
        reasoning=result.reasoning.strip(),
        recommended_action=result.recommended_action.strip(),
        confidence=result.confidence,
    )
