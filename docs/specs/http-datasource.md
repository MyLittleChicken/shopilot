# 스펙: 실데이터 어댑터 — HTTP 카탈로그 + selectDataSource

상태: 진행 중 · 브랜치: `feat/http-datasource`

## 1. 무엇을 / 왜

지금 데이터는 코어 내 목 카탈로그(`appliances`)뿐이다. 아키텍처는 "목 데이터로 먼저 동작시키고 **같은 인터페이스로 실데이터에 연결**"을 지향한다. 이 슬라이스는 `DataSourceAdapter` 뒤에 **실데이터 연결 어댑터(HTTP 카탈로그)**를 추가하고 서버가 env로 목↔실데이터를 고르게 한다. 실백엔드 없이도 가짜 fetch로 매핑·검증을 결정론적으로 테스트한다(실서버 라이브는 후순위). LLM provider처럼 데이터도 어댑터 뒤에서 교체 가능함을 실증.

## 2. 범위 경계

**in scope**
- `HttpDataSourceAdapter`(`DataSourceAdapter`) — 설정된 base URL의 카탈로그 API에 fetch
- `selectDataSource(env, fallback)` — `CATALOG_API_URL` 있으면 HTTP, 없으면 fallback(목)
- `apps/server`가 `selectDataSource(process.env, 목)`로 조립
- `.env.example`에 `CATALOG_API_URL`(서버 설정) 추가

**out of scope**
- 실제 카탈로그 백엔드 구현·라이브 검증(후순위, 가짜 fetch로 매핑 검증)
- Supabase/DB 직접 연동(같은 인터페이스로 후속), 페이지네이션·캐싱·검색 랭킹
- 응답 스키마 협상(고정 계약 가정)

## 3. 입출력과 계약

데이터 진실 원천은 `packages/schemas`의 `ProductSchema`/`ProductQuery`.

### 잠금 결정

- **D1 — `HttpDataSourceAdapter`**: `new HttpDataSourceAdapter({ baseUrl, fetchImpl? })`, `name="http"`. `fetchImpl ?? globalThis.fetch`(테스트 주입).
- **D2 — `search(query)`**: `GET {baseUrl}/products?q=&category=&budgetMax=&limit=`(있는 값만). 응답은 **product 객체의 JSON 배열**로 가정. 각 항목을 `ProductSchema.safeParse`로 검증해 **통과한 것만** 반환(이상 항목은 버림). 네트워크 예외·`res.ok===false`·JSON 파싱 실패·배열 아님 → `[]`(graceful, 0건 경로).
- **D3 — `getById(id)`**: `GET {baseUrl}/products/{id}`. `ProductSchema.safeParse` 통과 시 `Product`, `404`·예외·검증 실패 → `null`.
- **D4 — `selectDataSource(env, fallback)`**(core): `env.CATALOG_API_URL` 있으면 `new HttpDataSourceAdapter({ baseUrl })`(name="http"), 없으면 `fallback`. `env`는 `Record<string,string|undefined>`(process.env/테스트 객체). 서버가 fallback으로 목(`MockDataSourceAdapter(appliances)`)을 준다.

## 4. 수용 기준

`HttpDataSourceAdapter` (가짜 fetch, node)
- [ ] `search`가 `GET {baseUrl}/products`에 `q`·`category`·`budgetMax`·`limit` 쿼리로 호출한다
- [ ] 응답 JSON 배열에서 `ProductSchema` 통과 항목만 반환하고 **이상 항목은 버린다**
- [ ] `res.ok===false`·fetch throw·JSON 파싱 실패·배열 아님 → `[]`
- [ ] `getById`가 통과 시 `Product`, `404`·예외·검증 실패 → `null`
- [ ] `budgetMax` 없으면 쿼리에 budgetMax 미포함

`selectDataSource`
- [ ] `CATALOG_API_URL` 있으면 `name==="http"`
- [ ] 없으면 fallback(`name==="mock"`)을 그대로 반환

게이트
- [ ] `pnpm -r typecheck`·`pnpm -r test`·`pnpm build` 초록, PR CI 초록

## 5. 커밋 순서

1. 스펙 + PROGRESS + `.env.example` — 스펙 커밋
2. red: `HttpDataSourceAdapter`·`selectDataSource` 테스트 + 스켈레톤 + fetch 더블(test-support)
3. green: 구현
4. 연결: `apps/server`가 `selectDataSource` 사용
5. 검증 → PR

## 6. 미해결 / 후속

- 실제 카탈로그 백엔드·라이브 검증(키/URL 확보 시 스모크).
- Supabase/DB 직접 어댑터 — 같은 인터페이스로 후속.
- 페이지네이션·캐싱·검색 품질(랭킹) — 후속.
- 응답 스키마 버전 협상·매핑(실 API 모양이 ProductSchema와 다르면 매핑 계층) — 후속.
