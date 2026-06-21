import type { Product, ProductQuery } from "@shopilot/schemas";
import type { DataSourceAdapter } from "./ports";

/** 메모리 카탈로그 기반 목 데이터 소스. 같은 인터페이스로 추후 실데이터로 교체한다. */
export class MockDataSourceAdapter implements DataSourceAdapter {
  readonly name = "mock";
  constructor(private readonly catalog: Product[]) {}

  /** category 일치 → price ≤ budgetMax(있으면) → 정의 순서로 최대 limit개. 정렬하지 않는다. */
  async search(query: ProductQuery): Promise<Product[]> {
    return this.catalog
      .filter((p) => query.category === undefined || p.category === query.category)
      .filter((p) => query.budgetMax === undefined || p.price <= query.budgetMax)
      .slice(0, query.limit);
  }

  async getById(id: string): Promise<Product | null> {
    return this.catalog.find((p) => p.id === id) ?? null;
  }
}
