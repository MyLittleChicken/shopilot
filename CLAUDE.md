# Shopilot

자연어로 말하면 상품을 탐색·비교하고 구매 판단까지 돕는 AI 쇼핑 에이전트. 쇼핑을 대신 처리하는 도구가 아니라, 옆에서 함께 판단하는 부조종사(copilot)를 지향한다. 설계의 중심은 LLM 호출이 아니라 에이전트가 판단에 이르는 과정이다 — 사용자의 문제를 어떻게 정의하고(예산·용도·취향), 어떻게 탐색·비교해 결론에 이르며, 그 결과를 상품 카드·비교 뷰로 구매 경험에 연결하는가.

## 핵심 규칙

- 외부 의존성(LLM·데이터)은 어댑터 뒤에 둔다. 코어는 구현체를 모른다.
- UI는 `packages/ui` 한 곳에만 만들고 web·widget이 공유한다.
- 데이터 모양은 `packages/schemas`의 Zod 스키마가 진실 원천이다. 타입은 거기서 파생한다.
- 시크릿은 서버에만 둔다. 클라이언트 번들에 키가 들어가지 않게 한다.
- 목 데이터로 먼저 동작시키고, 같은 인터페이스로 실데이터에 연결한다.
- 스펙을 먼저 정의하고(SDD), 그 스펙으로 테스트를 먼저 쓴 뒤(TDD) 구현한다.
- TypeScript strict.

## 워크스페이스

| 워크스페이스 | 역할 |
| --- | --- |
| `apps/server` | 백엔드 API(Hono). 파이프라인·어댑터·시크릿·SSE |
| `apps/web` | 풀페이지 웹(Next.js). 디자인 원본·데모 |
| `apps/widget` | 외부 사이트 임베드 위젯(Vite, Shadow DOM) |
| `packages/ui` | 공유 UI 컴포넌트 |
| `packages/core` | 에이전트 파이프라인·어댑터·`runAgent` |
| `packages/schemas` | 공유 Zod 스키마 |

## 상세 규칙

도메인별 상세는 아래 파일에 있다. 해당 작업을 할 때 읽는다.

- 개발 방식(스펙→테스트→구현) — `.claude/workflow.md`
- 아키텍처 — `.claude/architecture.md`
- 코딩 컨벤션 — `.claude/conventions.md`
- 보안 — `.claude/security.md`
- 테스트 — `.claude/testing.md`
- 버전 관리 — `.claude/version-control.md`
- 작업 진행 — `docs/PROGRESS.md`
