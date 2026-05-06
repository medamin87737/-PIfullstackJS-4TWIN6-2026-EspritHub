from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Dict, List

from app.models.ai_models import ExtractedSkill, NLPResult, PriorityContext
from app.services.model_registry import get_embedding_model

try:
  import spacy
except Exception:
  spacy = None


class NLPExtractor:
  def __init__(self, ontology_path: str | None = None):
    self.ontology = self._load_ontology(ontology_path or "data/skills_ontology.json")
    self.embedder = None
    self.nlp = None

  def _get_embedder(self):
    if self.embedder is None:
      self.embedder = get_embedding_model()
    return self.embedder

  def _get_nlp(self):
    if self.nlp is not None:
      return self.nlp
    if os.getenv("AI_DISABLE_SPACY", "true").strip().lower() in {"1", "true", "yes", "on"}:
      return None
    if spacy is None:
      return None
    try:
      # Prefer a smaller model by default on low-memory deploys.
      self.nlp = spacy.load(os.getenv("AI_SPACY_MODEL", "fr_core_news_sm"))
    except Exception:
      self.nlp = None
    return self.nlp

  def _load_ontology(self, path: str) -> Dict:
    p = Path(path)
    if not p.exists():
      return {}
    try:
      with open(p, "r", encoding="utf-8") as f:
        return json.load(f)
    except Exception:
      return {}

  def _preprocess(self, text: str) -> str:
    text = (text or "").lower().strip()
    return re.sub(r"[^\w\s\-\+#àâçéèêëîïôùûüÿñæœ]", " ", text)

  def _detect_context(self, text: str) -> PriorityContext:
    t = text.lower()
    if any(k in t for k in ["expert", "audit", "critique", "senior", "avancé", "avance"]):
      return "exploit_expert"
    if any(k in t for k in ["debutant", "débutant", "upskill", "formation", "remise à niveau"]):
      return "upskill_low"
    return "consolidate_medium"

  def _classify_activity(self, text: str):
    t = text.lower()
    if any(k in t for k in ["audit", "conformité", "conformite"]):
      return "audit"
    if "certification" in t:
      return "certification"
    if any(k in t for k in ["manager", "leadership", "people", "gestion"]):
      return "management"
    if any(k in t for k in ["communication", "transversal", "soft"]):
      return "transversal"
    return "technical"

  def _extract_tokens(self, text: str) -> List[str]:
    clean = self._preprocess(text)
    nlp_obj = self._get_nlp()
    if nlp_obj is None:
      return [x for x in clean.split() if len(x) > 2]
    doc = nlp_obj(clean)
    return [t.lemma_.lower() for t in doc if not t.is_stop and t.is_alpha]

  def _detect_level(self, window: str) -> int:
    m = re.search(r"(niveau|level)\s*([1-4])", window, flags=re.IGNORECASE)
    if m:
      return int(m.group(2))
    return 2

  def _estimate_weight(self, occurrence_rank: int, total: int) -> float:
    if total <= 1:
      return 1.0
    base = max(0.15, 1.0 - (occurrence_rank / max(1, total * 2)))
    return round(base, 4)

  def _match_ontology(self, text: str, tokens: List[str]) -> List[ExtractedSkill]:
    hits: Dict[str, ExtractedSkill] = {}
    clean = self._preprocess(text)
    for idx, token in enumerate(tokens):
      for key, ref in self.ontology.items():
        aliases = [a.lower() for a in ref.get("aliases", [])]
        if token != key.lower() and token not in aliases:
          continue
        window = clean[max(0, clean.find(token) - 35): clean.find(token) + 70]
        lvl = self._detect_level(window)
        s = ExtractedSkill(
          name=key,
          type=ref.get("type", "knowledge"),
          required_level=lvl,
          weight=self._estimate_weight(idx, len(tokens)),
          rationale=f"Term '{token}' matched ontology",
          question_competence_id=ref.get("id"),
          mandatory=bool(ref.get("mandatory", False)),
        )
        hits[key] = s
    if not hits:
      return [
        ExtractedSkill(
          name="compétence générale",
          type="knowledge",
          required_level=2,
          weight=1.0,
          rationale="Fallback when no explicit ontology term was found",
        )
      ]
    # Normalize weights to sum=1
    rows = list(hits.values())
    total = sum(r.weight for r in rows) or 1.0
    for r in rows:
      r.weight = round(r.weight / total, 4)
    delta = round(1.0 - sum(r.weight for r in rows), 4)
    rows[-1].weight = round(rows[-1].weight + delta, 4)
    return rows

  def extract(self, description: str) -> NLPResult:
    tokens = self._extract_tokens(description)
    extracted = self._match_ontology(description, tokens)
    emb = []
    embedder = self._get_embedder()
    if embedder is not None:
      try:
        emb = embedder.encode(description, normalize_embeddings=True).tolist()
      except Exception:
        emb = []
    return NLPResult(
      skills=extracted,
      activity_type=self._classify_activity(description),
      context=self._detect_context(description),
      embedding=emb,
      raw_tokens=tokens,
      confidence_score=0.8 if extracted and extracted[0].name != "compétence générale" else 0.55,
      key_objectives=[],
      constraints=[],
    )


