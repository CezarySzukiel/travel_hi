# app/utils/moderation.py
from __future__ import annotations
from typing import Optional, List, Pattern
import re
import unicodedata

# Czy używać LLM do subtelnych przypadków (po regexach)?
USE_LLM_MODERATION = True
try:
    from pydantic import BaseModel, Field
    from langchain_openai import ChatOpenAI
    from langchain_core.prompts import ChatPromptTemplate
except Exception:
    USE_LLM_MODERATION = False

# --- Normalizacja PL + usunięcie diakrytyków ---
_PL_MAP = str.maketrans({
    "ą": "a", "ć": "c", "ę": "e", "ł": "l", "ń": "n", "ó": "o", "ś": "s", "ż": "z", "ź": "z",
})
def _normalize(text: str) -> str:
    t = text.strip().lower()
    t = unicodedata.normalize("NFKD", t)
    t = "".join(ch for ch in t if not unicodedata.combining(ch))
    return t.translate(_PL_MAP)

# --- Fuzzy pattern (pozwala na znaki nieliterowe między literami) ---
def _fuzzy(word: str) -> str:
    # "kurwa" -> k[\W_]*u[\W_]*r[\W_]*w[\W_]*a
    parts = [re.escape(ch) + r"[\W_]*" for ch in word]
    return r"\b" + "".join(parts) + r"\b"

# Słowa wulgarne (po normalizacji)
_BAD_WORDS = [
    "kurwa", "chuj", "huj", "jebac", "jebany", "pierdol", "spierdalaj",
    "skurwysyn", "pizda", "dziwka", "szmata", "cwel",
]

# Fuzzy: k u r w a; s p i e r d a l a j; itp.
_FUZZY_PATTERNS: List[Pattern[str]] = [
    re.compile(_fuzzy(w), re.IGNORECASE | re.UNICODE) for w in _BAD_WORDS
]

# Dodatkowe „obfuskacje” typu k***a, p**da, s**erdalaj itd.
_OBFUSCATED_PATTERNS: List[Pattern[str]] = [
    re.compile(r"\bk[\W_]*[*x$#]{2,}[\W_]*a\b", re.IGNORECASE | re.UNICODE),       # k***a
    re.compile(r"\bp[\W_]*[*x$#]{2,}[\W_]*d[\W_]*a\b", re.IGNORECASE | re.UNICODE),# p**da
    re.compile(r"\bs[\W_]*pier[\W_]*[*x$#]{2,}[\W_]*aj\b", re.IGNORECASE | re.UNICODE), # spier***aj
]

def _looks_profanity_raw(text: str) -> bool:
    return any(p.search(text) for p in _FUZZY_PATTERNS + _OBFUSCATED_PATTERNS)

def _looks_profanity(text: str) -> bool:
    return _looks_profanity_raw(text) or _looks_profanity_raw(_normalize(text))

# --- (opcjonalnie) LLM do moderacji subtelnych przypadków ---
if USE_LLM_MODERATION:
    class ModerationVerdict(BaseModel):
        allowed: bool = Field(..., description="Czy treść jest dozwolona")
        categories: List[str] = Field(default_factory=list)
        reasoning: str = Field(default="")

    _mod_llm = ChatOpenAI(model="gpt-5-mini", temperature=0.0, max_tokens=160)
    _mod_prompt = ChatPromptTemplate.from_messages([
        ("system",
         "Jesteś surowym moderatorem. Jeśli tekst zawiera wulgaryzmy/obelgi, mowę nienawiści, groźby przemocy "
         "lub obraźliwy spam — uznaj za NIEDOZWOLONY. Zwracaj structured output (allowed, categories, reasoning)."),
        ("human", "Tekst użytkownika:\n{text}\n\nPodaj werdykt.")
    ])
    _mod_structured = _mod_llm.with_structured_output(ModerationVerdict)

def moderate_text(text: Optional[str]) -> bool:
    """
    True  -> treść DOZWOLONA
    False -> NIEDOZWOLONA (blokujemy i zwracamy None z assess_disruption)
    """
    t = (text or "").strip()
    if not t:
        return True

    # 1) Twardy regex (łapie też obfuskacje typu k***a, k u r w a, kur-wa)
    if _looks_profanity(t):
        return False

    # 2) (opcjonalnie) LLM dla subtelnych przypadków
    if USE_LLM_MODERATION:
        try:
            verdict = (_mod_prompt | _mod_structured).invoke({"text": t})
            return bool(verdict.allowed)
        except Exception:
            # W razie problemu z LLM nie blokujemy „na ślepo”
            return True

    return True

def ensure_allowed_or_none(text: Optional[str]) -> Optional[str]:
    return (text if moderate_text(text) else None)
