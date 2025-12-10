# TASK: 채팅 시스템 고도화 - 귓속말 및 탭 분류

> **목표**: 채팅 시스템에 귓속말 기능 추가 및 탭 구조로 메시지 분류
> **시작일**: 2025-12-11
> **상태**: 🔵 계획 중

---

## 요구사항 요약

### 기능 요구사항
1. **귓속말 기능**: `/닉네임 메시지내용` 형태로 특정 사용자에게 비밀 메시지 전송
2. **탭 분류**: 채팅 메시지를 다음 4개 탭으로 분류
   - 전체 (All): 모든 메시지 표시
   - 비밀 구역 (Zone): 특정 구역 내 사용자들만 볼 수 있는 메시지 (향후 확장)
   - 귓속말 (Whisper): 나에게 온 귓속말 + 내가 보낸 귓속말
   - 시스템 (System): 시스템 알림 메시지

### 기술 요구사항
- Socket.io 이벤트 확장 (whisper 메시지 타입)
- 메시지 타입 확장 (ChatMessage에 whisper 필드)
- 탭 UI 구현 (새 컴포넌트)
- 입력 파싱 (슬래시 명령어 감지)

---

## Phase 1: 메시지 타입 및 데이터 구조 설계

### 1.1 타입 정의 확장

**파일**: `src/features/space/types/space.types.ts`

```typescript
// 기존 ChatMessage 확장
export type MessageType = "chat" | "system" | "whisper" | "zone"

export interface ChatMessage {
  id: string
  type: MessageType
  senderId: string
  senderNickname: string
  content: string
  timestamp: Date
  reactions: Reaction[]

  // 귓속말 전용 필드
  targetId?: string           // 수신자 ID (whisper일 때)
  targetNickname?: string     // 수신자 닉네임 (whisper일 때)

  // 구역 채팅 전용 필드 (Phase 4)
  zoneId?: string             // 구역 ID (zone일 때)
  zoneName?: string           // 구역 이름 (zone일 때)
}

// 채팅 탭 타입
export type ChatTab = "all" | "zone" | "whisper" | "system"
```

### 1.2 체크리스트
- [ ] ChatMessage 타입에 MessageType 추가
- [ ] whisper 관련 필드 (targetId, targetNickname) 추가
- [ ] ChatTab 타입 정의
- [ ] 기존 코드 호환성 확인

---

## Phase 2: Socket.io 이벤트 확장

### 2.1 서버 측 (socket-server.ts)

**이벤트 추가**:
```typescript
// 귓속말 전송
socket.on("whisper:send", ({ targetNickname, content }) => {
  // 1. 닉네임으로 대상 소켓 찾기
  // 2. 대상에게 whisper:receive 이벤트 전송
  // 3. 송신자에게도 whisper:sent 확인 전송
})
```

**구현 내용**:
- 닉네임 → socketId 매핑 관리
- 대상 사용자가 없을 경우 에러 메시지 반환
- 귓속말 메시지 구조 정의

### 2.2 클라이언트 측 (useSocket.ts)

**훅 확장**:
```typescript
// 귓속말 전송 함수
const sendWhisper = useCallback((targetNickname: string, content: string) => {
  socket.emit("whisper:send", { targetNickname, content })
}, [socket])

// 귓속말 수신 핸들러
useEffect(() => {
  socket.on("whisper:receive", (message: ChatMessage) => {
    onWhisperMessage?.(message)
  })
}, [socket, onWhisperMessage])
```

### 2.3 체크리스트
- [ ] 서버: `whisper:send` 이벤트 핸들러
- [ ] 서버: `whisper:receive` 이벤트 발송
- [ ] 서버: `whisper:error` 에러 처리
- [ ] 클라이언트: `sendWhisper` 함수 추가
- [ ] 클라이언트: 귓속말 수신 핸들러
- [ ] 닉네임 → socketId 매핑 로직

---

## Phase 3: 채팅 입력 파싱 및 명령어 처리

### 3.1 입력 파싱 로직

**파일**: `src/features/space/utils/chatParser.ts` (신규)

```typescript
interface ParsedInput {
  type: "chat" | "whisper" | "command"
  content: string
  target?: string  // whisper 대상 닉네임
}

export function parseChatInput(input: string): ParsedInput {
  // /닉네임 메시지 형태 감지
  const whisperMatch = input.match(/^\/(\S+)\s+(.+)$/)
  if (whisperMatch) {
    return {
      type: "whisper",
      target: whisperMatch[1],
      content: whisperMatch[2]
    }
  }

  return { type: "chat", content: input }
}
```

### 3.2 ChatInputArea 수정

**파일**: `src/features/space/components/chat/ChatInputArea.tsx`

```typescript
const handleSend = () => {
  const parsed = parseChatInput(value)

  if (parsed.type === "whisper" && parsed.target) {
    onSendWhisper?.(parsed.target, parsed.content)
  } else {
    onSend(parsed.content)
  }
}
```

### 3.3 체크리스트
- [ ] chatParser.ts 유틸리티 생성
- [ ] 슬래시 명령어 파싱 로직
- [ ] ChatInputArea에 파싱 로직 통합
- [ ] onSendWhisper 콜백 추가
- [ ] 자동완성 힌트 UI (Phase 5로 연기 가능)

---

## Phase 4: 탭 UI 구현

### 4.1 ChatTabs 컴포넌트

**파일**: `src/features/space/components/chat/ChatTabs.tsx` (신규)

```typescript
interface ChatTabsProps {
  activeTab: ChatTab
  onTabChange: (tab: ChatTab) => void
  unreadCounts: Record<ChatTab, number>
}

export function ChatTabs({ activeTab, onTabChange, unreadCounts }: ChatTabsProps) {
  const tabs: { id: ChatTab; label: string }[] = [
    { id: "all", label: "전체" },
    { id: "whisper", label: "귓속말" },
    { id: "system", label: "시스템" },
    // { id: "zone", label: "비밀 구역" },  // Phase 5
  ]

  return (
    <div className="flex border-b border-white/10">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "px-3 py-1.5 text-xs transition-colors relative",
            activeTab === tab.id
              ? "text-white border-b-2 border-primary"
              : "text-white/50 hover:text-white/70"
          )}
        >
          {tab.label}
          {unreadCounts[tab.id] > 0 && (
            <span className="absolute -top-1 -right-1 size-4 rounded-full bg-red-500 text-[10px] flex items-center justify-center">
              {unreadCounts[tab.id]}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
```

### 4.2 메시지 필터링 로직

**파일**: `src/features/space/hooks/useChatMessages.ts` (신규 또는 기존 확장)

```typescript
export function filterMessagesByTab(
  messages: ChatMessage[],
  tab: ChatTab,
  currentUserId: string
): ChatMessage[] {
  switch (tab) {
    case "all":
      return messages
    case "whisper":
      return messages.filter(m =>
        m.type === "whisper" &&
        (m.senderId === currentUserId || m.targetId === currentUserId)
      )
    case "system":
      return messages.filter(m => m.type === "system")
    case "zone":
      return messages.filter(m => m.type === "zone")
    default:
      return messages
  }
}
```

### 4.3 FloatingChatOverlay 통합

```typescript
// 상태 추가
const [activeTab, setActiveTab] = useState<ChatTab>("all")

// 필터링된 메시지
const filteredMessages = useMemo(() =>
  filterMessagesByTab(displayMessages, activeTab, currentUserId),
  [displayMessages, activeTab, currentUserId]
)
```

### 4.4 체크리스트
- [ ] ChatTabs 컴포넌트 생성
- [ ] 탭별 읽지 않은 메시지 카운트
- [ ] 메시지 필터링 로직
- [ ] FloatingChatOverlay에 탭 통합
- [ ] 탭 상태 관리 (useChatTabs 훅 또는 로컬 상태)
- [ ] 탭 전환 시 스크롤 위치 유지/초기화

---

## Phase 5: UI/UX 개선 (선택적)

### 5.1 귓속말 자동완성
- 입력 시 `/` 입력하면 현재 공간 내 사용자 목록 표시
- 방향키로 선택, Tab으로 완성

### 5.2 귓속말 시각적 구분
- 귓속말 메시지 배경색 다르게 (보라색 계열)
- 송신/수신 귓속말 좌우 정렬 또는 아이콘 구분
- "님에게", "님으로부터" 레이블

### 5.3 비밀 구역 채팅 (Zone Chat)
- 맵 내 특정 영역에서만 보이는 채팅
- Phaser 충돌 영역과 연동

### 5.4 체크리스트
- [ ] 닉네임 자동완성 UI
- [ ] 귓속말 메시지 스타일링
- [ ] 구역 채팅 기본 구현
- [ ] 알림음 (귓속말 수신 시)

---

## 파일 구조 예상

```
src/features/space/
├── components/chat/
│   ├── FloatingChatOverlay.tsx  # 수정: 탭 통합
│   ├── ChatMessageList.tsx      # 수정: 귓속말 스타일
│   ├── ChatInputArea.tsx        # 수정: 파싱 로직
│   ├── ChatTabs.tsx             # 신규: 탭 UI
│   └── index.ts
│
├── hooks/
│   ├── useChatMessages.ts       # 신규: 메시지 필터링
│   └── ...
│
├── utils/
│   └── chatParser.ts            # 신규: 입력 파싱
│
├── socket/
│   └── useSocket.ts             # 수정: whisper 이벤트
│
└── types/
    └── space.types.ts           # 수정: 타입 확장
```

---

## 구현 순서 요약

| Phase | 내용 | 예상 작업량 |
|-------|------|------------|
| 1 | 타입 정의 | 30분 |
| 2 | Socket.io 이벤트 | 1시간 |
| 3 | 입력 파싱 | 30분 |
| 4 | 탭 UI | 1시간 |
| 5 | UI/UX 개선 | 1시간+ |

**총 예상**: 3-4시간 (Phase 5 제외)

---

## 검증 항목

### Phase 2 완료 후
- [ ] `/닉네임 메시지`로 귓속말 전송 성공
- [ ] 대상에게만 메시지 표시
- [ ] 존재하지 않는 닉네임 입력 시 에러 메시지

### Phase 4 완료 후
- [ ] 탭 전환 시 해당 타입 메시지만 필터링
- [ ] 읽지 않은 메시지 카운트 표시
- [ ] 귓속말 탭에서 송/수신 모두 표시

### 전체 완료 후
- [ ] 기존 채팅 기능 정상 동작
- [ ] 시스템 메시지 (입장 안내, 조작 가이드) 정상 표시
- [ ] 전체화면 모드에서 탭 기능 정상 동작

---

## 리스크 및 고려사항

1. **닉네임 중복**: 같은 닉네임을 가진 사용자가 여러 명일 경우 처리
   - 해결: 첫 번째 매칭 사용자에게 전송 또는 에러 반환

2. **오프라인 사용자**: 대상이 접속 해제된 경우
   - 해결: "사용자가 오프라인입니다" 에러 메시지

3. **메시지 저장**: 귓속말 히스토리 저장 여부
   - MVP: 클라이언트 메모리에만 저장 (새로고침 시 소실)
   - 향후: DB 저장 고려

4. **성능**: 대량 메시지 시 필터링 성능
   - 해결: useMemo로 캐싱, 가상 스크롤 고려

---

## 진행 상태

| Phase | 상태 | 완료일 |
|-------|------|--------|
| 1 | ⏳ 대기 | - |
| 2 | ⏳ 대기 | - |
| 3 | ⏳ 대기 | - |
| 4 | ⏳ 대기 | - |
| 5 | ⏳ 대기 | - |

---

## 변경 이력

| 날짜 | 내용 |
|-----|------|
| 2025-12-11 | 초기 계획 수립 |

---

## 완료 워크플로우

> 📋 **모든 Phase 완료 후 아래 절차를 따릅니다**

### 1. 완료 보고
```
✅ TASK.md의 모든 Phase가 완료되었습니다!

완료된 기능:
- [구현된 기능 목록]

추가 피드백이나 수정 요청이 있으신가요?
```

### 2. 피드백 처리
| 피드백 유형 | 처리 방법 |
|------------|----------|
| 버그 발견 | 해당 Phase에 버그 수정 항목 추가 |
| 추가 기능 요청 | 새 Phase 추가 또는 별도 태스크 |
| 완료 확인 | 아래 초기화 절차 진행 |

### 3. 초기화 절차
1. 최종 커밋 및 푸시
2. TASK.md 상태를 "🟢 완료"로 변경
3. 사용자 확인 후 TASK.md 삭제 또는 빈 템플릿으로 교체

### 4. 빈 템플릿 (초기화 후)
```markdown
# TASK: (태스크 없음)

> **상태**: 🔵 대기 중
> **설명**: 새로운 복잡한 작업 요청 시 Phase별 계획이 여기에 작성됩니다.

---

## 생성 조건

TASK.md는 다음 조건에서 생성됩니다:
- 3개 이상 파일 수정이 필요한 작업
- 새 기능 추가 (Phase 구분 필요)
- 복잡한 리팩토링

## 변경 이력

| 날짜 | 내용 |
|-----|------|
| YYYY-MM-DD | 마지막 태스크 완료 후 초기화 |
```
