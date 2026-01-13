#!/usr/bin/env bash
# 패키지 매니저 자동 감지 스크립트
# 사용법: source .claude/tools/detect_pm.sh && echo $PM
#
# 감지 우선순위:
# 1) package.json의 "packageManager" 필드
# 2) lockfile 기반 추정
# 3) fallback: npm

set -euo pipefail

detect_package_manager() {
  local project_root="${1:-.}"

  # 1) package.json의 packageManager 필드 확인
  if [[ -f "$project_root/package.json" ]]; then
    local pm_field
    pm_field=$(grep -o '"packageManager"[[:space:]]*:[[:space:]]*"[^"]*"' "$project_root/package.json" 2>/dev/null | head -1 || true)
    if [[ -n "$pm_field" ]]; then
      if echo "$pm_field" | grep -q "pnpm"; then
        echo "pnpm"
        return 0
      elif echo "$pm_field" | grep -q "yarn"; then
        echo "yarn"
        return 0
      elif echo "$pm_field" | grep -q "npm"; then
        echo "npm"
        return 0
      fi
    fi
  fi

  # 2) lockfile 기반 추정
  if [[ -f "$project_root/pnpm-lock.yaml" ]]; then
    echo "pnpm"
    return 0
  elif [[ -f "$project_root/yarn.lock" ]]; then
    echo "yarn"
    return 0
  elif [[ -f "$project_root/package-lock.json" ]]; then
    echo "npm"
    return 0
  fi

  # 3) fallback
  echo "npm"
}

# 스크립트가 직접 실행되면 감지 결과 출력
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  detect_package_manager "${1:-.}"
else
  # source로 로드되면 PM 변수 설정
  PM=$(detect_package_manager "${1:-.}")
  export PM
fi
