#!/usr/bin/env bash
# Pre-commit 품질 체크 훅 (중간 강도: 경고 + 10초 대기, 차단 X)
#
# 실행 순서: typecheck → test → (build: 선택)
# 실패 시: 경고 출력 + 10초 대기 후 진행 (차단하지 않음)
#
# 차단 모드로 전환하려면:
#   - BLOCK_ON_FAIL=true 로 설정
#   - 또는 아래 exit 0 → exit 1 로 변경

set -uo pipefail

# ============================================================
# 설정
# ============================================================
BLOCK_ON_FAIL=${BLOCK_ON_FAIL:-false}  # true로 바꾸면 차단 모드
RUN_BUILD=${RUN_BUILD:-false}          # true로 바꾸면 build도 실행
WAIT_SECONDS=10

# ============================================================
# 패키지 매니저 감지 (인라인)
# ============================================================
detect_pm() {
  # 1) package.json의 packageManager 필드
  if [[ -f "package.json" ]]; then
    local pm_field
    pm_field=$(grep -o '"packageManager"[[:space:]]*:[[:space:]]*"[^"]*"' package.json 2>/dev/null | head -1 || true)
    if [[ -n "$pm_field" ]]; then
      if echo "$pm_field" | grep -q "pnpm"; then echo "pnpm"; return 0; fi
      if echo "$pm_field" | grep -q "yarn"; then echo "yarn"; return 0; fi
      if echo "$pm_field" | grep -q "npm"; then echo "npm"; return 0; fi
    fi
  fi

  # 2) lockfile 기반
  if [[ -f "pnpm-lock.yaml" ]]; then echo "pnpm"; return 0; fi
  if [[ -f "yarn.lock" ]]; then echo "yarn"; return 0; fi
  if [[ -f "package-lock.json" ]]; then echo "npm"; return 0; fi

  # 3) fallback
  echo "npm"
}

# ============================================================
# 스크립트 존재 여부 확인
# ============================================================
has_script() {
  local script_name="$1"
  if [[ -f "package.json" ]]; then
    grep -q "\"$script_name\"" package.json 2>/dev/null
  else
    return 1
  fi
}

# ============================================================
# 경고 출력 + 대기
# ============================================================
warn_and_wait() {
  local msg="$1"
  echo ""
  echo "=========================================="
  echo "[pre-commit] WARNING: $msg"
  echo "=========================================="
  echo ""

  if [[ "$BLOCK_ON_FAIL" == "true" ]]; then
    echo "[pre-commit] BLOCK_ON_FAIL=true → 커밋 차단"
    exit 1
  fi

  echo "${WAIT_SECONDS}초 후 계속 진행됩니다... (Ctrl+C로 취소)"
  for i in $(seq $WAIT_SECONDS -1 1); do
    echo -ne "\r진행까지 $i 초..."
    sleep 1
  done
  echo ""
}

# ============================================================
# 메인 실행
# ============================================================
echo "[pre-commit] 품질 체크 시작..."

# package.json 없으면 스킵
if [[ ! -f "package.json" ]]; then
  echo "[pre-commit] package.json 없음 → 스킵"
  exit 0
fi

PM=$(detect_pm)
echo "[pre-commit] Package manager: $PM"

FAILED=false

# ------------------------------------------------------------
# 1) typecheck
# ------------------------------------------------------------
if has_script "typecheck"; then
  echo "[pre-commit] Running: $PM run typecheck"
  if ! $PM run typecheck 2>&1 | tail -20; then
    echo "[pre-commit] typecheck FAIL"
    FAILED=true
  else
    echo "[pre-commit] typecheck PASS"
  fi
else
  echo "[pre-commit] typecheck script not found → SKIP"
  echo "[pre-commit] (권장: package.json에 typecheck 스크립트 추가)"
fi

# ------------------------------------------------------------
# 2) test
# ------------------------------------------------------------
echo "[pre-commit] Running: $PM test"
if ! $PM test 2>&1 | tail -30; then
  echo "[pre-commit] test FAIL"
  FAILED=true
else
  echo "[pre-commit] test PASS"
fi

# ------------------------------------------------------------
# 3) build (선택)
# ------------------------------------------------------------
if [[ "$RUN_BUILD" == "true" ]]; then
  if has_script "build"; then
    echo "[pre-commit] Running: $PM run build"
    if ! $PM run build 2>&1 | tail -20; then
      echo "[pre-commit] build FAIL"
      FAILED=true
    else
      echo "[pre-commit] build PASS"
    fi
  else
    echo "[pre-commit] build script not found → SKIP"
  fi
fi

# ------------------------------------------------------------
# 결과 처리
# ------------------------------------------------------------
if [[ "$FAILED" == "true" ]]; then
  warn_and_wait "품질 체크 실패"
fi

echo "[pre-commit] 완료"
exit 0
