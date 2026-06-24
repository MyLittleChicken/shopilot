import type { Product, ProductQuery } from "@shopilot/schemas";
import type { CategoryProfile, LLMAdapter } from "./ports";

/**
 * 추천 근거를 청크 단위로 yield(타이핑 스트리밍용). llm.stream의 text 청크를 그대로 흘린다.
 * .stream 호출·이터레이션 실패는 catch하고, 누적 텍스트가 비면 폴백을 1청크로 yield. ⚠️ throw 안 함.
 */
export async function* recommendStream(
  llm: LLMAdapter,
  profile: CategoryProfile,
  query: ProductQuery,
  products: Product[],
): AsyncIterable<string> {
  const system =
    `${profile.systemPrompt}\n\n` +
    `비교 기준(${profile.compareKeys.join("·")})과 가격으로 후보를 비교하고, ` +
    `사용자 질의(용도·예산)에 가장 맞는 1~2개를 근거와 함께 간결한 한국어로 추천하세요.`;
  const userContent = buildUserContent(profile, query, products);

  let acc = "";
  try {
    for await (const chunk of llm.stream({ messages: [{ role: "user", content: userContent }], system })) {
      if (chunk.type === "text" && chunk.text.length > 0) {
        acc += chunk.text;
        yield chunk.text;
      }
    }
  } catch {
    // 폴백으로 떨어진다
  }
  if (acc.trim().length === 0) yield fallback(products);
}

/** recommendStream을 합친 편의 래퍼(비스트리밍 소비처·테스트용). */
export async function recommend(
  llm: LLMAdapter,
  profile: CategoryProfile,
  query: ProductQuery,
  products: Product[],
): Promise<string> {
  let out = "";
  for await (const chunk of recommendStream(llm, profile, query, products)) out += chunk;
  return out;
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
