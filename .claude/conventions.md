# 코딩 컨벤션

- TypeScript strict를 모든 패키지에 적용한다.
- 주변 코드의 네이밍·스타일·주석 밀도에 맞춰 쓴다. 새 패턴을 함부로 들이지 않는다.
- 타입 전용 import는 `import type`을 쓴다(verbatimModuleSyntax).
- 어댑터 경계(LLM·데이터·파이프라인)에는 인터페이스를 먼저 정의하고 구현을 끼운다.
- 데이터 모양은 `packages/schemas`의 Zod 스키마로 정의하고, 타입은 `z.infer`로 파생한다. 같은 모양을 두 번 정의하지 않는다.
- UI 컴포넌트는 `packages/ui`에만 만들고 web·widget이 공유한다. 컨테이너 쿼리(`@container`)로 작성해 넓은 화면과 좁은 위젯 패널 양쪽에 대응한다.
- 패키지 간 의존은 `workspace:*`로 연결한다.
- 배열 인덱스 접근은 `undefined` 가능성을 고려한다(`noUncheckedIndexedAccess`).
- 한국어로 소통하고, 주석도 한국어로 둔다.
