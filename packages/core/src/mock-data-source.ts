import type { Product, ProductQuery } from "@shopilot/schemas";
import type { DataSourceAdapter } from "./ports";

/** 메모리 카탈로그 기반 목 데이터 소스. 같은 인터페이스로 추후 실데이터로 교체한다. */
export class MockDataSourceAdapter implements DataSourceAdapter {
  readonly name = "mock";
  constructor(private readonly catalog: Product[]) {}

  async search(_query: ProductQuery): Promise<Product[]> {
    throw new Error("미구현: MockDataSourceAdapter.search");
  }

  async getById(_id: string): Promise<Product | null> {
    throw new Error("미구현: MockDataSourceAdapter.getById");
  }
}
