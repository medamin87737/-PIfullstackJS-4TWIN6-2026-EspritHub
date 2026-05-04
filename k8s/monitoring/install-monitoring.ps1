# Installe Prometheus + Grafana (kube-prometheus-stack) + regles SkillUp.
# Prerequis : kubectl + helm en PATH, contexte Kubernetes valide.
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ValuesFile = Join-Path $ScriptDir "helm-values-skillup.yaml"
$RulesFile = Join-Path $ScriptDir "skillup-prometheus-rule.yaml"
$ReleaseName = "kube-prom"
$Namespace = "monitoring"

Write-Host ">>> Helm repo" -ForegroundColor Cyan
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>$null
helm repo update

Write-Host ">>> Namespace $Namespace" -ForegroundColor Cyan
kubectl create namespace $Namespace --dry-run=client -o yaml | kubectl apply -f -

Write-Host ">>> Install/upgrade $ReleaseName (peut prendre plusieurs minutes)" -ForegroundColor Cyan
helm upgrade --install $ReleaseName prometheus-community/kube-prometheus-stack `
  --namespace $Namespace `
  -f $ValuesFile `
  --wait --timeout 15m

Write-Host ">>> SkillUp PrometheusRule" -ForegroundColor Cyan
kubectl apply -f $RulesFile

Write-Host ""
Write-Host "=== Grafana admin password ===" -ForegroundColor Green
$p = kubectl get secret -n $Namespace "$ReleaseName-grafana" -o jsonpath='{.data.admin-password}'
[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($p))
Write-Host ""
Write-Host "=== URLs (NodePort) ===" -ForegroundColor Green
Write-Host "  Grafana     http://<NODE_IP>:30300  (user: admin)"
Write-Host "  Prometheus  http://<NODE_IP>:30301"
