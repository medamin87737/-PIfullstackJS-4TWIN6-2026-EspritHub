from __future__ import annotations

import json
import os
import time
from datetime import datetime
import threading
from pathlib import Path
from typing import Dict, List

from fastapi import APIRouter, HTTPException

from app.models.ai_models import (
  ActivityInput,
  EmployeeProfile,
  FeedbackRequest,
  GenerateRequest,
  NLPResult,
  RecommendationOutput,
  RequiredSkill,
  ExtractedSkill,
)
from app.services.feedback_processor import FeedbackProcessor
from app.services.llm_service import LLMService
from app.services.nlp_service import NLPExtractor
from app.services.scoring_engine import ScoringEngine
from app.services.kpi_service import KPIService
from app.services.retrain_worker import RetrainWorker


router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])

CONFIG_WEIGHTS_PATH = Path("config/model_weights.json")
FEEDBACK_FILE = Path("feedback_events.jsonl")
NLP_LOG_FILE = Path("data/models/nlp_extractions.jsonl")
EXEC_LOG_FILE = Path("data/models/recommendation_exec_logs.jsonl")

_nlp = NLPExtractor()
_llm = LLMService()
_feedback = FeedbackProcessor(str(FEEDBACK_FILE), str(CONFIG_WEIGHTS_PATH))
_kpi = KPIService(str(EXEC_LOG_FILE), str(FEEDBACK_FILE))
_worker = RetrainWorker()
_auto_retrain_started = False


def _start_auto_retrain_loop():
  global _auto_retrain_started
  if _auto_retrain_started:
    return
  _auto_retrain_started = True
  interval_minutes = max(1, int(os.getenv("AI_AUTO_RETRAIN_INTERVAL_MIN", "30")))

  def _loop():
    while True:
      try:
        run_retrain_policy()
      except Exception:
        pass
      time.sleep(interval_minutes * 60)

  t = threading.Thread(target=_loop, name="ai-auto-retrain", daemon=True)
  t.start()


_start_auto_retrain_loop()


def _load_weights() -> Dict[str, float]:
  if CONFIG_WEIGHTS_PATH.exists():
    try:
      with open(CONFIG_WEIGHTS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
        return {
          "w_sem": float(data.get("w_sem", 0.25)),
          "w_skill": float(data.get("w_skill", 0.45)),
          "w_prog": float(data.get("w_prog", 0.15)),
          "w_hist": float(data.get("w_hist", 0.10)),
          "w_seniority": float(data.get("w_seniority", 0.05)),
        }
    except Exception:
      pass
  return {"w_sem": 0.25, "w_skill": 0.45, "w_prog": 0.15, "w_hist": 0.10, "w_seniority": 0.05}


def _build_activity(req: GenerateRequest, nlp: NLPResult) -> ActivityInput:
  required = []
  for s in nlp.skills:
    required.append(
      RequiredSkill(
        question_competence_id=s.question_competence_id,
        intitule=s.name,
        type=s.type,
        min_level=s.required_level,
        weight=s.weight,
        mandatory=s.mandatory,
      )
    )
  ctx = req.context or nlp.context
  return ActivityInput(
    id=req.activity_id,
    title=req.activity_title,
    description=req.activity_description,
    type=req.activity_type,
    required_skills=required,
    seats=req.seats,
    context=ctx,
    department_ids=req.department_ids,
  )


def _log_nlp(nlp: NLPResult):
  NLP_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
  with open(NLP_LOG_FILE, "a", encoding="utf-8") as f:
    f.write(
      json.dumps(
        {
          "ts": datetime.utcnow().isoformat(),
          "activity_type": nlp.activity_type,
          "context": nlp.context,
          "skills_count": len(nlp.skills),
          "confidence_score": nlp.confidence_score,
        },
        ensure_ascii=False,
      )
      + "\n"
    )


def _log_execution(payload: Dict):
  EXEC_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
  with open(EXEC_LOG_FILE, "a", encoding="utf-8") as f:
    f.write(json.dumps(payload, ensure_ascii=False) + "\n")


def build_recommendation_output(req: GenerateRequest) -> RecommendationOutput:
  t0 = time.perf_counter()
  nlp = _nlp.extract(req.activity_description)
  if _llm.available():
    try:
      llm_data = _llm.extract_skills_nlp(req.activity_description)
      llm_skills = llm_data.get("extracted_skills", [])
      if isinstance(llm_skills, list) and llm_skills:
        nlp.skills = [
          ExtractedSkill(
            name=str(s.get("name", "")),
            type=str(s.get("type", "knowledge")),
            required_level=int(s.get("required_level", 2)),
            weight=float(s.get("weight", 0.2)),
            rationale=str(s.get("rationale", "")),
          )
          for s in llm_skills
          if str(s.get("name", "")).strip()
        ]
        nlp.activity_type = llm_data.get("activity_type", nlp.activity_type)
        nlp.context = llm_data.get("priority_context", nlp.context)
        nlp.key_objectives = llm_data.get("key_objectives", [])
        nlp.constraints = llm_data.get("constraints", [])
        nlp.confidence_score = float(llm_data.get("confidence_score", nlp.confidence_score))
    except Exception:
      pass
  _log_nlp(nlp)
  activity = _build_activity(req, nlp)
  weights = _feedback.adjust_weights(_load_weights())
  engine = ScoringEngine(weights)
  scored = engine.score_all(activity, nlp.embedding, nlp.skills, req.employees)
  final_rows = scored[: activity.seats]
  for r in final_rows:
    r.recommendation_reason = _llm.generate_justification(
      employee_name=r.name,
      activity_title=activity.title,
      scores={
        "semantic": r.score_breakdown.semantic,
        "skill_match": r.score_breakdown.skill_match,
        "progression": r.score_breakdown.progression,
      },
    )
  _log_execution(
    {
      "generated_at": datetime.utcnow().isoformat(),
      "activity_id": activity.id,
      "model_version": "v2.3.1",
      "context_used": activity.context,
      "employees_scored": len(req.employees),
      "selected": len(final_rows),
      "weights_used": weights,
      "nlp": {"skills_found": len(nlp.skills), "confidence": nlp.confidence_score},
      "execution_time_ms": round((time.perf_counter() - t0) * 1000, 2),
    }
  )
  return RecommendationOutput(
    activity_id=activity.id,
    generated_at=datetime.utcnow().isoformat(),
    model_version="v2.3.1",
    context_used=activity.context,
    recommendations=final_rows,
    nlp_extracted=nlp,
    warnings=[] if final_rows else ["Peu de candidats qualifiés"],
  )


def record_feedback_event(recommendation_id: str, added_employees: List[int], removed_employees: List[int], extra: Dict | None = None):
  row = {
    "recommendation_id": recommendation_id,
    "added_employees": added_employees,
    "removed_employees": removed_employees,
    "timestamp": datetime.utcnow().isoformat(),
    "source": "manager_feedback",
  }
  if extra:
    row.update(extra)
  _feedback.record_feedback(row)
  return {"status": "feedback_recorded", "adjustment_applied": _feedback.should_retrain(1)}


def run_retrain_policy():
  if _feedback.should_retrain(50):
    new_w = _feedback.adjust_weights(_load_weights())
    return {"trained": True, "message": "Weights updated from feedback logs", "weights": new_w}
  return {"trained": False, "message": "Not enough feedback samples", "weights": _load_weights()}


@router.post("/generate", response_model=RecommendationOutput)
def generate(req: GenerateRequest):
  try:
    return build_recommendation_output(req)
  except Exception as e:
    raise HTTPException(500, str(e))


@router.post("/{recommendation_id}/feedback")
def recommendation_feedback(recommendation_id: str, body: FeedbackRequest):
  return record_feedback_event(recommendation_id, body.added_employees, body.removed_employees)


@router.post("/retrain-ai")
def retrain_ai():
  return run_retrain_policy()


@router.post("/retrain-ai/async")
def retrain_ai_async():
  job_id = _worker.submit(run_retrain_policy)
  return {"job_id": job_id, "status": "queued"}


@router.get("/retrain-ai/jobs/{job_id}")
def retrain_ai_job(job_id: str):
  row = _worker.get(job_id)
  if row is None:
    raise HTTPException(404, "Job not found")
  return row


@router.get("/metrics/kpi")
def metrics_kpi():
  return _kpi.snapshot()


@router.post("/cache/invalidate/{user_id}")
def cache_invalidate(user_id: str):
  engine = ScoringEngine(_load_weights())
  engine.invalidate_employee_vector(user_id)
  return {"invalidated": True, "user_id": user_id}


@router.get("/{recommendation_id}")
def recommendation_get(recommendation_id: str):
  # Current project stores recommendation history in backend DB.
  # This endpoint keeps API compatibility from the specification perspective.
  return {
    "recommendation_id": recommendation_id,
    "message": "Use backend recommendations API for persisted history",
  }

