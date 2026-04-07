# Backlog SkillUpTN (version lisible et organisee)

Equipe: `amin`, `sahar`, `ons`, `marwa`, `ghada`  
Principe: repartition **par type de tache** et **equilibree** pour tous.

Scope exclu:
- APIs externes
- fonctions avancees (IA/cloud)

---

## 1) Workflow global du projet

1. Authentification et roles
2. CRUD referentiels (users, departments, skills)
3. Activites (creation RH, demande manager)
4. Validations RH/Manager des recommandations
5. Reponse employe + notifications
6. Post-activite scoring
7. Historique et reporting

---

## 2) Regle de division egale

Chaque membre doit couvrir:
- `ADD` (creation)
- `GET` (lecture/listes)
- `UPDATE` (modification)
- `DELETE` (suppression)
- `QA` (liaison boutons, verification, tests)

---

## 3) Matrice de repartition (equilibree)

| Personne | ADD | GET | UPDATE | DELETE | QA / Liaison |
|---|---|---|---|---|---|
| amin | Ajouter activite RH | Lire activites employe | Modifier decision manager | Supprimer brouillon activite | Verifier boutons RH |
| sahar | Ajouter demande manager | Lire activites manager | Modifier statut recommandation | Supprimer brouillon demande | Verifier filtres manager |
| ons | Ajouter reponse employe | Lire notifications employe | Modifier profil employe | Supprimer brouillon reponse | Verifier parcours employe |
| marwa | Ajouter user/department admin | Lire listes admin | Modifier users/departments | Supprimer users/departments | Verifier regles CRUD admin |
| ghada | Ajouter logs audit | Lire historique/audit | Modifier read/unread notifications | Supprimer logs obsoletes | QA E2E + popups |

---

## 4) Backlog par etape (travail en parallele)

## Etape 1 - Auth + shell
- amin: ADD login submit + GET widgets RH
- sahar: GET dashboard manager + UPDATE session guard
- ons: UPDATE online status + GET home employe
- marwa: GET users admin + DELETE user de test
- ghada: ADD audit login + QA acces par role

## Etape 2 - Referentiels
- amin: ADD question competence + GET departments + UPDATE form + DELETE test row
- sahar: ADD lookup manager + GET manager lists + UPDATE filters + DELETE temp row
- ons: ADD section profil + GET employee data + UPDATE profil + DELETE draft
- marwa: ADD user/department + GET admin grids + UPDATE rows + DELETE rows
- ghada: ADD CRUD logs + GET audit feed + UPDATE flags + DELETE old logs

## Etape 3 - Activites
- amin: ADD activite RH + GET RH activities + UPDATE activite + DELETE draft
- sahar: ADD demande manager + GET manager activities + UPDATE demande + DELETE demande
- ons: ADD note employe + GET employee activities + UPDATE accept/refuse + DELETE draft
- marwa: ADD integrity checks + GET admin control + UPDATE rules + DELETE invalid links
- ghada: ADD action logs + GET timeline + UPDATE state + DELETE old logs + QA popups

## Etape 4 - Recommandations / validations
- amin: ADD generate recommendation + GET RH list + UPDATE RH decision + DELETE RH manual row
- sahar: ADD batch manager decision + GET pending + UPDATE manager decision + DELETE rejected row (policy)
- ons: ADD justification employe + GET own recs + UPDATE accept/decline + DELETE draft
- marwa: ADD admin rec repair + GET admin rec view + UPDATE consistency + DELETE invalid rec
- ghada: ADD transition logs + GET transitions + UPDATE tags + DELETE stale logs + QA

## Etape 5 - Post-activite scoring
- amin: ADD score trigger + GET score RH + UPDATE local rules + DELETE score draft
- sahar: ADD hierarchy eval + GET completed activities + UPDATE manager eval + DELETE draft eval
- ons: ADD auto_eval + GET post-activity tasks + UPDATE auto_eval + DELETE unsent draft
- marwa: ADD admin correction + GET score table + UPDATE limits + DELETE invalid score
- ghada: ADD score audit + GET score history + UPDATE states + DELETE old logs + QA formule

## Etape 6 - Historique / reporting
- amin: ADD RH report row + GET RH history + UPDATE metadata + DELETE draft
- sahar: ADD manager note + GET manager history + UPDATE report status + DELETE invalid row
- ons: ADD employee event + GET employee history + UPDATE label + DELETE draft event
- marwa: ADD admin maintenance + GET admin history + UPDATE retention + DELETE obsolete rows
- ghada: ADD QA checklist + GET test evidence + UPDATE test status + DELETE temp evidence

---

## 5) Definition of Done (par ticket)

- endpoint backend OK (2xx + erreurs 4xx gerees),
- bouton frontend branche au bon endpoint,
- popup succes/erreur affiche,
- verification role/permission,
- test manuel avec preuve (capture/log).

---

## 6) Validation finale pour le prof

Le backlog montre clairement:
- un workflow complet,
- un travail en parallele,
- une repartition egale entre 5 personnes,
- une contribution front + back pour chacun.
