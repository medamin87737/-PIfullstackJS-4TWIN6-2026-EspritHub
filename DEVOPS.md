## Guide DevOps – SkillUpTN

Ce document explique **toute la partie DevOps** du projet SkillUpTN :

- Quels fichiers sont liés au DevOps.
- Comment installer / lancer / arrêter les différents services.
- Comment les outils **Docker, Jenkins, Kubernetes (Minikube), SonarQube, Prometheus, Grafana** sont reliés entre eux.
- Comment fonctionne le **pipeline CI/CD**.

---

## 1. Vue d’ensemble de l’architecture DevOps

Le projet est découpé en :

- `backend/` : API NestJS qui parle à MongoDB.
- `frontend/` : application React + Vite + Tailwind.
- `docker-compose.yml` (racine) : stack **MongoDB + backend + frontend** en Docker.
- `Jenkinsfile.ci.front`, `Jenkinsfile.cd.front`, `Jenkinsfile.ci.back`, `Jenkinsfile.cd.back` : 4 pipelines **CI/CD** séparés pour le frontend et le backend.
- (optionnel) un dossier `k8s/` pourra contenir des manifests Kubernetes si on choisit de déployer dans **Minikube** / Kubernetes.
- Stack de monitoring : **SonarQube**, **Prometheus**, **Grafana** tournent dans des conteneurs/K8s.

Relations principales :

- **Docker** exécute Mongo, backend, frontend, Jenkins, SonarQube.
- **Jenkins** utilise Docker pour builder les images, lancer les tests et déployer via `docker-compose`.
- **SonarQube** reçoit les analyses de code (lançées par Jenkins).
- **Minikube (Kubernetes)** peut exécuter une version “prod locale” de Mongo + backend + frontend.
- **Prometheus** collecte les métriques du cluster K8s, **Grafana** les affiche en dashboards.

---

## 2. Prérequis & environnement

### 2.1. Outils nécessaires

Sur chaque machine :

- Windows 10 / 11
- **WSL2** (Ubuntu recommandé)
- **Docker Desktop** (avec intégration WSL2 activée)
- **Git**

### 2.2. Chemin du projet

- Côté Windows : `C:\Users\amin\Desktop\FrontBackPi\SkillUpTN`
- Côté WSL : `/mnt/c/Users/amin/Desktop/FrontBackPi/SkillUpTN`

Toutes les commandes ci‑dessous sont à exécuter dans **WSL (Ubuntu)**, sauf mention contraire.

---

## 3. Fichiers DevOps importants

### 3.1. À la racine (`SkillUpTN/`)

- `docker-compose.yml`  
  - Lance 3 services Docker :
    - `mongo` : MongoDB (image `mongo:6.0`, port `27017`).
    - `backend` : API NestJS (`skilluptn-ci-cd-backend`, port `3000:3000`).
    - `frontend` : frontend React/Vite (`skilluptn-ci-cd-frontend`, port `80:80`).
  - Sert pour **les développeurs** et pour le déploiement dans les pipelines Jenkins.

- `Jenkinsfile.ci.front`  
  - Pipeline **CI** du frontend :
    - Checkout du repo.
    - Analyse SonarQube sur le dossier `frontend`.
    - Build de l’image Docker du frontend (`docker-compose build frontend`).

- `Jenkinsfile.cd.front`  
  - Pipeline **CD** du frontend :
    - Checkout du repo.
    - Build de l’image Docker du frontend.
    - Déploiement du conteneur frontend uniquement (`docker-compose up -d --no-deps --force-recreate frontend`).

- `Jenkinsfile.ci.back`  
  - Pipeline **CI** du backend :
    - Checkout du repo.
    - Analyse SonarQube sur le dossier `backend`.
    - Build de l’image Docker du backend (`docker-compose build backend`).
    - Lancement des tests backend (`docker-compose run --rm backend npm run test`).

- `Jenkinsfile.cd.back`  
  - Pipeline **CD** du backend :
    - Checkout du repo.
    - Build de l’image Docker du backend.
    - Démarrage de Mongo + (re)déploiement du backend (`docker-compose up -d mongo` puis `docker-compose up -d --force-recreate backend`).

- `DEVOPS.md` (ce fichier)  
  - Documentation détaillée de la chaîne DevOps.

### 3.2. Backend (`backend/`)

- `backend/Dockerfile`  
  - Construit l’image backend :
    - Utilise `node:20-alpine`.
    - `npm install`.
    - `npm run build` (Nest build vers `dist/`).
    - Commande finale : `node dist/main` (port 3000).

- `backend/package.json`  
  - Scripts clés :
    - `npm run build` : build Nest.
    - `npm run test` : tests unitaires (Jest).
    - `npm run start:dev` : démarrage en mode dev (hors conteneurs).

### 3.3. Frontend (`frontend/`)

- `frontend/Dockerfile`  
  - Multi‑stage :
    - Stage `build` : `npm install` + `npm run build` (Vite → `dist/`).
    - Stage `nginx` : copie `dist/` dans l’image `nginx:alpine` (port 80).

### 3.4. Kubernetes (`k8s/`)

Les manifests sont versionnés sous **`k8s/`** :

- `namespace.yaml` — namespace `skillup` ;
- `mongo.yaml` — MongoDB (PVC + Deployment + Service) ;
- `backend.yaml` — backend NestJS (Deployment + NodePort **30080**) ;
- `frontend.yaml` — frontend Nginx (Deployment + NodePort **30081**) ;

Voir **`k8s/README.md`** pour l’ordre d’application et l’URL **`VITE_API_URL`** au build Docker.  
Monitoring exemple : **`k8s/monitoring/`** (PrometheusRule + instructions Helm Grafana/Prometheus/Alertmanager).

---

## 4. Docker – Installation, start, stop, ports

### 4.1. Principe

On utilise Docker pour que tous les environnements (dev, CI, K8s) tournent sur les **mêmes images** :

- Backend → image Node NestJS.
- Frontend → image Nginx avec fichiers Vite buildés.
- MongoDB → image officielle.

### 4.2. Construire les images locales

Dans WSL :

```bash
cd /mnt/c/Users/amin/Desktop/FrontBackPi/SkillUpTN
docker compose build
```

Cela appelle :

- `backend/Dockerfile` → image `skilluptn-ci-cd-backend:latest`.
- `frontend/Dockerfile` → image `skilluptn-ci-cd-frontend:latest`.

### 4.3. Démarrer l’application complète (Docker local)

```bash
cd /mnt/c/Users/amin/Desktop/FrontBackPi/SkillUpTN
docker compose up -d
docker ps
```

Ports utilisés :

- Frontend : `80` → `http://localhost/`
- Backend : `3000` → `http://localhost:3000`
- MongoDB : `27017` (exposé pour debug éventuel).

### 4.4. Arrêter la stack Docker

```bash
cd /mnt/c/Users/amin/Desktop/FrontBackPi/SkillUpTN
docker compose down
```

---

## 5. Jenkins – CI/CD (4 pipelines séparés)

### 5.1. Pourquoi Jenkins ?

Au lieu de lancer manuellement `docker-compose build`, `npm test`, etc., Jenkins exécute
ces étapes automatiquement et trace les résultats :

- Build reproductible.
- Tests automatiques (Jest backend).
- Déploiement Docker reproductible.

### 5.2. Lancer Jenkins (une fois)

Dans WSL ou PowerShell :

```bash
docker network create jenkins-net
docker volume create jenkins_home

docker run -d --name jenkins --restart=unless-stopped \
  --network jenkins-net \
  -p 8080:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  jenkins/jenkins:lts-jdk17
```

Accès : `http://localhost:8080`

### 5.3. Configuration initiale Jenkins

1. Aller sur `http://localhost:8080`.
2. Récupérer le mot de passe admin initial :
   ```bash
   docker exec -it jenkins cat /var/jenkins_home/secrets/initialAdminPassword
   ```
3. Créer un utilisateur admin Jenkins.
4. Installer les plugins suggérés.

### 5.4. Créer les 4 jobs pipeline

Dans Jenkins, on crée **4 items (jobs)** de type **Pipeline** :

1. **CI-FRONT**  
   - New Item → nom : `CI-FRONT` → Pipeline.  
   - Pipeline script from SCM.  
   - SCM : Git.  
   - Repository URL :  
     `https://github.com/medamin87737/SkillUpTnFrontBack.git`  
   - Branches : `*/main`.  
   - Script Path : `Jenkinsfile.ci.front`.

2. **CD-Front** (nom exact pour le déclenchement automatique depuis le CI)  
   - New Item → nom : **`CD-Front`** → Pipeline.  
   - Même config SCM que ci‑dessus.  
   - Script Path : `Jenkinsfile.cd.front`.

3. **CI-BACK**  
   - New Item → nom : `CI-BACK` → Pipeline.  
   - Même config SCM.  
   - Script Path : `Jenkinsfile.ci.back`.

4. **CD-Back** (nom exact pour le déclenchement automatique depuis le CI)  
   - New Item → nom : **`CD-Back`** → Pipeline.  
   - Même config SCM.  
   - Script Path : `Jenkinsfile.cd.back`.

Si `CI-BACK` affiche « No item named … », le nom du job CD ne correspond pas à la variable **`CD_BACK_JOB`** dans `Jenkinsfile.ci.back` (par défaut **`CD-Back`**).

### 5.5. Rôle de chaque Jenkinsfile

- **`Jenkinsfile.ci.front`**  
  - CI du frontend uniquement : analyse SonarQube + build de l’image Docker du frontend.

- **`Jenkinsfile.cd.front`**  
  - CD du frontend : rebuild de l’image + redéploiement du conteneur frontend sans toucher au backend ni à Mongo.

- **`Jenkinsfile.ci.back`**  
  - CI du backend : analyse SonarQube + build de l’image + exécution des tests Jest dans un conteneur.

- **`Jenkinsfile.cd.back`**  
  - CD du backend : rebuild de l’image + démarrage de Mongo (si besoin) + redéploiement du conteneur backend.

### 5.6. Lancer les pipelines

Dans Jenkins, sur chaque job (`CI-FRONT`, `CD-Front`, `CI-BACK`, `CD-Back`) :

1. Cliquer sur **Build Now**.
2. Ouvrir la **Console Output** pour suivre les étapes du pipeline (checkout, analyse SonarQube, build Docker, tests éventuels, déploiement).

### 5.7. Check-list « les 4 pipelines au vert »

À valider **une fois** sur le contrôleur Jenkins / l’agent qui exécute les builds :

| Besoin | CI-Back / CI-Front | CD-Back / CD-Front |
|--------|-------------------|---------------------|
| **Outils Jenkins** | Global Tool : **Node20**, **SonarScanner** ; serveur Sonar : **SonarQubeServer** | — |
| **Credentials** | Token Sonar (via `SonarQubeServer`) | **`dockerhub-creds`** (Username/Password Docker Hub), **`kubeconfig`** (Secret file = fichier kubeconfig valide) |
| **Docker** | Non requis pour le CI actuel | CLI Docker sur l’agent + accès au daemon (ex. socket monté si Jenkins est en conteneur) |
| **Kubernetes** | Non | **`kubectl`** sur l’agent, cluster joignable avec ce kubeconfig |
| **Noms des jobs** | Déclenchent **`CD-Back`** et **`CD-Front`** (exact, sensible à la casse) | Jobs créés sous ces noms avec **Script Path** `Jenkinsfile.cd.back` / `Jenkinsfile.cd.front` |
| **Images Docker Hub** | — | Les Jenkinsfiles CD utilisent **`workapp21/skillup-backend`** et **`workapp21/skillup-frontend`** (alignés sur `dockerhub-creds`). Crée ces dépôts sur Docker Hub ou change `DOCKER_IMAGE` dans les `Jenkinsfile.cd.*`. |

**Ordre de test manuel conseillé** : **CI-Back** → **CI-FRONT** (vérifier succès) → **CD-Back** → **CD-Front** (Docker + push + kubectl). Pour le frontend en cluster, définir sur le job **CD-Front** une variable **`FRONTEND_VITE_API_URL`** (ex. `http://<IP-noeud>:30080`) à la place du placeholder `NODE_IP`.

---

## 6. SonarQube – Qualité de code

### 6.1. Rôle

SonarQube est un serveur qui analyse le code source (backend + frontend) pour :

- Bugs potentiels.
- Vulnérabilités.
- Code smells (mauvaise qualité).
- Duplications, complexité, couverture de tests (si configuré).

Le pipeline Jenkins peut appeler SonarQube pour chaque build.

### 6.2. Lancer SonarQube

```bash
docker run -d --name sonarqube -p 9000:9000 sonarqube:lts

# Vérifier
docker ps   # sonarqube doit apparaître
```

Accès : `http://localhost:9000`

### 6.3. Première configuration SonarQube

1. Aller sur `http://localhost:9000`.
2. Login : `admin` / `admin`, puis choisir un nouveau mot de passe.
3. Créer un projet :
   - Project key : `SkillUpTN`
   - Name : `SkillUpTN`
4. Créer un **token d’analyse** (ex : `jenkins-sonar`) et le garder pour la config Jenkins.

### 6.4. Relation Jenkins ↔ SonarQube

1. Jenkins installe le plugin **SonarQube Scanner**.
2. Dans **Manage Jenkins → Configure System → SonarQube servers** :
   - On ajoute un serveur nommé **`SonarQubeServer`** (identique au `withSonarQubeEnv(...)` des Jenkinsfiles).
   - URL : `http://host.docker.internal:9000` (vu depuis le conteneur Jenkins).
   - Token : on crée un credential “Secret text” avec le token Sonar.
3. **Quality Gate dans le CI** : dans SonarQube, **Administration → Configuration → Webhooks**, ajouter l’URL fournie par le plugin Sonar pour Jenkins (`waitForQualityGate`). Sans webhook, le stage **Sonar Quality Gate** peut rester bloqué jusqu’au timeout.  
   - Variables d’environnement des jobs **CI-BACK** / **CI-FRONT** : par défaut **`SONAR_WAIT_QUALITY_GATE=false`** (CI vert si tests + build OK). Mettre **`true`** sur le job pour **faire échouer** le pipeline quand la Quality Gate Sonar échoue (webhook obligatoire).
4. Dans **Global Tool Configuration → SonarQube Scanner** :
   - On configure un scanner nommé `SonarScanner`.
5. Les Jenkinsfiles de **CI** peuvent contenir un stage `SonarQube Analysis` qui :
   - Utilise `withSonarQubeEnv('SonarQubeServer')` pour se connecter.
   - Appelle `sonar-scanner` sur les dossiers `backend` et `frontend`.

Les résultats sont visibles dans l’UI SonarQube pour le projet `SkillUpTN`.

---

## 7. Kubernetes / Minikube – Déploiement “type prod”

### 7.1. Pourquoi Minikube ?

Docker Compose déploie tout sur la même machine, mais sans orchestrateur.
Kubernetes (via Minikube) permet de tester :

- Pods, Services, Deployments.
- Scaling automatique éventuel.
- Intégration avec Prometheus / Grafana.

### 7.2. Démarrer Minikube

```bash
minikube start --driver=docker --cpus=2 --memory=4096mb
kubectl get nodes
```

### 7.3. Construire les images dans l’environnement Minikube

Pour que Minikube trouve les images locales :

```bash
cd /mnt/c/Users/amin/Desktop/FrontBackPi/SkillUpTN

# Basculer le Docker CLI sur le Docker interne de Minikube
eval $(minikube docker-env)

# Re‑construire les images dans le daemon Docker de Minikube
docker build -t skilluptn-ci-cd-backend -f backend/Dockerfile backend
docker build -t skilluptn-ci-cd-frontend -f frontend/Dockerfile frontend
```

### 7.4. Appliquer les manifests K8s (si présents)

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/mongo.yaml -n skilluptn
kubectl apply -f k8s/backend.yaml -n skilluptn
kubectl apply -f k8s/frontend.yaml -n skilluptn

kubectl get pods -n skilluptn
```

### 7.5. Accéder au frontend via Minikube

```bash
minikube service frontend -n skilluptn --url
```

Cette commande renvoie une URL de type : `http://192.168.49.2:30080` à utiliser dans le navigateur.

---

## 8. Monitoring – Prometheus & Grafana

### 8.1. Rôle

- **Prometheus** : collecte les métriques du cluster (CPU, RAM pods, état, etc.).
- **Grafana** : crée des dashboards pour visualiser ces métriques.

On utilise le chart Helm `kube-prometheus-stack` qui installe l’ensemble :

- Prometheus.
- Grafana.
- Alertmanager.
- Exporters / kube-state-metrics.

### 8.2. Installer le stack de monitoring

```bash
kubectl create namespace monitoring

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install monitoring prometheus-community/kube-prometheus-stack -n monitoring

kubectl get pods -n monitoring
```

### 8.3. Accéder à Grafana

```bash
# Récupérer le mot de passe admin
kubectl get secret -n monitoring monitoring-grafana \
  -o jsonpath="{.data.admin-password}" | base64 -d
echo

# Port-forward depuis K8s vers la machine locale
kubectl port-forward -n monitoring svc/monitoring-grafana 32000:80
```

Dans le navigateur : `http://localhost:32000`  
Login : `admin` / mot de passe décodé.

### 8.4. Accéder à Prometheus

```bash
kubectl port-forward -n monitoring \
  svc/monitoring-kube-prometheus-prometheus 32010:9090
```

Dans le navigateur : `http://localhost:32010`

### 8.5. Exemple de métriques utiles

Dans Prometheus (UI) :

- État des pods SkillUpTN :
  ```promql
  kube_pod_container_status_ready{namespace="skilluptn"}
  ```
- CPU pods SkillUpTN :
  ```promql
  rate(container_cpu_usage_seconds_total{namespace="skilluptn"}[5m])
  ```
- Mémoire pods SkillUpTN :
  ```promql
  container_memory_working_set_bytes{namespace="skilluptn"}
  ```

Dans Grafana :

- Utiliser les dashboards pré‑configurés : “Kubernetes / Compute Resources / Pod”.
- Filtrer sur `namespace = skilluptn` et `pod = backend-...` ou `frontend-...`.

---

## 9. Résumé des commandes start / stop

### 9.1. Application Docker (Mongo + API + UI)

```bash
cd /mnt/c/Users/amin/Desktop/FrontBackPi/SkillUpTN

# Start
docker compose up -d

# Stop
docker compose down
```

### 9.2. Jenkins & SonarQube

```bash
# Start
docker start jenkins sonarqube

# Stop
docker stop jenkins sonarqube
```

### 9.3. Minikube

```bash
minikube start    # démarrer le cluster local
minikube stop     # arrêter le cluster
```

### 9.4. Monitoring (port-forward)

```bash
# Grafana
kubectl port-forward -n monitoring svc/monitoring-grafana 32000:80
# → http://localhost:32000

# Prometheus
kubectl port-forward -n monitoring svc/monitoring-kube-prometheus-prometheus 32010:9090
# → http://localhost:32010
```

---

## 10. URLs pour tester l’application & les outils

- **Frontend (Docker)** : `http://localhost/`
- **Backend API (Docker)** : `http://localhost:3000`
- **Frontend (Minikube)** : `minikube service frontend -n skilluptn --url`
- **Jenkins** : `http://localhost:8080`
- **SonarQube** : `http://localhost:9000`
- **Grafana** : `http://localhost:32000`
- **Prometheus** : `http://localhost:32010`

Ce fichier peut être partagé directement à l’équipe pour les guider dans
l’installation et l’utilisation de toute la chaîne DevOps autour de SkillUpTN.

---

## 11. Alignement exigences encadrant (checklist soutenance)

### 11.1. Quatre pipelines Jenkins

| Fichier | Rôle |
|--------|------|
| `Jenkinsfile.ci.back` | CI backend : checkout → install → **tests** (`test:ci`) → **Sonar** → build |
| `Jenkinsfile.ci.front` | CI frontend : idem avec Vitest + couverture |
| `Jenkinsfile.cd.back` | CD backend : image Docker → push Hub → **Trivy** (si installé) → **Kubernetes** (mongo + backend) |
| `Jenkinsfile.cd.front` | CD frontend : build avec `VITE_API_URL` → push → **Trivy** (si installé) → **Kubernetes** |

- Après succès du CI, le job CD correspondant est déclenché (`build job: CD-Front` / `CD-Back`).
- Jobs Jenkins à créer avec les **mêmes noms** : `CD-Front`, `CD-Back` (ou adapter les variables d’environnement en tête de fichier).

### 11.2. SonarQube et couverture

- Fichiers **`backend/sonar-project.properties`** et **`frontend/sonar-project.properties`** : clés projet, sources, tests, **`lcov.info`**.
- Le scanner est invoqué depuis le dossier `backend/` ou `frontend/` après les tests (génération de `coverage/lcov.info`).
- **Quality Gate** : dans les CI, stage optionnel contrôlé par la variable d’environnement Jenkins **`SONAR_WAIT_QUALITY_GATE=true`** (nécessite le plugin *SonarQube Scanner* + webhook Sonar ↔ Jenkins). Par défaut `false` pour ne pas bloquer si le webhook n’est pas encore configuré.

### 11.3. Kubernetes (kubeadm)

- Manifests dans **`k8s/`** : namespace **`skillup`**, Mongo, backend (NodePort **30080**), frontend (NodePort **30081**).
- Probes **liveness/readiness** sur les deployments backend et frontend.
- Ordre d’application et URL **`VITE_API_URL`** pour le navigateur : **`k8s/README.md`**.

### 11.4. Monitoring et alerting

- Instructions Helm **kube-prometheus-stack** + Alertmanager : **`k8s/monitoring/README.md`**.
- Règle Prometheus exemple : **`k8s/monitoring/skillup-prometheus-rule.yaml`** (adapter le label `release` au nom de ton release Helm).

### 11.5. Excellence (bonus)

- Étapes **Trivy** dans les CD : si la commande `trivy` est disponible sur l’agent Jenkins, scan automatique de l’image ; sinon message informatif sans échec du pipeline.

### 11.6. Preuves à préparer (captures / démo live)

1. Jenkins : les **4 pipelines** + enchaînement CI → CD.  
2. Sonar : **avant / après** refactoring + **couverture** visible.  
3. `kubectl get nodes` (cluster kubeadm groupe) + `kubectl get pods -n skillup`.  
4. Navigateur : frontend + appels API (NodePorts).  
5. Grafana + **Alertmanager** (au moins une alerte ou receiver de test).

