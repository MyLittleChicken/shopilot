import type { DataSourceAdapter } from "./ports";
import { HttpDataSourceAdapter } from "./http-data-source";

/**
 * CATALOG_API_URL이 있으면 HTTP 카탈로그, 없으면 fallback(목)을 쓴다.
 * env는 process.env(또는 테스트 객체). 서버가 fallback으로 목을 준다.
 * green에서 구현.
 */
export function selectDataSource(
  _env: Record<string, string | undefined>,
  _fallback: DataSourceAdapter,
): DataSourceAdapter {
  void HttpDataSourceAdapter;
  throw new Error("미구현: selectDataSource");
}
