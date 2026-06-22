import OpenAI from "openai";
import type { ChatMessage } from "@shopilot/schemas";
import type { LLMAdapter, LLMChunk, ToolSpec } from "./ports";

// gpt-4o는 은퇴 흐름이라 현행 권장 기본으로 둔다. OPENAI_MODEL로 덮어쓸 수 있다.
const DEFAULT_MODEL = "gpt-5.1";

/** OpenAI 어댑터. 키 있을 때만 서버가 조립(시크릿 서버 전용). 스트림 매핑은 toOpenAIChunks. */
export class OpenAIAdapter implements LLMAdapter {
  readonly name = "openai";
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(opts: { apiKey: string; model?: string }) {
    this.client = new OpenAI({ apiKey: opts.apiKey });
    this.model = opts.model ?? DEFAULT_MODEL;
  }

  async *stream(input: { messages: ChatMessage[]; system?: string; tools?: ToolSpec[] }): AsyncIterable<LLMChunk> {
    // OpenAI는 system 별도 필드가 없어 messages 앞에 system 역할로 넣는다.
    const messages = [
      ...(input.system !== undefined ? [{ role: "system", content: input.system }] : []),
      ...input.messages.map((m) => ({ role: m.role, content: m.content })),
    ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

    const stream = await this.client.chat.completions.create({ model: this.model, messages, stream: true });
    yield* toOpenAIChunks(stream);
  }
}

/** OpenAI 스트림 청크를 LLMChunk로 매핑. choices[0].delta.content(string)만 취한다. green에서 구현. */
export async function* toOpenAIChunks(_stream: AsyncIterable<unknown>): AsyncIterable<LLMChunk> {
  throw new Error("미구현: toOpenAIChunks");
}
