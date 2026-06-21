import { describe, it, expect } from "vitest";
import { ProductSchema, AgentEventSchema } from "@shopilot/schemas";
import type { Product, ChatRequest, AgentEvent } from "@shopilot/schemas";
import { createRunAgent } from "./agent";
import { MockDataSourceAdapter } from "./mock-data-source";
import { ProfileRegistry } from "./ports";
import { applianceProfile } from "./profiles/appliance";

function profiles(): ProfileRegistry {
  const r = new ProfileRegistry();
  r.register(applianceProfile);
  return r;
}

async function collect(stream: AsyncIterable<AgentEvent>): Promise<AgentEvent[]> {
  const out: AgentEvent[] = [];
  for await (const ev of stream) out.push(ev);
  return out;
}

// w1, w2는 동점 최저가(500000) — 정의 순서상 w1이 선택돼야 한다(안정 정렬).
const catalog: Product[] = [
  ProductSchema.parse({ id: "r1", title: "냉장고1", price: 900000, category: "appliance", attributes: { capacity: "300L", energyGrade: "1", noiseLevel: 35 } }),
  ProductSchema.parse({ id: "w1", title: "세탁기1", price: 500000, category: "appliance", attributes: { capacity: "12kg", energyGrade: "2", noiseLevel: 42 } }),
  ProductSchema.parse({ id: "w2", title: "세탁기2", price: 500000, category: "appliance", attributes: { capacity: "10kg", energyGrade: "1", noiseLevel: 40 } }),
];

const req = (text: string, category?: string): ChatRequest => ({
  messages: [{ role: "user", content: text }],
  ...(category !== undefined ? { category } : {}),
});

describe("createRunAgent", () => {
  it("가전 질의에 thinking→products→message→done 순서로 방출한다", async () => {
    const run = createRunAgent({ dataSource: new MockDataSourceAdapter(catalog), profiles: profiles() });
    const evs = await collect(run(req("세탁기 추천", "appliance")));
    expect(evs.map((e) => e.type)).toEqual(["thinking", "products", "message", "done"]);
  });

  it("모든 이벤트가 AgentEventSchema를 통과하고 products.items가 ProductSchema·appliance를 만족한다", async () => {
    const run = createRunAgent({ dataSource: new MockDataSourceAdapter(catalog), profiles: profiles() });
    const evs = await collect(run(req("가전", "appliance")));
    for (const e of evs) expect(AgentEventSchema.safeParse(e).success).toBe(true);
    const products = evs.find((e) => e.type === "products");
    expect(products?.type).toBe("products");
    if (products?.type === "products") {
      expect(products.items.length).toBeGreaterThan(0);
      expect(products.items.every((p) => p.category === "appliance")).toBe(true);
      expect(products.items.every((p) => ProductSchema.safeParse(p).success)).toBe(true);
    }
  });

  it("동점 최저가에서 message가 언급하는 항목이 고정된다(정의 순서 첫 최소 = 세탁기1)", async () => {
    const run = createRunAgent({ dataSource: new MockDataSourceAdapter(catalog), profiles: profiles() });
    const evs = await collect(run(req("세탁기", "appliance")));
    const message = evs.find((e) => e.type === "message");
    if (message?.type === "message") expect(message.text).toContain("세탁기1");
  });

  it("message가 결정론적이다(동일 입력→동일 출력)", async () => {
    const run = createRunAgent({ dataSource: new MockDataSourceAdapter(catalog), profiles: profiles() });
    const a = await collect(run(req("가전", "appliance")));
    const b = await collect(run(req("가전", "appliance")));
    expect(a.find((e) => e.type === "message")).toEqual(b.find((e) => e.type === "message"));
  });

  it("0건이면 thinking→message→done(products 없음)이고 0건 message도 고정이다", async () => {
    const run = createRunAgent({ dataSource: new MockDataSourceAdapter([]), profiles: profiles() });
    const a = await collect(run(req("없는상품", "appliance")));
    expect(a.map((e) => e.type)).toEqual(["thinking", "message", "done"]);
    const b = await collect(run(req("없는상품", "appliance")));
    expect(a).toEqual(b);
  });
});
