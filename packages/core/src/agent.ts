import type { AgentEvent, ChatRequest } from "@shopilot/schemas";
import type { RunAgentDeps } from "./ports";

/**
 * 단일 진입점 팩토리. 어댑터·레지스트리를 주입받아 파이프라인을 구동한다.
 * ⚠️ 외부 통합 시그니처 (req: ChatRequest) → AsyncIterable<AgentEvent> 는 잠긴 계약 — 변경 금지.
 */
export function createRunAgent(_deps: RunAgentDeps): (req: ChatRequest) => AsyncIterable<AgentEvent> {
  return (_req: ChatRequest): AsyncIterable<AgentEvent> => {
    throw new Error("미구현: createRunAgent");
  };
}

/**
 * 편의 팩토리(lazy) — 코어 내 목(MockDataSourceAdapter + 가전 프로파일)을 조립해 돌려준다.
 * const가 아니라 함수다 → import만으로 목이 인스턴스화되지 않는다(호출 시 조립). 서버가 컴포지션 루트.
 */
export function createDefaultRunAgent(): (req: ChatRequest) => AsyncIterable<AgentEvent> {
  throw new Error("미구현: createDefaultRunAgent");
}
