import { describe, it, expect } from "vitest";
import { ProductSchema, AgentEventSchema } from "@shopilot/schemas";
import type { Product, ChatRequest, AgentEvent } from "@shopilot/schemas";
import { createRunAgent } from "./agent";
import { MockDataSourceAdapter } from "./mock-data-source";
import { ProfileRegistry } from "./ports";
import type { LLMAdapter } from "./ports";
import { applianceProfile } from "./profiles/appliance";
import { MockLLMAdapter } from "./mock-llm";
import { capturingLLM, throwingLLM } from "./test-support/llm-doubles";

function deps(catalog: Product[], llm: LLMAdapter) {
  const profiles = new ProfileRegistry();
  profiles.register(applianceProfile);
  return { dataSource: new MockDataSourceAdapter(catalog), profiles, llm };
}

async function collect(stream: AsyncIterable<AgentEvent>): Promise<AgentEvent[]> {
  const out: AgentEvent[] = [];
  for await (const ev of stream) out.push(ev);
  return out;
}

const catalog: Product[] = [
  ProductSchema.parse({ id: "r1", title: "냉장고1", price: 900000, category: "appliance", attributes: { capacity: "300L", energyGrade: "1등급", noiseLevel: 35 } }),
  ProductSchema.parse({ id: "w1", title: "세탁기1", price: 500000, category: "appliance", attributes: { capacity: "12kg", energyGrade: "2등급", noiseLevel: 42 } }),
];

const req = (text: string, category?: string): ChatRequest => ({
  messages: [{ role: "user", content: text }],
  ...(category !== undefined ? { category } : {}),
});

describe("createRunAgent (LLM 추천)", () => {
  it("가전 질의: thinking→products→thinking→message_delta→done, 델타 합 = 목 LLM 텍스트", async () => {
    const run = createRunAgent(deps(catalog, new MockLLMAdapter("이걸 추천해요")));
    const evs = await collect(run(req("세탁기", "appliance")));
    expect(evs.map((e) => e.type)).toEqual(["thinking", "products", "thinking", "message_delta", "done"]);
    const text = evs.flatMap((e) => (e.type === "message_delta" ? [e.text] : [])).join("");
    expect(text).toBe("이걸 추천해요");
  });

  it("모든 이벤트가 AgentEventSchema를 통과하고 products는 appliance다", async () => {
    const run = createRunAgent(deps(catalog, new MockLLMAdapter("추천")));
    const evs = await collect(run(req("가전", "appliance")));
    for (const e of evs) expect(AgentEventSchema.safeParse(e).success).toBe(true);
    const p = evs.find((e) => e.type === "products");
    if (p?.type === "products") expect(p.items.every((x) => x.category === "appliance")).toBe(true);
  });

  it("LLM 실패 시 폴백: message_delta가 최저가(세탁기1) 포함, error 없음, 시퀀스 유지", async () => {
    const run = createRunAgent(deps(catalog, throwingLLM("iterate")));
    const evs = await collect(run(req("세탁기", "appliance")));
    expect(evs.map((e) => e.type)).toEqual(["thinking", "products", "thinking", "message_delta", "done"]);
    const text = evs.flatMap((e) => (e.type === "message_delta" ? [e.text] : [])).join("");
    expect(text).toContain("세탁기1");
    expect(evs.some((e) => e.type === "error")).toBe(false);
  });

  it("0건: thinking→message→done(없음), understandQuery로 llm 1회만(recommend 미호출)", async () => {
    const llm = capturingLLM([{ type: "text", text: "x" }]);
    const run = createRunAgent(deps([], llm));
    const evs = await collect(run(req("없는상품", "appliance")));
    expect(evs.map((e) => e.type)).toEqual(["thinking", "message", "done"]);
    const msg = evs.find((e) => e.type === "message");
    if (msg?.type === "message") expect(msg.text).toContain("찾지 못했어요");
    // understandQuery가 검색 전 llm 1회 호출, recommend는 0건이라 미호출 → calls===1
    expect(llm.calls.length).toBe(1);
  });
});
