import { describe, it, expect } from "vitest";
import type { LLMChunk } from "./ports";
import { toLLMChunks } from "./llm-stream";

async function collect(s: AsyncIterable<LLMChunk>): Promise<LLMChunk[]> {
  const out: LLMChunk[] = [];
  for await (const c of s) out.push(c);
  return out;
}

async function* fakeStream(events: unknown[]): AsyncIterable<unknown> {
  for (const e of events) yield e;
}

describe("toLLMChunks", () => {
  it("text_delta만 누적하고 비-text 블록은 무시한다", async () => {
    const events: unknown[] = [
      { type: "message_start", message: {} },
      { type: "content_block_start", index: 0, content_block: {} },
      { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "안녕" } },
      { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: "{}" } },
      { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: " 세상" } },
      { type: "content_block_stop", index: 0 },
      { type: "message_stop" },
    ];
    const chunks = await collect(toLLMChunks(fakeStream(events)));
    expect(chunks).toEqual([
      { type: "text", text: "안녕" },
      { type: "text", text: " 세상" },
    ]);
  });
});
