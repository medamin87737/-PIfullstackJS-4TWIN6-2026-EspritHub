from __future__ import annotations

import json
import os
import time
from typing import Any

try:
  import redis
except Exception:
  redis = None


class VectorCache:
  def __init__(self):
    self.ttl_seconds = int(os.getenv("AI_VECTOR_CACHE_TTL", "86400"))
    self.prefix = os.getenv("AI_VECTOR_CACHE_PREFIX", "emp_vec_")
    self._mem_store: dict[str, tuple[float, str]] = {}
    self._redis = None
    if redis is not None:
      try:
        url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
        self._redis = redis.Redis.from_url(url, decode_responses=True)
        self._redis.ping()
      except Exception:
        self._redis = None

  def _key(self, user_id: str) -> str:
    return f"{self.prefix}{user_id}"

  def get(self, user_id: str) -> list[float] | None:
    key = self._key(user_id)
    if self._redis is not None:
      try:
        raw = self._redis.get(key)
        if raw:
          return json.loads(raw)
      except Exception:
        return None
    row = self._mem_store.get(key)
    if not row:
      return None
    exp, payload = row
    if exp < time.time():
      self._mem_store.pop(key, None)
      return None
    return json.loads(payload)

  def set(self, user_id: str, vector: list[float]):
    key = self._key(user_id)
    payload = json.dumps(vector, ensure_ascii=False)
    if self._redis is not None:
      try:
        self._redis.setex(key, self.ttl_seconds, payload)
        return
      except Exception:
        pass
    self._mem_store[key] = (time.time() + self.ttl_seconds, payload)

  def invalidate(self, user_id: str):
    key = self._key(user_id)
    if self._redis is not None:
      try:
        self._redis.delete(key)
      except Exception:
        pass
    self._mem_store.pop(key, None)

