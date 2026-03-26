from pathlib import Path
import json
import numpy as np

from app.services import nlp_service


class DummyEmbedder:
  def __init__(self, *_args, **_kwargs):
    pass

  def encode(self, _text, normalize_embeddings=True):
    return np.array([0.1, 0.2, 0.3], dtype=float)


def test_nlp_extract_with_ontology(monkeypatch, tmp_path: Path):
  monkeypatch.setattr(nlp_service, "SentenceTransformer", DummyEmbedder)
  monkeypatch.setattr(nlp_service, "spacy", None)
  ontology = {
    "react": {"id": 1, "type": "know_how", "aliases": ["reactjs"]},
    "communication": {"id": 2, "type": "soft_skill", "aliases": []},
  }
  ont_path = tmp_path / "skills_ontology.json"
  ont_path.write_text(json.dumps(ontology), encoding="utf-8")
  svc = nlp_service.NLPExtractor(str(ont_path))
  out = svc.extract("Formation React niveau 3 et communication niveau 2")
  assert out.context in {"upskill_low", "consolidate_medium", "exploit_expert"}
  assert len(out.skills) >= 1
  assert abs(sum(s.weight for s in out.skills) - 1.0) < 0.02

