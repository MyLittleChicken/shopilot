# 스펙: LLM 질의 이해 — 자연어에서 예산(budgetMax) 추출

상태: 진행 중 · 브랜치: `feat/llm-query-understanding`

## 1. 무엇을 / 왜

지금 `extractQuery`는 결정론적이라 마지막 user 메시지를 text로만 쓰고 `budgetMax`는 늘 `undefined`다. "100만원 이하 조용한 세탁기"의 예산 의도가 검색에 반영되지 않는다. 이 슬라이스는 **LLM으로 질의에서 예산 상한(budgetMax)을 추출**해 `ProductQuery`에 채운다 — 에이전트의 "판단 과정"을 질의 단계로 한 걸음 더 넓힌다. LLM은 어댑터 뒤, **실패·이상 출력이면 결정론 base로 폴백**(키 없이도 동작). 목 우선.

## 2. 범위 경계

**in scope**
- `understandQuery(llm, messages, category?)` — 결정론 `extractQuery` base에 LLM 추출 `budgetMax`를 병합
- `runAgent`가 `extractQuery` 대신 `understandQuery`(await) 사용
- 기존 `agent.test.ts`의 "0건 LLM 0회" 마이그레이션(이제 understandQuery 1회·recommend 0회)

**out of scope**
- 예산 외 구조화(카테고리·속성 필터 LLM 추출) — 후속(이번은 budgetMax만)
- 마크다운 감싼 JSON·다국어 숫자 표기 등 실 LLM 견고화 — 후순위(목은 순수 JSON)
- 멀티턴 맥락, extractQuery(결정론 base) 자체 변경

## 3. 입출력과 계약

진실 원천은 `ProductQuerySchema`. 파일 `packages/core/src/understand-query.ts`.

### 잠금 결정

- **D1 — `understandQuery(llm, messages, category?): Promise<ProductQuery>`**:
  1. `base = extractQuery(messages, category)` (결정론: text·category·limit, budgetMax undefined).
  2. LLM에 `base.text`의 예산 상한 추출 요청 — system="JSON만 {\"budgetMax\": number|null}". text 청크 누적.
  3. `JSON.parse` 후 `budgetMax`가 **양의 정수**면 `ProductQuerySchema.parse({ ...base, budgetMax })` 반환, 아니면 `base` 반환.
- **D2 — 폴백(graceful)**: LLM `.stream` 호출·이터레이션 실패, JSON 파싱 실패, budgetMax가 number/양의정수 아님, `null` → 모두 **base 그대로**(budgetMax undefined). **절대 throw하지 않는다.**
- **D3 — `runAgent`**: `const query = await understandQuery(deps.llm, req.messages, req.category)`. 이후 흐름(thinking→search→…)은 그대로. understandQuery는 검색 **전**에 llm을 1회 호출한다(0건이어도 호출됨).
- **D4 — 키 없는 데모**: `MockLLMAdapter`(빈 text)면 누적 빈문자열 → JSON 파싱 실패 → base 폴백(budgetMax undefined). 즉 기존 동작과 동일.

## 4. 수용 기준

`understandQuery` (목 llm, node)
- [ ] LLM이 `{"budgetMax": 1000000}`을 주면 `query.budgetMax===1000000`, text·category는 base 유지
- [ ] `{"budgetMax": null}` → budgetMax `undefined`
- [ ] JSON 아님 / 양의정수 아님 / `.stream` throw → base 폴백(budgetMax `undefined`), throw 안 함
- [ ] 프롬프트에 질의 text가 포함된다(캡처형 목)
- [ ] 반환값이 `ProductQuerySchema`를 통과한다

`runAgent` (마이그레이션)
- [ ] 가전 질의 시퀀스 `thinking→products→thinking→message→done` 유지(understandQuery는 이벤트 미방출)
- [ ] 0건 경로: 결정론 "없음" message·`done`이고, llm은 understandQuery로 **1회만** 호출(recommend 미호출 → calls===1)

게이트
- [ ] `pnpm -r typecheck`·`pnpm -r test`·`pnpm build` 초록, PR CI 초록

## 5. 커밋 순서

1. 스펙 + PROGRESS — 스펙 커밋
2. red: `understandQuery` 테스트 + 스켈레톤 + `agent.test.ts` 0건 마이그레이션
3. green: `understandQuery` 구현 + `runAgent` 연결
4. 검증 → PR

## 6. 미해결 / 후속

- 실 LLM 견고화: 마크다운 감싼 JSON·"백만원"식 표기·여러 숫자 등 파싱 견고화(키 확보 시).
- 속성·카테고리 LLM 추출(예: "조용한"→noiseLevel 필터) — 후속.
- tool/function calling로 구조화 출력(자유 JSON 대신) — 후속.
