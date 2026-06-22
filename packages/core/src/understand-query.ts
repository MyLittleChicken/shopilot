import type { ChatMessage, ProductQuery } from "@shopilot/schemas";
import type { LLMAdapter } from "./ports";

/**
 * 결정론 extractQuery base에 LLM이 추출한 예산(budgetMax)을 병합한다.
 * 실패·이상 출력이면 base 그대로(budgetMax undefined) 폴백. ⚠️ 절대 throw하지 않는다.
 * green에서 구현.
 */
export async function understandQuery(
  _llm: LLMAdapter,
  _messages: ChatMessage[],
  _category?: string,
): Promise<ProductQuery> {
  throw new Error("미구현: understandQuery");
}
