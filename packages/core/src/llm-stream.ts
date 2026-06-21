import type { LLMChunk } from "./ports";

/**
 * Anthropic 스트림 이벤트를 LLMChunk로 매핑하는 순수 함수.
 * content_block_delta의 text_delta만 취하고 그 외 블록(start/stop·thinking·tool_use)은 무시.
 * 입력을 AsyncIterable<unknown>로 두어 SDK 타입과 디커플 — 실 스트림·가짜 스트림 모두 받는다.
 * green에서 구현.
 */
export async function* toLLMChunks(_stream: AsyncIterable<unknown>): AsyncIterable<LLMChunk> {
  throw new Error("미구현: toLLMChunks");
}
