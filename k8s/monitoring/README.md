# Monitoring (Prometheus / Grafana / Alertmanager)

Répond au besoin cours : surveiller **le cluster**, les **outils CI/CD** (via métriques Jenkins exporter ou node exporters — optionnel), et les **applications** SkillUp.

## 1. Installer la stack (sur le cluster kubeadm)

Une fois `kubectl` configuré vers ton cluster :

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

helm upgrade --install kube-prom prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set prometheus.prometheusSpec.retention=15d
```

Récupère le mot de passe Grafana :

```bash
kubectl get secret -n monitoring kube-prom-grafana -o jsonpath="{.data.admin-password}" | base64 -d
echo
```

Port-forward (machine avec kubectl) :

```bash
kubectl port-forward -n monitoring svc/kube-prom-grafana 32000:80
kubectl port-forward -n monitoring svc/kube-prom-kube-prometheus-prometheus 32010:9090
kubectl port-forward -n monitoring svc/kube-prom-kube-prometheus-alertmanager 32011:9093
```

- Grafana : http://localhost:32000  
- Prometheus : http://localhost:32010  
- Alertmanager : http://localhost:32011  

## 2. Alertes applicatives SkillUp

Le fichier `skillup-prometheus-rule.yaml` définit une alerte exemple lorsque le déploiement **backend** n’a pas les replicas disponibles.

**Important :** après `helm install`, récupère le label attendu par ton Prometheus Operator :

```bash
kubectl get prometheus -n monitoring -o yaml | grep ruleNamespaceSelector -A5
```

Adapte les labels du `PrometheusRule` pour qu’il soit sélectionné (souvent `release: kube-prom` ou le nom que tu as donné au chart).

Application :

```bash
kubectl apply -f k8s/monitoring/skillup-prometheus-rule.yaml
```

## 3. Alertmanager — routing minimal

Depuis Grafana → Alerting ou directement dans l’UI Alertmanager (`:32011`), configure un **receiver** (email, webhook Slack/Discord, etc.).  
Pour une démo cours, un **receiver webhook** vers `https://webhook.site/...` permet de prouver la chaîne **Prometheus → Alertmanager → notification**.

Pour une config GitOps, utilise une ressource **AlertmanagerConfig** (operator v0.40+) ou les valeurs Helm `alertmanager.config` — voir doc du chart `kube-prometheus-stack`.
