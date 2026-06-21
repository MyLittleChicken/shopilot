# 스펙: 첫 수직 슬라이스 (코어) — 가전 자연어 질의 → 목 상품 SSE

상태: 진행 중 · 브랜치: `feat/first-slice-core`

## 1. 무엇을 / 왜

스캐폴드는 모든 층이 구조적으로 연결돼 있으나 `runAgent`가 STUB(고정 텍스트)이라 실제로 흐르는 데이터가 없다. 이 슬라이스는 **가전 카테고리에서 자연어 질의를 받아, 결정론적 목 데이터 기반 상품 목록을 `products` 이벤트로 SSE에 흘리는 것까지**를 구현해 아키텍처(계약 → 코어 → 어댑터 → 서버 SSE)를 끝에서 끝까지 증명한다.

핵심은 STUB인 `runAgent`를 **목 `DataSourceAdapter` + 가전 `CategoryProfile`**로 채우고, `ChatRequest.messages[]`를 `ProductQuery`로 잇는 결정론적 질의 추출(`extractQuery`)을 정의하는 것이다. LLM·실DB 없이 목부터, 가전만.

**왜 이 범위인가**: "가장 얇은 올바른 첫 단계". UI 렌더까지 한 PR에 묶으면 SSE 파싱·Shadow DOM·DOM 테스트 환경이 끼어 PR이 비대해진다. UI는 두 번째 슬라이스로 분리한다.

## 2. 범위 경계

**이 슬라이스 (in scope)**
- `extractQuery(messages, category?) → ProductQuery` (결정론적)
- 가전 시드 픽스처 + `MockDataSourceAdapter` (`search`/`getById`)
- 가전 `CategoryProfile` + `ProfileRegistry` 등록
- `createRunAgent(deps)` 팩토리로 STUB 제거, 이벤트 시퀀스 방출
- 서버(컴포지션 루트)에서 목 deps를 조립해 `createRunAgent`로 파이프라인 구동
- vitest 도입(core/schemas, node 환경) + 계약 테스트 + **CI에 test 스텝 추가**
- 서버 `/chat` SSE로 이벤트가 실제로 흐르는 것을 curl로 확인

**비범위 (out of scope) — 의도적으로 하지 않음**
- UI 렌더: `ChatPanel`의 fetch+SSE 파싱, `ProductCard` 그리드, web·widget·Shadow DOM → **두 번째 슬라이스**
- 실제 `LLMAdapter`(Claude/OpenAI/Gemini) 및 LLM 기반 질의·예산 추출 (agentic)
- 실데이터 `DataSourceAdapter`(DB·외부 카탈로그 API)
- 비교 뷰, 멀티턴 대화 상태, 다중 카테고리, 추천 랭킹 고도화
- `AgentEvent` 스키마 확장 (코파일럿 판단 과정 표면) — 필요성만 §6에 기록
- `budgetMax`의 **자연어 추출**: `extractQuery`는 `budgetMax`를 추출하지 않는다(`undefined`). 어댑터의 `budgetMax` 필터는 구현하되, **어댑터 단위 테스트에서 `ProductQuery`를 직접 구성해** 검증한다(runAgent 경로 아님).

## 3. 입출력과 계약

계약의 진실 원천은 `packages/schemas`의 Zod 스키마다. 아래는 사람이 읽는 설명이며 새 데이터 모양을 정의하지 않는다.

### 데이터 흐름

```
ChatRequest(messages[], category?)
   │  extractQuery (결정론적, ProductQuerySchema.parse)
   ▼
ProductQuery(text, category, limit=10, budgetMax=undefined)
   │  MockDataSourceAdapter.search
   ▼
Product[]  (가전, category 일치 → price ≤ budgetMax → 픽스처 정의 순서로 최대 limit개)
   │  createRunAgent(deps) 파이프라인
   ▼
AgentEvent 스트림: thinking → products → message → done
   │  apps/server streamSSE (event = ev.type)
   ▼
SSE (curl로 확인)
```

### 잠금 결정 ①: 주입 seam = `createRunAgent(deps)` 팩토리, 조립은 서버에서

```ts
export interface RunAgentDeps {
  dataSource: DataSourceAdapter;
  profiles: ProfileRegistry;
  // llm?: LLMAdapter;  // 슬라이스 1 미사용. 후속 슬라이스에서 주입.
}

// 순수 팩토리 — 인터페이스만 안다(구현체 모름). 내부에서 async generator를 반환하는 함수를 돌려준다.
// 외부 통합 시그니처(req: ChatRequest → AsyncIterable<AgentEvent>)는 잠긴 계약 — 변경 금지.
export function createRunAgent(deps: RunAgentDeps): (req: ChatRequest) => AsyncIterable<AgentEvent>;

// 편의 팩토리(lazy) — 코어 내 목(MockDataSourceAdapter + 가전 프로파일)을 조립해 돌려준다.
// const가 아니라 함수다 → @shopilot/core를 import하는 것만으로 목이 인스턴스화되지 않는다(호출 시 조립).
export function createDefaultRunAgent(): (req: ChatRequest) => AsyncIterable<AgentEvent>;
```

- **컴포지션 루트는 서버**다. 기존 top-level `export async function* runAgent`는 제거되고, `apps/server/src/index.ts`가 시작 시 `const runAgent = createDefaultRunAgent()`로 한 번 조립한다. 이후 `for await (... of runAgent(parsed.data))`는 그대로다.
- 사전바인딩 `const runAgent = createRunAgent(...)`는 두지 않는다 — 모듈 로드만으로 목이 인스턴스화돼 "코어는 구현체를 모른다"(architecture 원칙 1)와 충돌하기 때문. `createDefaultRunAgent()`는 명시적으로 호출될 때만 조립한다.
- 테스트는 `createRunAgent({ dataSource: <목/스텁>, profiles })`로 주입해 결정론을 보장한다.

### 잠금 결정 ②: `extractQuery` (결정론적)

```ts
export function extractQuery(messages: ChatMessage[], category?: string): ProductQuery;
```

- 반환은 **반드시 `ProductQuerySchema.parse({ text, category: category ?? "appliance", budgetMax: undefined })`의 결과**다(객체 리터럴 직접 반환 금지). 이렇게 해야 `limit` 기본값 10이 채워지고, 출력 타입 `ProductQuery`(limit 필수)와도 정합한다.
- `text` = 가장 마지막 `role === "user"` 메시지의 `content`를 **trim**한 값. user 메시지가 하나도 없으면(전부 assistant/system) 가장 마지막 메시지의 `content`(trim).
  - 탐색은 뒤에서부터 `find`로, 미발견 시 `messages[messages.length - 1]`로 합류한다. `noUncheckedIndexedAccess`에 따라 양쪽 모두 `undefined` 가드를 거친다(**비-널 단언 `!` 금지**). `ChatRequestSchema.messages.min(1)` 불변식에 의존하므로 빈 배열은 처리하지 않는다.
- `category` = 인자가 있으면 그대로, 없으면 `"appliance"`(슬라이스 1엔 가전 프로파일만 존재).
- `budgetMax` = `undefined` (자연어 추출은 비범위). `limit` = 10(스키마 기본).

### `MockDataSourceAdapter` 계약

```ts
// 카탈로그를 생성자로 주입받는다. 테스트는 빈/부분 카탈로그로 0건·경계를 만든다.
new MockDataSourceAdapter(catalog: Product[])
search(query: ProductQuery): Promise<Product[]>   // category 일치 → price ≤ budgetMax(있으면) → 픽스처 정의 순서로 최대 limit개
getById(id: string): Promise<Product | null>
```

- `name` = `"mock"`.
- **정렬하지 않는다** — 결과는 카탈로그(픽스처) 정의 순서를 유지한다. 결정론적: 동일 입력 → 동일 순서.
- `budgetMax` 경계: `price <= budgetMax`는 **포함**, `price > budgetMax`는 제외(§4에서 경계값 검증).

### 가전 `CategoryProfile`

```ts
export const applianceProfile: CategoryProfile = {
  category: "appliance",
  systemPrompt: "<가전 쇼핑 도우미 시스템 프롬프트>",
  compareKeys: ["capacity", "energyGrade", "noiseLevel"],
};
```

- `ProfileRegistry`에 등록. "카테고리 확장 = 프로파일 + 데이터 추가" 골격을 세운다.
- `price`는 `Product` 최상위 필드이므로 `compareKeys`(attributes 키)에 넣지 않고 랭킹·표시에서 별도로 다룬다.

### 이벤트 시퀀스 계약

- 결과 ≥ 1건: `thinking` → `products`(items: 필터된 `Product[]`) → `message`(결정론적 추천 한 줄) → `done`
- 결과 0건: `thinking` → `message`(고정 "못 찾음" 안내) → `done` (**`products` 이벤트 없음**)
- `error`는 정상 경로에서 방출하지 않는다(서버가 파이프라인 예외를 `error`로 감싸는 기존 동작은 유지).
- **최저가 선택 규칙**(message가 언급): 필터된 결과에서 `price` 최소값. 동점이면 **결과 순서(=픽스처 정의 순서)의 첫 항목**으로 안정 선택한다(`reduce`로 첫 최소 유지). → 동점 가격이 있어도 결정론.
- `message`는 LLM 없이 규칙 기반(결과 수 + 최저가 항목의 식별 정보, 예: title). 동일 입력 → 동일 출력.
- `thinking.text`도 규칙 기반 고정 문구(결정론). 단 **테스트는 thinking의 정확한 문구를 단언하지 않고 구조(타입·순서·스키마 통과)만 검증**한다.

### 가전 시드 픽스처 / attributes 키 계약

- 6~8개(냉장고·세탁기·에어컨·청소기·TV 등), `category` = `"appliance"`.
- **출력 타입(Product)을 만족해야 한다**: `currency`("KRW")와 `attributes`는 ProductSchema 출력에서 필수다. 따라서 시드는 **`ProductSchema.parse(...)`를 거친 `Product[]`로 정의**한다(또는 `currency`·`attributes`를 명시 포함한 리터럴). `products` 이벤트에 넣는 items도 동일하게 출력 타입을 만족해야 한다.
- `attributes` 키 **고정**: `capacity`(string), `energyGrade`(string), `noiseLevel`(number). `compareKeys`와 일치시켜 후속 비교 기능 회귀를 막는다.
- **동점 가격 2건을 의도적으로 포함**해 최저가 안정 정렬을 회귀로 고정한다.
- ⚠️ `imageUrl`·`url`은 `z.string().url().optional()` — **빈 문자열 금지**. 생략하거나 유효 URL로 채운다.

## 4. 수용 기준 (체크리스트)

`extractQuery`
- [ ] 마지막 user 메시지 `content`를 **trim**해 `text`로 매핑한다 (예: `"  냉장고  "` → `"냉장고"`)
- [ ] user 메시지가 여럿이면 가장 마지막 것을 쓴다
- [ ] user 메시지가 하나도 없으면(전부 assistant/system) 마지막 메시지 `content`를 쓴다
- [ ] `category` 인자가 있으면 그대로, 없으면 `"appliance"` 기본
- [ ] 반환값은 `ProductQuerySchema.parse` 결과다 → `limit === 10`, `budgetMax === undefined`
- [ ] 반환값이 `ProductQuerySchema`를 통과한다

`MockDataSourceAdapter` (테스트는 `ProductQuery`를 직접 구성해 호출 — extractQuery 우회)
- [ ] 모든 시드 픽스처가 `ProductSchema`를 통과한다
- [ ] `search`가 `category` 불일치 항목을 제외한다
- [ ] `search`가 `budgetMax` 경계를 지킨다: `price === budgetMax`는 **포함**, `price === budgetMax + 1`은 제외
- [ ] `search`가 `limit < 매칭 수`일 때 정확히 **픽스처 정의 순서 앞 `limit`개**를 준다 (예: `limit=2` → 앞 2개)
- [ ] `getById`가 존재 id에 Product, 없으면 `null`을 준다

`runAgent` (`createRunAgent`로 deps 주입)
- [ ] 가전 질의에 이벤트 타입 순서가 `thinking → products → message → done`이다
- [ ] 방출된 모든 이벤트가 `AgentEventSchema`를 통과한다
- [ ] `products.items`가 모두 `ProductSchema` 통과 · `category === "appliance"`
- [ ] **동점 최저가** 픽스처에서 `message`가 언급하는 항목이 고정된다(픽스처 정의 순서의 첫 최소)
- [ ] `message`가 결정론적이다(동일 입력 → 동일 출력), 최저가 항목 식별 정보를 포함한다
- [ ] **0건 경로**: `createRunAgent({ dataSource: new MockDataSourceAdapter([]), profiles })`로 주입 시 `thinking → message → done`이며 `products` 이벤트가 없다. 0건 `message`도 고정 문구다
- [ ] 외부 시그니처 `(req: ChatRequest) → AsyncIterable<AgentEvent>`가 유지된다

통합(서버, 수동 확인)
- [ ] `apps/server/src/index.ts`가 `createDefaultRunAgent()`로 조립하도록 갱신되고 타입체크 통과(`for await` 루프·SSE 방출은 무변경)
- [ ] 서버 기동 후 `curl -N -X POST /chat`로 가전 질의 → `thinking→products→message→done` SSE 육안 확인

게이트
- [ ] `pnpm -r typecheck` 초록
- [ ] `pnpm -r test`(vitest) 초록 — core·schemas에 `test` 스크립트 존재, turbo `test` 태스크 등록
- [ ] PR에서 CI **typecheck + test** 두 스텝 모두 초록

## 5. 산출물 / 커밋 순서 (SDD → TDD)

1. 스펙(이 파일) + `docs/PROGRESS.md` 갱신 — **스펙 커밋**
2. **인프라 커밋**: 루트 devDependency `vitest`; `packages/core`·`packages/schemas`에 `"test": "vitest run"`; `turbo.json`에 `test` 태스크; `.github/workflows/ci.yml`에 `pnpm -r test` 스텝 추가(가짜 초록 방지 — vitest가 실재화됐으므로 CI가 강제). node 환경만(DOM은 UI 슬라이스로 미룸)
3. **테스트 커밋(red)**: `extractQuery`·`MockDataSourceAdapter`·`runAgent` 계약 테스트 + 가전 시드 픽스처(동점 가격 포함)
4. **구현 커밋(green)**: `extractQuery` · `applianceProfile` · `MockDataSourceAdapter` · `createRunAgent`/`createDefaultRunAgent` (STUB 제거) · `apps/server` 컴포지션 루트 갱신
5. curl E2E 확인 → PR (UI 렌더는 후속 슬라이스로 분리)

## 6. 미해결 / 후속에 기록

- **`AgentEvent` 표현력**: 현재 `thinking/message/products/done/error`만으로는 '비교 기준·추천 근거·질의 확인' 같은 코파일럿 판단 과정을 표현하기 부족하다. 스키마 변경은 SSE event명·UI까지 파급되므로 **이 슬라이스에서 확장하지 않고**, 비교 기능 스펙에서 정식 결정한다.
- **`engines.node` 불일치**: 루트 `package.json`의 `engines.node: ">=20"`은 `packageManager: pnpm@11.5.2`의 실제 요구(>=22.13)와 어긋난다. CI는 Node 22로 통과하도록 맞췄으나, `engines`를 `>=22`로 정정하는 별도 정리가 필요하다.
- **두 번째 슬라이스(UI)**: `ChatPanel` fetch+ReadableStream SSE 파싱(EventSource는 GET 전용이라 불가), `ProductCard` 그리드, web·widget Shadow DOM 스타일 확인, happy-dom/@testing-library 환경 추가.
