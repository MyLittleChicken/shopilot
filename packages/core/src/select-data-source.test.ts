import { describe, it, expect } from "vitest";
import { selectDataSource } from "./select-data-source";
import { MockDataSourceAdapter } from "./mock-data-source";

const fallback = new MockDataSourceAdapter([]);

describe("selectDataSource", () => {
  it("CATALOG_API_URL 있으면 http", () => {
    expect(selectDataSource({ CATALOG_API_URL: "http://x" }, fallback).name).toBe("http");
  });

  it("없으면 fallback(mock)을 그대로 반환한다", () => {
    expect(selectDataSource({}, fallback).name).toBe("mock");
  });
});
