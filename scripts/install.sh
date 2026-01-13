#!/usr/bin/env bash
# FlowSubAgent 설치/프로파일 토글 스크립트
# 사용법:
#   ./scripts/install.sh --profile core      # Core만 (Pro 비활성화)
#   ./scripts/install.sh --profile pro       # Pro 활성화
#   ./scripts/install.sh --status            # 현재 상태 확인
#   ./scripts/install.sh --migrate-claude-md # 레거시 claude.md 마이그레이션
#   ./scripts/install.sh --docs-scan         # docs 구조 분석 (Enterprise)
#   ./scripts/install.sh --help              # 도움말

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
AGENTS_DIR="$PROJECT_ROOT/.claude/agents"
PRO_DIR="$AGENTS_DIR/pro"
LEGACY_DIR="$PROJECT_ROOT/docs/04_reference/legacy_claude_md"

# Pro 에이전트 목록
PRO_AGENTS=(
  "explore.md"
  "librarian.md"
  "implementer.md"
  "context-keeper.md"
  "security-license.md"
  "spec-acceptance.md"
  "main-orchestrator.md"
)

# ============================================================
# 유틸리티 함수
# ============================================================

print_help() {
  cat << 'EOF'
FlowSubAgent Install Script

Usage:
  ./scripts/install.sh [OPTIONS]

Options:
  --profile core       Core 프로파일 (Pro 에이전트 비활성화)
  --profile pro        Pro 프로파일 (Pro 에이전트 활성화)
  --status             현재 프로파일 상태 확인
  --setup-hooks        Git hooks 설정 (setup_git_hooks.sh 호출)
  --migrate-claude-md  레거시 claude.md 마이그레이션
  --docs-scan          docs 구조 분석 리포트 (Enterprise)
  --dry-run            마이그레이션 시 변경 없이 목록만 출력
  --force              기존 파일 덮어쓰기 허용
  --help               이 도움말 출력

Examples:
  ./scripts/install.sh --profile pro --setup-hooks
  ./scripts/install.sh --status
  ./scripts/install.sh --migrate-claude-md --dry-run
  ./scripts/install.sh --migrate-claude-md --force

Profiles:
  core: doc-manager, codex-verifier, runner, verifier (+ hooks/tools)
  pro:  core + explore, librarian, implementer, context-keeper,
        security-license, spec-acceptance, main-orchestrator

Migration:
  하위 디렉토리의 claude.md/CLAUDE.md를 docs/04_reference/legacy_claude_md/로 이동.
  루트 CLAUDE.md가 없으면 최소 템플릿 생성.
EOF
}

print_status() {
  echo "[install] 현재 프로파일 상태:"
  echo ""
  echo "Core 에이전트 (.claude/agents/):"
  ls -1 "$AGENTS_DIR"/*.md 2>/dev/null | xargs -I{} basename {} | sed 's/^/  - /' || echo "  (없음)"
  echo ""
  echo "Pro 원본 (.claude/agents/pro/):"
  ls -1 "$PRO_DIR"/*.md 2>/dev/null | xargs -I{} basename {} | sed 's/^/  - /' || echo "  (없음)"
  echo ""

  # 활성화된 Pro 에이전트 확인
  local active_pro=0
  for agent in "${PRO_AGENTS[@]}"; do
    if [[ -f "$AGENTS_DIR/$agent" ]]; then
      ((active_pro++))
    fi
  done

  if [[ $active_pro -eq ${#PRO_AGENTS[@]} ]]; then
    echo "현재 프로파일: PRO (${active_pro}/${#PRO_AGENTS[@]} 활성화)"
  elif [[ $active_pro -eq 0 ]]; then
    echo "현재 프로파일: CORE (Pro 비활성화)"
  else
    echo "현재 프로파일: PARTIAL (${active_pro}/${#PRO_AGENTS[@]} 활성화)"
  fi

  echo ""
  # 레거시 claude.md 체크
  check_legacy_claude_md
}

# 레거시 claude.md 탐지
check_legacy_claude_md() {
  local legacy_count=0
  local legacy_files=()

  # 하위 디렉토리의 claude.md/CLAUDE.md 탐지 (루트 제외)
  while IFS= read -r -d '' file; do
    # 루트 CLAUDE.md 제외
    if [[ "$file" == "$PROJECT_ROOT/CLAUDE.md" ]] || [[ "$file" == "$PROJECT_ROOT/claude.md" ]]; then
      continue
    fi
    # 제외 디렉토리
    if [[ "$file" == *".git/"* ]] || [[ "$file" == *"node_modules/"* ]] || \
       [[ "$file" == *"dist/"* ]] || [[ "$file" == *"build/"* ]] || \
       [[ "$file" == *".next/"* ]] || [[ "$file" == *"legacy_claude_md/"* ]]; then
      continue
    fi
    legacy_files+=("$file")
    ((legacy_count++))
  done < <(find "$PROJECT_ROOT" -type f \( -iname "claude.md" -o -iname "CLAUDE.md" \) -print0 2>/dev/null)

  if [[ $legacy_count -gt 0 ]]; then
    echo "레거시 claude.md 체크: WARNING (${legacy_count}개 발견)"
    for f in "${legacy_files[@]:0:5}"; do
      echo "  - ${f#$PROJECT_ROOT/}"
    done
    if [[ $legacy_count -gt 5 ]]; then
      echo "  ... 외 $((legacy_count - 5))개"
    fi
    echo ""
    echo "  → ./scripts/install.sh --migrate-claude-md 로 마이그레이션 권장"
  else
    echo "레거시 claude.md 체크: OK (없음)"
  fi
}

# 심볼릭 링크 생성 (실패 시 복사 fallback)
link_or_copy() {
  local src="$1"
  local dst="$2"

  # 이미 존재하면 스킵
  if [[ -f "$dst" ]]; then
    echo "  [skip] $(basename "$dst") (이미 존재)"
    return 0
  fi

  # 심볼릭 링크 시도
  if ln -sf "$src" "$dst" 2>/dev/null; then
    echo "  [link] $(basename "$dst")"
  else
    # Windows/Git Bash에서 symlink 실패 시 복사
    cp "$src" "$dst"
    echo "  [copy] $(basename "$dst") (symlink 실패, 복사됨)"
  fi
}

# ============================================================
# 프로파일 적용 함수
# ============================================================

apply_core() {
  echo "[install] Core 프로파일 적용 중..."
  echo ""

  # Pro 에이전트 링크/복사본 제거 (원본 pro/ 폴더는 유지)
  for agent in "${PRO_AGENTS[@]}"; do
    if [[ -f "$AGENTS_DIR/$agent" ]]; then
      rm -f "$AGENTS_DIR/$agent"
      echo "  [remove] $agent"
    fi
  done

  echo ""
  echo "[install] Core 프로파일 적용 완료"
  echo "  활성 에이전트: doc-manager, codex-verifier, runner, verifier"
}

apply_pro() {
  echo "[install] Pro 프로파일 적용 중..."
  echo ""

  # Pro 폴더 존재 확인
  if [[ ! -d "$PRO_DIR" ]]; then
    echo "[install] ERROR: Pro 폴더 없음: $PRO_DIR"
    exit 1
  fi

  # Pro 에이전트를 상위 폴더로 링크/복사
  for agent in "${PRO_AGENTS[@]}"; do
    local src="$PRO_DIR/$agent"
    local dst="$AGENTS_DIR/$agent"

    if [[ -f "$src" ]]; then
      link_or_copy "$src" "$dst"
    else
      echo "  [warn] $agent not found in pro/"
    fi
  done

  echo ""
  echo "[install] Pro 프로파일 적용 완료"
  echo "  Core: doc-manager, codex-verifier, runner, verifier"
  echo "  Pro:  explore, librarian, implementer, context-keeper,"
  echo "        security-license, spec-acceptance, main-orchestrator"
}

setup_hooks() {
  echo ""
  echo "[install] Git hooks 설정 중..."
  if [[ -f "$SCRIPT_DIR/setup_git_hooks.sh" ]]; then
    bash "$SCRIPT_DIR/setup_git_hooks.sh"
  else
    echo "[install] WARN: setup_git_hooks.sh 없음"
  fi
}

# ============================================================
# 마이그레이션 함수
# ============================================================

# 경로를 파일명으로 인코딩 (슬래시 → 언더스코어)
encode_path() {
  local path="$1"
  # 프로젝트 루트 제거 후 슬래시를 __로, /를 _로 변환
  local relative="${path#$PROJECT_ROOT/}"
  echo "$relative" | sed 's|/|__|g'
}

# 루트 CLAUDE.md 최소 템플릿 생성
create_root_claude_md() {
  local target="$PROJECT_ROOT/CLAUDE.md"

  if [[ -f "$target" ]]; then
    echo "[migrate] 루트 CLAUDE.md 이미 존재 → 스킵"
    return 0
  fi

  cat > "$target" << 'TEMPLATE'
# FlowSubAgent

> Claude Code 서브에이전트 오케스트레이션 템플릿

## SSOT (Single Source of Truth)

| 문서 | 역할 |
|------|------|
| [PRD.md](PRD.md) | 요구사항 SSOT |
| [docs/03_ops/AGENTS.md](docs/03_ops/AGENTS.md) | 운영/에이전트 SSOT |

## 완료 조건

- [ ] codex-verifier: **PASS**
- [ ] doc-manager: 문서 반영 완료
- [ ] context-keeper: RESUME_PACK.md 갱신

## 프로파일

| 프로파일 | 에이전트 | 용도 |
|----------|----------|------|
| **core** | 4개 | 가벼운 운영 |
| **pro** | 11개 | Sisyphus 스타일 멀티 에이전트 |

```bash
./scripts/install.sh --profile pro    # Pro 활성화
./scripts/install.sh --profile core   # Core로 복귀
./scripts/install.sh --status         # 현재 상태
```

## 상세 문서

- [README.md](README.md) - Quick Start / Codex Setup
- [docs/03_ops/AGENTS.md](docs/03_ops/AGENTS.md) - 에이전트 역할/권한/커밋 규칙
- [docs/RESUME_PACK.md](docs/RESUME_PACK.md) - 세션 재개용

---

> **정책**: 이 파일은 필수 요소만 포함. 상세 규칙은 `/docs/03_ops/`에서 관리.
> 하위 디렉토리의 claude.md 계층 구조는 사용하지 않음.
TEMPLATE

  echo "[migrate] 루트 CLAUDE.md 생성 완료"
}

# 레거시 claude.md 마이그레이션
migrate_claude_md() {
  local dry_run="$1"
  local force="$2"
  local migrated=0
  local skipped=0
  local migrated_files=()

  echo "[migrate] 레거시 claude.md 마이그레이션 시작..."
  echo ""

  # 레거시 폴더 생성
  if [[ "$dry_run" != "true" ]]; then
    mkdir -p "$LEGACY_DIR"
  fi

  # 하위 claude.md/CLAUDE.md 탐지
  while IFS= read -r -d '' file; do
    # 루트 제외
    if [[ "$file" == "$PROJECT_ROOT/CLAUDE.md" ]] || [[ "$file" == "$PROJECT_ROOT/claude.md" ]]; then
      continue
    fi
    # 제외 디렉토리
    if [[ "$file" == *".git/"* ]] || [[ "$file" == *"node_modules/"* ]] || \
       [[ "$file" == *"dist/"* ]] || [[ "$file" == *"build/"* ]] || \
       [[ "$file" == *".next/"* ]] || [[ "$file" == *"legacy_claude_md/"* ]]; then
      continue
    fi

    local encoded_name
    encoded_name=$(encode_path "$file")
    local target="$LEGACY_DIR/$encoded_name"

    if [[ "$dry_run" == "true" ]]; then
      echo "  [dry-run] ${file#$PROJECT_ROOT/} → legacy_claude_md/$encoded_name"
      ((migrated++))
      continue
    fi

    # 대상 파일 존재 체크
    if [[ -f "$target" ]] && [[ "$force" != "true" ]]; then
      echo "  [skip] $encoded_name (이미 존재, --force로 덮어쓰기)"
      ((skipped++))
      continue
    fi

    # 헤더 추가하여 이동
    {
      echo "<!-- ⚠️ Legacy(보관) 문서. 현재 SSOT는 docs/03_ops/AGENTS.md -->"
      echo "<!-- 이 파일은 참고용이며 운영 규칙으로 사용하지 않음 -->"
      echo ""
      cat "$file"
    } > "$target"

    rm -f "$file"
    echo "  [move] ${file#$PROJECT_ROOT/} → legacy_claude_md/$encoded_name"
    migrated_files+=("$encoded_name")
    ((migrated++))
  done < <(find "$PROJECT_ROOT" -type f \( -iname "claude.md" -o -iname "CLAUDE.md" \) -print0 2>/dev/null)

  echo ""

  # 루트 CLAUDE.md 생성 (dry-run 아닐 때만)
  if [[ "$dry_run" != "true" ]]; then
    create_root_claude_md
  fi

  # 결과 요약
  echo ""
  echo "=========================================="
  echo "[migrate] 결과 요약"
  echo "=========================================="
  if [[ "$dry_run" == "true" ]]; then
    echo "  모드: DRY-RUN (실제 변경 없음)"
  fi
  echo "  이동됨: $migrated"
  echo "  스킵됨: $skipped"

  if [[ ${#migrated_files[@]} -gt 0 ]]; then
    echo ""
    echo "이동된 파일 (상위 10개):"
    for f in "${migrated_files[@]:0:10}"; do
      echo "  - $f"
    done
    if [[ ${#migrated_files[@]} -gt 10 ]]; then
      echo "  ... 외 $((${#migrated_files[@]} - 10))개"
    fi
  fi

  echo ""
  if [[ $migrated -eq 0 ]] && [[ $skipped -eq 0 ]]; then
    echo "[migrate] 마이그레이션 대상 없음 (이미 정리됨)"
  else
    echo "[migrate] 완료!"
  fi
}

# ============================================================
# Enterprise: docs 구조 분석
# ============================================================

scan_docs() {
  local docs_dir="$PROJECT_ROOT/docs"
  local report_file="$PROJECT_ROOT/docs/03_ops/DOCS_SCAN_REPORT.md"
  local has_legacy="NO"

  echo "[docs-scan] docs 구조 분석 시작..."
  echo ""

  # docs 폴더 존재 확인
  if [[ ! -d "$docs_dir" ]]; then
    echo "[docs-scan] docs/ 폴더 없음"
    return 0
  fi

  echo "=========================================="
  echo "[docs-scan] 현재 /docs 구조"
  echo "=========================================="
  echo ""

  # 트리 구조 출력 (depth 2)
  if command -v tree &> /dev/null; then
    tree -L 2 "$docs_dir" 2>/dev/null || find "$docs_dir" -maxdepth 2 -type d | head -20
  else
    find "$docs_dir" -maxdepth 2 -type d 2>/dev/null | sed "s|$PROJECT_ROOT/||" | head -20
  fi

  echo ""
  echo "=========================================="
  echo "[docs-scan] FlowSubAgent 영역 체크"
  echo "=========================================="
  echo ""

  # FlowSubAgent 필수 영역 체크
  local ops_dir="$docs_dir/03_ops"
  local ref_dir="$docs_dir/04_reference"

  if [[ -d "$ops_dir" ]]; then
    echo "  docs/03_ops/          ✅ 존재"
    [[ -f "$ops_dir/AGENTS.md" ]] && echo "    - AGENTS.md         ✅" || echo "    - AGENTS.md         ❌ 없음"
    [[ -f "$ops_dir/ANCHOR.md" ]] && echo "    - ANCHOR.md         ✅" || echo "    - ANCHOR.md         ❌ 없음"
    [[ -f "$ops_dir/DOC_DEBT.md" ]] && echo "    - DOC_DEBT.md       ✅" || echo "    - DOC_DEBT.md       ⚠️ 없음"
  else
    echo "  docs/03_ops/          ❌ 없음"
  fi

  if [[ -d "$ref_dir" ]]; then
    echo "  docs/04_reference/    ✅ 존재"
  else
    echo "  docs/04_reference/    ❌ 없음"
  fi

  echo ""

  # 레거시 docs 탐지 (FlowSubAgent 영역 외)
  local legacy_dir_count=0
  local legacy_file_total=0
  local legacy_shown=false

  while IFS= read -r -d '' dir; do
    local rel_dir="${dir#$docs_dir/}"
    # FlowSubAgent 영역 제외
    if [[ "$rel_dir" != "03_ops"* ]] && [[ "$rel_dir" != "04_reference"* ]] && \
       [[ "$rel_dir" != "." ]] && [[ -n "$rel_dir" ]]; then
      # 파일 수 카운트
      local file_count
      file_count=$(find "$dir" -maxdepth 1 -type f 2>/dev/null | wc -l | tr -d ' ')
      legacy_file_total=$((legacy_file_total + file_count))
      legacy_dir_count=$((legacy_dir_count + 1))

      if [[ "$legacy_shown" != "true" ]]; then
        echo "=========================================="
        echo "[docs-scan] 레거시 docs 영역 (Read-only)"
        echo "=========================================="
        echo ""
        legacy_shown=true
      fi
      echo "  $rel_dir/ ($file_count files)"
    fi
  done < <(find "$docs_dir" -maxdepth 1 -type d -print0 2>/dev/null)

  # 파일 개수 기준으로 Legacy 여부 판단
  if [[ $legacy_file_total -gt 0 ]]; then
    has_legacy="YES"
  fi

  echo ""
  echo "=========================================="
  echo "[docs-scan] 요약"
  echo "=========================================="
  echo ""
  echo "  Legacy docs exists: $has_legacy ($legacy_file_total files in $legacy_dir_count dirs)"
  echo "  FlowSubAgent 영역: docs/03_ops/, docs/04_reference/"
  echo "  정책: 레거시 영역은 Read-only, 업데이트는 DOC_DEBT에 기록"
  echo ""

  # ANCHOR.md에 레거시 상태 업데이트
  local anchor_file="$ops_dir/ANCHOR.md"
  if [[ -f "$anchor_file" ]]; then
    # Legacy docs exists 라인 업데이트
    if grep -q "Legacy docs exists:" "$anchor_file"; then
      sed -i "s/Legacy docs exists: .*/Legacy docs exists: **$has_legacy** ($legacy_file_total files)/" "$anchor_file" 2>/dev/null || \
      sed -i '' "s/Legacy docs exists: .*/Legacy docs exists: **$has_legacy** ($legacy_file_total files)/" "$anchor_file" 2>/dev/null
      echo "[docs-scan] ANCHOR.md 업데이트됨 (Legacy: $has_legacy, $legacy_file_total files)"
    fi
  fi

  echo ""
  echo "[docs-scan] 완료!"
}

# ============================================================
# 메인
# ============================================================

PROFILE=""
DO_HOOKS=false
DO_MIGRATE=false
DO_DOCS_SCAN=false
DRY_RUN=false
FORCE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)
      PROFILE="$2"
      shift 2
      ;;
    --status)
      print_status
      exit 0
      ;;
    --setup-hooks)
      DO_HOOKS=true
      shift
      ;;
    --migrate-claude-md)
      DO_MIGRATE=true
      shift
      ;;
    --docs-scan)
      DO_DOCS_SCAN=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --help|-h)
      print_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      print_help
      exit 1
      ;;
  esac
done

# 마이그레이션 모드
if [[ "$DO_MIGRATE" == "true" ]]; then
  migrate_claude_md "$DRY_RUN" "$FORCE"
  exit 0
fi

# docs 스캔 모드 (Enterprise)
if [[ "$DO_DOCS_SCAN" == "true" ]]; then
  scan_docs
  exit 0
fi

# 프로파일 적용
case "$PROFILE" in
  core)
    apply_core
    ;;
  pro)
    apply_pro
    ;;
  "")
    echo "[install] --profile 옵션 필요 (core 또는 pro)"
    echo ""
    print_status
    exit 1
    ;;
  *)
    echo "[install] ERROR: 알 수 없는 프로파일: $PROFILE"
    echo "  사용 가능: core, pro"
    exit 1
    ;;
esac

# 훅 설정 (옵션)
if [[ "$DO_HOOKS" == "true" ]]; then
  setup_hooks
fi

echo ""
echo "[install] 완료!"
