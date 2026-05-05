#!/usr/bin/env bash
# À lancer SUR la VM (où kubectl fonctionne) : libère CPU/RAM pour 2 vCPU / ~4 GiB / mono-nœud.
# Usage : bash k8s/scripts/fit-small-node-2c4g.sh
set -euo pipefail

K8S_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NS_APP="skillup"
NS_MON="monitoring"

echo "==> Retirer la stack monitoring (trop lourde pour 2 cœurs / 4 Go)"
if command -v helm >/dev/null 2>&1; then
  helm uninstall kube-prom -n "$NS_MON" 2>/dev/null || true
fi
kubectl delete namespace "$NS_MON" --ignore-not-found --wait=true --timeout=300s || true

echo "==> Réappliquer les manifests SkillUp (replicas: 1 dans les YAML)"
kubectl apply -f "$K8S_DIR/namespace.yaml"
kubectl apply -n "$NS_APP" -f "$K8S_DIR/mongo.yaml"
kubectl apply -n "$NS_APP" -f "$K8S_DIR/backend.yaml"
kubectl apply -n "$NS_APP" -f "$K8S_DIR/frontend.yaml"

echo "==> Forcer 1 réplica au cas où un scale manuel / ancien état"
for d in mongo backend frontend; do
  kubectl scale deployment "$d" -n "$NS_APP" --replicas=1 2>/dev/null || true
done

echo "==> Attente des rollouts"
kubectl rollout status deployment/mongo -n "$NS_APP" --timeout=240s || true
kubectl rollout status deployment/backend -n "$NS_APP" --timeout=240s || true
kubectl rollout status deployment/frontend -n "$NS_APP" --timeout=240s || true

echo "==> État des pods"
kubectl get pods -n "$NS_APP" -o wide
echo
kubectl get pods -A
