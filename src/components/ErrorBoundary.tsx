"use client"

import { Component, type ReactNode } from "react"
import { Button, Card, CardContent, VStack, Text, Heading } from "@/components/ui"

// ============================================
// Error Boundary Props & State
// ============================================

interface ErrorBoundaryProps {
  children: ReactNode
  /** 에러 발생 시 표시할 커스텀 폴백 UI */
  fallback?: ReactNode
  /** 에러 발생 시 호출되는 콜백 */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /** 에러 발생 시 표시할 제목 */
  title?: string
  /** 에러 발생 시 표시할 설명 */
  description?: string
  /** 재시도 버튼 표시 여부 */
  showRetry?: boolean
  /** 에러 발생 시 전체 화면으로 표시할지 여부 */
  fullScreen?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

// ============================================
// Error Boundary Component
// ============================================

/**
 * 재사용 가능한 React Error Boundary
 *
 * @example
 * // 기본 사용법
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * @example
 * // 커스텀 폴백 사용
 * <ErrorBoundary fallback={<div>에러 발생!</div>}>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * @example
 * // 게임 컴포넌트 래핑
 * <ErrorBoundary
 *   title="게임 로딩 실패"
 *   description="게임을 불러오는 중 문제가 발생했습니다."
 *   onError={(error) => logToService(error)}
 * >
 *   <GameCanvas />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // 에러 로깅
    console.error("[ErrorBoundary]", {
      error: error.message,
      componentStack: errorInfo.componentStack,
    })

    // 콜백 호출
    this.props.onError?.(error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    const {
      children,
      fallback,
      title = "오류가 발생했습니다",
      description = "문제가 발생하여 콘텐츠를 표시할 수 없습니다.",
      showRetry = true,
      fullScreen = false,
    } = this.props

    if (this.state.hasError) {
      // 커스텀 폴백이 있으면 사용
      if (fallback) {
        return fallback
      }

      // 기본 폴백 UI
      return (
        <div
          className={`flex items-center justify-center ${
            fullScreen ? "min-h-screen" : "min-h-[200px]"
          } w-full p-4`}
        >
          <Card className="w-full max-w-md border-destructive/20">
            <CardContent className="pt-6">
              <VStack gap="md" align="center" className="text-center">
                {/* Error Icon */}
                <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
                  <svg
                    className="size-8 text-destructive"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                  </svg>
                </div>

                {/* Message */}
                <VStack gap="xs" align="center">
                  <Heading as="h3" size="lg">
                    {title}
                  </Heading>
                  <Text tone="muted" size="sm">
                    {description}
                  </Text>
                </VStack>

                {/* Debug Info (Development) */}
                {process.env.NODE_ENV === "development" && this.state.error && (
                  <div className="w-full rounded bg-muted p-3 text-left">
                    <Text size="xs" tone="muted" className="font-mono break-all">
                      {this.state.error.message}
                    </Text>
                  </div>
                )}

                {/* Retry Button */}
                {showRetry && (
                  <Button onClick={this.handleReset} variant="outline" size="sm">
                    다시 시도
                  </Button>
                )}
              </VStack>
            </CardContent>
          </Card>
        </div>
      )
    }

    return children
  }
}

// ============================================
// Functional Wrapper (for hooks support)
// ============================================

interface WithErrorBoundaryOptions {
  title?: string
  description?: string
  showRetry?: boolean
  fullScreen?: boolean
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

/**
 * 컴포넌트를 ErrorBoundary로 감싸는 HOC
 *
 * @example
 * const SafeGameCanvas = withErrorBoundary(GameCanvas, {
 *   title: "게임 로딩 실패",
 *   onError: (error) => trackError(error)
 * })
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
): React.FC<P> {
  const WithErrorBoundaryWrapper: React.FC<P> = (props) => (
    <ErrorBoundary {...options}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  )

  WithErrorBoundaryWrapper.displayName = `WithErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`

  return WithErrorBoundaryWrapper
}

// ============================================
// Exports
// ============================================

export default ErrorBoundary
