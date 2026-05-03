# Déploiement Kubernetes (kubeadm — master + workers)

**Pas de TP fourni par le cours ?** Suis le guide pas à pas **[KUBEADM-TUTORIAL.md](./KUBEADM-TUTORIAL.md)** (1 master + 2 workers, Ubuntu, Flannel).

## Ordre recommandé (première fois)

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/mongo.yaml
kubectl wait --for=condition=available deployment/mongo -n skillup --timeout=120s
# Secret Anthropic (une fois, ne pas commiter la clé) :
kubectl create secret generic ai-service-secrets -n skillup \
  --from-literal=ANTHROPIC_API_KEY='VOTRE_CLE_ANTHROPIC' \
  --dry-run=client -o yaml | kubectl apply -f -
# (Alternative : copier k8s/ai-service-secret.example.yaml vers k8s/ai-service-secret.yaml, éditer, puis kubectl apply -f k8s/ai-service-secret.yaml — fichier ignoré par git.)
kubectl apply -n skillup -f k8s/ai-service.yaml
kubectl wait --for=condition=available deployment/ai-service -n skillup --timeout=600s
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
```

Le backend appelle le service IA sur **`http://ai-service:8000`** (`AI_SERVICE_URL` dans `k8s/backend.yaml`). Sans pod **ai-service** prêt, **`POST /api/recommendations/generate`** renvoie **503**.

Les pipelines **Jenkins CD** du projet appliquent aussi `namespace` + manifests correspondants.

## Accès depuis un navigateur

- **Backend API** : `http://<IP_PUBLIC_NODE>:30080` (NodePort défini dans `backend.yaml`).
- **Frontend** : `http://<IP_PUBLIC_NODE>:30081`.

L’image frontend doit être construite avec une **`VITE_API_URL`** joignable **depuis le navigateur des utilisateurs**, typiquement :

`http://<IP_PUBLIC_NODE>:30080`

À passer en **build-arg** Docker lors du `docker build` du CD (voir commentaire dans `Jenkinsfile.cd.front`).

## Vérifications rapides

```bash
kubectl get pods,svc -n skillup
kubectl rollout status deployment/backend -n skillup
kubectl rollout status deployment/frontend -n skillup
```
