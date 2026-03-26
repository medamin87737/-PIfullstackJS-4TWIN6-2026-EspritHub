from __future__ import annotations

from pydantic import BaseModel, Field
from typing import List, Literal


PriorityContext = Literal["upskill_low", "consolidate_medium", "exploit_expert"]
ActivityType = Literal["technical", "management", "transversal", "certification", "audit"]
SkillType = Literal["knowledge", "know_how", "soft_skill"]


class RequiredSkill(BaseModel):
  question_competence_id: int | None = None
  intitule: str
  type: SkillType = "knowledge"
  min_level: int = Field(default=2, ge=1, le=4)
  weight: float = Field(default=1.0, ge=0.0, le=1.0)
  mandatory: bool = False


class ActivityInput(BaseModel):
  id: int | None = None
  title: str
  description: str
  type: ActivityType = "technical"
  required_skills: List[RequiredSkill] = []
  seats: int = Field(default=10, ge=1, le=200)
  context: PriorityContext = "consolidate_medium"
  department_ids: List[int] | None = None


class CompetenceScore(BaseModel):
  question_competence_id: int | None = None
  intitule: str
  type: str = "knowledge"
  auto_eval: float = 0.0
  hierarchie_eval: float = 0.0
  dynamic_score: float = 0.0
  evolution: List[float] = []
  last_saison: str | None = None
  etat: str = "validated"


class EmployeeProfile(BaseModel):
  user_id: int | None = None
  id: str
  name: str
  matricule: str = ""
  email: str = ""
  department_id: int | None = None
  departement: str = ""
  manager_id: int | None = None
  job_description: str = ""
  date_embauche: str | None = None
  competences: List[CompetenceScore] = []
  activity_history: List[str] = []
  progression_rate: float = 0.0


class ExtractedSkill(BaseModel):
  name: str
  type: SkillType
  required_level: int = Field(ge=1, le=4)
  weight: float = Field(ge=0.0, le=1.0)
  rationale: str = ""
  question_competence_id: int | None = None
  mandatory: bool = False


class NLPResult(BaseModel):
  skills: List[ExtractedSkill]
  activity_type: ActivityType
  context: PriorityContext
  embedding: List[float]
  raw_tokens: List[str]
  confidence_score: float = 0.7
  key_objectives: List[str] = []
  constraints: List[str] = []


class ScoreBreakdown(BaseModel):
  semantic: float
  skill_match: float
  progression: float
  history: float
  seniority: float


class SkillDetail(BaseModel):
  skill_name: str
  required_level: float
  employee_level: float
  weight: float
  contribution: float
  mandatory: bool = False


class EmployeeRec(BaseModel):
  user_id: str
  name: str
  matricule: str = ""
  department: str = ""
  global_score: float
  score_breakdown: ScoreBreakdown
  skill_details: List[SkillDetail]
  recommendation_reason: str
  confidence: Literal["high", "medium", "low"] = "medium"


class RecommendationOutput(BaseModel):
  activity_id: int | None = None
  generated_at: str
  model_version: str = "v2.3.1"
  context_used: PriorityContext
  recommendations: List[EmployeeRec]
  nlp_extracted: NLPResult
  warnings: List[str] = []


class GenerateRequest(BaseModel):
  activity_id: int | None = None
  seats: int = 10
  context: PriorityContext | None = None
  department_ids: List[int] | None = None
  activity_description: str
  activity_title: str = "Activité RH"
  activity_type: ActivityType = "technical"
  employees: List[EmployeeProfile]


class FeedbackRequest(BaseModel):
  added_employees: List[int] = []
  removed_employees: List[int] = []

