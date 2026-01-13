#!/usr/bin/env bash
# Commit message TAG 검증 훅 (경고만, 차단 X)
#
# 형식: <TAG>: <설명>
# TAG: F-XXX, BUG-XXX, BUG, REFACTOR, CHORE, DOCS, OPS
#
# 차단 모드로 전환하려면:
#   - BLOCK_ON_FAIL=true 로 설정

set -uo pipefail

BLOCK_ON_FAIL=${BLOCK_ON_FAIL:-false}
COMMIT_MSG_FILE="$1"

# 커밋 메시지 읽기
if [[ ! -f "$COMMIT_MSG_FILE" ]]; then
  exit 0
fi

COMMIT_MSG=$(head -1 "$COMMIT_MSG_FILE")

# TAG 패턴 검증
TAG_PATTERN="^(F-[0-9]+|BUG-[0-9]+|BUG|REFACTOR|CHORE|DOCS|OPS):[[:space:]]+"

if echo "$COMMIT_MSG" | grep -qE "$TAG_PATTERN"; then
  echo "[commit-msg] TAG 형식 OK: $COMMIT_MSG"
  exit 0
fi

# TAG 누락 경고
echo ""
echo "=========================================="
echo "[commit-msg] WARNING: TAG 누락 또는 형식 오류"
echo "=========================================="
echo ""
echo "현재 메시지: $COMMIT_MSG"
echo ""
echo "올바른 형식: <TAG>: <한국어 설명>"
echo "TAG 종류: F-XXX, BUG-XXX, BUG, REFACTOR, CHORE, DOCS, OPS"
echo ""
echo "예시:"
echo "  F-001: 사용자 프로필 페이지 구현"
echo "  BUG: null 체크 누락 수정"
echo "  DOCS: README 업데이트"
echo ""

if [[ "$BLOCK_ON_FAIL" == "true" ]]; then
  echo "[commit-msg] BLOCK_ON_FAIL=true → 커밋 차단"
  exit 1
fi

echo "[commit-msg] 경고만 출력, 커밋 진행됨"
exit 0
