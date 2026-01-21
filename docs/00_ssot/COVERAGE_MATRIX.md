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
| **검증 레벨** | Phase 2 완료 |
| **총 SPEC 파일** | 14 |
| **총 Contract** | 68 |
| **SYNC** | 68 |
| **MISSING_DOC** | 0 |
| **HALLUCINATION** | 0 |
| **BROKEN_EVIDENCE** | 0 |
| **SNAPSHOT_GAP** | 0 |

---

## SPEC 파일 현황

| SPEC_KEY | 파일 | Contract 수 | Status |
|----------|------|:-----------:|:------:|
| ARCH | `ARCH.md` | 5 | SYNC |
| PERMISSION | `PERMISSION.md` | 4 | SYNC |
| INFRA | `INFRA.md` | 5 | SYNC |
| FOUNDATION | `FOUNDATION.md` | 4 | SYNC |
| UI_COMPONENT | `UI_COMPONENT.md` | 6 | SYNC |
| UI_SYSTEM | `UI_SYSTEM.md` | 2 | SYNC |
| AUTH | `AUTH.md` | 3 | SYNC |
| SPACE | `SPACE.md` | 16 | SYNC |
| ADMIN | `ADMIN.md` | 7 | SYNC |
| DASHBOARD | `DASHBOARD.md` | 2 | SYNC |
| USER | `USER.md` | 2 | SYNC |
| GUEST | `GUEST.md` | 4 | SYNC |
| LIVEKIT | `LIVEKIT.md` | 2 | SYNC |
| CRON | `CRON.md` | 4 | SYNC |

---

## Contract 상세 매트릭스

### ARCH (5 Contracts)

| Contract ID | Evidence | Status |
|-------------|:--------:|:------:|
| ARCH_FUNC_NEXTJS_PLATFORM | O | SYNC |
| ARCH_FUNC_PHASER_GAME | O | SYNC |
| ARCH_FUNC_SOCKET_REALTIME | O | SYNC |
| ARCH_FUNC_LIVEKIT_MEDIA | O | SYNC |
| ARCH_FUNC_PRISMA_DB | O | SYNC |

### PERMISSION (4 Contracts)

| Contract ID | Evidence | Status |
|-------------|:--------:|:------:|
| PERMISSION_FUNC_SPACE_ROLE | O | SYNC |
| PERMISSION_FUNC_SPACE_AUTH | O | SYNC |
| PERMISSION_FUNC_CHAT_MANAGE | O | SYNC |
| PERMISSION_FUNC_SUBSCRIPTION | O | SYNC |

### INFRA (5 Contracts)

| Contract ID | Evidence | Status |
|-------------|:--------:|:------:|
| INFRA_FUNC_VERCEL_DEPLOY | O | SYNC |
| INFRA_FUNC_OCI_SERVER | O | SYNC |
| INFRA_FUNC_SOCKET_SERVER | O | SYNC |
| INFRA_FUNC_LIVEKIT_SELFHOST | O | SYNC |
| INFRA_FUNC_SSL_CADDY | O | SYNC |

### FOUNDATION (4 Contracts)

| Contract ID | Evidence | Status |
|-------------|:--------:|:------:|
| FOUNDATION_FUNC_DESIGN_TOKENS | O | SYNC |
| FOUNDATION_FUNC_ACCESSIBILITY | O | SYNC |
| FOUNDATION_FUNC_I18N | O | SYNC |
| FOUNDATION_FUNC_NAMING | O | SYNC |

### UI_COMPONENT (6 Contracts)

| Contract ID | Evidence | Status |
|-------------|:--------:|:------:|
| UI_COMPONENT_FUNC_BUTTON | O | SYNC |
| UI_COMPONENT_FUNC_MODAL | O | SYNC |
| UI_COMPONENT_FUNC_FORM | O | SYNC |
| UI_COMPONENT_FUNC_ICON | O | SYNC |
| UI_COMPONENT_DESIGN_BUTTON | O | SYNC |
| UI_COMPONENT_DESIGN_MODAL | O | SYNC |

### UI_SYSTEM (2 Contracts)

| Contract ID | Evidence | Status |
|-------------|:--------:|:------:|
| UI_SYSTEM_FUNC_TOKEN_FLOW | O | SYNC |
| UI_SYSTEM_FUNC_TEXT_CONFIG | O | SYNC |

### AUTH (3 Contracts)

| Contract ID | Evidence | Status |
|-------------|:--------:|:------:|
| AUTH_API_NEXTAUTH | O | SYNC |
| AUTH_API_REGISTER | O | SYNC |
| AUTH_API_USER_CONSENT | O | SYNC |

### SPACE (16 Contracts)

| Contract ID | Evidence | Status |
|-------------|:--------:|:------:|
| SPACE_API_CRUD | O | SYNC |
| SPACE_API_JOIN | O | SYNC |
| SPACE_API_INVITE | O | SYNC |
| SPACE_API_VISIT | O | SYNC |
| SPACE_API_MY_ROLE | O | SYNC |
| SPACE_API_MEMBERS | O | SYNC |
| SPACE_API_KICK | O | SYNC |
| SPACE_API_MUTE | O | SYNC |
| SPACE_API_STAFF | O | SYNC |
| SPACE_API_OBJECTS | O | SYNC |
| SPACE_API_ZONES | O | SYNC |
| SPACE_API_SPOTLIGHT | O | SYNC |
| SPACE_API_MESSAGES | O | SYNC |
| SPACE_API_MY_SPACES | O | SYNC |
| SPACE_API_TEMPLATES | O | SYNC |

### ADMIN (7 Contracts)

| Contract ID | Evidence | Status |
|-------------|:--------:|:------:|
| ADMIN_API_SPACES | O | SYNC |
| ADMIN_API_LOGS | O | SYNC |
| ADMIN_API_STATS | O | SYNC |
| ADMIN_API_USAGE_ANALYSIS | O | SYNC |
| ADMIN_API_USAGE_RESET | O | SYNC |
| ADMIN_API_USAGE_DEBUG | O | SYNC |
| ADMIN_API_OCI_METRICS | O | SYNC |

### DASHBOARD (2 Contracts)

| Contract ID | Evidence | Status |
|-------------|:--------:|:------:|
| DASHBOARD_API_STATS | O | SYNC |
| DASHBOARD_API_EXPORT | O | SYNC |

### USER (2 Contracts)

| Contract ID | Evidence | Status |
|-------------|:--------:|:------:|
| USER_API_NAV | O | SYNC |
| USER_API_SEARCH | O | SYNC |

### GUEST (4 Contracts)

| Contract ID | Evidence | Status |
|-------------|:--------:|:------:|
| GUEST_API_CREATE | O | SYNC |
| GUEST_API_VERIFY | O | SYNC |
| GUEST_API_EVENT | O | SYNC |
| GUEST_API_EXIT | O | SYNC |

### LIVEKIT (2 Contracts)

| Contract ID | Evidence | Status |
|-------------|:--------:|:------:|
| LIVEKIT_API_TOKEN | O | SYNC |
| LIVEKIT_API_WEBHOOK | O | SYNC |

### CRON (4 Contracts)

| Contract ID | Evidence | Status |
|-------------|:--------:|:------:|
| CRON_API_CLEANUP_MESSAGES | O | SYNC |
| CRON_API_CLEANUP_SESSIONS | O | SYNC |
| CRON_API_COLLECT_METRICS | O | SYNC |
| CRON_API_AGGREGATE_USAGE | O | SYNC |

---

## 히스토리

| 날짜 | SYNC | MISSING | HALLU | BROKEN | GAP | 변화 |
|------|:----:|:-------:|:-----:|:------:|:---:|------|
| 2026-01-21 | 0 | 58 | 0 | 0 | 26 | 초기 상태 |
| 2026-01-21 | 68 | 0 | 0 | 0 | 0 | Phase 1-2 완료 |

---

> **마지막 업데이트**: 2026-01-21 DocOps Phase 2 완료
