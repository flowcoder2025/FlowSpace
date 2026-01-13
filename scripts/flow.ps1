param(
    [Parameter(Position=0)][string]$Command = "help",
    [Parameter(Position=1)][string]$Arg1 = ""
)

$Version = "1.1.0"
$UpstreamUrl = "https://github.com/flowcoder2025/FlowSubAgent.git"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ConfigFile = Join-Path $ProjectRoot ".claude\config.local"
$PresetsDir = Join-Path $ProjectRoot ".claude\presets"
$AgentsDir = Join-Path $ProjectRoot ".claude\agents"

function Get-Config {
    $config = @{ CLAUDE_TIER = "default"; SKIP_CODEX = "" }
    if (Test-Path $ConfigFile) {
        Get-Content $ConfigFile | ForEach-Object {
            if ($_ -match "^([A-Z_]+)=(.*)$") { $config[$Matches[1]] = $Matches[2] }
        }
    }
    return $config
}

function Save-Config($Tier, $SkipCodex) {
    if (-not $Tier) { $Tier = "default" }
    $configDir = Split-Path -Parent $ConfigFile
    if (-not (Test-Path $configDir)) { New-Item -ItemType Directory -Path $configDir -Force | Out-Null }
    $lines = @("# FlowSubAgent config", "CLAUDE_TIER=$Tier")
    if ($SkipCodex -eq "1") { $lines += "SKIP_CODEX=1" }
    $lines | Set-Content -Path $ConfigFile -Encoding UTF8
    Write-Host "[OK] Config saved: $ConfigFile" -ForegroundColor Green
}

function Get-CurrentProfile {
    $count = (Get-ChildItem -Path $AgentsDir -Filter "*.md" -ErrorAction SilentlyContinue).Count
    if ($count -gt 4) { return "pro" } else { return "core" }
}

function Get-CodexStatus {
    if (-not (Get-Command codex -ErrorAction SilentlyContinue)) { return "NOT_INSTALLED" }
    try { $null = & codex login status 2>&1; if ($LASTEXITCODE -eq 0) { return "LOGGED_IN" } else { return "NOT_LOGGED_IN" } }
    catch { return "NOT_LOGGED_IN" }
}

function Get-TemplateVersion {
    Push-Location $ProjectRoot
    try {
        # 태그 우선, 태그+커밋 형태로 표시
        $fullDesc = git describe --tags 2>$null
        if ($fullDesc) { return $fullDesc }
        # 태그 없으면 커밋 해시
        $hash = git rev-parse --short=7 HEAD 2>$null
        if ($hash) { return $hash }
        return "unknown"
    } catch { return "unknown" }
    finally { Pop-Location }
}

function Get-OriginType {
    Push-Location $ProjectRoot
    try {
        $originUrl = git remote get-url origin 2>$null
        if (-not $originUrl) { return "none" }
        if ($originUrl -match "flowcoder2025/FlowSubAgent") { return "official" }
        return "fork"
    } catch { return "none" }
    finally { Pop-Location }
}

function Invoke-Status {
    Write-Host "========================================"
    Write-Host "[flow status]" -ForegroundColor Blue
    Write-Host "========================================"
    $cfg = Get-Config
    $ver = Get-TemplateVersion
    Write-Host "Version:    $ver (CLI v$Version)" -ForegroundColor Cyan
    Write-Host "Profile:    $(Get-CurrentProfile)" -ForegroundColor Green
    Write-Host "Tier:       $($cfg.CLAUDE_TIER)" -ForegroundColor Green
    if ($cfg.SKIP_CODEX -eq "1") { Write-Host "Codex:      OFF" -ForegroundColor Yellow }
    else { Write-Host "Codex:      ON" -ForegroundColor Green }
    $cs = Get-CodexStatus
    Write-Host "Codex CLI:  $cs" -ForegroundColor $(if($cs -eq "LOGGED_IN"){"Green"}else{"Yellow"})
    if (Test-Path $ConfigFile) { Write-Host "Config:     $ConfigFile" -ForegroundColor Green }
    else { Write-Host "Config:     (none)" -ForegroundColor Yellow }
}

function Invoke-Tier($Level) {
    if ($Level -notin @("low","default","high")) { Write-Host "[X] Invalid tier: $Level" -ForegroundColor Red; return }
    $cfg = Get-Config
    Save-Config -Tier $Level -SkipCodex $cfg.SKIP_CODEX
    Write-Host "[OK] Tier: $Level" -ForegroundColor Green
}

function Invoke-Codex($Mode) {
    $cfg = Get-Config
    if ($Mode -eq "on") { Save-Config -Tier $cfg.CLAUDE_TIER -SkipCodex ""; Write-Host "[OK] Codex ON" -ForegroundColor Green }
    elseif ($Mode -eq "off") { Save-Config -Tier $cfg.CLAUDE_TIER -SkipCodex "1"; Write-Host "[OK] Codex OFF" -ForegroundColor Green }
    else { Write-Host "[X] Invalid: $Mode" -ForegroundColor Red }
}

function Invoke-Preset($Name) {
    $tpl = Join-Path $PresetsDir "$Name.template"
    if (-not (Test-Path $tpl)) { Write-Host "[X] Preset not found: $Name" -ForegroundColor Red; return }
    Copy-Item -Path $tpl -Destination $ConfigFile -Force
    Write-Host "[OK] Preset applied: $Name" -ForegroundColor Green
    Get-Content $ConfigFile | Where-Object { $_ -notmatch "^#" -and $_ -ne "" } | ForEach-Object { Write-Host "  $_" }
}

function Invoke-Profile($Name) {
    Write-Host "[!] profile requires bash. Use Git Bash or WSL." -ForegroundColor Yellow
}

function Invoke-Hooks($Sub) {
    if ($Sub -eq "status") {
        $hd = Join-Path $ProjectRoot ".git\hooks"
        @("pre-commit","commit-msg","pre-push") | ForEach-Object {
            if (Test-Path (Join-Path $hd $_)) { Write-Host "[OK] $_" -ForegroundColor Green }
            else { Write-Host "[!] $_ not found" -ForegroundColor Yellow }
        }
    } else { Write-Host "[!] hooks setup requires bash" -ForegroundColor Yellow }
}

function Invoke-Apply {
    Write-Host "[flow apply] dry-run" -ForegroundColor Blue
    $cfg = Get-Config
    Write-Host "Tier: $($cfg.CLAUDE_TIER)"
    Write-Host "[!] Dry-run only. No files modified." -ForegroundColor Yellow
}

function Invoke-Update {
    Write-Host "========================================"
    Write-Host "[flow update] Template Update" -ForegroundColor Blue
    Write-Host "========================================"
    Write-Host ""
    $ver = Get-TemplateVersion
    Write-Host "Current Version: $ver" -ForegroundColor Yellow
    Write-Host ""

    # origin 타입 감지
    $originType = Get-OriginType

    if ($originType -eq "official") {
        Write-Host "[OK] origin is official FlowSubAgent" -ForegroundColor Green
        Write-Host ""
        Write-Host "Update Method:" -ForegroundColor Cyan
        Write-Host "    git pull origin main" -ForegroundColor Gray
        Write-Host ""
    } elseif ($originType -eq "fork") {
        Write-Host "[!] origin is a fork. Recommend adding upstream." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Update Method (Upstream Pull):" -ForegroundColor Cyan
        Write-Host "    git remote add upstream $UpstreamUrl" -ForegroundColor Gray
        Write-Host "    git fetch upstream" -ForegroundColor Gray
        Write-Host "    git checkout main && git pull upstream main" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "[!] No origin remote found" -ForegroundColor Yellow
        Write-Host ""
    }

    Write-Host "Preserved (never overwritten):" -ForegroundColor Green
    @(".claude/config.local", "docs/03_ops/RUN_LOG.md", "docs/04_reference/legacy_claude_md/", "PRD.md") | ForEach-Object {
        Write-Host "  [OK] $_" -ForegroundColor Green
    }
    Write-Host ""
    Write-Host "[!] PowerShell provides guidance only. For full dry-run, use bash:" -ForegroundColor Yellow
    Write-Host "    & 'C:\Program Files\Git\bin\bash.exe' scripts/flow update --dry-run" -ForegroundColor Gray
}

switch ($Command) {
    "status" { Invoke-Status }
    "tier" { Invoke-Tier $Arg1 }
    "codex" { Invoke-Codex $Arg1 }
    "preset" { Invoke-Preset $Arg1 }
    "profile" { Invoke-Profile $Arg1 }
    "hooks" { Invoke-Hooks $Arg1 }
    "apply" { Invoke-Apply }
    "update" { Invoke-Update }
    default { Write-Host "Usage: .\scripts\flow.ps1 [status|tier|codex|preset|profile|hooks|apply|update]" }
}
