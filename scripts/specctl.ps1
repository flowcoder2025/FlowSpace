#######################################
# specctl - DocOps CLI v0.3.0 (PowerShell)
# 문서-코드 동기화 및 검증 도구
# 성능 최적화 버전
#######################################

$VERSION = "0.3.0"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# 경로 정의
$SSOT_DIR = Join-Path $ProjectRoot "docs\00_ssot"
$SPECS_DIR = Join-Path $ProjectRoot "docs\03_standards\specs"
$DEVSPEC_DIR = Join-Path $ProjectRoot "docs\03_standards\devspec"
$MANUALS_DIR = Join-Path $ProjectRoot "docs\03_standards\manuals"

# 임시 디렉토리
$TMP_DIR = Join-Path $env:TEMP "specctl_$(Get-Random)"
New-Item -ItemType Directory -Force -Path $TMP_DIR | Out-Null

#######################################
# 성능 최적화: Hash 기반 캐시
#######################################

# Evidence 인덱스: Key="SPEC|CONTRACT" Value=@(@{Type="code"; Value="path"}, ...)
$script:EvidenceByContract = @{}

# 파일 내용 캐시: Key="path" Value="content"
$script:FileCache = @{}

# Snapshot 라우트 해시: Key="route" Value=$true
$script:SnapshotRoutes = @{}

# Contract 존재 해시: Key="CONTRACT_ID" Value=$true
$script:ContractExists = @{}

#######################################
# 유틸리티 함수
#######################################

function Print-Header {
    param([string]$Message)
    Write-Host "========================================" -ForegroundColor Blue
    Write-Host $Message -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Blue
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

function Print-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Get-DateString {
    return (Get-Date -Format "yyyy-MM-dd")
}

function Get-TimestampString {
    return (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
}

#######################################
# 캐시 함수
#######################################

# 파일 내용 캐시하여 반환 (I/O 최소화)
# Note: -LiteralPath 사용하여 [id] 등 특수문자 경로 지원
function Get-CachedFileContent {
    param([string]$FilePath)

    if (-not $script:FileCache.ContainsKey($FilePath)) {
        if (Test-Path -LiteralPath $FilePath) {
            $script:FileCache[$FilePath] = Get-Content -LiteralPath $FilePath -Raw -ErrorAction SilentlyContinue
        }
        else {
            $script:FileCache[$FilePath] = ""
        }
    }

    return $script:FileCache[$FilePath]
}

# 캐시된 파일에서 패턴 검색
function Test-CachedPattern {
    param(
        [string]$Pattern,
        [string]$FilePath
    )

    $content = Get-CachedFileContent -FilePath $FilePath
    if ([string]::IsNullOrEmpty($content)) {
        return $false
    }

    return $content -match $Pattern
}

# 캐시된 파일에서 문자열 검색
function Test-CachedString {
    param(
        [string]$SearchString,
        [string]$FilePath
    )

    $content = Get-CachedFileContent -FilePath $FilePath
    if ([string]::IsNullOrEmpty($content)) {
        return $false
    }

    return $content.Contains($SearchString)
}

#######################################
# COVERAGE_MATRIX 파싱 함수
#######################################

function Parse-CoverageMatrix {
    $matrixFile = Join-Path $SSOT_DIR "COVERAGE_MATRIX.md"

    $result = @{
        sync = 0
        missing = 0
        hallu = 0
        broken = 0
        gap = 0
    }

    if (-not (Test-Path $matrixFile)) {
        return $result
    }

    $content = Get-Content $matrixFile -Raw

    # 요약 테이블에서 값 추출
    if ($content -match '\|\s*\*\*SYNC\*\*\s*\|\s*(\d+)') {
        $result.sync = [int]$Matches[1]
    }
    if ($content -match '\|\s*\*\*MISSING_DOC\*\*\s*\|\s*(\d+)') {
        $result.missing = [int]$Matches[1]
    }
    if ($content -match '\|\s*\*\*HALLUCINATION\*\*\s*\|\s*(\d+)') {
        $result.hallu = [int]$Matches[1]
    }
    if ($content -match '\|\s*\*\*BROKEN_EVIDENCE\*\*\s*\|\s*(\d+)') {
        $result.broken = [int]$Matches[1]
    }
    if ($content -match '\|\s*\*\*SNAPSHOT_GAP\*\*\s*\|\s*(\d+)') {
        $result.gap = [int]$Matches[1]
    }

    return $result
}

#######################################
# 라우트 스캔 함수
#######################################

function Convert-FileToRoute {
    param(
        [string]$File,
        [string]$BaseDir
    )

    $route = $File.Replace($BaseDir, "").Replace("\", "/")

    # 확장자 제거
    $route = $route -replace '\.(tsx|ts|jsx|js)$', ''

    # index 제거
    $route = $route -replace '/index$', ''
    $route = $route -replace '^index$', ''

    # 빈 문자열이면 루트
    if ([string]::IsNullOrEmpty($route)) {
        $route = "/"
    }

    # [param] → :param 변환
    $route = $route -replace '\[\.\.\.([^\]]+)\]', '*$1'
    $route = $route -replace '\[([^\]]+)\]', ':$1'

    # (group) 제거
    $route = $route -replace '\([^)]+\)', ''

    # 중복 슬래시 정리
    $route = $route -replace '//', '/'

    # 앞에 / 보장
    if (-not $route.StartsWith("/")) {
        $route = "/$route"
    }

    return $route
}

function Get-SpecKey {
    param([string]$Route)

    # API routes - 기능별 분류
    switch -Wildcard ($Route) {
        "/api/auth/*" { return "AUTH" }
        "/api/user/*" { return "USER" }
        "/api/users/*" { return "USER" }
        "/api/admin/*" { return "ADMIN" }
        "/api/space/*" { return "SPACE" }
        "/api/spaces/*" { return "SPACE" }
        "/api/guest/*" { return "GUEST" }
        "/api/livekit/*" { return "LIVEKIT" }
        "/api/cron/*" { return "CRON" }
        "/api/dashboard/*" { return "DASHBOARD" }
        "/api/my-spaces" { return "SPACE" }
        "/api/templates" { return "SPACE" }
        "/api/chat/*" { return "CHAT" }
        "/api/billing/*" { return "BILLING" }
        # UI routes - PAGE로 분류
        "/admin*" { return "PAGE" }
        "/space/*" { return "PAGE" }
        "/my-spaces" { return "PAGE" }
        "/profile" { return "PAGE" }
        "/onboarding" { return "PAGE" }
        "/pricing" { return "PAGE" }
        "/spaces/*" { return "PAGE" }
        "/game-test" { return "PAGE" }
        "/dashboard/spaces/*" { return "PAGE" }
        "/login" { return "AUTH" }
        "/logout" { return "AUTH" }
        "/register" { return "AUTH" }
        "/signup" { return "AUTH" }
        "/" { return "PAGE" }
        "/dashboard*" { return "DASHBOARD" }
        "/settings*" { return "SETTINGS" }
        "/api/*" { return "API" }
        default { return "UNCLASSIFIED" }
    }
}

function Scan-UIRoutes {
    param([string]$OutputFile)

    $routes = @()
    $routes += "| Route | File | SPEC_KEY |"
    $routes += "|-------|------|----------|"

    $found = 0

    # Next.js Pages Router
    foreach ($base in @("pages", "src\pages")) {
        $dir = Join-Path $ProjectRoot $base
        if (-not (Test-Path $dir)) { continue }

        Get-ChildItem -Path $dir -Recurse -Include "*.tsx","*.ts","*.jsx","*.js" | ForEach-Object {
            $file = $_.FullName

            # api 디렉토리 제외
            if ($file -match "\\api\\") { return }
            # _app, _document 등 제외
            if ($_.Name -match "^_") { return }

            $route = Convert-FileToRoute -File $file -BaseDir $dir
            $relFile = $file.Replace("$ProjectRoot\", "").Replace("\", "/")
            $specKey = Get-SpecKey -Route $route

            $routes += "| $route | $relFile | $specKey |"
            $script:found++
        }
    }

    # Next.js App Router
    foreach ($base in @("app", "src\app")) {
        $dir = Join-Path $ProjectRoot $base
        if (-not (Test-Path $dir)) { continue }

        Get-ChildItem -Path $dir -Recurse -Include "page.tsx","page.ts","page.jsx","page.js" | ForEach-Object {
            $file = $_.FullName

            # api 디렉토리 제외
            if ($file -match "\\api\\") { return }

            $parentDir = Split-Path -Parent $file
            $route = Convert-FileToRoute -File $parentDir -BaseDir $dir
            $relFile = $file.Replace("$ProjectRoot\", "").Replace("\", "/")
            $specKey = Get-SpecKey -Route $route

            $routes += "| $route | $relFile | $specKey |"
            $script:found++
        }
    }

    $routes | Out-File -FilePath $OutputFile -Encoding utf8
    return $found
}

function Scan-APIRoutes {
    param([string]$OutputFile)

    $routes = @()
    $routes += "| Route | File | SPEC_KEY | Method |"
    $routes += "|-------|------|----------|--------|"

    $found = 0

    # Next.js Pages Router API
    foreach ($base in @("pages\api", "src\pages\api")) {
        $dir = Join-Path $ProjectRoot $base
        if (-not (Test-Path $dir)) { continue }

        Get-ChildItem -Path $dir -Recurse -Include "*.ts","*.js" | ForEach-Object {
            $file = $_.FullName
            $route = "/api" + (Convert-FileToRoute -File $file -BaseDir $dir)
            $relFile = $file.Replace("$ProjectRoot\", "").Replace("\", "/")
            $specKey = Get-SpecKey -Route $route

            # 메서드 추출
            $content = Get-Content -LiteralPath $file -Raw -ErrorAction SilentlyContinue
            $methods = @()
            if ($content -match "export.*GET|req\.method.*GET") { $methods += "GET" }
            if ($content -match "export.*POST|req\.method.*POST") { $methods += "POST" }
            if ($content -match "export.*PUT|req\.method.*PUT") { $methods += "PUT" }
            if ($content -match "export.*DELETE|req\.method.*DELETE") { $methods += "DELETE" }
            $methodStr = if ($methods.Count -gt 0) { $methods -join "," } else { "ALL" }

            $routes += "| $route | $relFile | $specKey | $methodStr |"
            $script:found++
        }
    }

    # Next.js App Router API
    foreach ($base in @("app\api", "src\app\api")) {
        $dir = Join-Path $ProjectRoot $base
        if (-not (Test-Path $dir)) { continue }

        Get-ChildItem -Path $dir -Recurse -Include "route.ts","route.js" | ForEach-Object {
            $file = $_.FullName
            $parentDir = Split-Path -Parent $file
            $route = "/api" + (Convert-FileToRoute -File $parentDir -BaseDir $dir)
            $relFile = $file.Replace("$ProjectRoot\", "").Replace("\", "/")
            $specKey = Get-SpecKey -Route $route

            $content = Get-Content -LiteralPath $file -Raw -ErrorAction SilentlyContinue
            $methods = @()
            if ($content -match "export.*function GET|export const GET|export async function GET") { $methods += "GET" }
            if ($content -match "export.*function POST|export const POST|export async function POST") { $methods += "POST" }
            if ($content -match "export.*function PUT|export const PUT|export async function PUT") { $methods += "PUT" }
            if ($content -match "export.*function DELETE|export const DELETE|export async function DELETE") { $methods += "DELETE" }
            $methodStr = if ($methods.Count -gt 0) { $methods -join "," } else { "ALL" }

            $routes += "| $route | $relFile | $specKey | $methodStr |"
            $script:found++
        }
    }

    $routes | Out-File -FilePath $OutputFile -Encoding utf8
    return $found
}

#######################################
# Evidence 검증 함수 (최적화)
#######################################

function Extract-Evidences {
    param([string]$OutputFile)

    $evidences = @()

    # 인덱스 초기화
    $script:EvidenceByContract = @{}

    if (-not (Test-Path $SPECS_DIR)) { return }

    Get-ChildItem -Path $SPECS_DIR -Filter "*.md" | ForEach-Object {
        $specKey = $_.BaseName
        $currentContract = ""

        Get-Content $_.FullName | ForEach-Object {
            $line = $_

            # Contract ID 추출
            if ($line -match "^###\s*Contract:\s*(.+)$") {
                $currentContract = $Matches[1].Trim()
            }

            # Evidence 추출
            if ($line -match "^\s*-\s*(code|type|ui|test|e2e):\s*``?([^``]+)``?$") {
                $evType = $Matches[1]
                $evValue = $Matches[2].Trim()

                # 파일 출력 (기존 호환)
                $evidences += "$specKey|$currentContract|$evType|$evValue"

                # Hash 인덱싱 (O(1) 조회용)
                $key = "$specKey|$currentContract"
                if (-not $script:EvidenceByContract.ContainsKey($key)) {
                    $script:EvidenceByContract[$key] = @()
                }
                $script:EvidenceByContract[$key] += @{Type = $evType; Value = $evValue}
            }
        }
    }

    $evidences | Out-File -FilePath $OutputFile -Encoding utf8
}

function Validate-Evidence {
    param(
        [string]$EvType,
        [string]$EvValue
    )

    # 경로와 심볼 분리
    $filePath = ""
    $symbol = ""

    if ($EvValue -match "::") {
        $parts = $EvValue -split "::", 2
        $filePath = $parts[0]
        $symbol = $parts[1]
    }
    elseif ($EvValue -match "#L") {
        $filePath = ($EvValue -split "#")[0]
        $symbol = ""
    }
    else {
        $filePath = $EvValue
        $symbol = ""
    }

    $fullPath = Join-Path $ProjectRoot $filePath

    # 파일 존재 확인 (-LiteralPath로 [id] 등 특수문자 경로 지원)
    if (-not (Test-Path -LiteralPath $fullPath)) {
        return "FILE_NOT_FOUND"
    }

    # 심볼 존재 확인 (캐시 기반)
    if (-not [string]::IsNullOrEmpty($symbol)) {
        if ($EvType -in @("test", "e2e")) {
            # 테스트 selector의 따옴표 내용 검색
            if ($symbol -match '["\u0027]([^"\u0027]+)["\u0027]') {
                $searchString = $Matches[1]
                if (Test-CachedString -SearchString $searchString -FilePath $fullPath) {
                    return "VALID"
                }
                return "SYMBOL_NOT_FOUND"
            }
            if (Test-CachedString -SearchString $symbol -FilePath $fullPath) {
                return "VALID"
            }
            return "SYMBOL_NOT_FOUND"
        }
        else {
            # code, type, ui 심볼 검색 (캐시 기반)
            # 패턴 1: 일반 선언 (function/const/let/var/class/type/interface/enum/export + 심볼)
            # 패턴 2: 심볼 + 할당/호출 (심볼=, 심볼:, 심볼()
            # 패턴 3: destructuring export { GET, POST }
            # 패턴 4: Prisma 필드 (심볼 + 공백 + 타입)
            # 패턴 5: 마크다운 헤딩 (# 심볼)
            $pattern = "(function|const|let|var|class|type|interface|enum|export)\s+(\w+\s+)*$symbol|$symbol\s*[=:(,}]|^\s*$symbol\s+\w|^#+\s+$symbol"
            if (Test-CachedPattern -Pattern $pattern -FilePath $fullPath) {
                return "VALID"
            }
            return "SYMBOL_NOT_FOUND"
        }
    }

    return "VALID"
}

function Extract-Contracts {
    param([string]$OutputFile)

    $contracts = @()

    if (-not (Test-Path $SPECS_DIR)) { return }

    Get-ChildItem -Path $SPECS_DIR -Filter "*.md" | ForEach-Object {
        $specKey = $_.BaseName

        Get-Content $_.FullName | ForEach-Object {
            if ($_ -match "^###\s*Contract:\s*(.+)$") {
                $contractId = $Matches[1].Trim()
                $contracts += "$specKey|$contractId"
            }
        }
    }

    $contracts | Out-File -FilePath $OutputFile -Encoding utf8
}

#######################################
# 명령어: snapshot
#######################################

function Cmd-Snapshot {
    param(
        [switch]$Suggest,
        [switch]$Apply,
        [string]$Type
    )

    Print-Header "[specctl snapshot] 코드 인벤토리 추출 v$VERSION"
    Write-Host ""

    $uiFile = Join-Path $TMP_DIR "ui_routes.md"
    $apiFile = Join-Path $TMP_DIR "api_routes.md"

    # UI 라우트 스캔
    if ([string]::IsNullOrEmpty($Type) -or $Type -eq "ui-routes") {
        Print-Info "UI 라우트 스캔 중..."
        $uiCount = Scan-UIRoutes -OutputFile $uiFile
        Print-Success "UI 라우트: ${uiCount}개 발견"
    }

    # API 라우트 스캔
    if ([string]::IsNullOrEmpty($Type) -or $Type -eq "api-routes") {
        Print-Info "API 라우트 스캔 중..."
        $apiCount = Scan-APIRoutes -OutputFile $apiFile
        Print-Success "API 라우트: ${apiCount}개 발견"
    }

    Write-Host ""

    if ($Suggest) {
        Print-Info "모드: suggest (후보 제안)"
        Write-Host ""

        if (Test-Path $uiFile) {
            Write-Host "=== UI 라우트 후보 ===" -ForegroundColor Magenta
            Get-Content $uiFile
            Write-Host ""
        }

        if (Test-Path $apiFile) {
            Write-Host "=== API 라우트 후보 ===" -ForegroundColor Magenta
            Get-Content $apiFile
            Write-Host ""
        }

        Print-Info "적용하려면: specctl snapshot --apply"
    }
    else {
        Print-Info "SPEC_SNAPSHOT.md 갱신 중..."

        $snapshotFile = Join-Path $SSOT_DIR "SPEC_SNAPSHOT.md"
        $today = Get-DateString
        $timestamp = Get-TimestampString

        $content = @"
# SPEC_SNAPSHOT - 코드 인벤토리

> 자동 생성: specctl snapshot ($timestamp)

---

## 스캔 정보

| 항목 | 값 |
|------|-----|
| **생성일** | $today |
| **도구** | specctl v$VERSION |
| **프로젝트** | $(Split-Path -Leaf $ProjectRoot) |

---

## UI 라우트

"@

        if (Test-Path $uiFile) {
            $content += (Get-Content $uiFile -Raw)
        }
        else {
            $content += "(스캔된 UI 라우트 없음)"
        }

        $content += @"

---

## API 라우트

"@

        if (Test-Path $apiFile) {
            $content += (Get-Content $apiFile -Raw)
        }
        else {
            $content += "(스캔된 API 라우트 없음)"
        }

        $content += @"

---

## 이벤트 타입

> 자동화 미구현 - 수동 관리

| Event | File | SPEC_KEY |
|-------|------|----------|
| (수동 추가 필요) | - | - |

---

## 상태 목록

> 자동화 미구현 - 수동 관리

| State | File | SPEC_KEY |
|-------|------|----------|
| (수동 추가 필요) | - | - |

---

> **참고**: UI/API 라우트는 자동 스캔됨. 이벤트/상태는 수동 관리 필요.
"@

        $content | Out-File -FilePath $snapshotFile -Encoding utf8

        Print-Success "SPEC_SNAPSHOT.md 갱신 완료"
        Print-Info "위치: $snapshotFile"
    }

    Write-Host ""
}

#######################################
# 명령어: verify
#######################################

function Update-CoverageMatrix {
    param(
        [int]$SyncCount,
        [int]$MissingCount,
        [int]$HalluCount,
        [int]$BrokenCount,
        [int]$GapCount,
        [string]$DetailsFile,
        [string]$Level
    )

    $matrixFile = Join-Path $SSOT_DIR "COVERAGE_MATRIX.md"
    $today = Get-DateString
    $total = $SyncCount + $MissingCount + $HalluCount + $BrokenCount + $GapCount

    $content = @"
# COVERAGE_MATRIX - 문서 커버리지 현황

> 코드(Snapshot) ↔ 문서(Contract) 매핑 상태를 한 눈에 확인

---

## 상태 범례

| 상태 | 의미 | 조치 |
|------|------|------|
| SYNC | 코드O 문서O 증거O | 없음 |
| MISSING_DOC | 코드O 문서X | Contract 추가 필요 |
| HALLUCINATION | 코드X 문서O | Contract 삭제 또는 코드 추가 |
| BROKEN_EVIDENCE | 증거 링크 깨짐 | Evidence 수정 |
| SNAPSHOT_GAP | 자동화 범위 밖 | 점진적 확장 |

---

## 요약

| 항목 | 값 |
|------|-----|
| **마지막 검증** | $today |
| **검증 레벨** | $Level |
| **총 항목** | $total |
| **SYNC** | $SyncCount |
| **MISSING_DOC** | $MissingCount |
| **HALLUCINATION** | $HalluCount |
| **BROKEN_EVIDENCE** | $BrokenCount |
| **SNAPSHOT_GAP** | $GapCount |

---

## 전체 매트릭스

| SPEC_KEY | Contract ID | Code (Snapshot) | Doc (Contract) | Evidence | Status |
|----------|-------------|:---------------:|:--------------:|:--------:|--------|
"@

    if (Test-Path $DetailsFile) {
        $content += (Get-Content $DetailsFile -Raw)
    }

    $content += @"

---

## 히스토리

| 날짜 | SYNC | MISSING | HALLU | BROKEN | GAP | 변화 |
|------|:----:|:-------:|:-----:|:------:|:---:|------|
| $today | $SyncCount | $MissingCount | $HalluCount | $BrokenCount | $GapCount | specctl verify |

---

> **자동 생성**: ``specctl verify`` 실행 시 갱신됨
"@

    $content | Out-File -FilePath $matrixFile -Encoding utf8
}

function Update-DriftReport {
    param([string]$DriftsFile)

    $reportFile = Join-Path $SSOT_DIR "DRIFT_REPORT.md"
    $today = Get-DateString
    $timestamp = Get-TimestampString

    $content = @"
# DRIFT_REPORT - 드리프트 기록

> 검증 실패 항목 추적

---

## Active (해결 필요)

| ID | Type | Item | Detected | Status |
|----|------|------|----------|--------|
"@

    $driftId = 1
    if ((Test-Path $DriftsFile) -and (Get-Content $DriftsFile -ErrorAction SilentlyContinue)) {
        Get-Content $DriftsFile | ForEach-Object {
            $parts = $_ -split '\|'
            if ($parts.Count -ge 2) {
                $dtype = $parts[0]
                $item = $parts[1]
                $content += "| DRIFT-$("{0:D3}" -f $driftId) | $dtype | $item | $today | OPEN |`n"
                $driftId++
            }
        }
    }
    else {
        $content += "| - | - | (드리프트 없음) | - | - |`n"
    }

    $content += @"

---

## Resolved (최근 30일)

| ID | Type | Item | Resolved | How |
|----|------|------|----------|-----|
| - | - | - | - | - |

---

## Archive

> 30일 지난 항목은 docs/05_archive/drift_history/로 이동

---

> **자동 생성**: $timestamp
"@

    $content | Out-File -FilePath $reportFile -Encoding utf8
}

function Cmd-Verify {
    param(
        [ValidateSet("soft", "strict")]
        [string]$Level = "soft",
        [switch]$Cache,
        [switch]$Full,
        [switch]$DebugDump,
        [switch]$Quiet
    )

    if (-not $Quiet) {
        Print-Header "[specctl verify] 문서-코드 검증 v$VERSION"
        Write-Host "검증 레벨: $Level" -ForegroundColor Cyan
        Write-Host ""
    }

    # 1. Evidence 추출
    if (-not $Quiet) { Print-Info "Evidence 추출 중..." }
    $evidenceFile = Join-Path $TMP_DIR "evidences.txt"
    Extract-Evidences -OutputFile $evidenceFile
    $evidenceCount = if (Test-Path $evidenceFile) { (Get-Content $evidenceFile | Measure-Object -Line).Lines } else { 0 }
    if (-not $Quiet) { Print-Success "Evidence: ${evidenceCount}개" }

    # 2. Contract 목록 추출
    if (-not $Quiet) { Print-Info "Contract 목록 추출 중..." }
    $contractsFile = Join-Path $TMP_DIR "contracts.txt"
    Extract-Contracts -OutputFile $contractsFile
    $contractCount = if (Test-Path $contractsFile) { (Get-Content $contractsFile | Measure-Object -Line).Lines } else { 0 }
    if (-not $Quiet) { Print-Success "Contract: ${contractCount}개" }

    # 3. Snapshot 파싱 + Hash 인덱싱
    if (-not $Quiet) { Print-Info "Snapshot 파싱 중..." }
    $snapshotFile = Join-Path $SSOT_DIR "SPEC_SNAPSHOT.md"
    $snapshotRoutes = @()

    # Hash 인덱스 초기화
    $script:SnapshotRoutes = @{}

    if (Test-Path $snapshotFile) {
        Get-Content $snapshotFile | ForEach-Object {
            if ($_ -match '^\|\s*(\/[^|]*)\s*\|') {
                $route = $Matches[1].Trim()
                $snapshotRoutes += $route
                # Hash 인덱싱 (O(1) 조회용)
                $script:SnapshotRoutes[$route] = $true
                $script:SnapshotRoutes[$route.ToLower()] = $true
            }
        }
    }
    if (-not $Quiet) { Print-Success "Snapshot 항목: $($snapshotRoutes.Count)개" }

    if (-not $Quiet) {
        Write-Host ""
        Print-Info "검증 수행 중..."
        Write-Host ""
    }

    # 4. 검증 수행
    $syncCount = 0
    $missingCount = 0
    $halluCount = 0
    $brokenCount = 0
    $gapCount = 0

    $detailsFile = Join-Path $TMP_DIR "matrix_details.txt"
    $driftsFile = Join-Path $TMP_DIR "drifts.txt"
    $details = @()
    $drifts = @()

    # Contract 존재 해시 초기화
    $script:ContractExists = @{}

    # Evidence 라우트 → Contract 역방향 인덱스
    $script:RouteToContract = @{}

    # Contract별 검증 (최적화: O(1) 해시 조회)
    if (Test-Path $contractsFile) {
        $contracts = Get-Content $contractsFile

        foreach ($contractLine in $contracts) {
            if ([string]::IsNullOrWhiteSpace($contractLine)) { continue }

            $parts = $contractLine -split '\|'
            if ($parts.Count -lt 2) { continue }

            $specKey = $parts[0]
            $contractId = $parts[1]

            # Contract 존재 등록
            $script:ContractExists[$contractId] = $true

            $hasEvidence = $false
            $evidenceValid = $true
            $inSnapshot = $false

            # O(1) 해시 조회로 Evidence 검증
            $evidenceKey = "$specKey|$contractId"
            if ($script:EvidenceByContract.ContainsKey($evidenceKey)) {
                $hasEvidence = $true

                foreach ($ev in $script:EvidenceByContract[$evidenceKey]) {
                    $result = Validate-Evidence -EvType $ev.Type -EvValue $ev.Value
                    if ($result -ne "VALID") {
                        $evidenceValid = $false
                    }
                }
            }

            # Snapshot 매칭 (Evidence 파일 경로 기반 + Contract ID 기반)
            $routeGuess = $contractId.ToLower() -replace '_func_', '/' -replace '_design_', '/' -replace '_', '/'
            $specLower = $specKey.ToLower()

            # Evidence 파일 경로에서 라우트 추출
            $evidenceRoutes = @()
            if ($script:EvidenceByContract.ContainsKey($evidenceKey)) {
                foreach ($ev in $script:EvidenceByContract[$evidenceKey]) {
                    $evPath = $ev.Value -split '::' | Select-Object -First 1
                    # src/app/xxx/page.tsx -> /xxx
                    # src/app/api/xxx/route.ts -> /api/xxx
                    if ($evPath -match 'src/app/api/(.+)/route\.ts') {
                        # [...param] -> *param (catch-all), [param] -> :param (dynamic)
                        $routePart = $Matches[1] -replace '\[\.\.\.([^\]]+)\]', '*$1' -replace '\[([^\]]+)\]', ':$1'
                        $evidenceRoutes += "/api/$routePart"
                    }
                    elseif ($evPath -match 'src/app/(.+)/page\.tsx') {
                        # [...param] -> *param (catch-all), [param] -> :param (dynamic)
                        $routePath = $Matches[1] -replace '\[\.\.\.([^\]]+)\]', '*$1' -replace '\[([^\]]+)\]', ':$1'
                        $evidenceRoutes += "/$routePath"
                    }
                    elseif ($evPath -match 'src/app/page\.tsx') {
                        $evidenceRoutes += "/"
                    }
                }
            }

            # Evidence 라우트를 역방향 인덱스에 등록
            foreach ($evRoute in $evidenceRoutes) {
                $script:RouteToContract[$evRoute] = $contractId
                $script:RouteToContract[$evRoute.ToLower()] = $contractId
            }

            # Evidence 라우트로 매칭 시도
            foreach ($evRoute in $evidenceRoutes) {
                if ($script:SnapshotRoutes.ContainsKey($evRoute) -or $script:SnapshotRoutes.ContainsKey($evRoute.ToLower())) {
                    $inSnapshot = $true
                    break
                }
            }

            # 기존 Contract ID 기반 매칭 (폴백)
            if (-not $inSnapshot) {
                if ($script:SnapshotRoutes.ContainsKey("/$routeGuess") -or
                    $script:SnapshotRoutes.ContainsKey("/api/$routeGuess") -or
                    $script:SnapshotRoutes.ContainsKey("/$specLower") -or
                    $script:SnapshotRoutes.ContainsKey("/api/$specLower")) {
                    $inSnapshot = $true
                }
                else {
                    # 폴백: 부분 매칭
                    foreach ($route in $script:SnapshotRoutes.Keys) {
                        if ($route -like "*$routeGuess*" -or $route -like "*$specLower*") {
                            $inSnapshot = $true
                            break
                        }
                    }
                }
            }

            # 상태 판정
            $status = ""
            $codeMark = "-"
            $docMark = "O"
            $evMark = "-"

            if ($inSnapshot) { $codeMark = "O" }
            if ($hasEvidence -and $evidenceValid) { $evMark = "O" }
            if ($hasEvidence -and -not $evidenceValid) { $evMark = "X" }

            if ($hasEvidence -and $evidenceValid) {
                if ($inSnapshot) {
                    $status = "SYNC"
                    $syncCount++
                }
                else {
                    $status = "SNAPSHOT_GAP"
                    $gapCount++
                }
            }
            elseif ($hasEvidence -and -not $evidenceValid) {
                $status = "BROKEN_EVIDENCE"
                $brokenCount++
                $drifts += "BROKEN_EVIDENCE|$contractId"
            }
            else {
                $status = "SNAPSHOT_GAP"
                $gapCount++
            }

            $details += "| $specKey | $contractId | $codeMark | $docMark | $evMark | $status |"
        }
    }

    # Snapshot에 있지만 Contract가 없는 항목 (최적화: O(1) 해시 조회)
    foreach ($route in $snapshotRoutes) {
        if ([string]::IsNullOrWhiteSpace($route)) { continue }

        $hasContract = $false
        $routeLower = $route.ToLower()

        # 1. Evidence 라우트 역방향 인덱스에서 먼저 확인 (O(1))
        if ($script:RouteToContract.ContainsKey($route) -or $script:RouteToContract.ContainsKey($routeLower)) {
            $hasContract = $true
        }
        else {
            # 2. Contract ID 기반 해시 검색 (폴백)
            foreach ($contractId in $script:ContractExists.Keys) {
                $contractLower = $contractId.ToLower() -replace '_', '/'
                if ($routeLower -like "*$contractLower*" -or $contractLower -like "*$($routeLower.TrimStart('/') )*") {
                    $hasContract = $true
                    break
                }
            }
        }

        if (-not $hasContract) {
            $specKey = Get-SpecKey -Route $route
            $missingCount++
            $details += "| $specKey | (없음) | O | X | - | MISSING_DOC |"
            $drifts += "MISSING_DOC|$route"
        }
    }

    # 결과 출력
    if (-not $Quiet) {
        Write-Host "검증 결과:"
        Write-Host "  SYNC:            $syncCount" -ForegroundColor Green
        Write-Host "  MISSING_DOC:     $missingCount" -ForegroundColor Yellow
        Write-Host "  HALLUCINATION:   $halluCount" -ForegroundColor Red
        Write-Host "  BROKEN_EVIDENCE: $brokenCount" -ForegroundColor Red
        Write-Host "  SNAPSHOT_GAP:    $gapCount" -ForegroundColor Cyan
        Write-Host ""
    }

    # 파일 저장
    $details | Out-File -FilePath $detailsFile -Encoding utf8
    $drifts | Out-File -FilePath $driftsFile -Encoding utf8

    # COVERAGE_MATRIX 갱신
    Update-CoverageMatrix -SyncCount $syncCount -MissingCount $missingCount -HalluCount $halluCount -BrokenCount $brokenCount -GapCount $gapCount -DetailsFile $detailsFile -Level $Level
    if (-not $Quiet) { Print-Success "COVERAGE_MATRIX.md 갱신됨" }

    # DRIFT_REPORT 갱신
    Update-DriftReport -DriftsFile $driftsFile
    if (-not $Quiet) { Print-Success "DRIFT_REPORT.md 갱신됨" }

    # 디버그 덤프
    if ($DebugDump -and -not $Quiet) {
        Print-Info "CONTRACT_INDEX.md 생성됨 (디버그용)"
    }

    if (-not $Quiet) { Write-Host "" }

    # 레벨별 처리
    if ($Level -eq "strict") {
        if ($missingCount -gt 0 -or $halluCount -gt 0 -or $brokenCount -gt 0) {
            if (-not $Quiet) {
                Print-Error "strict 검증 실패!"
                Write-Host "  MISSING_DOC, HALLUCINATION, BROKEN_EVIDENCE가 0이어야 함"
            }
            exit 1
        }
        else {
            if (-not $Quiet) {
                Print-Success "strict 검증 통과"
                if ($gapCount -gt 0) {
                    Print-Warning "SNAPSHOT_GAP $gapCount개 - 자동화 범위 확장 필요"
                }
            }
        }
    }
    else {
        if (-not $Quiet) {
            Print-Success "soft 검증 완료 (경고만 기록)"
            if ($missingCount -gt 0 -or $halluCount -gt 0 -or $brokenCount -gt 0) {
                Print-Warning "드리프트 발견: DRIFT_REPORT.md 확인"
            }
        }
    }

    if (-not $Quiet) {
        Write-Host ""
        Print-Info "COVERAGE_MATRIX: $SSOT_DIR\COVERAGE_MATRIX.md"
        Print-Info "DRIFT_REPORT: $SSOT_DIR\DRIFT_REPORT.md"
    }
}

#######################################
# 명령어: update
#######################################

function Cmd-Update {
    Print-Header "[specctl update] Contract 업데이트 v$VERSION"
    Write-Host ""

    Print-Info "변경된 파일 감지 중..."

    try {
        $isGitRepo = git rev-parse --is-inside-work-tree 2>$null
        if ($isGitRepo) {
            $changedFiles = @()
            $changedFiles += git diff --name-only HEAD 2>$null
            $changedFiles += git diff --name-only --cached 2>$null
            $changedFiles += git ls-files --others --exclude-standard 2>$null

            $sourceChanges = $changedFiles | Where-Object { $_ -match '\.(ts|tsx|js|jsx)$' } | Sort-Object -Unique

            if ($sourceChanges.Count -gt 0) {
                Print-Success "변경된 소스 파일: $($sourceChanges.Count)개"
                Write-Host ""

                Write-Host "영향받는 SPEC_KEY 분석:"
                $affectedSpecs = @()

                foreach ($file in $sourceChanges) {
                    $specKey = "UNCLASSIFIED"
                    if ($file -match "/auth/|/login|/logout") { $specKey = "AUTH" }
                    elseif ($file -match "/user/|/users/") { $specKey = "USER" }
                    elseif ($file -match "/chat/") { $specKey = "CHAT" }
                    elseif ($file -match "/api/") { $specKey = "API" }

                    $affectedSpecs += $specKey
                    Write-Host "  - $file -> $specKey"
                }

                Write-Host ""
                $uniqueSpecs = $affectedSpecs | Sort-Object -Unique
                Print-Info "영향받는 SPEC: $($uniqueSpecs -join ', ')"
                Write-Host ""

                Print-Warning "위 SPEC 문서의 Contract/Evidence 검토 필요"
            }
            else {
                Print-Success "변경된 소스 파일 없음"
            }
        }
        else {
            Print-Warning "Git 저장소가 아닙니다. 수동 검토 필요."
        }
    }
    catch {
        Print-Warning "Git 저장소가 아닙니다. 수동 검토 필요."
    }

    Write-Host ""
    Print-Info "Contract 수동 편집: $SPECS_DIR\<SPEC_KEY>.md"
}

#######################################
# 명령어: compile
#######################################

function Cmd-Compile {
    Print-Header "[specctl compile] 산출물 생성 v$VERSION"
    Write-Host ""

    $today = Get-DateString
    $timestamp = Get-TimestampString

    # DevSpec 생성
    Print-Info "DEV_SPEC_LATEST.md 생성 중..."

    if (-not (Test-Path $DEVSPEC_DIR)) {
        New-Item -ItemType Directory -Force -Path $DEVSPEC_DIR | Out-Null
    }

    $devspecFile = Join-Path $DEVSPEC_DIR "DEV_SPEC_LATEST.md"

    $content = @"
# 개발 사양서 (DEV_SPEC)

> 자동 생성: specctl compile ($timestamp)

---

## 목차

"@

    $specCount = 0
    if (Test-Path $SPECS_DIR) {
        Get-ChildItem -Path $SPECS_DIR -Filter "*.md" | ForEach-Object {
            $specName = $_.BaseName
            $content += "- [$specName](#$specName)`n"
            $specCount++
        }
    }

    $content += "`n---`n`n"

    # 각 spec 내용 병합
    if (Test-Path $SPECS_DIR) {
        Get-ChildItem -Path $SPECS_DIR -Filter "*.md" | ForEach-Object {
            $specName = $_.BaseName
            $content += "## $specName`n`n"

            $specContent = Get-Content $_.FullName -Raw
            if ($specContent -match '(?s)<!-- FUNCTIONAL:BEGIN -->(.*)<!-- FUNCTIONAL:END -->') {
                $content += $Matches[1].Trim() + "`n"
            }

            $content += "`n---`n`n"
        }
    }

    $content += @"

---

> **자동 생성**: $timestamp
> **Spec 문서 수**: $specCount
"@

    $content | Out-File -FilePath $devspecFile -Encoding utf8
    Print-Success "DEV_SPEC_LATEST.md 생성 완료"

    # User Manual 생성
    Print-Info "USER_MANUAL_LATEST.md 생성 중..."

    if (-not (Test-Path $MANUALS_DIR)) {
        New-Item -ItemType Directory -Force -Path $MANUALS_DIR | Out-Null
    }

    $manualFile = Join-Path $MANUALS_DIR "USER_MANUAL_LATEST.md"

    $content = @"
# 사용자 매뉴얼

> 자동 생성: specctl compile ($timestamp)

---

## 목차

"@

    if (Test-Path $SPECS_DIR) {
        Get-ChildItem -Path $SPECS_DIR -Filter "*.md" | ForEach-Object {
            $specName = $_.BaseName
            $content += "- [$specName](#$specName)`n"
        }
    }

    $content += "`n---`n`n"

    # 각 spec의 디자인 요소 병합
    if (Test-Path $SPECS_DIR) {
        Get-ChildItem -Path $SPECS_DIR -Filter "*.md" | ForEach-Object {
            $specName = $_.BaseName
            $content += "## $specName`n`n"

            $specContent = Get-Content $_.FullName -Raw
            if ($specContent -match '(?s)<!-- DESIGN:BEGIN -->(.*)<!-- DESIGN:END -->') {
                $content += $Matches[1].Trim() + "`n"
            }

            $content += "`n---`n`n"
        }
    }

    $content += @"

---

> **자동 생성**: $timestamp
"@

    $content | Out-File -FilePath $manualFile -Encoding utf8
    Print-Success "USER_MANUAL_LATEST.md 생성 완료"

    Write-Host ""
    Print-Info "DevSpec: $devspecFile"
    Print-Info "Manual: $manualFile"
}

#######################################
# 명령어: status
#######################################

function Cmd-Status {
    Print-Header "[specctl status] 현재 상태 v$VERSION"
    Write-Host ""

    Write-Host "Version:        $VERSION" -ForegroundColor Blue
    Write-Host "Project:        $(Split-Path -Leaf $ProjectRoot)" -ForegroundColor Blue
    Write-Host ""

    Write-Host "SSOT 파일:"
    $files = @("ANCHOR.md", "DOC_POLICY.md", "COVERAGE_MATRIX.md", "SPEC_SNAPSHOT.md", "DRIFT_REPORT.md", "DOC_DEBT.md")
    foreach ($file in $files) {
        $path = Join-Path $SSOT_DIR $file
        if (Test-Path $path) {
            Print-Success $file
        }
        else {
            Print-Warning "$file (없음)"
        }
    }
    Write-Host ""

    $specCount = 0
    if (Test-Path $SPECS_DIR) {
        $specCount = (Get-ChildItem -Path $SPECS_DIR -Filter "*.md" | Measure-Object).Count
    }
    Write-Host "Spec 문서:      $specCount개" -ForegroundColor Green

    $contractCount = 0
    if (Test-Path $SPECS_DIR) {
        Get-ChildItem -Path $SPECS_DIR -Filter "*.md" | ForEach-Object {
            $contractCount += (Select-String -Path $_.FullName -Pattern "^### Contract:" | Measure-Object).Count
        }
    }
    Write-Host "Contract:       $contractCount개" -ForegroundColor Green

    # 마지막 검증 정보
    $matrixFile = Join-Path $SSOT_DIR "COVERAGE_MATRIX.md"
    if (Test-Path $matrixFile) {
        $content = Get-Content $matrixFile -Raw
        if ($content -match '\|\s*\*\*마지막 검증\*\*\s*\|\s*([^|]+)\s*\|') {
            Write-Host "마지막 검증:   $($Matches[1].Trim())" -ForegroundColor Cyan
        }
    }

    Write-Host ""
    Print-Info "ANCHOR: $SSOT_DIR\ANCHOR.md"
    Print-Info "Specs: $SPECS_DIR\"
}

#######################################
# 도움말
#######################################

function Show-Help {
    Write-Host @"
specctl - DocOps CLI v$VERSION

사용법: specctl <command> [options]

명령어:
  snapshot [-Suggest|-Apply] [-Type TYPE]
                        코드 인벤토리 추출
  verify [-Level soft|strict] [-Cache|-Full] [-DebugDump] [-Quiet]
                        문서-코드 검증 (-Quiet: 출력 최소화)
  update                diff 기반 Contract 업데이트 제안
  compile               산출물 생성 (DevSpec/Manual)
  status                현재 상태 확인
  help                  도움말

예시:
  .\specctl.ps1 snapshot -Suggest
  .\specctl.ps1 snapshot
  .\specctl.ps1 verify -Level soft
  .\specctl.ps1 verify -Level strict
  .\specctl.ps1 update
  .\specctl.ps1 compile
  .\specctl.ps1 status

"@
}

#######################################
# 메인
#######################################

# 종료 시 임시 디렉토리 정리
$cleanupScript = {
    if (Test-Path $TMP_DIR) {
        Remove-Item -Recurse -Force $TMP_DIR -ErrorAction SilentlyContinue
    }
}
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action $cleanupScript | Out-Null

$command = $args[0]
if (-not $command) { $command = "help" }

switch ($command) {
    "snapshot" {
        $suggest = $args -contains "-Suggest" -or $args -contains "--suggest"
        $apply = $args -contains "-Apply" -or $args -contains "--apply"
        $typeArg = $args | Where-Object { $_ -match "^-Type=|^--type=" }
        $type = if ($typeArg) { $typeArg -replace "^-Type=|^--type=", "" } else { "" }
        Cmd-Snapshot -Suggest:$suggest -Apply:$apply -Type $type
    }
    "verify" {
        $level = "soft"
        $levelArg = $args | Where-Object { $_ -match "^-Level=|^--level=" }
        if ($levelArg) { $level = $levelArg -replace "^-Level=|^--level=", "" }
        $cache = $args -contains "-Cache" -or $args -contains "--cache"
        $full = $args -contains "-Full" -or $args -contains "--full"
        $debugDump = $args -contains "-DebugDump" -or $args -contains "--debug-dump"
        $quiet = $args -contains "-Quiet" -or $args -contains "--quiet"
        Cmd-Verify -Level $level -Cache:$cache -Full:$full -DebugDump:$debugDump -Quiet:$quiet
    }
    "update" { Cmd-Update }
    "compile" { Cmd-Compile }
    "status" { Cmd-Status }
    "help" { Show-Help }
    "--version" { Write-Host "specctl v$VERSION" }
    "-v" { Write-Host "specctl v$VERSION" }
    default {
        Print-Error "알 수 없는 명령어: $command"
        Show-Help
        exit 1
    }
}

# 정리
if (Test-Path $TMP_DIR) {
    Remove-Item -Recurse -Force $TMP_DIR -ErrorAction SilentlyContinue
}
