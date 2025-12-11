/**
 * Flow UI - i18n 텍스트 설정
 *
 * 배포 환경에 따라 텍스트 스타일 분기:
 * - standalone: 비즈니스 용어 (간결하고 전문적)
 * - apps-in-toss: 해요체 (친근하고 대화형)
 */

const DEPLOYMENT_ENV = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV || 'standalone'
const isAppsInToss = DEPLOYMENT_ENV === 'apps-in-toss'

/* ============================================
   BUTTON TEXT
   ============================================ */
export const BUTTON_TEXT = {
  // CTA (Call-to-Action)
  contactUs: isAppsInToss ? '문의해요' : '문의하기',
  consultRequest: isAppsInToss ? '상담 신청해요' : '상담 신청',
  learnMore: isAppsInToss ? '자세히 보기' : '자세히 보기',
  viewMore: isAppsInToss ? '더 보기' : '더 보기',
  startFree: isAppsInToss ? '무료로 시작해요' : '무료 시작',
  tryNow: isAppsInToss ? '지금 시도해요' : '지금 시도',
  getStarted: isAppsInToss ? '시작해요' : '시작하기',

  // Actions
  save: isAppsInToss ? '저장해요' : '저장',
  cancel: isAppsInToss ? '취소해요' : '취소',
  confirm: isAppsInToss ? '확인해요' : '확인',
  close: isAppsInToss ? '닫기' : '닫기',
  back: isAppsInToss ? '뒤로가기' : '뒤로',
  next: isAppsInToss ? '다음' : '다음',
  submit: isAppsInToss ? '제출해요' : '제출',
  delete: isAppsInToss ? '삭제해요' : '삭제',
  edit: isAppsInToss ? '수정해요' : '수정',
  create: isAppsInToss ? '만들어요' : '만들기',

  // Auth
  login: isAppsInToss ? '로그인해요' : '로그인',
  logout: isAppsInToss ? '로그아웃해요' : '로그아웃',
  signup: isAppsInToss ? '가입해요' : '회원가입',

  // Navigation
  home: '홈',
  dashboard: '대시보드',
  settings: '설정',
  profile: '프로필',
} as const

/* ============================================
   STATUS TEXT
   ============================================ */
export const STATUS_TEXT = {
  // Loading
  loading: isAppsInToss ? '불러오고 있어요' : '로딩 중',
  sending: isAppsInToss ? '전송하고 있어요' : '전송 중',
  processing: isAppsInToss ? '처리하고 있어요' : '처리 중',
  saving: isAppsInToss ? '저장하고 있어요' : '저장 중',

  // Completion
  completed: isAppsInToss ? '완료했어요' : '완료',
  sent: isAppsInToss ? '전송했어요' : '전송됨',
  saved: isAppsInToss ? '저장했어요' : '저장됨',
  success: isAppsInToss ? '성공했어요' : '성공',

  // Error
  failed: isAppsInToss ? '실패했어요' : '실패',
  error: isAppsInToss ? '오류가 발생했어요' : '오류 발생',
} as const

/* ============================================
   PLACEHOLDER TEXT
   ============================================ */
export const PLACEHOLDER_TEXT = {
  email: isAppsInToss ? '이메일을 입력해주세요' : '이메일 입력',
  password: isAppsInToss ? '비밀번호를 입력해주세요' : '비밀번호 입력',
  name: isAppsInToss ? '이름을 입력해주세요' : '이름 입력',
  search: isAppsInToss ? '검색어를 입력해주세요' : '검색',
  message: isAppsInToss ? '메시지를 입력해주세요' : '메시지 입력',
} as const

/* ============================================
   LABEL TEXT
   ============================================ */
export const LABEL_TEXT = {
  email: '이메일',
  password: '비밀번호',
  name: '이름',
  title: '제목',
  description: '설명',
} as const

/* ============================================
   MESSAGE TEXT (톤 코드별)
   ============================================ */
export const MESSAGE_TEXT = {
  // Confirm (긍정적 확인)
  confirm: {
    saved: isAppsInToss ? '저장되었어요' : '저장되었습니다',
    deleted: isAppsInToss ? '삭제되었어요' : '삭제되었습니다',
    created: isAppsInToss ? '생성되었어요' : '생성되었습니다',
  },

  // Destructive (파괴적/위험)
  destructive: {
    deleteConfirm: isAppsInToss ? '정말 삭제할까요?' : '정말 삭제하시겠습니까?',
    unsavedChanges: isAppsInToss ? '저장하지 않은 변경사항이 있어요' : '저장하지 않은 변경사항이 있습니다',
  },

  // Soft (부드러운 안내)
  soft: {
    required: isAppsInToss ? '필수 항목이에요' : '필수 항목입니다',
    optional: isAppsInToss ? '선택 항목이에요' : '선택 항목입니다',
  },

  // Neutral (중립적 정보)
  neutral: {
    noData: isAppsInToss ? '데이터가 없어요' : '데이터가 없습니다',
    empty: isAppsInToss ? '비어있어요' : '비어있습니다',
  },
} as const

/* ============================================
   TYPE EXPORTS
   ============================================ */
export type ButtonTextKey = keyof typeof BUTTON_TEXT
export type StatusTextKey = keyof typeof STATUS_TEXT
export type PlaceholderTextKey = keyof typeof PLACEHOLDER_TEXT
export type LabelTextKey = keyof typeof LABEL_TEXT

/* ============================================
   ID-BASED TEXT (네이밍 체계 기반)
   ============================================ */
export const ID_TEXT: Record<string, string> = {
  // Auth - Login
  "LID.AUTH.LOGIN.TITLE": isAppsInToss ? "로그인해요" : "로그인",
  "LID.AUTH.LOGIN.SUBTITLE": isAppsInToss ? "계정으로 로그인해주세요" : "계정으로 로그인하세요",
  "LID.AUTH.SOCIAL.SUBTITLE": isAppsInToss ? "소셜 계정으로 간편하게 시작해요" : "소셜 계정으로 간편하게 시작하세요",
  "LID.AUTH.EMAIL.PLACEHOLDER": PLACEHOLDER_TEXT.email,
  "LID.AUTH.EMAIL.LABEL": LABEL_TEXT.email,
  "LID.AUTH.PASSWORD.PLACEHOLDER": PLACEHOLDER_TEXT.password,
  "LID.AUTH.PASSWORD.LABEL": LABEL_TEXT.password,
  "LID.AUTH.ERROR.DEFAULT": isAppsInToss ? "로그인에 실패했어요. 다시 시도해주세요." : "로그인에 실패했습니다. 다시 시도해주세요.",
  "LID.AUTH.ERROR.OAUTH": isAppsInToss ? "소셜 로그인에 실패했어요" : "소셜 로그인에 실패했습니다",
  "BTN.AUTH.LOGIN": BUTTON_TEXT.login,
  "BTN.AUTH.SIGNUP": BUTTON_TEXT.signup,
  "BTN.AUTH.REGISTER": BUTTON_TEXT.signup,
  "BTN.AUTH.LOGOUT": BUTTON_TEXT.logout,
  "BTN.AUTH.GITHUB": "GitHub로 계속하기",
  "BTN.AUTH.GOOGLE": "Google로 계속하기",

  // Common Actions
  "BTN.PRIMARY.SUBMIT": BUTTON_TEXT.submit,
  "BTN.PRIMARY.SAVE": BUTTON_TEXT.save,
  "BTN.SECONDARY.CANCEL": BUTTON_TEXT.cancel,
  "BTN.SECONDARY.BACK": BUTTON_TEXT.back,
  "BTN.CTA.START": BUTTON_TEXT.getStarted,
  "BTN.CTA.LEARN_MORE": BUTTON_TEXT.learnMore,

  // Navigation
  "BTN.NAV.DASHBOARD": BUTTON_TEXT.dashboard,

  // Status
  "LID.STATUS.LOADING": STATUS_TEXT.loading,
  "LID.STATUS.SAVING": STATUS_TEXT.saving,
  "LID.STATUS.SUCCESS": STATUS_TEXT.success,
  "LID.STATUS.ERROR": STATUS_TEXT.error,

  // Modal
  "LID.MODAL.DELETE.TITLE": isAppsInToss ? "삭제할까요?" : "삭제하시겠습니까?",
  "LID.MODAL.DELETE.CONFIRM": MESSAGE_TEXT.destructive.deleteConfirm,
  "BTN.MODAL.CONFIRM": BUTTON_TEXT.confirm,
  "BTN.MODAL.CANCEL": BUTTON_TEXT.cancel,

  // ============================================
  // 메타버스 MVP 텍스트
  // ============================================

  // Landing - Hero
  "LID.LANDING.HERO.TITLE": "브라우저에서 즉시 입장하는 2D 메타버스",
  "LID.LANDING.HERO.SUBTITLE": isAppsInToss
    ? "설치 없이 링크만 클릭하면 팀원들과 만날 수 있어요"
    : "설치 없이 링크만 클릭하면 팀원들과 함께하는 가상 공간",
  "BTN.LANDING.CREATE_SPACE": isAppsInToss ? "공간 만들기" : "공간 만들기",
  "BTN.LANDING.TRY_DEMO": isAppsInToss ? "데모 체험하기" : "데모 체험",

  // Landing - Features
  "LID.LANDING.FEATURES.TITLE": "왜 FlowSpace인가요?",
  "LID.LANDING.FEATURE.BRANDING.TITLE": "브랜딩",
  "LID.LANDING.FEATURE.BRANDING.DESC": "로고, 테마 컬러, 로딩 화면까지 우리 브랜드에 맞게",
  "LID.LANDING.FEATURE.TEMPLATE.TITLE": "템플릿",
  "LID.LANDING.FEATURE.TEMPLATE.DESC": "오피스, 강의실, 라운지 3종 템플릿으로 10분 내 개설",
  "LID.LANDING.FEATURE.ACCESS.TITLE": "접근 제어",
  "LID.LANDING.FEATURE.ACCESS.DESC": "공개/비공개/암호 설정으로 입장 규칙 지정",
  "LID.LANDING.FEATURE.ANALYTICS.TITLE": "운영자 대시보드",
  "LID.LANDING.FEATURE.ANALYTICS.DESC": "방문자 수, 피크 동접, 평균 체류 시간 한눈에",

  // Landing - Templates
  "LID.LANDING.TEMPLATES.TITLE": "원하는 템플릿을 선택하세요",
  "LID.LANDING.TEMPLATE.OFFICE": "오피스",
  "LID.LANDING.TEMPLATE.OFFICE.DESC": "가상 사무실에서 팀원들과 협업하세요",
  "LID.LANDING.TEMPLATE.CLASSROOM": "강의실",
  "LID.LANDING.TEMPLATE.CLASSROOM.DESC": "세미나, 교육, 발표에 최적화된 공간",
  "LID.LANDING.TEMPLATE.LOUNGE": "라운지",
  "LID.LANDING.TEMPLATE.LOUNGE.DESC": "네트워킹과 자유로운 소통을 위한 공간",

  // Landing - CTA
  "LID.LANDING.CTA.TITLE": isAppsInToss
    ? "지금 바로 시작해볼까요?"
    : "지금 바로 시작하세요",
  "LID.LANDING.CTA.SUBTITLE": isAppsInToss
    ? "무료로 첫 공간을 만들 수 있어요"
    : "무료로 첫 공간을 만들 수 있습니다",

  // Space
  "LID.SPACE.CREATE.TITLE": isAppsInToss ? "새 공간을 만들어요" : "새 공간 만들기",
  "LID.SPACE.NAME.LABEL": "공간 이름",
  "LID.SPACE.NAME.PLACEHOLDER": isAppsInToss ? "공간 이름을 입력해주세요" : "공간 이름 입력",
  "LID.SPACE.TEMPLATE.LABEL": "템플릿 선택",
  "LID.SPACE.ACCESS.LABEL": "접근 설정",
  "LID.SPACE.ACCESS.PUBLIC": "공개",
  "LID.SPACE.ACCESS.PRIVATE": "비공개",
  "LID.SPACE.ACCESS.PASSWORD": "암호",
  "BTN.SPACE.CREATE": isAppsInToss ? "공간 만들기" : "공간 만들기",

  // Guest Entry
  "LID.GUEST.ENTRY.TITLE": isAppsInToss ? "공간에 입장해요" : "공간 입장",
  "LID.GUEST.NICKNAME.LABEL": "닉네임",
  "LID.GUEST.NICKNAME.PLACEHOLDER": isAppsInToss ? "닉네임을 입력해주세요" : "닉네임 입력",
  "LID.GUEST.AVATAR.LABEL": "아바타 선택",
  "BTN.GUEST.ENTER": isAppsInToss ? "입장하기" : "입장",
  "BTN.GUEST.LOGIN": isAppsInToss ? "로그인하고 입장해요" : "로그인 후 입장",

  // Admin Dashboard
  "LID.ADMIN.DASHBOARD.TITLE": "운영자 대시보드",
  "LID.ADMIN.SPACES.TITLE": "내 공간",
  "LID.ADMIN.STATS.VISITORS": "방문자 수",
  "LID.ADMIN.STATS.PEAK": "피크 동접",
  "LID.ADMIN.STATS.AVG_DURATION": "평균 체류",
  "LID.ADMIN.STATS.RETURN_RATE": "재방문율",
  "LID.ADMIN.LOGS.TITLE": "이벤트 로그",
  "LID.ADMIN.LOGS.EMPTY": isAppsInToss ? "아직 로그가 없어요" : "로그가 없습니다",

  // Space Management
  "LID.SPACE.MANAGE.TITLE": "공간 관리",
  "LID.SPACE.MANAGE.SUBTITLE": "공간 설정을 확인하고 수정하세요",
  "LID.SPACE.INVITE.TITLE": "초대 링크",
  "LID.SPACE.INVITE.COPY": isAppsInToss ? "복사했어요" : "복사됨",
  "LID.SPACE.SETTINGS.TITLE": "공간 설정",
  "LID.SPACE.BRANDING.TITLE": "브랜딩",
  "LID.SPACE.DELETE.TITLE": isAppsInToss ? "공간을 삭제할까요?" : "공간 삭제",
  "LID.SPACE.DELETE.DESC": isAppsInToss
    ? "삭제하면 되돌릴 수 없어요. 모든 데이터가 함께 삭제됩니다."
    : "삭제하면 되돌릴 수 없습니다. 모든 데이터가 함께 삭제됩니다.",
  "LID.SPACE.DESCRIPTION.LABEL": "공간 설명",
  "LID.SPACE.DESCRIPTION.PLACEHOLDER": isAppsInToss ? "공간에 대한 설명을 입력해주세요" : "공간 설명 입력",
  "LID.SPACE.MAX_USERS.LABEL": "최대 인원",
  "LID.SPACE.LOADING_MESSAGE.LABEL": "로딩 메시지",
  "LID.SPACE.LOADING_MESSAGE.PLACEHOLDER": isAppsInToss ? "입장 시 표시될 메시지를 입력해주세요" : "로딩 메시지 입력",
  "LID.SPACE.PRIMARY_COLOR.LABEL": "테마 컬러",
  "LID.SPACE.STATS.TOTAL_VISITS": "총 방문",
  "LID.SPACE.STATS.GUEST_SESSIONS": "게스트 세션",
  "BTN.SPACE.COPY_LINK": isAppsInToss ? "링크 복사" : "링크 복사",
  "BTN.SPACE.ENTER": isAppsInToss ? "공간 입장" : "공간 입장",
  "BTN.SPACE.SAVE": BUTTON_TEXT.save,
  "BTN.SPACE.DELETE": isAppsInToss ? "공간 삭제" : "삭제",

  // Error Pages
  "LID.ERROR.GENERAL.TITLE": isAppsInToss ? "문제가 발생했어요" : "오류가 발생했습니다",
  "LID.ERROR.GENERAL.DESC": isAppsInToss
    ? "잠시 후 다시 시도해주세요. 문제가 계속되면 관리자에게 문의해주세요."
    : "잠시 후 다시 시도해주세요. 문제가 계속되면 관리자에게 문의하세요.",
  "LID.ERROR.NOT_FOUND.TITLE": isAppsInToss ? "페이지를 찾을 수 없어요" : "페이지를 찾을 수 없습니다",
  "LID.ERROR.NOT_FOUND.DESC": isAppsInToss
    ? "요청하신 페이지가 존재하지 않거나 이동되었어요."
    : "요청하신 페이지가 존재하지 않거나 이동되었습니다.",
  "BTN.ERROR.RETRY": isAppsInToss ? "다시 시도해요" : "다시 시도",
  "BTN.ERROR.HOME": isAppsInToss ? "홈으로 가기" : "홈으로",
} as const

/* ============================================
   UTILITIES
   ============================================ */
export const isStandalone = DEPLOYMENT_ENV === 'standalone'
export const isAppsInTossEnv = DEPLOYMENT_ENV === 'apps-in-toss'

export function getDeploymentEnvName(): string {
  return isAppsInToss ? '앱인토스' : '독립 서비스'
}

/**
 * ID 기반 텍스트 조회
 * @param id - 텍스트 ID (예: "LID.AUTH.LOGIN.TITLE", "BTN.PRIMARY.SUBMIT")
 * @returns 해당 ID의 텍스트, 없으면 ID 반환
 * @example getText("LID.AUTH.LOGIN.TITLE") // "로그인" 또는 "로그인해요"
 */
export function getText(id: string): string {
  return ID_TEXT[id] ?? id
}
