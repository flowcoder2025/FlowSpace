# Oracle Cloud Infrastructure - 통합 서버 배포 가이드

> **목적**: LiveKit + Socket.io를 Oracle Always Free에 통합 배포하여 인프라 비용 $0 달성
> **작성일**: 2026-01-07
> **상태**: 동업자 협의 후 진행 예정

---

## 1. 개요

### 1.1 현재 인프라 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                     현재 구조 (비용 발생)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐      ┌──────────┐      ┌──────────────┐         │
│   │  Vercel  │      │ Railway  │      │ LiveKit Cloud │         │
│   │ Next.js  │─────▶│Socket.io │      │    Video     │         │
│   │   FREE   │      │ $5-20/월 │      │  한도 소진   │         │
│   └──────────┘      └──────────┘      └──────────────┘         │
│                                                                 │
│   예상 월 비용: $5-20 (Railway) + $50-500 (LiveKit 유료 전환 시)  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 목표 인프라 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                    목표 구조 (비용 $0)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐      ┌─────────────────────────────────────┐    │
│   │  Vercel  │      │      Oracle Always Free              │    │
│   │ Next.js  │─────▶│   ┌──────────┐   ┌──────────┐       │    │
│   │   FREE   │      │   │Socket.io │   │ LiveKit  │       │    │
│   └──────────┘      │   │  :3001   │   │  :7880   │       │    │
│                     │   └──────────┘   └──────────┘       │    │
│                     │       4 OCPU / 24GB RAM / $0         │    │
│                     └─────────────────────────────────────┘    │
│                                                                 │
│   예상 월 비용: $0                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Oracle Cloud 계정 정보

| 항목 | 값 |
|-----|-----|
| **테넌시** | kryou1 |
| **Plan Type** | Pay As You Go (PAYG) |
| **홈 리전** | ap-chuncheon-1 (춘천) |
| **결제 수단** | Credit Card 등록됨 |
| **상태** | Active |

---

## 2. 비용 분석

### 2.1 현재 vs 목표 비용 비교

| 서비스 | 현재 (월) | 목표 (월) | 연간 절감 |
|--------|----------|----------|----------|
| **Vercel** (Next.js) | $0 | $0 | - |
| **Railway** (Socket.io) | $5-20 | $0 | **$60-240** |
| **LiveKit Cloud** | $50-500* | $0 | **$600-6,000** |
| **합계** | $55-520 | **$0** | **$660-6,240** |

*LiveKit Cloud 무료 한도(5,000분) 소진 후 예상 비용

### 2.2 Oracle Always Free 리소스

| 리소스 | 한도 | FlowSpace 예상 사용량 | 여유 |
|--------|------|---------------------|------|
| **CPU** | 4 OCPU | ~2.5 OCPU | ✅ 여유 |
| **메모리** | 24GB | ~6GB | ✅ 여유 |
| **스토리지** | 200GB | ~50GB | ✅ 여유 |
| **트래픽** | 10TB/월 | 가변 | ⚠️ 모니터링 필요 |

### 2.3 서비스별 리소스 예상

| 서비스 | CPU | 메모리 | 비고 |
|--------|-----|--------|------|
| **Socket.io** | ~0.5 OCPU | ~512MB | 경량, 이벤트 기반 |
| **LiveKit** | ~2 OCPU | ~4GB | 미디어 처리 |
| **Caddy** (SSL) | ~0.1 OCPU | ~128MB | 리버스 프록시 |
| **시스템** | ~0.4 OCPU | ~1GB | OS, Docker 등 |
| **합계** | **~3 OCPU** | **~6GB** | Always Free 범위 내 |

### 2.4 규모별 비용 시나리오

| 규모 | 동시 접속 | LiveKit Cloud | Oracle Self-hosted |
|------|----------|--------------|-------------------|
| **테스트** | 1-10명 | $0 (무료 한도) | $0 |
| **소규모** | 10-50명 | ~$50-100/월 | $0 |
| **중규모** | 50-200명 | ~$200-500/월 | $0 |
| **대규모** | 200명+ | $500+/월 | 서버 추가 검토 |

### 2.5 트래픽 비용 계산

```
1인당 영상 통화 트래픽 (예상):
- 비트레이트: ~1.5 Mbps (720p)
- 1시간 사용: ~675MB
- 10TB 한도로 가능한 시간: ~15,000시간/월

예시 시나리오:
- 일 평균 100명 × 1시간 = 100시간/일
- 월 사용량: 100 × 30 × 0.675GB = ~2TB
- Always Free 한도(10TB) 내 충분
```

---

## 3. 배포 방식 비교

### Option A: OCI CLI 직접 실행
```
난이도: ⭐⭐⭐ (중상)
설치 필요: OCI CLI + API 키 설정
장점: 단계별 확인, 스크립트 자동화 가능
단점: 초기 설정 복잡
```

### Option B: Terraform (로컬)
```
난이도: ⭐⭐⭐ (중상)
설치 필요: Terraform + OCI Provider
장점: 인프라를 코드로 관리, 버전 관리 가능
단점: 학습 곡선
```

### Option C: OCI Resource Manager (추천)
```
난이도: ⭐ (쉬움)
설치 필요: 없음 (웹 콘솔만)
장점: .zip 업로드 → Apply 클릭 → 끝
단점: 디버깅이 웹에서만 가능
```

### Option D: 웹콘솔 + cloud-init
```
난이도: ⭐ (쉬움)
설치 필요: 없음
장점: GUI로 직관적
단점: 수동 단계 있음
```

---

## 4. 도메인 옵션

통합 서버에는 2개의 서브도메인이 필요합니다.

### 4.1 자체 도메인 사용 (추천)

```
flowspace.app             → Vercel (Next.js)
socket.flowspace.app      → Oracle (Socket.io)
livekit.flowspace.app     → Oracle (LiveKit)
```

**DNS 설정**:
```
Type: A
Name: socket
Value: [Oracle Public IP]

Type: A
Name: livekit
Value: [Oracle Public IP]
```

### 4.2 무료 도메인 서비스

| 서비스 | Socket.io URL | LiveKit URL |
|--------|--------------|-------------|
| **nip.io** | `socket.1.2.3.4.nip.io` | `livekit.1.2.3.4.nip.io` |
| **DuckDNS** | `flowspace-socket.duckdns.org` | `flowspace-lk.duckdns.org` |
| **sslip.io** | `socket.1-2-3-4.sslip.io` | `livekit.1-2-3-4.sslip.io` |

### 4.3 Cloudflare Tunnel (도메인 없이)

```
장점: Public IP 노출 없이 HTTPS 터널
설정: cloudflared 설치 → 터널 생성 → 서비스 연결
```

---

## 5. 통합 배포 계획

### Phase 1: 사전 준비 (10분)

#### Step 1.1: 예산 알림 설정 (과금 방지)
```
OCI 콘솔 → ☰ → Billing & Cost Management → Budgets → Create Budget
- Budget Amount: $1
- Alert at: 80%, 100%
```

#### Step 1.2: SSH 키 생성 (Windows PowerShell)
```powershell
# 키 생성
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\flowspace-oci -N '""'

# 공개키 확인 (복사용)
Get-Content $env:USERPROFILE\.ssh\flowspace-oci.pub
```

#### Step 1.3: Compartment OCID 확인
```
OCI 콘솔 → Identity & Security → Compartments → root compartment
→ OCID 복사 (ocid1.tenancy.oc1..aaaa...)
```

### Phase 2: 인프라 생성 (15분)

#### Option C 사용 시 (Resource Manager)

1. **Terraform 파일 준비** (Section 6 참조)
2. **스택 생성**
   ```
   OCI 콘솔 → ☰ → Developer Services → Resource Manager → Stacks
   → Create Stack → Upload .zip → Configure Variables → Apply
   ```
3. **출력 확인**: Public IP, SSH 명령어

### Phase 3: 서버 설정 (20분)

#### Step 3.1: SSH 접속
```bash
ssh -i ~/.ssh/flowspace-oci ubuntu@[PUBLIC_IP]
```

#### Step 3.2: 프로젝트 디렉토리 생성
```bash
mkdir -p ~/flowspace && cd ~/flowspace
```

#### Step 3.3: Socket.io 서버 코드 배포

**server/package.json** (로컬에서 복사 또는 git clone):
```bash
# Option 1: Git으로 전체 프로젝트 클론
git clone https://github.com/your-repo/flow_metaverse.git
cd flow_metaverse/server

# Option 2: 필요한 파일만 SCP로 복사
scp -i ~/.ssh/flowspace-oci -r ./server ubuntu@[PUBLIC_IP]:~/flowspace/
```

#### Step 3.4: Docker Compose 설정 파일 생성

**~/flowspace/docker-compose.yml**:
```yaml
version: '3.8'

services:
  # ============================================
  # Socket.io 서버 (게임 동기화, 채팅)
  # ============================================
  socket-server:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: flowspace-socket
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ============================================
  # LiveKit 서버 (영상/음성 통화)
  # ============================================
  livekit:
    image: livekit/livekit-server:latest
    container_name: flowspace-livekit
    command: --config /etc/livekit.yaml
    restart: unless-stopped
    network_mode: host
    volumes:
      - ./livekit/livekit.yaml:/etc/livekit.yaml:ro

  # ============================================
  # Caddy (SSL 리버스 프록시)
  # ============================================
  caddy:
    image: caddy:latest
    container_name: flowspace-caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - socket-server
      - livekit

volumes:
  caddy_data:
  caddy_config:
```

#### Step 3.5: Socket.io Dockerfile

**~/flowspace/server/Dockerfile**:
```dockerfile
FROM node:20-alpine

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm ci --only=production

# 소스 복사
COPY . .

# Health check용 curl 설치
RUN apk add --no-cache curl

EXPOSE 3001

CMD ["node", "socket-server.js"]
```

#### Step 3.6: LiveKit 설정

**~/flowspace/livekit/livekit.yaml**:
```yaml
port: 7880
rtc:
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: true
  tcp_port: 7881
keys:
  # API Key: Secret 형식
  # 아래 명령으로 생성: docker run --rm livekit/livekit-server generate-keys
  APIFlowspace: <YOUR_GENERATED_SECRET>
turn:
  enabled: true
  udp_port: 3478
  tcp_port: 3478
logging:
  level: info
  json: false
```

#### Step 3.7: Caddy 설정 (SSL 자동)

**~/flowspace/caddy/Caddyfile**:
```
# Socket.io
socket.yourdomain.com {
    reverse_proxy localhost:3001
}

# LiveKit
livekit.yourdomain.com {
    reverse_proxy localhost:7880
}
```

#### Step 3.8: 서비스 시작
```bash
cd ~/flowspace
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

### Phase 4: FlowSpace 연동 (10분)

#### Step 4.1: LiveKit API 키 생성
```bash
docker run --rm livekit/livekit-server generate-keys
```

출력:
```
API Key: APIFlowspace
API Secret: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Step 4.2: 환경변수 업데이트

**.env.production** (로컬):
```env
# Socket.io - Oracle Cloud
NEXT_PUBLIC_SOCKET_URL="https://socket.yourdomain.com"

# LiveKit - Oracle Cloud Self-hosted
NEXT_PUBLIC_LIVEKIT_URL="wss://livekit.yourdomain.com"
LIVEKIT_API_KEY="APIFlowspace"
LIVEKIT_API_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

#### Step 4.3: Vercel 환경변수 업데이트
```
Vercel Dashboard → Project → Settings → Environment Variables
→ 위 3개 값 추가/수정
```

#### Step 4.4: 재배포
```bash
vercel --prod
```

### Phase 5: 검증 (5분)

#### Step 5.1: 서버 상태 확인
```bash
# Socket.io
curl https://socket.yourdomain.com/health

# LiveKit
curl https://livekit.yourdomain.com
```

#### Step 5.2: FlowSpace 테스트
1. 공간 입장
2. 캐릭터 이동 (Socket.io 확인)
3. 채팅 전송 (Socket.io 확인)
4. 영상/음성 활성화 (LiveKit 확인)
5. 다른 기기에서 동시 접속

---

## 6. Terraform 코드 (Resource Manager용)

### 6.1 파일 구조
```
flowspace-stack/
├── main.tf
├── variables.tf
├── outputs.tf
└── cloud-init.yaml
```

### 6.2 main.tf
```hcl
terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = ">= 5.0.0"
    }
  }
}

provider "oci" {
  region = var.region
}

# Availability Domain
data "oci_identity_availability_domains" "ads" {
  compartment_id = var.compartment_id
}

# Ubuntu ARM 이미지
data "oci_core_images" "ubuntu_arm" {
  compartment_id           = var.compartment_id
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "22.04"
  shape                    = "VM.Standard.A1.Flex"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

# VCN
resource "oci_core_vcn" "flowspace_vcn" {
  compartment_id = var.compartment_id
  cidr_blocks    = ["10.0.0.0/16"]
  display_name   = "flowspace-vcn"
  dns_label      = "flowspacevcn"
}

# Internet Gateway
resource "oci_core_internet_gateway" "flowspace_igw" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.flowspace_vcn.id
  display_name   = "flowspace-igw"
  enabled        = true
}

# Route Table
resource "oci_core_route_table" "flowspace_rt" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.flowspace_vcn.id
  display_name   = "flowspace-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    network_entity_id = oci_core_internet_gateway.flowspace_igw.id
  }
}

# Security List (통합 포트)
resource "oci_core_security_list" "flowspace_sl" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.flowspace_vcn.id
  display_name   = "flowspace-security-list"

  # Egress: All
  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }

  # SSH (22)
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options { min = 22; max = 22 }
  }

  # HTTP (80)
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options { min = 80; max = 80 }
  }

  # HTTPS (443)
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options { min = 443; max = 443 }
  }

  # Socket.io (3001)
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options { min = 3001; max = 3001 }
  }

  # LiveKit API (7880)
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options { min = 7880; max = 7880 }
  }

  # LiveKit RTC TCP (7881)
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options { min = 7881; max = 7881 }
  }

  # LiveKit RTC UDP (50000-60000)
  ingress_security_rules {
    protocol = "17"
    source   = "0.0.0.0/0"
    udp_options { min = 50000; max = 60000 }
  }

  # TURN (3478 UDP/TCP)
  ingress_security_rules {
    protocol = "17"
    source   = "0.0.0.0/0"
    udp_options { min = 3478; max = 3478 }
  }
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options { min = 3478; max = 3478 }
  }
}

# Subnet
resource "oci_core_subnet" "flowspace_subnet" {
  compartment_id    = var.compartment_id
  vcn_id            = oci_core_vcn.flowspace_vcn.id
  cidr_block        = "10.0.1.0/24"
  display_name      = "flowspace-subnet"
  dns_label         = "flowspacesub"
  route_table_id    = oci_core_route_table.flowspace_rt.id
  security_list_ids = [oci_core_security_list.flowspace_sl.id]
}

# Compute Instance (ARM - Always Free)
resource "oci_core_instance" "flowspace_server" {
  compartment_id      = var.compartment_id
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "flowspace-server"
  shape               = "VM.Standard.A1.Flex"

  shape_config {
    ocpus         = var.instance_ocpus
    memory_in_gbs = var.instance_memory_gb
  }

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.ubuntu_arm.images[0].id
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.flowspace_subnet.id
    assign_public_ip = true
    display_name     = "flowspace-vnic"
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data           = base64encode(file("${path.module}/cloud-init.yaml"))
  }

  freeform_tags = {
    "always-free" = "true"
    "project"     = "flowspace"
  }
}
```

### 6.3 variables.tf
```hcl
variable "compartment_id" {
  description = "OCI Compartment OCID"
  type        = string
}

variable "region" {
  description = "OCI Region"
  type        = string
  default     = "ap-chuncheon-1"
}

variable "ssh_public_key" {
  description = "SSH Public Key"
  type        = string
}

variable "instance_ocpus" {
  description = "OCPUs (Always Free max: 4)"
  type        = number
  default     = 4
}

variable "instance_memory_gb" {
  description = "Memory GB (Always Free max: 24)"
  type        = number
  default     = 24
}
```

### 6.4 outputs.tf
```hcl
output "public_ip" {
  description = "Server Public IP"
  value       = oci_core_instance.flowspace_server.public_ip
}

output "ssh_command" {
  description = "SSH Command"
  value       = "ssh -i ~/.ssh/flowspace-oci ubuntu@${oci_core_instance.flowspace_server.public_ip}"
}

output "next_steps" {
  description = "Next Steps"
  value       = <<-EOT
    1. SSH 접속: ssh -i ~/.ssh/flowspace-oci ubuntu@${oci_core_instance.flowspace_server.public_ip}
    2. 프로젝트 설정: OCI.md의 Phase 3 참조
    3. 서비스 시작: docker-compose up -d
  EOT
}
```

### 6.5 cloud-init.yaml
```yaml
#cloud-config
package_update: true
package_upgrade: true

packages:
  - docker.io
  - docker-compose
  - git
  - curl
  - vim
  - htop

runcmd:
  # Docker 설정
  - systemctl start docker
  - systemctl enable docker
  - usermod -aG docker ubuntu

  # 프로젝트 디렉토리
  - mkdir -p /home/ubuntu/flowspace/{server,livekit,caddy}
  - chown -R ubuntu:ubuntu /home/ubuntu/flowspace

  # iptables 설정
  - iptables -I INPUT -p tcp --dport 22 -j ACCEPT
  - iptables -I INPUT -p tcp --dport 80 -j ACCEPT
  - iptables -I INPUT -p tcp --dport 443 -j ACCEPT
  - iptables -I INPUT -p tcp --dport 3001 -j ACCEPT
  - iptables -I INPUT -p tcp --dport 7880 -j ACCEPT
  - iptables -I INPUT -p tcp --dport 7881 -j ACCEPT
  - iptables -I INPUT -p udp --dport 50000:60000 -j ACCEPT
  - iptables -I INPUT -p udp --dport 3478 -j ACCEPT
  - iptables -I INPUT -p tcp --dport 3478 -j ACCEPT

  # 완료 표시
  - echo "FlowSpace server ready!" > /home/ubuntu/setup-complete.txt

final_message: "Cloud-init completed in $UPTIME seconds"
```

---

## 7. 체크리스트

### 배포 전
- [ ] 예산 알림 설정 ($1)
- [ ] SSH 키 생성
- [ ] Compartment OCID 확인
- [ ] 도메인 결정

### 배포
- [ ] Terraform Apply 완료
- [ ] Public IP 확인
- [ ] SSH 접속 확인
- [ ] Docker 동작 확인

### 서비스 설정
- [ ] docker-compose.yml 생성
- [ ] Socket.io Dockerfile 생성
- [ ] livekit.yaml 생성
- [ ] Caddyfile 생성
- [ ] docker-compose up -d

### DNS & SSL
- [ ] DNS A 레코드 설정 (socket, livekit)
- [ ] SSL 자동 발급 확인 (Caddy)

### FlowSpace 연동
- [ ] .env.production 업데이트
- [ ] Vercel 환경변수 업데이트
- [ ] Vercel 재배포
- [ ] 통합 테스트

---

## 8. 문제 해결

### Out of capacity 오류
```
해결: AD(Availability Domain) 변경 또는 잠시 후 재시도
Terraform: availability_domain 인덱스 변경 [0] → [1]
```

### SSH 접속 불가
```bash
# Security List 확인
OCI 콘솔 → Networking → VCN → Security Lists → Port 22

# 인스턴스 상태 확인
OCI 콘솔 → Compute → Instances → RUNNING 확인
```

### Docker 권한 오류
```bash
# ubuntu 유저를 docker 그룹에 추가
sudo usermod -aG docker ubuntu
# 재로그인 필요
exit && ssh -i ~/.ssh/flowspace-oci ubuntu@[IP]
```

### SSL 인증서 실패
```bash
# DNS 전파 확인
dig socket.yourdomain.com
dig livekit.yourdomain.com

# Caddy 로그
docker-compose logs caddy
```

### LiveKit 연결 실패
```bash
# 포트 확인
sudo netstat -tlnp | grep -E "7880|7881"

# 로그 확인
docker-compose logs livekit
```

---

## 9. 상업화 비용 비교

### 9.1 LiveKit Cloud vs Self-hosted

| 항목 | LiveKit Cloud | Self-hosted (Oracle) |
|------|--------------|---------------------|
| **무료 한도** | 5,000분/월 | 무제한 |
| **소규모** (MAU 100) | ~$50-100/월 | $0 |
| **중규모** (MAU 1,000) | ~$200-500/월 | $0 |
| **대규모** (MAU 10,000+) | $1,000+/월 | 서버 추가 |
| **관리 부담** | 없음 | 직접 운영 |
| **SLA** | 99.9% | 없음 |
| **데이터 위치** | 해외 | 한국 (춘천) |

### 9.2 Railway vs Oracle (Socket.io)

| 항목 | Railway | Oracle |
|------|---------|--------|
| **무료 한도** | $5/월 크레딧 | 무제한 |
| **예상 비용** | $5-20/월 | $0 |
| **스케일링** | 자동 | 수동 |
| **배포** | Git push | 수동/스크립트 |

### 9.3 총 비용 절감 효과

| 시나리오 | 기존 (월) | Oracle (월) | 연간 절감 |
|----------|----------|------------|----------|
| **MVP** | $5-55 | $0 | $60-660 |
| **소규모** | $55-120 | $0 | $660-1,440 |
| **중규모** | $205-520 | $0 | $2,460-6,240 |

### 9.4 라이선스

| 항목 | 라이선스 | 상업적 사용 |
|------|---------|------------|
| LiveKit Server | Apache 2.0 | **허용** |
| Oracle Always Free | Oracle 약관 | **허용** |
| Socket.io | MIT | **허용** |

---

## 10. 다음 단계

### 필요한 결정 사항

#### 1. 배포 방식
```
[ ] Option C: Resource Manager (추천)
[ ] Option D: 웹콘솔 + cloud-init
```

#### 2. 도메인
```
[ ] 자체 도메인 보유 → 서브도메인 사용
[ ] 무료 도메인 서비스 (nip.io / DuckDNS)
```

### 결정 후 진행

위 2가지가 결정되면:
1. Terraform 파일 .zip 생성 또는 웹콘솔 가이드 제공
2. 단계별 배포 진행
3. FlowSpace 연동 완료

---

## 11. 참고 자료

- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
- [LiveKit Self-hosting](https://docs.livekit.io/realtime/self-hosting/)
- [LiveKit Ports](https://docs.livekit.io/realtime/self-hosting/ports-firewall/)
- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Caddy Server](https://caddyserver.com/docs/)
- [OCI Resource Manager](https://docs.oracle.com/en-us/iaas/Content/ResourceManager/home.htm)
