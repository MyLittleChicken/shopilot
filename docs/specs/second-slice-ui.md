# 스펙: 두 번째 수직 슬라이스 (UI) — ChatPanel SSE 소비 + 상품 렌더

상태: 진행 중 · 브랜치: `feat/second-slice-ui`

## 1. 무엇을 / 왜

코어 슬라이스(가전 질의 → 목 상품 SSE)는 `main`에 머지됐고 서버가 `thinking→products→message→done`을 흘린다. 이 슬라이스는 **`packages/ui`에서 그 SSE를 소비해 어시스턴트 멘트 + 상품 카드 그리드를 그리는 것**까지를 구현해, web·widget 두 표면이 **같은 컴포넌트 한 벌**로 동작함을 증명한다. 즉 계약→코어→서버→**UI→연결**의 마지막 두 칸을 채운다.

**왜 이 범위인가**: "가장 얇은 올바른 단계". 입력 → 전송 → SSE 파싱 → 멘트·카드 렌더까지가 한 줄기다. 멀티턴·마크다운·재시도 UI·비교 뷰·디자인 폴리시는 비범위.

> 분할 옵션: 리뷰 부담이 크면 **(A) streamChat + 테스트환경/빌드 CI(인프라·계약)** 와 **(B) useChat + ChatPanel + 연결(렌더·표면)** 2개 PR로 나눌 수 있다. 기본은 단일 슬라이스로 진행하되 §5 커밋이 그 경계로 쪼개져 있다.

## 2. 범위 경계

**이 슬라이스 (in scope)**
- `streamChat(apiBaseUrl, request, fetchImpl?)` — `POST /chat` SSE를 파싱해 `AgentEvent`를 yield하는 프레임워크 비종속 async generator
- `useChat({ apiBaseUrl, fetchImpl? })` — 입력·메시지·로딩·상품 상태 React 훅
- `ChatPanel({ apiBaseUrl, fetchImpl? })` 개편 — 입력창 + 전송 + 메시지 목록 + 상품 그리드
- `ProductCard` 보강 (브랜드·평점·attributes를 **제네릭**으로 표시 — 카테고리 지식 비누수)
- `apps/web`·`apps/widget`가 각자 env의 `apiBaseUrl`을 주입
- `packages/ui` 테스트 환경(happy-dom + @testing-library) 도입 + **CI에 build 스텝 추가**

**비범위 (out of scope)**
- 멀티턴 히스토리·이전 메시지 전송(단일 user 질의만), 마크다운·타이핑 애니메이션
- 재시도/취소 UI, 토큰 단위 점진 렌더(이벤트 단위로만)
- 비교 뷰, 정렬·필터 UI, AbortController 기반 언마운트 취소
- Shadow DOM 스타일 **완전 격리·디자인 폴리시**(최소 인라인/스코프드만, §6 후속). 단, 위젯 육안 확인은 "무스타일이어도 멘트·카드 DOM이 shadow 안에 렌더되고 SSE가 흐름"으로 유효화한다.
- 실제 LLM·실데이터

## 3. 입출력과 계약

`AgentEvent`·`ChatRequest`·`Product`의 진실 원천은 `packages/schemas`. UI는 그 스키마로 SSE를 검증한다. 파일 구조: `packages/ui/src/{chat-client,use-chat,product-card,chat-panel}.ts(x)` + 배럴 `index.tsx`.

### 잠금 결정

- **D1 — `apiBaseUrl`은 prop 주입**: `packages/ui`는 `process.env`/`import.meta.env`를 읽지 않는다(어느 앱인지 모르고, 읽어선 안 됨). 각 앱이 자기 공개 변수를 넘긴다 — web=`NEXT_PUBLIC_API_BASE_URL`, widget=`VITE_API_BASE_URL`. 시크릿 서버 전용 유지.
- **D2 — `streamChat` 배치 = `packages/ui`**: 브라우저측 API 클라이언트로, 이를 소비하는 UI와 같은 표면 패키지에 둔다(서버/에이전트 로직이 아니므로 core가 아니다). `EventSource`는 GET 전용이라 불가 → `fetch`+`ReadableStream`으로 `POST`. `fetch`는 주입 가능: 본문은 `fetchImpl ?? globalThis.fetch`를 쓴다. **비-DOM 코드**이므로 그 테스트 파일은 `// @vitest-environment node`로 node 환경에서 돌린다(happy-dom 스트림 구현 차이 회피).
- **D3 — `useChat` 훅 + `ChatPanel`**: 상태는 훅에, 컴포넌트는 렌더만. 단일 컬럼, 상품은 메시지 뒤 그리드. `status==="streaming"` 중 추가 `send`는 무시한다.
- **D4 — ui 테스트 환경**: `vitest.config.ts`의 `test.environment="happy-dom"`(기본), streamChat 테스트만 node 오버라이드. devDep 추가: **`vitest`**, **`react-dom`**(peer+dev), **`@types/react-dom`**, `happy-dom`, `@testing-library/react`, `@testing-library/user-event`, `@vitejs/plugin-react`. `"test": "vitest run"` 스크립트(core·schemas와 동일 패턴).

### `streamChat` 계약

```ts
// done에서 return → 실제 반환은 AsyncGenerator<AgentEvent, void>, AsyncIterable<AgentEvent>와 호환.
export async function* streamChat(
  apiBaseUrl: string,
  request: ChatRequest,
  fetchImpl?: typeof fetch,
): AsyncIterable<AgentEvent>;
```

- `const f = fetchImpl ?? globalThis.fetch;` → `f(\`${apiBaseUrl}/chat\`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(request) })`.
- **SSE 와이어 형식**(서버 = hono `streamSSE`): 각 프레임은 `event: <type>\ndata: <json>\n\n` — **event 줄 + data 줄**. 프레임은 빈 줄(`\n\n`)로 구분.
- **파싱 규칙**: 응답 `ReadableStream`을 `TextDecoder`로 누적하며 `\n\n`로 프레임 분리. 각 프레임에서 **`data:`로 시작하는 라인만** 취해 접두사(`data:` + 선택 공백 1개)를 제거한 나머지를 `JSON.parse`. `event:`/`id:`/`:`(주석)·빈 라인은 무시. 파싱 객체는 `AgentEventSchema`로 검증해 **통과한 것만 yield**(이상/깨진 프레임은 건너뛰고 계속).
- **버퍼링**: 완성된 프레임(끝에 `\n\n`)만 처리하고 미완 잔여는 버퍼에 남긴다.
- **종료 트리거**(유한 종료 보장): `done` yield 후 `return` / reader EOF(`done:true`) 시 `return` / `error` yield 후 `return`.
- **오류 분기**(구조만 검증, message 내용은 비단언): `f(...)`가 throw → `{type:"error", message:"네트워크 오류가 발생했어요."}` yield 후 return / `res.ok===false` → 본문 파싱 없이 `{type:"error", message:\`요청 실패(HTTP ${res.status})\`}` yield 후 return / `res.body===null` → `{type:"error", message:"응답 본문이 없어요."}` yield 후 return.

### `useChat` 계약

```ts
export function useChat(opts: { apiBaseUrl: string; fetchImpl?: typeof fetch }): {
  messages: { role: "user" | "assistant"; content: string }[];
  products: Product[];
  status: "idle" | "streaming";
  send: (text: string) => void;
};
```

- `send(text)`: `text.trim()`이 비면 무시(요청 발생 안 함). `status==="streaming"` 중이면 무시. 아니면 user 메시지 추가 → `status="streaming"` → products 초기화 → `streamChat(apiBaseUrl, { messages:[{role:"user",content:text.trim()}] }, fetchImpl)` 소비.
- 이벤트 처리 — `thinking`: 유지(로딩) / `products`: products 교체 / `message`: assistant 메시지 추가 / `done`: `status="idle"` / `error`: assistant에 오류 안내 추가 + `status="idle"`.
- 단일 user 질의만 전송(category 미지정 → 서버 기본 가전). `ChatRequest.messages.min(1)` 충족.

### `ChatPanel` / `ProductCard`

- `ChatPanel({ apiBaseUrl, fetchImpl? })`: `useChat` 사용. 메시지 목록(role별), 상품 그리드(`ProductCard` 반복), 입력 폼(label 있는 input + 전송 버튼), 로딩 표시. `role="log"`·`aria-label` 유지. `fetchImpl?`는 **테스트 주입용**(앱은 생략).
- `ProductCard({ product })`: 제목·가격에 더해 `brand`·`rating`(있을 때)과 `attributes`를 **제네릭**으로 표시 — `Object.entries(product.attributes)`에서 값이 `string`/`number`인 것만(`typeof` 가드로 `unknown` 좁힘) 렌더. **가전 전용 키를 하드코딩하지 않는다**(카테고리 지식 비누수). 컨테이너 쿼리(`@container`)로 web/widget 양쪽 대응.

## 4. 수용 기준 (체크리스트)

`streamChat` (`// @vitest-environment node`, 주입 fetch + 목 스트림)
- [ ] `POST {apiBaseUrl}/chat`에 `Content-Type: application/json`·`ChatRequest` 본문으로 호출한다
- [ ] `event: <type>\ndata: <json>\n\n` 프레임에서 **data JSON만** 파싱해 `thinking→products→message→done`을 순서대로 yield한다(event 줄 무시)
- [ ] yield된 모든 이벤트가 `AgentEventSchema`를 통과한다
- [ ] **완성 프레임 N개가 한 청크로** 와도 N개를 순서대로 yield한다
- [ ] **한 프레임이 2~3 청크에 쪼개져** 와도 1개로 합쳐 yield한다
- [ ] **깨진 JSON 프레임**은 건너뛰고 이후 정상 프레임·`done`까지 정상 진행한다
- [ ] `res.ok===false`(예: 400)면 본문 파싱 없이 `{type:"error"}` 1개만 yield하고 종료한다(message 내용 비단언)
- [ ] `fetch` throw 시 `{type:"error"}` 1개를 yield하고 종료한다
- [ ] 소비 루프가 유한 시간에 반드시 종료한다(`done`/EOF/`error`)

`useChat` / `ChatPanel` (@testing-library + happy-dom, 목 fetch + **게이트형 스트림**)
- [ ] 입력에 질의를 넣고 전송하면 user 메시지가 보인다
- [ ] `products` 이벤트 후 `ProductCard`가 상품 수만큼 렌더된다
- [ ] `message` 이벤트의 어시스턴트 멘트가 보인다
- [ ] **`thinking`만 방출된 시점**에 `status==="streaming"`(로딩 표시 ON)이 관찰된다 *(게이트로 프레임 사이 정지)*
- [ ] **`done` 방출 후** `status==="idle"`(로딩 OFF)가 된다
- [ ] 빈/공백 입력 `send`는 `fetchImpl` 호출 0회(요청 발생 안 함) — useChat 단위로 단언
- [ ] `status==="streaming"` 중 추가 `send`는 무시된다
- [ ] `error` 이벤트 시 오류 안내가 보이고 `status="idle"`가 된다

web·widget 연결 (빌드 + 육안)
- [ ] `apps/web`이 `'use client'` 경계에서 `NEXT_PUBLIC_API_BASE_URL`을 `ChatPanel`에 주입한다(useChat는 클라이언트 훅)
- [ ] `apps/widget`이 `VITE_API_BASE_URL`을 Shadow DOM 내 `ChatPanel`에 주입한다
- [ ] 서버 기동 후 web에서 가전 질의 → 멘트·상품 카드 렌더 육안 확인
- [ ] widget 빌드 후 외부 페이지에 주입 시 shadow 안에 멘트·카드 DOM이 렌더되고 SSE가 흐름(무스타일 허용)

게이트
- [ ] `pnpm -r typecheck` 초록
- [ ] `pnpm -r test`(core·schemas=node, ui=happy-dom/일부 node) 초록
- [ ] `pnpm build` 초록 — **CI에 build 스텝 추가**(web·widget 연결은 빌드로만 잡힘: Next `'use client'`·vite IIFE·`import.meta.env`)
- [ ] PR CI(typecheck + test + build) 초록

## 5. 산출물 / 커밋 순서 (SDD → TDD)

1. 스펙(이 파일) + `docs/PROGRESS.md` 갱신(코어=완료, 현재 집중=UI) — **스펙 커밋**
2. **인프라 커밋**: `packages/ui`에 devDep(`vitest`·`react-dom`(peer+dev)·`@types/react-dom`·`happy-dom`·`@testing-library/react`·`@testing-library/user-event`·`@vitejs/plugin-react`), `vitest.config.ts`(environment happy-dom), `"test":"vitest run"`; `.github/workflows/ci.yml`에 `pnpm build` 스텝; `apps/web/tsconfig.json`에 `allowJs`·`incremental` 선반영 + `.gitignore`에 `next-env.d.ts`(빌드 멱등성)
3. **테스트 커밋(red)**: `chat-client.test.ts`(node)·`use-chat`/`chat-panel` 테스트 + **게이트형 목 SSE 스트림 헬퍼**(프레임 단위 enqueue/대기 제어, 청크 경계 임의 지정 가능)
4. **구현 커밋(green)**: `streamChat`·`useChat`·`ChatPanel`·`ProductCard`
5. **연결 커밋**: `apps/web`(`'use client'` 경계 + env 주입)·`apps/widget`(env 주입), 빌드 확인
6. curl/육안 E2E → PR

## 6. 미해결 / 후속에 기록

- **Shadow DOM 스타일 격리**: 위젯에서 스타일이 shadow 경계를 넘지 못한다. 이번엔 무스타일로 기능·구조를 증명하고, 스타일 주입(컴포넌트가 `<style>` 동반 렌더 등) 전략은 후속 스펙에서 정식화.
- **ProductCard 표시 키 prop화**: 지금은 제네릭(모든 string/number attributes) 표시. 카테고리별 강조 키(`displayKeys?`)는 비교 기능 스펙에서 프로파일과 함께 도입.
- **멀티턴 히스토리·AbortController 취소·`engines.node` 정정**: 후속 그대로 유지.
