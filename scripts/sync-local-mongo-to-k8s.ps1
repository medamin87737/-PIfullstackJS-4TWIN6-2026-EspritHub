<#
.SYNOPSIS
  Dump la base Mongo locale puis restore dans Mongo Kubernetes (namespace skillup).

.EXAMPLE
  .\scripts\sync-local-mongo-to-k8s.ps1 -MongoToolsBin "D:\mongodb-database-tools\bin"

.EXAMPLE  (auth local)
  .\scripts\sync-local-mongo-to-k8s.ps1 -MongoToolsBin "D:\..." -LocalMongoUri "mongodb://user:pass@localhost:27017/employee-recommendation-system?authSource=admin"
#>
[CmdletBinding()]
param(
    [string] $MongoToolsBin = "",
    [string] $LocalMongoUri = "mongodb://localhost:27017/employee-recommendation-system",
    [string] $SourceDbName = "employee-recommendation-system",
    [string] $K8sDbName = "skillupdb",
    [string] $Namespace = "skillup",
    [string] $MongoService = "mongo",
    [int] $ForwardPort = 27018,
    [switch] $SkipBackendRestart
)

$ErrorActionPreference = "Stop"

function Find-MongodumpPath {
    param([string]$UserBin)
    if ($UserBin) {
        $p = Join-Path $UserBin "mongodump.exe"
        if (Test-Path -LiteralPath $p) { return $UserBin }
        throw @"
mongodump.exe introuvable : $p

Verifications :
  1) Dans l'Explorateur, cherche le fichier mongodump.exe sur le disque D.
  2) Le parametre -MongoToolsBin doit etre le DOSSIER qui contient mongodump.exe (souvent ...\bin).
  3) Apres extraction du zip, le chemin est souvent du type :
     D:\mongodb-database-tools-windows-x86_64-xxx\bin
"@
    }
    $searchDirs = @(
        "${env:ProgramFiles}\MongoDB\Tools\100\bin",
        "${env:ProgramFiles}\MongoDB\Tools\bin",
        "${env:ProgramFiles(x86)}\MongoDB\Tools\100\bin",
        "${env:ProgramFiles(x86)}\MongoDB\Tools\bin",
        "D:\mongodb-database-tools\bin",
        "D:\MongoDB\Tools\100\bin",
        "D:\MongoDB\Tools\bin"
    )
    foreach ($d in $searchDirs) {
        if (Test-Path -LiteralPath (Join-Path $d "mongodump.exe")) { return $d }
    }
    throw @"
mongodump.exe introuvable.

Installe MongoDB Database Tools puis indique le dossier bin, par exemple :
  .\scripts\sync-local-mongo-to-k8s.ps1 -MongoToolsBin "D:\LE_DOSSIER_QUI_CONTIENT_mongodump.exe"

Test rapide dans PowerShell :
  Get-ChildItem D:\ -Recurse -Filter mongodump.exe -ErrorAction SilentlyContinue | Select-Object -First 3 FullName
"@
}

$binDir = Find-MongodumpPath -UserBin $MongoToolsBin
$mongodumpExe = Join-Path $binDir "mongodump.exe"
$mongorestoreExe = Join-Path $binDir "mongorestore.exe"
if (-not (Test-Path -LiteralPath $mongorestoreExe)) {
    throw "mongorestore.exe introuvable : $mongorestoreExe"
}

if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
    throw "kubectl introuvable. Ajoute kubectl au PATH (Docker Desktop le fournit souvent)."
}

$backupRoot = Join-Path $env:TEMP ("mongo-k8s-sync-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

Write-Host ">>> mongodump depuis PC local..."
Write-Host "    Utilise : $mongodumpExe"
& $mongodumpExe --uri="$LocalMongoUri" --out="$backupRoot"
$dumpFolder = Join-Path $backupRoot $SourceDbName
if (-not (Test-Path -LiteralPath $dumpFolder)) {
    throw "Dossier dump introuvable : $dumpFolder (verifie -LocalMongoUri / -SourceDbName)."
}

Write-Host ">>> Demarrage port-forward kubectl (${MongoService} -> 127.0.0.1:${ForwardPort})..."
$kubectlArgs = @("port-forward", "-n", $Namespace, "svc/$MongoService", "${ForwardPort}:27017")
$pf = Start-Process -FilePath "kubectl" -ArgumentList $kubectlArgs -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 8

try {
    Write-Host ">>> mongorestore vers cluster (base $K8sDbName, --drop)..."
    & $mongorestoreExe --uri="mongodb://127.0.0.1:$ForwardPort" --db=$K8sDbName --drop $dumpFolder

    if (-not $SkipBackendRestart) {
        Write-Host ">>> rollout restart backend..."
        kubectl rollout restart deployment/backend -n $Namespace
        kubectl rollout status deployment/backend -n $Namespace --timeout=180s
    }

    Write-Host ">>> Collections dans skillupdb :"
    kubectl exec -n $Namespace deploy/mongo -- mongosh $K8sDbName --quiet --eval "db.getCollectionNames().join(', ')"
    Write-Host ""
    Write-Host "OK - Backup conserve sous : $backupRoot"
}
finally {
    if ($pf -and -not $pf.HasExited) {
        Stop-Process -Id $pf.Id -Force -ErrorAction SilentlyContinue
    }
}
