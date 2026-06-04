---
name: harness
description: "하네스 엔지니어링 파이프라인입니다. PM, Designer, Architect, Tester, Reviewer, QA, DevOps 에이전트를 오케스트레이션하여 체계적인 개발 프로세스를 제공합니다. /harness [phase] [ticket-id] 형식으로 특정 단계부터 시작할 수 있습니다."
---

# Harness Engineering Pipeline

역할 기반 에이전트를 오케스트레이션하여 체계적인 개발 프로세스를 제공합니다.

## 사용법

```
/harness                    # 전체 파이프라인 (Planning부터 시작)
/harness plan [ticket-id]   # Planning Phase만 실행
/harness dev                # Development Phase만 실행
/harness review             # Review Phase만 실행
/harness deploy             # Deploy Phase만 실행 (push 완료 후에만)
/harness status             # 현재 진행 상태 확인
```

## 티켓 ID 확인

**티켓 ID는 다음 순서로 결정됩니다:**

1. 인자로 명시적으로 전달된 경우 → 해당 티켓 사용
2. 인자가 없으면 → 현재 브랜치에서 추출

```bash
# 브랜치에서 티켓 ID 추출
git branch --show-current
# feature/HSD-123-description → HSD-123
# feature/MZP2-4948-description → MZP2-4948
# 정규식: [A-Z]+-\d+
```

**티켓 ID를 찾을 수 없는 경우**: 사용자에게 티켓 ID 입력 요청

## 파이프라인 구조

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HARNESS ENGINEERING PIPELINE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────── PLANNING PHASE ───────────────────────┐          │
│  │                                                               │          │
│  │   [PM] ──→ [Designer] ──→ [Architect]                        │          │
│  │    │          │              │                                │          │
│  │    ↓          ↓              ↓                                │          │
│  │  요구사항    UI 가이드      기술 설계                           │          │
│  │  AC 정의    스타일 가이드   파일 구조                           │          │
│  │                                                               │          │
│  │                    ↓ Gate 1: 계획 승인 ✓                       │          │
│  └───────────────────────────────────────────────────────────────┘          │
│                                    ↓                                        │
│  ┌─────────────────────── DEVELOPMENT PHASE ────────────────────┐          │
│  │                                                               │          │
│  │   [Developer] ──→ [Tester]                                   │          │
│  │   (사용자)         │                                          │          │
│  │      │             ↓                                          │          │
│  │      ↓          테스트 코드                                    │          │
│  │   코드 구현      커버리지 확보                                   │          │
│  │                                                               │          │
│  │                    ↓ Gate 2: 구현 완료 ✓                       │          │
│  └───────────────────────────────────────────────────────────────┘          │
│                                    ↓                                        │
│  ┌─────────────────────── REVIEW PHASE ─────────────────────────┐          │
│  │                                                               │          │
│  │   [Reviewer] ←──→ [QA]                                       │          │
│  │       │            │                                          │          │
│  │       ↓            ↓                                          │          │
│  │   코드 품질      기능 검증                                      │          │
│  │   베스트 프랙틱스  AC 충족 확인                                  │          │
│  │                                                               │          │
│  │         ↓ 실패 시 ←── 피드백 루프 (최대 3회)                    │          │
│  │                    ↓ Gate 3: QA 승인 ✓                        │          │
│  └───────────────────────────────────────────────────────────────┘          │
│                                    ↓                                        │
│  ┌─────────────────────── DEPLOY PHASE ─────────────────────────┐          │
│  │                                                               │          │
│  │   [DevOps]                                                   │          │
│  │      │                                                        │          │
│  │      ├──→ Jira 업데이트                                       │          │
│  │      └──→ PR 생성                                            │          │
│  │                                                               │          │
│  │                    ↓ Gate 4: 배포 준비 완료 ✓                  │          │
│  └───────────────────────────────────────────────────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Phase 상세

### Phase 1: Planning

**목적**: 개발 시작 전 요구사항과 설계를 명확히 정의

**설정 로드** (필수):
```bash
# 프로젝트 레벨 우선, 없으면 전역
cat .claude/developer-config.json 2>/dev/null || cat ~/.claude/developer-config.json
```

**실행 순서**:

```
1. /create-jira-description 실행 (Jira description 정리 - 통일성 유지)
       ↓
2. PM Agent 실행 (요구사항 분석, AC 정의)
       ↓
3. Designer Agent 실행 (Figma/디자인 분석 - 조건부)
       ↓
4. Architect Agent 실행 (기술 설계)
       ↓
5. x-api-sync 실행 (API 작업 시 - 조건부)
       ↓
   Gate 1: 계획 승인
```

**1. Jira Description 정리**:
- `/create-jira-description` 스킬 호출
- 기존 스킬의 규칙과 템플릿을 그대로 따름 (통일성)
- Jira description이 이미 정리되어 있으면 스킵

**2. PM Agent** (opus):
- Jira 티켓 분석 (description, comments, links)
- 요구사항 구조화
- Acceptance Criteria 정의
- 작업 분해 (WBS)

**3. Designer Agent** (sonnet) - 조건부:
- Figma 링크가 있을 때 실행
- Figma Make 코드가 있으면 검토
- 기존 디자인 방향성 분석
- 없으면 기존 디자인과 일관성 가이드 제공

**4. Architect Agent** (opus):
- 기술 요구사항 분석
- 파일 구조 설계 (프로젝트 CLAUDE.md 참조)
- 컴포넌트 설계
- 데이터 플로우 설계

**5. x-api-sync** (조건부):
- API 작업이 필요한 경우 실행
- 프로젝트별 스킬 사용:
  - halo: `/halo-api-sync`
  - smp-*: `/splitter-api-sync`
- API 키워드: "API 연동", "API 추가", "엔드포인트", "Repository", "QueryHook"

**Gate 1 검증**:
- [ ] Jira description이 정리됨
- [ ] 요구사항이 명확히 정의됨
- [ ] AC가 검증 가능한 형태로 작성됨
- [ ] 기술 설계가 완료됨
- [ ] (API 작업 시) x-api-sync 완료
- [ ] 사용자가 계획을 승인함

**실행 방법**:
```
1. /create-jira-description 호출 (통일성 유지)
2. PM, Designer, Architect 에이전트를 순차 실행
3. API 작업 필요 시 x-api-sync 실행
4. 각 에이전트 결과를 종합하여 "Planning 보고서" 생성
5. 사용자에게 보고서 제시 및 승인 요청
6. 승인 시 → Development Phase로 이동
7. 수정 요청 시 → 해당 부분 재작업
```

---

### Phase 2: Development

**목적**: 코드 구현 및 테스트 코드 작성

**실행 에이전트**:
1. **Developer** (사용자)
   - Planning 보고서 기반 코드 작성
   - 사용자가 직접 수행하거나 Claude에게 요청

2. **Tester Agent** (sonnet)
   - 구현된 코드 분석
   - 테스트 코드 작성
   - 커버리지 확보

**Gate 2 검증**:
- [ ] 기능 구현 완료
- [ ] 테스트 코드 작성됨
- [ ] 테스트 통과
- [ ] 린트 에러 없음

**실행 방법**:
```
1. 사용자가 코드 구현 (또는 Claude에게 요청)
2. 구현 완료 후 Tester 에이전트 실행
3. 테스트 실행 및 결과 확인
4. 모든 검증 통과 시 → Review Phase로 이동
```

---

### Phase 3: Review

**목적**: 코드 품질 검증 및 기능 검증

**실행 에이전트**:
1. **Reviewer Agent** (sonnet)
   - 코드 품질 검증
   - 프론트엔드 베스트 프랙틱스 체크
   - High/Medium/Low 이슈 분류

2. **QA Agent** (sonnet)
   - 기능 검증
   - AC 충족 확인
   - 엣지 케이스 테스트
   - 회귀 테스트

**피드백 루프**:
- 이슈 발견 시 → Optimizer로 자동 수정 또는 사용자에게 수정 요청
- 최대 3회 반복 후에도 미해결 시 → 사용자 판단 요청

**Gate 3 검증**:
- [ ] Critical 이슈 없음
- [ ] High 이슈 모두 해결
- [ ] AC 모두 충족
- [ ] QA 승인

**실행 방법**:
```
1. Reviewer, QA 에이전트 병렬 실행
2. 결과 종합하여 "Review 보고서" 생성
3. 이슈 있으면 → Optimizer 실행 또는 사용자 수정
4. 재검증 (최대 3회 반복)
5. 모든 검증 통과 시 → Deploy Phase로 이동
```

---

### Phase 4: Deploy

**목적**: Jira 업데이트 및 PR 생성

**중요: Deploy Phase는 push 완료 후에만 실행됩니다.**

```
Review Phase 완료
       ↓
사용자에게 커밋/푸시 안내
       ↓
/commit-plugin:commit  ← 사용자가 실행
       ↓
/push-plugin:push      ← 사용자가 실행
       ↓
push 완료 확인
       ↓
Deploy Phase 실행 가능
```

**커밋/푸시 규칙**:
- Claude는 **절대** 직접 git commit/push를 실행하지 않음
- 반드시 `/commit-plugin:commit`과 `/push-plugin:push` 플러그인 사용
- 사용자가 명시적으로 실행해야 함

**실행 에이전트**:
1. **DevOps Agent** (sonnet)
   - push 완료 상태 확인
   - 변경 사항 분석
   - `/jira-update` 스킬 호출 → Jira comment 추가
   - `/create-pr` 스킬 호출 → PR 생성/업데이트

**Gate 4 검증**:
- [ ] push가 완료되었는지 확인 (`git log origin/{branch}..HEAD`가 비어있어야 함)
- [ ] Jira 업데이트 완료
- [ ] PR 생성 완료

**실행 방법**:
```
1. push 완료 여부 확인
   - 미완료 시: "먼저 /push-plugin:push를 실행하세요" 안내 후 중단

2. 사용자에게 실행 여부 질문 (AskUserQuestion 사용):
   "다음 중 실행할 작업을 선택하세요:
    1. /jira-update만 실행
    2. /create-pr만 실행
    3. 둘 다 실행
    4. 건너뛰기"

3. 사용자가 선택한 항목만 실행
   - /jira-update 선택 시 → 해당 스킬 호출
   - /create-pr 선택 시 → 해당 스킬 호출
   - 건너뛰기 선택 시 → 아무 동작 없이 종료

4. 결과 보고
```

**주의**: jira-update와 create-pr은 **자동 실행하지 않고** 반드시 사용자 확인 후 실행

---

## 실행 Workflow

### 전체 파이프라인 실행 (`/harness`)

```markdown
## Harness Pipeline 시작

### Step 1: 초기화
- Jira 티켓 ID 확인 (인자 또는 브랜치에서 추출)
- 설정 파일 로드 (developer-config.json)
- 프로젝트 컨텍스트 파악

### Step 2: Planning Phase 실행
[PM Agent 실행]
[Designer Agent 실행] (Figma 링크 있을 때)
[Architect Agent 실행]

→ Planning 보고서 생성
→ 사용자 승인 요청

### Step 3: Development Phase
→ 사용자에게 구현 안내
→ 구현 완료 후 Tester Agent 실행

### Step 4: Review Phase
[Reviewer Agent 실행]
[QA Agent 실행]

→ Review 보고서 생성
→ 이슈 있으면 수정 루프

### Step 5: Deploy Phase
[DevOps Agent 실행]

→ Jira 업데이트
→ PR 생성

### Step 6: 완료
→ 전체 파이프라인 요약 보고
```

### 특정 Phase만 실행

각 Phase는 독립적으로 실행 가능합니다:

- `/harness plan HSD-123`: Planning만 실행
- `/harness dev`: Development만 실행 (Tester 포함)
- `/harness review`: Review만 실행 (Reviewer + QA)
- `/harness deploy`: Deploy만 실행 (DevOps)

---

## 상태 관리

파이프라인 상태를 추적합니다:

```markdown
## Pipeline Status

| Phase | Status | Agent | 결과 |
|-------|--------|-------|------|
| Planning | ✅ Completed | PM, Designer, Architect | 계획 승인됨 |
| Development | 🔄 In Progress | Developer, Tester | 구현 중 |
| Review | ⏸️ Pending | Reviewer, QA | - |
| Deploy | ⏸️ Pending | DevOps | - |

### 현재 단계: Development
### 다음 액션: 코드 구현 완료 후 `/harness dev` 실행
```

---

## 에이전트 호출 규칙

### 병렬 실행 가능
- Reviewer + QA (Review Phase)
- PM 결과 기반 Designer + Architect 동시 시작 가능

### 순차 실행 필요
- PM → (Designer) → Architect (의존성)
- Developer → Tester (의존성)
- Review 완료 → Deploy (Gate 통과 필요)

### 피드백 루프
- Review Phase에서 이슈 발견 시:
  1. Optimizer로 자동 수정 시도
  2. 실패 시 사용자에게 수정 요청
  3. 수정 후 Reviewer/QA 재실행
  4. 최대 3회 반복

---

## 프로젝트별 커스터마이징

이 파이프라인은 전역 스킬이지만, 프로젝트별로 다음을 override할 수 있습니다:

| 항목 | 전역 | 프로젝트별 Override |
|------|------|-------------------|
| 에이전트 | ~/.claude/agents/*.md | .claude/agents/*.md |
| API Sync | - | .claude/commands/*-api-sync.md |
| 아키텍처 가이드 | - | .claude/commands/architecture.md |
| PR 포맷 | ~/.claude/commands/create-pr.md | .claude/commands/create-pr.md |
| Jira 포맷 | ~/.claude/commands/jira-update.md | .claude/commands/jira-update.md |

---

## 출력 형식

### 파이프라인 시작 시
```
🚀 Harness Pipeline 시작

📋 티켓: {ticket-id}
📁 프로젝트: {project-name}
🔧 설정: ✅ Jira | ✅ Bitbucket | ✅ Figma

현재 Phase: Planning
```

### Phase 완료 시
```
✅ Planning Phase 완료

결과 요약:
- 요구사항: {N}개 정의됨
- AC: {N}개 정의됨
- 컴포넌트: {N}개 설계됨
- 예상 작업량: {X}시간

다음 Phase: Development
계속 진행하시겠습니까? (Y/n)
```

### 파이프라인 완료 시
```
🎉 Harness Pipeline 완료

## 요약
| Phase | 소요 시간 | 결과 |
|-------|----------|------|
| Planning | {time} | ✅ |
| Development | {time} | ✅ |
| Review | {time} | ✅ (2회 반복) |
| Deploy | {time} | ✅ |

## 산출물
- Jira: {ticket-url}
- PR: {pr-url}
- 변경 파일: {N}개
- 테스트 커버리지: {X}%

## 다음 단계
1. PR 리뷰 요청
2. CI 파이프라인 확인
3. 머지 후 배포
```

---

## 주의사항

1. **사용자 확인**: 각 Gate에서 사용자 승인을 받고 진행
2. **설정 필수**: Jira/Bitbucket 설정이 없으면 해당 기능 스킵
3. **프로젝트 컨텍스트**: CLAUDE.md, architecture.md 참조
4. **피드백 루프 제한**: Review 반복은 최대 3회
5. **중단 가능**: 어느 시점에서든 파이프라인 중단 가능
