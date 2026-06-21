import type { Product, ProductQuery } from "@shopilot/schemas";
import type { CategoryProfile, LLMAdapter } from "./ports";

/**
 * LLM으로 추천 근거를 생성한다. 비교 기준(compareKeys)·가격·질의를 프롬프트에 담아
 * llm.stream의 text 청크를 누적한다. 실패·빈응답이면 내부 폴백(결정론 규칙 멘트)을 반환한다.
 * ⚠️ 절대 throw하지 않는다 — .stream() 호출·이터레이션 두 실패를 한 try로 잡고 폴백한다.
 */
export async function recommend(
  llm: LLMAdapter,
  profile: CategoryProfile,
  query: ProductQuery,
  products: Product[],
): Promise<string> {
  const system =
    `${profile.systemPrompt}\n\n` +
    `비교 기준(${profile.compareKeys.join("·")})과 가격으로 후보를 비교하고, ` +
    `사용자 질의(용도·예산)에 가장 맞는 1~2개를 근거와 함께 간결한 한국어로 추천하세요.`;
  const userContent = buildUserContent(profile, query, products);

  try {
    let acc = "";
    for await (const chunk of llm.stream({ messages: [{ role: "user", content: userContent }], system })) {
      if (chunk.type === "text") acc += chunk.text;
    }
    if (acc.trim().length > 0) return acc;
  } catch {
    // 폴백으로 떨어진다
  }
  return fallback(products);
}

/** 결정론 프롬프트 본문. attributes 값은 unknown이라 string/number만 안전하게 포함. */
function buildUserContent(profile: CategoryProfile, query: ProductQuery, products: Product[]): string {
  const lines = products.map((p) => {
    const attrs = profile.compareKeys
      .map((k) => {
        const v = p.attributes[k];
        return typeof v === "string" || typeof v === "number" ? `${k}=${String(v)}` : null;
      })
      .filter((s): s is string => s !== null)
      .join(" ");
    return `- ${p.title} · ${p.price}원${attrs ? ` · ${attrs}` : ""}`;
  });
  return `사용자 질의: ${query.text}\n\n후보 상품:\n${lines.join("\n")}`;
}

/** 결정론 폴백 — 최저가 한 줄(동점이면 정의 순서 첫). LLM 실패·빈응답 시 사용. */
function fallback(products: Product[]): string {
  let cheapest: Product | undefined;
  for (const p of products) {
    if (cheapest === undefined || p.price < cheapest.price) cheapest = p;
  }
  if (cheapest === undefined) return "조건에 맞는 상품을 찾지 못했어요.";
  return `조건에 맞는 상품 ${products.length}개를 찾았어요. 그중 가장 저렴한 건 ${cheapest.title}(${cheapest.price.toLocaleString("ko-KR")}원)이에요.`;
}
