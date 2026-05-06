from __future__ import annotations

import os
import threading

from sentence_transformers import SentenceTransformer

_embedder = None
_embedder_lock = threading.Lock()
_embedder_disabled = False


def get_embedding_model():
  global _embedder, _embedder_disabled
  if _embedder_disabled:
    return None
  if _embedder is None:
    with _embedder_lock:
      if _embedder is None:
        try:
          import torch
          _embedder = SentenceTransformer(
            os.getenv("AI_EMBEDDING_MODEL", "paraphrase-multilingual-MiniLM-L12-v2"),
            device="cpu",
          )
          # Keep memory footprint tighter on low-RAM instances.
          _embedder.max_seq_length = int(os.getenv("AI_MAX_SEQ_LENGTH", "128"))
          torch.set_num_threads(1)
          try:
            torch.set_num_interop_threads(1)
          except Exception:
            pass
          torch.set_grad_enabled(False)
        except Exception:
          # On ultra low-memory instances, keep service alive without embeddings.
          _embedder = None
          _embedder_disabled = True
  return _embedder


def is_embedding_model_loaded() -> bool:
  return _embedder is not None
