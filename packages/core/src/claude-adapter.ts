import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "@shopilot/schemas";
import type { LLMAdapter, LLMChunk, ToolSpec } from "./ports";
import { toLLMChunks } from "./llm-stream";

/** 추천 근거는 품질 중심 단계라 기본은 최상위 모델. 비용 절감 시 ANTHROPIC_MODEL로 하향. */
const DEFAULT_MODEL = "claude-opus-4-8";

/** 실제 Claude 어댑터. 키 있을 때만 서버가 조립한다(시크릿 서버 전용). 스트림 매핑은 toLLMChunks. */
export class ClaudeAdapter implements LLMAdapter {
  readonly name = "claude";
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(opts: { apiKey: string; model?: string }) {
    this.client = new Anthropic({ apiKey: opts.apiKey });
    this.model = opts.model ?? DEFAULT_MODEL;
  }

  async *stream(input: { messages: ChatMessage[]; system?: string; tools?: ToolSpec[] }): AsyncIterable<LLMChunk> {
    const messages = input.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? ("assistant" as const) : ("user" as const), content: m.content }));

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 1024,
      messages,
      ...(input.system !== undefined ? { system: input.system } : {}),
    });

    yield* toLLMChunks(stream);
  }
}
