# 스펙: 위젯 Shadow DOM 스타일링 — 컴포넌트가 스타일을 동반 렌더

상태: 진행 중 · 브랜치: `feat/widget-styling`

## 1. 무엇을 / 왜

UI는 `shopilot-*` 스코프드 클래스를 쓰지만 **CSS가 어디에도 없어** 무스타일로 렌더된다. 특히 위젯은 Shadow DOM에 마운트돼 외부/전역 CSS가 경계를 넘지 못하므로 스타일이 전혀 안 먹는다(2번째 슬라이스 §6 이월). 이 슬라이스는 **`ChatPanel`이 자기 스타일(`<style>`)을 동반 렌더**해 마운트되는 루트(Shadow DOM이든 light DOM이든)에 스타일이 항상 따라가게 한다 — web·widget이 **같은 컴포넌트 한 벌**로 스타일까지 공유. 컨테이너 쿼리로 넓은 웹/좁은 위젯 양쪽 대응.

## 2. 범위 경계

**in scope**
- `packages/ui/src/styles.ts` — `shopilotStyles` CSS 문자열(스코프드 `shopilot-*` + `@container`)
- `ChatPanel`이 `<style>{shopilotStyles}</style>`를 동반 렌더하고 패널에 `container-type` 적용
- `ProductCard`·메시지·입력·로딩의 최소·정돈된 스타일
- 위젯은 코드 변경 없이 자동 스타일링(ChatPanel이 shadow 안에 style을 함께 렌더)

**out of scope**
- 디자인 시스템·토큰·테마, 다크모드, 애니메이션
- CSP(인라인 style 차단 환경) 대응 — §6 후속
- 외부 폰트·아이콘, 이미지 렌더(ProductCard imageUrl)

## 3. 입출력과 계약

- **D1 — 스타일 동반 렌더**: `ChatPanel`의 첫 자식으로 `<style>{shopilotStyles}</style>`를 둔다. 마운트 루트가 Shadow DOM이면 style도 shadow 안에 들어가 적용된다. 전역 CSS에 의존하지 않는다.
- **D2 — 스코프**: 모든 규칙은 `shopilot-*` 클래스 선택자로 한정해 외부 사이트 스타일과 충돌하지 않는다. 태그 전역 선택자(`button`, `input` 등 단독)는 쓰지 않는다.
- **D3 — 반응형**: `.shopilot-panel`에 `container-type: inline-size`를 주고 상품 그리드는 `@container`로 폭에 따라 열 수를 바꾼다(좁은 위젯=1열, 넓은 웹=2~3열).
- **D4 — 무변경 계약**: `ChatPanel`/`ProductCard`의 props·동작은 그대로. 위젯·웹 연결 코드 변경 없음.

## 4. 수용 기준

- [ ] `ChatPanel`이 `<style>` 요소를 렌더하고 그 내용에 `.shopilot-panel`·`.shopilot-card` 등 스코프드 선택자가 포함된다
- [ ] `<style>` 내용에 전역 태그 단독 선택자가 없다(스코프 한정 — `shopilot-` 포함 규칙만)
- [ ] `shopilotStyles`에 `@container`와 `container-type`이 포함된다(반응형)
- [ ] 기존 ChatPanel/ProductCard 렌더·동작 테스트가 그대로 통과(무변경 계약)
- [ ] `pnpm -r typecheck`·`pnpm -r test`·`pnpm build`(web·widget) 초록, PR CI 초록

## 5. 커밋 순서

1. 스펙 + PROGRESS — 스펙 커밋
2. red: ChatPanel이 스타일을 동반 렌더한다는 테스트
3. green: `styles.ts` + `ChatPanel`에 `<style>` 동반 렌더, `ProductCard` 스타일 클래스 정리
4. 검증 → PR

## 6. 미해결 / 후속

- **CSP 대응**: 인라인 `<style>`/`style` 차단 환경에선 nonce 또는 adoptedStyleSheets(Constructable Stylesheets) 경로 필요 — 후속.
- 디자인 시스템·테마·다크모드, 캐릭터 브랜딩(`docs/character-concept`) 반영 — 후속.
