# Configuration Python 3.10 pour Rasa

## Problème

Rasa nécessite Python 3.10, mais votre système utilise Python 3.11. Cette incompatibilité empêche l'installation et l'exécution de Rasa.

## Solutions

### Option 1: pyenv (Recommandé pour Linux/Mac)

pyenv permet de gérer plusieurs versions de Python sur le même système.

#### Installation de pyenv

```bash
# Linux/Mac
curl https://pyenv.run | bash

# Ajouter à ~/.bashrc ou ~/.zshrc
export PATH="$HOME/.pyenv/bin:$PATH"
eval "$(pyenv init -)"
eval "$(pyenv virtualenv-init -)"

# Recharger le shell
source ~/.bashrc  # ou source ~/.zshrc
```

#### Installation de Python 3.10

```bash
# Installer Python 3.10.13
pyenv install 3.10.13

# Vérifier l'installation
pyenv versions
```

#### Création de l'environnement pour Rasa

```bash
# Créer un environnement virtuel
pyenv virtualenv 3.10.13 rasa-env

# Activer l'environnement
pyenv activate rasa-env

# Vérifier la version
python --version  # Doit afficher: Python 3.10.13
```

#### Utilisation

```bash
# Activer l'environnement (à faire à chaque session)
pyenv activate rasa-env

# Installer Rasa
pip install rasa

# Travailler avec Rasa
cd rasa-chatbot
rasa train
rasa run --enable-api --cors '*'

# Désactiver l'environnement
pyenv deactivate
```

---

### Option 2: Conda/Miniconda (Recommandé pour Windows)

Conda est une alternative qui fonctionne bien sur tous les systèmes d'exploitation.

#### Installation de Miniconda

Télécharger depuis: https://docs.conda.io/en/latest/miniconda.html

Ou via ligne de commande:

```bash
# Linux
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh
bash Miniconda3-latest-Linux-x86_64.sh

# Mac
wget https://repo.anaconda.com/miniconda/Miniconda3-latest-MacOSX-x86_64.sh
bash Miniconda3-latest-MacOSX-x86_64.sh

# Windows: Télécharger l'installeur .exe depuis le site
```

#### Création de l'environnement pour Rasa

```bash
# Créer un environnement avec Python 3.10
conda create -n rasa-env python=3.10

# Activer l'environnement
conda activate rasa-env

# Vérifier la version
python --version  # Doit afficher: Python 3.10.x
```

#### Utilisation

```bash
# Activer l'environnement (à faire à chaque session)
conda activate rasa-env

# Installer Rasa
pip install rasa

# Travailler avec Rasa
cd rasa-chatbot
rasa train
rasa run --enable-api --cors '*'

# Désactiver l'environnement
conda deactivate
```

---

### Option 3: Docker (Alternative)

Si vous ne souhaitez pas gérer les versions Python, utilisez Docker.

#### Créer un Dockerfile

Créer `rasa-chatbot/Dockerfile`:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Installer Rasa
RUN pip install --no-cache-dir rasa

# Copier les fichiers du projet
COPY . /app

# Entraîner le modèle
RUN rasa train

# Exposer le port
EXPOSE 5005

# Démarrer le serveur
CMD ["rasa", "run", "--enable-api", "--cors", "*"]
```

#### Utilisation avec Docker

```bash
# Construire l'image
cd rasa-chatbot
docker build -t rasa-chatbot .

# Démarrer le conteneur
docker run -p 5005:5005 rasa-chatbot

# Le serveur sera accessible sur http://localhost:5005
```

---

## Configuration Automatique du Projet

### Créer un script d'activation

Créer `rasa-chatbot/activate.sh`:

```bash
#!/bin/bash

# Détecter le gestionnaire d'environnement disponible
if command -v pyenv &> /dev/null; then
    echo "Activation de l'environnement pyenv..."
    pyenv activate rasa-env
elif command -v conda &> /dev/null; then
    echo "Activation de l'environnement conda..."
    conda activate rasa-env
else
    echo "Erreur: Ni pyenv ni conda n'est installé."
    echo "Veuillez installer l'un des deux. Voir PYTHON_VERSION_SETUP.md"
    exit 1
fi

# Vérifier la version Python
PYTHON_VERSION=$(python --version 2>&1 | awk '{print $2}')
if [[ $PYTHON_VERSION == 3.10.* ]]; then
    echo "✓ Python 3.10 activé: $PYTHON_VERSION"
else
    echo "✗ Erreur: Python $PYTHON_VERSION détecté. Python 3.10 requis."
    exit 1
fi

# Vérifier que Rasa est installé
if ! command -v rasa &> /dev/null; then
    echo "Rasa n'est pas installé. Installation en cours..."
    pip install rasa
fi

echo "✓ Environnement prêt pour Rasa"
echo ""
echo "Commandes disponibles:"
echo "  rasa train                          # Entraîner le modèle"
echo "  rasa run --enable-api --cors '*'    # Démarrer le serveur"
echo "  rasa test                           # Tester le modèle"
```

Rendre le script exécutable:
```bash
chmod +x activate.sh
```

Utilisation:
```bash
source activate.sh
```

---

## Vérification de l'Installation

Une fois l'environnement configuré, vérifier que tout fonctionne:

```bash
# 1. Vérifier Python
python --version
# Attendu: Python 3.10.x

# 2. Vérifier Rasa
rasa --version
# Attendu: Rasa 3.x.x

# 3. Tester l'entraînement
cd rasa-chatbot
rasa train
# Attendu: Modèle créé dans models/

# 4. Tester le serveur
rasa run --enable-api --cors '*' &
sleep 5
curl http://localhost:5005/webhooks/rest/webhook \
  -H "Content-Type: application/json" \
  -d '{"sender": "test", "message": "bonjour"}'
# Attendu: Réponse JSON avec le message du bot
```

---

## Dépannage

### Erreur: "command not found: pyenv"

**Solution**: pyenv n'est pas installé ou pas dans le PATH.

```bash
# Vérifier l'installation
ls ~/.pyenv

# Si le dossier existe, ajouter au PATH
echo 'export PATH="$HOME/.pyenv/bin:$PATH"' >> ~/.bashrc
echo 'eval "$(pyenv init -)"' >> ~/.bashrc
source ~/.bashrc
```

---

### Erreur: "No such command 'activate'"

**Solution**: pyenv-virtualenv n'est pas installé.

```bash
# Installer pyenv-virtualenv
git clone https://github.com/pyenv/pyenv-virtualenv.git $(pyenv root)/plugins/pyenv-virtualenv

# Ajouter au shell
echo 'eval "$(pyenv virtualenv-init -)"' >> ~/.bashrc
source ~/.bashrc
```

---

### Erreur: "Python 3.10.13 is not installed"

**Solution**: Installer Python 3.10 avec pyenv.

```bash
# Installer les dépendances de build (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install -y make build-essential libssl-dev zlib1g-dev \
  libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm \
  libncursesw5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev \
  libffi-dev liblzma-dev

# Installer Python 3.10
pyenv install 3.10.13
```

---

### Erreur lors de l'installation de Rasa

**Erreur**: `error: Microsoft Visual C++ 14.0 or greater is required` (Windows)

**Solution**: Installer Visual Studio Build Tools depuis:
https://visualstudio.microsoft.com/downloads/

---

## Ressources

- [pyenv GitHub](https://github.com/pyenv/pyenv)
- [Conda Documentation](https://docs.conda.io/)
- [Rasa Installation Guide](https://rasa.com/docs/rasa/installation/)
- [Docker Documentation](https://docs.docker.com/)

---

## Résumé

| Méthode | Avantages | Inconvénients |
|---------|-----------|---------------|
| **pyenv** | Léger, contrôle précis des versions | Configuration initiale plus complexe |
| **Conda** | Facile à utiliser, multiplateforme | Plus lourd, gère aussi les packages non-Python |
| **Docker** | Isolation complète, reproductible | Nécessite Docker, plus de ressources |

**Recommandation**: 
- Linux/Mac: pyenv
- Windows: Conda
- CI/CD ou déploiement: Docker
