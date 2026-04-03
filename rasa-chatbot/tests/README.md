# Tests Rasa Chatbot

Ce répertoire contient les tests pour valider la configuration et les données d'entraînement du chatbot Rasa.

## Installation des dépendances

```bash
pip install -r requirements-test.txt
```

## Exécution des tests

### Tous les tests
```bash
pytest tests/ -v
```

### Tests de complétude uniquement
```bash
pytest tests/test_training_completeness.py -v
```

## Tests disponibles

### test_training_completeness.py

**Property 10: Complétude des exemples d'entraînement**
- Valide que chaque intent (explain_activity, why_recommended, skills_gained) a au moins 10 exemples d'entraînement
- Vérifie la structure du fichier nlu.yml
- Vérifie que les exemples sont uniques (pas de doublons)
- **Valide: Exigences 4.4**

#### Tests inclus:
- `test_property_10_all_intents_have_minimum_examples`: Vérifie que tous les intents requis ont au moins 10 exemples
- `test_explain_activity_completeness`: Vérifie l'intent explain_activity
- `test_why_recommended_completeness`: Vérifie l'intent why_recommended
- `test_skills_gained_completeness`: Vérifie l'intent skills_gained
- `test_nlu_file_structure`: Vérifie la structure du fichier nlu.yml
- `test_examples_are_unique`: Vérifie qu'il n'y a pas de doublons dans les exemples

## Résultats attendus

Tous les tests doivent passer (PASSED) pour garantir que les données d'entraînement sont complètes et valides.
