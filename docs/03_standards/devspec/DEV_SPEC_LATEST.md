# 개발 사양서 (DEV_SPEC)

> 자동 생성: specctl compile (2026-01-21 16:16:39)

---

## 목차
- [ADMIN](#ADMIN)
- [AI_PROTOCOL](#AI_PROTOCOL)
- [ARCH](#ARCH)
- [AUTH](#AUTH)
- [CRON](#CRON)
- [DASHBOARD](#DASHBOARD)
- [FOUNDATION](#FOUNDATION)
- [GUEST](#GUEST)
- [INFRA](#INFRA)
- [LIVEKIT](#LIVEKIT)
- [PERMISSION](#PERMISSION)
- [SPACE](#SPACE)
- [UI_COMPONENT](#UI_COMPONENT)
- [UI_SYSTEM](#UI_SYSTEM)
- [USER](#USER)

---

## ADMIN

### Contract: ADMIN_API_SPACES

- **What**: ?꾩껜 怨듦컙 紐⑸줉 議고쉶 API (SuperAdmin ?꾩슜)
- **Evidence**:
  - code: `src/app/api/admin/spaces/route.ts::GET`
  - code: `src/lib/space-auth.ts::isSuperAdmin`

### Contract: ADMIN_API_LOGS

- **What**: ?뚮옯???대깽??濡쒓렇 議고쉶 API
- **Evidence**:
  - code: `src/app/api/admin/logs/route.ts::GET`
  - code: `prisma/schema.prisma::SpaceEventLog`

### Contract: ADMIN_API_STATS

- **What**: ?뚮옯???듦퀎 API
- **Evidence**:
  - code: `src/app/api/admin/stats/route.ts::GET`

### Contract: ADMIN_API_USAGE_ANALYSIS

- **What**: ?ъ슜??遺꾩꽍 API
- **Evidence**:
  - code: `src/app/api/admin/usage/analysis/route.ts::GET`

### Contract: ADMIN_API_USAGE_RESET

- **What**: ?ъ슜???곗씠??珥덇린??API
- **Evidence**:
  - code: `src/app/api/admin/usage/reset/route.ts::POST`

### Contract: ADMIN_API_USAGE_DEBUG

- **What**: ?ъ슜???붾쾭洹?API
- **Evidence**:
  - code: `src/app/api/admin/usage/debug/route.ts::GET`

### Contract: ADMIN_API_OCI_METRICS

- **What**: Oracle Cloud 硫뷀듃由?議고쉶 API
- **Evidence**:
  - code: `src/app/api/admin/oci-metrics/route.ts::GET`

---

## AI_PROTOCOL

### Contract: AI_PROTOCOL_FUNC_SESSION_START
- **Tier**: core
- **What**: ?묒뾽 ?쒖옉 ??怨꾩링 援ъ“ ?뺤씤 ?꾨줈?좎퐳
- **Inputs/Outputs**:
  - Input: ?ъ슜???묒뾽 ?붿껌
  - Output: 而⑦뀓?ㅽ듃 濡쒕뱶 ?꾨즺 ?곹깭
- **Flow**:
  ```
  ?묒뾽 ?붿껌 ?섏떊
      ??
  1. /CLAUDE.md ?뺤씤 (猷⑦듃 ?뚮쾿)
      ??
  2. ?묒뾽 ?곸뿭 claude.md ?뺤씤
      ??
  3. /docs 愿??臾몄꽌 ?뺤씤
      ??
  4. /TASK.md ?뺤씤 (誘몄셿猷???ぉ)
      ??
  ?묒뾽 ?쒖옉
  ```
- **Evidence**:
  - code: `CLAUDE.md`
  - code: `docs/00_ssot/ANCHOR.md`

### Contract: AI_PROTOCOL_FUNC_TASK_MANAGEMENT
- **Tier**: core
- **What**: TASK.md ?ㅼ떆媛?愿由??꾨줈?좎퐳
- **Inputs/Outputs**:
  - Input: ?쒖뒪???곹깭 蹂寃??대깽??
  - Output: TASK.md ?낅뜲?댄듃
- **Rules**:
  | ?곹솴 | ?덉감 |
  |-----|------|
  | ?댁쟾 TASK ?꾨즺??| ?쇰뱶諛?諛쏄린 ??諛섏쁺 ??珥덇린??|
  | ?댁쟾 TASK 誘몄셿猷?| 誘몄셿猷??뚯븙 ??蹂닿퀬 ??吏꾪뻾 |
  | ???쒖뒪???쒖옉 | 怨꾪쉷 ?묒꽦 ???ㅼ떆媛??낅뜲?댄듃 |
- **?앹꽦 議곌굔**:
  | ?곹솴 | TASK.md ?꾩슂 |
  |-----|:------------:|
  | ?⑥닚 踰꾧렇 ?섏젙 | ??|
  | ?⑥씪 ?뚯씪 ?섏젙 | ??|
  | 3媛? ?뚯씪 ?섏젙 | ?좑툘 沅뚯옣 |
  | ??湲곕뒫 異붽? | ???꾩닔 |
  | 蹂듭옟??由ы뙥?좊쭅 | ???꾩닔 |
- **Evidence**:
  - code: `TASK.md::TASK`

### Contract: AI_PROTOCOL_FUNC_CODE_DOC_SYNC
- **Tier**: normal
- **What**: 肄붾뱶 蹂寃???臾몄꽌 ?낅뜲?댄듃 ?곕룞
- **Rules**:
  | 肄붾뱶 蹂寃??좏삎 | 臾몄꽌 ?낅뜲?댄듃 ???|
  |--------------|------------------|
  | ??API 異붽? | ?대떦 SPEC.md, claude.md |
  | 湲곕뒫 ?꾨즺 | ROADMAP.md ?곹깭 |
  | 踰꾧렇 ?섏젙 | TASK.md |
  | ?꾪궎?띿쿂 蹂寃?| ARCH.md |
- **Evidence**:
  - code: `docs/00_ssot/DOC_POLICY.md`

### Contract: AI_PROTOCOL_FUNC_VERIFICATION
- **Tier**: core
- **What**: 援ы쁽 ?꾨즺 ??寃利??꾨줈?몄뒪
- **Flow**:
  ```
  援ы쁽 ?꾨즺
      ??
  1. npx tsc --noEmit (??낆껜??
      ??
  2. npm run build (鍮뚮뱶)
      ??
  3. 愿??臾몄꽌 ?낅뜲?댄듃
      ??
  4. git commit & push
      ??
  ?꾨즺 蹂닿퀬
  ```
- **Errors**:
  - `TYPE_ERROR`: ????먮윭 ??肄붾뱶 ?섏젙 ???ш?利?
  - `BUILD_ERROR`: 鍮뚮뱶 ?먮윭 ???먯씤 ?뚯븙 ???섏젙
  - `UNRESOLVED`: ?닿껐 遺덇? ???ъ슜??蹂닿퀬
- **Evidence**:
  - code: `package.json`

---

## ARCH

### Contract: ARCH_FUNC_NEXTJS_PLATFORM

- **What**: Next.js 15 App Router 湲곕컲 ?뚮옯???덉씠??(?몄쬆, API, ??쒕낫??
- **Evidence**:
  - code: `src/app/layout.tsx::RootLayout`
  - code: `src/lib/auth.ts::auth`
  - code: `src/lib/prisma.ts::prisma`

### Contract: ARCH_FUNC_PHASER_GAME

- **What**: Phaser 3 寃뚯엫 ?붿쭊 ?듯빀 (2D 留??뚮뜑留? 罹먮┃???대룞)
- **Evidence**:
  - code: `src/features/space/game/PhaserGame.tsx::PhaserGame`
  - code: `src/features/space/game/scenes/MainScene.ts::MainScene`

### Contract: ARCH_FUNC_SOCKET_REALTIME

- **What**: Socket.io ?ㅼ떆媛??숆린??(?꾩튂, 梨꾪똿, ?몄뀡)
- **Evidence**:
  - code: `server/socket-server.ts::io`
  - code: `src/features/space/socket/useSocket.ts::useSocket`

### Contract: ARCH_FUNC_LIVEKIT_MEDIA

- **What**: LiveKit WebRTC ?뚯꽦/?곸긽 ?듯솕
- **Evidence**:
  - code: `src/features/space/livekit/LiveKitRoomProvider.tsx::LiveKitRoomProvider`
  - code: `src/features/space/livekit/LiveKitMediaContext.tsx::LiveKitMediaInternalProvider`

### Contract: ARCH_FUNC_PRISMA_DB

- **What**: Prisma ORM ?곗씠?곕쿋?댁뒪 愿由?
- **Evidence**:
  - code: `prisma/schema.prisma::User`
  - code: `prisma/schema.prisma::Space`
  - code: `src/lib/prisma.ts::prisma`

---

## AUTH

### Contract: AUTH_API_NEXTAUTH

- **What**: NextAuth.js OAuth ?몄쬆 ?붾뱶?ъ씤??(Google, GitHub)
- **Evidence**:
  - code: `src/app/api/auth/[...nextauth]/route.ts::GET`
  - code: `src/app/api/auth/[...nextauth]/route.ts::POST`
  - code: `src/lib/auth.ts::auth`

### Contract: AUTH_API_REGISTER

- **What**: ?대찓??鍮꾨?踰덊샇 ?뚯썝媛??API
- **Evidence**:
  - code: `src/app/api/auth/register/route.ts::POST`
  - code: `src/app/api/auth/register/route.ts::validateEmail`
  - code: `src/app/api/auth/register/route.ts::validatePassword`

### Contract: AUTH_API_USER_CONSENT

- **What**: ?ъ슜???숈쓽(?뱁솕 ?? 愿由?API
- **Evidence**:
  - code: `src/app/api/user/consent/route.ts::POST`
  - code: `prisma/schema.prisma`

---

## CRON

### Contract: CRON_API_CLEANUP_MESSAGES

- **What**: ?ㅻ옒??梨꾪똿 硫붿떆吏 ?뺣━ ?щ줎
- **Evidence**:
  - code: `src/app/api/cron/cleanup-messages/route.ts::GET`
  - code: `prisma/schema.prisma::ChatMessage`

### Contract: CRON_API_CLEANUP_SESSIONS

- **What**: 留뚮즺??寃뚯뒪???몄뀡 ?뺣━ ?щ줎
- **Evidence**:
  - code: `src/app/api/cron/cleanup-sessions/route.ts::GET`
  - code: `prisma/schema.prisma::GuestSession`

### Contract: CRON_API_COLLECT_METRICS

- **What**: OCI 硫뷀듃由??섏쭛 ?щ줎
- **Evidence**:
  - code: `src/app/api/cron/collect-metrics/route.ts::GET`

### Contract: CRON_API_AGGREGATE_USAGE

- **What**: ?ъ슜??吏묎퀎 ?щ줎
- **Evidence**:
  - code: `src/app/api/cron/aggregate-usage/route.ts::GET`

---

## DASHBOARD

### Contract: DASHBOARD_API_STATS

- **What**: 怨듦컙蹂??듦퀎 議고쉶 API
- **Evidence**:
  - code: `src/app/api/dashboard/spaces/[id]/stats/route.ts::GET`
  - code: `src/lib/space-auth.ts::canManageSpace`

### Contract: DASHBOARD_API_EXPORT

- **What**: 怨듦컙 ?곗씠???대낫?닿린 API
- **Evidence**:
  - code: `src/app/api/dashboard/spaces/[id]/export/route.ts::GET`
  - code: `src/lib/space-permissions.ts::hasPermission`

---

## FOUNDATION

### Contract: FOUNDATION_FUNC_DESIGN_TOKENS

- **What**: CSS 蹂??湲곕컲 ?붿옄???좏겙 ?쒖뒪??
- **Evidence**:
  - code: `src/app/globals.css::--color-primary`
  - code: `src/app/globals.css::--color-background`
  - code: `src/app/globals.css::--radius`

### Contract: FOUNDATION_FUNC_ACCESSIBILITY

- **What**: WCAG 2.1 Level AA ?묎렐??洹쒖튃
- **Evidence**:
  - code: `src/components/ui/button.tsx::buttonVariants`
  - code: `src/components/ui/dialog.tsx::DialogContent`

### Contract: FOUNDATION_FUNC_I18N

- **What**: ?ㅺ뎅???띿뒪??愿由??쒖뒪??
- **Evidence**:
  - code: `src/lib/text-config.ts::BUTTON_TEXT`
  - code: `src/lib/text-config.ts::STATUS_TEXT`
  - code: `src/lib/text-config.ts::MESSAGE_TEXT`

### Contract: FOUNDATION_FUNC_NAMING

- **What**: ID ?ㅼ씠諛?泥닿퀎 ({TYPE}.{DOMAIN}.{CONTEXT})
- **Evidence**:
  - code: `src/lib/text-config.ts::DEPLOYMENT_ENV`
  - code: `src/lib/text-config.ts::LABEL_TEXT`

---

## GUEST

### Contract: GUEST_API_CREATE

- **What**: 寃뚯뒪???몄뀡 ?앹꽦 API (?낆옣)
- **Evidence**:
  - code: `src/app/api/guest/route.ts::POST`
  - code: `src/app/api/guest/route.ts::generateSecureRandomSuffix`
  - code: `prisma/schema.prisma::GuestSession`

### Contract: GUEST_API_VERIFY

- **What**: 寃뚯뒪???몄뀡 寃利?API
- **Evidence**:
  - code: `src/app/api/guest/verify/route.ts::POST`

### Contract: GUEST_API_EVENT

- **What**: 寃뚯뒪???대깽??湲곕줉 API
- **Evidence**:
  - code: `src/app/api/guest/event/route.ts::POST`
  - code: `prisma/schema.prisma::SpaceEventLog`

### Contract: GUEST_API_EXIT

- **What**: 寃뚯뒪???몄뀡 醫낅즺 API (?댁옣)
- **Evidence**:
  - code: `src/app/api/guest/exit/route.ts::POST`

---

## INFRA

### Contract: INFRA_FUNC_VERCEL_DEPLOY

- **What**: Vercel ?꾨줈?뺤뀡 諛고룷 (Next.js ??
- **Evidence**:
  - code: `vercel.json`
  - code: `.env.production`

### Contract: INFRA_FUNC_OCI_SERVER

- **What**: Oracle Cloud ?듯빀 ?쒕쾭 (Socket.io + LiveKit)
- **Evidence**:
  - code: `terraform/flowspace-stack/main.tf`
  - code: `terraform/flowspace-stack/cloud-init.yaml`

### Contract: INFRA_FUNC_SOCKET_SERVER

- **What**: Socket.io ?ㅼ떆媛??쒕쾭 諛고룷
- **Evidence**:
  - code: `server/socket-server.ts::io`
  - code: `server/package.json`

### Contract: INFRA_FUNC_LIVEKIT_SELFHOST

- **What**: LiveKit ?먯껜 ?몄뒪???ㅼ젙
- **Evidence**:
  - code: `terraform/flowspace-stack/cloud-init.yaml`
  - code: `.env.production`

### Contract: INFRA_FUNC_SSL_CADDY

- **What**: Caddy 由щ쾭???꾨줉??諛?SSL ?먮룞??
- **Evidence**:
  - code: `terraform/flowspace-stack/caddy/Caddyfile`

---

## LIVEKIT

### Contract: LIVEKIT_API_TOKEN

- **What**: LiveKit 猷??좏겙 諛쒓툒 API
- **Evidence**:
  - code: `src/app/api/livekit/token/route.ts::POST`
  - code: `src/app/api/livekit/token/route.ts::removeDuplicateParticipants`
  - code: `src/app/api/livekit/token/route.ts::AccessToken`

### Contract: LIVEKIT_API_WEBHOOK

- **What**: LiveKit ?뱁썒 泥섎━ API
- **Evidence**:
  - code: `src/app/api/livekit/webhook/route.ts::POST`

---

## PERMISSION

### Contract: PERMISSION_FUNC_SPACE_ROLE

- **What**: 怨듦컙 ????븷 愿由?(OWNER, STAFF, PARTICIPANT)
- **Evidence**:
  - code: `src/lib/space-permissions.ts::hasPermission`
  - code: `src/lib/space-permissions.ts::canManage`
  - code: `src/lib/space-permissions.ts::hasMinRole`
  - code: `src/lib/space-permissions.ts::ROLE_HIERARCHY`

### Contract: PERMISSION_FUNC_SPACE_AUTH

- **What**: 怨듦컙 沅뚰븳 寃利?誘몃뱾?⑥뼱
- **Evidence**:
  - code: `src/lib/space-auth.ts::isSuperAdmin`
  - code: `src/lib/space-auth.ts::canCreateSpace`
  - code: `src/lib/space-auth.ts::SpaceMemberInfo`

### Contract: PERMISSION_FUNC_CHAT_MANAGE

- **What**: 梨꾪똿 愿由?湲곕뒫 (??젣, ?뚯냼嫄? 媛뺥눜)
- **Evidence**:
  - code: `src/features/space/socket/useSocket.ts::sendMuteCommand`
  - code: `src/features/space/socket/useSocket.ts::sendKickCommand`
  - code: `src/features/space/socket/useSocket.ts::deleteMessage`

### Contract: PERMISSION_FUNC_SUBSCRIPTION

- **What**: 援щ룆 ?뚮옖 愿由?(FREE, PRO, PREMIUM)
- **Evidence**:
  - code: `prisma/schema.prisma::SubscriptionTier`
  - code: `prisma/schema.prisma::Subscription`
  - code: `src/lib/space-auth.ts::canCreateSpace`

---

## SPACE

### Contract: SPACE_API_CRUD

- **What**: 怨듦컙 CRUD API (?앹꽦, 議고쉶, ?섏젙, ??젣)
- **Evidence**:
  - code: `src/app/api/spaces/route.ts::POST`
  - code: `src/app/api/spaces/route.ts::GET`
  - code: `src/app/api/spaces/[id]/route.ts::GET`
  - code: `src/app/api/spaces/[id]/route.ts::PATCH`
  - code: `src/app/api/spaces/[id]/route.ts::DELETE`

### Contract: SPACE_API_JOIN

- **What**: 怨듦컙 ?낆옣 API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/join/route.ts::POST`
  - code: `prisma/schema.prisma::SpaceMember`

### Contract: SPACE_API_INVITE

- **What**: 珥덈? 肄붾뱶 湲곕컲 怨듦컙 ?묎렐 API
- **Evidence**:
  - code: `src/app/api/spaces/invite/[code]/route.ts::GET`
  - code: `prisma/schema.prisma`

### Contract: SPACE_API_VISIT

- **What**: 怨듦컙 諛⑸Ц 湲곕줉 API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/visit/route.ts::POST`
  - code: `prisma/schema.prisma::SpaceEventLog`

### Contract: SPACE_API_MY_ROLE

- **What**: ?꾩옱 ?ъ슜?먯쓽 怨듦컙 ????븷 議고쉶 API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/my-role/route.ts::GET`
  - code: `src/lib/space-auth.ts::SpaceMemberInfo`

### Contract: SPACE_API_MEMBERS

- **What**: 怨듦컙 硫ㅻ쾭 愿由?API (紐⑸줉, 異붽?, ??븷 蹂寃?
- **Evidence**:
  - code: `src/app/api/spaces/[id]/members/route.ts::GET`
  - code: `src/app/api/spaces/[id]/members/route.ts::POST`

### Contract: SPACE_API_KICK

- **What**: 硫ㅻ쾭 媛뺥눜 API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/members/[memberId]/kick/route.ts::POST`
  - code: `src/lib/space-permissions.ts::canManage`

### Contract: SPACE_API_MUTE

- **What**: 硫ㅻ쾭 ?뚯냼嫄?API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/members/[memberId]/mute/route.ts::POST`
  - code: `src/lib/space-permissions.ts::hasPermission`

### Contract: SPACE_API_STAFF

- **What**: ?ㅽ깭??愿由?API (吏???댁젣)
- **Evidence**:
  - code: `src/app/api/spaces/[id]/staff/route.ts::POST`
  - code: `src/app/api/spaces/[id]/staff/[userId]/route.ts::DELETE`

### Contract: SPACE_API_OBJECTS

- **What**: 怨듦컙 ?ㅻ툕?앺듃 愿由?API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/objects/route.ts::GET`
  - code: `src/app/api/spaces/[id]/objects/route.ts::POST`

### Contract: SPACE_API_ZONES

- **What**: ?뚰떚 議?愿由?API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/zones/route.ts::GET`
  - code: `src/app/api/spaces/[id]/zones/route.ts::POST`
  - code: `src/app/api/spaces/[id]/zones/[zoneId]/route.ts::PUT`
  - code: `src/app/api/spaces/[id]/zones/[zoneId]/route.ts::DELETE`

### Contract: SPACE_API_SPOTLIGHT

- **What**: ?ㅽ룷?몃씪?댄듃 愿由?API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/spotlight/route.ts::GET`
  - code: `src/app/api/spaces/[id]/spotlight/activate/route.ts::POST`

### Contract: SPACE_API_MESSAGES

- **What**: 梨꾪똿 硫붿떆吏 API (?덉뒪?좊━ 議고쉶, ??젣)
- **Evidence**:
  - code: `src/app/api/spaces/[id]/messages/route.ts::GET`
  - code: `src/app/api/spaces/[id]/messages/[messageId]/route.ts::DELETE`

### Contract: SPACE_API_MY_SPACES

- **What**: ??李몄뿬 怨듦컙 紐⑸줉 API
- **Evidence**:
  - code: `src/app/api/my-spaces/route.ts::GET`

### Contract: SPACE_API_TEMPLATES

- **What**: 怨듦컙 ?쒗뵆由?紐⑸줉 API
- **Evidence**:
  - code: `src/app/api/templates/route.ts::GET`
  - code: `prisma/schema.prisma::TemplateKey`

---

## UI_COMPONENT

### Contract: UI_COMPONENT_FUNC_BUTTON

- **What**: 踰꾪듉 而댄룷?뚰듃 (variant: default, outline, destructive, ghost)
- **Evidence**:
  - code: `src/components/ui/button.tsx::Button`
  - code: `src/components/ui/button.tsx::buttonVariants`
  - code: `src/components/ui/button.tsx::ButtonProps`

### Contract: UI_COMPONENT_FUNC_MODAL

- **What**: 紐⑤떖/?ㅼ씠?쇰줈洹?而댄룷?뚰듃 (?묎렐???꾨퉬)
- **Evidence**:
  - code: `src/components/ui/dialog.tsx::Dialog`
  - code: `src/components/ui/dialog.tsx::DialogContent`
  - code: `src/components/ui/dialog.tsx::DialogOverlay`
  - code: `src/components/ui/dialog.tsx::DialogTitle`

### Contract: UI_COMPONENT_FUNC_FORM

- **What**: ??而댄룷?뚰듃 (Input 湲곕컲)
- **Evidence**:
  - code: `src/components/ui/input.tsx::Input`

### Contract: UI_COMPONENT_FUNC_ICON

- **What**: ?꾩씠肄??쒖뒪??(lucide-react)
- **Evidence**:
  - code: `src/components/ui/dialog.tsx`
  - code: `package.json`

---

## UI_SYSTEM

### Contract: UI_SYSTEM_FUNC_TOKEN_FLOW

- **What**: Primary Color ??globals.css ??而댄룷?뚰듃 ?곌껐 ?먮쫫
- **Evidence**:
  - code: `src/app/globals.css`
  - code: `src/components/ui/button.tsx::buttonVariants`
  - code: `src/lib/utils.ts::cn`

### Contract: UI_SYSTEM_FUNC_TEXT_CONFIG

- **What**: ?띿뒪???ㅼ젙 ?쒖뒪??(i18n)
- **Evidence**:
  - code: `src/lib/text-config.ts::BUTTON_TEXT`
  - code: `src/lib/text-config.ts::isAppsInToss`

---

## USER

### Contract: USER_API_NAV

- **What**: ?ъ슜???ㅻ퉬寃뚯씠???뺣낫 API
- **Evidence**:
  - code: `src/app/api/users/me/nav/route.ts::GET`
  - code: `src/lib/auth.ts::auth`

### Contract: USER_API_SEARCH

- **What**: ?ъ슜??寃??API (硫ㅻ쾭 珥덈???
- **Evidence**:
  - code: `src/app/api/users/search/route.ts::GET`
  - code: `prisma/schema.prisma::User`

---


---

> **자동 생성**: 2026-01-21 16:16:39
> **Spec 문서 수**: 15
