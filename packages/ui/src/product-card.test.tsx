import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ProductSchema } from "@shopilot/schemas";
import { ProductCard } from "./product-card";

afterEach(cleanup);

const product = ProductSchema.parse({
  id: "w1",
  title: "드럼 세탁기",
  brand: "워시킹",
  price: 690000,
  rating: 4.3,
  category: "appliance",
  attributes: { capacity: "12kg", energyGrade: "1등급", noiseLevel: 42 },
});

describe("ProductCard", () => {
  it("제목과 가격을 보여준다", () => {
    render(<ProductCard product={product} />);
    expect(screen.getByText("드럼 세탁기")).toBeTruthy();
    expect(screen.getByText(/690,000/)).toBeTruthy();
  });

  it("브랜드와 평점을 보여준다", () => {
    render(<ProductCard product={product} />);
    expect(screen.getByText(/워시킹/)).toBeTruthy();
    expect(screen.getByText(/4\.3/)).toBeTruthy();
  });

  it("attributes(string/number)를 제네릭으로 보여준다", () => {
    render(<ProductCard product={product} />);
    expect(screen.getByText(/12kg/)).toBeTruthy();
    expect(screen.getByText(/1등급/)).toBeTruthy();
    expect(screen.getByText(/42/)).toBeTruthy();
  });

  it("imageUrl 있으면 <img>, 없으면 플레이스홀더(이미지 슬롯)를 렌더한다", () => {
    const withImg = ProductSchema.parse({ id: "i", title: "이미지상품", price: 1000, category: "appliance", imageUrl: "https://example.com/a.png" });
    const { container } = render(<ProductCard product={withImg} />);
    expect(container.querySelector(".shopilot-card__media img")?.getAttribute("src")).toBe("https://example.com/a.png");

    const { container: c2 } = render(<ProductCard product={product} />);
    expect(c2.querySelector(".shopilot-card__media")).toBeTruthy();
    expect(c2.querySelector(".shopilot-card__media img")).toBeNull();
  });
});
