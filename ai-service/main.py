from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.linear_model import LogisticRegression
import json
import os
import re
import pickle
import unicodedata
from difflib import SequenceMatcher
from datetime import datetime
from pathlib import Path
from typing import List
from dotenv import load_dotenv
from app.routes.recommendations import router as recommendations_router
from app.routes.recommendations import build_recommendation_output, record_feedback_event, run_retrain_policy
from app.models.ai_models import GenerateRequest as ModularGenerateRequest
from app.models.ai_models import EmployeeProfile as ModularEmployeeProfile
from app.models.ai_models import CompetenceScore as ModularCompetenceScore

try:
  import anthropic
except Exception:
  anthropic = None

load_dotenv()
app = FastAPI(title="HR AI Recommendation Service")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(recommendations_router)

print("Loading SBERT model...")
sbert_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
print("SBERT ready.")

anthropic_key = os.getenv("ANTHROPIC_API_KEY")
claude_client = anthropic.Anthropic(api_key=anthropic_key) if anthropic and anthropic_key else None

DEFAULT_WEIGHTS = {
  "w_sem": 0.25,
  "w_skill": 0.45,
  "w_prog": 0.15,
  "w_hist": 0.10,
  "w_seniority": 0.05,
}


class RequiredSkill(BaseModel):
  intitule: str
  niveau_requis: int
  poids: float


class ParsedActivity(BaseModel):
  titre: str
  description: str
  required_skills: List[RequiredSkill]
  top_n: int = 10
  contexte: str = "consolidate_medium"


class EmployeeCompetence(BaseModel):
  intitule: str
  niveau: float


class Employee(BaseModel):
  id: str
  name: str
  email: str
  departement: str = ""
  competences: List[EmployeeCompetence]
  historique: List[str] = []
  date_embauche: str | None = None
  job_description: str = ""


class RecommendRequest(BaseModel):
  hr_prompt: str
  employees: List[Employee]


class SkillDetail(BaseModel):
  intitule: str
  employee_level: float
  required_level: int
  contribution: float


class RecommendationResult(BaseModel):
  employee_id: str
  name: str
  email: str
  score_total: float
  score_nlp: float
  score_competences: float
  score_progression: float = 0.0
  score_history: float = 0.0
  score_seniority: float = 0.0
  recommendation_reason: str | None = None
  rank: int
  matched_skills: List[SkillDetail]


class RecommendResponse(BaseModel):
  parsed_activity: ParsedActivity
  recommendations: List[RecommendationResult]
  total_employees_analyzed: int


class FeedbackRequest(BaseModel):
  recommendation_id: str
  activity_id: str
  employee_id: str
  stage: str
  outcome: str
  note: str = ""
  score_total: float | None = None
  score_nlp: float | None = None
  score_competences: float | None = None


class RetrainResponse(BaseModel):
  trained: bool
  samples: int
  message: str


MODEL_DIR = Path(os.getenv("AI_MODEL_DIR", "data/models"))
MODEL_DIR.mkdir(parents=True, exist_ok=True)
CALIBRATOR_PATH = MODEL_DIR / "score_calibrator.pkl"
FEATURE_LOG_PATH = MODEL_DIR / "recommendation_features.jsonl"


def load_calibrator():
  if not CALIBRATOR_PATH.exists():
    return None
  try:
    with open(CALIBRATOR_PATH, "rb") as f:
      return pickle.load(f)
  except Exception:
    return None


def save_calibrator(model):
  with open(CALIBRATOR_PATH, "wb") as f:
    pickle.dump(model, f)


def append_feature_log(row: dict):
  with open(FEATURE_LOG_PATH, "a", encoding="utf-8") as f:
    f.write(json.dumps(row, ensure_ascii=False) + "\n")


def _feature_vector(row: dict):
  return [
    float(row.get("score_total", 0.0) or 0.0),
    float(row.get("score_nlp", 0.0) or 0.0),
    float(row.get("score_competences", 0.0) or 0.0),
    float(row.get("score_progression", 0.0) or 0.0),
    float(row.get("score_history", 0.0) or 0.0),
    float(row.get("score_seniority", 0.0) or 0.0),
  ]


def read_jsonl(path: str):
  if not os.path.exists(path):
    return []
  rows = []
  with open(path, "r", encoding="utf-8") as f:
    for line in f:
      line = line.strip()
      if not line:
        continue
      try:
        rows.append(json.loads(line))
      except Exception:
        continue
  return rows


def parse_hr_prompt_local(hr_prompt: str) -> ParsedActivity:
  prompt = hr_prompt.strip()
  top_n = 10
  top_match = re.search(r"\b(\d{1,2})\b", prompt)
  if top_match:
    n = int(top_match.group(1))
    if 1 <= n <= 50:
      top_n = n

  skill_pattern = re.compile(
    r"([A-Za-zÀ-ÿ0-9\-\+\#\s]{2,60}?)\s*(?:level|niveau)\s*([1-5])",
    flags=re.IGNORECASE,
  )
  raw_skills = skill_pattern.findall(prompt)
  if raw_skills:
    weight = round(1.0 / len(raw_skills), 4)
    required = [
      RequiredSkill(
        intitule=re.sub(r"\s+", " ", s[0]).strip(" ,.-"),
        niveau_requis=max(1, min(5, int(s[1]))),
        poids=weight,
      )
      for s in raw_skills
    ]
    delta = round(1.0 - sum(r.poids for r in required), 4)
    required[-1].poids = round(required[-1].poids + delta, 4)
  else:
    required = [RequiredSkill(intitule="Compétence générale", niveau_requis=3, poids=1.0)]

  lower_prompt = prompt.lower()
  contexte = "consolidate_medium"
  if any(k in lower_prompt for k in ["expert", "senior", "advanced", "avancé", "audit critique"]):
    contexte = "exploit_expert"
  elif any(k in lower_prompt for k in ["upskill", "formation", "remise à niveau", "debutant", "débutant"]):
    contexte = "upskill_low"

  return ParsedActivity(
    titre="Activité RH",
    description=prompt,
    required_skills=required,
    top_n=top_n,
    contexte=contexte,
  )


def parse_hr_prompt(hr_prompt: str) -> ParsedActivity:
  if claude_client is None:
    return parse_hr_prompt_local(hr_prompt)

  response = claude_client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1000,
    messages=[{
      "role": "user",
      "content": f"""
You are an HR assistant. Analyze the HR prompt and extract structured data.

HR Prompt: "{hr_prompt}"

Respond ONLY with raw JSON, no markdown, no explanation:
{{
  "titre": "inferred activity title",
  "description": "inferred activity description",
  "required_skills": [
    {{
      "intitule": "skill name",
      "niveau_requis": <1-5>,
      "poids": <0.0-1.0>
    }}
  ],
  "top_n": <integer default 10>,
  "contexte": "<upskill_low|consolidate_medium|exploit_expert>"
}}

Rules:
- poids values must sum to 1.0
- default niveau_requis = 3 if not specified
- default top_n = 10 if not specified
- extract ALL skills mentioned
- keep skill names in the same language as the prompt
- infer contexte from the activity meaning
"""
    }]
  )
  raw = response.content[0].text.strip()
  if "```" in raw:
    raw = raw.split("```")[1]
    if raw.startswith("json"):
      raw = raw[4:]
  parsed = ParsedActivity(**json.loads(raw.strip()))
  normalized = []
  for s in parsed.required_skills:
    normalized.append(
      RequiredSkill(
        intitule=s.intitule,
        niveau_requis=max(1, min(5, int(s.niveau_requis))),
        poids=float(s.poids),
      )
    )
  parsed.required_skills = normalized
  if parsed.top_n < 1:
    parsed.top_n = 1
  if parsed.top_n > 50:
    parsed.top_n = 50
  return parsed


def build_activity_text(a: ParsedActivity) -> str:
  skills = ", ".join([f"{s.intitule} level {s.niveau_requis}" for s in a.required_skills])
  return f"{a.titre}. {a.description}. Context: {a.contexte}. Skills needed: {skills}."


def build_employee_text(e: Employee) -> str:
  skills = ", ".join([f"{c.intitule} level {c.niveau}" for c in e.competences])
  hist = ", ".join(e.historique) if e.historique else "none"
  return f"Skills: {skills}. Department: {e.departement}. History: {hist}."


def normalize_skill_name(value: str) -> str:
  text = (value or "").strip().lower()
  text = unicodedata.normalize("NFKD", text)
  text = "".join(ch for ch in text if not unicodedata.combining(ch))
  text = re.sub(r"[^a-z0-9\s\-\+#]", " ", text)
  text = re.sub(r"\s+", " ", text).strip()
  return text


def skill_match_confidence(required_title: str, employee_title: str) -> float:
  req = normalize_skill_name(required_title)
  emp = normalize_skill_name(employee_title)
  if not req or not emp:
    return 0.0
  if req == emp:
    return 1.0
  if req in emp or emp in req:
    return 0.92

  req_tokens = set(req.split())
  emp_tokens = set(emp.split())
  if not req_tokens or not emp_tokens:
    return 0.0
  overlap = len(req_tokens & emp_tokens) / len(req_tokens | emp_tokens)
  ratio = SequenceMatcher(None, req, emp).ratio()
  return max(overlap, ratio)


def is_generic_skill_label(skill_key: str) -> bool:
  generic_labels = {
    "knowledge",
    "know_how",
    "know how",
    "soft_skills",
    "soft skills",
    "savoir",
    "savoir faire",
    "savoir etre",
    "hard skills",
    "technical skills",
    "managerial skills",
    "competence",
    "competence generale",
    "general skill",
  }
  return skill_key in generic_labels


def compute_skill_score(emp: Employee, required: List[RequiredSkill]):
  skill_map = {normalize_skill_name(c.intitule): c.niveau for c in emp.competences}
  total_weight = sum(s.poids for s in required)
  total = 0.0
  details = []
  for req in required:
    req_key = normalize_skill_name(req.intitule)
    emp_level = skill_map.get(req_key, 0.0)
    best_conf = 1.0 if emp_level > 0 else 0.0

    if emp_level <= 0 and is_generic_skill_label(req_key) and skill_map:
      # Generic labels such as "knowledge" or "soft skills" should not force 0.
      # Use the employee's average competence level as a coarse proxy.
      avg_level = sum(float(v) for v in skill_map.values()) / max(1, len(skill_map))
      emp_level = avg_level
      best_conf = 0.8

    if emp_level <= 0:
      # Fallback fuzzy match to avoid systematic 0 when labels differ slightly
      # (e.g., "Information Security" vs "Securite informatique").
      best_level = 0.0
      for emp_skill, lvl in skill_map.items():
        conf = skill_match_confidence(req_key, emp_skill)
        if conf > best_conf:
          best_conf = conf
          best_level = float(lvl)
      if best_conf >= 0.55:
        emp_level = best_level * best_conf

    if emp_level >= req.niveau_requis:
      contrib = req.poids * 1.0
    else:
      contrib = req.poids * (emp_level / req.niveau_requis)
    total += contrib
    details.append(SkillDetail(
      intitule=req.intitule,
      employee_level=emp_level,
      required_level=req.niveau_requis,
      contribution=round(contrib, 4)
    ))
  score = total / total_weight if total_weight > 0 else 0.0
  return round(score, 4), details


def get_active_weights() -> dict:
  raw = os.getenv("AI_SCORING_WEIGHTS", "").strip()
  if not raw:
    return DEFAULT_WEIGHTS
  try:
    parsed = json.loads(raw)
    return {
      "w_sem": float(parsed.get("w_sem", DEFAULT_WEIGHTS["w_sem"])),
      "w_skill": float(parsed.get("w_skill", DEFAULT_WEIGHTS["w_skill"])),
      "w_prog": float(parsed.get("w_prog", DEFAULT_WEIGHTS["w_prog"])),
      "w_hist": float(parsed.get("w_hist", DEFAULT_WEIGHTS["w_hist"])),
      "w_seniority": float(parsed.get("w_seniority", DEFAULT_WEIGHTS["w_seniority"])),
    }
  except Exception:
    return DEFAULT_WEIGHTS


def progression_bonus(emp: Employee, contexte: str) -> float:
  if not emp.competences:
    return 0.0
  avg_lvl = sum(float(c.niveau) for c in emp.competences) / max(1, len(emp.competences))
  x = max(0.0, min(1.0, avg_lvl / 10.0))
  if contexte == "upskill_low":
    return max(0.0, 1.0 - x)
  if contexte == "exploit_expert":
    return x
  return max(0.0, 1.0 - abs(x - 0.6) / 0.6)


def history_score(emp: Employee, contexte: str) -> float:
  count = len(emp.historique or [])
  ratio = min(1.0, count / 20.0)
  if contexte == "upskill_low":
    return max(0.0, 1.0 - ratio)
  if contexte == "exploit_expert":
    return ratio
  return max(0.0, 1.0 - abs(ratio - 0.5))


def seniority_factor(emp: Employee) -> float:
  if not emp.date_embauche:
    return 0.0
  try:
    hire = datetime.fromisoformat(str(emp.date_embauche).replace("Z", "+00:00"))
    years = max(0.0, (datetime.now(hire.tzinfo) - hire).days / 365.25)
    return max(0.0, min(1.0, years / 10.0))
  except Exception:
    return 0.0


@app.post("/recommend", response_model=RecommendResponse)
async def recommend(req: RecommendRequest):
  try:
    if not req.employees:
      return RecommendResponse(
        parsed_activity=parse_hr_prompt_local(req.hr_prompt),
        recommendations=[],
        total_employees_analyzed=0,
      )

    # Keep compatibility with legacy /recommend while respecting top_n parsed from prompt.
    try:
      parsed_for_topn = parse_hr_prompt(req.hr_prompt)
    except Exception:
      parsed_for_topn = parse_hr_prompt_local(req.hr_prompt)
    requested_top_n = max(1, min(50, int(parsed_for_topn.top_n or 10)))

    mod_employees = []
    for e in req.employees:
      mod_employees.append(
        ModularEmployeeProfile(
          id=e.id,
          name=e.name,
          matricule="",
          email=e.email,
          departement=e.departement,
          date_embauche=e.date_embauche,
          job_description=e.job_description,
          activity_history=e.historique,
          competences=[
            ModularCompetenceScore(
              intitule=c.intitule,
              type="knowledge",
              auto_eval=float(c.niveau),
              hierarchie_eval=float(c.niveau),
              etat="validated",
            )
            for c in e.competences
          ],
        )
      )
    modular_req = ModularGenerateRequest(
      activity_id=None,
      seats=min(requested_top_n, len(mod_employees)),
      activity_description=req.hr_prompt,
      activity_title="Activité RH",
      activity_type="technical",
      employees=mod_employees,
    )
    mod_out = build_recommendation_output(modular_req)
    parsed = ParsedActivity(
      titre=mod_out.nlp_extracted.activity_type,
      description=req.hr_prompt,
      required_skills=[
        RequiredSkill(
          intitule=s.name,
          niveau_requis=max(1, min(5, int(s.required_level))),
          poids=float(s.weight),
        )
        for s in mod_out.nlp_extracted.skills
      ] or [RequiredSkill(intitule="Compétence générale", niveau_requis=3, poids=1.0)],
      top_n=min(50, max(1, len(mod_out.recommendations))),
      contexte=mod_out.context_used,
    )
    recs = []
    for i, r in enumerate(mod_out.recommendations):
      recs.append(
        RecommendationResult(
          employee_id=str(r.user_id),
          name=r.name,
          email=next((x.email for x in req.employees if x.id == str(r.user_id)), ""),
          score_total=float(r.global_score),
          score_nlp=float(r.score_breakdown.semantic),
          score_competences=float(r.score_breakdown.skill_match),
          score_progression=float(r.score_breakdown.progression),
          score_history=float(r.score_breakdown.history),
          score_seniority=float(r.score_breakdown.seniority),
          recommendation_reason=r.recommendation_reason,
          rank=i + 1,
          matched_skills=[
            SkillDetail(
              intitule=d.skill_name,
              employee_level=d.employee_level,
              required_level=int(d.required_level),
              contribution=d.contribution,
            )
            for d in r.skill_details
          ],
        )
      )
    for r in recs:
      append_feature_log({
        "recommendation_id": f"{r.employee_id}:{req.hr_prompt[:40]}",
        "employee_id": r.employee_id,
        "score_total": r.score_total,
        "score_nlp": r.score_nlp,
        "score_competences": r.score_competences,
        "score_progression": r.score_progression,
        "score_history": r.score_history,
        "score_seniority": r.score_seniority,
        "context": parsed.contexte,
      })
    return RecommendResponse(
      parsed_activity=parsed,
      recommendations=recs,
      total_employees_analyzed=len(req.employees)
    )
  except json.JSONDecodeError as e:
    raise HTTPException(422, f"Claude returned invalid JSON: {e}")
  except Exception as e:
    raise HTTPException(500, str(e))


@app.get("/health")
def health():
  return {"status": "ok", "sbert": "paraphrase-multilingual-MiniLM-L12-v2"}


@app.post("/feedback")
def feedback(req: FeedbackRequest):
  try:
    path = os.getenv("AI_FEEDBACK_FILE", "feedback_events.jsonl")
    row = {
      "recommendation_id": req.recommendation_id,
      "activity_id": req.activity_id,
      "employee_id": req.employee_id,
      "stage": req.stage,
      "outcome": req.outcome,
      "note": req.note,
      "score_total": req.score_total,
      "score_nlp": req.score_nlp,
      "score_competences": req.score_competences,
    }
    with open(path, "a", encoding="utf-8") as f:
      f.write(json.dumps(row, ensure_ascii=False) + "\n")
    record_feedback_event(
      recommendation_id=req.recommendation_id,
      added_employees=[],
      removed_employees=[],
      extra=row,
    )
    return {"stored": True}
  except Exception as e:
    raise HTTPException(500, str(e))


@app.post("/retrain", response_model=RetrainResponse)
def retrain():
  try:
    policy = run_retrain_policy()
    if policy.get("trained"):
      return RetrainResponse(trained=True, samples=0, message=policy.get("message", "Weights updated"))
    feedback_path = os.getenv("AI_FEEDBACK_FILE", "feedback_events.jsonl")
    feedback_rows = read_jsonl(feedback_path)
    feature_rows = read_jsonl(str(FEATURE_LOG_PATH))
    dataset = []
    for r in feedback_rows:
      outcome = str(r.get("outcome", "")).strip().lower()
      if outcome not in {"accepted", "declined", "approved", "rejected"}:
        continue
      y = 1 if outcome in {"accepted", "approved"} else 0
      dataset.append((_feature_vector(r), y))

    # Weak supervision fallback if real labeled feedback is still limited.
    # Helps bootstrap a calibrator in early project stages with real production scores.
    if len(dataset) < 20 and feature_rows:
      for r in feature_rows:
        st = float(r.get("score_total", 0.0) or 0.0)
        if st >= 0.65:
          dataset.append((_feature_vector(r), 1))
        elif st <= 0.40:
          dataset.append((_feature_vector(r), 0))

    if len(dataset) < 20:
      return RetrainResponse(trained=False, samples=len(dataset), message="Not enough labeled samples for retraining")

    X = [d[0] for d in dataset]
    y = [d[1] for d in dataset]
    model = LogisticRegression(max_iter=400, class_weight="balanced")
    model.fit(X, y)
    save_calibrator(model)
    return RetrainResponse(trained=True, samples=len(dataset), message="Calibrator model retrained and saved")
  except Exception as e:
    raise HTTPException(500, str(e))

