# Monitoring — Prometheus & Grafana (SkillUp)

Stack : **kube-prometheus-stack** (Prometheus Operator, Prometheus, Grafana, Alertmanager, node-exporter, kube-state-metrics).

## Installation rapide

### Linux (VM avec `kubectl` + Helm 3)

```bash
chmod +x k8s/monitoring/install-monitoring.sh
./k8s/monitoring/install-monitoring.sh
```

### Windows (PowerShell)

```powershell
cd C:\Users\amin\Desktop\EspritHubPi\SkillUpTnFrontBack
powershell -ExecutionPolicy Bypass -File .\k8s\monitoring\install-monitoring.ps1
```

Helm non installé sur la VM :

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

Le script utilise le release Helm **`kube-prom`** (obligatoire pour que les labels des `PrometheusRule` correspondent).

## Accès

| Service     | Mode      | URL |
|------------|-----------|-----|
| **Grafana** | NodePort | `http://<IP_DU_NODE>:30300` — user `admin`, mot de passe affiché fin de script |
| **Prometheus** | NodePort | `http://<IP_DU_NODE>:30301` |

Sur **VMware** + PC Windows : ouvre aussi **30300** et **30301** (NAT + pare-feu Windows) comme pour 30081/30080.

Sans NodePort (déjà en ClusterIP si tu overrides) :

```bash
kubectl port-forward -n monitoring svc/kube-prom-grafana 32000:80
kubectl port-forward -n monitoring svc/kube-prom-kube-prometheus-prometheus 32010:9090
```

## Fichiers

| Fichier | Rôle |
|---------|------|
| `helm-values-skillup.yaml` | NodePorts, rétention 15j, limites mémoire pour petit cluster |
| `skillup-prometheus-rule.yaml` | Alertes **backend** / **frontend** / **mongo** (replicas non Ready) dans `skillup` |
| `install-monitoring.sh` / `.ps1` | Install + apply des règles |

## Grafana — premier dashboard

1. Connecte-toi Grafana (admin + mot de passe secret).
2. **Explore** ou **Dashboards** → importe un dashboard Kubernetes (ID **6417** ou **315** selon besoin) ou utilise **Home** → métriques node / pod.

## Si le `PrometheusRule` n’apparaît pas dans Prometheus

Vérifie le label attendu :

```bash
kubectl get prometheus -n monitoring -o yaml | grep -A5 ruleSelector
```

Si ton release Helm n’est pas `kube-prom`, édite `metadata.labels.release` dans `skillup-prometheus-rule.yaml` pour qu’il matche.

Ancienne ressource `skillup-backend-health` (nom obsolète) :

```bash
kubectl delete prometheusrule skillup-backend-health -n monitoring --ignore-not-found
kubectl apply -f k8s/monitoring/skillup-prometheus-rule.yaml
```

## Alertmanager (démo)

UI (souvent port-forward `kube-prom-kube-prometheus-alertmanager:9093`) ou **Grafana → Alerting**.  
Pour valider une chaîne : receiver **webhook** vers `https://webhook.site/...`.

## Ressources

Un cluster très petit peut manquer de RAM ; baisse les réplicas ou les `limits` dans `helm-values-skillup.yaml` si les pods restent **Pending**.
