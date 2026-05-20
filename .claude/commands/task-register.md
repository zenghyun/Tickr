---
name: task-register
description: "Tickr 작업을 GitHub Issues로 일괄 등록. \"오늘 작업 등록해줘\", \"퇴근 전 task 등록해줘\", \"이번 W2 잔여 등록\" 등의 자연어 트리거에 반응. PLAN.md + 메모리 + 직전 대화에서 합의된 작업을 수집·분해·확인 후 `gh issue create`로 등록."
---

# Tickr Task Register

GitHub Issues에 Tickr 작업을 일괄 등록한다. **사용자 확인 후에만 등록**(자동 실행 금지).

## 트리거 예시

- "오늘 작업 등록해줘"
- "퇴근 전 task 등록해줘"
- "이번 W2 잔여 이슈로 등록"
- "지금까지 합의된 거 GitHub 이슈로 만들어줘"
- `/task-register [scope]`

## 사전 조건

1. `gh` CLI 설치 + 인증: `gh auth status`
2. 원격 = `https://github.com/zenghyun/Tickr.git`
3. 라벨이 동기화되어 있음 (`.github/labels.yml`)
4. 마일스톤이 생성되어 있음 (`.github/milestones.yml`)

→ 부족하면 첫 등록 전 셋업 단계를 안내한다 (아래 "Setup 부트스트랩" 참조).

## 워크플로우

### Step 1: 컨텍스트 수집

다음에서 작업 후보를 수집한다 (우선순위 순):

1. **직전 대화에서 합의된 잔여 작업** (`다음 세션 후보`, `⏳` 표시 등)
2. `docs/PLAN.md`의 현재 주차 표 (W1~W8) — 진행 상태와 비교
3. `~/.claude/projects/-Users-mz01-zenghyun-Documents-Tickr/memory/project_tickr.md` 로드맵의 `⏳` 항목
4. 사용자가 트리거 메시지에서 명시한 추가 작업

```bash
git branch --show-current
git log --oneline -20
cat docs/PLAN.md | sed -n '/I\. 단계별 로드맵/,/^## J\./p'
gh issue list --state open --limit 50 --json number,title,labels,milestone
```

기존 OPEN 이슈와 **중복 등록 금지**. title이 유사하면 사용자에게 알리고 스킵.

### Step 2: 작업 분해 원칙

- 1 이슈 = **0.5~1일 작업량** (너무 작으면 묶음, 너무 크면 쪼개기)
- title 한국어, 짧고 동사형: `[작업] W2: PM/DevOps 에이전트 GitHub 기반 override`
- body는 `.github/ISSUE_TEMPLATE/task.yml` 양식 따름 (배경/산출물/참고/리스크/사전체크)
- labels:
  - 타입: `task` (기본) / `bug` / `feature` / `chore` / `docs` / `refactor`
  - 스코프: `scope/mobile` / `scope/api` / `scope/shared` / `scope/supabase` / `scope/infra` / `scope/design` / `scope/devx`
  - 주차: `w1` ~ `w8`
  - 우선순위: `priority/must` / `priority/should` / `priority/could`
  - (필요 시) `status/blocked`, `legal`, `needs-discussion`
- milestone: `W{n} ...`
- assignee: `@zenghyun` (기본 본인)

### Step 3: 사용자 확인 (필수)

등록 전 다음 요약을 사용자에게 보여주고 **승인 받는다**:

```
## 등록할 작업 N개

1. [작업] W2: PM 에이전트 GitHub Issue 기반 override
   labels: task, scope/devx, w2, priority/must
   milestone: W2 Claude Code 워크플로
   요약: …

2. [작업] W2: DevOps 에이전트 GitHub PR 기반 override
   …

진행하시겠습니까? (Y / 일부만 / 수정 / 취소)
```

- "일부만" 선택 시 번호로 선택
- "수정" 선택 시 해당 항목 title/body/labels 수정 후 다시 확인
- 사용자 응답 전까지 `gh issue create` 절대 호출 금지

### Step 4: 일괄 등록

각 작업당 별도 `gh issue create` 호출:

```bash
gh issue create \
  --repo zenghyun/Tickr \
  --title "[작업] W2: PM 에이전트 GitHub Issue 기반 override" \
  --label "task,scope/devx,w2,priority/must" \
  --milestone "W2 Claude Code 워크플로" \
  --assignee "@me" \
  --body "$(cat <<'EOF'
## 주차 / 스코프
W2 / Claude Code 워크플로 / scope/devx

## 배경
글로벌 `~/.claude/agents/pm.md`가 Jira API에 강하게 의존(atlassian 설정 요구). Tickr는 GitHub Issues 기반이라 호환 안 됨. PM이 GitHub Issue를 입력원으로 분석하도록 프로젝트 레벨 override 필요.

## 산출물 / 완료 조건
- [ ] `.claude/agents/pm.md` 작성 — `gh issue view` 기반 분석 워크플로
- [ ] Jira description/comment 의존 제거
- [ ] Acceptance Criteria 작성 양식 (`task.yml` 산출물 체크리스트와 호환)
- [ ] harness Planning Phase에서 호출 시 동작 확인

## 참고
- PLAN.md 절: I (W2)
- rules: .claude/rules/* (전부 참조)
- 외부: `gh issue view --json`

## 리스크
- 글로벌 PM과 분기 — 향후 글로벌 업데이트와 충돌 가능. 차이를 주석으로 명시할 것.

## 시작 전 체크
- [x] 관련 `.claude/rules/*.md` 확인
- [x] PLAN.md 해당 절 확인
EOF
)"
```

### Step 5: 결과 보고

```
✅ 등록 완료 (3개)

1. #12  [작업] W2: PM 에이전트 GitHub Issue 기반 override
   https://github.com/zenghyun/Tickr/issues/12
2. #13  [작업] W2: DevOps 에이전트 GitHub PR 기반 override
   https://github.com/zenghyun/Tickr/issues/13
3. #14  [작업] W2: NativeWind 토큰 → tailwind.config.js 반영
   https://github.com/zenghyun/Tickr/issues/14

⚠️ 스킵 (중복): 0건
❌ 실패: 0건

다음 단계 권장:
- 시작할 이슈를 골라 `git checkout -b feat/w2-{slug}` + 작업 진행
- 또는 `/harness plan #12`로 PM 분석부터 시작
```

## Setup 부트스트랩 (최초 1회)

`gh` 미설치 또는 라벨/마일스톤 미동기화 상태면 다음을 안내:

```
⚠️ Setup 필요

1. gh CLI 설치 + 인증
   ! brew install gh && gh auth login

2. 라벨 동기화 (.github/labels.yml → GitHub)
   # 한 번에 동기화하려면 yq + bash 루프
   yq -c '.[]' .github/labels.yml | while read -r row; do
     name=$(echo "$row" | yq -r '.name')
     color=$(echo "$row" | yq -r '.color')
     desc=$(echo "$row" | yq -r '.description')
     gh label create "$name" --color "$color" --description "$desc" --force
   done

3. 마일스톤 생성 (.github/milestones.yml → GitHub)
   yq -c '.[]' .github/milestones.yml | while read -r row; do
     title=$(echo "$row" | yq -r '.title')
     desc=$(echo "$row" | yq -r '.description')
     state=$(echo "$row" | yq -r '.state // "open"')
     gh api repos/zenghyun/Tickr/milestones \
       -f title="$title" -f description="$desc" -f state="$state" >/dev/null
   done

위 3단계 완료 후 다시 "작업 등록해줘"라고 말씀해 주세요.
```

`yq` 미설치면 `brew install yq` 안내.

## 출력 형식

- 한국어 요약 + 영문 라벨/이슈번호 혼용.
- 등록한 이슈 번호와 URL은 반드시 마지막에 정리.

## 주의사항

- `gh issue create`는 사용자 승인 후에만 호출.
- 한 번에 너무 많이 등록하지 말 것 (10개 초과 시 묶음 분할 제안).
- 중복 등록 방지 — 동일 title prefix 있는 OPEN 이슈 검출 후 스킵.
- 글로벌 `/jira-update`는 호출하지 않음 (Jira 미사용).
- 등록 후 `git push`나 다른 행동은 별도 요청 없으면 하지 말 것.
