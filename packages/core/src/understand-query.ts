import { ProductQuerySchema } from "@shopilot/schemas";
import type { ChatMessage, ProductQuery } from "@shopilot/schemas";
import type { LLMAdapter } from "./ports";
import { extractQuery } from "./extract-query";

/**
 * 결정론 extractQuery base에 LLM이 추출한 예산(budgetMax)을 병합한다.
 * 실패·이상 출력이면 base 그대로(budgetMax undefined) 폴백. ⚠️ 절대 throw하지 않는다.
 */
export async function understandQuery(
  llm: LLMAdapter,
  messages: ChatMessage[],
  category?: string,
): Promise<ProductQuery> {
  const base = extractQuery(messages, category);
  const budgetMax = await extractBudget(llm, base.text);
  if (budgetMax === null) return base;
  return ProductQuerySchema.parse({ ...base, budgetMax });
}

/** LLM에 예산 상한 추출을 요청해 양의 정수면 반환, 아니면 null(폴백). 실패는 모두 null. */
async function extractBudget(llm: LLMAdapter, text: string): Promise<number | null> {
  const system =
    '사용자 질의에서 예산 상한(KRW 정수)을 추출한다. 예산 언급이 없으면 null. ' +
    '반드시 JSON만 출력: {"budgetMax": number|null}';
  try {
    let acc = "";
    for await (const chunk of llm.stream({ messages: [{ role: "user", content: text }], system })) {
      if (chunk.type === "text") acc += chunk.text;
    }
    const parsed: unknown = JSON.parse(acc.trim());
    if (typeof parsed === "object" && parsed !== null) {
      const v = (parsed as { budgetMax?: unknown }).budgetMax;
      if (typeof v === "number" && Number.isInteger(v) && v > 0) return v;
    }
    return null;
  } catch {
    return null;
  }
}
