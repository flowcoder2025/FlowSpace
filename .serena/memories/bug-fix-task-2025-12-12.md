# Bug Fix Task - 2025-12-12

## Active Issues (9)

### High Priority
1. Admin page data not syncing
2. SuperAdmin can't delete spaces (123 spaces)
3. Staff can't use commands/chat management
4. Chat input covers latest message when active

### Medium Priority
5. Owner appointment no hot reload
6. Event logs not syncing
7. Message+link hybrid not recognized in link tab
8. Grid view filter/sort not working

### Low Priority
9. Chat font size adjustment feature

## Current Phase: Phase 1 - Staff Permissions

### Key Files to Analyze
- `src/features/space/components/chat/FloatingChatOverlay.tsx` - Command execution
- `src/features/space/components/chat/ChatInputArea.tsx` - Command input
- `server/socket-server.ts` - Server-side permission validation

### Progress
- [ ] Phase 1: Staff permissions
- [ ] Phase 2: Admin sync
- [ ] Phase 3: Space delete
- [ ] Phase 4: Owner hot reload
- [ ] Phase 5: Link detection
- [ ] Phase 6: Input layout
- [ ] Phase 7: Font size
- [ ] Phase 8: Grid filter
