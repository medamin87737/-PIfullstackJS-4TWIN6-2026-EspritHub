from __future__ import annotations

import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Any, Callable, Dict


class RetrainWorker:
  def __init__(self):
    self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="ai-retrain")
    self._lock = threading.Lock()
    self._jobs: Dict[str, Dict[str, Any]] = {}

  def submit(self, fn: Callable[[], Dict[str, Any]]) -> str:
    job_id = str(uuid.uuid4())
    with self._lock:
      self._jobs[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "created_at": datetime.utcnow().isoformat(),
        "started_at": None,
        "finished_at": None,
        "result": None,
        "error": None,
      }

    def _run():
      with self._lock:
        self._jobs[job_id]["status"] = "running"
        self._jobs[job_id]["started_at"] = datetime.utcnow().isoformat()
      try:
        out = fn()
        with self._lock:
          self._jobs[job_id]["status"] = "completed"
          self._jobs[job_id]["result"] = out
          self._jobs[job_id]["finished_at"] = datetime.utcnow().isoformat()
      except Exception as e:
        with self._lock:
          self._jobs[job_id]["status"] = "failed"
          self._jobs[job_id]["error"] = str(e)
          self._jobs[job_id]["finished_at"] = datetime.utcnow().isoformat()

    self._executor.submit(_run)
    return job_id

  def get(self, job_id: str) -> Dict[str, Any] | None:
    with self._lock:
      return self._jobs.get(job_id)

