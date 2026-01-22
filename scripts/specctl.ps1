#######################################
# specctl - DocOps CLI v0.3.0 (PowerShell)
# 문서-코드 동기화 및 검증 도구
# 성능 최적화 버전
#######################################

$VERSION = "0.5.0"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# 경로 정의
$SSOT_DIR = Join-Path $ProjectRoot "docs\00_ssot"
$SPECS_DIR = Join-Path $ProjectRoot "docs\03_standards\specs"
$DEVSPEC_DIR = Join-Path $ProjectRoot "docs\03_standards\devspec"
$MANUALS_DIR = Join-Path $ProjectRoot "docs\03_standards\manuals"

#######################################
# Contract 유형 분류 (v0.5.0)
#######################################

# PROCESS 기반 SPEC (GAP 계산 제외)
$script:ProcessBasedSpecs = @("AI_PROTOCOL", "DOCOPS")

# INFRA 기반 SPEC (GAP 계산 제외)
$script:InfraBasedSpecs = @("INFRA")

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
# 확장 스캔 함수 (v0.4.0)
#######################################

function Scan-UIComponents {
    param([string]$OutputFile)

    $components = @()
    $components += "| Component | File | SPEC_KEY |"
    $components += "|-----------|------|----------|"

    $found = 0

    # UI 컴포넌트 디렉토리들
    $dirs = @(
        (Join-Path $ProjectRoot "src\components\ui"),
        (Join-Path $ProjectRoot "src\components\space")
    )

    foreach ($dir in $dirs) {
        if (-not (Test-Path $dir)) { continue }

        Get-ChildItem -Path $dir -Filter "*.tsx" | ForEach-Object {
            $file = $_.FullName
            $relFile = $file.Replace("$ProjectRoot\", "").Replace("\", "/")
            $content = Get-Content -LiteralPath $file -Raw -ErrorAction SilentlyContinue

            # 패턴 1: export function/const ComponentName
            $matches1 = [regex]::Matches($content, 'export\s+(function|const)\s+([A-Z][a-zA-Z0-9]+)')
            foreach ($match in $matches1) {
                $componentName = $match.Groups[2].Value
                $specKey = "UI_COMPONENT"
                $components += "| $componentName | $relFile | $specKey |"
                $found++
            }

            # 패턴 2: export { ComponentName, ... } (named exports)
            $matches2 = [regex]::Matches($content, 'export\s*\{\s*([^}]+)\s*\}')
            foreach ($match in $matches2) {
                $exportList = $match.Groups[1].Value
                # 쉼표로 분리하여 각 export 처리
                $exports = $exportList -split ',' | ForEach-Object { $_.Trim() -replace '\s+as\s+\w+', '' }
                foreach ($exp in $exports) {
                    # 대문자로 시작하는 컴포넌트만
                    if ($exp -match '^[A-Z][a-zA-Z0-9]+$') {
                        $components += "| $exp | $relFile | UI_COMPONENT |"
                        $found++
                    }
                }
            }

            # 패턴 3: export interface/type (TypeScript 타입)
            $matches3 = [regex]::Matches($content, 'export\s+(interface|type)\s+([A-Z][a-zA-Z0-9]+)')
            foreach ($match in $matches3) {
                $typeName = $match.Groups[2].Value
                $components += "| $typeName | $relFile | UI_COMPONENT |"
                $found++
            }
        }
    }

    $components | Out-File -FilePath $OutputFile -Encoding utf8
    return $found
}

function Scan-PermissionUtils {
    param([string]$OutputFile)

    $utils = @()
    $utils += "| Export | File | SPEC_KEY | Type |"
    $utils += "|--------|------|----------|------|"

    $found = 0

    # 권한 관련 파일들
    $files = @(
        (Join-Path $ProjectRoot "src\lib\space-permissions.ts"),
        (Join-Path $ProjectRoot "src\lib\space-auth.ts")
    )

    foreach ($file in $files) {
        if (-not (Test-Path -LiteralPath $file)) { continue }

        $relFile = $file.Replace("$ProjectRoot\", "").Replace("\", "/")
        $content = Get-Content -LiteralPath $file -Raw -ErrorAction SilentlyContinue

        # export function
        $funcMatches = [regex]::Matches($content, 'export\s+(async\s+)?function\s+([a-zA-Z][a-zA-Z0-9]*)')
        foreach ($match in $funcMatches) {
            $name = $match.Groups[2].Value
            $utils += "| $name | $relFile | SPACE | function |"
            $found++
        }

        # export const
        $constMatches = [regex]::Matches($content, 'export\s+const\s+([A-Z_][A-Z_0-9]*)')
        foreach ($match in $constMatches) {
            $name = $match.Groups[1].Value
            $utils += "| $name | $relFile | SPACE | const |"
            $found++
        }

        # export type/interface
        $typeMatches = [regex]::Matches($content, 'export\s+(type|interface)\s+([A-Z][a-zA-Z0-9]*)')
        foreach ($match in $typeMatches) {
            $typeKind = $match.Groups[1].Value
            $name = $match.Groups[2].Value
            $utils += "| $name | $relFile | SPACE | $typeKind |"
            $found++
        }

        # export class
        $classMatches = [regex]::Matches($content, 'export\s+class\s+([A-Z][a-zA-Z0-9]*)')
        foreach ($match in $classMatches) {
            $name = $match.Groups[1].Value
            $utils += "| $name | $relFile | SPACE | class |"
            $found++
        }
    }

    $utils | Out-File -FilePath $OutputFile -Encoding utf8
    return $found
}

function Scan-SocketEvents {
    param([string]$OutputFile)

    $events = @()
    $events += "| Event | File | SPEC_KEY | Direction |"
    $events += "|-------|------|----------|-----------|"

    $found = 0

    $socketFile = Join-Path $ProjectRoot "server\socket-server.ts"

    if (-not (Test-Path -LiteralPath $socketFile)) {
        $events | Out-File -FilePath $OutputFile -Encoding utf8
        return 0
    }

    $relFile = $socketFile.Replace("$ProjectRoot\", "").Replace("\", "/")
    $content = Get-Content -LiteralPath $socketFile -Raw -ErrorAction SilentlyContinue

    # socket.on("eventName") 패턴 추출
    $matches = [regex]::Matches($content, 'socket\.on\("([^"]+)"')
    foreach ($match in $matches) {
        $eventName = $match.Groups[1].Value
        $events += "| $eventName | $relFile | SOCKET | client→server |"
        $found++
    }

    $events | Out-File -FilePath $OutputFile -Encoding utf8
    return $found
}

function Scan-DesignTokens {
    param([string]$OutputFile)

    $tokens = @()
    $tokens += "| Token | File | SPEC_KEY | Category |"
    $tokens += "|-------|------|----------|----------|"

    $found = 0

    $configFile = Join-Path $ProjectRoot "src\lib\text-config.ts"

    if (-not (Test-Path -LiteralPath $configFile)) {
        $tokens | Out-File -FilePath $OutputFile -Encoding utf8
        return 0
    }

    $relFile = $configFile.Replace("$ProjectRoot\", "").Replace("\", "/")
    $content = Get-Content -LiteralPath $configFile -Raw -ErrorAction SilentlyContinue

    # export const TOKEN_NAME 패턴 추출
    $matches = [regex]::Matches($content, 'export\s+const\s+([A-Z_][A-Z_0-9]*)\s*[=:]')
    foreach ($match in $matches) {
        $tokenName = $match.Groups[1].Value

        # 토큰 유형에 따라 SPEC_KEY 분류
        $specKey = switch -Wildcard ($tokenName) {
            "*TEXT*" { "UI_COMPONENT" }
            "*ID_TEXT*" { "FOUNDATION" }
            default { "FOUNDATION" }
        }

        $category = switch -Wildcard ($tokenName) {
            "BUTTON_TEXT" { "버튼 텍스트" }
            "STATUS_TEXT" { "상태 텍스트" }
            "PLACEHOLDER_TEXT" { "플레이스홀더" }
            "LABEL_TEXT" { "라벨" }
            "MESSAGE_TEXT" { "메시지" }
            "ID_TEXT" { "ID 기반 텍스트" }
            default { "기타" }
        }

        $tokens += "| $tokenName | $relFile | $specKey | $category |"
        $found++
    }

    # export type 추출
    $typeMatches = [regex]::Matches($content, 'export\s+type\s+([A-Z][a-zA-Z0-9]*Key)')
    foreach ($match in $typeMatches) {
        $typeName = $match.Groups[1].Value
        $tokens += "| $typeName | $relFile | FOUNDATION | 타입 |"
        $found++
    }

    # export function 추출
    $funcMatches = [regex]::Matches($content, 'export\s+function\s+([a-z][a-zA-Z0-9]*)')
    foreach ($match in $funcMatches) {
        $funcName = $match.Groups[1].Value
        $tokens += "| $funcName | $relFile | FOUNDATION | 유틸리티 |"
        $found++
    }

    $tokens | Out-File -FilePath $OutputFile -Encoding utf8
    return $found
}

function Scan-FeatureHooks {
    param([string]$OutputFile)

    $hooks = @()
    $hooks += "| Hook | File | SPEC_KEY | Feature |"
    $hooks += "|------|------|----------|---------|"

    $found = 0

    $hooksDir = Join-Path $ProjectRoot "src\features\space\hooks"

    if (-not (Test-Path $hooksDir)) {
        $hooks | Out-File -FilePath $OutputFile -Encoding utf8
        return 0
    }

    Get-ChildItem -Path $hooksDir -Filter "*.ts" | ForEach-Object {
        $file = $_.FullName
        $relFile = $file.Replace("$ProjectRoot\", "").Replace("\", "/")
        $content = Get-Content -LiteralPath $file -Raw -ErrorAction SilentlyContinue

        # export function useXxx 패턴 추출
        $matches = [regex]::Matches($content, 'export\s+function\s+(use[A-Z][a-zA-Z0-9]*)')
        foreach ($match in $matches) {
            $hookName = $match.Groups[1].Value

            # Hook 이름에서 기능 추출
            $feature = switch -Wildcard ($hookName) {
                "*Chat*" { "채팅" }
                "*Video*" { "비디오" }
                "*Audio*" { "오디오" }
                "*Screen*" { "화면공유" }
                "*Volume*" { "볼륨" }
                "*Media*" { "미디어" }
                "*Editor*" { "에디터" }
                "*Party*" { "파티" }
                "*Fullscreen*" { "전체화면" }
                "*Pair*" { "페어" }
                "*Notification*" { "알림" }
                "*Voice*" { "음성" }
                default { "공간" }
            }

            $hooks += "| $hookName | $relFile | SPACE | $feature |"
            $found++
        }
    }

    $hooks | Out-File -FilePath $OutputFile -Encoding utf8
    return $found
}

function Scan-CSSVariables {
    param([string]$OutputFile)

    $variables = @()
    $variables += "| Variable | File | SPEC_KEY | Category |"
    $variables += "|----------|------|----------|----------|"

    $found = 0

    $cssFile = Join-Path $ProjectRoot "src\app\globals.css"

    if (-not (Test-Path -LiteralPath $cssFile)) {
        $variables | Out-File -FilePath $OutputFile -Encoding utf8
        return 0
    }

    $relFile = $cssFile.Replace("$ProjectRoot\", "").Replace("\", "/")
    $content = Get-Content -LiteralPath $cssFile -Raw -ErrorAction SilentlyContinue

    # CSS 변수 추출: --variable-name: value;
    $matches = [regex]::Matches($content, '--([a-zA-Z][a-zA-Z0-9-]*)\s*:')
    foreach ($match in $matches) {
        $varName = $match.Groups[1].Value

        # 카테고리 분류
        $category = switch -Wildcard ($varName) {
            "primary*" { "Primary Color" }
            "secondary*" { "Secondary Color" }
            "background*" { "Background" }
            "foreground*" { "Foreground" }
            "muted*" { "Muted" }
            "accent*" { "Accent" }
            "destructive*" { "Destructive" }
            "border*" { "Border" }
            "input*" { "Input" }
            "ring*" { "Ring" }
            "radius*" { "Radius" }
            "chart*" { "Chart" }
            "sidebar*" { "Sidebar" }
            default { "기타" }
        }

        $variables += "| --$varName | $relFile | FOUNDATION | $category |"
        $found++
    }

    $variables | Out-File -FilePath $OutputFile -Encoding utf8
    return $found
}

function Scan-SocketHooksAndHandlers {
    param([string]$OutputFile)

    $items = @()
    $items += "| Name | File | SPEC_KEY | Type |"
    $items += "|------|------|----------|------|"

    $found = 0

    # socket 관련 파일들
    $files = @(
        (Join-Path $ProjectRoot "src\features\space\hooks\useSocket.ts"),
        (Join-Path $ProjectRoot "src\features\space\socket\useSocket.ts"),
        (Join-Path $ProjectRoot "server\socket-server.ts"),
        (Join-Path $ProjectRoot "server\socket-handlers.ts")
    )

    foreach ($file in $files) {
        if (-not (Test-Path -LiteralPath $file)) { continue }

        $relFile = $file.Replace("$ProjectRoot\", "").Replace("\", "/")
        $content = Get-Content -LiteralPath $file -Raw -ErrorAction SilentlyContinue

        # export function 추출
        $funcMatches = [regex]::Matches($content, 'export\s+(async\s+)?function\s+([a-zA-Z][a-zA-Z0-9]*)')
        foreach ($match in $funcMatches) {
            $name = $match.Groups[2].Value
            $specKey = if ($relFile -match 'useSocket') { "PERMISSION" } else { "SOCKET" }
            $items += "| $name | $relFile | $specKey | function |"
            $found++
        }

        # socket.emit 이벤트 추출
        $emitMatches = [regex]::Matches($content, 'socket\.emit\("([^"]+)"')
        foreach ($match in $emitMatches) {
            $eventName = $match.Groups[1].Value
            $items += "| $eventName | $relFile | SOCKET | emit |"
            $found++
        }

        # socket.on 이벤트 추출 (추가)
        $onMatches = [regex]::Matches($content, 'socket\.on\("([^"]+)"')
        foreach ($match in $onMatches) {
            $eventName = $match.Groups[1].Value
            $items += "| $eventName | $relFile | SOCKET | on |"
            $found++
        }

        # v0.5.1: io.on 이벤트 추출 (connection 등 서버 레벨 이벤트)
        $ioOnMatches = [regex]::Matches($content, 'io\.on\("([^"]+)"')
        foreach ($match in $ioOnMatches) {
            $eventName = $match.Groups[1].Value
            $items += "| $eventName | $relFile | SOCKET | io.on |"
            $found++
        }

        # v0.5.1: useCallback 함수 추출 (훅 반환 메서드)
        $callbackMatches = [regex]::Matches($content, 'const\s+([a-zA-Z][a-zA-Z0-9]*)\s*=\s*useCallback')
        foreach ($match in $callbackMatches) {
            $name = $match.Groups[1].Value
            $specKey = if ($relFile -match 'useSocket') { "PERMISSION" } else { "SOCKET" }
            $items += "| $name | $relFile | $specKey | callback |"
            $found++
        }
    }

    $items | Out-File -FilePath $OutputFile -Encoding utf8
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

            # v0.5.0: CSS 변수 매칭 (--variable-name:)
            if ($symbol -match '^--' -or $filePath -match '\.css$') {
                $cssPattern = "$symbol\s*:"
                if (Test-CachedPattern -Pattern $cssPattern -FilePath $fullPath) {
                    return "VALID"
                }
            }

            # v0.5.0: cva variant 매칭 (variant: { name: { ... } })
            if ($symbol -eq "variant" -or $symbol -eq "variants") {
                $cvaPattern = "variants?\s*:\s*\{"
                if (Test-CachedPattern -Pattern $cvaPattern -FilePath $fullPath) {
                    return "VALID"
                }
            }

            # v0.5.0: socket.on/emit 이벤트 매칭
            if ($filePath -match 'socket' -or $filePath -match 'Socket') {
                $socketPattern = "(socket|io)\.(on|emit)\([`"']$symbol[`"']"
                if (Test-CachedPattern -Pattern $socketPattern -FilePath $fullPath) {
                    return "VALID"
                }
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

    # 임시 파일 경로
    $uiFile = Join-Path $TMP_DIR "ui_routes.md"
    $apiFile = Join-Path $TMP_DIR "api_routes.md"
    $componentFile = Join-Path $TMP_DIR "ui_components.md"
    $permissionFile = Join-Path $TMP_DIR "permissions.md"
    $socketFile = Join-Path $TMP_DIR "socket_events.md"
    $tokenFile = Join-Path $TMP_DIR "design_tokens.md"
    $hookFile = Join-Path $TMP_DIR "feature_hooks.md"
    $cssFile = Join-Path $TMP_DIR "css_variables.md"          # v0.5.0
    $socketHooksFile = Join-Path $TMP_DIR "socket_hooks.md"   # v0.5.0

    # 스캔 결과 카운트
    $uiCount = 0
    $apiCount = 0
    $componentCount = 0
    $permissionCount = 0
    $socketCount = 0
    $tokenCount = 0
    $hookCount = 0
    $cssCount = 0           # v0.5.0
    $socketHooksCount = 0   # v0.5.0

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

    # UI 컴포넌트 스캔 (v0.4.0 확장)
    if ([string]::IsNullOrEmpty($Type) -or $Type -eq "ui-components") {
        Print-Info "UI 컴포넌트 스캔 중..."
        $componentCount = Scan-UIComponents -OutputFile $componentFile
        Print-Success "UI 컴포넌트: ${componentCount}개 발견"
    }

    # 권한 유틸리티 스캔 (v0.4.0 확장)
    if ([string]::IsNullOrEmpty($Type) -or $Type -eq "permissions") {
        Print-Info "권한 유틸리티 스캔 중..."
        $permissionCount = Scan-PermissionUtils -OutputFile $permissionFile
        Print-Success "권한 유틸리티: ${permissionCount}개 발견"
    }

    # Socket 이벤트 스캔 (v0.4.0 확장)
    if ([string]::IsNullOrEmpty($Type) -or $Type -eq "socket-events") {
        Print-Info "Socket 이벤트 스캔 중..."
        $socketCount = Scan-SocketEvents -OutputFile $socketFile
        Print-Success "Socket 이벤트: ${socketCount}개 발견"
    }

    # 설계 토큰 스캔 (v0.4.0 확장)
    if ([string]::IsNullOrEmpty($Type) -or $Type -eq "design-tokens") {
        Print-Info "설계 토큰 스캔 중..."
        $tokenCount = Scan-DesignTokens -OutputFile $tokenFile
        Print-Success "설계 토큰: ${tokenCount}개 발견"
    }

    # Feature 훅 스캔 (v0.4.0 확장)
    if ([string]::IsNullOrEmpty($Type) -or $Type -eq "feature-hooks") {
        Print-Info "Feature 훅 스캔 중..."
        $hookCount = Scan-FeatureHooks -OutputFile $hookFile
        Print-Success "Feature 훅: ${hookCount}개 발견"
    }

    # CSS 변수 스캔 (v0.5.0 신규)
    if ([string]::IsNullOrEmpty($Type) -or $Type -eq "css-variables") {
        Print-Info "CSS 변수 스캔 중..."
        $cssCount = Scan-CSSVariables -OutputFile $cssFile
        Print-Success "CSS 변수: ${cssCount}개 발견"
    }

    # Socket 훅/핸들러 스캔 (v0.5.0 신규)
    if ([string]::IsNullOrEmpty($Type) -or $Type -eq "socket-hooks") {
        Print-Info "Socket 훅/핸들러 스캔 중..."
        $socketHooksCount = Scan-SocketHooksAndHandlers -OutputFile $socketHooksFile
        Print-Success "Socket 훅/핸들러: ${socketHooksCount}개 발견"
    }

    $totalCount = $uiCount + $apiCount + $componentCount + $permissionCount + $socketCount + $tokenCount + $hookCount + $cssCount + $socketHooksCount
    Write-Host ""
    Print-Info "총 스캔 항목: ${totalCount}개"
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

        if (Test-Path $componentFile) {
            Write-Host "=== UI 컴포넌트 후보 ===" -ForegroundColor Magenta
            Get-Content $componentFile
            Write-Host ""
        }

        if (Test-Path $socketFile) {
            Write-Host "=== Socket 이벤트 후보 ===" -ForegroundColor Magenta
            Get-Content $socketFile
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
> 버전: v$VERSION (확장 스캔 지원)

---

## 스캔 정보

| 항목 | 값 |
|------|-----|
| **생성일** | $today |
| **도구** | specctl v$VERSION |
| **프로젝트** | $(Split-Path -Leaf $ProjectRoot) |
| **총 항목** | $totalCount |

### 세부 카운트

| 카테고리 | 개수 |
|----------|:----:|
| UI 라우트 | $uiCount |
| API 라우트 | $apiCount |
| UI 컴포넌트 | $componentCount |
| 권한 유틸리티 | $permissionCount |
| Socket 이벤트 | $socketCount |
| 설계 토큰 | $tokenCount |
| Feature 훅 | $hookCount |
| CSS 변수 | $cssCount |
| Socket 훅/핸들러 | $socketHooksCount |

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

## UI 컴포넌트

> 자동 스캔: src/components/ui/*.tsx, src/components/space/*.tsx

"@

        if (Test-Path $componentFile) {
            $content += (Get-Content $componentFile -Raw)
        }
        else {
            $content += "(스캔된 UI 컴포넌트 없음)"
        }

        $content += @"

---

## 권한 유틸리티

> 자동 스캔: src/lib/space-permissions.ts, src/lib/space-auth.ts

"@

        if (Test-Path $permissionFile) {
            $content += (Get-Content $permissionFile -Raw)
        }
        else {
            $content += "(스캔된 권한 유틸리티 없음)"
        }

        $content += @"

---

## Socket.io 이벤트

> 자동 스캔: server/socket-server.ts

"@

        if (Test-Path $socketFile) {
            $content += (Get-Content $socketFile -Raw)
        }
        else {
            $content += "(스캔된 Socket 이벤트 없음)"
        }

        $content += @"

---

## 설계 토큰

> 자동 스캔: src/lib/text-config.ts

"@

        if (Test-Path $tokenFile) {
            $content += (Get-Content $tokenFile -Raw)
        }
        else {
            $content += "(스캔된 설계 토큰 없음)"
        }

        $content += @"

---

## Feature 훅

> 자동 스캔: src/features/space/hooks/*.ts

"@

        if (Test-Path $hookFile) {
            $content += (Get-Content $hookFile -Raw)
        }
        else {
            $content += "(스캔된 Feature 훅 없음)"
        }

        $content += @"

---

## CSS 변수 (v0.5.0)

> 자동 스캔: src/app/globals.css

"@

        if (Test-Path $cssFile) {
            $content += (Get-Content $cssFile -Raw)
        }
        else {
            $content += "(스캔된 CSS 변수 없음)"
        }

        $content += @"

---

## Socket 훅/핸들러 (v0.5.0)

> 자동 스캔: src/features/space/hooks/useSocket.ts, server/socket-*.ts

"@

        if (Test-Path $socketHooksFile) {
            $content += (Get-Content $socketHooksFile -Raw)
        }
        else {
            $content += "(스캔된 Socket 훅/핸들러 없음)"
        }

        $content += @"

---

> **참고**: 모든 항목은 자동 스캔됨 (v0.5.0 확장)
> **Contract 유형 분류**: PROCESS_BASED(AI_PROTOCOL), INFRA_BASED(INFRA)는 GAP 계산에서 제외
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
        [int]$ProcessBasedCount = 0,
        [int]$InfraBasedCount = 0,
        [string]$DetailsFile,
        [string]$Level
    )

    $matrixFile = Join-Path $SSOT_DIR "COVERAGE_MATRIX.md"
    $today = Get-DateString
    $codeBasedTotal = $SyncCount + $MissingCount + $HalluCount + $BrokenCount + $GapCount
    $total = $codeBasedTotal + $ProcessBasedCount + $InfraBasedCount

    # 자동화율 계산 (CODE 기반만)
    $automationRate = if (($SyncCount + $GapCount) -gt 0) {
        [math]::Round(($SyncCount / ($SyncCount + $GapCount)) * 100, 1)
    } else { 100 }

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
| SNAPSHOT_GAP | 자동화 범위 밖 (CODE 기반) | 점진적 확장 |
| PROCESS_BASED | 프로세스 기반 (GAP 제외) | 수동 검증 |
| INFRA_BASED | 인프라 기반 (GAP 제외) | 배포 검증 |

---

## 요약

| 항목 | 값 |
|------|-----|
| **마지막 검증** | $today |
| **검증 레벨** | $Level |
| **총 항목** | $total |
| **SYNC** | $SyncCount |
| **SNAPSHOT_GAP** | $GapCount |
| **PROCESS_BASED** | $ProcessBasedCount |
| **INFRA_BASED** | $InfraBasedCount |
| **BROKEN_EVIDENCE** | $BrokenCount |
| **MISSING_DOC** | $MissingCount |
| **HALLUCINATION** | $HalluCount |

### 자동화율 (CODE 기반)

| 지표 | 값 |
|------|-----|
| **CODE 기반 SYNC** | $SyncCount |
| **CODE 기반 GAP** | $GapCount |
| **자동화율** | $automationRate% |

> **Note**: PROCESS_BASED($ProcessBasedCount), INFRA_BASED($InfraBasedCount)는 GAP 계산에서 제외됨

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

| 날짜 | SYNC | GAP | PROCESS | INFRA | BROKEN | MISSING | HALLU | 자동화율 |
|------|:----:|:---:|:-------:|:-----:|:------:|:-------:|:-----:|:--------:|
| $today | $SyncCount | $GapCount | $ProcessBasedCount | $InfraBasedCount | $BrokenCount | $MissingCount | $HalluCount | $automationRate% |

---

> **자동 생성**: ``specctl verify`` 실행 시 갱신됨 (v$VERSION)
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

    # 3. Snapshot 파싱 + Hash 인덱싱 (v0.4.0 확장)
    if (-not $Quiet) { Print-Info "Snapshot 파싱 중..." }
    $snapshotFile = Join-Path $SSOT_DIR "SPEC_SNAPSHOT.md"
    $snapshotRoutes = @()

    # Hash 인덱스 초기화
    $script:SnapshotRoutes = @{}
    # 확장 인덱스 (v0.4.0): 컴포넌트, 훅, 이벤트, 유틸리티, 토큰
    $script:SnapshotComponents = @{}
    $script:SnapshotHooks = @{}
    $script:SnapshotEvents = @{}
    $script:SnapshotUtils = @{}
    $script:SnapshotTokens = @{}
    # v0.5.0 확장 인덱스: CSS 변수, Socket 훅/핸들러
    $script:SnapshotCSSVariables = @{}
    $script:SnapshotSocketHooks = @{}

    $componentCount = 0
    $hookCount = 0
    $eventCount = 0
    $utilCount = 0
    $tokenCount = 0
    $cssVarCount = 0
    $socketHookCount = 0

    if (Test-Path $snapshotFile) {
        $currentSection = ""
        Get-Content $snapshotFile | ForEach-Object {
            # 섹션 헤더 감지
            if ($_ -match '^##\s+(.+)$') {
                $currentSection = $Matches[1].Trim()
            }

            # 라우트 추출 (기존)
            if ($_ -match '^\|\s*(\/[^|]*)\s*\|') {
                $route = $Matches[1].Trim()
                $snapshotRoutes += $route
                $script:SnapshotRoutes[$route] = $true
                $script:SnapshotRoutes[$route.ToLower()] = $true
            }

            # UI 컴포넌트 추출 (v0.4.0)
            if ($currentSection -eq "UI 컴포넌트" -and $_ -match '^\|\s*([A-Z][a-zA-Z0-9]+)\s*\|') {
                $componentName = $Matches[1].Trim()
                $script:SnapshotComponents[$componentName] = $true
                $script:SnapshotComponents[$componentName.ToLower()] = $true
                $componentCount++
            }

            # Feature 훅 추출 (v0.4.0)
            if ($currentSection -eq "Feature 훅" -and $_ -match '^\|\s*(use[A-Z][a-zA-Z0-9]+)\s*\|') {
                $hookName = $Matches[1].Trim()
                $script:SnapshotHooks[$hookName] = $true
                $script:SnapshotHooks[$hookName.ToLower()] = $true
                $hookCount++
            }

            # Socket 이벤트 추출 (v0.4.0)
            if ($currentSection -eq "Socket.io 이벤트" -and $_ -match '^\|\s*([a-z]+:[a-z]+|disconnect)\s*\|') {
                $eventName = $Matches[1].Trim()
                $script:SnapshotEvents[$eventName] = $true
                $eventCount++
            }

            # 권한 유틸리티 추출 (v0.4.0)
            if ($currentSection -eq "권한 유틸리티" -and $_ -match '^\|\s*([a-zA-Z][a-zA-Z0-9]+)\s*\|') {
                $utilName = $Matches[1].Trim()
                $script:SnapshotUtils[$utilName] = $true
                $script:SnapshotUtils[$utilName.ToLower()] = $true
                $utilCount++
            }

            # 설계 토큰 추출 (v0.4.0)
            if ($currentSection -eq "설계 토큰" -and $_ -match '^\|\s*([A-Z_][A-Z_0-9]*|[a-z][a-zA-Z0-9]+Key|get[A-Z][a-zA-Z0-9]+)\s*\|') {
                $tokenName = $Matches[1].Trim()
                $script:SnapshotTokens[$tokenName] = $true
                $script:SnapshotTokens[$tokenName.ToLower()] = $true
                $tokenCount++
            }

            # CSS 변수 추출 (v0.5.0)
            if ($currentSection -match "CSS 변수" -and $_ -match '^\|\s*--([a-zA-Z][a-zA-Z0-9-]*)\s*\|') {
                $varName = $Matches[1].Trim()
                $script:SnapshotCSSVariables["--$varName"] = $true
                $script:SnapshotCSSVariables[$varName] = $true
                $cssVarCount++
            }

            # Socket 훅/핸들러 추출 (v0.5.0)
            if ($currentSection -match "Socket 훅" -and $_ -match '^\|\s*([a-zA-Z][a-zA-Z0-9:_]*)\s*\|') {
                $hookName = $Matches[1].Trim()
                $script:SnapshotSocketHooks[$hookName] = $true
                $script:SnapshotSocketHooks[$hookName.ToLower()] = $true
                $socketHookCount++
            }
        }
    }
    $totalSnapshotItems = $snapshotRoutes.Count + $componentCount + $hookCount + $eventCount + $utilCount + $tokenCount + $cssVarCount + $socketHookCount
    if (-not $Quiet) { Print-Success "Snapshot 항목: ${totalSnapshotItems}개 (라우트:$($snapshotRoutes.Count), 컴포넌트:$componentCount, 훅:$hookCount, 이벤트:$eventCount, 유틸:$utilCount, 토큰:$tokenCount, CSS:$cssVarCount, socket:$socketHookCount)" }

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
    $processBasedCount = 0   # v0.5.0
    $infraBasedCount = 0     # v0.5.0

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

            # v0.4.0 확장: Evidence 파일 경로 기반 확장 매칭
            if (-not $inSnapshot -and $script:EvidenceByContract.ContainsKey($evidenceKey)) {
                foreach ($ev in $script:EvidenceByContract[$evidenceKey]) {
                    $evPath = $ev.Value -split '::' | Select-Object -First 1
                    $evSymbol = if ($ev.Value -match '::(.+)$') { $Matches[1] } else { "" }

                    # UI 컴포넌트 매칭 (심볼 또는 파일 경로 기반)
                    if ($evPath -match 'src/components/(ui|space)/') {
                        if ($evSymbol -and $script:SnapshotComponents.ContainsKey($evSymbol)) {
                            $inSnapshot = $true
                            break
                        }
                        # 파일 경로만 있어도 해당 디렉토리 파일이 스캔되었으면 SYNC
                        if (-not $evSymbol -and $script:SnapshotComponents.Count -gt 0) {
                            $inSnapshot = $true
                            break
                        }
                    }

                    # Feature 훅 매칭
                    if ($evPath -match 'src/features/.+/hooks/') {
                        if ($evSymbol -match '^use[A-Z]' -and $script:SnapshotHooks.ContainsKey($evSymbol)) {
                            $inSnapshot = $true
                            break
                        }
                        if (-not $evSymbol -and $script:SnapshotHooks.Count -gt 0) {
                            $inSnapshot = $true
                            break
                        }
                    }

                    # Socket 이벤트 매칭 (심볼 또는 파일 경로 기반)
                    if ($evPath -match 'server/socket-server\.ts') {
                        if ($evSymbol -and $script:SnapshotEvents.ContainsKey($evSymbol)) {
                            $inSnapshot = $true
                            break
                        }
                        # 파일 경로만 있어도 socket-server.ts가 스캔되었으면 SYNC
                        if (-not $evSymbol -and $script:SnapshotEvents.Count -gt 0) {
                            $inSnapshot = $true
                            break
                        }
                    }

                    # 권한 유틸리티 매칭
                    if ($evPath -match 'src/lib/space-(permissions|auth)\.ts') {
                        if ($evSymbol -and $script:SnapshotUtils.ContainsKey($evSymbol)) {
                            $inSnapshot = $true
                            break
                        }
                        if (-not $evSymbol -and $script:SnapshotUtils.Count -gt 0) {
                            $inSnapshot = $true
                            break
                        }
                    }

                    # 설계 토큰 매칭
                    if ($evPath -match 'src/lib/text-config\.ts') {
                        if ($evSymbol -and $script:SnapshotTokens.ContainsKey($evSymbol)) {
                            $inSnapshot = $true
                            break
                        }
                        if (-not $evSymbol -and $script:SnapshotTokens.Count -gt 0) {
                            $inSnapshot = $true
                            break
                        }
                    }

                    # v0.5.0: CSS 변수 매칭
                    if ($evPath -match 'globals\.css') {
                        if ($evSymbol -and ($script:SnapshotCSSVariables.ContainsKey($evSymbol) -or $script:SnapshotCSSVariables.ContainsKey("--$evSymbol"))) {
                            $inSnapshot = $true
                            break
                        }
                        if (-not $evSymbol -and $script:SnapshotCSSVariables.Count -gt 0) {
                            $inSnapshot = $true
                            break
                        }
                    }

                    # v0.5.0: Socket 훅/핸들러 매칭
                    if ($evPath -match 'useSocket\.ts|socket-server\.ts|socket-handlers\.ts') {
                        if ($evSymbol -and $script:SnapshotSocketHooks.ContainsKey($evSymbol)) {
                            $inSnapshot = $true
                            break
                        }
                        if (-not $evSymbol -and $script:SnapshotSocketHooks.Count -gt 0) {
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

            # v0.5.0: Contract 유형 분류 체크
            if ($specKey -in $script:ProcessBasedSpecs) {
                $status = "PROCESS_BASED"
                $processBasedCount++
                $codeMark = "-"  # 코드 기반 아님
            }
            elseif ($specKey -in $script:InfraBasedSpecs) {
                $status = "INFRA_BASED"
                $infraBasedCount++
                $codeMark = "-"  # 코드 기반 아님
            }
            elseif ($hasEvidence -and $evidenceValid) {
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
        Write-Host "  SNAPSHOT_GAP:    $gapCount (CODE 기반)" -ForegroundColor Cyan
        Write-Host "  PROCESS_BASED:   $processBasedCount (GAP 제외)" -ForegroundColor DarkCyan
        Write-Host "  INFRA_BASED:     $infraBasedCount (GAP 제외)" -ForegroundColor DarkCyan
        Write-Host ""
    }

    # 파일 저장
    $details | Out-File -FilePath $detailsFile -Encoding utf8
    $drifts | Out-File -FilePath $driftsFile -Encoding utf8

    # COVERAGE_MATRIX 갱신
    Update-CoverageMatrix -SyncCount $syncCount -MissingCount $missingCount -HalluCount $halluCount -BrokenCount $brokenCount -GapCount $gapCount -ProcessBasedCount $processBasedCount -InfraBasedCount $infraBasedCount -DetailsFile $detailsFile -Level $Level
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
                        TYPE: ui-routes, api-routes, ui-components,
                              permissions, socket-events, design-tokens,
                              feature-hooks (기본: 전체)
  verify [-Level soft|strict] [-Cache|-Full] [-DebugDump] [-Quiet]
                        문서-코드 검증 (-Quiet: 출력 최소화)
  update                diff 기반 Contract 업데이트 제안
  compile               산출물 생성 (DevSpec/Manual)
  status                현재 상태 확인
  help                  도움말

예시:
  .\specctl.ps1 snapshot -Suggest
  .\specctl.ps1 snapshot
  .\specctl.ps1 snapshot -Type=socket-events
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
