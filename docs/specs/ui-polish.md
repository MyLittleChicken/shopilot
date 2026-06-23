# 스펙: UI 폴리시 — 등장 애니메이션 · 로딩 모션 · 상품 이미지

상태: 진행 중 · 브랜치: `feat/ui-polish`

## 1. 무엇을 / 왜

지금 UI는 동작은 하지만 시각 마감이 없다 — 애니메이션·트랜지션 0, 로딩은 정적 텍스트 한 줄, 상품 카드에 이미지 슬롯이 없다(`imageUrl`은 스키마에만 존재). 이 슬라이스는 "살아있는" 느낌을 주는 **최소 시각 폴리시**를 입힌다: 메시지·카드 등장 애니메이션, 애니메이션 로딩 인디케이터, 상품 이미지 슬롯(없으면 플레이스홀더). 접근성 위해 `prefers-reduced-motion`을 존중한다. 전부 `packages/ui`(스타일+컴포넌트) 안에서, 계약·파이프라인 무변경.

## 2. 범위 경계

**in scope**
- `shopilotStyles`에 `@keyframes`(등장 rise·로딩 blink) + `prefers-reduced-motion` 가드
- 메시지(`.shopilot-msg`)·상품 카드(`.shopilot-card`) 등장 애니메이션
- 로딩 인디케이터를 정적 텍스트 → **점 3개 애니메이션**(`role="status"` 유지)
- `ProductCard`에 이미지 슬롯(`.shopilot-card__media`) — `imageUrl` 있으면 `<img>`, 없으면 플레이스홀더

**out of scope**
- 토큰 단위 스트리밍(타이핑 효과) — `AgentEvent`/`useChat` 변경 필요, 후속
- 디자인 시스템·테마·다크모드, 캐릭터 브랜딩(`docs/character-concept`) — 후속
- 실제 상품 이미지 URL 시드 주입(플레이스홀더로 충분), 스켈레톤 로딩

## 3. 입출력과 계약

`Product.imageUrl`은 `z.string().url().optional()`(이미 존재). 새 계약 없음. 파일 `packages/ui/src/{styles,product-card,chat-panel}`.

### 잠금 결정

- **D1 — 애니메이션**: `@keyframes shopilot-rise`(opacity 0→1 + translateY)로 `.shopilot-msg`·`.shopilot-card` 등장. `@keyframes shopilot-blink`로 로딩 점. 모두 스코프드 `shopilot-*` 하위.
- **D2 — 접근성**: `@media (prefers-reduced-motion: reduce)`에서 해당 애니메이션을 `none`으로 끈다.
- **D3 — 로딩**: `.shopilot-loading`을 점 3개(`<span class="dot">×3`)로 바꾸고 `role="status"`·`aria-label`을 유지(기존 로딩 테스트 무변경 계약).
- **D4 — 이미지**: `ProductCard`가 `.shopilot-card__media`를 카드 상단에 렌더 — `imageUrl !== undefined`면 `<img src alt loading="lazy">`, 아니면 `.shopilot-card__placeholder`(제목 첫 글자). `imageUrl`은 `url()` 검증된 값만 들어옴(스키마 보장).

## 4. 수용 기준

- [ ] `shopilotStyles`에 `@keyframes`와 `prefers-reduced-motion`이 포함된다
- [ ] `ProductCard`가 `.shopilot-card__media`를 렌더한다
- [ ] `imageUrl` 있으면 그 `src`의 `<img>`, 없으면 `<img>` 없이 플레이스홀더를 렌더한다
- [ ] 로딩 인디케이터가 `role="status"`를 유지한다(기존 로딩 on/off 테스트 그대로 통과)
- [ ] 기존 ChatPanel/ProductCard 렌더·동작 테스트가 그대로 통과(무변경 계약)
- [ ] `pnpm -r typecheck`·`pnpm -r test`·`pnpm build` 초록, PR CI 초록

## 5. 커밋 순서

1. 스펙 + PROGRESS — 스펙 커밋
2. red: styles에 @keyframes·prefers-reduced-motion 단언 + ProductCard 이미지/플레이스홀더 테스트
3. green: `styles.ts`(애니메이션) + `ProductCard`(이미지 슬롯) + `ChatPanel`(로딩 점)
4. 검증 → PR

## 6. 미해결 / 후속

- 토큰 단위 스트리밍(타이핑) — AgentEvent에 점진 텍스트 표면 추가 필요.
- 캐릭터 브랜딩·디자인 시스템·다크모드 — 후속.
- 상품 이미지 실 URL·스켈레톤 로딩·이미지 에러 폴백 — 후속.
