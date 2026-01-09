#!/bin/bash
# FlowSpace Discord Alert v2 - 에러 코드 + 컨텍스트 지원
WEBHOOK="https://discord.com/api/webhooks/1459146467183951914/LHuKtr0dbMWZGC06YuLHXCtcFRfUNCzeiJ0KjEc02Y2BHHttS6J3vDYEYVL3yIOnFFID"

code="$1"
src="$2"
msg="$3"
ctx="$4"
ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
host=$(hostname)

# 에러 코드로 색상 결정 (E로 시작하면 빨강)
color=16711680
[[ "$code" != E* ]] && color=16776960

# 컨텍스트 포맷팅
desc="Source: $src"
[ -n "$ctx" ] && desc="$desc | Context: $ctx"

# JSON 생성 및 전송
json="{\"embeds\":[{\"title\":\"[$code] $msg\",\"description\":\"$desc\",\"color\":$color,\"footer\":{\"text\":\"$host\"},\"timestamp\":\"$ts\"}]}"
curl -s -H "Content-Type: application/json" -X POST "$WEBHOOK" -d "$json"
