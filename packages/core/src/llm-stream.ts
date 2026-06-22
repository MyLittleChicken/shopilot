import type { LLMChunk } from "./ports";

/** content_block_delta의 text_delta 인지 좁히는 가드(비-널·구조 검사). */
function isTextDelta(ev: unknown): ev is { delta: { text: string } } {
  if (typeof ev !== "object" || ev === null) return false;
  const e = ev as { type?: unknown; delta?: { type?: unknown; text?: unknown } };
  return e.type === "content_block_delta" && !!e.delta && e.delta.type === "text_delta" && typeof e.delta.text === "string";
}

/**
 * Anthropic 스트림 이벤트를 LLMChunk로 매핑하는 순수 함수.
 * text_delta만 취하고 그 외 블록(start/stop·thinking·tool_use·input_json)은 무시.
 * 입력을 AsyncIterable<unknown>로 두어 SDK 타입과 디커플 — 실 스트림·가짜 스트림 모두 받는다.
 */
export async function* toLLMChunks(stream: AsyncIterable<unknown>): AsyncIterable<LLMChunk> {
  for await (const ev of stream) {
    if (isTextDelta(ev)) yield { type: "text", text: ev.delta.text };
  }
}
