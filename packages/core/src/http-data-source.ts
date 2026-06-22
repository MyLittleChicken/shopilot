import type { Product, ProductQuery } from "@shopilot/schemas";
import type { DataSourceAdapter } from "./ports";

/**
 * 실데이터 연결 — 설정된 카탈로그 API에 fetch한다. 같은 DataSourceAdapter라 목과 교체 가능.
 * fetch 주입(테스트). 네트워크·검증 실패는 graceful([] / null). green에서 구현.
 */
export class HttpDataSourceAdapter implements DataSourceAdapter {
  readonly name = "http";
  constructor(private readonly opts: { baseUrl: string; fetchImpl?: typeof fetch }) {}

  async search(_query: ProductQuery): Promise<Product[]> {
    throw new Error("미구현: HttpDataSourceAdapter.search");
  }

  async getById(_id: string): Promise<Product | null> {
    throw new Error("미구현: HttpDataSourceAdapter.getById");
  }
}
