#!/usr/bin/env bash
# Pre-push 검증 훅 (경고 전용 - blocking 아님)
# 규칙: RESUME_PACK 또는 DECISIONS에 PASS 있으면 경고 생략

set -euo pipefail

RESUME_PACK="docs/RESUME_PACK.md"
DECISIONS="docs/DECISIONS.md"

echo "[pre-push] 검증 시작..."

# PASS 키워드 체크 (실제 검증 완료만 감지, 템플릿 placeholder 제외)
# 패턴: "Verdict: PASS" 또는 "| PASS |" (테이블)
has_pass() {
  local file="$1"
  if [[ -f "$file" ]]; then
    # 실제 검증 완료 패턴만 매칭 (placeholder 제외)
    if grep -qE "(Verdict:\s*PASS|\|\s*PASS\s*\|)" "$file" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

# RESUME_PACK 또는 DECISIONS에 PASS 있는지 확인
if has_pass "$RESUME_PACK" || has_pass "$DECISIONS"; then
  echo "[pre-push] OK: 검증 완료 (PASS 확인됨)"
  exit 0
fi

# PASS 없으면 경고 출력 (blocking 아님)
echo ""
echo "=========================================="
echo "[pre-push] WARNING: 검증 기록 없음"
echo "=========================================="
echo ""
echo "다음 파일 중 하나에 PASS 기록이 없습니다:"
echo "  - $RESUME_PACK"
echo "  - $DECISIONS"
echo ""
echo "권장사항:"
echo "  1. codex-verifier 실행하여 PASS 획득"
echo "  2. 또는 DECISIONS.md에 수동으로 검증 기록 추가"
echo ""
echo "10초 후 자동 진행됩니다... (Ctrl+C로 취소)"
echo ""

# 10초 대기 (사용자가 취소할 기회 제공)
for i in {10..1}; do
  echo -ne "\r진행까지 $i 초..."
  sleep 1
done
echo ""

echo "[pre-push] 경고 무시하고 진행합니다."
exit 0
