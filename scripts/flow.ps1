param(
    [Parameter(Position=0)][string]$Command = "help",
    [Parameter(Position=1)][string]$Arg1 = ""
)

#######################################
# DocOps CLI - v2.0 (PowerShell)
# 문서 기반 SSOT 관리 도구
#######################################

$Version = "2.0.0"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

function Invoke-Status {
    Write-Host "========================================"
    Write-Host "[DocOps status] 현재 상태" -ForegroundColor Blue
    Write-Host "========================================"
    Write-Host ""
    Write-Host "Version:      $Version" -ForegroundColor Cyan
    Write-Host ""

    # SSOT 파일 상태
    Write-Host "SSOT 파일 상태:"
    $ssotFiles = @(
        "docs\00_ssot\ANCHOR.md",
        "docs\00_ssot\DOC_POLICY.md",
        "docs\00_ssot\COVERAGE_MATRIX.md",
        "docs\00_ssot\SPEC_SNAPSHOT.md",
        "docs\00_ssot\DRIFT_REPORT.md",
        "docs\00_ssot\DOC_DEBT.md"
    )

    foreach ($file in $ssotFiles) {
        $fullPath = Join-Path $ProjectRoot $file
        if (Test-Path $fullPath) {
            Write-Host "  [OK] $file" -ForegroundColor Green
        } else {
            Write-Host "  [!] $file (없음)" -ForegroundColor Yellow
        }
    }

    Write-Host ""

    # CLI 도구 상태
    Write-Host "CLI 도구 상태:"
    $specctlPath = Join-Path $ScriptDir "specctl.ps1"
    $flowFinishPath = Join-Path $ScriptDir "flow-finish.ps1"

    if (Test-Path $specctlPath) {
        Write-Host "  [OK] specctl" -ForegroundColor Green
    } else {
        Write-Host "  [!] specctl (없음)" -ForegroundColor Yellow
    }

    if (Test-Path $flowFinishPath) {
        Write-Host "  [OK] flow-finish" -ForegroundColor Green
    } else {
        Write-Host "  [!] flow-finish (없음)" -ForegroundColor Yellow
    }

    Write-Host ""
}

function Invoke-Hooks($SubCmd) {
    $hooksDir = Join-Path $ProjectRoot ".git\hooks"

    switch ($SubCmd) {
        "install" {
            Write-Host "[!] hooks install은 bash 사용 권장:" -ForegroundColor Yellow
            Write-Host "    bash scripts/setup-docops-hooks.sh install" -ForegroundColor Gray
        }
        "uninstall" {
            Write-Host "[!] hooks uninstall은 bash 사용 권장:" -ForegroundColor Yellow
            Write-Host "    bash scripts/setup-docops-hooks.sh uninstall" -ForegroundColor Gray
        }
        default {
            # status
            Write-Host "========================================"
            Write-Host "[DocOps hooks status]" -ForegroundColor Blue
            Write-Host "========================================"
            Write-Host ""

            $prePushPath = Join-Path $hooksDir "pre-push"
            if (Test-Path $prePushPath) {
                $content = Get-Content $prePushPath -Raw -ErrorAction SilentlyContinue
                if ($content -match "DocOps") {
                    Write-Host "  [OK] pre-push (DocOps): 설치됨" -ForegroundColor Green
                } else {
                    Write-Host "  [!] pre-push: 설치됨 (DocOps 아님)" -ForegroundColor Yellow
                }
            } else {
                Write-Host "  [!] pre-push: 없음" -ForegroundColor Yellow
            }

            Write-Host ""
            Write-Host "Case 1 (pre-push 훅): pre-push가 DocOps로 설치되어야 함"
            Write-Host "Case 2 (flow:finish): pre-push 훅 불필요"
        }
    }
}

function Show-Help {
    Write-Host @"
DocOps CLI v$Version (PowerShell)

사용법: .\scripts\flow.ps1 <command> [options]

명령어:
  status              현재 상태 출력 (SSOT 파일, CLI 도구)
  hooks <cmd>         Git hooks 관리 (install|uninstall|status)
  help                도움말

예시:
  .\scripts\flow.ps1 status
  .\scripts\flow.ps1 hooks status
  .\scripts\flow.ps1 hooks install

주요 워크플로우:
  Case 1 (pre-push 훅):
    .\scripts\flow.ps1 hooks install

  Case 2 (flow:finish 권장):
    npm run flow:finish

specctl 직접 사용:
  .\scripts\specctl.ps1 status
  .\scripts\specctl.ps1 verify -Level soft
  .\scripts\specctl.ps1 verify -Level strict

"@
}

switch ($Command) {
    "status" { Invoke-Status }
    "hooks" { Invoke-Hooks $Arg1 }
    "help" { Show-Help }
    "--help" { Show-Help }
    "-h" { Show-Help }
    default {
        Write-Host "[X] 알 수 없는 명령어: $Command" -ForegroundColor Red
        Show-Help
    }
}
