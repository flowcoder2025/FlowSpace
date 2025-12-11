/**
 * Flow UI Component Module
 * Primary Color 기반 디자인 시스템
 *
 * 사용법:
 * import { Button, Card, Heading } from "@/components/ui"
 *
 * @see /claude.md - 전역 규칙
 * @see /src/components/claude.md - 컴포넌트 가이드
 */

// ============================================
// Interactive Components
// ============================================
export { Button, buttonVariants } from "./button"
export { Input } from "./input"
export { Label } from "./label"
export { Badge, badgeVariants } from "./badge"

// ============================================
// Layout Components
// ============================================
export { Container, containerVariants } from "./container"
export { Section, sectionVariants } from "./section"
export { Stack, HStack, VStack, stackVariants } from "./stack"
export { Grid, GridItem, gridVariants, gridItemVariants } from "./grid"
export { Divider, dividerVariants } from "./divider"

// ============================================
// Typography Components
// ============================================
export { Heading, headingVariants } from "./heading"
export { Text, textVariants } from "./text"

// ============================================
// Feedback Components
// ============================================
export {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "./modal"

// ============================================
// Visual Components
// ============================================
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from "./card"
export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  avatarVariants,
  avatarGroupVariants,
} from "./avatar"
export { IconBox, iconBoxVariants } from "./icon-box"

// ============================================
// Dropdown Menu Components
// ============================================
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from "./dropdown-menu"

// ============================================
// Type Exports
// ============================================
export type { VariantProps } from "class-variance-authority"
