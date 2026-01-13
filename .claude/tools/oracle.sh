#!/usr/bin/env bash
# Oracle 래퍼 스크립트 - Codex CLI 호출
# 사용법: .claude/tools/oracle.sh <prompt_file>

set -euo pipefail

PROMPT_FILE="${1:-}"

# 1) Auth 체크 (공식: codex login status)
if ! codex login status >/dev/null 2>&1; then
  echo "[oracle] ERROR: Not logged in." >&2
  echo "[oracle] Run 'codex login' to authenticate." >&2
  exit 2
fi

# 2) 프롬프트 파일 검증
if [[ -z "$PROMPT_FILE" ]]; then
  echo "[oracle] Usage: oracle.sh <prompt_file>" >&2
  exit 2
fi

if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "[oracle] ERROR: File not found: $PROMPT_FILE" >&2
  exit 2
fi

# 3) Codex exec 비대화형 호출 (공식: 인라인 프롬프트)
echo "[oracle] Calling Codex exec..." >&2
codex exec "$(cat "$PROMPT_FILE")" --json
