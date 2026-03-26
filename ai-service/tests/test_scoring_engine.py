from app.services import scoring_engine
from app.models.ai_models import ActivityInput, EmployeeProfile, CompetenceScore, ExtractedSkill


class DummyEmbedder:
  def __init__(self, *_args, **_kwargs):
    pass

  def encode(self, _text, normalize_embeddings=True):
    return [0.2, 0.2, 0.2]


def test_scoring_engine_returns_ranked_candidates(monkeypatch):
  monkeypatch.setattr(scoring_engine, "SentenceTransformer", DummyEmbedder)
  engine = scoring_engine.ScoringEngine(
    {"w_sem": 0.25, "w_skill": 0.45, "w_prog": 0.15, "w_hist": 0.10, "w_seniority": 0.05}
  )
  activity = ActivityInput(
    id=1,
    title="Formation React",
    description="React avancé",
    context="consolidate_medium",
    seats=2,
  )
  extracted = [
    ExtractedSkill(name="react", type="know_how", required_level=3, weight=1.0, rationale="test", question_competence_id=11)
  ]
  employees = [
    EmployeeProfile(
      id="u1",
      name="Alice",
      matricule="EMP-1",
      competences=[CompetenceScore(question_competence_id=11, intitule="React", auto_eval=3, hierarchie_eval=3, etat="validated")],
    ),
    EmployeeProfile(
      id="u2",
      name="Bob",
      matricule="EMP-2",
      competences=[CompetenceScore(question_competence_id=11, intitule="React", auto_eval=1, hierarchie_eval=1, etat="validated")],
    ),
  ]
  out = engine.score_all(activity, [0.1, 0.1, 0.1], extracted, employees)
  assert len(out) == 2
  assert out[0].global_score >= out[1].global_score

