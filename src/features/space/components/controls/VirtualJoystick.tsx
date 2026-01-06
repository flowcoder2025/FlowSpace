"use client"

/**
 * VirtualJoystick - 모바일 터치 조이스틱 컴포넌트
 *
 * 모바일 기기에서 캐릭터 이동을 위한 가상 조이스틱을 제공합니다.
 * - 터치 기반 입력
 * - 드래그로 이동 방향 및 강도 조절
 * - eventBridge를 통해 Phaser 게임에 입력 전달
 */

import { useState, useRef, useCallback, useEffect } from "react"
import { eventBridge, GameEvents, type JoystickMovePayload } from "../../game/events"

interface VirtualJoystickProps {
  /** 조이스틱 크기 (px) */
  size?: number
  /** 비활성화 여부 (채팅 모드 등) */
  disabled?: boolean
  /** 투명도 */
  opacity?: number
}

const IS_DEV = process.env.NODE_ENV === "development"

export function VirtualJoystick({
  size = 120,
  disabled = false,
  opacity = 0.6,
}: VirtualJoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [handlePosition, setHandlePosition] = useState({ x: 0, y: 0 })
  const touchIdRef = useRef<number | null>(null)

  // 핸들 크기 (외부 원의 40%)
  const handleSize = size * 0.4
  // 최대 이동 거리 (외부 원 반경 - 핸들 반경)
  const maxDistance = (size - handleSize) / 2

  // 조이스틱 중심 좌표 계산
  const getCenterPosition = useCallback(() => {
    if (!containerRef.current) return { x: 0, y: 0 }
    const rect = containerRef.current.getBoundingClientRect()
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }
  }, [])

  // 입력 위치에서 조이스틱 값 계산
  const calculateJoystickValue = useCallback(
    (clientX: number, clientY: number) => {
      const center = getCenterPosition()
      const deltaX = clientX - center.x
      const deltaY = clientY - center.y

      // 거리 계산
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      const clampedDistance = Math.min(distance, maxDistance)

      // 정규화된 방향
      const normalizedX = distance > 0 ? deltaX / distance : 0
      const normalizedY = distance > 0 ? deltaY / distance : 0

      // 핸들 위치 (픽셀)
      const handleX = normalizedX * clampedDistance
      const handleY = normalizedY * clampedDistance

      // 입력 값 (-1 ~ 1)
      const inputX = clampedDistance > 0 ? (handleX / maxDistance) : 0
      const inputY = clampedDistance > 0 ? (handleY / maxDistance) : 0

      // 입력 강도 (0 ~ 1)
      const force = clampedDistance / maxDistance

      return {
        handleX,
        handleY,
        inputX,
        inputY,
        force,
      }
    },
    [getCenterPosition, maxDistance]
  )

  // 터치/마우스 시작
  const handleStart = useCallback(
    (clientX: number, clientY: number, touchId?: number) => {
      if (disabled) return

      setIsDragging(true)
      if (touchId !== undefined) {
        touchIdRef.current = touchId
      }

      const { handleX, handleY, inputX, inputY, force } = calculateJoystickValue(clientX, clientY)
      setHandlePosition({ x: handleX, y: handleY })

      if (Math.abs(inputX) > 0.1 || Math.abs(inputY) > 0.1) {
        const payload: JoystickMovePayload = {
          x: inputX,
          y: inputY,
          force,
        }
        eventBridge.emit(GameEvents.JOYSTICK_MOVE, payload)

        if (IS_DEV) {
          console.log("[VirtualJoystick] Move:", payload)
        }
      }
    },
    [disabled, calculateJoystickValue]
  )

  // 터치/마우스 이동
  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging || disabled) return

      const { handleX, handleY, inputX, inputY, force } = calculateJoystickValue(clientX, clientY)
      setHandlePosition({ x: handleX, y: handleY })

      // 데드존 (0.1 미만은 무시)
      if (Math.abs(inputX) > 0.1 || Math.abs(inputY) > 0.1) {
        const payload: JoystickMovePayload = {
          x: inputX,
          y: inputY,
          force,
        }
        eventBridge.emit(GameEvents.JOYSTICK_MOVE, payload)
      } else {
        eventBridge.emit(GameEvents.JOYSTICK_STOP)
      }
    },
    [isDragging, disabled, calculateJoystickValue]
  )

  // 터치/마우스 종료
  const handleEnd = useCallback(() => {
    if (!isDragging) return

    setIsDragging(false)
    setHandlePosition({ x: 0, y: 0 })
    touchIdRef.current = null
    eventBridge.emit(GameEvents.JOYSTICK_STOP)

    if (IS_DEV) {
      console.log("[VirtualJoystick] Stop")
    }
  }, [isDragging])

  // 터치 이벤트 핸들러
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      const touch = e.touches[0]
      handleStart(touch.clientX, touch.clientY, touch.identifier)
    },
    [handleStart]
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      // 추적 중인 터치 찾기
      const touch = Array.from(e.touches).find(
        (t) => t.identifier === touchIdRef.current
      )
      if (touch) {
        handleMove(touch.clientX, touch.clientY)
      }
    },
    [handleMove]
  )

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      // 추적 중인 터치가 종료되었는지 확인
      const touchExists = Array.from(e.touches).some(
        (t) => t.identifier === touchIdRef.current
      )
      if (!touchExists) {
        handleEnd()
      }
    },
    [handleEnd]
  )

  // 마우스 이벤트 (데스크톱 디버깅용)
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      handleStart(e.clientX, e.clientY)
    },
    [handleStart]
  )

  // 전역 마우스 이벤트 (드래그 중)
  useEffect(() => {
    if (!isDragging) return

    const onMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY)
    }

    const onMouseUp = () => {
      handleEnd()
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)

    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [isDragging, handleMove, handleEnd])

  // 비활성화 시 조이스틱 중지 이벤트 전송 (상태 변경 없이)
  // disabled 변경 시 게임에 즉시 JOYSTICK_STOP 전송
  const prevDisabledRef = useRef(disabled)
  useEffect(() => {
    if (disabled && !prevDisabledRef.current) {
      // disabled가 false → true로 변경된 경우
      eventBridge.emit(GameEvents.JOYSTICK_STOP)
    }
    prevDisabledRef.current = disabled
  }, [disabled])

  return (
    <div
      ref={containerRef}
      className="relative select-none touch-none"
      style={{
        width: size,
        height: size,
        opacity: disabled ? 0.3 : opacity,
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onMouseDown={onMouseDown}
    >
      {/* 외부 원 (기본 영역) */}
      <div
        className="absolute inset-0 rounded-full border-2 border-white/50 bg-black/30 backdrop-blur-sm"
        style={{
          boxShadow: isDragging
            ? "0 0 20px rgba(255,255,255,0.3)"
            : "0 0 10px rgba(0,0,0,0.3)",
        }}
      />

      {/* 방향 표시 (십자가) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="absolute w-0.5 h-1/3 bg-white/20" />
        <div className="absolute h-0.5 w-1/3 bg-white/20" />
      </div>

      {/* 핸들 (조이스틱 스틱) */}
      <div
        className="absolute rounded-full bg-white/80 border-2 border-white shadow-lg transition-shadow"
        style={{
          width: handleSize,
          height: handleSize,
          left: `calc(50% - ${handleSize / 2}px + ${handlePosition.x}px)`,
          top: `calc(50% - ${handleSize / 2}px + ${handlePosition.y}px)`,
          boxShadow: isDragging
            ? "0 4px 20px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.3)"
            : "0 2px 10px rgba(0,0,0,0.3)",
          transform: isDragging ? "scale(1.1)" : "scale(1)",
          transition: isDragging ? "none" : "transform 0.1s ease-out",
        }}
      />
    </div>
  )
}

export default VirtualJoystick
