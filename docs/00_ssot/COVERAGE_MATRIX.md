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
| SNAPSHOT_GAP | 자동화 범위 밖 | 점진적 확장 |

---

## 요약

| 항목 | 값 |
|------|-----|
| **마지막 검증** | 2026-01-21 |
| **검증 레벨** | soft |
| **총 항목** | 128 |
| **SYNC** | 44 |
| **MISSING_DOC** | 54 |
| **HALLUCINATION** | 0 |
| **BROKEN_EVIDENCE** | 0 |
| **SNAPSHOT_GAP** | 30 |

---

## 전체 매트릭스

| SPEC_KEY | Contract ID | Code (Snapshot) | Doc (Contract) | Evidence | Status |
|----------|-------------|:---------------:|:--------------:|:--------:|--------|| ADMIN | ADMIN_API_SPACES | O | O | O | SYNC |
| ADMIN | ADMIN_API_LOGS | O | O | O | SYNC |
| ADMIN | ADMIN_API_STATS | O | O | O | SYNC |
| ADMIN | ADMIN_API_USAGE_ANALYSIS | O | O | O | SYNC |
| ADMIN | ADMIN_API_USAGE_RESET | O | O | O | SYNC |
| ADMIN | ADMIN_API_USAGE_DEBUG | O | O | O | SYNC |
| ADMIN | ADMIN_API_OCI_METRICS | O | O | O | SYNC |
| AI_PROTOCOL | AI_PROTOCOL_FUNC_SESSION_START | - | O | O | SNAPSHOT_GAP |
| AI_PROTOCOL | AI_PROTOCOL_FUNC_TASK_MANAGEMENT | - | O | O | SNAPSHOT_GAP |
| AI_PROTOCOL | AI_PROTOCOL_FUNC_CODE_DOC_SYNC | - | O | O | SNAPSHOT_GAP |
| AI_PROTOCOL | AI_PROTOCOL_FUNC_VERIFICATION | - | O | O | SNAPSHOT_GAP |
| AI_PROTOCOL | AI_PROTOCOL_DESIGN_TASK_STRUCTURE | - | O | O | SNAPSHOT_GAP |
| AI_PROTOCOL | AI_PROTOCOL_DESIGN_HANDOFF_STRUCTURE | - | O | O | SNAPSHOT_GAP |
| ARCH | ARCH_FUNC_NEXTJS_PLATFORM | O | O | O | SYNC |
| ARCH | ARCH_FUNC_PHASER_GAME | O | O | O | SYNC |
| ARCH | ARCH_FUNC_SOCKET_REALTIME | O | O | O | SYNC |
| ARCH | ARCH_FUNC_LIVEKIT_MEDIA | O | O | O | SYNC |
| ARCH | ARCH_FUNC_PRISMA_DB | O | O | O | SYNC |
| AUTH | AUTH_API_NEXTAUTH | O | O | O | SYNC |
| AUTH | AUTH_API_REGISTER | O | O | O | SYNC |
| AUTH | AUTH_API_USER_CONSENT | O | O | O | SYNC |
| CRON | CRON_API_CLEANUP_MESSAGES | O | O | O | SYNC |
| CRON | CRON_API_CLEANUP_SESSIONS | O | O | O | SYNC |
| CRON | CRON_API_COLLECT_METRICS | O | O | O | SYNC |
| CRON | CRON_API_AGGREGATE_USAGE | O | O | O | SYNC |
| DASHBOARD | DASHBOARD_API_STATS | O | O | O | SYNC |
| DASHBOARD | DASHBOARD_API_EXPORT | O | O | O | SYNC |
| FOUNDATION | FOUNDATION_FUNC_DESIGN_TOKENS | - | O | O | SNAPSHOT_GAP |
| FOUNDATION | FOUNDATION_FUNC_ACCESSIBILITY | - | O | O | SNAPSHOT_GAP |
| FOUNDATION | FOUNDATION_FUNC_I18N | - | O | O | SNAPSHOT_GAP |
| FOUNDATION | FOUNDATION_FUNC_NAMING | - | O | O | SNAPSHOT_GAP |
| FOUNDATION | FOUNDATION_DESIGN_A11Y_MODAL | - | O | O | SNAPSHOT_GAP |
| FOUNDATION | FOUNDATION_DESIGN_STATE_MACHINE | - | O | O | SNAPSHOT_GAP |
| GUEST | GUEST_API_CREATE | O | O | O | SYNC |
| GUEST | GUEST_API_VERIFY | O | O | O | SYNC |
| GUEST | GUEST_API_EVENT | O | O | O | SYNC |
| GUEST | GUEST_API_EXIT | O | O | O | SYNC |
| INFRA | INFRA_FUNC_VERCEL_DEPLOY | - | O | O | SNAPSHOT_GAP |
| INFRA | INFRA_FUNC_OCI_SERVER | - | O | O | SNAPSHOT_GAP |
| INFRA | INFRA_FUNC_SOCKET_SERVER | - | O | O | SNAPSHOT_GAP |
| INFRA | INFRA_FUNC_LIVEKIT_SELFHOST | - | O | O | SNAPSHOT_GAP |
| INFRA | INFRA_FUNC_SSL_CADDY | - | O | O | SNAPSHOT_GAP |
| LIVEKIT | LIVEKIT_API_TOKEN | O | O | O | SYNC |
| LIVEKIT | LIVEKIT_API_WEBHOOK | O | O | O | SYNC |
| PERMISSION | PERMISSION_FUNC_SPACE_ROLE | - | O | O | SNAPSHOT_GAP |
| PERMISSION | PERMISSION_FUNC_SPACE_AUTH | - | O | O | SNAPSHOT_GAP |
| PERMISSION | PERMISSION_FUNC_CHAT_MANAGE | - | O | O | SNAPSHOT_GAP |
| PERMISSION | PERMISSION_FUNC_SUBSCRIPTION | - | O | O | SNAPSHOT_GAP |
| SPACE | SPACE_API_CRUD | O | O | O | SYNC |
| SPACE | SPACE_API_JOIN | O | O | O | SYNC |
| SPACE | SPACE_API_INVITE | O | O | O | SYNC |
| SPACE | SPACE_API_VISIT | O | O | O | SYNC |
| SPACE | SPACE_API_MY_ROLE | O | O | O | SYNC |
| SPACE | SPACE_API_MEMBERS | O | O | O | SYNC |
| SPACE | SPACE_API_KICK | O | O | O | SYNC |
| SPACE | SPACE_API_MUTE | O | O | O | SYNC |
| SPACE | SPACE_API_STAFF | O | O | O | SYNC |
| SPACE | SPACE_API_OBJECTS | O | O | O | SYNC |
| SPACE | SPACE_API_ZONES | O | O | O | SYNC |
| SPACE | SPACE_API_SPOTLIGHT | O | O | O | SYNC |
| SPACE | SPACE_API_MESSAGES | O | O | O | SYNC |
| SPACE | SPACE_API_MY_SPACES | O | O | O | SYNC |
| SPACE | SPACE_API_TEMPLATES | O | O | O | SYNC |
| UI_COMPONENT | UI_COMPONENT_FUNC_BUTTON | - | O | O | SNAPSHOT_GAP |
| UI_COMPONENT | UI_COMPONENT_FUNC_MODAL | - | O | O | SNAPSHOT_GAP |
| UI_COMPONENT | UI_COMPONENT_FUNC_FORM | - | O | O | SNAPSHOT_GAP |
| UI_COMPONENT | UI_COMPONENT_FUNC_ICON | - | O | O | SNAPSHOT_GAP |
| UI_COMPONENT | UI_COMPONENT_DESIGN_BUTTON | - | O | O | SNAPSHOT_GAP |
| UI_COMPONENT | UI_COMPONENT_DESIGN_MODAL | - | O | O | SNAPSHOT_GAP |
| UI_COMPONENT | UI_COMPONENT_DESIGN_BUTTON_HOVER | - | O | O | SNAPSHOT_GAP |
| UI_SYSTEM | UI_SYSTEM_FUNC_TOKEN_FLOW | - | O | O | SNAPSHOT_GAP |
| UI_SYSTEM | UI_SYSTEM_FUNC_TEXT_CONFIG | - | O | O | SNAPSHOT_GAP |
| USER | USER_API_NAV | O | O | O | SYNC |
| USER | USER_API_SEARCH | O | O | O | SYNC |
| UNCLASSIFIED | (없음) | O | X | - | MISSING_DOC |
| UNCLASSIFIED | (없음) | O | X | - | MISSING_DOC |
| UNCLASSIFIED | (없음) | O | X | - | MISSING_DOC |
| DASHBOARD | (없음) | O | X | - | MISSING_DOC |
| UNCLASSIFIED | (없음) | O | X | - | MISSING_DOC |
| AUTH | (없음) | O | X | - | MISSING_DOC |
| UNCLASSIFIED | (없음) | O | X | - | MISSING_DOC |
| UNCLASSIFIED | (없음) | O | X | - | MISSING_DOC |
| UNCLASSIFIED | (없음) | O | X | - | MISSING_DOC |
| UNCLASSIFIED | (없음) | O | X | - | MISSING_DOC |
| UNCLASSIFIED | (없음) | O | X | - | MISSING_DOC |
| UNCLASSIFIED | (없음) | O | X | - | MISSING_DOC |
| UNCLASSIFIED | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| AUTH | (없음) | O | X | - | MISSING_DOC |
| AUTH | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| API | (없음) | O | X | - | MISSING_DOC |
| USER | (없음) | O | X | - | MISSING_DOC |
| USER | (없음) | O | X | - | MISSING_DOC |

---

## 히스토리

| 날짜 | SYNC | MISSING | HALLU | BROKEN | GAP | 변화 |
|------|:----:|:-------:|:-----:|:------:|:---:|------|
| 2026-01-21 | 44 | 54 | 0 | 0 | 30 | specctl verify |

---

> **자동 생성**: `specctl verify` 실행 시 갱신됨
