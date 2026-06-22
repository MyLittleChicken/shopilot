# 스펙: OpenAIAdapter + provider 선택 일반화 — provider-agnostic 실증

상태: 진행 중 · 브랜치: `feat/openai-adapter`

## 1. 무엇을 / 왜

LLM 계층은 Claude 전용이 아니라 **어떤 AI API든** `LLMAdapter` 뒤에서 교체 가능해야 한다(원칙: `llm-provider-agnostic`). 지금은 `ClaudeAdapter`만 구현·배선돼 Claude-first다. 이 슬라이스는 **두 번째 provider(`OpenAIAdapter`)를 같은 인터페이스로 추가**하고 서버 선택을 일반화해 provider-agnostic을 **코드로 실증**한다. 목 우선(키 없이 빌드·테스트, 실키 검증은 후순위).

## 2. 범위 경계

**in scope**
- `OpenAIAdapter`(`openai` SDK) — `LLMAdapter` 구현
- `toOpenAIChunks(stream)` — OpenAI 스트림 청크를 `LLMChunk`로 매핑하는 순수 함수(가짜 스트림으로 단위 테스트)
- `selectLLM(env)` — 키 우선순위로 어댑터를 고르는 **테스트 가능한** 선택 함수(core)
- `apps/server`가 `selectLLM(process.env)`로 조립(인라인 분기 제거)
- `openai`를 `@shopilot/core` `dependencies`로 추가

**out of scope**
- 실제 OpenAI/Claude 키 라이브 호출(후순위, MockLLM/폴백으로 검증)
- Gemini 등 추가 provider(같은 패턴으로 후속), 멀티 provider 동시 사용·라우팅
- `LLMAdapter` 인터페이스 변경(불변)

## 3. 입출력과 계약

### 잠금 결정

- **D1 — `OpenAIAdapter`**: `new OpenAI({ apiKey })`, `chat.completions.create({ model, messages, stream: true })`. ChatMessage[]를 OpenAI messages로 매핑 — `system`은 별도 필드가 없으므로 **messages 앞에 `{ role:"system", content: input.system }`을 넣고**, `input.messages`(user/assistant/system)는 그대로. 기본 모델 `gpt-4o`(`OPENAI_MODEL`로 덮기). 스트림 매핑은 `toOpenAIChunks`.
- **D2 — `toOpenAIChunks(stream: AsyncIterable<unknown>): AsyncIterable<LLMChunk>`**: 각 청크의 `choices[0].delta.content`가 string이면 `{ type:"text", text }` yield, 그 외(role-only 첫 청크·finish·undefined content)는 무시. `AsyncIterable<unknown>`+타입가드로 SDK 타입과 디커플.
- **D3 — `selectLLM(env): LLMAdapter`**(core): 우선순위 — `env.ANTHROPIC_API_KEY` → `ClaudeAdapter` / `env.OPENAI_API_KEY` → `OpenAIAdapter` / 둘 다 없으면 `MockLLMAdapter`. 모델은 각 `ANTHROPIC_MODEL`/`OPENAI_MODEL`로 덮기. `env`는 `{ ANTHROPIC_API_KEY?, OPENAI_API_KEY?, ANTHROPIC_MODEL?, OPENAI_MODEL? }` 구조(테스트는 평문 객체 주입). 키는 서버가 `process.env`로 읽어 전달 — 시크릿은 서버 출처 유지.
- **D4 — 클라 비유입**: `openai`는 core 의존(서버만 import). web·widget 번들에 들어가지 않음(빌드+grep 확인).

## 4. 수용 기준

- [ ] `toOpenAIChunks`가 `choices[0].delta.content`(string)만 누적하고 content 없는 청크는 무시한다(가짜 스트림)
- [ ] `OpenAIAdapter`가 `LLMAdapter`를 구현하고 타입체크 통과(키 없이 라이브 미실행)
- [ ] `selectLLM`: Anthropic 키 → `name==="claude"` / OpenAI 키만 → `name==="openai"` / 둘 다 없음 → `name==="mock-llm"`
- [ ] Anthropic·OpenAI 키 둘 다면 Anthropic 우선
- [ ] `apps/server`가 `selectLLM(process.env)`로 조립, 타입체크 통과
- [ ] `openai`가 web·widget 번들에 비유입
- [ ] `pnpm -r typecheck`·`pnpm -r test`·`pnpm build` 초록, PR CI 초록

## 5. 커밋 순서 (SDD → TDD)

1. 스펙(이 파일) + PROGRESS — 스펙 커밋
2. 인프라: `openai` 의존 추가 — 인프라 커밋
3. red: `toOpenAIChunks`·`selectLLM` 테스트 + 스켈레톤
4. green: `toOpenAIChunks`·`OpenAIAdapter`·`selectLLM` 구현
5. 연결: `apps/server`가 `selectLLM` 사용
6. 검증(번들 grep) → PR

## 6. 미해결 / 후속

- 실키 라이브 검증(Claude·OpenAI) — 키 확보 시 스모크.
- Gemini 등 추가 provider — 같은 패턴.
- 멀티 provider 라우팅·폴백(한 provider 실패 시 다른 provider) — 후속.
