#!/bin/bash
# UTF-8 BOM 검사 스크립트
# CI/pre-commit에서 사용
# .ps1 파일은 BOM 허용 (PowerShell 5.1 호환)

set -e

BOM_FOUND=0
FILES_CHECKED=0

echo "=== UTF-8 BOM 검사 ==="
echo ""

# 검사 대상 확장자
EXTENSIONS=("md" "ts" "tsx" "js" "jsx" "json" "css" "sh")

for ext in "${EXTENSIONS[@]}"; do
    while IFS= read -r -d '' file; do
        ((FILES_CHECKED++)) || true

        # BOM 검사 (첫 3바이트가 0xEF 0xBB 0xBF인지)
        if head -c 3 "$file" | xxd -p | grep -q "efbbbf"; then
            echo "[BOM] $file"
            ((BOM_FOUND++)) || true
        fi
    done < <(find . -name "*.${ext}" -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./.git/*" -print0 2>/dev/null)
done

echo ""
echo "=== 검사 완료 ==="
echo "검사된 파일: ${FILES_CHECKED}개"
echo "BOM 발견: ${BOM_FOUND}개"

if [ "$BOM_FOUND" -gt 0 ]; then
    echo ""
    echo "[ERROR] BOM이 포함된 파일이 있습니다."
    echo "다음 명령으로 BOM을 제거하세요:"
    echo "  node scripts/convert-utf8.js <파일경로>"
    exit 1
fi

echo ""
echo "[OK] 모든 파일이 BOM 없는 UTF-8입니다."
exit 0
