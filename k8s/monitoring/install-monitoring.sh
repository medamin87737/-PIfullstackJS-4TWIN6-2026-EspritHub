#!/usr/bin/env bash
# Installe Prometheus + Grafana (kube-prometheus-stack) et les alertes SkillUp.
# À lancer sur une machine avec kubectl + helm (ex. VM master kubeadm).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VALUES_FILE="${SCRIPT_DIR}/helm-values-skillup.yaml"
RULES_FILE="${SCRIPT_DIR}/skillup-prometheus-rule.yaml"
RELEASE_NAME="kube-prom"
NAMESPACE="monitoring"

echo ">>> Helm repo"
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts 2>/dev/null || true
helm repo update

echo ">>> Namespace ${NAMESPACE}"
kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

echo ">>> Install/upgrade ${RELEASE_NAME} (this may take several minutes)"
helm upgrade --install "${RELEASE_NAME}" prometheus-community/kube-prometheus-stack \
  --namespace "${NAMESPACE}" \
  -f "${VALUES_FILE}" \
  --wait --timeout 15m

echo ">>> SkillUp PrometheusRule"
kubectl apply -f "${RULES_FILE}"

echo ""
echo "=== Grafana admin password ==="
kubectl get secret -n "${NAMESPACE}" "${RELEASE_NAME}-grafana" -o jsonpath='{.data.admin-password}' | base64 -d
echo ""
echo ""
echo "=== URLs (NodePort on cluster node IP) ==="
echo "  Grafana     http://<NODE_IP>:30300  (user: admin)"
echo "  Prometheus  http://<NODE_IP>:30301"
echo ""
echo "Port-forward (dev):"
echo "  kubectl port-forward -n ${NAMESPACE} svc/${RELEASE_NAME}-grafana 32000:80"
echo "  kubectl port-forward -n ${NAMESPACE} svc/${RELEASE_NAME}-kube-prometheus-prometheus 32010:9090"
