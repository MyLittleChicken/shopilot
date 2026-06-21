# 스펙: LLM 추천 근거 생성 — 비교 기준 기반 추천 메시지

상태: 진행 중 · 브랜치: `feat/llm-recommendation`

## 1. 무엇을 / 왜

지금 `runAgent`는 검색 후 규칙 기반 한 줄("…가장 저렴한 건 X(원)이에요")을 `message`로 낸다. 이 슬라이스는 그 자리를 **LLM이 생성한 추천 근거**로 바꾼다 — 검색된 가전을 카테고리 비교 기준(`compareKeys`: 용량·에너지등급·소음)과 가격으로 비교해 *무엇을 왜 추천하는지* 설명한다. 제품의 설계 중심인 "에이전트가 판단에 이르는 과정"을 처음으로 LLM으로 구현하는 단계다.

**왜 이 범위인가**: 가장 얇은 LLM 도입. 검색(결정론)은 그대로 두고 **메시지 생성만** LLM으로 바꾼다(저위험). 목 우선이라 키 없이 빌드·테스트·데모되고, 실제 Claude는 어댑터 뒤에서 env로 활성화된다.

## 2. 범위 경계

**이 슬라이스 (in scope)**
- `RunAgentDeps`에 `llm: LLMAdapter`(**필수**) 추가 → `createRunAgent({ dataSource, profiles, llm })`
- `runAgent`가 결과 ≥1건일 때 **LLM으로 추천 메시지 생성**(비교 기준·가격·질의를 프롬프트에) + 추천 단계 `thinking` 신호 추가
- `recommend(llm, profile, query, products)` — 프롬프트 구성·청크 누적·**내부 폴백**
- `MockLLMAdapter`(결정론) — 테스트용 + 키 없는 데모(빈 텍스트→폴백 경로)
- `ClaudeAdapter`(실제, `@anthropic-ai/sdk` 스트림 → `LLMChunk`) — 청크 매핑은 순수 함수로 분리해 가짜 스트림으로 단위 테스트
- **서버 컴포지션 루트가 env로 llm 선택**: `ANTHROPIC_API_KEY` 있으면 `ClaudeAdapter`, 없으면 `MockLLMAdapter`
- `createDefaultRunAgent` **제거**(배럴 export 포함) — 서버가 직접 조립
- **기존 `agent.test.ts` 마이그레이션**: 5개 `createRunAgent` 호출에 목 llm 주입, 최저가 단언은 폴백 경로 테스트로 이전

**비범위 (out of scope)**
- 에이전트 루프(LLM 도구 호출로 탐색·비교 주도) — 이번엔 **단일 생성 호출**만, 도구 안 넘김
- LLM 기반 질의 이해(extractQuery는 결정론 유지), 0건 경로의 LLM화(결정론 멘트 유지)
- 토큰 단위 점진 렌더(청크 누적 → **단일 `message`** 이벤트, UI 무변경)
- 멀티턴 대화 맥락, `AgentEvent` 스키마 확장, 추천 품질 평가 하네스, 재시도(폴백만)
- ClaudeAdapter의 `role:"system"` 메시지 처리(이번 recommend는 system 역할을 messages에 넣지 않음 — §3 D5 경계만 명문화)

## 3. 입출력과 계약

`LLMAdapter`/`LLMChunk`/`ChatMessage`의 진실 원천은 `packages/core/src/ports.ts`·`packages/schemas`. 파일: `packages/core/src/{recommend,mock-llm,claude-adapter}.ts`.

### 잠금 결정

- **D1 — `RunAgentDeps.llm: LLMAdapter`(필수)**: `createRunAgent`가 `llm`을 받는다. 코어는 인터페이스만 알고 구현체(Mock/Claude)는 모른다. 외부 시그니처 `(req: ChatRequest) → AsyncIterable<AgentEvent>`는 **불변**. 필수이므로 기존 `agent.test.ts` 호출부를 목 llm 주입으로 마이그레이션한다(아래 §5).
- **D2 — `recommend(llm, profile, query, products): Promise<string>`**:
  - 프롬프트 — `system` = `profile.systemPrompt` + 비교 지침("`compareKeys`와 가격으로 후보를 비교하고, 사용자 질의(용도·예산)에 가장 맞는 1~2개를 근거와 함께 간결한 한국어로 추천"). `messages` = `[{ role:"user", content: 질의 + 상품 목록 }]`.
  - **상품 목록 포맷(결정론)**: products 순서대로, 각 줄 `제목 · 가격원 · {compareKeys: 값}`. `attributes` 값은 `unknown`이므로 `typeof v === "string" || typeof v === "number"`일 때만 `String(v)`로 포함하고 그 외(누락·객체)는 생략한다. → 동일 products면 동일 프롬프트 문자열.
  - `llm.stream(...)`의 `text` 청크를 누적. `tool_call` 청크는 무시(도구 안 넘김).
  - **폴백은 recommend 내부**: `.stream(...)` 호출과 청크 누적 `for await`를 **하나의 try**로 감싼다(동기 호출 throw·비동기 이터레이션 throw 모두 처리). 실패하거나 `누적텍스트.trim().length === 0`이면 **결정론 규칙 문자열**(최저가 한 줄 — 기존 인라인 로직을 여기로 이전)을 반환한다. **recommend는 절대 throw하지 않는다.**
- **D3 — `runAgent` 흐름**: 아래. `message`는 `recommend`의 반환값(성공 추천 또는 폴백) 한 개. `error` 이벤트는 정상 경로에서 안 난다.
- **D4 — 서버가 컴포지션 루트에서 llm 선택**: 시크릿(키)은 서버 전용. `apps/server`가 `process.env.ANTHROPIC_API_KEY`로 `ClaudeAdapter` vs `MockLLMAdapter`를 골라 `createRunAgent({ dataSource: mock, profiles, llm })`로 조립한다. `createDefaultRunAgent`(+ 배럴 export)는 제거한다. 모델은 `process.env.ANTHROPIC_MODEL`로 덮을 수 있고 **기본은 `claude-opus-4-8`**(추천 근거는 품질 중심 단계라 최상위 모델을 기본으로; 비용 절감이 필요하면 env로 `claude-sonnet-4-6` 등 하향).
- **D5 — `ClaudeAdapter`**: `@anthropic-ai/sdk`의 `messages.stream`을 받아, 청크 매핑을 **순수 함수**(`toLLMChunks(stream): AsyncIterable<LLMChunk>`)로 분리한다 — `content_block_delta`의 `text_delta`만 `{ type:"text", text }`로 매핑하고 그 외 블록(start/stop·thinking·tool_use)은 무시. `system`은 `input.system` 그대로, `messages`는 user/assistant. (이번 recommend는 system 역할 메시지를 messages에 넣지 않으므로 system 역할 유입 처리는 비범위.) `@anthropic-ai/sdk`는 **core의 `dependencies`**(서버만 import → 클라 번들 비포함, 시크릿 비노출). 키 없이는 미실행(통합 미테스트, 매핑 순수함수만 테스트).

### `runAgent` 흐름(변경)

```
extractQuery → thinking("…살펴보고 있어요") → search
  ├─ 0건: message(결정론 "없음") → done                         (LLM 미호출)
  └─ ≥1건: products → thinking("후보를 비교해 추천 근거를 정리하고 있어요…")
              → message(recommend(llm,profile,query,items))    ← LLM(+내부 폴백)
              → done
```

### `MockLLMAdapter`

```ts
new MockLLMAdapter(text = "")              // 기본 빈 텍스트 → recommend 폴백 경로(키 없는 데모=질의별 멘트)
stream(input): AsyncIterable<LLMChunk>      // text를 청크로 결정론 방출(빈 텍스트면 청크 0개)
```

- 테스트용 **캡처형 목**: 마지막 `input`과 **호출 횟수(`calls`)**를 노출(프롬프트·0건 미호출 단언).
- 테스트용 **스로잉 목**: (a) `.stream()` 즉시 throw, (b) 이터레이션 중 throw 두 종류.

## 4. 수용 기준 (체크리스트)

`recommend` (목 llm, node)
- [ ] `llm.stream`의 text 청크를 누적해 문자열로 반환한다(여러 청크 순서 유지)
- [ ] `tool_call` 청크는 무시하고 text만 누적한다
- [ ] `llm.stream`에 넘긴 입력에 `profile.systemPrompt`와 각 상품의 제목·가격·`compareKeys` 값이 포함된다(캡처형 목 단언)
- [ ] 동일 products → 동일 프롬프트 문자열(결정론)
- [ ] `.stream()` 즉시 throw 시 폴백 문자열(최저가 한 줄)을 반환하고 throw하지 않는다
- [ ] 이터레이션 중 throw 시에도 폴백 문자열을 반환한다
- [ ] 누적 텍스트가 `trim().length===0`이면 폴백 문자열을 반환한다

`runAgent` (목 llm 주입)
- [ ] ≥1건: `thinking → products → thinking → message → done`, 모든 이벤트 `AgentEventSchema` 통과
- [ ] `message.text` = 주입한 목 llm 텍스트(고정 텍스트 일치로만 단언, 실제 LLM 문구는 어떤 테스트에서도 단언하지 않음)
- [ ] LLM 실패/빈응답 시 `message.text`가 폴백 규칙 멘트(최저가 항목 포함)이고 시퀀스·`error` 없음 유지
- [ ] 0건 경로: `thinking → message → done`(products 없음), 목 llm **호출 0회**(`mock.calls`로 단언)
- [ ] 외부 시그니처 `(req: ChatRequest) → AsyncIterable<AgentEvent>` 유지

`MockLLMAdapter` / `ClaudeAdapter`
- [ ] `MockLLMAdapter`가 주어진 text를 결정론 청크로 방출하고 `calls`를 노출한다
- [ ] `toLLMChunks`(순수 매핑)가 가짜 Anthropic 스트림에서 `text_delta`만 누적하고 비-text 블록을 무시한다
- [ ] `ClaudeAdapter`가 `LLMAdapter`를 구현하고 타입체크 통과(키 없이 통합 미실행)
- [ ] `apps/server`가 `ANTHROPIC_API_KEY` 유무로 Claude/Mock을 골라 `createRunAgent`로 조립(타입체크)
- [ ] `@anthropic-ai/sdk`가 web·widget 번들에 들어가지 않는다(의존 그래프: core는 server만 import)

게이트
- [ ] `pnpm -r typecheck` 초록 · `pnpm -r test`(core·ui) 초록 · `pnpm build` 초록 · PR CI 초록

## 5. 산출물 / 커밋 순서 (SDD → TDD)

1. (완료) `chore`: `engines.node>=22` 이월 정리
2. 스펙(이 파일) + `docs/PROGRESS.md` 갱신 — **스펙 커밋**
3. **인프라 커밋**: `@anthropic-ai/sdk`를 `@shopilot/core`의 `dependencies`로 추가
4. **테스트 커밋(red)**: `recommend`·`mock-llm`·`toLLMChunks` 계약 테스트 + `runAgent` LLM 경로 테스트 + **기존 `agent.test.ts` 5개를 목 llm 주입·폴백 경로로 마이그레이션**
5. **구현 커밋(green)**: `MockLLMAdapter`·`recommend`(폴백 포함)·`runAgent`(llm·추천 thinking)·`RunAgentDeps.llm`·`toLLMChunks`
6. **어댑터 커밋**: `ClaudeAdapter`(@anthropic-ai/sdk + toLLMChunks)
7. **연결 커밋**: `apps/server` 컴포지션 루트(env 분기) + `createDefaultRunAgent`·배럴 export 제거(잔여 참조 grep 확인)
8. curl E2E(키 없이 폴백/목 경로 확인) → PR

## 6. 미해결 / 후속에 기록

- **에이전트 루프(agentic)**: LLM이 도구 호출로 탐색·필터·비교를 주도하는 구조는 후속.
- **토큰 단위 스트리밍 to UI**: 청크를 점진 `message`로 흘리려면 AgentEvent/useChat 변경 필요 — 후속.
- **LLM 질의 이해**: 자연어→ProductQuery(예산·속성 추출)의 LLM화는 별도 슬라이스.
- **추천 품질 평가**: 프롬프트 테스트·응답 평가 하네스(product-spec.md "LLM 응답 품질").
- **ClaudeAdapter system 역할 메시지**: 임의 `ChatMessage[]`의 `role:"system"` 유입 매핑은 후속(이번은 recommend가 안 보냄).
