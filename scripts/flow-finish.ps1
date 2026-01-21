#######################################
# flow-finish - DocOps 마무리 워크플로우 (PowerShell)
# Case 2: Finish 에이전트 기반
#######################################

$VERSION = "0.1.0"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

#######################################
# 유틸리티 함수
#######################################

function Print-Step {
    param([int]$Step, [int]$Total, [string]$Desc)
    Write-Host "[$Step/$Total] $Desc" -ForegroundColor Blue
}

function Print-Success {
    param([string]$Message)
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Print-Warning {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Print-Error {
    param([string]$Message)
    Write-Host "[ERR] $Message" -ForegroundColor Red
}

#######################################
# 메인 워크플로우
#######################################

param(
    [switch]$DocsOnly,
    [switch]$SkipPush,
    [switch]$VerifySoft
)

$verifyLevel = if ($VerifySoft) { "soft" } else { "strict" }

Write-Host ""
Write-Host "========================================" -ForegroundColor Blue
Write-Host "  flow-finish v$VERSION" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

$totalSteps = 7
if ($DocsOnly) {
    $totalSteps = 5
    Print-Warning "docs-only 모드: 빌드/푸시 건너뜀"
    Write-Host ""
}

Set-Location $ProjectRoot

$step = 0

#######################################
# Step 1: 빌드 테스트
#######################################
if (-not $DocsOnly) {
    $step++
    Print-Step $step $totalSteps "빌드 테스트"

    if (Test-Path "package.json") {
        try {
            npm run build
            Print-Success "빌드 성공"
        }
        catch {
            Print-Error "빌드 실패"
            Write-Host "빌드 실패 시 문서만 진행하려면:"
            Write-Host "  .\flow-finish.ps1 -DocsOnly"
            exit 1
        }
    }
    else {
        Print-Warning "package.json 없음 - 빌드 건너뜀"
    }
    Write-Host ""
}

#######################################
# Step 2: specctl snapshot
#######################################
$step++
Print-Step $step $totalSteps "specctl snapshot"

$specctlPath = Join-Path $ScriptDir "specctl.ps1"
if (Test-Path $specctlPath) {
    & $specctlPath snapshot
}
else {
    Print-Warning "specctl 없음 - MVP: 수동 모드"
}
Write-Host ""

#######################################
# Step 3: specctl update
#######################################
$step++
Print-Step $step $totalSteps "specctl update"

if (Test-Path $specctlPath) {
    & $specctlPath update
}
else {
    Print-Warning "specctl 없음 - MVP: 수동 모드"
}
Write-Host ""

#######################################
# Step 4: specctl verify
#######################################
$step++
Print-Step $step $totalSteps "specctl verify -Level $verifyLevel"

if (Test-Path $specctlPath) {
    & $specctlPath verify -Level $verifyLevel -Cache
    if ($LASTEXITCODE -eq 0) {
        Print-Success "검증 통과"
    }
    else {
        Print-Error "검증 실패"
        if ($verifyLevel -eq "strict") {
            Write-Host "soft 모드로 진행하려면:"
            Write-Host "  .\flow-finish.ps1 -VerifySoft"
            exit 1
        }
    }
}
else {
    Print-Warning "specctl 없음 - MVP: 수동 검증"
}
Write-Host ""

#######################################
# Step 5: specctl compile
#######################################
$step++
Print-Step $step $totalSteps "specctl compile"

if (Test-Path $specctlPath) {
    & $specctlPath compile
}
else {
    Print-Warning "specctl 없음 - MVP: 수동 산출물 생성"
}
Write-Host ""

#######################################
# Step 6-7: 커밋 & 푸시
#######################################
if (-not $DocsOnly) {
    $step++
    Print-Step $step $totalSteps "커밋"

    $docsChanged = git diff --quiet docs/
    if ($LASTEXITCODE -ne 0) {
        git add docs/
        git commit -m "docs(spec): auto-sync [flow-finish]"
        Print-Success "docs 커밋 완료"
    }
    else {
        Print-Warning "docs 변경 없음 - 커밋 건너뜀"
    }
    Write-Host ""

    if (-not $SkipPush) {
        $step++
        Print-Step $step $totalSteps "푸시"

        $branch = git rev-parse --abbrev-ref HEAD
        git push origin $branch
        if ($LASTEXITCODE -eq 0) {
            Print-Success "푸시 완료: $branch"
        }
        else {
            Print-Error "푸시 실패"
            exit 1
        }
    }
    else {
        Print-Warning "푸시 건너뜀 (-SkipPush)"
    }
    Write-Host ""
}

#######################################
# 완료
#######################################
Write-Host "========================================" -ForegroundColor Green
Write-Host "  flow-finish 완료" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "다음 단계:"
Write-Host "  - COVERAGE_MATRIX 확인: docs\00_ssot\COVERAGE_MATRIX.md"
Write-Host "  - DRIFT_REPORT 확인: docs\00_ssot\DRIFT_REPORT.md"
Write-Host ""
