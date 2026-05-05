#!/usr/bin/env bash
set -euo pipefail

NS="${1:-monitoring}"

echo "Pausing monitoring workloads in namespace: ${NS}"
kubectl -n "${NS}" scale deployment kube-prom-grafana --replicas=0 || true
kubectl -n "${NS}" scale deployment kube-prom-kube-state-metrics --replicas=0 || true
kubectl -n "${NS}" scale deployment kube-prom-kube-prometheus-operator --replicas=0 || true
kubectl -n "${NS}" scale statefulset alertmanager-kube-prom-kube-prometheus-alertmanager --replicas=0 || true
kubectl -n "${NS}" scale statefulset prometheus-kube-prom-kube-prometheus-prometheus --replicas=0 || true
kubectl -n "${NS}" get pods
