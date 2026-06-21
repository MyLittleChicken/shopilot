import type { Product, ProductQuery } from "@shopilot/schemas";
import type { CategoryProfile, LLMAdapter } from "./ports";

/**
 * LLM으로 추천 근거를 생성한다. 비교 기준(compareKeys)·가격·질의를 프롬프트에 담아
 * llm.stream의 text 청크를 누적한다. 실패·빈응답이면 내부 폴백(결정론 규칙 멘트)을 반환한다.
 * ⚠️ 절대 throw하지 않는다(폴백). green에서 구현.
 */
export async function recommend(
  _llm: LLMAdapter,
  _profile: CategoryProfile,
  _query: ProductQuery,
  _products: Product[],
): Promise<string> {
  throw new Error("미구현: recommend");
}
