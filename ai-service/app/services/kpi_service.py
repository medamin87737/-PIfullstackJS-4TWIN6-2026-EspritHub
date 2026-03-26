from __future__ import annotations

import json
from pathlib import Path
from statistics import median
from typing import Dict, List


class KPIService:
  def __init__(self, exec_log_path: str, feedback_path: str):
    self.exec_log_path = Path(exec_log_path)
    self.feedback_path = Path(feedback_path)

  @staticmethod
  def _read_jsonl(path: Path) -> List[Dict]:
    if not path.exists():
      return []
    rows: List[Dict] = []
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

  def snapshot(self) -> Dict:
    exec_rows = self._read_jsonl(self.exec_log_path)
    feedback_rows = self._read_jsonl(self.feedback_path)
    latencies = [float(r.get("execution_time_ms", 0)) for r in exec_rows if r.get("execution_time_ms") is not None]
    latencies = [x for x in latencies if x > 0]
    if latencies:
      sorted_lat = sorted(latencies)
      idx = min(len(sorted_lat) - 1, int(0.95 * (len(sorted_lat) - 1)))
      p95 = sorted_lat[idx]
      med = median(sorted_lat)
    else:
      p95 = 0.0
      med = 0.0
    total_selected = sum(int(r.get("selected", 0)) for r in exec_rows)
    total_scored = sum(int(r.get("employees_scored", 0)) for r in exec_rows)
    accepted = 0
    rejected = 0
    for r in feedback_rows:
      out = str(r.get("outcome", "")).lower()
      if out in {"accepted", "approved"}:
        accepted += 1
      elif out in {"declined", "rejected"}:
        rejected += 1
    precision_top_n = accepted / (accepted + rejected) if (accepted + rejected) > 0 else 0.0
    recall_proxy = accepted / max(1, len(feedback_rows))
    ndcg_proxy = precision_top_n  # proxy until full label ranking dataset is available
    return {
      "runs": len(exec_rows),
      "feedback_events": len(feedback_rows),
      "latency_p95_ms": round(float(p95), 2),
      "latency_median_ms": round(float(med), 2),
      "selection_rate": round((total_selected / total_scored), 4) if total_scored > 0 else 0.0,
      "precision_top_n": round(float(precision_top_n), 4),
      "recall_proxy": round(float(recall_proxy), 4),
      "ndcg_proxy": round(float(ndcg_proxy), 4),
    }

