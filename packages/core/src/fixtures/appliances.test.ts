import { describe, it, expect } from "vitest";
import { ProductSchema } from "@shopilot/schemas";
import { appliances } from "./appliances";

describe("가전 시드 픽스처", () => {
  it("6개 이상이다", () => {
    expect(appliances.length).toBeGreaterThanOrEqual(6);
  });

  it("모두 ProductSchema를 통과하고 category가 appliance다", () => {
    for (const p of appliances) {
      expect(ProductSchema.safeParse(p).success).toBe(true);
      expect(p.category).toBe("appliance");
    }
  });

  it("attributes 키(capacity·energyGrade·noiseLevel)를 가진다", () => {
    for (const p of appliances) {
      expect(p.attributes).toHaveProperty("capacity");
      expect(p.attributes).toHaveProperty("energyGrade");
      expect(p.attributes).toHaveProperty("noiseLevel");
    }
  });

  it("동점 가격 2건 이상을 포함한다(최저가 안정 정렬 회귀 방지)", () => {
    const prices = appliances.map((p) => p.price);
    const hasDup = prices.some((v, i) => prices.indexOf(v) !== i);
    expect(hasDup).toBe(true);
  });
});
