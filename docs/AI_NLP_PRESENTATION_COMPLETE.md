# AI/NLP Presentation Complete

## 1) Contexte et objectif

Le module IA/NLP du projet `SkillUpTnFrontBack` transforme une description d'activite RH (prompt libre) en recommandations employees classees avec des scores detailles.

Objectifs metier:
- analyser automatiquement une description d'activite,
- extraire les competences et le contexte,
- scorer chaque employe sur plusieurs dimensions,
- classer et fournir des justifications lisibles par RH/Manager,
- enregistrer le feedback pour amelioration continue.

---

## 2) Architecture implementee (section par section)

### 2.1 Structure modulaire ajoutee dans `ai-service`

- `app/models/ai_models.py`
  - schemas Pydantic d'entree/sortie (`ActivityInput`, `EmployeeProfile`, `NLPResult`, `RecommendationOutput`, etc.).
- `app/services/nlp_service.py`
  - preprocessing texte, extraction competences depuis ontologie, detection contexte, embeddings.
- `app/services/scoring_engine.py`
  - moteur de scoring multi-criteres, priorisation contextuelle, tie-break.
- `app/services/llm_service.py`
  - extraction LLM, generation justification, analyse feedback, enrichissement ontologie, retry + circuit breaker.
- `app/services/feedback_processor.py`
  - enregistrement feedback, ajustement poids, policy de retrain.
- `app/services/post_activity_updater.py`
  - logique de delta post-activite (success/partial/fail).
- `app/routes/recommendations.py`
  - endpoints specifiques `/api/recommendations/*`.
- `data/skills_ontology.json`
  - dictionnaire de correspondance termes libres -> competences structurees.
- `config/model_weights.json`
  - poids actifs du moteur.

Le `main.py` FastAPI historique est conserve et raccorde a la couche modulaire.

---

## 3) Bibliotheques utilisees et justification

### 3.1 NLP / Embeddings

- `sentence-transformers` (SBERT)
  - modele utilise: `paraphrase-multilingual-mpnet-base-v2` (modulaire) + `paraphrase-multilingual-MiniLM-L12-v2` (legacy endpoint),
  - role: transformer descriptions activites et profils en vecteurs semantiques pour similarite.
  - pourquoi: robuste sur francais + multilingue, bonne qualite semantic search.

- `spaCy` (`fr_core_news_lg` si disponible)
  - role: tokenisation/lemmatisation FR pour extraction plus propre.
  - fallback automatique si modele indisponible (pipeline degrade mais fonctionnel).
  - pourquoi: standard NLP production, performant et interpretable.

### 3.2 ML / Scoring / Retrain

- `numpy`
  - role: calcul numerique (vecteurs, normalisation, regression de tendance).
- `scikit-learn`
  - role: calibrateur `LogisticRegression` sur feedback labelise.
- `scipy`
  - role prepare pour optimisation avancee des poids (alignement spec).

### 3.3 API / Validation / Infra

- `fastapi`
  - role: exposition API REST du service IA.
- `pydantic`
  - role: validation stricte des payloads.
- `python-dotenv`
  - role: gestion config env.
- `anthropic`
  - role: integration LLM Claude pour extraction/justification/analyse feedback.

---

## 4) Base de donnees et mapping champs (working data flow)

## 4.1 Tables/collections utilisees cote backend

- `users`
  - identite employe + role/departement.
- `fiches`
  - cycles d'evaluation (`saisons`, `etat`).
- `competences`
  - coeur des scores skills (`intitule`, `type`, `auto_eval`, `hierarchie_eval`, `etat`).
- `question_competence`
  - categories et taxonomie de competences.
- `recommendations`
  - sorties IA persistees pour workflow RH/Manager/Employee.

### 4.2 Choix des champs pour le calcul

- `hierarchie_eval` et `auto_eval`:
  - score competence final calcule par pondération:
  - `final_skill = 0.4 * auto_eval + 0.6 * hierarchie_eval`
  - justification: l'evaluation manager est plus fiable en contexte entreprise.

- `etat='validated'`:
  - seules les competences validees sont prises en compte (alignement spec).

- `date_embauche`:
  - facteur anciennete (`seniority_factor`) normalise 0..1.

- `historique` / participations:
  - composante `history_score`.

---

## 5) Formule de scoring implementee

Score global:

`S = w_sem*semantic + w_skill*skill_match + w_prog*progression + w_hist*history + w_seniority*seniority`

Poids par defaut (config):
- `w_sem = 0.25`
- `w_skill = 0.45`
- `w_prog = 0.15`
- `w_hist = 0.10`
- `w_seniority = 0.05`

Ils sont stockes dans:
- `config/model_weights.json`

et peuvent etre ajustes via feedback loop.

---

## 6) Priorisation contextuelle

Contextes supportes:
- `upskill_low`
- `consolidate_medium`
- `exploit_expert`

Comportement `skill_match`:
- `upskill_low`: favorise profils juste en dessous du niveau requis.
- `consolidate_medium`: favorise adequation autour du niveau cible (forme gaussienne).
- `exploit_expert`: favorise profils les plus forts (courbe exponentielle).

Tie-break implemente:
- progression,
- historique/coverage,
- anciennete,
- aleatoire controle pour equite.

---

## 7) Endpoints IA

### 7.1 Endpoints modulaires

- `POST /api/recommendations/generate`
  - input: description activite + employes + contexte/places.
  - output: `RecommendationOutput` complet.

- `POST /api/recommendations/{id}/feedback`
  - enregistre ajouts/retraits manager.

- `POST /api/recommendations/retrain-ai`
  - applique policy retrain/weight update (si seuil feedback atteint).

### 7.2 Endpoints historiques raccordes

- `POST /recommend`
- `POST /feedback`
- `POST /retrain`

Ces endpoints legacy utilisent desormais la couche modulaire pour coherence.

---

## 8) Sortie fonctionnelle pour RH (affichage frontend)

Cote `HRRecommendations`, la vue affiche:
- score total,
- score NLP (semantic),
- score competences (skill_match),
- score progression,
- score history,
- score seniority,
- justification detaillee (`recommendation_reason`).

La justification est:
- generee par LLM si disponible,
- fallback local sinon.

---

## 9) Tests et outputs executes

### 9.1 Tests unitaires ajoutes

Fichiers:
- `ai-service/tests/test_nlp_service.py`
- `ai-service/tests/test_scoring_engine.py`

Commande:

```bash
python -m pytest tests -q
```

Output observe:

```text
..                                                                       [100%]
2 passed in 7.49s
```

### 9.3 Entrainement calibrateur (pro)

Le calibrateur est entraine sur 6 features conformes au scoring du module:
- `score_total`
- `score_nlp`
- `score_competences`
- `score_progression`
- `score_history`
- `score_seniority`

Si le feedback labelise manager est encore faible (<20), un apprentissage faible supervise est applique en bootstrap depuis les scores reels:
- label positif si `score_total >= 0.65`
- label negatif si `score_total <= 0.40`

Commande de retrain:

```bash
curl -X POST http://127.0.0.1:8000/retrain
```

### 9.2 Verification syntaxe modules Python

Commande executee:

```bash
python -m py_compile main.py app/models/ai_models.py app/services/nlp_service.py app/services/scoring_engine.py app/services/feedback_processor.py app/services/llm_service.py app/services/post_activity_updater.py app/routes/recommendations.py
```

Resultat:
- succes (pas d'erreur syntaxique).

---

## 10) Exemples d'outputs techniques

### 10.1 Output seed competences reel Mongo

Resultat observe apres seed:
- Questions competences: `9`
- Fiches: `215`
- Competences: `1160`

### 10.2 Verification DB (compteurs)

Exemple verifie:
- users: `109`
- competences: `1160`
- fiches: `215`
- questioncompetences: `9`

---

## 11) Strategie de fallback et resilience

- Si LLM indisponible:
  - extraction NLP locale (spaCy + ontologie),
  - justification locale,
  - service continue sans interruption.

- LLM JSON:
  - parsing strict + retry.

- Circuit breaker:
  - desactivation temporaire apres echecs consecutifs.

---

## 12) Ce qui est conforme au document vs ce qui reste

Conforme/fait:
- architecture modulaire IA,
- extraction NLP + ontologie + embeddings,
- formule multi-criteres et contextes,
- feedback loop et retrain policy,
- endpoints dedies + legacy bridge,
- logs execution NLP/scoring,
- tests unitaires.

Reste pour alignement "plateforme complete" 100% spec:
- stack infra complete `Redis + Celery + RabbitMQ + pgvector` (si exigence stricte infra doc),
- pipeline de monitoring KPI automatise (NDCG, recall, precision top-N en batch),
- jeux de tests et benchmarks de charge plus larges.

---

## 13) Slides-ready summary (pour presentation orale)

- **Probleme**: selection manuelle lente/imprecise.
- **Solution**: moteur IA/NLP qui comprend le texte activite et score les employes sur 5 dimensions.
- **Valeur**:
  - transparence (breakdown detaille),
  - justifications RH lisibles,
  - amelioration continue par feedback.
- **Preuve technique**:
  - architecture modulaire,
  - tests passes,
  - donnees reelles Mongo,
  - endpoints operationnels.

