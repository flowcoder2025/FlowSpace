# SPEC_SNAPSHOT - 코드 인벤토리

> 자동 생성: specctl snapshot (2026-01-21 21:54:47)
> 버전: v0.5.0 (확장 스캔 지원)

---

## 스캔 정보

| 항목 | 값 |
|------|-----|
| **생성일** | 2026-01-21 |
| **도구** | specctl v0.5.0 |
| **프로젝트** | flow_metaverse |
| **총 항목** | 405 |

### 세부 카운트

| 카테고리 | 개수 |
|----------|:----:|
| UI 라우트 | 0 |
| API 라우트 | 0 |
| UI 컴포넌트 | 99 |
| 권한 유틸리티 | 22 |
| Socket 이벤트 | 25 |
| 설계 토큰 | 12 |
| Feature 훅 | 19 |
| CSS 변수 | 53 |
| Socket 훅/핸들러 | 175 |

---

## UI 라우트
| Route | File | SPEC_KEY |
|-------|------|----------|
| /admin/logs | src/app/admin/logs/page.tsx | PAGE |
| /admin/spaces/:id | src/app/admin/spaces/[id]/page.tsx | PAGE |
| /admin/spaces | src/app/admin/spaces/page.tsx | PAGE |
| /admin | src/app/admin/page.tsx | PAGE |
| /dashboard/spaces/:id | src/app/dashboard/spaces/[id]/page.tsx | PAGE |
| /game-test | src/app/game-test/page.tsx | PAGE |
| /login | src/app/login/page.tsx | AUTH |
| /my-spaces | src/app/my-spaces/page.tsx | PAGE |
| /onboarding | src/app/onboarding/page.tsx | PAGE |
| /pricing | src/app/pricing/page.tsx | PAGE |
| /profile | src/app/profile/page.tsx | PAGE |
| /space/:id | src/app/space/[id]/page.tsx | PAGE |
| /spaces/new | src/app/spaces/new/page.tsx | PAGE |
| /spaces/:inviteCode | src/app/spaces/[inviteCode]/page.tsx | PAGE |
| / | src/app/page.tsx | PAGE |

---

## API 라우트
| Route | File | SPEC_KEY | Method |
|-------|------|----------|--------|
| /api/admin/logs | src/app/api/admin/logs/route.ts | ADMIN | GET |
| /api/admin/oci-metrics | src/app/api/admin/oci-metrics/route.ts | ADMIN | GET |
| /api/admin/spaces | src/app/api/admin/spaces/route.ts | ADMIN | GET |
| /api/admin/stats | src/app/api/admin/stats/route.ts | ADMIN | GET |
| /api/admin/usage/analysis | src/app/api/admin/usage/analysis/route.ts | ADMIN | GET |
| /api/admin/usage/debug | src/app/api/admin/usage/debug/route.ts | ADMIN | GET |
| /api/admin/usage/reset | src/app/api/admin/usage/reset/route.ts | ADMIN | POST |
| /api/auth/register | src/app/api/auth/register/route.ts | AUTH | POST |
| /api/auth/*nextauth | src/app/api/auth/[...nextauth]/route.ts | AUTH | ALL |
| /api/cron/aggregate-usage | src/app/api/cron/aggregate-usage/route.ts | CRON | GET,POST |
| /api/cron/cleanup-messages | src/app/api/cron/cleanup-messages/route.ts | CRON | GET,POST |
| /api/cron/cleanup-sessions | src/app/api/cron/cleanup-sessions/route.ts | CRON | GET,POST |
| /api/cron/collect-metrics | src/app/api/cron/collect-metrics/route.ts | CRON | GET,POST |
| /api/dashboard/spaces/:id/export | src/app/api/dashboard/spaces/[id]/export/route.ts | DASHBOARD | GET |
| /api/dashboard/spaces/:id/stats | src/app/api/dashboard/spaces/[id]/stats/route.ts | DASHBOARD | GET |
| /api/guest/event | src/app/api/guest/event/route.ts | GUEST | POST |
| /api/guest/exit | src/app/api/guest/exit/route.ts | GUEST | POST |
| /api/guest/verify | src/app/api/guest/verify/route.ts | GUEST | POST |
| /api/guest | src/app/api/guest/route.ts | API | POST |
| /api/livekit/token | src/app/api/livekit/token/route.ts | LIVEKIT | POST |
| /api/livekit/webhook | src/app/api/livekit/webhook/route.ts | LIVEKIT | POST |
| /api/my-spaces | src/app/api/my-spaces/route.ts | SPACE | GET |
| /api/spaces/invite/:code | src/app/api/spaces/invite/[code]/route.ts | SPACE | GET |
| /api/spaces/:id/join | src/app/api/spaces/[id]/join/route.ts | SPACE | POST |
| /api/spaces/:id/members/:memberId/kick | src/app/api/spaces/[id]/members/[memberId]/kick/route.ts | SPACE | POST |
| /api/spaces/:id/members/:memberId/mute | src/app/api/spaces/[id]/members/[memberId]/mute/route.ts | SPACE | POST,DELETE |
| /api/spaces/:id/members | src/app/api/spaces/[id]/members/route.ts | SPACE | GET,POST,DELETE |
| /api/spaces/:id/messages/:messageId | src/app/api/spaces/[id]/messages/[messageId]/route.ts | SPACE | DELETE |
| /api/spaces/:id/messages | src/app/api/spaces/[id]/messages/route.ts | SPACE | GET |
| /api/spaces/:id/my-role | src/app/api/spaces/[id]/my-role/route.ts | SPACE | GET |
| /api/spaces/:id/objects | src/app/api/spaces/[id]/objects/route.ts | SPACE | GET,POST,DELETE |
| /api/spaces/:id/spotlight/activate | src/app/api/spaces/[id]/spotlight/activate/route.ts | SPACE | POST,DELETE |
| /api/spaces/:id/spotlight | src/app/api/spaces/[id]/spotlight/route.ts | SPACE | GET,POST,DELETE |
| /api/spaces/:id/staff/:userId | src/app/api/spaces/[id]/staff/[userId]/route.ts | SPACE | DELETE |
| /api/spaces/:id/staff | src/app/api/spaces/[id]/staff/route.ts | SPACE | GET,POST |
| /api/spaces/:id/visit | src/app/api/spaces/[id]/visit/route.ts | SPACE | POST,DELETE |
| /api/spaces/:id/zones/:zoneId | src/app/api/spaces/[id]/zones/[zoneId]/route.ts | SPACE | GET,PUT,DELETE |
| /api/spaces/:id/zones | src/app/api/spaces/[id]/zones/route.ts | SPACE | GET,POST |
| /api/spaces/:id | src/app/api/spaces/[id]/route.ts | SPACE | GET,DELETE |
| /api/spaces | src/app/api/spaces/route.ts | API | GET,POST |
| /api/templates | src/app/api/templates/route.ts | SPACE | GET |
| /api/user/consent | src/app/api/user/consent/route.ts | USER | GET,POST |
| /api/users/me/nav | src/app/api/users/me/nav/route.ts | USER | GET |
| /api/users/search | src/app/api/users/search/route.ts | USER | GET |

---

## UI 컴포넌트

> 자동 스캔: src/components/ui/*.tsx, src/components/space/*.tsx
| Component | File | SPEC_KEY |
|-----------|------|----------|
| Avatar | src/components/ui/avatar.tsx | UI_COMPONENT |
| AvatarImage | src/components/ui/avatar.tsx | UI_COMPONENT |
| AvatarFallback | src/components/ui/avatar.tsx | UI_COMPONENT |
| AvatarGroup | src/components/ui/avatar.tsx | UI_COMPONENT |
| avatarVariants | src/components/ui/avatar.tsx | UI_COMPONENT |
| avatarGroupVariants | src/components/ui/avatar.tsx | UI_COMPONENT |
| Badge | src/components/ui/badge.tsx | UI_COMPONENT |
| badgeVariants | src/components/ui/badge.tsx | UI_COMPONENT |
| Button | src/components/ui/button.tsx | UI_COMPONENT |
| buttonVariants | src/components/ui/button.tsx | UI_COMPONENT |
| ButtonProps | src/components/ui/button.tsx | UI_COMPONENT |
| Card | src/components/ui/card.tsx | UI_COMPONENT |
| CardHeader | src/components/ui/card.tsx | UI_COMPONENT |
| CardFooter | src/components/ui/card.tsx | UI_COMPONENT |
| CardTitle | src/components/ui/card.tsx | UI_COMPONENT |
| CardAction | src/components/ui/card.tsx | UI_COMPONENT |
| CardDescription | src/components/ui/card.tsx | UI_COMPONENT |
| CardContent | src/components/ui/card.tsx | UI_COMPONENT |
| Checkbox | src/components/ui/checkbox.tsx | UI_COMPONENT |
| Container | src/components/ui/container.tsx | UI_COMPONENT |
| containerVariants | src/components/ui/container.tsx | UI_COMPONENT |
| Dialog | src/components/ui/dialog.tsx | UI_COMPONENT |
| DialogClose | src/components/ui/dialog.tsx | UI_COMPONENT |
| DialogContent | src/components/ui/dialog.tsx | UI_COMPONENT |
| DialogDescription | src/components/ui/dialog.tsx | UI_COMPONENT |
| DialogFooter | src/components/ui/dialog.tsx | UI_COMPONENT |
| DialogHeader | src/components/ui/dialog.tsx | UI_COMPONENT |
| DialogOverlay | src/components/ui/dialog.tsx | UI_COMPONENT |
| DialogPortal | src/components/ui/dialog.tsx | UI_COMPONENT |
| DialogTitle | src/components/ui/dialog.tsx | UI_COMPONENT |
| DialogTrigger | src/components/ui/dialog.tsx | UI_COMPONENT |
| Divider | src/components/ui/divider.tsx | UI_COMPONENT |
| dividerVariants | src/components/ui/divider.tsx | UI_COMPONENT |
| DropdownMenu | src/components/ui/dropdown-menu.tsx | UI_COMPONENT |
| DropdownMenuTrigger | src/components/ui/dropdown-menu.tsx | UI_COMPONENT |
| DropdownMenuContent | src/components/ui/dropdown-menu.tsx | UI_COMPONENT |
| DropdownMenuItem | src/components/ui/dropdown-menu.tsx | UI_COMPONENT |
| DropdownMenuCheckboxItem | src/components/ui/dropdown-menu.tsx | UI_COMPONENT |
| DropdownMenuRadioItem | src/components/ui/dropdown-menu.tsx | UI_COMPONENT |
| DropdownMenuLabel | src/components/ui/dropdown-menu.tsx | UI_COMPONENT |
| DropdownMenuSeparator | src/components/ui/dropdown-menu.tsx | UI_COMPONENT |
| DropdownMenuShortcut | src/components/ui/dropdown-menu.tsx | UI_COMPONENT |
| DropdownMenuGroup | src/components/ui/dropdown-menu.tsx | UI_COMPONENT |
| DropdownMenuPortal | src/components/ui/dropdown-menu.tsx | UI_COMPONENT |
| DropdownMenuSub | src/components/ui/dropdown-menu.tsx | UI_COMPONENT |
| DropdownMenuSubContent | src/components/ui/dropdown-menu.tsx | UI_COMPONENT |
| DropdownMenuSubTrigger | src/components/ui/dropdown-menu.tsx | UI_COMPONENT |
| DropdownMenuRadioGroup | src/components/ui/dropdown-menu.tsx | UI_COMPONENT |
| Grid | src/components/ui/grid.tsx | UI_COMPONENT |
| GridItem | src/components/ui/grid.tsx | UI_COMPONENT |
| gridVariants | src/components/ui/grid.tsx | UI_COMPONENT |
| gridItemVariants | src/components/ui/grid.tsx | UI_COMPONENT |
| Heading | src/components/ui/heading.tsx | UI_COMPONENT |
| headingVariants | src/components/ui/heading.tsx | UI_COMPONENT |
| IconBox | src/components/ui/icon-box.tsx | UI_COMPONENT |
| iconBoxVariants | src/components/ui/icon-box.tsx | UI_COMPONENT |
| Input | src/components/ui/input.tsx | UI_COMPONENT |
| Label | src/components/ui/label.tsx | UI_COMPONENT |
| LabelProps | src/components/ui/label.tsx | UI_COMPONENT |
| Modal | src/components/ui/modal.tsx | UI_COMPONENT |
| ModalOverlay | src/components/ui/modal.tsx | UI_COMPONENT |
| ModalContent | src/components/ui/modal.tsx | UI_COMPONENT |
| ModalHeader | src/components/ui/modal.tsx | UI_COMPONENT |
| ModalTitle | src/components/ui/modal.tsx | UI_COMPONENT |
| ModalDescription | src/components/ui/modal.tsx | UI_COMPONENT |
| ModalFooter | src/components/ui/modal.tsx | UI_COMPONENT |
| RadioGroup | src/components/ui/radio-group.tsx | UI_COMPONENT |
| RadioGroupItem | src/components/ui/radio-group.tsx | UI_COMPONENT |
| ScrollArea | src/components/ui/scroll-area.tsx | UI_COMPONENT |
| ScrollBar | src/components/ui/scroll-area.tsx | UI_COMPONENT |
| Section | src/components/ui/section.tsx | UI_COMPONENT |
| sectionVariants | src/components/ui/section.tsx | UI_COMPONENT |
| Select | src/components/ui/select.tsx | UI_COMPONENT |
| SelectContent | src/components/ui/select.tsx | UI_COMPONENT |
| SelectGroup | src/components/ui/select.tsx | UI_COMPONENT |
| SelectItem | src/components/ui/select.tsx | UI_COMPONENT |
| SelectLabel | src/components/ui/select.tsx | UI_COMPONENT |
| SelectScrollDownButton | src/components/ui/select.tsx | UI_COMPONENT |
| SelectScrollUpButton | src/components/ui/select.tsx | UI_COMPONENT |
| SelectSeparator | src/components/ui/select.tsx | UI_COMPONENT |
| SelectTrigger | src/components/ui/select.tsx | UI_COMPONENT |
| SelectValue | src/components/ui/select.tsx | UI_COMPONENT |
| Separator | src/components/ui/separator.tsx | UI_COMPONENT |
| Slider | src/components/ui/slider.tsx | UI_COMPONENT |
| Stack | src/components/ui/stack.tsx | UI_COMPONENT |
| HStack | src/components/ui/stack.tsx | UI_COMPONENT |
| VStack | src/components/ui/stack.tsx | UI_COMPONENT |
| stackVariants | src/components/ui/stack.tsx | UI_COMPONENT |
| Switch | src/components/ui/switch.tsx | UI_COMPONENT |
| Tabs | src/components/ui/tabs.tsx | UI_COMPONENT |
| TabsList | src/components/ui/tabs.tsx | UI_COMPONENT |
| TabsTrigger | src/components/ui/tabs.tsx | UI_COMPONENT |
| TabsContent | src/components/ui/tabs.tsx | UI_COMPONENT |
| Text | src/components/ui/text.tsx | UI_COMPONENT |
| textVariants | src/components/ui/text.tsx | UI_COMPONENT |
| MemberList | src/components/space/MemberList.tsx | UI_COMPONENT |
| MemberManagement | src/components/space/MemberManagement.tsx | UI_COMPONENT |
| MemberSearchInput | src/components/space/MemberSearchInput.tsx | UI_COMPONENT |
| RoleBadge | src/components/space/RoleBadge.tsx | UI_COMPONENT |

---

## 권한 유틸리티

> 자동 스캔: src/lib/space-permissions.ts, src/lib/space-auth.ts
| Export | File | SPEC_KEY | Type |
|--------|------|----------|------|
| hasPermission | src/lib/space-permissions.ts | SPACE | function |
| canManage | src/lib/space-permissions.ts | SPACE | function |
| hasMinRole | src/lib/space-permissions.ts | SPACE | function |
| compareRoles | src/lib/space-permissions.ts | SPACE | function |
| getPermissionsForRole | src/lib/space-permissions.ts | SPACE | function |
| getRoleDisplayName | src/lib/space-permissions.ts | SPACE | function |
| getRoleBadgeColor | src/lib/space-permissions.ts | SPACE | function |
| SpacePermission | src/lib/space-permissions.ts | SPACE | type |
| ForbiddenError | src/lib/space-permissions.ts | SPACE | class |
| NotFoundError | src/lib/space-permissions.ts | SPACE | class |
| isSuperAdmin | src/lib/space-auth.ts | SPACE | function |
| canCreateSpace | src/lib/space-auth.ts | SPACE | function |
| getSpaceMember | src/lib/space-auth.ts | SPACE | function |
| getSpaceOwner | src/lib/space-auth.ts | SPACE | function |
| requireSpaceRole | src/lib/space-auth.ts | SPACE | function |
| requireManagePermission | src/lib/space-auth.ts | SPACE | function |
| addOrUpdateSpaceMember | src/lib/space-auth.ts | SPACE | function |
| createSpaceOwner | src/lib/space-auth.ts | SPACE | function |
| ensureSpaceParticipant | src/lib/space-auth.ts | SPACE | function |
| canManageSpace | src/lib/space-auth.ts | SPACE | function |
| SpaceMemberInfo | src/lib/space-auth.ts | SPACE | interface |
| SpaceAuthResult | src/lib/space-auth.ts | SPACE | interface |

---

## Socket.io 이벤트

> 자동 스캔: server/socket-server.ts
| Event | File | SPEC_KEY | Direction |
|-------|------|----------|-----------|
| join:space | server/socket-server.ts | SOCKET | client→server |
| leave:space | server/socket-server.ts | SOCKET | client→server |
| player:move | server/socket-server.ts | SOCKET | client→server |
| player:jump | server/socket-server.ts | SOCKET | client→server |
| chat:message | server/socket-server.ts | SOCKET | client→server |
| reaction:toggle | server/socket-server.ts | SOCKET | client→server |
| whisper:send | server/socket-server.ts | SOCKET | client→server |
| party:join | server/socket-server.ts | SOCKET | client→server |
| party:leave | server/socket-server.ts | SOCKET | client→server |
| party:message | server/socket-server.ts | SOCKET | client→server |
| player:updateProfile | server/socket-server.ts | SOCKET | client→server |
| admin:mute | server/socket-server.ts | SOCKET | client→server |
| admin:unmute | server/socket-server.ts | SOCKET | client→server |
| admin:kick | server/socket-server.ts | SOCKET | client→server |
| admin:deleteMessage | server/socket-server.ts | SOCKET | client→server |
| admin:announce | server/socket-server.ts | SOCKET | client→server |
| recording:start | server/socket-server.ts | SOCKET | client→server |
| recording:stop | server/socket-server.ts | SOCKET | client→server |
| spotlight:activate | server/socket-server.ts | SOCKET | client→server |
| spotlight:deactivate | server/socket-server.ts | SOCKET | client→server |
| proximity:set | server/socket-server.ts | SOCKET | client→server |
| object:place | server/socket-server.ts | SOCKET | client→server |
| object:update | server/socket-server.ts | SOCKET | client→server |
| object:delete | server/socket-server.ts | SOCKET | client→server |
| disconnect | server/socket-server.ts | SOCKET | client→server |

---

## 설계 토큰

> 자동 스캔: src/lib/text-config.ts
| Token | File | SPEC_KEY | Category |
|-------|------|----------|----------|
| BUTTON_TEXT | src/lib/text-config.ts | UI_COMPONENT | 버튼 텍스트 |
| STATUS_TEXT | src/lib/text-config.ts | UI_COMPONENT | 상태 텍스트 |
| PLACEHOLDER_TEXT | src/lib/text-config.ts | UI_COMPONENT | 플레이스홀더 |
| LABEL_TEXT | src/lib/text-config.ts | UI_COMPONENT | 라벨 |
| MESSAGE_TEXT | src/lib/text-config.ts | UI_COMPONENT | 메시지 |
| ID_TEXT | src/lib/text-config.ts | UI_COMPONENT FOUNDATION | ID 기반 텍스트 |
| ButtonTextKey | src/lib/text-config.ts | FOUNDATION | 타입 |
| StatusTextKey | src/lib/text-config.ts | FOUNDATION | 타입 |
| PlaceholderTextKey | src/lib/text-config.ts | FOUNDATION | 타입 |
| LabelTextKey | src/lib/text-config.ts | FOUNDATION | 타입 |
| getDeploymentEnvName | src/lib/text-config.ts | FOUNDATION | 유틸리티 |
| getText | src/lib/text-config.ts | FOUNDATION | 유틸리티 |

---

## Feature 훅

> 자동 스캔: src/features/space/hooks/*.ts
| Hook | File | SPEC_KEY | Feature |
|------|------|----------|---------|
| useAudioGateProcessor | src/features/space/hooks/useAudioGateProcessor.ts | SPACE | 오디오 |
| useAudioSettings | src/features/space/hooks/useAudioSettings.ts | SPACE | 오디오 |
| useChatDrag | src/features/space/hooks/useChatDrag.ts | SPACE | 채팅 |
| useChatMode | src/features/space/hooks/useChatMode.ts | SPACE | 채팅 |
| useChatStorage | src/features/space/hooks/useChatStorage.ts | SPACE | 채팅 |
| useDebouncedEditorSave | src/features/space/hooks/useDebouncedEditorSave.ts | SPACE | 에디터 |
| useEditorCommands | src/features/space/hooks/useEditorCommands.ts | SPACE | 에디터 |
| useFullscreen | src/features/space/hooks/useFullscreen.ts | SPACE | 화면공유 전체화면 |
| useFullscreenToggle | src/features/space/hooks/useFullscreen.ts | SPACE | 화면공유 전체화면 |
| useMediaDevices | src/features/space/hooks/useMediaDevices.ts | SPACE | 미디어 |
| useNotificationSound | src/features/space/hooks/useNotificationSound.ts | SPACE | 알림 |
| usePairPlacement | src/features/space/hooks/usePairPlacement.ts | SPACE | 페어 |
| usePartyZone | src/features/space/hooks/usePartyZone.ts | SPACE | 파티 |
| usePastMessages | src/features/space/hooks/usePastMessages.ts | SPACE | 공간 |
| useScreenRecorder | src/features/space/hooks/useScreenRecorder.ts | SPACE | 화면공유 |
| useScreenShareSupport | src/features/space/hooks/useScreenShareSupport.ts | SPACE | 화면공유 |
| useVideoSettings | src/features/space/hooks/useVideoSettings.ts | SPACE | 비디오 |
| useVoiceActivityGate | src/features/space/hooks/useVoiceActivityGate.ts | SPACE | 음성 |
| useVolumeMeter | src/features/space/hooks/useVolumeMeter.ts | SPACE | 볼륨 |

---

## CSS 변수 (v0.5.0)

> 자동 스캔: src/app/globals.css
| Variable | File | SPEC_KEY | Category |
|----------|------|----------|----------|
| --color-primary | src/app/globals.css | FOUNDATION | 기타 |
| --color-primary-foreground | src/app/globals.css | FOUNDATION | 기타 |
| --color-background | src/app/globals.css | FOUNDATION | 기타 |
| --color-foreground | src/app/globals.css | FOUNDATION | 기타 |
| --color-card | src/app/globals.css | FOUNDATION | 기타 |
| --color-card-foreground | src/app/globals.css | FOUNDATION | 기타 |
| --color-popover | src/app/globals.css | FOUNDATION | 기타 |
| --color-popover-foreground | src/app/globals.css | FOUNDATION | 기타 |
| --color-secondary | src/app/globals.css | FOUNDATION | 기타 |
| --color-secondary-foreground | src/app/globals.css | FOUNDATION | 기타 |
| --color-muted | src/app/globals.css | FOUNDATION | 기타 |
| --color-muted-foreground | src/app/globals.css | FOUNDATION | 기타 |
| --color-accent | src/app/globals.css | FOUNDATION | 기타 |
| --color-accent-foreground | src/app/globals.css | FOUNDATION | 기타 |
| --color-destructive | src/app/globals.css | FOUNDATION | 기타 |
| --color-border | src/app/globals.css | FOUNDATION | 기타 |
| --color-input | src/app/globals.css | FOUNDATION | 기타 |
| --color-ring | src/app/globals.css | FOUNDATION | 기타 |
| --radius-sm | src/app/globals.css | FOUNDATION | Radius |
| --radius | src/app/globals.css | FOUNDATION | Radius |
| --radius-md | src/app/globals.css | FOUNDATION | Radius |
| --radius-lg | src/app/globals.css | FOUNDATION | Radius |
| --radius-xl | src/app/globals.css | FOUNDATION | Radius |
| --color-sidebar | src/app/globals.css | FOUNDATION | 기타 |
| --color-sidebar-foreground | src/app/globals.css | FOUNDATION | 기타 |
| --color-sidebar-primary | src/app/globals.css | FOUNDATION | 기타 |
| --color-sidebar-primary-foreground | src/app/globals.css | FOUNDATION | 기타 |
| --color-sidebar-accent | src/app/globals.css | FOUNDATION | 기타 |
| --color-sidebar-accent-foreground | src/app/globals.css | FOUNDATION | 기타 |
| --color-sidebar-border | src/app/globals.css | FOUNDATION | 기타 |
| --color-sidebar-ring | src/app/globals.css | FOUNDATION | 기타 |
| --color-chart-1 | src/app/globals.css | FOUNDATION | 기타 |
| --color-chart-2 | src/app/globals.css | FOUNDATION | 기타 |
| --color-chart-3 | src/app/globals.css | FOUNDATION | 기타 |
| --color-chart-4 | src/app/globals.css | FOUNDATION | 기타 |
| --color-chart-5 | src/app/globals.css | FOUNDATION | 기타 |
| --color-background | src/app/globals.css | FOUNDATION | 기타 |
| --color-foreground | src/app/globals.css | FOUNDATION | 기타 |
| --color-card | src/app/globals.css | FOUNDATION | 기타 |
| --color-card-foreground | src/app/globals.css | FOUNDATION | 기타 |
| --color-popover | src/app/globals.css | FOUNDATION | 기타 |
| --color-popover-foreground | src/app/globals.css | FOUNDATION | 기타 |
| --color-secondary | src/app/globals.css | FOUNDATION | 기타 |
| --color-secondary-foreground | src/app/globals.css | FOUNDATION | 기타 |
| --color-muted | src/app/globals.css | FOUNDATION | 기타 |
| --color-muted-foreground | src/app/globals.css | FOUNDATION | 기타 |
| --color-accent | src/app/globals.css | FOUNDATION | 기타 |
| --color-accent-foreground | src/app/globals.css | FOUNDATION | 기타 |
| --color-border | src/app/globals.css | FOUNDATION | 기타 |
| --color-input | src/app/globals.css | FOUNDATION | 기타 |
| --color-sidebar | src/app/globals.css | FOUNDATION | 기타 |
| --color-sidebar-foreground | src/app/globals.css | FOUNDATION | 기타 |
| --color-sidebar-border | src/app/globals.css | FOUNDATION | 기타 |

---

## Socket 훅/핸들러 (v0.5.0)

> 자동 스캔: src/features/space/hooks/useSocket.ts, server/socket-*.ts
| Name | File | SPEC_KEY | Type |
|------|------|----------|------|
| useSocket | src/features/space/socket/useSocket.ts | PERMISSION | function |
| join:space | src/features/space/socket/useSocket.ts | SOCKET | emit |
| join:space | src/features/space/socket/useSocket.ts | SOCKET | emit |
| player:move | src/features/space/socket/useSocket.ts | SOCKET | emit |
| player:jump | src/features/space/socket/useSocket.ts | SOCKET | emit |
| leave:space | src/features/space/socket/useSocket.ts | SOCKET | emit |
| leave:space | src/features/space/socket/useSocket.ts | SOCKET | emit |
| leave:space | src/features/space/socket/useSocket.ts | SOCKET | emit |
| connect | src/features/space/socket/useSocket.ts | SOCKET | on |
| disconnect | src/features/space/socket/useSocket.ts | SOCKET | on |
| room:joined | src/features/space/socket/useSocket.ts | SOCKET | on |
| player:joined | src/features/space/socket/useSocket.ts | SOCKET | on |
| player:left | src/features/space/socket/useSocket.ts | SOCKET | on |
| player:moved | src/features/space/socket/useSocket.ts | SOCKET | on |
| player:jumped | src/features/space/socket/useSocket.ts | SOCKET | on |
| chat:message | src/features/space/socket/useSocket.ts | SOCKET | on |
| chat:system | src/features/space/socket/useSocket.ts | SOCKET | on |
| chat:error | src/features/space/socket/useSocket.ts | SOCKET | on |
| chat:messageIdUpdate | src/features/space/socket/useSocket.ts | SOCKET | on |
| chat:messageFailed | src/features/space/socket/useSocket.ts | SOCKET | on |
| whisper:receive | src/features/space/socket/useSocket.ts | SOCKET | on |
| whisper:sent | src/features/space/socket/useSocket.ts | SOCKET | on |
| whisper:error | src/features/space/socket/useSocket.ts | SOCKET | on |
| whisper:messageIdUpdate | src/features/space/socket/useSocket.ts | SOCKET | on |
| whisper:messageFailed | src/features/space/socket/useSocket.ts | SOCKET | on |
| party:joined | src/features/space/socket/useSocket.ts | SOCKET | on |
| party:left | src/features/space/socket/useSocket.ts | SOCKET | on |
| party:message | src/features/space/socket/useSocket.ts | SOCKET | on |
| party:error | src/features/space/socket/useSocket.ts | SOCKET | on |
| member:muted | src/features/space/socket/useSocket.ts | SOCKET | on |
| member:unmuted | src/features/space/socket/useSocket.ts | SOCKET | on |
| member:kicked | src/features/space/socket/useSocket.ts | SOCKET | on |
| chat:messageDeleted | src/features/space/socket/useSocket.ts | SOCKET | on |
| space:announcement | src/features/space/socket/useSocket.ts | SOCKET | on |
| admin:error | src/features/space/socket/useSocket.ts | SOCKET | on |
| recording:started | src/features/space/socket/useSocket.ts | SOCKET | on |
| recording:stopped | src/features/space/socket/useSocket.ts | SOCKET | on |
| recording:status | src/features/space/socket/useSocket.ts | SOCKET | on |
| recording:error | src/features/space/socket/useSocket.ts | SOCKET | on |
| reaction:updated | src/features/space/socket/useSocket.ts | SOCKET | on |
| spotlight:activated | src/features/space/socket/useSocket.ts | SOCKET | on |
| spotlight:deactivated | src/features/space/socket/useSocket.ts | SOCKET | on |
| spotlight:status | src/features/space/socket/useSocket.ts | SOCKET | on |
| spotlight:error | src/features/space/socket/useSocket.ts | SOCKET | on |
| proximity:status | src/features/space/socket/useSocket.ts | SOCKET | on |
| proximity:changed | src/features/space/socket/useSocket.ts | SOCKET | on |
| proximity:error | src/features/space/socket/useSocket.ts | SOCKET | on |
| player:profileUpdated | src/features/space/socket/useSocket.ts | SOCKET | on |
| error | src/features/space/socket/useSocket.ts | SOCKET | on |
| connect_error | src/features/space/socket/useSocket.ts | SOCKET | on |
| reconnect_attempt | src/features/space/socket/useSocket.ts | SOCKET | io.on |
| reconnect | src/features/space/socket/useSocket.ts | SOCKET | io.on |
| reconnect_error | src/features/space/socket/useSocket.ts | SOCKET | io.on |
| reconnect_failed | src/features/space/socket/useSocket.ts | SOCKET | io.on |
| sendMessage | src/features/space/socket/useSocket.ts | PERMISSION | callback |
| sendWhisper | src/features/space/socket/useSocket.ts | PERMISSION | callback |
| joinParty | src/features/space/socket/useSocket.ts | PERMISSION | callback |
| leaveParty | src/features/space/socket/useSocket.ts | PERMISSION | callback |
| sendPartyMessage | src/features/space/socket/useSocket.ts | PERMISSION | callback |
| disconnect | src/features/space/socket/useSocket.ts | PERMISSION | callback |
| updateProfile | src/features/space/socket/useSocket.ts | PERMISSION | callback |
| sendMuteCommand | src/features/space/socket/useSocket.ts | PERMISSION | callback |
| sendUnmuteCommand | src/features/space/socket/useSocket.ts | PERMISSION | callback |
| sendKickCommand | src/features/space/socket/useSocket.ts | PERMISSION | callback |
| sendAnnounce | src/features/space/socket/useSocket.ts | PERMISSION | callback |
| deleteMessage | src/features/space/socket/useSocket.ts | PERMISSION | callback |
| startRecording | src/features/space/socket/useSocket.ts | PERMISSION | callback |
| stopRecording | src/features/space/socket/useSocket.ts | PERMISSION | callback |
| toggleReaction | src/features/space/socket/useSocket.ts | PERMISSION | callback |
| activateSpotlight | src/features/space/socket/useSocket.ts | PERMISSION | callback |
| deactivateSpotlight | src/features/space/socket/useSocket.ts | PERMISSION | callback |
| setProximity | src/features/space/socket/useSocket.ts | PERMISSION | callback |
| error | server/socket-server.ts | SOCKET | emit |
| error | server/socket-server.ts | SOCKET | emit |
| room:joined | server/socket-server.ts | SOCKET | emit |
| objects:sync | server/socket-server.ts | SOCKET | emit |
| recording:status | server/socket-server.ts | SOCKET | emit |
| spotlight:status | server/socket-server.ts | SOCKET | emit |
| proximity:status | server/socket-server.ts | SOCKET | emit |
| chat:error | server/socket-server.ts | SOCKET | emit |
| chat:error | server/socket-server.ts | SOCKET | emit |
| whisper:error | server/socket-server.ts | SOCKET | emit |
| whisper:error | server/socket-server.ts | SOCKET | emit |
| whisper:error | server/socket-server.ts | SOCKET | emit |
| whisper:error | server/socket-server.ts | SOCKET | emit |
| whisper:sent | server/socket-server.ts | SOCKET | emit |
| whisper:messageIdUpdate | server/socket-server.ts | SOCKET | emit |
| whisper:messageFailed | server/socket-server.ts | SOCKET | emit |
| party:joined | server/socket-server.ts | SOCKET | emit |
| party:left | server/socket-server.ts | SOCKET | emit |
| party:error | server/socket-server.ts | SOCKET | emit |
| party:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| admin:error | server/socket-server.ts | SOCKET | emit |
| recording:error | server/socket-server.ts | SOCKET | emit |
| recording:error | server/socket-server.ts | SOCKET | emit |
| recording:error | server/socket-server.ts | SOCKET | emit |
| recording:error | server/socket-server.ts | SOCKET | emit |
| recording:error | server/socket-server.ts | SOCKET | emit |
| recording:error | server/socket-server.ts | SOCKET | emit |
| recording:error | server/socket-server.ts | SOCKET | emit |
| recording:error | server/socket-server.ts | SOCKET | emit |
| spotlight:error | server/socket-server.ts | SOCKET | emit |
| spotlight:error | server/socket-server.ts | SOCKET | emit |
| spotlight:error | server/socket-server.ts | SOCKET | emit |
| spotlight:error | server/socket-server.ts | SOCKET | emit |
| spotlight:error | server/socket-server.ts | SOCKET | emit |
| spotlight:error | server/socket-server.ts | SOCKET | emit |
| spotlight:error | server/socket-server.ts | SOCKET | emit |
| proximity:error | server/socket-server.ts | SOCKET | emit |
| proximity:error | server/socket-server.ts | SOCKET | emit |
| proximity:error | server/socket-server.ts | SOCKET | emit |
| object:error | server/socket-server.ts | SOCKET | emit |
| object:error | server/socket-server.ts | SOCKET | emit |
| object:error | server/socket-server.ts | SOCKET | emit |
| object:error | server/socket-server.ts | SOCKET | emit |
| object:error | server/socket-server.ts | SOCKET | emit |
| object:error | server/socket-server.ts | SOCKET | emit |
| object:error | server/socket-server.ts | SOCKET | emit |
| object:error | server/socket-server.ts | SOCKET | emit |
| object:error | server/socket-server.ts | SOCKET | emit |
| object:error | server/socket-server.ts | SOCKET | emit |
| object:error | server/socket-server.ts | SOCKET | emit |
| join:space | server/socket-server.ts | SOCKET | on |
| leave:space | server/socket-server.ts | SOCKET | on |
| player:move | server/socket-server.ts | SOCKET | on |
| player:jump | server/socket-server.ts | SOCKET | on |
| chat:message | server/socket-server.ts | SOCKET | on |
| reaction:toggle | server/socket-server.ts | SOCKET | on |
| whisper:send | server/socket-server.ts | SOCKET | on |
| party:join | server/socket-server.ts | SOCKET | on |
| party:leave | server/socket-server.ts | SOCKET | on |
| party:message | server/socket-server.ts | SOCKET | on |
| player:updateProfile | server/socket-server.ts | SOCKET | on |
| admin:mute | server/socket-server.ts | SOCKET | on |
| admin:unmute | server/socket-server.ts | SOCKET | on |
| admin:kick | server/socket-server.ts | SOCKET | on |
| admin:deleteMessage | server/socket-server.ts | SOCKET | on |
| admin:announce | server/socket-server.ts | SOCKET | on |
| recording:start | server/socket-server.ts | SOCKET | on |
| recording:stop | server/socket-server.ts | SOCKET | on |
| spotlight:activate | server/socket-server.ts | SOCKET | on |
| spotlight:deactivate | server/socket-server.ts | SOCKET | on |
| proximity:set | server/socket-server.ts | SOCKET | on |
| object:place | server/socket-server.ts | SOCKET | on |
| object:update | server/socket-server.ts | SOCKET | on |
| object:delete | server/socket-server.ts | SOCKET | on |
| disconnect | server/socket-server.ts | SOCKET | on |
| connection | server/socket-server.ts | SOCKET | io.on |

---

> **참고**: 모든 항목은 자동 스캔됨 (v0.5.0 확장)
> **Contract 유형 분류**: PROCESS_BASED(AI_PROTOCOL), INFRA_BASED(INFRA)는 GAP 계산에서 제외
