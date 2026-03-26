from __future__ import annotations

import json
import os
import time
from typing import Any, Dict, List

from app.models.ai_models import NLPResult

try:
  import anthropic
except Exception:
  anthropic = None


class LLMService:
  def __init__(self):
    self.client = None
    self.failures = 0
    self.max_failures = 5
    self.disabled_until = 0.0
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if anthropic and api_key:
      self.client = anthropic.Anthropic(api_key=api_key)

  def available(self) -> bool:
    return self.client is not None and time.time() >= self.disabled_until

  def _call_json(self, prompt: str, max_tokens: int = 1200) -> Dict[str, Any]:
    if not self.available():
      raise RuntimeError("LLM unavailable")
    last_err = None
    for _ in range(3):
      try:
        r = self.client.messages.create(
          model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
          max_tokens=max_tokens,
          messages=[{"role": "user", "content": prompt}],
        )
        text = r.content[0].text.strip()
        if "```" in text:
          text = text.split("```")[1]
          if text.startswith("json"):
            text = text[4:]
        data = json.loads(text.strip())
        self.failures = 0
        return data
      except Exception as e:
        last_err = e
        self.failures += 1
        time.sleep(0.3)
    if self.failures >= self.max_failures:
      self.disabled_until = time.time() + 120
    raise RuntimeError(f"LLM JSON parse failure: {last_err}")

  def generate_justification(self, employee_name: str, activity_title: str, scores: Dict[str, float]) -> str:
    if not self.available():
      return f"{employee_name} présente un profil aligné avec l'activité {activity_title} selon le scoring multi-critères."
    prompt = f"""
Tu es un assistant RH professionnel. Réponds UNIQUEMENT avec 1 à 2 phrases factuelles en français.
ACTIVITÉ: {activity_title}
EMPLOYÉ: {employee_name}
SCORES: semantic={scores.get('semantic', 0):.2f}, skill={scores.get('skill_match', 0):.2f}, progression={scores.get('progression', 0):.2f}
"""
    try:
      r = self.client.messages.create(
        model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
        max_tokens=120,
        messages=[{"role": "user", "content": prompt}],
      )
      self.failures = 0
      return r.content[0].text.strip()
    except Exception:
      self.failures += 1
      return f"{employee_name} est recommandé(e) pour {activity_title} avec un bon alignement compétences/contexte."

  def extract_skills_nlp(self, activity_description: str) -> Dict[str, Any]:
    prompt = f"""
Tu es un système expert en RH. Réponds UNIQUEMENT en JSON valide:
{{
  "activity_type": "technical|management|transversal|certification|audit",
  "priority_context": "upskill_low|consolidate_medium|exploit_expert",
  "extracted_skills": [
    {{
      "name": "nom_competence",
      "type": "knowledge|know_how|soft_skill",
      "required_level": 1,
      "weight": 0.5,
      "rationale": "justification"
    }}
  ],
  "key_objectives": [],
  "constraints": [],
  "confidence_score": 0.0
}}
Description:
{activity_description}
"""
    return self._call_json(prompt, max_tokens=1200)

  def analyze_feedback(self, activity_title: str, removed: List[Dict], added: List[Dict]) -> Dict[str, Any]:
    prompt = f"""
Tu es un système d'analyse de feedback RH. Réponds UNIQUEMENT en JSON.
ACTIVITE: {activity_title}
REMOVED: {json.dumps(removed, ensure_ascii=False)}
ADDED: {json.dumps(added, ensure_ascii=False)}
Schéma:
{{
  "possible_reasons_for_removals": ["..."],
  "possible_reasons_for_additions": ["..."],
  "suggested_weight_adjustments": {{
    "w_semantic": 0.0,
    "w_skill_match": 0.0,
    "w_progression": 0.0,
    "w_history": 0.0
  }},
  "new_patterns_detected": ["..."],
  "confidence": 0.0
}}
"""
    return self._call_json(prompt, max_tokens=800)

  def enrich_ontology(self, unrecognized_terms: List[Dict], context_snippets: List[str], categories: List[str]) -> List[Dict]:
    prompt = f"""
Tu es un expert en gestion des compétences professionnelles. Réponds UNIQUEMENT en JSON valide (liste).
TERMES: {json.dumps(unrecognized_terms, ensure_ascii=False)}
CONTEXTE: {json.dumps(context_snippets, ensure_ascii=False)}
CATEGORIES: {json.dumps(categories, ensure_ascii=False)}
"""
    data = self._call_json(prompt, max_tokens=1000)
    return data if isinstance(data, list) else []

