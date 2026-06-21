import { describe, it, expect } from "vitest";
import type { LLMChunk } from "./ports";
import { MockLLMAdapter } from "./mock-llm";

async function collect(s: AsyncIterable<LLMChunk>): Promise<LLMChunk[]> {
  const out: LLMChunk[] = [];
  for await (const c of s) out.push(c);
  return out;
}

describe("MockLLMAdapter", () => {
  it("주어진 text를 청크로 결정론 방출한다", async () => {
    const chunks = await collect(new MockLLMAdapter("추천 텍스트").stream({ messages: [] }));
    expect(chunks).toEqual([{ type: "text", text: "추천 텍스트" }]);
  });

  it("빈 text면 청크 0개(폴백 경로 유도)", async () => {
    const chunks = await collect(new MockLLMAdapter().stream({ messages: [] }));
    expect(chunks).toEqual([]);
  });
});
