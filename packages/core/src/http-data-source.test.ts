import { describe, it, expect } from "vitest";
import { ProductQuerySchema } from "@shopilot/schemas";
import { HttpDataSourceAdapter } from "./http-data-source";
import { jsonFetch, failingFetch, throwFetch } from "./test-support/fetch-doubles";

const valid = { id: "a", title: "A", price: 1000, category: "appliance" };
const valid2 = { id: "b", title: "B", price: 2000, category: "appliance" };
const invalid = { id: "c", title: "C" }; // price·category 누락 → ProductSchema 실패

const q = ProductQuerySchema.parse({ text: "세탁기", category: "appliance", budgetMax: 1500 });
const ds = (fetchImpl: typeof fetch) => new HttpDataSourceAdapter({ baseUrl: "http://cat", fetchImpl });

describe("HttpDataSourceAdapter.search", () => {
  it("GET /products에 q·category·budgetMax·limit 쿼리로 호출한다", async () => {
    const fx = jsonFetch([valid]);
    await ds(fx.fetchImpl).search(q);
    const url = fx.calls[0] ?? "";
    expect(url).toContain("http://cat/products?");
    expect(url).toContain("q=");
    expect(url).toContain("category=appliance");
    expect(url).toContain("budgetMax=1500");
    expect(url).toContain("limit=");
  });

  it("ProductSchema 통과 항목만 반환하고 이상 항목은 버린다", async () => {
    const fx = jsonFetch([valid, invalid, valid2]);
    const res = await ds(fx.fetchImpl).search(q);
    expect(res.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("budgetMax 없으면 쿼리에 미포함", async () => {
    const fx = jsonFetch([]);
    await ds(fx.fetchImpl).search(ProductQuerySchema.parse({ text: "x", category: "appliance" }));
    expect(fx.calls[0] ?? "").not.toContain("budgetMax");
  });

  it("res.ok=false / fetch throw / 배열 아님 → []", async () => {
    expect(await ds(failingFetch(500)).search(q)).toEqual([]);
    expect(await ds(throwFetch()).search(q)).toEqual([]);
    expect(await ds(jsonFetch({ not: "array" }).fetchImpl).search(q)).toEqual([]);
  });
});

describe("HttpDataSourceAdapter.getById", () => {
  it("통과 시 Product, 404·검증 실패 → null", async () => {
    expect((await ds(jsonFetch(valid).fetchImpl).getById("a"))?.id).toBe("a");
    expect(await ds(failingFetch(404)).getById("zzz")).toBeNull();
    expect(await ds(jsonFetch(invalid).fetchImpl).getById("c")).toBeNull();
  });
});
