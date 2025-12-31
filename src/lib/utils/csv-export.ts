/**
 * CSV Export Utility
 *
 * 범용 CSV 변환 유틸리티
 * - 배열 데이터를 CSV 문자열로 변환
 * - UTF-8 BOM 지원 (한글 Excel 호환)
 */

/**
 * 값을 CSV 셀로 변환 (이스케이프 처리)
 */
function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return ""
  }

  const str = String(value)

  // 쉼표, 줄바꿈, 따옴표가 포함된 경우 따옴표로 감싸기
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}

/**
 * 객체 배열을 CSV 문자열로 변환
 *
 * @param data 변환할 객체 배열
 * @param columns 컬럼 정의 (key: 객체 키, header: 헤더 표시 이름)
 * @param options 옵션 (withBOM: UTF-8 BOM 추가 여부)
 */
export function arrayToCsv<T extends object>(
  data: T[],
  columns: { key: keyof T; header: string }[],
  options: { withBOM?: boolean } = { withBOM: true }
): string {
  // 헤더 행
  const header = columns.map((col) => escapeCsvCell(col.header)).join(",")

  // 데이터 행
  const rows = data.map((item) =>
    columns.map((col) => escapeCsvCell(item[col.key])).join(",")
  )

  // CSV 문자열 생성
  const csv = [header, ...rows].join("\n")

  // UTF-8 BOM 추가 (한글 Excel 호환)
  if (options.withBOM) {
    return "\ufeff" + csv
  }

  return csv
}

/**
 * SpaceEventLog를 CSV로 변환하기 위한 컬럼 정의
 */
export const EVENT_LOG_COLUMNS = [
  { key: "id" as const, header: "이벤트 ID" },
  { key: "eventType" as const, header: "이벤트 유형" },
  { key: "userName" as const, header: "사용자" },
  { key: "userType" as const, header: "사용자 유형" },
  { key: "payload" as const, header: "추가 데이터" },
  { key: "createdAt" as const, header: "발생 시간" },
]

/**
 * 이벤트 타입 한글 변환
 */
export const EVENT_TYPE_LABELS: Record<string, string> = {
  ENTER: "입장",
  EXIT: "퇴장",
  INTERACTION: "오브젝트 상호작용",
  CHAT: "채팅",
  VOICE_START: "음성 시작",
  VOICE_END: "음성 종료",
  MEMBER_MUTED: "음소거",
  MEMBER_UNMUTED: "음소거 해제",
  MEMBER_KICKED: "강퇴",
  MESSAGE_DELETED: "메시지 삭제",
  STAFF_ASSIGNED: "STAFF 지정",
  STAFF_REMOVED: "STAFF 해제",
}

/**
 * SpaceEventLog 데이터를 CSV 변환용 객체로 변환
 */
export interface EventLogCsvRow {
  id: string
  eventType: string
  userName: string
  userType: string
  payload: string
  createdAt: string
}

export function transformEventLogForCsv(
  log: {
    id: string
    eventType: string
    user?: { name: string | null; email: string } | null
    guestSession?: { nickname: string } | null
    payload: unknown
    createdAt: Date
  }
): EventLogCsvRow {
  // 사용자 이름 결정
  let userName = "-"
  let userType = "-"

  if (log.user) {
    userName = log.user.name || log.user.email
    userType = "인증 사용자"
  } else if (log.guestSession) {
    userName = log.guestSession.nickname
    userType = "게스트"
  }

  return {
    id: log.id,
    eventType: EVENT_TYPE_LABELS[log.eventType] || log.eventType,
    userName,
    userType,
    payload: log.payload ? JSON.stringify(log.payload) : "",
    createdAt: log.createdAt.toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
    }),
  }
}
