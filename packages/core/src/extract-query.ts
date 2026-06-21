import { ProductQuerySchema } from "@shopilot/schemas";
import type { ChatMessage, ProductQuery } from "@shopilot/schemas";

/**
 * ChatRequest.messages[] → ProductQuery 결정론적 매핑.
 * 마지막 user 메시지 content(trim)를 질의로 삼는다. 없으면 마지막 메시지로 합류.
 * 반환은 ProductQuerySchema.parse 결과(limit 기본 10 채워짐). LLM·예산 추출은 비범위.
 */
export function extractQuery(messages: ChatMessage[], category?: string): ProductQuery {
  // 뒤에서부터 user 탐색 → 미발견 시 마지막 메시지. noUncheckedIndexedAccess 가드(비-널 단언 금지).
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const source = lastUser ?? messages[messages.length - 1];
  const text = (source?.content ?? "").trim();
  return ProductQuerySchema.parse({ text, category: category ?? "appliance", budgetMax: undefined });
}
