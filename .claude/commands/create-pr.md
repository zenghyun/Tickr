---
name: create-pr
description: "GitHub PR 자동 생성/업데이트(Tickr 프로젝트 맞춤). `gh` CLI 기반. 글로벌 create-pr.md(Bitbucket)를 override합니다. 브랜치 prefix로 대상 브랜치 결정, PR 템플릿(`.github/PULL_REQUEST_TEMPLATE.md`) 채움, 연관 이슈 자동 링크."
---

# Create PR — Tickr (gh CLI)

`gh pr create` / `gh pr edit`으로 PR을 생성하거나 업데이트한다. **글로벌 create-pr.md의 Bitbucket REST API는 사용하지 않는다.**

## 사전 조건

```bash
gh auth status      # 미인증 시 'gh auth login' 안내
git remote get-url origin   # zenghyun/Tickr 확인
```

## 1단계: 컨텍스트 수집

```bash
BRANCH=$(git branch --show-current)

# master는 직접 PR 대상 X
if [ "$BRANCH" = "master" ] || [ "$BRANCH" = "develop" ]; then
  echo "현재 ${BRANCH} 브랜치 — PR 생성 불가. 작업 브랜치로 전환 필요."
  exit 1
fi

# 대상 브랜치
case "$BRANCH" in
  hotfix/*)  BASE=master ;;
  release/*) BASE=master ;;
  *)         BASE=develop ;;
esac

# 푸시 여부
if ! git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
  echo "원격 추적 브랜치 없음 — 먼저 'git push -u origin ${BRANCH}' 실행 필요"
  exit 1
fi

# 미푸시 커밋
AHEAD=$(git rev-list --count origin/$BRANCH..HEAD 2>/dev/null || echo 0)
if [ "$AHEAD" != "0" ]; then
  echo "⚠️  로컬에 미푸시 커밋 ${AHEAD}개 — 'git push' 권장"
fi
```

## 2단계: 기존 PR 확인

```bash
EXISTING_PR=$(gh pr list --head "$BRANCH" --state open --json number,url -q '.[0]')
```

- 있으면 → 4단계(업데이트)
- 없으면 → 3단계(생성)

## 3단계: PR Title / Body 작성

### Title 규칙

브랜치명을 기반으로 한국어 제목 작성:
- `feat/w2-pm-devops-github` → `feat(w2): PM·DevOps 에이전트 GitHub 기반 override`
- `fix/order-sheet-keyboard` → `fix: OrderSheet 키보드 회피 오류 수정`
- `chore/upgrade-expo` → `chore: Expo 54 → 55 업그레이드`

규칙:
- 70자 이내
- 한국어
- 첫 단어: `feat` / `fix` / `chore` / `docs` / `refactor` / `test`
- 스코프 괄호는 주차(`w2`) 또는 영역(`api`/`mobile`/`shared`)

### Body 템플릿

`.github/PULL_REQUEST_TEMPLATE.md`를 기본으로 다음을 자동 채움:

```markdown
## 요약
{커밋 메시지 분석으로 2~3줄 요약}

## 변경 내용
{카테고리별 bullet 목록}

## 관련 이슈
Closes #{N}        # 커밋 메시지의 #N 또는 사용자 입력
Refs:

## 영향 받는 레이어
{변경 파일 경로 분석해 자동 체크}
- [x] `apps/api`
- [ ] `apps/mobile/src/entities/*`
...

## 규칙 준수 (`.claude/rules/`)
{변경 파일 영역에 해당하는 규칙만 체크박스로}
- [x] `fsd-structure.md`
- [x] `react-query.md`
...

## 검증
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm lint` 통과
- [ ] 수동 검증 시나리오 수행
  - {본 작업의 시나리오, 가능하면 자동 추출}

## 스크린샷 / 동영상
{UI 변경 시 사용자에게 첨부 요청}

## 노트
{리뷰어가 알아야 할 비자명한 결정 사항}
```

## 4단계: 사용자 확인

`AskUserQuestion`으로 다음을 보여주고 승인 받기:

```
## PR 생성 예정

Title: {title}
Base:  {BASE}
Head:  {BRANCH}

Body 요약:
{summary 첫 줄들}

관련 이슈: #{N}

진행할까요? (생성 / 수정 후 생성 / 취소)
```

## 5단계: 실행

### 생성
```bash
gh pr create \
  --base "$BASE" \
  --head "$BRANCH" \
  --title "$TITLE" \
  --body "$(cat pr-body.md)"
```

### 업데이트
```bash
gh pr edit "$EXISTING_PR_NUM" \
  --body "$(cat pr-body.md)"
# title은 사용자가 명시 변경 요청 시만
```

## 6단계: 결과 출력

```
✅ PR {생성/업데이트}

#{pr-num}  {title}
https://github.com/zenghyun/Tickr/pull/{pr-num}

Base: {BASE} ← Head: {BRANCH}
변경: {N} files, +{ins} / -{del}
연관 이슈: #{N}

다음 단계:
- 리뷰 요청 (셀프 머지 전 최소 1회 셀프 리뷰 권장)
- CI 통과 확인 (lint/typecheck)
- 머지 시 `develop`에 squash 머지 권장
```

## 에러 처리

| 상황 | 처리 |
|---|---|
| `gh` 미설치/미인증 | `! brew install gh && gh auth login` 안내 후 중단 |
| `master`/`develop`에서 호출 | 작업 브랜치로 전환 안내 |
| 원격 미푸시 | `git push -u origin {BRANCH}` 안내 |
| 대상 브랜치와 차이 없음 | "변경 사항이 없습니다." |
| 동일 head로 PR 이미 존재 | 업데이트 모드 자동 전환 |

## 규칙

- **사용자 승인 후에만 `gh pr create`/`pr edit` 호출.**
- `gh pr merge`는 절대 호출하지 않음 (사용자가 직접).
- `Closes #N`은 커밋 메시지에 `#N`이 있거나 사용자가 명시한 경우에만 자동 삽입.
- Bitbucket REST API, atlassian Jira API 호출 일체 없음.
- 라벨/마일스톤은 PR이 아니라 이슈 쪽에서 관리 (PR에 라벨 자동 부여는 안 함, 필요 시 별도 요청).
