# 진행 현황

작업 추적 대시보드. **세부 태스크는 각 기능 스펙(`docs/specs/<기능>.md`)의 수용 기준에**, 시간순 이력은 git 히스토리에 둔다. 이 문서는 "지금 무엇에 집중하나 · 큰 마일스톤 · 스펙 인덱스"만 가볍게 유지한다(비대해지지 않게).

## 현재 집중

토큰 단위 스트리밍 — LLM 추천 멘트를 청크 단위로 흘려 타이핑처럼 점진 렌더(`AgentEvent`에 `message_delta` 추가, schemas→core→ui 가로지름). UI 폴리시(애니메이션·이미지)·확장 배치(ⓐ-ⓓ)는 `main`에 완성.

## 마일스톤

- [x] 프로젝트 기반 (모노레포 설정 · 문서 · 규칙 · 보안 훅 · 타입체크 CI)
- [x] 첫 수직 슬라이스 (계약 → 코어 → 서버 → UI → 연결)
- [~] 실제 LLM·데이터 어댑터 연동 — 추천·질의이해·provider 2종·데이터 2종 구현 완료, 라이브 키/백엔드 검증 후순위
- [ ] 카테고리 확장 · 배포 · UI 폴리시

## 스펙 인덱스

`docs/specs/`에 기능별 스펙을 추가하고 상태만 여기에 링크한다. 완료된 스펙은 `완료`로 표기한다.

| 스펙 | 상태 |
| --- | --- |
| [첫 수직 슬라이스(코어) — 가전 질의→목 상품 SSE](specs/first-slice-appliance-search.md) | 완료 (main) |
| [두 번째 슬라이스(UI) — ChatPanel SSE 소비·상품 렌더](specs/second-slice-ui.md) | 완료 (main) |
| [LLM 추천 근거 생성 — 비교 기준 기반 추천 메시지](specs/third-slice-llm-recommendation.md) | 완료 (main) |
| [OpenAIAdapter + provider 선택 일반화](specs/openai-adapter.md) | 완료 (main) |
| [위젯 Shadow DOM 스타일링](specs/widget-styling.md) | 완료 (main) |
| [실데이터 어댑터 — HTTP 카탈로그 + selectDataSource](specs/http-datasource.md) | 완료 (main) |
| [LLM 질의 이해 — 자연어에서 예산(budgetMax) 추출](specs/llm-query-understanding.md) | 완료 (main) |
| [UI 폴리시 — 애니메이션·로딩 모션·상품 이미지](specs/ui-polish.md) | 완료 (main) |
| [토큰 단위 스트리밍 — 추천 멘트 타이핑](specs/token-streaming.md) | 진행 중 |
