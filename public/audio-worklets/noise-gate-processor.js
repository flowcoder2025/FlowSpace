/**
 * NoiseGateProcessor - AudioWorklet 기반 전문급 노이즈 게이트
 *
 * 기능:
 * - RMS 기반 오디오 레벨 감지
 * - 부드러운 Attack/Release 엔벨로프
 * - 히스테리시스로 채터링 방지
 * - 메인 스레드 차단 없이 오디오 처리
 *
 * 사용법:
 * await audioContext.audioWorklet.addModule('/audio-worklets/noise-gate-processor.js')
 * const gateNode = new AudioWorkletNode(audioContext, 'noise-gate-processor')
 */

class NoiseGateProcessor extends AudioWorkletProcessor {
  constructor() {
    super()

    // 게이트 상태
    this.isGateOpen = false
    this.currentGain = 0 // 0 = closed, 1 = open

    // 기본 파라미터 (메시지로 업데이트 가능)
    this.threshold = 0.02 // RMS 임계값 (0-1)
    this.hysteresis = 0.005 // 히스테리시스 (채터링 방지)
    this.attackTime = 0.01 // 게이트 열림 시간 (초)
    this.releaseTime = 0.1 // 게이트 닫힘 시간 (초)
    this.enabled = true // 게이트 활성화 여부

    // 샘플레이트 기반 계산 (sampleRate는 전역 변수)
    this.attackCoeff = 0
    this.releaseCoeff = 0
    this.updateCoefficients()

    // 레벨 리포팅 (throttle)
    this.levelReportCounter = 0
    this.levelReportInterval = 10 // 약 10 프레임마다 (약 30ms)

    // 메시지 핸들러 설정
    this.port.onmessage = this.handleMessage.bind(this)
  }

  /**
   * Attack/Release 계수 계산
   * 지수 감쇠 공식: coeff = 1 - e^(-1 / (time * sampleRate / blockSize))
   */
  updateCoefficients() {
    const blockSize = 128 // AudioWorklet 기본 블록 크기
    const blocksPerSecond = sampleRate / blockSize

    // Attack: 빠르게 열림
    this.attackCoeff = 1 - Math.exp(-1 / (this.attackTime * blocksPerSecond))
    // Release: 천천히 닫힘
    this.releaseCoeff = 1 - Math.exp(-1 / (this.releaseTime * blocksPerSecond))
  }

  /**
   * 메인 스레드에서 메시지 수신
   */
  handleMessage(event) {
    const { type, data } = event.data

    switch (type) {
      case 'setThreshold':
        // sensitivity (0-100) → threshold (0.005-0.1)
        // sensitivity 낮을수록 민감 (낮은 threshold)
        const normalized = Math.max(0, Math.min(100, data)) / 100
        this.threshold = 0.005 + normalized * 0.095
        break

      case 'setEnabled':
        this.enabled = Boolean(data)
        if (!this.enabled) {
          // 비활성화 시 게이트 완전 열림
          this.isGateOpen = true
          this.currentGain = 1
        }
        break

      case 'setAttackTime':
        this.attackTime = Math.max(0.001, Math.min(0.1, data))
        this.updateCoefficients()
        break

      case 'setReleaseTime':
        this.releaseTime = Math.max(0.01, Math.min(1, data))
        this.updateCoefficients()
        break

      case 'setHysteresis':
        this.hysteresis = Math.max(0, Math.min(0.05, data))
        break
    }
  }

  /**
   * RMS (Root Mean Square) 계산
   * 오디오 레벨의 표준 측정 방법
   */
  calculateRMS(channelData) {
    let sum = 0
    for (let i = 0; i < channelData.length; i++) {
      sum += channelData[i] * channelData[i]
    }
    return Math.sqrt(sum / channelData.length)
  }

  /**
   * 오디오 처리 (128 샘플씩 호출됨)
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0]
    const output = outputs[0]

    // 입력 없으면 패스
    if (!input || !input[0]) {
      return true
    }

    // 첫 번째 채널로 RMS 계산 (모노/스테레오 둘 다 대응)
    const inputChannel = input[0]
    const rms = this.calculateRMS(inputChannel)

    // 게이트 비활성화 시 패스스루
    if (!this.enabled) {
      for (let channel = 0; channel < input.length; channel++) {
        output[channel].set(input[channel])
      }
      this.reportLevel(rms, 1)
      return true
    }

    // 히스테리시스 적용 임계값
    const openThreshold = this.isGateOpen
      ? this.threshold - this.hysteresis  // 열린 상태: 낮은 임계값으로 유지
      : this.threshold + this.hysteresis  // 닫힌 상태: 높은 임계값으로 열림

    // 게이트 상태 결정
    const shouldBeOpen = rms > openThreshold

    // 부드러운 게인 전환 (Exponential smoothing)
    const targetGain = shouldBeOpen ? 1 : 0
    const coeff = shouldBeOpen ? this.attackCoeff : this.releaseCoeff
    this.currentGain += (targetGain - this.currentGain) * coeff

    // 게이트 상태 업데이트
    this.isGateOpen = shouldBeOpen

    // 게인 적용
    for (let channel = 0; channel < input.length; channel++) {
      const inputData = input[channel]
      const outputData = output[channel]

      for (let i = 0; i < inputData.length; i++) {
        outputData[i] = inputData[i] * this.currentGain
      }
    }

    // 레벨 리포팅 (throttled)
    this.reportLevel(rms, this.currentGain)

    return true
  }

  /**
   * 메인 스레드에 레벨 리포트 (throttled)
   */
  reportLevel(rms, gain) {
    this.levelReportCounter++
    if (this.levelReportCounter >= this.levelReportInterval) {
      this.levelReportCounter = 0
      this.port.postMessage({
        type: 'levelReport',
        data: {
          rms: rms,
          level: Math.min(100, Math.round(rms * 200)), // 0-100 스케일
          gain: gain,
          isGateOpen: this.isGateOpen,
        }
      })
    }
  }
}

// Worklet에 프로세서 등록
registerProcessor('noise-gate-processor', NoiseGateProcessor)
