import { describe, it, expect } from "vitest";
import { ProductSchema, ProductQuerySchema } from "@shopilot/schemas";
import type { Product } from "@shopilot/schemas";
import { MockDataSourceAdapter } from "./mock-data-source";

// 자체 완결 인라인 카탈로그 — 가전 시드와 독립적으로 어댑터 로직만 결정론적으로 검증.
const catalog: Product[] = [
  ProductSchema.parse({ id: "a", title: "A", price: 1000, category: "appliance" }),
  ProductSchema.parse({ id: "b", title: "B", price: 2000, category: "appliance" }),
  ProductSchema.parse({ id: "c", title: "C", price: 3000, category: "appliance" }),
  ProductSchema.parse({ id: "d", title: "D", price: 1500, category: "tv" }),
];

describe("MockDataSourceAdapter.search", () => {
  it("category 불일치 항목을 제외하고 정의 순서를 유지한다", async () => {
    const ds = new MockDataSourceAdapter(catalog);
    const res = await ds.search(ProductQuerySchema.parse({ text: "x", category: "appliance" }));
    expect(res.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("budgetMax 경계: price==budgetMax 포함, 초과 제외", async () => {
    const ds = new MockDataSourceAdapter(catalog);
    const res = await ds.search(ProductQuerySchema.parse({ text: "x", category: "appliance", budgetMax: 2000 }));
    expect(res.map((p) => p.id)).toEqual(["a", "b"]); // 2000 포함, 3000 제외
  });

  it("limit < 매칭 수면 정의 순서 앞 limit개를 준다", async () => {
    const ds = new MockDataSourceAdapter(catalog);
    const res = await ds.search(ProductQuerySchema.parse({ text: "x", category: "appliance", limit: 2 }));
    expect(res.map((p) => p.id)).toEqual(["a", "b"]);
  });
});

describe("MockDataSourceAdapter.getById", () => {
  it("존재 id에 Product, 없으면 null", async () => {
    const ds = new MockDataSourceAdapter(catalog);
    expect((await ds.getById("a"))?.id).toBe("a");
    expect(await ds.getById("zzz")).toBeNull();
  });
});
