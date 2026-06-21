import type { AgentEvent, ChatRequest } from "@shopilot/schemas";
import type { RunAgentDeps } from "./ports";
import { ProfileRegistry } from "./ports";
import { extractQuery } from "./extract-query";
import { recommend } from "./recommend";
import { MockDataSourceAdapter } from "./mock-data-source";
import { appliances } from "./fixtures/appliances";
import { applianceProfile } from "./profiles/appliance";
import { MockLLMAdapter } from "./mock-llm";

/**
 * 단일 진입점 팩토리. 어댑터·레지스트리를 주입받아 파이프라인을 구동한다.
 * 흐름: extractQuery → 프로파일 선택 → search → thinking·products·message·done 순차 방출.
 * ⚠️ 외부 통합 시그니처 (req: ChatRequest) → AsyncIterable<AgentEvent> 는 잠긴 계약 — 변경 금지.
 */
export function createRunAgent(deps: RunAgentDeps): (req: ChatRequest) => AsyncIterable<AgentEvent> {
  return async function* (req: ChatRequest): AsyncIterable<AgentEvent> {
    const query = extractQuery(req.messages, req.category);
    const profile = query.category !== undefined ? deps.profiles.get(query.category) : null;
    yield {
      type: "thinking",
      text: profile ? `${profile.category} 카테고리에서 조건을 살펴보고 있어요…` : "상품을 찾고 있어요…",
    };

    const items = await deps.dataSource.search(query);
    if (items.length === 0) {
      yield { type: "message", text: "조건에 맞는 상품을 찾지 못했어요. 예산이나 조건을 바꿔서 다시 말씀해 주세요." };
      yield { type: "done" };
      return;
    }

    yield { type: "products", items };
    yield { type: "thinking", text: "후보를 비교해 추천 근거를 정리하고 있어요…" };

    // 추천 근거는 LLM이 생성(비교 기준·가격·질의). 실패·빈응답이면 recommend 내부에서 결정론 폴백.
    const text = await recommend(deps.llm, profile ?? applianceProfile, query, items);
    yield { type: "message", text };
    yield { type: "done" };
  };
}

/**
 * 편의 팩토리(lazy) — 코어 내 목(MockDataSourceAdapter + 가전 프로파일)을 조립해 돌려준다.
 * const가 아니라 함수다 → import만으로 목이 인스턴스화되지 않는다(호출 시 조립). 서버가 컴포지션 루트.
 */
export function createDefaultRunAgent(): (req: ChatRequest) => AsyncIterable<AgentEvent> {
  const profiles = new ProfileRegistry();
  profiles.register(applianceProfile);
  return createRunAgent({ dataSource: new MockDataSourceAdapter(appliances), profiles, llm: new MockLLMAdapter() });
}
