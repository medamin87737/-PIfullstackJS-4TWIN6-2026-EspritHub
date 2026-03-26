# Workflow SkillUpTN

## Matrice des rôles (RH / Manager / Employé)

| Étape | RH | Manager | Employé |
|---|---|---|---|
| 1. Créer activité / besoin | Oui, crée activité ou approuve demande manager | Oui, peut demander activité | Non |
| 2. Lancer recommandation IA | Oui | Non | Non |
| 3. Ajuster liste recommandée (ajout/retrait) | Oui | Oui (dans son périmètre) | Non |
| 4. Valider RH vers manager | Oui, envoie la shortlist | Non | Non |
| 5. Décision finale des recommandés | Non (pas décisionnaire final) | Oui, accepte/rejette (unitaire + en masse) | Non |
| 6. Notification suite à décision manager | Oui / système | Oui, déclenche via validation | Oui, reçoit |
| 7. Réponse de participation | Non | Non | Oui, accepte/refuse (+ motif) |
| 8. Contrôle capacité (`nb_seats`) | Oui, supervision | Oui, blocage si capacité dépassée | Non |
| 9. Post-évaluation compétences | Oui, suivi global | Oui, évalue côté hiérarchie | Oui, auto-éval / historique |
| 10. Audit et historique | Oui, complet | Oui, activités + décisions | Oui, historique personnel |

## Règles workflow

- RH construit la recommandation et la transmet au manager.
- Manager décide qui participe réellement.
- Employé confirme ou refuse la participation.
- Le contrôle de capacité (`nb_seats`) doit empêcher toute validation au-delà du nombre de places.

## États recommandation attendus

- `PENDING` : recommandation générée, en attente RH.
- `HR_APPROVED` : validée par RH, visible manager.
- `MANAGER_APPROVED` : validée par manager.
- `MANAGER_REJECTED` : rejetée par manager.
- `NOTIFIED` : notification envoyée à l’employé.
- `ACCEPTED` : employé a accepté.
- `DECLINED` : employé a refusé.

## Checklist de validation rapide

- Le manager voit la liste des recommandés par activité.
- Le manager peut utiliser `Voir profil`, `Accepter`, `Rejeter`.
- Les actions de masse `Accepter tous` / `Rejeter tous` fonctionnent.
- L’employé reçoit notification après validation manager.
- L’employé peut accepter/refuser depuis son espace.
- Les historiques RH/Manager/Employé sont mis à jour.

