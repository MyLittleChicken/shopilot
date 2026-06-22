import type { ChatMessage } from "@shopilot/schemas";
import type { LLMAdapter, LLMChunk, ToolSpec } from "./ports";

/**
 * 결정론 목 LLM. 주어진 text를 그대로 청크로 방출한다.
 * 기본(빈 text)은 청크 0개 → recommend가 폴백 경로를 타게 한다(키 없는 데모=질의별 멘트).
 */
export class MockLLMAdapter implements LLMAdapter {
  readonly name = "mock-llm";
  constructor(private readonly text = "") {}

  async *stream(_input: { messages: ChatMessage[]; system?: string; tools?: ToolSpec[] }): AsyncIterable<LLMChunk> {
    if (this.text.length > 0) yield { type: "text", text: this.text };
  }
}
