import { describe, it, expect } from "vitest";
import type { LLMChunk } from "./ports";
import { toOpenAIChunks } from "./openai-adapter";

async function collect(s: AsyncIterable<LLMChunk>): Promise<LLMChunk[]> {
  const out: LLMChunk[] = [];
  for await (const c of s) out.push(c);
  return out;
}

async function* fake(events: unknown[]): AsyncIterable<unknown> {
  for (const e of events) yield e;
}

describe("toOpenAIChunks", () => {
  it("choices[0].delta.content(string)만 누적하고 content 없는 청크는 무시한다", async () => {
    const events: unknown[] = [
      { choices: [{ delta: { role: "assistant" } }] }, // role-only, content 없음
      { choices: [{ delta: { content: "안녕" } }] },
      { choices: [{ delta: { content: null } }] }, // null content
      { choices: [{ delta: { content: " 세상" } }] },
      { choices: [{ delta: {}, finish_reason: "stop" }] }, // finish
      { choices: [] }, // 빈 choices
    ];
    expect(await collect(toOpenAIChunks(fake(events)))).toEqual([
      { type: "text", text: "안녕" },
      { type: "text", text: " 세상" },
    ]);
  });
});
