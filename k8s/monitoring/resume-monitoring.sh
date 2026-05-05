#!/usr/bin/env bash
set -euo pipefail

NS="${1:-monitoring}"

echo "Resuming monitoring workloads in namespace: ${NS}"
kubectl -n "${NS}" scale deployment kube-prom-kube-prometheus-operator --replicas=1 || true
kubectl -n "${NS}" scale deployment kube-prom-kube-state-metrics --replicas=1 || true
kubectl -n "${NS}" scale deployment kube-prom-grafana --replicas=1 || true
kubectl -n "${NS}" scale statefulset alertmanager-kube-prom-kube-prometheus-alertmanager --replicas=1 || true
kubectl -n "${NS}" scale statefulset prometheus-kube-prom-kube-prometheus-prometheus --replicas=1 || true
kubectl -n "${NS}" rollout status deployment/kube-prom-kube-prometheus-operator --timeout=180s || true
kubectl -n "${NS}" rollout status deployment/kube-prom-kube-state-metrics --timeout=180s || true
kubectl -n "${NS}" rollout status deployment/kube-prom-grafana --timeout=180s || true
kubectl -n "${NS}" get pods
