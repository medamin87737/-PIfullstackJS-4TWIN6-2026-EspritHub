# SkillUpTn - Model System Guide (Complete)

## 1) Purpose

This document explains, end-to-end:
- how the recommendation model works,
- which collections/tables are used,
- which features and formulas are applied,
- how training/retraining works,
- which libraries are used.

It is written for HR, Manager, and technical teams.

---

## 2) Global Architecture

### Components
- **Frontend**: React + TypeScript (`frontend/`)
- **Backend API**: NestJS + MongoDB (`backend/`)
- **AI Service**: FastAPI Python (`ai-service/`)

### Main flow
1. RH writes prompt (Top_n + required skills).
2. Front sends prompt to backend: `POST /api/recommendations/generate`.
3. Backend builds eligible employees and sends to AI service `/recommend`.
4. AI service computes scores and returns ranked recommendations.
5. Backend persists recommendations in MongoDB and notifies RH/Manager.

---

## 3) Core Collections (MongoDB)

## `users`
- employee/manager/hr/admin profiles
- key fields: `role`, `status`, `department_id`, `date_embauche`

## `departments`
- department metadata and manager link
- key fields: `name`, `code`, `manager_id`

## `fiches`
- employee skill snapshots (season/history)
- key fields: `user_id`, `etat`, `saisons`

## `competences`
- evaluated competences per fiche
- key fields: `intitule`, `auto_eval`, `hierarchie_eval`, `type`, `etat`

## `question_competences`
- global skill catalog used in forms/prompt support
- key fields: `intitule`, `details`, `status`, `type`

## `activities`
- RH/Manager activity definitions
- key fields: `title`, `description`, `requiredSkills`, `maxParticipants`

## `recommendations`
- ranking output by activity/employee
- key fields:
  - `score_total`, `score_nlp`, `score_competences`,
  - `score_progression`, `score_history`, `score_seniority`,
  - `rank`, `status`, `employee_response`, `hr_note`, `manager_note`

## `activity_history`
- post-response learning trace
- key fields: `status`, `feedback`, `skill_updates`, `completed_at`

## `notifications`
- in-app notifications for HR/Manager/Employee
- key fields: `type`, `title`, `message`, `data`, `read`

---

## 4) Prompt Parsing and Validation

## Recommended strict prompt format
```text
Top_n: 38
Competences obligatoires et niveaux cibles:
- Docker Kubernetes niveau 3
- DevOps niveau 3
- Gestion du temps niveau 4
Contexte activite: Recruitment Excellence 22
Description: Programme de formation cible.
```

## Backend parsing behavior
- Supports `niveau|level|niv|lvl|n.` syntax.
- Supports bullet lines `- skill`.
- Cleans punctuation and duplicate skills.
- Validates skills against:
  - employee skill pool,
  - competence catalog,
  - question-competence catalog (active).

---

## 5) Scoring Features

AI service score breakdown:
- `score_nlp` (semantic similarity)
- `score_competences` (skill/level matching)
- `score_progression` (context-dependent progression bonus)
- `score_history` (activity history fitness)
- `score_seniority` (tenure factor)

### Default weight vector
From `ai-service/main.py`:
- `w_sem = 0.25`
- `w_skill = 0.45`
- `w_prog = 0.15`
- `w_hist = 0.10`
- `w_seniority = 0.05`

Can be overridden via env: `AI_SCORING_WEIGHTS` (JSON).

---

## 6) Skill Match Calculation

For each required skill:
- normalize labels (case, accents, punctuation),
- exact match first,
- substring/fuzzy token similarity fallback.

Contribution logic:
- if employee level >= required level => full weight,
- else partial = `weight * (employee_level / required_level)`.

Final skill score:
`score_competences = sum(contributions) / sum(weights)`

---

## 7) Ranking and Top_n Guarantees

Backend enforces `Top_n` target:
- parse from prompt (`Top_n` or natural phrase),
- sort by rank/score,
- cut to target,
- if AI returns too few rows, backend fills with remaining eligible employees.

Also excludes employees who already declined same activity during regeneration.

---

## 8) Post-Response Learning (Employee Accept/Decline)

When employee responds:
- justification is mandatory for decline,
- reason is stored and visible for RH,
- skill updates are applied to activity-related skills.

Level-aware deltas:
- level 1 => +/-0.20
- level 2 => +/-0.30
- level 3 => +/-0.40
- level 4 => +/-0.50
- level 5 => +/-0.60

Accept => increase, Decline => decrease, bounded in `[0, 10]`.

All updates are logged in `activity_history.skill_updates` and notifications.

---

## 9) Retraining Pipeline

Endpoint:
- `POST /api/recommendations/retrain-ai` (HR/ADMIN)

What it does:
1. Reads feedback events.
2. Builds labeled dataset (`accepted/approved=1`, `declined/rejected=0`).
3. If labels are low, uses weak supervision fallback from feature logs.
4. Trains calibrator (`LogisticRegression`).
5. Saves model to `data/models/score_calibrator.pkl`.

Recent run status:
- `trained: true`
- `samples: 39`
- message: `Calibrator model retrained and saved`

---

## 10) Main API Endpoints

Recommendation:
- `POST /api/recommendations/generate`
- `GET /api/recommendations/activity/:activityId`
- `POST /api/recommendations/hr-validate`
- `POST /api/recommendations/manager-validate`
- `POST /api/recommendations/respond`
- `POST /api/recommendations/hr-adjust-score`

Skill catalog:
- `GET /users/competences/all` (HR/MANAGER/ADMIN)
- `GET /users/question-competences/all` (HR/MANAGER/ADMIN)
- `POST /users/question-competences` (HR/MANAGER/ADMIN)

---

## 11) Libraries Used

### Backend (NestJS)
- `@nestjs/common`, `@nestjs/mongoose`, `@nestjs/axios`
- `mongoose`
- validation (`class-validator`, `class-transformer`)

### AI Service (Python)
- `fastapi`, `pydantic`
- `sentence-transformers`
- `scikit-learn` (LogisticRegression)
- `python-dotenv`
- optional `anthropic` client

### Frontend
- `react`, `react-router-dom`
- `lucide-react`
- toast system in `hooks/use-toast.ts`

---

## 12) Operational Notes

- Prompt should stay concise and structured.
- Keep skill names consistent with catalog names.
- Use RH popup to resolve missing skills before launch.
- Use retraining regularly after enough feedback.

---

## 13) Export to PDF

This Markdown can be exported to PDF directly from IDE:
- Open file in editor
- Print / Export as PDF

For a styled version, see:
- `docs/MODEL_SYSTEM_GUIDE_COLOR.html`

