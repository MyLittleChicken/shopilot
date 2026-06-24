# 스펙: 토큰 단위 스트리밍 — 추천 멘트 타이핑 효과

상태: 진행 중 · 브랜치: `feat/token-streaming`

## 1. 무엇을 / 왜

지금 추천 멘트는 `message` 이벤트로 **한 번에 통째로** 뜬다. 이 슬라이스는 LLM이 생성하는 추천 근거를 **토큰(청크) 단위로 흘려** 타이핑처럼 점진 렌더한다 — AI 에이전트의 "생각이 도착하는" 느낌. 계약(`AgentEvent`)을 가로지르는 변경이라 schemas→core→ui를 함께 손댄다. 목 우선(결정론 청크/폴백).

## 2. 범위 경계

**in scope**
- `AgentEvent`에 `message_delta { text }` 추가 (점진 청크)
- `recommendStream(...)` — 추천 근거를 청크로 yield(폴백 포함), `recommend`는 이를 join한 편의 래퍼로 유지
- `runAgent` ≥1건 경로: `message`(통째) → `message_delta`(여러 개)로 스트리밍
- `useChat`: `message_delta`를 **하나의 어시스턴트 말풍선으로 누적**

**out of scope**
- `thinking`·`products`·0건 `message`(결정론)·`error`는 그대로(통째)
- 멀티턴, 스트리밍 취소(AbortController), 부분 마크다운 렌더 — 후속
- 서버 변경 없음(SSE는 이벤트를 그대로 통과)

## 3. 입출력과 계약

### 잠금 결정

- **D1 — `AgentEvent += message_delta { text }`** (discriminatedUnion 멤버 추가). `thinking/products/message/done/error`는 유지.
- **D2 — `recommendStream(llm, profile, query, products): AsyncIterable<string>`**: `llm.stream` text 청크를 **그대로 yield**(길이>0). `.stream` 호출·이터레이션 실패는 catch. 스트림 종료 후 누적 텍스트가 `trim().length===0`이면 폴백 문자열을 1청크로 yield. **throw 안 함.** `recommend`는 `recommendStream`을 join한 `Promise<string>`(기존 테스트·비스트리밍 소비처용).
- **D3 — `runAgent`**: ≥1건 경로에서 `recommend`(통째 message) 대신 `for await (delta of recommendStream(...)) yield { type:"message_delta", text: delta }`. 0건 경로는 결정론 `message` 유지. 시퀀스: `thinking→products→thinking→message_delta…→done`.
- **D4 — `useChat`**: `message_delta` 수신 시 진행 중 어시스턴트 말풍선이 없으면 새로 만들고, 있으면 마지막 말풍선에 append(닫힘 플래그는 send마다 리셋). `message`(통째)·`error`는 기존대로 새 말풍선. ChatPanel은 무변경(content가 자라며 재렌더 = 타이핑 효과).

## 4. 수용 기준

- [ ] `AgentEventSchema`가 `message_delta`를 파싱하고 미지 type은 거부한다
- [ ] `recommendStream`이 text 청크를 순서대로 yield한다(tool_call 무시)
- [ ] `recommendStream`이 실패/빈응답이면 폴백을 1청크로 yield한다
- [ ] `recommend`(래퍼)의 기존 계약(누적·폴백·프롬프트 내용)이 그대로 유지된다
- [ ] `runAgent` ≥1건: `thinking→products→thinking→message_delta(들)→done`, 델타 합 = 목 LLM 텍스트(또는 폴백)
- [ ] `runAgent` 0건: `thinking→message→done`(결정론, 무변경)
- [ ] `useChat`가 연속 `message_delta`를 **하나의** 어시스턴트 메시지로 누적한다
- [ ] 기존 `message`·`error` 처리·로딩·무변경 계약 테스트 통과
- [ ] `pnpm -r typecheck`·`pnpm -r test`·`pnpm build` 초록, PR CI 초록

## 5. 커밋 순서

1. 스펙 + PROGRESS — 스펙 커밋
2. red: schemas(message_delta)+테스트, `recommendStream` 스켈레톤+테스트, `agent.test` 시퀀스 마이그레이션, `useChat` 누적 테스트
3. green: `recommendStream` 구현 + `recommend` 래퍼화 + `runAgent` 델타 + `useChat` 누적
4. 검증(E2E로 델타 흐름 확인) → PR

## 6. 미해결 / 후속

- 스트리밍 취소(AbortController), 부분 마크다운/코드블록 렌더 — 후속.
- `thinking`도 점진(추론 과정 스트리밍) — 후속.
- 멀티턴 대화 맥락 — 후속.
