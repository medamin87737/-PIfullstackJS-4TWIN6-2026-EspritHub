from __future__ import annotations

import math
import os
import pickle
import random
import re
import unicodedata
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple
from difflib import SequenceMatcher

import numpy as np
from sentence_transformers import SentenceTransformer

from app.models.ai_models import (
  ActivityInput,
  EmployeeProfile,
  EmployeeRec,
  ExtractedSkill,
  ScoreBreakdown,
  SkillDetail,
)
from app.services.vector_cache import VectorCache


class ScoringEngine:
  def __init__(self, weights: Dict[str, float]):
    self.weights = weights
    self.embedder = SentenceTransformer("paraphrase-multilingual-mpnet-base-v2")
    self.cache = VectorCache()
    self.calibrator = self._load_calibrator()

  @staticmethod
  def _load_calibrator():
    model_dir = Path(os.getenv("AI_MODEL_DIR", "data/models"))
    path = model_dir / "score_calibrator.pkl"
    if not path.exists():
      return None
    try:
      with open(path, "rb") as f:
        return pickle.load(f)
    except Exception:
      return None

  @staticmethod
  def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    if np.linalg.norm(a) == 0 or np.linalg.norm(b) == 0:
      return 0.0
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))

  @staticmethod
  def _gaussian(x: float, mean: float, std: float = 0.8) -> float:
    return float(math.exp(-((x - mean) ** 2) / (2 * (std**2))))

  @staticmethod
  def _norm_skill(value: str) -> str:
    text = (value or "").strip().lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^a-z0-9\s\-\+#]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

  @classmethod
  def _skill_similarity(cls, a: str, b: str) -> float:
    x = cls._norm_skill(a)
    y = cls._norm_skill(b)
    if not x or not y:
      return 0.0
    if x == y:
      return 1.0
    if x in y or y in x:
      return 0.9
    x_tokens = set(x.split())
    y_tokens = set(y.split())
    token_overlap = len(x_tokens & y_tokens) / max(1, len(x_tokens | y_tokens))
    ratio = SequenceMatcher(None, x, y).ratio()
    return max(token_overlap, ratio)

  def _seniority(self, emp: EmployeeProfile) -> float:
    if not emp.date_embauche:
      return 0.0
    try:
      d = datetime.fromisoformat(str(emp.date_embauche).replace("Z", "+00:00"))
      y = max(0.0, (datetime.now(d.tzinfo) - d).days / 365.25)
      return min(1.0, y / 10.0)
    except Exception:
      return 0.0

  def _history(self, emp: EmployeeProfile, activity_type: str) -> float:
    count = len(emp.activity_history)
    if count == 0:
      # Neutral fallback for new employees to avoid systematic 0.
      return 0.5
    if activity_type in {"audit", "certification"}:
      return min(1.0, count / 15.0)
    return min(1.0, count / 25.0)

  def _progression(self, emp: EmployeeProfile) -> float:
    if emp.progression_rate:
      return max(0.0, min(1.0, (emp.progression_rate + 1) / 2.0))
    trends = []
    for c in emp.competences:
      if len(c.evolution) >= 2:
        x = np.arange(len(c.evolution))
        slope = np.polyfit(x, np.array(c.evolution, dtype=float), 1)[0]
        trends.append(float(slope))
    if not trends:
      return 0.5
    avg = float(np.mean(trends))
    return max(0.0, min(1.0, (avg + 1) / 2.0))

  def _skill_level(self, emp: EmployeeProfile, extracted: ExtractedSkill) -> float:
    # only validated competences as required by specification
    rows = [c for c in emp.competences if str(c.etat).lower() == "validated"]
    if not rows:
      return 0.0
    exact = [c for c in rows if c.question_competence_id and c.question_competence_id == extracted.question_competence_id]
    chosen = exact if exact else [c for c in rows if extracted.name.lower() in c.intitule.lower()]
    if not chosen:
      best_score = 0.0
      best_level = 0.0
      for c in rows:
        conf = self._skill_similarity(extracted.name, c.intitule)
        if conf > best_score:
          best_score = conf
          best_level = 0.4 * float(c.auto_eval) + 0.6 * float(c.hierarchie_eval)
      if best_score >= 0.45:
        return float(best_level * best_score)
      return 0.0
    vals = [0.4 * float(c.auto_eval) + 0.6 * float(c.hierarchie_eval) for c in chosen]
    # normalize from 0..4 into 0..4 (already compatible)
    return float(np.mean(vals))

  def _skill_match(
    self, emp: EmployeeProfile, extracted_skills: List[ExtractedSkill], context: str
  ) -> Tuple[float, List[SkillDetail]]:
    total_score = 0.0
    total_weight = 0.0
    details: List[SkillDetail] = []
    for s in extracted_skills:
      req_level = float(s.required_level)
      weight = float(s.weight)
      emp_level = self._skill_level(emp, s)
      total_weight += weight

      if context == "upskill_low":
        gap = req_level - emp_level
        if 0 < gap <= 1.5:
          score = weight * (1.0 - gap / 4.0)
        elif gap <= 0:
          score = weight * 0.3
        else:
          score = weight * max(0.0, 1.0 - gap / 2.0)
      elif context == "exploit_expert":
        score = weight * ((max(0.0, emp_level) / 4.0) ** 1.5)
      else:
        score = weight * self._gaussian(emp_level, mean=req_level, std=0.8)

      total_score += score
      details.append(
        SkillDetail(
          skill_name=s.name,
          required_level=req_level,
          employee_level=round(emp_level, 4),
          weight=weight,
          contribution=round(score, 4),
          mandatory=s.mandatory,
        )
      )

    return (total_score / total_weight if total_weight > 0 else 0.0), details

  def _tie_break_key(self, emp: EmployeeRec):
    return (
      -emp.score_breakdown.progression,
      len(emp.skill_details),
      -emp.score_breakdown.seniority,
      random.random(),
    )

  def score_all(self, activity: ActivityInput, nlp_embedding: List[float], extracted_skills: List[ExtractedSkill], employees: List[EmployeeProfile]) -> List[EmployeeRec]:
    act_vec = np.array(nlp_embedding, dtype=float)
    scored: List[EmployeeRec] = []
    for e in employees:
      job_text = e.job_description or " ".join([f"{c.intitule} {c.hierarchie_eval}" for c in e.competences])
      cached = self.cache.get(e.id)
      if cached is not None:
        job_vec = np.array(cached, dtype=float)
      else:
        job_vec = np.array(self.embedder.encode(job_text, normalize_embeddings=True), dtype=float)
        self.cache.set(e.id, job_vec.tolist())
      semantic = self._cosine(job_vec, act_vec)
      skill_match, details = self._skill_match(e, extracted_skills, activity.context)
      prog = self._progression(e)
      hist = self._history(e, activity.type)
      seni = self._seniority(e)
      total = (
        self.weights["w_sem"] * semantic
        + self.weights["w_skill"] * skill_match
        + self.weights["w_prog"] * prog
        + self.weights["w_hist"] * hist
        + self.weights["w_seniority"] * seni
      )
      if self.calibrator is not None:
        try:
          total = float(
            self.calibrator.predict_proba([[
              total,
              semantic,
              skill_match,
              prog,
              hist,
              seni,
            ]])[0][1]
          )
        except Exception:
          pass
      confidence = "high" if total >= 0.75 else ("medium" if total >= 0.5 else "low")
      scored.append(
        EmployeeRec(
          user_id=e.id,
          name=e.name,
          matricule=e.matricule,
          department=e.departement,
          global_score=round(float(total), 4),
          score_breakdown=ScoreBreakdown(
            semantic=round(float(semantic), 4),
            skill_match=round(float(skill_match), 4),
            progression=round(float(prog), 4),
            history=round(float(hist), 4),
            seniority=round(float(seni), 4),
          ),
          skill_details=details,
          recommendation_reason="Profil recommandé selon scoring multi-critères.",
          confidence=confidence,
        )
      )

    scored.sort(key=lambda x: x.global_score, reverse=True)
    # tie-break on near scores
    threshold = 0.03
    groups: List[List[EmployeeRec]] = []
    current: List[EmployeeRec] = []
    for row in scored:
      if not current:
        current = [row]
      elif abs(current[-1].global_score - row.global_score) < threshold:
        current.append(row)
      else:
        groups.append(sorted(current, key=self._tie_break_key))
        current = [row]
    if current:
      groups.append(sorted(current, key=self._tie_break_key))
    return [x for g in groups for x in g]

  def invalidate_employee_vector(self, user_id: str):
    self.cache.invalidate(user_id)

