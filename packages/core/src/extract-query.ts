import type { ChatMessage, ProductQuery } from "@shopilot/schemas";

/**
 * ChatRequest.messages[] → ProductQuery 결정론적 매핑.
 * 반환은 ProductQuerySchema.parse 결과(limit 기본 10 채워짐). LLM 추출은 비범위.
 */
export function extractQuery(_messages: ChatMessage[], _category?: string): ProductQuery {
  throw new Error("미구현: extractQuery");
}
