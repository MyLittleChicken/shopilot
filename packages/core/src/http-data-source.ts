import { ProductSchema } from "@shopilot/schemas";
import type { Product, ProductQuery } from "@shopilot/schemas";
import type { DataSourceAdapter } from "./ports";

/**
 * 실데이터 연결 — 설정된 카탈로그 API에 fetch한다. 같은 DataSourceAdapter라 목과 교체 가능.
 * 응답 항목은 ProductSchema로 검증해 통과한 것만 쓴다. 네트워크·검증 실패는 graceful([] / null).
 */
export class HttpDataSourceAdapter implements DataSourceAdapter {
  readonly name = "http";
  constructor(private readonly opts: { baseUrl: string; fetchImpl?: typeof fetch }) {}

  async search(query: ProductQuery): Promise<Product[]> {
    const params = new URLSearchParams();
    params.set("q", query.text);
    if (query.category !== undefined) params.set("category", query.category);
    if (query.budgetMax !== undefined) params.set("budgetMax", String(query.budgetMax));
    params.set("limit", String(query.limit));

    const data = await this.getJson(`${this.opts.baseUrl}/products?${params.toString()}`);
    if (!Array.isArray(data)) return [];
    return data.flatMap((item) => {
      const parsed = ProductSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });
  }

  async getById(id: string): Promise<Product | null> {
    const data = await this.getJson(`${this.opts.baseUrl}/products/${encodeURIComponent(id)}`);
    if (data === undefined) return null;
    const parsed = ProductSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  }

  /** GET 후 JSON 파싱. 네트워크 예외·res.ok=false·파싱 실패는 undefined(호출부가 graceful 처리). */
  private async getJson(url: string): Promise<unknown> {
    const f = this.opts.fetchImpl ?? globalThis.fetch;
    try {
      const res = await f(url);
      if (!res.ok) return undefined;
      return await res.json();
    } catch {
      return undefined;
    }
  }
}
