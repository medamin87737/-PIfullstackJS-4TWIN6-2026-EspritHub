# Service FastAPI (recommandations IA). Torch CPU pour workers K8s sans GPU.
FROM python:3.11-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements-docker.txt .
RUN pip install --no-cache-dir -r requirements-docker.txt

# Modèle spaCy léger (évite fr_core_news_lg ~500 Mo dans l’image)
ENV AI_SPACY_MODEL=fr_core_news_sm
RUN python -m spacy download fr_core_news_sm

COPY . .

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
