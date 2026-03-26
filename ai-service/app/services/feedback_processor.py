from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List


class FeedbackProcessor:
  def __init__(self, feedback_file: str, weights_file: str):
    self.feedback_file = Path(feedback_file)
    self.weights_file = Path(weights_file)
    self.feedback_file.parent.mkdir(parents=True, exist_ok=True)
    self.weights_file.parent.mkdir(parents=True, exist_ok=True)

  def record_feedback(self, row: Dict):
    with open(self.feedback_file, "a", encoding="utf-8") as f:
      f.write(json.dumps(row, ensure_ascii=False) + "\n")

  def _load_rows(self) -> List[Dict]:
    if not self.feedback_file.exists():
      return []
    rows: List[Dict] = []
    with open(self.feedback_file, "r", encoding="utf-8") as f:
      for line in f:
        line = line.strip()
        if not line:
          continue
        try:
          rows.append(json.loads(line))
        except Exception:
          continue
    return rows

  def should_retrain(self, threshold: int = 50) -> bool:
    rows = self._load_rows()
    return len(rows) >= threshold

  def adjust_weights(self, base_weights: Dict[str, float]) -> Dict[str, float]:
    rows = self._load_rows()[-300:]
    if not rows:
      return base_weights
    accepted = [r for r in rows if str(r.get("outcome", "")).lower() in {"accepted", "approved"}]
    rejected = [r for r in rows if str(r.get("outcome", "")).lower() in {"declined", "rejected"}]
    if not accepted and not rejected:
      return base_weights
    weights = dict(base_weights)
    # Lightweight stable deltas in [-0.05, +0.05]
    delta = 0.0
    if len(accepted) > len(rejected):
      delta = 0.02
    elif len(rejected) > len(accepted):
      delta = -0.02
    weights["w_skill"] = max(0.2, min(0.7, weights["w_skill"] + delta))
    weights["w_sem"] = max(0.1, min(0.5, weights["w_sem"] - delta / 2))
    # normalize to 1.0
    total = sum(weights.values()) or 1.0
    for k in list(weights.keys()):
      weights[k] = round(weights[k] / total, 6)
    with open(self.weights_file, "w", encoding="utf-8") as f:
      json.dump(weights, f, ensure_ascii=False, indent=2)
    return weights

