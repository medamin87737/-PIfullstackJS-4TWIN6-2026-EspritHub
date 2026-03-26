from __future__ import annotations

from typing import List, Dict


class PostActivityUpdater:
  # Spec-aligned deltas
  DELTA = {
    "success": 0.3,
    "partial": 0.1,
    "fail": -0.1,
  }

  def compute_delta(self, outcome: str) -> float:
    return self.DELTA.get(str(outcome).lower(), 0.0)

  def apply(self, participant_results: List[Dict]) -> List[Dict]:
    # Placeholder hook to keep service boundary explicit in current project.
    updates: List[Dict] = []
    for r in participant_results:
      updates.append(
        {
          "employee_id": r.get("employee_id"),
          "activity_id": r.get("activity_id"),
          "delta": self.compute_delta(str(r.get("outcome", ""))),
        }
      )
    return updates

