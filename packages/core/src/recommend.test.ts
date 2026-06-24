import { describe, it, expect } from "vitest";
import { ProductSchema, ProductQuerySchema } from "@shopilot/schemas";
import type { Product } from "@shopilot/schemas";
import { recommend, recommendStream } from "./recommend";
import { applianceProfile } from "./profiles/appliance";
import { capturingLLM, throwingLLM } from "./test-support/llm-doubles";

async function collectStream(s: AsyncIterable<string>): Promise<string> {
  let out = "";
  for await (const c of s) out += c;
  return out;
}

const products: Product[] = [
  ProductSchema.parse({ id: "r1", title: "냉장고1", price: 900000, category: "appliance", attributes: { capacity: "300L", energyGrade: "1등급", noiseLevel: 35 } }),
  ProductSchema.parse({ id: "w1", title: "세탁기1", price: 500000, category: "appliance", attributes: { capacity: "12kg", energyGrade: "2등급", noiseLevel: 42 } }),
];
const query = ProductQuerySchema.parse({ text: "조용한 세탁기", category: "appliance" });

describe("recommend", () => {
  it("text 청크를 순서대로 누적해 반환한다", async () => {
    const llm = capturingLLM([
      { type: "text", text: "이 " },
      { type: "text", text: "제품을 " },
      { type: "text", text: "추천해요" },
    ]);
    expect(await recommend(llm, applianceProfile, query, products)).toBe("이 제품을 추천해요");
  });

  it("tool_call 청크는 무시하고 text만 누적한다", async () => {
    const llm = capturingLLM([
      { type: "text", text: "A" },
      { type: "tool_call", name: "search", args: {} },
      { type: "text", text: "B" },
    ]);
    expect(await recommend(llm, applianceProfile, query, products)).toBe("AB");
  });

  it("프롬프트에 systemPrompt·상품 제목·가격·compareKeys 값이 들어간다", async () => {
    const llm = capturingLLM([{ type: "text", text: "ok" }]);
    await recommend(llm, applianceProfile, query, products);
    const input = llm.calls[0]!;
    expect(input.system ?? "").toContain(applianceProfile.systemPrompt);
    const userText = input.messages.map((m) => m.content).join("\n");
    expect(userText).toContain("세탁기1");
    expect(userText).toContain("500000");
    expect(userText).toContain("12kg");
  });

  it("동일 products면 동일 프롬프트(결정론)", async () => {
    const a = capturingLLM([{ type: "text", text: "x" }]);
    const b = capturingLLM([{ type: "text", text: "x" }]);
    await recommend(a, applianceProfile, query, products);
    await recommend(b, applianceProfile, query, products);
    expect(a.calls[0]).toEqual(b.calls[0]);
  });

  it(".stream() 즉시 throw 시 폴백(최저가) 반환, throw 안 함", async () => {
    expect(await recommend(throwingLLM("call"), applianceProfile, query, products)).toContain("세탁기1");
  });

  it("이터레이션 중 throw 시에도 폴백 반환", async () => {
    expect(await recommend(throwingLLM("iterate"), applianceProfile, query, products)).toContain("세탁기1");
  });

  it("누적 텍스트가 공백뿐이면 폴백 반환", async () => {
    const llm = capturingLLM([{ type: "text", text: "   " }]);
    expect(await recommend(llm, applianceProfile, query, products)).toContain("세탁기1");
  });
});

describe("recommendStream", () => {
  it("text 청크를 순서대로 yield한다(tool_call 무시)", async () => {
    const llm = capturingLLM([
      { type: "text", text: "이 " },
      { type: "tool_call", name: "x", args: {} },
      { type: "text", text: "제품" },
    ]);
    expect(await collectStream(recommendStream(llm, applianceProfile, query, products))).toBe("이 제품");
  });

  it("실패/빈응답이면 폴백을 yield한다", async () => {
    expect(await collectStream(recommendStream(throwingLLM("iterate"), applianceProfile, query, products))).toContain("세탁기1");
    expect(await collectStream(recommendStream(capturingLLM([]), applianceProfile, query, products))).toContain("세탁기1");
  });
});
