#!/usr/bin/env bash
# Git hooks 설정 스크립트
# 사용법: bash scripts/setup_git_hooks.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
GIT_HOOKS_DIR="$PROJECT_ROOT/.git/hooks"
CLAUDE_HOOKS_DIR="$PROJECT_ROOT/.claude/hooks"

echo "[setup] Git hooks 설정 시작..."

# 1) git repo 확인
if [[ ! -d "$PROJECT_ROOT/.git" ]]; then
  echo "[setup] ERROR: .git 폴더 없음. 먼저 'git init' 실행하세요."
  exit 1
fi

# 2) .git/hooks 폴더 확인
mkdir -p "$GIT_HOOKS_DIR"

# 3) pre-commit 훅 생성 (품질 체크)
PRE_COMMIT_HOOK="$GIT_HOOKS_DIR/pre-commit"

cat > "$PRE_COMMIT_HOOK" << 'EOF'
#!/usr/bin/env bash
# Pre-commit hook - .claude/hooks/pre_commit_check.sh 호출

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
CLAUDE_HOOK="$PROJECT_ROOT/.claude/hooks/pre_commit_check.sh"

if [[ -f "$CLAUDE_HOOK" ]]; then
  cd "$PROJECT_ROOT" && bash "$CLAUDE_HOOK"
else
  echo "[pre-commit] WARNING: $CLAUDE_HOOK 없음, 스킵"
fi
EOF

chmod +x "$PRE_COMMIT_HOOK"
echo "[setup] pre-commit 훅 설정 완료: $PRE_COMMIT_HOOK"

# 4) pre-push 훅 생성 (검증 확인)
PRE_PUSH_HOOK="$GIT_HOOKS_DIR/pre-push"

cat > "$PRE_PUSH_HOOK" << 'EOF'
#!/usr/bin/env bash
# Pre-push hook - .claude/hooks/pre_push_check.sh 호출

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
CLAUDE_HOOK="$PROJECT_ROOT/.claude/hooks/pre_push_check.sh"

if [[ -f "$CLAUDE_HOOK" ]]; then
  cd "$PROJECT_ROOT" && bash "$CLAUDE_HOOK"
else
  echo "[pre-push] WARNING: $CLAUDE_HOOK 없음, 스킵"
fi
EOF

chmod +x "$PRE_PUSH_HOOK"
echo "[setup] pre-push 훅 설정 완료: $PRE_PUSH_HOOK"

# 5) commit-msg 훅 생성 (TAG 검증)
COMMIT_MSG_HOOK="$GIT_HOOKS_DIR/commit-msg"

cat > "$COMMIT_MSG_HOOK" << 'EOF'
#!/usr/bin/env bash
# Commit-msg hook - .claude/hooks/commit_msg_check.sh 호출

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
CLAUDE_HOOK="$PROJECT_ROOT/.claude/hooks/commit_msg_check.sh"

if [[ -f "$CLAUDE_HOOK" ]]; then
  cd "$PROJECT_ROOT" && bash "$CLAUDE_HOOK" "$1"
else
  echo "[commit-msg] WARNING: $CLAUDE_HOOK 없음, 스킵"
fi
EOF

chmod +x "$COMMIT_MSG_HOOK"
echo "[setup] commit-msg 훅 설정 완료: $COMMIT_MSG_HOOK"

echo ""
echo "설정된 훅:"
echo "  - pre-commit → .claude/hooks/pre_commit_check.sh (품질 체크)"
echo "  - commit-msg → .claude/hooks/commit_msg_check.sh (TAG 검증)"
echo "  - pre-push   → .claude/hooks/pre_push_check.sh (검증 확인)"
echo ""
echo "훅 설정 변경:"
echo "  - 차단 모드: BLOCK_ON_FAIL=true git commit ..."
echo "  - build 포함: RUN_BUILD=true git commit ..."
echo ""
echo "[setup] 완료!"
