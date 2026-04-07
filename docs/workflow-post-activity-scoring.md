# Workflow Post-Activity Scoring (Auto Eval + Hierarchie Eval + IA)

Ce document définit le workflow complet pour:
- la saisie `auto_eval` par employé,
- la saisie `hierarchie_eval` par manager,
- le calcul du score final,
- l'intégration de ce score dans les recommandations IA futures.

---

## 1) Objectif fonctionnel

Après une activité terminée, le système doit:
1. collecter l'auto-évaluation de l'employé (`auto_eval`),
2. collecter l'évaluation manager (`hierarchie_eval`),
3. calculer un score final de compétence,
4. utiliser ce score dans les futures recommandations.

Formule recommandée:

`score_final = 0.7 * hierarchie_eval + 0.3 * auto_eval`

Bornes:
- toutes les notes dans `[0,10]`,
- score final arrondi à 2 décimales.

---

## 2) Workflow étape par étape

### Étape A - Activité terminée
- Condition d'entrée: activité statut `completed`.
- Action: ouvrir la phase "Post-Activity Scoring".

### Étape B - Saisie employé (`auto_eval`)
- Chaque employé participant voit ses compétences liées à l'activité.
- Il saisit une note `0..10` pour chaque compétence.
- Validation backend: note requise, numérique, bornée.
- Stockage: mise à jour `competence.auto_eval` + horodatage + source.

### Étape C - Saisie manager (`hierarchie_eval`)
- Le manager voit, pour chaque employé participant:
  - les compétences de l'activité,
  - le `auto_eval` déjà saisi,
  - un champ `hierarchie_eval` `0..10`.
- Le manager valide ou refuse.
- Stockage: `competence.hierarchie_eval`, décision manager, note optionnelle.

### Étape D - Calcul score final
- Condition: `auto_eval` et `hierarchie_eval` disponibles.
- Calcul:
  - `score_final = 0.7 * hierarchie_eval + 0.3 * auto_eval`.
- Mise à jour de la compétence.
- Historisation (audit) obligatoire avant/après.

### Étape E - Clôture
- Quand tous les participants sont traités:
  - statut post-évaluation = `closed`.
- Notifications:
  - employé: score validé,
  - manager/RH: cycle post-activité terminé.

---

## 3) Lieu d'intégration par interface (frontend)

## 3.1 Interface Employé
- Zone: pages employé (ex: activités, profil, ou page dédiée).
- Recommandé: ajouter une page dédiée:
  - `frontend/src/pages/employee/EmployeePostActivityScoring.tsx`
- Fonctionnalités UI:
  - liste activités terminées où l'employé a participé,
  - formulaire par compétence (`auto_eval`),
  - bouton `Soumettre auto-evaluation`.

Intégrations routing/navigation:
- `frontend/src/App.tsx` (route employé),
- `frontend/src/components/layout/Sidebar.tsx` (menu employé).

---

## 3.2 Interface Manager
- Recommandé: nouvelle page dédiée:
  - `frontend/src/pages/manager/ManagerPostActivityScoring.tsx`
- Fonctionnalités UI:
  - liste activités terminées,
  - détail participants inscrits,
  - affichage `auto_eval` par compétence,
  - saisie `hierarchie_eval`,
  - actions `Valider` / `Refuser`.

Intégrations routing/navigation:
- `frontend/src/App.tsx` (route manager),
- `frontend/src/components/layout/Sidebar.tsx` (menu manager).

---

## 3.3 Interface RH (optionnel mais recommandé)
- Ajout d'une vue lecture/contrôle:
  - `frontend/src/pages/hr/HRPostActivityAudit.tsx`
- Fonction:
  - suivi global des évaluations post-activité,
  - blocages et retards de saisie.

---

## 4) Lieu d'intégration backend (API + services)

## 4.1 Module recommandé
- Créer un module dédié:
  - `backend/src/post-activity-scoring/`
- Ou intégrer progressivement dans `recommendations`/`manager`/`employee`.

---

## 4.2 Endpoints API proposés

### Employé
- `GET /employee/post-activity/pending`
  - activités/compétences à auto-évaluer.
- `POST /employee/post-activity/:activityId/auto-eval`
  - payload: `[{ competenceId, auto_eval, comment? }]`.

### Manager
- `GET /manager/post-activity/completed`
  - activités terminées.
- `GET /manager/post-activity/:activityId/participants`
  - participants + auto_eval.
- `POST /manager/post-activity/:activityId/hierarchy-eval`
  - payload: `[{ employeeId, competenceId, hierarchie_eval, decision, note? }]`.

### RH (audit)
- `GET /hr/post-activity/:activityId/audit`
  - vue consolidée.

---

## 4.3 Services backend

Ajouter/adapter:
- service de validation des scores,
- service de calcul du `score_final`,
- service d'historisation:
  - collection/table `score_adjustments` (recommandé).

Champs d'historique minimum:
- `activityId`, `employeeId`, `competenceId`,
- `before_auto_eval`, `before_hierarchie_eval`,
- `after_auto_eval`, `after_hierarchie_eval`,
- `score_final`,
- `actorId`, `actorRole`, `decision`, `createdAt`.

---

## 5) Base de données - champs et logique

Champs déjà disponibles:
- `competence.auto_eval`
- `competence.hierarchie_eval`

Champs recommandés à ajouter:
- `competence.score_final` (optionnel mais pratique),
- `competence.last_scored_activity_id`,
- `competence.last_scored_at`.

Collection d'audit recommandée:
- `score_adjustments`.

---

## 6) Prise en compte dans les recommandations IA futures

## 6.1 Principe
Lors de la génération de recommandations, utiliser:
1. `score_final` si disponible,
2. sinon `hierarchie_eval`,
3. sinon `auto_eval`.

## 6.2 Intégration dans scoring
Dans le calcul de matching compétence:
- normaliser sur 10,
- calculer écart vs niveau requis,
- pondérer plus fortement les scores validés manager.

Exemple:
- `employee_skill_level = score_final / 10`
- score match augmenté si:
  - score récent,
  - progression positive observée,
  - validation manager présente.

## 6.3 Feedback loop
À chaque cycle post-activité:
- mise à jour des compétences,
- envoi d'un feedback au service IA (facultatif mais conseillé),
- impact direct sur les prochaines recommandations.

---

## 7) Règles de gouvernance et qualité

- Empêcher soumission hors bornes `[0,10]`.
- Bloquer double validation manager non voulue.
- Horodater chaque action.
- Tracer acteur et motif.
- Ne jamais écraser silencieusement une note sans historique.

---

## 8) Plan d'implémentation conseillé (ordre)

1. Créer endpoints employé auto_eval.
2. Créer page employé de saisie.
3. Créer endpoints manager hierarchy_eval.
4. Créer page manager post-activité.
5. Ajouter calcul `score_final`.
6. Ajouter historique `score_adjustments`.
7. Brancher recommandation IA sur `score_final`.
8. Ajouter vue RH audit.

---

## 9) Résumé décisionnel

- Oui, ce workflow est techniquement solide.
- Il faut bien 2 saisies séparées (`auto_eval` puis `hierarchie_eval`).
- Le score final doit être historisé.
- L'IA doit consommer ce score final pour améliorer les recommandations futures.

