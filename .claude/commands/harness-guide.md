---
name: harness-guide
description: "하네스 엔지니어링 가이드입니다. 기존 스킬과의 통합 방안, 워크플로우 매핑, 사용 시나리오를 설명합니다."
---

# Harness Engineering Guide

하네스 엔지니어링 파이프라인과 기존 스킬의 통합 가이드입니다.

## 기존 워크플로우 vs 하네스 파이프라인

### 기존 워크플로우 (수동)

```
/create-jira-description → /start-task → [코드 작업] → /review-and-optimize → /jira-update → /create-pr
```

### 하네스 파이프라인 (통합 오케스트레이션)

```
/harness
  ├── Planning Phase
  │   ├── PM Agent (요구사항 분석) ←── /create-jira-description 기능 포함
  │   ├── Designer Agent (Figma 분석)
  │   └── Architect Agent (기술 설계)
  │
  ├── Development Phase
  │   ├── Developer (코드 작업) ←── /start-task 기능 포함
  │   └── Tester Agent (테스트 코드) ←── 신규
  │
  ├── Review Phase
  │   ├── Reviewer Agent ←── /review-and-optimize 기능 포함
  │   └── QA Agent (기능 검증) ←── 신규
  │
  └── Deploy Phase
      └── DevOps Agent ←── /jira-update + /create-pr 기능 포함
```

## 스킬 매핑

| 기존 스킬 | 하네스 Phase | 에이전트 | 통합 방식 |
|----------|-------------|---------|----------|
| `/create-jira-description` | Planning | PM Agent | PM이 더 상세한 분석 후 description 생성 |
| `/start-task` | Planning | PM + Designer + Architect | 3개 에이전트가 협업하여 작업 준비 |
| `/review-and-optimize` | Review | Reviewer + Optimizer | 기존과 동일 + QA 추가 |
| `/jira-update` | Deploy | DevOps Agent | 기존 스킬 호출 |
| `/create-pr` | Deploy | DevOps Agent | 기존 스킬 호출 |

## 사용 시나리오

### 시나리오 1: 전체 파이프라인 (권장)

새 기능 개발 시 처음부터 끝까지 체계적으로 진행:

```bash
# 1. 전체 파이프라인 시작
/harness HSD-123

# 2. Planning Phase 완료 후 개발 시작
# 3. 개발 완료 후 Review Phase 자동 진행
# 4. QA 통과 후 Deploy Phase 자동 진행
```

### 시나리오 2: 특정 Phase만 실행

이미 일부 작업이 완료된 경우:

```bash
# Planning만 필요한 경우
/harness plan HSD-123

# 개발 완료 후 Review만 필요한 경우
/harness review

# PR만 올리고 싶은 경우
/harness deploy
```

### 시나리�� 3: 기존 스킬 직접 사용

간단한 작업이나 특정 기능만 필요한 경우:

```bash
# 간단한 버그 수정 - 리뷰만 필요
/review-and-optimize

# PR만 빠르게 올리기
/create-pr

# Jira만 업데이트
/jira-update
```

### 시나리오 4: 하이브리드 사용

하네스 일부 + 기존 스킬 조합:

```bash
# 1. Planning만 하네스로
/harness plan HSD-123

# 2. 개발은 직접 진행

# 3. 리뷰는 기존 스킬로 (더 가벼움)
/review-and-optimize

# 4. 배포는 하네스로 (Jira + PR 한번에)
/harness deploy
```

## 언제 무엇을 사용할까?

### `/harness` 사용 권장

- 새로운 기능 개발 (복잡도 Medium 이상)
- 요구사항이 명확하지 않은 작업
- Figma 디자인이 있는 UI 작업
- 테스트 코드가 필요한 작업
- 팀원에게 작업 내용을 공유해야 하는 경우

### 기존 스킬 사용 권장

- 간단한 버그 수정
- 소규모 리팩토링
- 긴급한 핫픽스
- 이미 요구사항이 명확한 작업
- 빠른 반복 작업

## 에이전트 개별 호출

하네스 파이프라인 없이 에이전트만 개별 호출할 수도 있습니다:

```bash
# PM 에이전트로 요구사항 분석만
"PM 에이전트로 이 티켓 분석해줘"

# Designer 에이전트로 Figma 분석만
"Designer 에이전트로 이 Figma 분석해줘"

# Architect 에이전트로 설계만
"Architect 에이전트로 이 기능 설계해줘"

# Tester 에이전트로 테스트만
"Tester 에이전트로 이 컴포넌트 테스트 코드 작성해줘"

# QA 에이전트로 검증만
"QA 에이전트로 이 기능 검증해줘"
```

## 프로젝트별 설정

### 전역 설정 (모든 프로젝트)

```
~/.claude/
├── agents/           # 역할 기반 에이전트 (8개)
│   ├── pm.md
│   ├── designer.md
│   ├── architect.md
│   ├── tester.md
│   ├── reviewer.md
│   ├── qa.md
│   ├── devops.md
│   └── optimizer.md
│
├── commands/         # 공통 스킬
│   ├── harness.md
│   ├── harness-guide.md
│   ├── create-jira-description.md
│   ├── review-and-optimize.md
│   ├── create-pr.md
│   └── jira-update.md
│
└── developer-config.json  # 개인 설정 (전역 fallback)
```

### 프로젝트별 설정 (Override)

```
{project}/.claude/
├── agents/           # 프로젝트 특화 에이전트 (선택)
│   └── architect.md  # 프로젝트 아키텍처에 맞게 커스텀
│
├── commands/         # 프로젝트 특화 스킬
│   ├── start-task.md     # 프로젝트별 워크플로우
│   ├── create-pr.md      # 프로젝트별 PR 포맷
│   ├── jira-update.md    # 프로젝트별 Jira 포맷
│   ├── architecture.md   # 프로젝트 아키텍처 가이드
│   └── *-api-sync.md     # 프로젝트별 API sync
│
└── developer-config.json  # 프로젝트별 개인 설정
```

### 우선순위

1. 프로젝트 `.claude/` (최우선)
2. 전역 `~/.claude/` (fallback)

## 모범 사례

### 1. 작업 시작 시

```bash
# 복잡한 기능
/harness HSD-123

# 간단한 작업
/start-task HSD-123
```

### 2. 개발 완료 후

```bash
# 테스트 코드 필요 시
/harness dev  # Tester Agent 포함

# 테스트 불필요 시
/harness review  # 바로 리뷰로
```

### 3. 리뷰 통과 후

```bash
# 한번에 처리
/harness deploy

# 또는 개별 실행
/jira-update
/create-pr
```

### 4. 급한 핫픽스

```bash
# 하네스 없이 빠르게
[코드 수정]
/review-and-optimize
/create-pr
```

## 트러블슈팅

### Q: 하네스가 너무 오래 걸려요
A: 특정 Phase만 실행하세요. `/harness review`처럼 필요한 부분만.

### Q: Planning이 필요 없어요
A: `/harness dev`로 Development부터 시작하세요.

### Q: 에이전트 결과가 마음에 안 들어요
A: 각 Gate에서 수정 요청할 수 있습니다. 승인 전에 피드백을 주세요.

### Q: 기존 스킬과 혼용해도 되나요?
A: 네, 자유롭게 조합 가능합니다. 하네스는 편의를 위한 오케스트레이션일 뿐입니다.

### Q: 프로젝트별로 다르게 설정하고 싶어요
A: 프로젝트 `.claude/` 디렉토리에 같은 이름의 파일을 만들면 override됩니다.

---

## 요약

| 상황 | 추천 명령어 |
|------|-----------|
| 새 기능 개발 (복잡) | `/harness` |
| 새 기능 개발 (단순) | `/start-task` → `/review-and-optimize` → `/create-pr` |
| 요구사항 분석만 | `/harness plan` 또는 PM 에이전트 직접 호출 |
| 디자인 분석만 | Designer 에이전트 직접 호출 |
| 테스트 코드 작성 | `/harness dev` 또는 Tester 에이전트 직접 호출 |
| 코드 리뷰만 | `/review-and-optimize` |
| PR + Jira 한번에 | `/harness deploy` |
| 긴급 핫픽스 | 기존 스킬 직접 사용 |
